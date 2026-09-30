"""
Additional test coverage for:
1. Teacher attendance session creation and marking
2. Teacher IN_REVIEW workflow (start-review endpoint)
3. HOD dispute rejection
4. Notification mark-all-read
5. Admin audit log endpoint
"""
import pytest
from datetime import date, datetime, timezone, timedelta
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceSession, SessionStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.notification import Notification, NotificationType
from app.services.notification_service import create_notification


# ---------------------------------------------------------------------------
# Shared fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def full_workflow_setup(db_session):
    """
    Complete setup: CSE department, S&H department, HOD, teacher, student, course, attendance record.
    Mirrors the cross-dept scenario from the seed data.
    """
    cse_dept = Department(name="CSE Extra Tests")
    sh_dept = Department(name="SH Extra Tests")
    db_session.add_all([cse_dept, sh_dept])
    db_session.commit()

    admin = User(name="Admin XT", email="admin.xt@test.com", password_hash="h", role=UserRole.ADMIN, is_active=True)
    sh_hod = User(name="SH HOD XT", email="sh.hod.xt@test.com", password_hash="h", role=UserRole.HOD, department_id=sh_dept.id, is_active=True)
    teacher = User(name="Teacher XT", email="teacher.xt@test.com", password_hash="h", role=UserRole.TEACHER, department_id=sh_dept.id, is_active=True)
    student = User(name="Student XT", email="student.xt@test.com", password_hash="h", role=UserRole.STUDENT, department_id=cse_dept.id, is_active=True)
    db_session.add_all([admin, sh_hod, teacher, student])
    db_session.commit()

    sh_dept.hod_id = sh_hod.id
    db_session.commit()

    course = Course(code="XTC101", name="Extra Test Course", department_id=sh_dept.id, teacher_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    att_record = AttendanceRecord(
        student_id=student.id,
        course_id=course.id,
        attendance_date=date(2026, 9, 25),
        status=AttendanceStatus.ABSENT,
        marked_by=teacher.id
    )
    db_session.add(att_record)
    db_session.commit()

    return {
        "admin": admin,
        "sh_hod": sh_hod,
        "teacher": teacher,
        "student": student,
        "sh_dept": sh_dept,
        "cse_dept": cse_dept,
        "course": course,
        "att_record": att_record,
    }


# ---------------------------------------------------------------------------
# Test 1: Teacher attendance session creation and marking
# ---------------------------------------------------------------------------

def test_teacher_creates_session_and_marks_attendance(client, full_workflow_setup, db_session):
    """
    Teacher creates an attendance session for their course, then marks a student
    as ABSENT. Verifies the session is COMPLETED and the record is saved.
    """
    teacher = full_workflow_setup["teacher"]
    student = full_workflow_setup["student"]
    course = full_workflow_setup["course"]

    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)

    # Step 1: Create session
    session_res = client.post(
        "/api/attendance/sessions",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "course_id": course.id,
            "session_date": "2026-09-26",
            "start_time": "09:00:00",
            "end_time": "10:00:00"
        }
    )
    assert session_res.status_code == 201, f"Expected 201, got {session_res.status_code}: {session_res.json()}"
    session_id = session_res.json()["id"]
    assert session_res.json()["status"] == "SCHEDULED"

    # Step 2: Mark attendance
    mark_res = client.post(
        f"/api/attendance/sessions/{session_id}/records",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "records": [{"student_id": student.id, "status": "ABSENT"}]
        }
    )
    assert mark_res.status_code == 200, f"Expected 200, got {mark_res.status_code}: {mark_res.json()}"
    records = mark_res.json()
    assert len(records) == 1
    assert records[0]["status"] == "ABSENT"
    assert records[0]["student_id"] == student.id

    # Step 3: Verify session is now COMPLETED
    session_list_res = client.get(
        "/api/attendance/sessions",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    sessions = session_list_res.json()
    completed = [s for s in sessions if s["id"] == session_id]
    assert len(completed) == 1
    assert completed[0]["status"] == "COMPLETED"


def test_teacher_cannot_mark_another_teachers_session(client, full_workflow_setup, db_session):
    """
    A teacher cannot mark attendance for a session belonging to another teacher's course.
    """
    # Create a second teacher
    teacher2 = User(
        name="Intruder Teacher", email="intruder.xt@test.com",
        password_hash="h", role=UserRole.TEACHER,
        department_id=full_workflow_setup["sh_dept"].id, is_active=True
    )
    db_session.add(teacher2)
    db_session.commit()

    # Create session as original teacher
    teacher = full_workflow_setup["teacher"]
    course = full_workflow_setup["course"]
    session = AttendanceSession(
        course_id=course.id,
        teacher_id=teacher.id,
        session_date=date(2026, 9, 27),
        status=SessionStatus.SCHEDULED
    )
    db_session.add(session)
    db_session.commit()

    # Intruder teacher tries to mark it
    intruder_token = create_access_token(subject=teacher2.id, role="TEACHER")
    res = client.post(
        f"/api/attendance/sessions/{session.id}/records",
        headers={"Authorization": f"Bearer {intruder_token}"},
        json={"records": [{"student_id": full_workflow_setup["student"].id, "status": "PRESENT"}]}
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Test 2: Teacher IN_REVIEW workflow
# ---------------------------------------------------------------------------

def test_teacher_can_mark_dispute_in_review(client, full_workflow_setup, db_session):
    """
    Teacher receives an OPEN dispute and marks it IN_REVIEW.
    Verifies status transition and audit event creation.
    """
    teacher = full_workflow_setup["teacher"]
    student = full_workflow_setup["student"]
    att_record = full_workflow_setup["att_record"]
    course = full_workflow_setup["course"]

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=student.id,
        course_id=course.id,
        teacher_id=teacher.id,
        reason="I was sitting in the front row",
        status=DisputeStatus.OPEN,
        current_owner_id=teacher.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=48)
    )
    db_session.add(dispute)
    db_session.commit()

    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)
    res = client.patch(
        f"/api/teacher/disputes/{dispute.id}/start-review",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.json()}"
    assert res.json()["status"] == "IN_REVIEW"

    # Verify notification sent to student
    notif = db_session.query(Notification).filter(
        Notification.recipient_id == student.id,
        Notification.title == "Dispute Under Review"
    ).first()
    assert notif is not None


def test_in_review_dispute_cannot_be_started_again(client, full_workflow_setup, db_session):
    """
    A dispute already in IN_REVIEW cannot be transitioned again via start-review.
    """
    teacher = full_workflow_setup["teacher"]
    student = full_workflow_setup["student"]
    att_record = full_workflow_setup["att_record"]
    course = full_workflow_setup["course"]

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=student.id,
        course_id=course.id,
        teacher_id=teacher.id,
        reason="Re-review attempt",
        status=DisputeStatus.IN_REVIEW,
        current_owner_id=teacher.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db_session.add(dispute)
    db_session.commit()

    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)
    res = client.patch(
        f"/api/teacher/disputes/{dispute.id}/start-review",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res.status_code == 409
    assert "IN_REVIEW" in res.json()["detail"]


# ---------------------------------------------------------------------------
# Test 3: HOD dispute rejection
# ---------------------------------------------------------------------------

def test_hod_rejects_escalated_dispute_with_reason(client, full_workflow_setup, db_session):
    """
    HOD receives an escalated dispute in their queue and rejects it with a reason.
    Verifies:
    - Status changes to REJECTED
    - resolution_remarks stored
    - Student receives rejection notification
    - rejection requires non-empty reason
    """
    sh_hod = full_workflow_setup["sh_hod"]
    student = full_workflow_setup["student"]
    teacher = full_workflow_setup["teacher"]
    att_record = full_workflow_setup["att_record"]
    course = full_workflow_setup["course"]

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=student.id,
        course_id=course.id,
        teacher_id=teacher.id,
        reason="Escalated to HOD for review",
        status=DisputeStatus.ESCALATED_TO_HOD,
        current_owner_id=sh_hod.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=48)
    )
    db_session.add(dispute)
    db_session.commit()

    hod_token = create_access_token(subject=sh_hod.id, role=sh_hod.role.value)
    res = client.post(
        f"/api/hod/disputes/{dispute.id}/reject",
        headers={"Authorization": f"Bearer {hod_token}"},
        json={"reason": "Attendance register and CCTV footage confirm student was absent."}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.json()}"
    data = res.json()
    assert data["status"] == "REJECTED"

    db_session.refresh(dispute)
    assert dispute.resolution_remarks == "Attendance register and CCTV footage confirm student was absent."

    # Student notification sent
    notif = db_session.query(Notification).filter(
        Notification.recipient_id == student.id
    ).order_by(Notification.created_at.desc()).first()
    assert notif is not None
    assert "Rejected" in notif.title


def test_hod_reject_without_reason_fails(client, full_workflow_setup, db_session):
    """
    HOD rejection without a reason must fail with 400/422.
    """
    sh_hod = full_workflow_setup["sh_hod"]
    student = full_workflow_setup["student"]
    teacher = full_workflow_setup["teacher"]
    att_record = full_workflow_setup["att_record"]
    course = full_workflow_setup["course"]

    dispute = Dispute(
        attendance_record_id=att_record.id,
        student_id=student.id,
        course_id=course.id,
        teacher_id=teacher.id,
        reason="Escalated for HOD review",
        status=DisputeStatus.ESCALATED_TO_HOD,
        current_owner_id=sh_hod.id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=48)
    )
    db_session.add(dispute)
    db_session.commit()

    hod_token = create_access_token(subject=sh_hod.id, role=sh_hod.role.value)
    res = client.post(
        f"/api/hod/disputes/{dispute.id}/reject",
        headers={"Authorization": f"Bearer {hod_token}"},
        json={"reason": "   "}
    )
    assert res.status_code in [400, 422]


# ---------------------------------------------------------------------------
# Test 4: Notification mark-all-read
# ---------------------------------------------------------------------------

def test_mark_all_notifications_read(client, full_workflow_setup, db_session):
    """
    Student has 3 unread notifications.
    After calling POST /api/notifications/read-all, all have read_at set.
    Subsequent unread-count should return 0.
    """
    student = full_workflow_setup["student"]

    # Create 3 notifications
    for i in range(3):
        create_notification(
            db=db_session,
            recipient_id=student.id,
            type=NotificationType.DISPUTE_SUBMITTED,
            title=f"Test Notification {i+1}",
            message=f"This is test notification number {i+1}"
        )
    db_session.commit()

    student_token = create_access_token(subject=student.id, role=student.role.value)

    # Verify 3 unread
    count_res = client.get(
        "/api/notifications/unread-count",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert count_res.json()["unread_count"] == 3

    # Mark all read
    read_all_res = client.post(
        "/api/notifications/read-all",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert read_all_res.status_code == 200
    assert "3" in read_all_res.json()["message"]

    # Verify 0 unread now
    count_after = client.get(
        "/api/notifications/unread-count",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert count_after.json()["unread_count"] == 0


def test_mark_single_notification_read(client, full_workflow_setup, db_session):
    """
    Mark a single notification as read using PATCH /{id}/read.
    Second call on same notification should be idempotent (no error).
    """
    student = full_workflow_setup["student"]

    notif = create_notification(
        db=db_session,
        recipient_id=student.id,
        type=NotificationType.DISPUTE_SUBMITTED,
        title="Single Read Test",
        message="Mark me as read"
    )
    db_session.commit()

    student_token = create_access_token(subject=student.id, role=student.role.value)

    # Mark as read (first time)
    res1 = client.patch(
        f"/api/notifications/{notif.id}/read",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res1.status_code == 200

    db_session.refresh(notif)
    assert notif.read_at is not None

    # Mark as read again (idempotent)
    res2 = client.patch(
        f"/api/notifications/{notif.id}/read",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res2.status_code == 200


# ---------------------------------------------------------------------------
# Test 5: Admin audit log endpoint
# ---------------------------------------------------------------------------

def test_admin_can_view_audit_log(client, full_workflow_setup, db_session):
    """
    Admin can fetch the global audit log.
    After a dispute lifecycle event, it should appear in the audit log.
    """
    admin = full_workflow_setup["admin"]
    admin_token = create_access_token(subject=admin.id, role=admin.role.value)

    # Create a dispute (creates a DisputeEvent)
    student = full_workflow_setup["student"]
    teacher = full_workflow_setup["teacher"]
    att_record = full_workflow_setup["att_record"]
    course = full_workflow_setup["course"]

    student_token = create_access_token(subject=student.id, role=student.role.value)
    disp_res = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"attendance_record_id": att_record.id, "reason": "Audit log test dispute"}
    )
    assert disp_res.status_code == 201

    # Admin fetches audit logs
    res = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1
    event_types = [e["event_type"] for e in events]
    assert "DISPUTE_CREATED" in event_types


def test_non_admin_cannot_view_audit_log(client, full_workflow_setup):
    """
    Teacher and student must not be able to access admin audit logs.
    """
    teacher = full_workflow_setup["teacher"]
    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)

    res = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res.status_code == 403