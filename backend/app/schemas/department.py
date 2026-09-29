from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class DepartmentMinimal(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentOut(BaseModel):
    id: int
    name: str
    hod_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
