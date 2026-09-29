from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserOut, UserMinimal
from app.schemas.department import DepartmentOut, DepartmentMinimal
from app.schemas.course import CourseOut

__all__ = ["LoginRequest", "TokenResponse", "UserOut", "UserMinimal", "DepartmentOut", "DepartmentMinimal", "CourseOut"]
