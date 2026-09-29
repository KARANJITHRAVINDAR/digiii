import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.email_outbox import EmailOutbox, EmailStatus

logger = logging.getLogger("email_service")

SMTP_HOST = getattr(settings, "SMTP_HOST", "")
SMTP_PORT = getattr(settings, "SMTP_PORT", 587)
SMTP_USERNAME = getattr(settings, "SMTP_USERNAME", "")
SMTP_PASSWORD = getattr(settings, "SMTP_PASSWORD", "")
SMTP_FROM = getattr(settings, "SMTP_FROM", "noreply@digiicampus.com")


def queue_email(
    db: Session,
    recipient_email: str,
    subject: str,
    body: str,
    event_type: str,
    recipient_user_id: Optional[int] = None
) -> EmailOutbox:
    """
    Creates an email outbox record inside the active DB transaction.
    """
    outbox_entry = EmailOutbox(
        recipient_email=recipient_email,
        recipient_user_id=recipient_user_id,
        subject=subject,
        body=body,
        event_type=event_type,
        status=EmailStatus.PENDING
    )
    db.add(outbox_entry)
    return outbox_entry


def process_email_outbox(db: Session) -> Dict[str, Any]:
    """
    Processes PENDING and FAILED outbox emails with retry_count < 3.
    """
    pending_emails = db.query(EmailOutbox).filter(
        EmailOutbox.status.in_([EmailStatus.PENDING, EmailStatus.FAILED]),
        EmailOutbox.retry_count < 3
    ).with_for_update().all()

    sent_count = 0
    failed_count = 0

    if not SMTP_HOST:
        logger.info("SMTP_HOST not configured. Email delivery disabled; outbox entries retained for offline logging.")
        for email_item in pending_emails:
            email_item.status = EmailStatus.FAILED
            email_item.retry_count += 1
            email_item.last_error = "SMTP_HOST not configured in environment"
        db.commit()
        return {"processed": len(pending_emails), "sent": 0, "failed": len(pending_emails), "note": "SMTP unconfigured"}

    for email_item in pending_emails:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_FROM
            msg["To"] = email_item.recipient_email
            msg["Subject"] = email_item.subject
            msg.attach(MIMEText(email_item.body, "plain"))

            server = smtplib.SMTP(SMTP_HOST, int(SMTP_PORT), timeout=10)
            server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()

            email_item.status = EmailStatus.SENT
            email_item.sent_at = datetime.now(timezone.utc)
            sent_count += 1

        except Exception as e:
            logger.warning(f"Failed to send email #{email_item.id} to {email_item.recipient_email}: {e}")
            email_item.status = EmailStatus.FAILED
            email_item.retry_count += 1
            email_item.last_error = str(e)
            failed_count += 1

    db.commit()
    return {"processed": len(pending_emails), "sent": sent_count, "failed": failed_count}
