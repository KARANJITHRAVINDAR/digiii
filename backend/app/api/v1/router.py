from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    departments,
    courses,
    attendance,
    student,
    teacher,
    hod,
    admin,
    notifications,
)

api_router = APIRouter()
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(departments.router, tags=["Departments"])
api_router.include_router(courses.router, tags=["Courses"])
api_router.include_router(attendance.router)
api_router.include_router(student.router)
api_router.include_router(teacher.router)
api_router.include_router(hod.router)
api_router.include_router(admin.router)
api_router.include_router(notifications.router)
