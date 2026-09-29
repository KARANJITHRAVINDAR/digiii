import sys
import os
from datetime import date

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.core.security import hash_password


def seed_data():
    print("Starting database seeding...")
    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(User).first():
            print("Database already contains user data. Checking attendance seeding...")
            # Ensure attendance records exist
            if not db.query(AttendanceRecord).first():
                seed_attendance(db)
            return

        # 1. Create Departments (without HOD initially)
        cse_dept = Department(name="Computer Science & Engineering")
        sh_dept = Department(name="Science & Humanities")
        db.add_all([cse_dept, sh_dept])
        db.commit()
        db.refresh(cse_dept)
        db.refresh(sh_dept)

        # 2. Create Users
        admin_user = User(
            name="System Admin",
            email="admin@digiicampus.com",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN,
            department_id=None,
            is_active=True
        )

        cse_hod_user = User(
            name="Dr. Alan Turing (CSE HOD)",
            email="hod.cse@digiicampus.com",
            password_hash=hash_password("hod123"),
            role=UserRole.HOD,
            department_id=cse_dept.id,
            is_active=True
        )

        sh_hod_user = User(
            name="Dr. Isaac Newton (S&H HOD)",
            email="hod.sh@digiicampus.com",
            password_hash=hash_password("hod123"),
            role=UserRole.HOD,
            department_id=sh_dept.id,
            is_active=True
        )

        cse_teacher_user = User(
            name="Prof. Donald Knuth",
            email="teacher.cse@digiicampus.com",
            password_hash=hash_password("teacher123"),
            role=UserRole.TEACHER,
            department_id=cse_dept.id,
            is_active=True
        )

        math_teacher_user = User(
            name="Prof. Carl Gauss",
            email="teacher.math@digiicampus.com",
            password_hash=hash_password("teacher123"),
            role=UserRole.TEACHER,
            department_id=sh_dept.id,
            is_active=True
        )

        cse_student_user = User(
            name="Karan Student (CSE)",
            email="student.cse@digiicampus.com",
            password_hash=hash_password("student123"),
            role=UserRole.STUDENT,
            department_id=cse_dept.id,
            is_active=True
        )

        db.add_all([
            admin_user, 
            cse_hod_user, 
            sh_hod_user, 
            cse_teacher_user, 
            math_teacher_user, 
            cse_student_user
        ])
        db.commit()

        db.refresh(cse_hod_user)
        db.refresh(sh_hod_user)
        db.refresh(cse_teacher_user)
        db.refresh(math_teacher_user)
        db.refresh(cse_student_user)

        # 3. Assign HODs to Departments
        cse_dept.hod_id = cse_hod_user.id
        sh_dept.hod_id = sh_hod_user.id
        db.commit()

        # 4. Create Courses
        cs101_course = Course(
            code="CS101",
            name="Data Structures & Algorithms",
            department_id=cse_dept.id,
            teacher_id=cse_teacher_user.id
        )

        ma101_course = Course(
            code="MA101",
            name="Engineering Mathematics",
            department_id=sh_dept.id,
            teacher_id=math_teacher_user.id
        )

        db.add_all([cs101_course, ma101_course])
        db.commit()

        # 5. Seed Attendance Records
        seed_attendance(db)

        print("Successfully seeded demo data:")
        print("  - 2 Departments (CSE, S&H)")
        print("  - 6 Users (1 Admin, 2 HODs, 2 Teachers, 1 Student)")
        print("  - 2 Courses (CS101 in CSE, MA101 in S&H)")
        print("  - Attendance Records created for student Karan")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()


def seed_attendance(db):
    student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    ma101 = db.query(Course).filter(Course.code == "MA101").first()
    cs101 = db.query(Course).filter(Course.code == "CS101").first()

    if not student or not ma101 or not cs101:
        return

    records = [
        AttendanceRecord(
            student_id=student.id,
            course_id=ma101.id,
            attendance_date=date(2026, 9, 20),
            status=AttendanceStatus.ABSENT,
            marked_by=ma101.teacher_id
        ),
        AttendanceRecord(
            student_id=student.id,
            course_id=ma101.id,
            attendance_date=date(2026, 9, 22),
            status=AttendanceStatus.PRESENT,
            marked_by=ma101.teacher_id
        ),
        AttendanceRecord(
            student_id=student.id,
            course_id=cs101.id,
            attendance_date=date(2026, 9, 21),
            status=AttendanceStatus.ABSENT,
            marked_by=cs101.teacher_id
        ),
        AttendanceRecord(
            student_id=student.id,
            course_id=cs101.id,
            attendance_date=date(2026, 9, 23),
            status=AttendanceStatus.PRESENT,
            marked_by=cs101.teacher_id
        ),
    ]

    db.add_all(records)
    db.commit()
    print("Seeded sample attendance records.")


if __name__ == "__main__":
    seed_data()
