import pytest
from datetime import datetime, timezone, timedelta, date
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.dispute import Dispute, DisputeStatus
from app.core.security import hash_password, create_access_token


def test_inactive_user_login_blocked(client, db_session):
    inactive_user = User(
        name="Inactive Person",
        email="inactive@digiicampus.com",
        password_hash=hash_password("password123"),
        role=UserRole.STUDENT,
        is_active=False
    )
    db_session.add(inactive_user)
    db_session.commit()

    resp = client.post("/api/auth/login", json={
        "email": "inactive@digiicampus.com",
        "password": "password123"
    })
    assert resp.status_code == 400
    assert "disabled" in resp.json()["detail"].lower()


def test_cross_student_dispute_access_forbidden(client, db_session):
    student1 = User(
        name="Student One",
        email="student1.sec@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    student2 = User(
        name="Student Two",
        email="student2.sec@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    teacher = User(
        name="Teacher Sec",
        email="teacher.sec@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.TEACHER,
        is_active=True
    )
    dept = Department(name="Security Dept")
    db_session.add_all([student1, student2, teacher, dept])
    db_session.commit()

    course = Course(code="SEC101", name="Security", department_id=dept.id, teacher_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    rec1 = AttendanceRecord(
        student_id=student1.id,
        course_id=course.id,
        attendance_date=date(2026, 9, 25),
        status=AttendanceStatus.ABSENT,
        marked_by=teacher.id
    )
    db_session.add(rec1)
    db_session.commit()

    dispute1 = Dispute(
        attendance_record_id=rec1.id,
        student_id=student1.id,
        course_id=course.id,
        teacher_id=teacher.id,
        reason="I was present in room 101",
        status=DisputeStatus.OPEN,
        current_owner_id=teacher.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=48)
    )
    db_session.add(dispute1)
    db_session.commit()

    # Student 2 tries to access Student 1's dispute
    token_s2 = create_access_token(subject=student2.id, role="STUDENT")
    resp = client.get(
        f"/api/student/disputes/{dispute1.id}",
        headers={"Authorization": f"Bearer {token_s2}"}
    )
    assert resp.status_code == 403


def test_correction_window_invalid_time_rejected(client, db_session):
    admin = User(
        name="Sec Admin",
        email="secadmin@digiicampus.com",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True
    )
    teacher = User(
        name="Sec Teacher",
        email="secteacher@digiicampus.com",
        password_hash=hash_password("teacher123"),
        role=UserRole.TEACHER,
        is_active=True
    )
    dept = Department(name="Sec Dept")
    db_session.add_all([admin, teacher, dept])
    db_session.commit()

    course = Course(code="SEC202", name="Sec 202", department_id=dept.id, teacher_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    token_admin = create_access_token(subject=admin.id, role="ADMIN")

    now = datetime.now(timezone.utc)
    # Start time after end time should fail with 400
    resp = client.post(
        "/api/admin/correction-windows",
        json={
            "course_id": course.id,
            "start_at": (now + timedelta(days=5)).isoformat(),
            "end_at": now.isoformat()
        },
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert resp.status_code == 400


def test_student_cannot_raise_dispute_for_another_student_record(client, db_session):
    student1 = User(
        name="Student A",
        email="student.a@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    student2 = User(
        name="Student B",
        email="student.b@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    teacher = User(
        name="Teacher AB",
        email="teacher.ab@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.TEACHER,
        is_active=True
    )
    dept = Department(name="Dept AB")
    db_session.add_all([student1, student2, teacher, dept])
    db_session.commit()

    course = Course(code="AB101", name="AB", department_id=dept.id, teacher_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    rec1 = AttendanceRecord(
        student_id=student1.id,
        course_id=course.id,
        attendance_date=date(2026, 9, 25),
        status=AttendanceStatus.ABSENT,
        marked_by=teacher.id
    )
    db_session.add(rec1)
    db_session.commit()

    token_s2 = create_access_token(subject=student2.id, role="STUDENT")
    resp = client.post(
        "/api/student/disputes",
        json={
            "attendance_record_id": rec1.id,
            "reason": "Trying to dispute student 1's record"
        },
        headers={"Authorization": f"Bearer {token_s2}"}
    )
    assert resp.status_code == 403


def test_teacher_reject_requires_reason(client, db_session):
    teacher = User(
        name="Strict Teacher",
        email="strict.teacher@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.TEACHER,
        is_active=True
    )
    student = User(
        name="Student Req",
        email="student.req@digiicampus.com",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    dept = Department(name="Strict Dept")
    db_session.add_all([teacher, student, dept])
    db_session.commit()

    course = Course(code="STR101", name="Strict Course", department_id=dept.id, teacher_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    rec = AttendanceRecord(
        student_id=student.id,
        course_id=course.id,
        attendance_date=date(2026, 9, 25),
        status=AttendanceStatus.ABSENT,
        marked_by=teacher.id
    )
    db_session.add(rec)
    db_session.commit()

    dispute = Dispute(
        attendance_record_id=rec.id,
        student_id=student.id,
        course_id=course.id,
        teacher_id=teacher.id,
        reason="Was there",
        status=DisputeStatus.OPEN,
        current_owner_id=teacher.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=48)
    )
    db_session.add(dispute)
    db_session.commit()

    token_teacher = create_access_token(subject=teacher.id, role="TEACHER")
    resp = client.post(
        f"/api/teacher/disputes/{dispute.id}/reject",
        json={"reason": "   "},
        headers={"Authorization": f"Bearer {token_teacher}"}
    )
    assert resp.status_code in [400, 422]
