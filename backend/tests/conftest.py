import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import get_db, Base
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.core.security import hash_password, create_access_token

# In-memory SQLite for fast testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seed_test_db(db_session):
    # Departments
    cse_dept = Department(name="Computer Science & Engineering")
    sh_dept = Department(name="Science & Humanities")
    db_session.add_all([cse_dept, sh_dept])
    db_session.commit()

    # Users
    admin = User(
        name="Admin User",
        email="admin@test.com",
        password_hash=hash_password("adminpass"),
        role=UserRole.ADMIN,
        is_active=True
    )

    sh_hod = User(
        name="SH HOD User",
        email="sh.hod@test.com",
        password_hash=hash_password("hodpass"),
        role=UserRole.HOD,
        department_id=sh_dept.id,
        is_active=True
    )

    math_teacher = User(
        name="Math Teacher",
        email="teacher.math@test.com",
        password_hash=hash_password("teacherpass"),
        role=UserRole.TEACHER,
        department_id=sh_dept.id,
        is_active=True
    )

    cse_student = User(
        name="CSE Student",
        email="student.cse@test.com",
        password_hash=hash_password("studentpass"),
        role=UserRole.STUDENT,
        department_id=cse_dept.id,
        is_active=True
    )

    db_session.add_all([admin, sh_hod, math_teacher, cse_student])
    db_session.commit()

    sh_dept.hod_id = sh_hod.id
    db_session.commit()

    # Course
    ma101 = Course(
        code="MA101",
        name="Engineering Mathematics",
        department_id=sh_dept.id,
        teacher_id=math_teacher.id
    )
    db_session.add(ma101)
    db_session.commit()

    return {
        "admin": admin,
        "sh_hod": sh_hod,
        "math_teacher": math_teacher,
        "cse_student": cse_student,
        "cse_dept": cse_dept,
        "sh_dept": sh_dept,
        "ma101": ma101
    }
