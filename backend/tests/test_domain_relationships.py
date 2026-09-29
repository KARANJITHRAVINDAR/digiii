from app.core.security import verify_password


def test_password_stored_hashed(seed_test_db):
    student = seed_test_db["cse_student"]
    assert student.password_hash != "studentpass"
    assert student.password_hash.startswith("$2b$") or len(student.password_hash) > 20
    assert verify_password("studentpass", student.password_hash) is True


def test_course_belongs_to_correct_department(seed_test_db):
    ma101 = seed_test_db["ma101"]
    cse_student = seed_test_db["cse_student"]
    sh_dept = seed_test_db["sh_dept"]
    sh_hod = seed_test_db["sh_hod"]

    # Verify student department vs course department independence
    assert cse_student.department.name == "Computer Science & Engineering"
    assert ma101.department.name == "Science & Humanities"
    assert ma101.department_id == sh_dept.id

    # Verify escalation path: Course -> Course Dept -> HOD
    course_department_hod = ma101.department.hod
    assert course_department_hod.id == sh_hod.id
    assert course_department_hod.name == "SH HOD User"
    assert course_department_hod.id != cse_student.department.hod_id
