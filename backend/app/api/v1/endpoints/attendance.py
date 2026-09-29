from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.course import Course
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus, AttendanceStatus
from app.models.notification import NotificationType
from app.schemas.attendance import (
    AttendanceSessionCreate,
    AttendanceSessionOut,
    MarkAttendanceRequest,
    AttendanceRecordOut,
)
from app.services.notification_service import create_notification
from app.api.deps import require_teacher

router = APIRouter(prefix="/attendance", tags=["Attendance Sessions"])


@router.post("/sessions", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED)
def create_attendance_session(
    payload: AttendanceSessionCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Verify teacher is assigned to this course
    if course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to create an attendance session for a course you do not teach"
        )

    session = AttendanceSession(
        course_id=payload.course_id,
        teacher_id=current_user.id,
        session_date=payload.session_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status=SessionStatus.SCHEDULED
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[AttendanceSessionOut])
def list_teacher_sessions(
    course_id: int = None,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceSession).filter(AttendanceSession.teacher_id == current_user.id)
    if course_id:
        query = query.filter(AttendanceSession.course_id == course_id)
    
    sessions = query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.id.desc()).all()
    return sessions


@router.post("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def mark_session_attendance(
    session_id: int,
    payload: MarkAttendanceRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this session")

    course = db.query(Course).filter(Course.id == session.course_id).first()
    course_name = course.name if course else f"Course #{session.course_id}"

    saved_records = []
    try:
        for item in payload.records:
            # Upsert attendance record for session
            existing = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == item.student_id,
                AttendanceRecord.course_id == session.course_id,
                AttendanceRecord.attendance_date == session.session_date
            ).first()

            is_new_absent = (item.status == AttendanceStatus.ABSENT) and (not existing or existing.status != AttendanceStatus.ABSENT)

            if existing:
                existing.status = item.status
                existing.marked_by = current_user.id
                existing.session_id = session.id
                saved_records.append(existing)
            else:
                new_rec = AttendanceRecord(
                    session_id=session.id,
                    student_id=item.student_id,
                    course_id=session.course_id,
                    attendance_date=session.session_date,
                    status=item.status,
                    marked_by=current_user.id
                )
                db.add(new_rec)
                saved_records.append(new_rec)

            if is_new_absent:
                create_notification(
                    db=db,
                    recipient_id=item.student_id,
                    type=NotificationType.DEADLINE_WARNING,
                    title="Absent Recorded for Lecture",
                    message=f"You were marked ABSENT for {course_name} on {session.session_date}. If you attended this lecture, you can submit a dispute from your student portal."
                )

        session.status = SessionStatus.COMPLETED
        db.commit()
        for r in saved_records:
            db.refresh(r)
        return saved_records

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
