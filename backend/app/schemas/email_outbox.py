from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.email_outbox import EmailStatus


class EmailOutboxOut(BaseModel):
    id: int
    recipient_email: EmailStr
    recipient_user_id: Optional[int] = None
    subject: str
    body: str
    event_type: str
    status: EmailStatus
    retry_count: int
    last_error: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
