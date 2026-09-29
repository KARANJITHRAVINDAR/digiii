from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.department import DepartmentMinimal
from app.schemas.user import UserMinimal


class CourseOut(BaseModel):
    id: int
    code: str
    name: str
    department_id: int
    teacher_id: int
    department: DepartmentMinimal
    teacher: UserMinimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
