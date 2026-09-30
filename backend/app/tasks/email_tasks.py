"""
Celery task: Email Outbox Processing
Thin wrapper around process_email_outbox().
Email failure is isolated — it cannot roll back attendance/dispute transactions.
Retry behaviour (max 3 attempts per email) is managed inside process_email_outbox().
"""
import logging
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.email_service import process_email_outbox

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.email_tasks.process_email_outbox_task",
    bind=True,
    max_retries=0,       # Outbox retry logic is inside process_email_outbox()
    acks_late=True,
)
def process_email_outbox_task(self):
    """
    Periodic Celery task for transactional email outbox processing.
    Delegates entirely to process_email_outbox() which:
      - Processes PENDING and FAILED emails with retry_count < 3
      - Uses SELECT ... FOR UPDATE row locking
      - Marks emails SENT or increments retry_count on failure
      - Does NOT roll back attendance/dispute transactions on failure
    """
    logger.info("[CELERY] Starting email outbox task")
    db = SessionLocal()
    try:
        result = process_email_outbox(db)
        processed = result.get("processed", 0)
        sent = result.get("sent", 0)
        failed = result.get("failed", 0)
        if processed > 0:
            logger.info(
                "[CELERY] Email outbox: processed=%d sent=%d failed=%d",
                processed,
                sent,
                failed,
            )
        else:
            logger.info("[CELERY] Email outbox: nothing to process")
        return result
    except Exception as exc:
        logger.error("[CELERY] Email outbox task failed: %s", exc, exc_info=True)
        raise
    finally:
        db.close()
