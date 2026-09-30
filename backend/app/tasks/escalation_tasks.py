import logging
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.escalation_worker import process_overdue_escalations

logger = logging.getLogger(__name__)


@celery_app.task(
    name='app.tasks.escalation_tasks.process_sla_escalations',
    bind=True,
    max_retries=0,
    acks_late=True,
)
def process_sla_escalations(self):
    logger.info('[CELERY] Starting SLA escalation task')
    db = SessionLocal()
    try:
        result = process_overdue_escalations(db)
        hod_count = result.get('escalated_to_hod', 0)
        admin_count = result.get('escalated_to_admin', 0)
        if hod_count > 0 or admin_count > 0:
            logger.info(
                '[CELERY] SLA escalation: escalated_to_hod=%d, escalated_to_admin=%d',
                hod_count,
                admin_count,
            )
        else:
            logger.info('[CELERY] SLA escalation: no overdue disputes found')
        return result
    except Exception as exc:
        logger.error('[CELERY] SLA escalation task failed: %s', exc, exc_info=True)
        raise
    finally:
        db.close()
