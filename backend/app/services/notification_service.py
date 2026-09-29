from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.services.email_service import queue_email


def create_notification(
    db: Session,
    recipient_id: int,
    type: NotificationType,
    title: str,
    message: str,
    dispute_id: Optional[int] = None
) -> Notification:
    notif = Notification(
        recipient_id=recipient_id,
        dispute_id=dispute_id,
        type=type,
        title=title,
        message=message
    )
    db.add(notif)

    # Queue corresponding email in outbox within the active transaction
    recipient = db.query(User).filter(User.id == recipient_id).first()
    if recipient and recipient.email:
        queue_email(
            db=db,
            recipient_email=recipient.email,
            recipient_user_id=recipient.id,
            subject=f"[DigiCampus] {title}",
            body=f"Hello {recipient.name},\n\n{message}\n\nRegards,\nDigiCampus Team",
            event_type=type.value
        )

    return notif
