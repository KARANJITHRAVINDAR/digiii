from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceVersion, AttendanceStatus
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType
from app.models.notification import NotificationType
from app.models.correction_window import CorrectionWindow, WindowStatus
from app.models.email_outbox import EmailOutbox
from app.schemas.user import UserOut, UserCreateRequest, UserUpdateRequest
from app.schemas.course import CourseOut
from app.schemas.dispute import DisputeOut, DisputeDetailOut, DisputeEventOut
from app.schemas.correction_window import CorrectionWindowCreate, CorrectionWindowOut
from app.schemas.email_outbox import EmailOutboxOut
from app.core.security import hash_password
from app.services.notification_service import create_notification
from app.services.escalation_worker import process_overdue_escalations
from app.services.email_service import process_email_outbox
from app.api.deps import require_admin

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


# --- User Management ---

@router.get("/users", response_model=List[UserOut])
def list_users(
    query: Optional[str] = None,
    role: Optional[UserRole] = None,
    department_id: Optional[int] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if department_id:
        q = q.filter(User.department_id == department_id)
    if query:
        search = f"%{query.strip()}%"
        q = q.filter((User.name.ilike(search)) | (User.email.ilike(search)))

    users = q.order_by(User.id.desc()).all()
    return users


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    new_user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        department_id=payload.department_id,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.USER_CREATED,
        message=f"Admin created user {new_user.name} ({new_user.role.value})."
    )
    db.add(event)

    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/users/{user_id}", response_model=UserOut)
def get_user_detail(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.name:
        user.name = payload.name.strip()
    if payload.email:
        user.email = payload.email.lower().strip()
    if payload.role:
        user.role = payload.role
    if payload.department_id is not None:
        user.department_id = payload.department_id
    if payload.is_active is not None:
        user.is_active = payload.is_active

    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.USER_UPDATED,
        message=f"Admin updated profile for user #{user.id} ({user.name})."
    )
    db.add(event)

    db.commit()
    db.refresh(user)
    return user


# --- Course Management ---

@router.get("/courses", response_model=List[CourseOut])
def list_admin_courses(
    department_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Course)
    if department_id:
        q = q.filter(Course.department_id == department_id)
    if teacher_id:
        q = q.filter(Course.teacher_id == teacher_id)
    courses = q.order_by(Course.code.asc()).all()
    return courses


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    code: str,
    name: str,
    department_id: int,
    teacher_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Course).filter(Course.code == code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Course code already exists")

    course = Course(
        code=code.upper().strip(),
        name=name.strip(),
        department_id=department_id,
        teacher_id=teacher_id
    )
    db.add(course)
    db.flush()

    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.COURSE_CREATED,
        message=f"Admin created course {course.code} assigned to Dept #{department_id}."
    )
    db.add(event)

    db.commit()
    db.refresh(course)
    return course


@router.patch("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    code: Optional[str] = None,
    name: Optional[str] = None,
    department_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if code:
        course.code = code.upper().strip()
    if name:
        course.name = name.strip()
    if department_id:
        course.department_id = department_id
    if teacher_id:
        course.teacher_id = teacher_id

    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.COURSE_UPDATED,
        message=f"Admin updated course {course.code} (Teacher ID: {course.teacher_id}, Dept ID: {course.department_id})."
    )
    db.add(event)

    db.commit()
    db.refresh(course)
    return course


# --- Dispute Administration ---

@router.get("/disputes", response_model=List[DisputeOut])
def list_all_disputes(
    status_filter: Optional[DisputeStatus] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Dispute)
    if status_filter:
        query = query.filter(Dispute.status == status_filter)
    disputes = query.order_by(Dispute.created_at.desc()).all()
    return disputes


@router.get("/disputes/{dispute_id}", response_model=DisputeDetailOut)
def get_admin_dispute_detail(
    dispute_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
    return dispute


@router.post("/disputes/{dispute_id}/resolve", response_model=DisputeDetailOut)
def admin_resolve_dispute(
    dispute_id: int,
    approve: bool,
    remarks: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).with_for_update().first()
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    att_record = db.query(AttendanceRecord).filter(AttendanceRecord.id == dispute.attendance_record_id).with_for_update().first()
    old_status = att_record.status

    try:
        now = datetime.now(timezone.utc)
        prev_status = dispute.status

        if approve:
            att_record.status = AttendanceStatus.PRESENT
            att_version = AttendanceVersion(
                attendance_record_id=att_record.id,
                old_status=old_status,
                new_status=AttendanceStatus.PRESENT,
                changed_by=current_user.id,
                reason=f"Admin resolution #{dispute.id}: {remarks.strip()}"
            )
            db.add(att_version)

            dispute.status = DisputeStatus.RESOLVED
            dispute.resolution_remarks = remarks.strip()
            dispute.resolved_at = now

            event = DisputeEvent(
                dispute_id=dispute.id,
                actor_id=current_user.id,
                event_type=DisputeEventType.ATTENDANCE_CORRECTED,
                previous_status=prev_status,
                new_status=DisputeStatus.RESOLVED,
                previous_owner_id=dispute.current_owner_id,
                new_owner_id=current_user.id,
                message=f"Dispute resolved by Admin {current_user.name}.",
                remarks=remarks.strip()
            )
            db.add(event)

            create_notification(
                db=db,
                recipient_id=dispute.student_id,
                dispute_id=dispute.id,
                type=NotificationType.DISPUTE_RESOLVED,
                title="Dispute Resolved by System Admin",
                message=f"Admin {current_user.name} approved dispute #{dispute.id}. Attendance set to PRESENT."
            )
        else:
            dispute.status = DisputeStatus.REJECTED
            dispute.resolution_remarks = remarks.strip()
            dispute.resolved_at = now

            event = DisputeEvent(
                dispute_id=dispute.id,
                actor_id=current_user.id,
                event_type=DisputeEventType.DISPUTE_REJECTED,
                previous_status=prev_status,
                new_status=DisputeStatus.REJECTED,
                previous_owner_id=dispute.current_owner_id,
                new_owner_id=current_user.id,
                message=f"Dispute rejected by Admin {current_user.name}.",
                remarks=remarks.strip()
            )
            db.add(event)

            create_notification(
                db=db,
                recipient_id=dispute.student_id,
                dispute_id=dispute.id,
                type=NotificationType.DISPUTE_REJECTED,
                title="Dispute Rejected by System Admin",
                message=f"Admin {current_user.name} rejected dispute #{dispute.id}. Reason: {remarks.strip()}"
            )

        db.commit()
        db.refresh(dispute)
        return dispute

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# --- Correction Windows ---

@router.post("/correction-windows", response_model=CorrectionWindowOut, status_code=status.HTTP_201_CREATED)
def create_correction_window(
    payload: CorrectionWindowCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time")

    window = CorrectionWindow(
        course_id=payload.course_id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        created_by=current_user.id,
        status=WindowStatus.OPEN
    )
    db.add(window)

    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.CORRECTION_WINDOW_OPENED,
        message=f"Admin opened correction window for course #{payload.course_id} until {payload.end_at}."
    )
    db.add(event)

    db.commit()
    db.refresh(window)
    return window


@router.get("/correction-windows", response_model=List[CorrectionWindowOut])
def list_correction_windows(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    windows = db.query(CorrectionWindow).order_by(CorrectionWindow.created_at.desc()).all()
    return windows


@router.patch("/correction-windows/{window_id}", response_model=CorrectionWindowOut)
def toggle_correction_window(
    window_id: int,
    status: WindowStatus,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    window = db.query(CorrectionWindow).filter(CorrectionWindow.id == window_id).first()
    if not window:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction window not found")

    window.status = status
    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.CORRECTION_WINDOW_CLOSED if status == WindowStatus.CLOSED else DisputeEventType.CORRECTION_WINDOW_OPENED,
        message=f"Admin changed correction window #{window.id} status to {status.value}."
    )
    db.add(event)

    db.commit()
    db.refresh(window)
    return window


@router.post("/correction-windows/{window_id}/close", response_model=CorrectionWindowOut)
def close_correction_window(
    window_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    window = db.query(CorrectionWindow).filter(CorrectionWindow.id == window_id).first()
    if not window:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction window not found")

    window.status = WindowStatus.CLOSED
    event = DisputeEvent(
        actor_id=current_user.id,
        event_type=DisputeEventType.CORRECTION_WINDOW_CLOSED,
        message=f"Admin closed correction window #{window.id}."
    )
    db.add(event)
    db.commit()
    db.refresh(window)
    return window


# --- SLA & Email Outbox Execution Triggers ---

@router.post("/trigger-escalation")
@router.post("/trigger-escalation-sweep")
def trigger_background_escalation(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    result = process_overdue_escalations(db)
    return result


@router.post("/process-outbox")
def trigger_email_outbox_processing(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    result = process_email_outbox(db)
    return result


@router.get("/email-outbox", response_model=List[EmailOutboxOut])
def list_email_outbox(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    emails = db.query(EmailOutbox).order_by(EmailOutbox.created_at.desc()).limit(100).all()
    return emails


@router.get("/audit-logs", response_model=List[DisputeEventOut])
def get_system_audit_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    events = db.query(DisputeEvent).order_by(DisputeEvent.created_at.desc()).limit(200).all()
    return events
