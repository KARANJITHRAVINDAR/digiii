"""
DigiCampus Celery Application
Configures Celery with Redis as broker and result backend.
All periodic scheduling is handled by Celery Beat (separate service).
FastAPI does NOT start any background scheduler.
"""
import logging
from celery import Celery
from app.core.config import settings

logger = logging.getLogger(__name__)


def create_celery_app() -> Celery:
    celery_app = Celery(
        "digiicampus",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=["app.tasks.escalation_tasks", "app.tasks.email_tasks"],
    )

    celery_app.conf.update(
        # Serialization
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        # Timezone
        timezone="UTC",
        enable_utc=True,
        # Task behaviour
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        # Result expiry (1 day)
        result_expires=86400,
        # Beat schedule — executed only when celery beat service runs
        beat_schedule={
            "sla-escalation-sweep": {
                "task": "app.tasks.escalation_tasks.process_sla_escalations",
                "schedule": settings.ESCALATION_WORKER_INTERVAL_SECONDS,
                "options": {"expires": settings.ESCALATION_WORKER_INTERVAL_SECONDS},
            },
            "email-outbox-sweep": {
                "task": "app.tasks.email_tasks.process_email_outbox_task",
                "schedule": settings.EMAIL_OUTBOX_INTERVAL_SECONDS,
                "options": {"expires": settings.EMAIL_OUTBOX_INTERVAL_SECONDS},
            },
        },
    )

    logger.info(
        "[CELERY] App configured | broker=%s | escalation_interval=%ds | email_interval=%ds",
        settings.CELERY_BROKER_URL,
        settings.ESCALATION_WORKER_INTERVAL_SECONDS,
        settings.EMAIL_OUTBOX_INTERVAL_SECONDS,
    )
    return celery_app


celery_app = create_celery_app()
