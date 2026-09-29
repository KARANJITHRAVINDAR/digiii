from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional
from app.models.dispute import DisputeStatus, DisputeEventType
from app.schemas.course import CourseOut
from app.schemas.user import UserMinimal
from app.schemas.attendance import AttendanceRecordOut


class DisputeCreateRequest(BaseModel):
    attendance_record_id: int
    reason: str = Field(..., min_length=5, description="Reason for raising dispute")


class DisputeRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason for rejecting dispute")


class DisputeEventOut(BaseModel):
    id: int
    dispute_id: Optional[int] = None
    actor_id: int
    actor: Optional[UserMinimal] = None
    event_type: DisputeEventType
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DisputeOut(BaseModel):
    id: int
    attendance_record_id: int
    student_id: int
    course_id: int
    reason: str
    status: DisputeStatus
    current_owner_id: int
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    student: Optional[UserMinimal] = None
    course: Optional[CourseOut] = None
    current_owner: Optional[UserMinimal] = None

    model_config = ConfigDict(from_attributes=True)


class DisputeDetailOut(DisputeOut):
    attendance_record: Optional[AttendanceRecordOut] = None
    events: List[DisputeEventOut] = []

    model_config = ConfigDict(from_attributes=True)
