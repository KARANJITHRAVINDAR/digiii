import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class EmailOutbox(Base):
    __tablename__ = "email_outbox"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(120), nullable=False, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    event_type = Column(String(50), nullable=False)
    status = Column(Enum(EmailStatus), default=EmailStatus.PENDING, nullable=False, index=True)
    retry_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    recipient_user = relationship("User", foreign_keys=[recipient_user_id])

    def __repr__(self):
        return f"<EmailOutbox id={self.id} recipient='{self.recipient_email}' status='{self.status}'>"
