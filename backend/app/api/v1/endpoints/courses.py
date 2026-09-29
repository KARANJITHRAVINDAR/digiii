from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.course import Course
from app.schemas.course import CourseOut
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/courses", response_model=List[CourseOut])
def list_courses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    courses = db.query(Course).all()
    return courses
