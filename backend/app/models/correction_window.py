import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class WindowStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class CorrectionWindow(Base):
    __tablename__ = "correction_windows"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(WindowStatus), default=WindowStatus.OPEN, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    course = relationship("Course", foreign_keys=[course_id])
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<CorrectionWindow id={self.id} course={self.course_id} status={self.status}>"
