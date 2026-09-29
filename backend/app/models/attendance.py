import enum
from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"


class SessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    status = Column(Enum(SessionStatus), default=SessionStatus.COMPLETED, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    course = relationship("Course", foreign_keys=[course_id])
    teacher = relationship("User", foreign_keys=[teacher_id])
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AttendanceSession id={self.id} course={self.course_id} date={self.session_date}>"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    attendance_date = Column(Date, nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course", foreign_keys=[course_id])
    marker = relationship("User", foreign_keys=[marked_by])
    versions = relationship("AttendanceVersion", back_populates="attendance_record", order_by="desc(AttendanceVersion.created_at)")
    disputes = relationship("Dispute", back_populates="attendance_record")

    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', 'attendance_date', name='uq_student_course_date'),
    )

    def __repr__(self):
        return f"<AttendanceRecord id={self.id} student={self.student_id} course={self.course_id} status={self.status}>"


class AttendanceVersion(Base):
    __tablename__ = "attendance_versions"

    id = Column(Integer, primary_key=True, index=True)
    attendance_record_id = Column(Integer, ForeignKey("attendance_records.id"), nullable=False, index=True)
    old_status = Column(Enum(AttendanceStatus), nullable=False)
    new_status = Column(Enum(AttendanceStatus), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    attendance_record = relationship("AttendanceRecord", back_populates="versions")
    changer = relationship("User", foreign_keys=[changed_by])

    def __repr__(self):
        return f"<AttendanceVersion id={self.id} record={self.attendance_record_id} {self.old_status}->{self.new_status}>"
