from pydantic import BaseModel, ConfigDict
from datetime import date, time, datetime
from typing import List, Optional
from app.models.attendance import AttendanceStatus, SessionStatus
from app.schemas.course import CourseOut
from app.schemas.user import UserMinimal


class AttendanceVersionOut(BaseModel):
    id: int
    attendance_record_id: int
    old_status: AttendanceStatus
    new_status: AttendanceStatus
    changed_by: int
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    session_id: Optional[int] = None
    attendance_date: date
    status: AttendanceStatus
    course: CourseOut
    has_active_dispute: Optional[bool] = False
    versions: Optional[List[AttendanceVersionOut]] = []

    model_config = ConfigDict(from_attributes=True)


class AttendanceSessionCreate(BaseModel):
    course_id: int
    session_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class MarkAttendanceItem(BaseModel):
    student_id: int
    status: AttendanceStatus


class MarkAttendanceRequest(BaseModel):
    session_id: Optional[int] = None
    records: List[MarkAttendanceItem]


class AttendanceSessionOut(BaseModel):
    id: int
    course_id: int
    teacher_id: int
    session_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: SessionStatus
    created_at: datetime
    course: Optional[CourseOut] = None
    records: Optional[List[AttendanceRecordOut]] = []

    model_config = ConfigDict(from_attributes=True)
