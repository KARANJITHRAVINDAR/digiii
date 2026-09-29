from datetime import date, datetime, timezone, timedelta
import pytest
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceVersion, AttendanceStatus
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType
from app.models.notification import Notification
from app.models.correction_window import CorrectionWindow
from app.services.escalation_worker import process_overdue_escalations


@pytest.fixture
def m2_full_setup(db_session):
    # 1. Departments
    cse_dept = Department(name="Computer Science & Engineering")
    sh_dept = Department(name="Science & Humanities")
    db_session.add_all([cse_dept, sh_dept])
    db_session.commit()

    # 2. Users
    admin = User(
        name="System Admin",
        email="admin@test.com",
        password_hash="hash",
        role=UserRole.ADMIN,
        is_active=True
    )

    cse_hod = User(
        name="CSE HOD",
        email="cse.hod@test.com",
        password_hash="hash",
        role=UserRole.HOD,
        department_id=cse_dept.id,
        is_active=True
    )

    sh_hod = User(
        name="S&H HOD",
        email="sh.hod@test.com",
        password_hash="hash",
        role=UserRole.HOD,
        department_id=sh_dept.id,
        is_active=True
    )

    math_teacher = User(
        name="Math Teacher",
        email="math.teacher@test.com",
        password_hash="hash",
        role=UserRole.TEACHER,
        department_id=sh_dept.id,
        is_active=True
    )

    cse_student = User(
        name="CSE Student",
        email="cse.student@test.com",
        password_hash="hash",
        role=UserRole.STUDENT,
        department_id=cse_dept.id,
        is_active=True
    )

    db_session.add_all([admin, cse_hod, sh_hod, math_teacher, cse_student])
    db_session.commit()

    # Link HODs
    cse_dept.hod_id = cse_hod.id
    sh_dept.hod_id = sh_hod.id
    db_session.commit()

    # 3. Course: MA101 belongs to Science & Humanities
    ma101 = Course(
        code="MA101",
        name="Engineering Mathematics",
        department_id=sh_dept.id,  # Course department is S&H
        teacher_id=math_teacher.id
    )
    db_session.add(ma101)
    db_session.commit()

    # 4. Attendance Record: CSE Student marked ABSENT in MA101
    att_record = AttendanceRecord(
        student_id=cse_student.id,
        course_id=ma101.id,
        attendance_date=date(2026, 9, 29),
        status=AttendanceStatus.ABSENT,
        marked_by=math_teacher.id
    )
    db_session.add(att_record)
    db_session.commit()

    return {
        "admin": admin,
        "cse_hod": cse_hod,
        "sh_hod": sh_hod,
        "math_teacher": math_teacher,
        "cse_student": cse_student,
        "cse_dept": cse_dept,
        "sh_dept": sh_dept,
        "ma101": ma101,
        "att_record": att_record
    }


def test_cross_department_escalation_to_course_hod(m2_full_setup, db_session):
    """
    MANDATORY SCENARIO 3:
    Student: CSE Student
    Course: MA101 (Science & Humanities Department)
    SLA Expires.
    VERIFY: Dispute MUST escalate to S&H HOD, NOT CSE HOD!
    """
    cse_student = m2_full_setup["cse_student"]
    cse_hod = m2_full_setup["cse_hod"]
    sh_hod = m2_full_setup["sh_hod"]
    math_teacher = m2_full_setup["math_teacher"]
    ma101 = m2_full_setup["ma101"]
    att_record = m2_full_setup["att_record"]

    # Past due_at to simulate SLA expiration (expired 10 minutes ago)
    past_due = datetime.now(timezone.utc) - timedelta(minutes=10)

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=cse_student.id,
        course_id=ma101.id,
        teacher_id=math_teacher.id,
        reason="I was present in math class",
        status=DisputeStatus.OPEN,
        current_owner_id=math_teacher.id,
        due_at=past_due
    )
    db_session.add(dispute)
    db_session.commit()

    # Run Background Escalation Worker Sweep
    result = process_overdue_escalations(db_session)
    assert result["escalated_to_hod"] == 1

    db_session.refresh(dispute)
    # VERIFY CRITICAL BUSINESS RULE:
    # CSE HOD MUST NOT receive escalation
    assert dispute.current_owner_id != cse_hod.id
    # S&H HOD MUST receive escalation
    assert dispute.current_owner_id == sh_hod.id
    assert dispute.status == DisputeStatus.ESCALATED_TO_HOD

    # Verify notification created for S&H HOD
    notif = db_session.query(Notification).filter(Notification.recipient_id == sh_hod.id).first()
    assert notif is not None
    assert "escalated" in notif.title.lower()


def test_hod_to_admin_escalation_stage(m2_full_setup, db_session):
    """
    Verify Stage 2 Escalation: HOD SLA expires -> Escalates to Admin.
    """
    cse_student = m2_full_setup["cse_student"]
    sh_hod = m2_full_setup["sh_hod"]
    admin = m2_full_setup["admin"]
    math_teacher = m2_full_setup["math_teacher"]
    ma101 = m2_full_setup["ma101"]
    att_record = m2_full_setup["att_record"]

    past_due = datetime.now(timezone.utc) - timedelta(minutes=10)

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=cse_student.id,
        course_id=ma101.id,
        teacher_id=math_teacher.id,
        reason="Unresolved by HOD",
        status=DisputeStatus.ESCALATED_TO_HOD,
        current_owner_id=sh_hod.id,
        due_at=past_due
    )
    db_session.add(dispute)
    db_session.commit()

    result = process_overdue_escalations(db_session)
    assert result["escalated_to_admin"] == 1

    db_session.refresh(dispute)
    assert dispute.current_owner_id == admin.id
    assert dispute.status == DisputeStatus.ESCALATED_TO_ADMIN


def test_escalation_idempotency(m2_full_setup, db_session):
    """
    Verify that running the escalation worker multiple times is idempotent and does not re-escalate.
    """
    cse_student = m2_full_setup["cse_student"]
    sh_hod = m2_full_setup["sh_hod"]
    math_teacher = m2_full_setup["math_teacher"]
    ma101 = m2_full_setup["ma101"]
    att_record = m2_full_setup["att_record"]

    past_due = datetime.now(timezone.utc) - timedelta(minutes=10)

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=cse_student.id,
        course_id=ma101.id,
        teacher_id=math_teacher.id,
        reason="Testing idempotency",
        status=DisputeStatus.OPEN,
        current_owner_id=math_teacher.id,
        due_at=past_due
    )
    db_session.add(dispute)
    db_session.commit()

    # First sweep
    res1 = process_overdue_escalations(db_session)
    assert res1["escalated_to_hod"] == 1

    # Second immediate sweep (due_at set 48h in future for HOD)
    res2 = process_overdue_escalations(db_session)
    assert res2["escalated_to_hod"] == 0
    assert res2["escalated_to_admin"] == 0


def test_hod_resolve_escalated_dispute(client, m2_full_setup, db_session):
    """
    Verify HOD resolves an escalated dispute in their queue.
    """
    cse_student = m2_full_setup["cse_student"]
    sh_hod = m2_full_setup["sh_hod"]
    math_teacher = m2_full_setup["math_teacher"]
    ma101 = m2_full_setup["ma101"]
    att_record = m2_full_setup["att_record"]

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=cse_student.id,
        course_id=ma101.id,
        teacher_id=math_teacher.id,
        reason="HOD review required",
        status=DisputeStatus.ESCALATED_TO_HOD,
        current_owner_id=sh_hod.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=48)
    )
    db_session.add(dispute)
    db_session.commit()

    hod_token = create_access_token(subject=sh_hod.id, role=sh_hod.role.value)
    res = client.post(
        f"/api/hod/disputes/{dispute.id}/resolve",
        headers={"Authorization": f"Bearer {hod_token}"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    db_session.refresh(att_record)
    assert att_record.status == AttendanceStatus.PRESENT


def test_correction_window_creation(client, m2_full_setup):
    admin = m2_full_setup["admin"]
    ma101 = m2_full_setup["ma101"]
    admin_token = create_access_token(subject=admin.id, role=admin.role.value)

    res = client.post(
        "/api/admin/correction-windows",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "course_id": ma101.id,
            "start_at": "2026-09-29T00:00:00Z",
            "end_at": "2026-10-05T23:59:59Z"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "OPEN"
    assert data["course_id"] == ma101.id
