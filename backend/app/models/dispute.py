import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class DisputeStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"
    ESCALATED_TO_HOD = "ESCALATED_TO_HOD"
    ESCALATED_TO_ADMIN = "ESCALATED_TO_ADMIN"


class DisputeEventType(str, enum.Enum):
    DISPUTE_CREATED = "DISPUTE_CREATED"
    DISPUTE_ASSIGNED = "DISPUTE_ASSIGNED"
    DISPUTE_REVIEWED = "DISPUTE_REVIEWED"
    DISPUTE_APPROVED = "DISPUTE_APPROVED"
    DISPUTE_REJECTED = "DISPUTE_REJECTED"
    ATTENDANCE_CORRECTED = "ATTENDANCE_CORRECTED"
    ATTENDANCE_CHANGED = "ATTENDANCE_CHANGED"
    ESCALATED_TO_HOD = "ESCALATED_TO_HOD"
    ESCALATED_TO_ADMIN = "ESCALATED_TO_ADMIN"
    TEACHER_REASSIGNED = "TEACHER_REASSIGNED"
    CORRECTION_WINDOW_OPENED = "CORRECTION_WINDOW_OPENED"
    CORRECTION_WINDOW_CLOSED = "CORRECTION_WINDOW_CLOSED"
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    COURSE_CREATED = "COURSE_CREATED"
    COURSE_UPDATED = "COURSE_UPDATED"
    TEACHER_ASSIGNED = "TEACHER_ASSIGNED"


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    attendance_record_id = Column(Integer, ForeignKey("attendance_records.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN, nullable=False, index=True)
    current_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    resolution_remarks = Column(Text, nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    attendance_record = relationship("AttendanceRecord", back_populates="disputes")
    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course", foreign_keys=[course_id])
    teacher = relationship("User", foreign_keys=[teacher_id])
    current_owner = relationship("User", foreign_keys=[current_owner_id])
    events = relationship("DisputeEvent", back_populates="dispute", order_by="DisputeEvent.created_at")

    def __repr__(self):
        return f"<Dispute id={self.id} status={self.status} owner={self.current_owner_id}>"


class DisputeEvent(Base):
    __tablename__ = "dispute_events"

    id = Column(Integer, primary_key=True, index=True)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(Enum(DisputeEventType), nullable=False)
    previous_status = Column(Enum(DisputeStatus), nullable=True)
    new_status = Column(Enum(DisputeStatus), nullable=True)
    previous_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    new_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    dispute = relationship("Dispute", back_populates="events")
    actor = relationship("User", foreign_keys=[actor_id])
    previous_owner = relationship("User", foreign_keys=[previous_owner_id])
    new_owner = relationship("User", foreign_keys=[new_owner_id])

    def __repr__(self):
        return f"<DisputeEvent id={self.id} dispute={self.dispute_id} type={self.event_type}>"
