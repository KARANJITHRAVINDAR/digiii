from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.correction_window import WindowStatus
from app.schemas.course import CourseOut


class CorrectionWindowCreate(BaseModel):
    course_id: int
    start_at: datetime
    end_at: datetime


class CorrectionWindowOut(BaseModel):
    id: int
    course_id: int
    start_at: datetime
    end_at: datetime
    created_by: int
    status: WindowStatus
    created_at: datetime
    course: Optional[CourseOut] = None

    model_config = ConfigDict(from_attributes=True)
