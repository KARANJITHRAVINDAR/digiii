from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.attendance import AttendanceRecord, AttendanceVersion, AttendanceStatus
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType
from app.models.notification import NotificationType
from app.schemas.dispute import DisputeOut, DisputeDetailOut, DisputeRejectRequest
from app.schemas.user import UserOut
from app.services.notification_service import create_notification
from app.api.deps import require_teacher

router = APIRouter(prefix="/teacher", tags=["Teacher Workflow"])


@router.get("/students", response_model=List[UserOut])
def list_teacher_students(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    students = db.query(User).filter(
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).order_by(User.name.asc()).all()
    return students


@router.get("/disputes", response_model=List[DisputeOut])
def list_teacher_disputes(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    disputes = db.query(Dispute).filter(
        Dispute.current_owner_id == current_user.id
    ).order_by(Dispute.created_at.desc()).all()

    return disputes


@router.get("/disputes/{dispute_id}", response_model=DisputeDetailOut)
def get_teacher_dispute_detail(
    dispute_id: int,
    current_user: User = Depends(require_teacher),
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

    if dispute.current_owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this dispute as you are not the current owner"
        )

    return dispute


@router.post("/disputes/{dispute_id}/approve", response_model=DisputeDetailOut)
def approve_dispute(
    dispute_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(
        Dispute.id == dispute_id,
        Dispute.current_owner_id == current_user.id
    ).with_for_update().first()

    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found or you are not the assigned owner"
        )

    if dispute.status not in [DisputeStatus.OPEN, DisputeStatus.IN_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dispute cannot be approved because its current status is {dispute.status.value}"
        )

    att_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == dispute.attendance_record_id
    ).with_for_update().first()

    if not att_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated attendance record not found"
        )

    old_status = att_record.status

    try:
        # 1. Update attendance status to PRESENT
        att_record.status = AttendanceStatus.PRESENT

        # 2. Create AttendanceVersion record
        att_version = AttendanceVersion(
            attendance_record_id=att_record.id,
            old_status=old_status,
            new_status=AttendanceStatus.PRESENT,
            changed_by=current_user.id,
            reason=f"Approved dispute #{dispute.id}"
        )
        db.add(att_version)

        # 3. Update dispute status to RESOLVED
        now = datetime.now(timezone.utc)
        prev_status = dispute.status
        dispute.status = DisputeStatus.RESOLVED
        dispute.resolved_at = now

        # 4. Create DisputeEvents
        event_approved = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=current_user.id,
            event_type=DisputeEventType.DISPUTE_APPROVED,
            previous_status=prev_status,
            new_status=DisputeStatus.RESOLVED,
            previous_owner_id=current_user.id,
            new_owner_id=current_user.id,
            message=f"Dispute approved by teacher {current_user.name}."
        )
        event_corrected = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=current_user.id,
            event_type=DisputeEventType.ATTENDANCE_CORRECTED,
            previous_status=prev_status,
            new_status=DisputeStatus.RESOLVED,
            message=f"Attendance record status corrected from {old_status.value} to PRESENT."
        )
        db.add_all([event_approved, event_corrected])

        # 5. Notify Student
        create_notification(
            db=db,
            recipient_id=dispute.student_id,
            dispute_id=dispute.id,
            type=NotificationType.DISPUTE_RESOLVED,
            title="Dispute Approved!",
            message=f"Your dispute #{dispute.id} has been approved by Prof. {current_user.name}. Attendance updated to PRESENT."
        )

        db.commit()
        db.refresh(dispute)
        return dispute

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed during dispute approval: {str(e)}"
        )


@router.post("/disputes/{dispute_id}/reject", response_model=DisputeDetailOut)
def reject_dispute(
    dispute_id: int,
    payload: DisputeRejectRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(
        Dispute.id == dispute_id,
        Dispute.current_owner_id == current_user.id
    ).with_for_update().first()

    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found or you are not the assigned owner"
        )

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is mandatory and cannot be empty"
        )

    if dispute.status not in [DisputeStatus.OPEN, DisputeStatus.IN_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dispute cannot be rejected because its current status is {dispute.status.value}"
        )

    try:
        now = datetime.now(timezone.utc)
        prev_status = dispute.status
        dispute.status = DisputeStatus.REJECTED
        dispute.resolution_remarks = payload.reason.strip()
        dispute.resolved_at = now

        event_rejected = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=current_user.id,
            event_type=DisputeEventType.DISPUTE_REJECTED,
            previous_status=prev_status,
            new_status=DisputeStatus.REJECTED,
            previous_owner_id=current_user.id,
            new_owner_id=current_user.id,
            message=f"Dispute rejected by teacher {current_user.name}.",
            remarks=payload.reason.strip()
        )
        db.add(event_rejected)

        # Notify Student
        create_notification(
            db=db,
            recipient_id=dispute.student_id,
            dispute_id=dispute.id,
            type=NotificationType.DISPUTE_REJECTED,
            title="Dispute Rejected",
            message=f"Your dispute #{dispute.id} was rejected by Prof. {current_user.name}. Reason: {payload.reason.strip()}"
        )

        db.commit()
        db.refresh(dispute)
        return dispute

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed during dispute rejection: {str(e)}"
        )
