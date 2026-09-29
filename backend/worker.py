import time
import logging
from app.db.session import SessionLocal
from app.services.escalation_worker import process_overdue_escalations
from app.services.email_service import process_email_outbox

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("escalation_worker")


def run_worker():
    logger.info("Starting DigiCampus Background Escalation & Email Outbox Worker Service...")
    while True:
        try:
            db = SessionLocal()
            try:
                # 1. Process SLA Escalations
                esc_result = process_overdue_escalations(db)
                if esc_result["escalated_to_hod"] > 0 or esc_result["escalated_to_admin"] > 0:
                    logger.info(
                        f"Escalation sweep: HOD={esc_result['escalated_to_hod']}, Admin={esc_result['escalated_to_admin']}"
                    )

                # 2. Process Email Outbox
                email_result = process_email_outbox(db)
                if email_result.get("processed", 0) > 0:
                    logger.info(
                        f"Outbox sweep: Sent={email_result.get('sent', 0)}, Failed={email_result.get('failed', 0)}"
                    )
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in background worker sweep: {e}")

        # Sleep for 30 seconds between sweeps
        time.sleep(30)


if __name__ == "__main__":
    run_worker()
