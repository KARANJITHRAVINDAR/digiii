import pytest
from fastapi import APIRouter, Depends
from app.main import app
from app.api.deps import require_admin, require_teacher, require_student
from app.core.security import create_access_token

# Define temporary test endpoints for RBAC verification
rbac_test_router = APIRouter(prefix="/test-rbac")


@rbac_test_router.get("/student-only")
def student_only_endpoint(user=Depends(require_student)):
    return {"message": f"Hello student {user.name}"}


@rbac_test_router.get("/teacher-only")
def teacher_only_endpoint(user=Depends(require_teacher)):
    return {"message": f"Hello teacher {user.name}"}


@rbac_test_router.get("/admin-only")
def admin_only_endpoint(user=Depends(require_admin)):
    return {"message": f"Hello admin {user.name}"}

app.include_router(rbac_test_router)


def test_student_accessing_teacher_endpoint_rejected(client, seed_test_db):
    student = seed_test_db["cse_student"]
    token = create_access_token(subject=student.id, role=student.role.value)

    response = client.get(
        "/test-rbac/teacher-only",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]


def test_admin_accessing_admin_endpoint_allowed(client, seed_test_db):
    admin = seed_test_db["admin"]
    token = create_access_token(subject=admin.id, role=admin.role.value)

    response = client.get(
        "/test-rbac/admin-only",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == f"Hello admin {admin.name}"
