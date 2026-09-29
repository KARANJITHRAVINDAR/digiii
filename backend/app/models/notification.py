import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class NotificationType(str, enum.Enum):
    DISPUTE_SUBMITTED = "DISPUTE_SUBMITTED"
    DISPUTE_ASSIGNED = "DISPUTE_ASSIGNED"
    DISPUTE_RESOLVED = "DISPUTE_RESOLVED"
    DISPUTE_REJECTED = "DISPUTE_REJECTED"
    DISPUTE_ESCALATED = "DISPUTE_ESCALATED"
    DEADLINE_WARNING = "DEADLINE_WARNING"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=True, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id])
    dispute = relationship("Dispute", foreign_keys=[dispute_id])

    def __repr__(self):
        return f"<Notification id={self.id} recipient={self.recipient_id} type={self.type}>"
