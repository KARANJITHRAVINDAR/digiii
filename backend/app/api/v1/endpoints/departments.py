from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.department import Department
from app.schemas.department import DepartmentOut
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    departments = db.query(Department).all()
    return departments
