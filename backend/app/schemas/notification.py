from pydantic import BaseModel, ConfigDict, computed_field
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: int
    recipient_id: int
    dispute_id: Optional[int] = None
    type: NotificationType
    title: str
    message: str
    read_at: Optional[datetime] = None
    created_at: datetime

    @computed_field
    @property
    def is_read(self) -> bool:
        return self.read_at is not None

    model_config = ConfigDict(from_attributes=True)
