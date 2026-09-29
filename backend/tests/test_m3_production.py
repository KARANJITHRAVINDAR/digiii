import pytest
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.email_outbox import EmailOutbox, EmailStatus
from app.models.notification import Notification, NotificationType
from app.services.notification_service import create_notification
from app.services.email_service import process_email_outbox


def test_admin_user_creation_and_deactivation(client, seed_test_db, db_session):
    admin = seed_test_db["admin"]
    student = seed_test_db["cse_student"]

    admin_token = create_access_token(subject=admin.id, role=admin.role.value)
    student_token = create_access_token(subject=student.id, role=student.role.value)

    # Non-admin attempt should be rejected (403)
    res_unauth = client.post(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "name": "Unauthorized User",
            "email": "unauth@test.com",
            "password": "password123",
            "role": "STUDENT"
        }
    )
    assert res_unauth.status_code == 403

    # Admin creates new teacher user
    res_create = client.post(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "New Professor",
            "email": "new.prof@test.com",
            "password": "password123",
            "role": "TEACHER",
            "department_id": seed_test_db["sh_dept"].id
        }
    )
    assert res_create.status_code == 201
    new_user = res_create.json()
    assert new_user["role"] == "TEACHER"
    assert "password_hash" not in new_user

    # Admin deactivates student user
    res_deact = client.patch(
        f"/api/admin/users/{student.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False}
    )
    assert res_deact.status_code == 200
    assert res_deact.json()["is_active"] is False


def test_admin_course_management(client, seed_test_db):
    admin = seed_test_db["admin"]
    admin_token = create_access_token(subject=admin.id, role=admin.role.value)

    # Create new course
    res_create = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={
            "code": "PH101",
            "name": "Engineering Physics",
            "department_id": seed_test_db["sh_dept"].id,
            "teacher_id": seed_test_db["math_teacher"].id
        }
    )
    assert res_create.status_code == 201
    course_data = res_create.json()
    assert course_data["code"] == "PH101"

    # Reassign teacher
    res_update = client.patch(
        f"/api/admin/courses/{course_data['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"teacher_id": seed_test_db["sh_hod"].id}
    )
    assert res_update.status_code == 200
    assert res_update.json()["teacher_id"] == seed_test_db["sh_hod"].id


def test_email_outbox_queueing_and_notification(seed_test_db, db_session):
    student = seed_test_db["cse_student"]

    # Creating notification should queue an EmailOutbox record in the same transaction
    notif = create_notification(
        db=db_session,
        recipient_id=student.id,
        type=NotificationType.DISPUTE_RESOLVED,
        title="Test Email Queue",
        message="Your dispute has been resolved."
    )
    db_session.commit()

    outbox_entry = db_session.query(EmailOutbox).filter(
        EmailOutbox.recipient_user_id == student.id,
        EmailOutbox.status == EmailStatus.PENDING
    ).first()

    assert outbox_entry is not None
    assert outbox_entry.recipient_email == student.email
    assert "[DigiCampus] Test Email Queue" in outbox_entry.subject


def test_resource_level_authorization(client, seed_test_db):
    student = seed_test_db["cse_student"]
    teacher = seed_test_db["math_teacher"]

    student_token = create_access_token(subject=student.id, role=student.role.value)
    teacher_token = create_access_token(subject=teacher.id, role=teacher.role.value)

    # Student cannot access admin endpoints
    res1 = client.get("/api/admin/users", headers={"Authorization": f"Bearer {student_token}"})
    assert res1.status_code == 403

    # Teacher cannot access admin endpoints
    res2 = client.get("/api/admin/users", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res2.status_code == 403
