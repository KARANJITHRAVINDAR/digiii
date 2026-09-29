from datetime import date
import pytest
from app.core.security import create_access_token
from app.models.attendance import AttendanceRecord, AttendanceVersion, AttendanceStatus
from app.models.dispute import Dispute, DisputeEvent, DisputeStatus, DisputeEventType


@pytest.fixture
def seed_attendance_data(seed_test_db, db_session):
    student = seed_test_db["cse_student"]
    teacher = seed_test_db["math_teacher"]
    course = seed_test_db["ma101"]

    att_record = AttendanceRecord(
        student_id=student.id,
        course_id=course.id,
        attendance_date=date(2026, 9, 20),
        status=AttendanceStatus.ABSENT,
        marked_by=teacher.id
    )
    db_session.add(att_record)
    db_session.commit()
    db_session.refresh(att_record)

    return {
        **seed_test_db,
        "att_record": att_record
    }


def test_get_student_attendance(client, seed_attendance_data):
    student = seed_attendance_data["cse_student"]
    token = create_access_token(subject=student.id, role=student.role.value)

    res = client.get("/api/student/attendance", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == seed_attendance_data["att_record"].id
    assert data[0]["status"] == "ABSENT"


def test_raise_dispute_success(client, seed_attendance_data, db_session):
    student = seed_attendance_data["cse_student"]
    teacher = seed_attendance_data["math_teacher"]
    att_record = seed_attendance_data["att_record"]
    token = create_access_token(subject=student.id, role=student.role.value)

    res = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "attendance_record_id": att_record.id,
            "reason": "I was present in math class on 20th Sept."
        }
    )
    assert res.status_code == 201
    dispute_data = res.json()
    assert dispute_data["status"] == "OPEN"
    assert dispute_data["current_owner_id"] == teacher.id  # Automatically determined from course teacher!

    # Verify audit event in DB
    events = db_session.query(DisputeEvent).filter(DisputeEvent.dispute_id == dispute_data["id"]).all()
    assert len(events) == 1
    assert events[0].event_type == DisputeEventType.DISPUTE_CREATED


def test_raise_dispute_for_another_student_fails(client, seed_attendance_data):
    teacher = seed_attendance_data["math_teacher"]
    att_record = seed_attendance_data["att_record"]
    # Teacher trying to call student endpoint
    token = create_access_token(subject=teacher.id, role=teacher.role.value)

    res = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {token}"},
        json={"attendance_record_id": att_record.id, "reason": "Unauthorized call"}
    )
    assert res.status_code == 403


def test_raise_duplicate_open_dispute_fails(client, seed_attendance_data):
    student = seed_attendance_data["cse_student"]
    att_record = seed_attendance_data["att_record"]
    token = create_access_token(subject=student.id, role=student.role.value)

    # First dispute
    res1 = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {token}"},
        json={"attendance_record_id": att_record.id, "reason": "First dispute"}
    )
    assert res1.status_code == 201

    # Second dispute on same record
    res2 = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {token}"},
        json={"attendance_record_id": att_record.id, "reason": "Second duplicate dispute"}
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_teacher_inbox_filtering(client, seed_attendance_data):
    student = seed_attendance_data["cse_student"]
    teacher = seed_attendance_data["math_teacher"]
    admin = seed_attendance_data["admin"]
    att_record = seed_attendance_data["att_record"]

    # Student raises dispute
    student_token = create_access_token(subject=student.id, role=student.role.value)
    client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"attendance_record_id": att_record.id, "reason": "Attendance mismatch"}
    )

    # Math Teacher views inbox
    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)
    res = client.get("/api/teacher/disputes", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 200
    inbox = res.json()
    assert len(inbox) == 1
    assert inbox[0]["current_owner_id"] == teacher.id


def test_teacher_approve_dispute_atomic(client, seed_attendance_data, db_session):
    student = seed_attendance_data["cse_student"]
    teacher = seed_attendance_data["math_teacher"]
    att_record = seed_attendance_data["att_record"]

    # 1. Student raises dispute
    student_token = create_access_token(subject=student.id, role=student.role.value)
    disp_res = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"attendance_record_id": att_record.id, "reason": "Marked absent by mistake"}
    )
    dispute_id = disp_res.json()["id"]

    # 2. Teacher approves dispute
    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)
    app_res = client.post(
        f"/api/teacher/disputes/{dispute_id}/approve",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "RESOLVED"

    # 3. Verify AttendanceRecord updated to PRESENT in DB
    db_session.refresh(att_record)
    assert att_record.status == AttendanceStatus.PRESENT

    # 4. Verify AttendanceVersion recorded
    version = db_session.query(AttendanceVersion).filter(AttendanceVersion.attendance_record_id == att_record.id).first()
    assert version is not None
    assert version.old_status == AttendanceStatus.ABSENT
    assert version.new_status == AttendanceStatus.PRESENT
    assert version.changed_by == teacher.id

    # 5. Verify DisputeEvent audit trail
    events = db_session.query(DisputeEvent).filter(DisputeEvent.dispute_id == dispute_id).all()
    event_types = [e.event_type for e in events]
    assert DisputeEventType.DISPUTE_CREATED in event_types
    assert DisputeEventType.DISPUTE_APPROVED in event_types
    assert DisputeEventType.ATTENDANCE_CORRECTED in event_types


def test_teacher_reject_dispute(client, seed_attendance_data, db_session):
    student = seed_attendance_data["cse_student"]
    teacher = seed_attendance_data["math_teacher"]
    att_record = seed_attendance_data["att_record"]

    # 1. Student raises dispute
    student_token = create_access_token(subject=student.id, role=student.role.value)
    disp_res = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"attendance_record_id": att_record.id, "reason": "I was in class"}
    )
    dispute_id = disp_res.json()["id"]

    # 2. Teacher rejects dispute
    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)
    rej_res = client.post(
        f"/api/teacher/disputes/{dispute_id}/reject",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"reason": "Roll call records confirm student was absent."}
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # 3. Verify AttendanceRecord remains ABSENT
    db_session.refresh(att_record)
    assert att_record.status == AttendanceStatus.ABSENT

    # 4. Verify DISPUTE_REJECTED event recorded
    events = db_session.query(DisputeEvent).filter(DisputeEvent.dispute_id == dispute_id).all()
    event_types = [e.event_type for e in events]
    assert DisputeEventType.DISPUTE_REJECTED in event_types


def test_concurrency_double_resolution_fails(client, seed_attendance_data):
    student = seed_attendance_data["cse_student"]
    teacher = seed_attendance_data["math_teacher"]
    att_record = seed_attendance_data["att_record"]

    student_token = create_access_token(subject=student.id, role=student.role.value)
    disp_res = client.post(
        "/api/student/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"attendance_record_id": att_record.id, "reason": "Testing double resolution"}
    )
    dispute_id = disp_res.json()["id"]

    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)
    # First approval
    client.post(f"/api/teacher/disputes/{dispute_id}/approve", headers={"Authorization": f"Bearer {teacher_token}"})

    # Second approval attempt on already RESOLVED dispute
    second_res = client.post(f"/api/teacher/disputes/{dispute_id}/approve", headers={"Authorization": f"Bearer {teacher_token}"})
    assert second_res.status_code == 409
    assert "cannot be approved" in second_res.json()["detail"]
