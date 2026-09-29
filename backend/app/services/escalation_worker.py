from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType
from app.models.notification import NotificationType
from app.services.notification_service import create_notification


TEACHER_SLA_HOURS = getattr(settings, "TEACHER_SLA_HOURS", 48)
HOD_SLA_HOURS = getattr(settings, "HOD_SLA_HOURS", 48)


def process_overdue_escalations(db: Session) -> Dict[str, Any]:
    """
    Idempotent background escalation processor.
    Scans for overdue disputes and escalates:
    - Stage 1: Teacher -> Course Department HOD (or Admin if HOD is missing/same person)
    - Stage 2: HOD -> Admin
    """
    now = datetime.now(timezone.utc)
    escalated_to_hod_count = 0
    escalated_to_admin_count = 0

    # 1. Fetch System Admin user for fallback/final stage
    admin_user = db.query(User).filter(
        User.role == UserRole.ADMIN,
        User.is_active == True
    ).first()

    admin_id = admin_user.id if admin_user else 1

    # Stage 1 Escalation: Teacher SLA Expired (OPEN / IN_REVIEW)
    overdue_teacher_disputes = db.query(Dispute).filter(
        Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.IN_REVIEW]),
        Dispute.due_at <= now
    ).with_for_update().all()

    for dispute in overdue_teacher_disputes:
        prev_status = dispute.status
        prev_owner_id = dispute.current_owner_id

        # CRITICAL DOMAIN RULE: Escalation MUST follow COURSE department!
        course = db.query(Course).filter(Course.id == dispute.course_id).first()
        if not course or not course.department_id:
            target_hod_id = admin_id
        else:
            course_dept = db.query(Department).filter(Department.id == course.department_id).first()
            target_hod_id = course_dept.hod_id if (course_dept and course_dept.hod_id) else admin_id

        # Edge Case: If HOD is the same person as the assigned Teacher, skip HOD and go directly to Admin
        if target_hod_id == prev_owner_id:
            next_status = DisputeStatus.ESCALATED_TO_ADMIN
            next_owner_id = admin_id
            event_type = DisputeEventType.ESCALATED_TO_ADMIN
            role_label = "Admin (HOD is teacher)"
        elif target_hod_id == admin_id:
            next_status = DisputeStatus.ESCALATED_TO_ADMIN
            next_owner_id = admin_id
            event_type = DisputeEventType.ESCALATED_TO_ADMIN
            role_label = "Admin (No HOD assigned)"
        else:
            next_status = DisputeStatus.ESCALATED_TO_HOD
            next_owner_id = target_hod_id
            event_type = DisputeEventType.ESCALATED_TO_HOD
            role_label = "Course Department HOD"

        next_due_at = now + timedelta(hours=HOD_SLA_HOURS)

        # Apply state updates
        dispute.status = next_status
        dispute.current_owner_id = next_owner_id
        dispute.due_at = next_due_at

        # Append Audit Event
        event = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=next_owner_id,
            event_type=event_type,
            previous_status=prev_status,
            new_status=next_status,
            previous_owner_id=prev_owner_id,
            new_owner_id=next_owner_id,
            message=f"Auto-escalated to {role_label} after 48h SLA expiration."
        )
        db.add(event)

        # Notify new owner
        create_notification(
            db=db,
            recipient_id=next_owner_id,
            dispute_id=dispute.id,
            type=NotificationType.DISPUTE_ESCALATED,
            title="Overdue Dispute Escalated",
            message=f"Dispute #{dispute.id} for course {course.code if course else ''} has been escalated to your queue."
        )

        escalated_to_hod_count += 1

    # Stage 2 Escalation: HOD SLA Expired (ESCALATED_TO_HOD)
    overdue_hod_disputes = db.query(Dispute).filter(
        Dispute.status == DisputeStatus.ESCALATED_TO_HOD,
        Dispute.due_at <= now
    ).with_for_update().all()

    for dispute in overdue_hod_disputes:
        prev_status = dispute.status
        prev_owner_id = dispute.current_owner_id

        dispute.status = DisputeStatus.ESCALATED_TO_ADMIN
        dispute.current_owner_id = admin_id
        dispute.due_at = now + timedelta(days=365)  # Final stage

        event = DisputeEvent(
            dispute_id=dispute.id,
            actor_id=admin_id,
            event_type=DisputeEventType.ESCALATED_TO_ADMIN,
            previous_status=prev_status,
            new_status=DisputeStatus.ESCALATED_TO_ADMIN,
            previous_owner_id=prev_owner_id,
            new_owner_id=admin_id,
            message="Auto-escalated to System Admin after HOD SLA expiration."
        )
        db.add(event)

        create_notification(
            db=db,
            recipient_id=admin_id,
            dispute_id=dispute.id,
            type=NotificationType.DISPUTE_ESCALATED,
            title="Dispute Escalated to Admin",
            message=f"Dispute #{dispute.id} is unresolved after HOD deadline and requires Admin intervention."
        )

        escalated_to_admin_count += 1

    db.commit()

    return {
        "processed_at": now.isoformat(),
        "escalated_to_hod": escalated_to_hod_count,
        "escalated_to_admin": escalated_to_admin_count
    }
