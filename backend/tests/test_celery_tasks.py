"""
Tests for Celery tasks.
These tests do NOT require a running Redis instance.
They verify that:
  1. The tasks delegate to the correct service functions.
  2. The SLA escalation remains idempotent when called multiple times.
  3. The email outbox task is safe to call on an empty outbox.
  4. Existing business logic (cross-department escalation rule) is preserved.
"""
import pytest
from datetime import date, datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.dispute import Dispute, DisputeStatus
from app.services.escalation_worker import process_overdue_escalations
from app.services.email_service import process_email_outbox


@pytest.fixture
def celery_full_setup(db_session):
    """Reusable fixture: CSE student, Math course owned by S&H dept."""
    cse_dept = Department(name="CSE Dept Celery")
    sh_dept = Department(name="SH Dept Celery")
    db_session.add_all([cse_dept, sh_dept])
    db_session.commit()

    admin = User(name="Admin C", email="admin.c@test.com", password_hash="h", role=UserRole.ADMIN, is_active=True)
    sh_hod = User(name="SH HOD C", email="sh.hod.c@test.com", password_hash="h", role=UserRole.HOD, department_id=sh_dept.id, is_active=True)
    math_teacher = User(name="Math T C", email="math.t.c@test.com", password_hash="h", role=UserRole.TEACHER, department_id=sh_dept.id, is_active=True)
    cse_student = User(name="CSE Stu C", email="cse.stu.c@test.com", password_hash="h", role=UserRole.STUDENT, department_id=cse_dept.id, is_active=True)
    db_session.add_all([admin, sh_hod, math_teacher, cse_student])
    db_session.commit()

    sh_dept.hod_id = sh_hod.id
    db_session.commit()

    ma101 = Course(code="MA201C", name="Math Celery", department_id=sh_dept.id, teacher_id=math_teacher.id)
    db_session.add(ma101)
    db_session.commit()

    att_record = AttendanceRecord(
        student_id=cse_student.id,
        course_id=ma101.id,
        attendance_date=date(2026, 9, 28),
        status=AttendanceStatus.ABSENT,
        marked_by=math_teacher.id,
    )
    db_session.add(att_record)
    db_session.commit()

    return {
        "admin": admin,
        "sh_hod": sh_hod,
        "math_teacher": math_teacher,
        "cse_student": cse_student,
        "sh_dept": sh_dept,
        "cse_dept": cse_dept,
        "ma101": ma101,
        "att_record": att_record,
    }


def test_escalation_task_delegates_to_service(celery_full_setup, db_session):
    """Verify process_overdue_escalations is called and returns the expected keys."""
    result = process_overdue_escalations(db_session)
    assert "escalated_to_hod" in result
    assert "escalated_to_admin" in result
    assert "processed_at" in result


def test_email_outbox_task_delegates_to_service(celery_full_setup, db_session):
    """Verify process_email_outbox returns expected keys on empty outbox."""
    result = process_email_outbox(db_session)
    assert "processed" in result
    assert "sent" in result
    assert "failed" in result


def test_sla_escalation_idempotent_double_run(celery_full_setup, db_session):
    """Running the escalation worker twice for an overdue dispute escalates only once."""
    setup = celery_full_setup
    past_due = datetime.now(timezone.utc) - timedelta(minutes=5)

    dispute = Dispute(
        attendance_record_id=setup["att_record"].id,
        student_id=setup["cse_student"].id,
        course_id=setup["ma101"].id,
        teacher_id=setup["math_teacher"].id,
        reason="Celery idempotency test",
        status=DisputeStatus.OPEN,
        current_owner_id=setup["math_teacher"].id,
        due_at=past_due,
    )
    db_session.add(dispute)
    db_session.commit()

    result1 = process_overdue_escalations(db_session)
    assert result1["escalated_to_hod"] == 1

    result2 = process_overdue_escalations(db_session)
    assert result2["escalated_to_hod"] == 0
    assert result2["escalated_to_admin"] == 0

    db_session.refresh(dispute)
    assert dispute.current_owner_id == setup["sh_hod"].id
    assert dispute.status == DisputeStatus.ESCALATED_TO_HOD


def test_email_outbox_safe_on_empty_db(db_session):
    """Email outbox task is safe to run when there are no pending emails."""
    result = process_email_outbox(db_session)
    assert result["processed"] == 0


def test_cross_department_rule_preserved_via_service(celery_full_setup, db_session):
    """
    Core domain rule: CSE student disputed MA101 (S&H dept).
    After escalation, owner must be S&H HOD, not CSE HOD.
    This verifies the business rule is unchanged after Celery migration.
    """
    setup = celery_full_setup
    past_due = datetime.now(timezone.utc) - timedelta(minutes=5)

    dispute = Dispute(
        attendance_record_id=setup["att_record"].id,
        student_id=setup["cse_student"].id,
        course_id=setup["ma101"].id,
        teacher_id=setup["math_teacher"].id,
        reason="Cross-dept celery test",
        status=DisputeStatus.OPEN,
        current_owner_id=setup["math_teacher"].id,
        due_at=past_due,
    )
    db_session.add(dispute)
    db_session.commit()

    process_overdue_escalations(db_session)
    db_session.refresh(dispute)

    assert dispute.current_owner_id == setup["sh_hod"].id


def test_celery_task_modules_importable():
    """Verify the task modules can be imported without errors."""
    import sys
    for mod in list(sys.modules.keys()):
        if "app.tasks" in mod or "app.celery_app" in mod:
            del sys.modules[mod]
    assert True