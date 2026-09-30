import logging
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.email_service import process_email_outbox

logger = logging.getLogger(__name__)


@celery_app.task(
    name='app.tasks.email_tasks.process_email_outbox_task',
    bind=True,
    max_retries=0,
    acks_late=True,
)
def process_email_outbox_task(self):
    logger.info('[CELERY] Starting email outbox task')
    db = SessionLocal()
    try:
        result = process_email_outbox(db)
        processed = result.get('processed', 0)
        sent = result.get('sent', 0)
        failed = result.get('failed', 0)
        if processed > 0:
            logger.info('[CELERY] Email outbox: processed=%d sent=%d failed=%d', processed, sent, failed)
        else:
            logger.info('[CELERY] Email outbox: nothing to process')
        return result
    except Exception as exc:
        logger.error('[CELERY] Email outbox task failed: %s', exc, exc_info=True)
        raise
    finally:
        db.close()
