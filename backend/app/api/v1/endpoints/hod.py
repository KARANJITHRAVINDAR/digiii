from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.attendance import AttendanceRecord, AttendanceVersion, AttendanceStatus
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType
from app.models.notification import NotificationType
from app.schemas.dispute import DisputeOut, DisputeDetailOut, DisputeRejectRequest
from app.services.notification_service import create_notification
from app.api.deps import require_hod

router = APIRouter(prefix="/hod", tags=["HOD Workflow"])


@router.get("/disputes", response_model=List[DisputeOut])
def list_hod_disputes(
    current_user: User = Depends(require_hod),
    db: Session = Depends(get_db)
):
    disputes = db.query(Dispute).filter(
        Dispute.current_owner_id == current_user.id
    ).order_by(Dispute.created_at.desc()).all()
    return disputes


@router.get("/disputes/{dispute_id}", response_model=DisputeDetailOut)
def get_hod_dispute_detail(
    dispute_id: int,
    current_user: User = Depends(require_hod),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(
        Dispute.id == dispute_id,
        Dispute.current_owner_id == current_user.id
    ).first()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalated dispute not found in your queue")

    return dispute


@router.post("/disputes/{dispute_id}/resolve", response_model=DisputeDetailOut)
def resolve_hod_dispute(
    dispute_id: int,
    current_user: User = Depends(require_hod),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(
        Dispute.id == dispute_id,
        Dispute.current_owner_id == current_user.id
    ).with_for_update().first()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found or not in your HOD queue")

    if dispute.status != DisputeStatus.ESCALATED_TO_HOD:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Dispute cannot be resolved in status {dispute.status}")

    att_record = db.query(AttendanceRecord).filter(AttendanceRecord.id == dispute.attendance_record_id).with_for_update().first()
    old_status = att_record.status

    try:
        att_record.status = AttendanceStatus.PRESENT

        att_version = AttendanceVersion(
            attendance_record_id=att_record.id,
            old_status=old_status,
            new_status=AttendanceStatus.PRESENT,
            changed_by=current_user.id,
            reason=f"HOD approved escalated dispute #{dispute.id}"
        )
        db.add(att_version)

        now = datetime.now(timezone.utc)
        prev_status = dispute.status
        dispute.status = DisputeStatus.RESOLVED
        dispute.resolved_at = now

        event = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=current_user.id,
            event_type=DisputeEventType.ATTENDANCE_CORRECTED,
            previous_status=prev_status,
            new_status=DisputeStatus.RESOLVED,
            previous_owner_id=current_user.id,
            new_owner_id=current_user.id,
            message=f"Escalated dispute resolved by HOD {current_user.name}. Attendance corrected to PRESENT."
        )
        db.add(event)

        create_notification(
            db=db,
            recipient_id=dispute.student_id,
            dispute_id=dispute.id,
            type=NotificationType.DISPUTE_RESOLVED,
            title="Escalated Dispute Approved by HOD",
            message=f"Your escalated dispute #{dispute.id} was approved by HOD {current_user.name}. Attendance updated to PRESENT."
        )

        db.commit()
        db.refresh(dispute)
        return dispute

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/disputes/{dispute_id}/reject", response_model=DisputeDetailOut)
def reject_hod_dispute(
    dispute_id: int,
    payload: DisputeRejectRequest,
    current_user: User = Depends(require_hod),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(
        Dispute.id == dispute_id,
        Dispute.current_owner_id == current_user.id
    ).with_for_update().first()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found in your HOD queue")

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is mandatory and cannot be empty")

    try:
        now = datetime.now(timezone.utc)
        prev_status = dispute.status
        dispute.status = DisputeStatus.REJECTED
        dispute.resolution_remarks = payload.reason.strip()
        dispute.resolved_at = now

        event = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=current_user.id,
            event_type=DisputeEventType.DISPUTE_REJECTED,
            previous_status=prev_status,
            new_status=DisputeStatus.REJECTED,
            previous_owner_id=current_user.id,
            new_owner_id=current_user.id,
            message=f"Escalated dispute rejected by HOD {current_user.name}.",
            remarks=payload.reason.strip()
        )
        db.add(event)

        create_notification(
            db=db,
            recipient_id=dispute.student_id,
            dispute_id=dispute.id,
            type=NotificationType.DISPUTE_REJECTED,
            title="Escalated Dispute Rejected by HOD",
            message=f"Your escalated dispute #{dispute.id} was rejected by HOD {current_user.name}. Reason: {payload.reason.strip()}"
        )

        db.commit()
        db.refresh(dispute)
        return dispute

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
