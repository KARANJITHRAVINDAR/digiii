from typing import List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.attendance import AttendanceRecord
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType
from app.models.course import Course
from app.models.notification import NotificationType
from app.schemas.attendance import AttendanceRecordOut
from app.schemas.dispute import DisputeCreateRequest, DisputeOut, DisputeDetailOut
from app.services.notification_service import create_notification
from app.api.deps import require_student

router = APIRouter(prefix="/student", tags=["Student Workflow"])


@router.get("/attendance", response_model=List[AttendanceRecordOut])
def get_student_attendance(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == current_user.id
    ).order_by(AttendanceRecord.attendance_date.desc()).all()

    active_disputes = db.query(Dispute.attendance_record_id).filter(
        Dispute.student_id == current_user.id,
        Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.IN_REVIEW, DisputeStatus.ESCALATED_TO_HOD, DisputeStatus.ESCALATED_TO_ADMIN])
    ).all()
    active_dispute_ids = {d[0] for d in active_disputes}

    result = []
    for r in records:
        rec_out = AttendanceRecordOut.model_validate(r)
        rec_out.has_active_dispute = r.id in active_dispute_ids
        result.append(rec_out)

    return result


@router.post("/disputes", response_model=DisputeOut, status_code=status.HTTP_201_CREATED)
def raise_dispute(
    payload: DisputeCreateRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    att_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == payload.attendance_record_id
    ).first()

    if not att_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )

    if att_record.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to raise a dispute for another student's attendance record"
        )

    existing_active = db.query(Dispute).filter(
        Dispute.attendance_record_id == att_record.id,
        Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.IN_REVIEW, DisputeStatus.ESCALATED_TO_HOD, DisputeStatus.ESCALATED_TO_ADMIN])
    ).first()

    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active dispute already exists for this attendance record"
        )

    course = db.query(Course).filter(Course.id == att_record.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated course not found"
        )

    responsible_teacher_id = course.teacher_id
    now = datetime.now(timezone.utc)
    due_at = now + timedelta(hours=48)  # 48h SLA for teacher

    try:
        new_dispute = Dispute(
            attendance_record_id=att_record.id,
            student_id=current_user.id,
            course_id=att_record.course_id,
            teacher_id=responsible_teacher_id,
            reason=payload.reason.strip(),
            status=DisputeStatus.OPEN,
            current_owner_id=responsible_teacher_id,
            due_at=due_at
        )
        db.add(new_dispute)
        db.flush()

        event = DisputeEvent(
            dispute_id=new_dispute.id,
            actor_id=current_user.id,
            event_type=DisputeEventType.DISPUTE_CREATED,
            new_status=DisputeStatus.OPEN,
            new_owner_id=responsible_teacher_id,
            message=f"Dispute raised by student {current_user.name}: {payload.reason.strip()}"
        )
        db.add(event)

        # Notify responsible teacher
        create_notification(
            db=db,
            recipient_id=responsible_teacher_id,
            dispute_id=new_dispute.id,
            type=NotificationType.DISPUTE_ASSIGNED,
            title="New Dispute Assigned",
            message=f"Student {current_user.name} raised a dispute for {course.code} on {att_record.attendance_date}."
        )

        db.commit()
        db.refresh(new_dispute)
        return new_dispute

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create dispute: {str(e)}"
        )


@router.get("/disputes", response_model=List[DisputeOut])
def list_student_disputes(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    disputes = db.query(Dispute).filter(
        Dispute.student_id == current_user.id
    ).order_by(Dispute.created_at.desc()).all()
    return disputes


@router.get("/disputes/{dispute_id}", response_model=DisputeDetailOut)
def get_student_dispute_detail(
    dispute_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(
        Dispute.id == dispute_id
    ).first()

    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found"
        )

    if dispute.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this dispute"
        )

    return dispute
