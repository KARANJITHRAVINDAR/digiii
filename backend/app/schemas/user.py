from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from app.models.user import UserRole
from app.schemas.department import DepartmentMinimal


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    department_id: Optional[int] = None
    department: Optional[DepartmentMinimal] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserMinimal(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole
    department_id: Optional[int] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
