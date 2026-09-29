# DigiCampus Product Engineering Internship Assignment

## Project: Campus Attendance Dispute & Escalation System

---

## 1. Problem Statement

On a college campus, students depend on accurate and up-to-date information about attendance and academic activities.

A common coordination problem occurs when a student believes that an attendance record is incorrect.

Currently, resolving such issues can involve:

- Manually contacting teachers
- Calling or messaging staff
- Visiting departments
- Following up repeatedly
- Losing track of who is responsible
- No clear escalation mechanism
- No reliable history of what happened
- Delays when the responsible person does not respond

The system should provide a structured workflow for raising, reviewing, resolving and escalating attendance disputes.

The goal is not to build a complete college management system.

The goal is to solve the coordination problem around attendance disputes.

---

# 2. Core Problem

A student should be able to report an incorrect attendance record.

The dispute should reach the appropriate teacher.

If the teacher does not take action within the defined period, the dispute should automatically escalate.

The escalation must be based on the department that owns the COURSE, not the student's department.

---

# 3. Critical Business Rule

This is the most important domain rule.

### Escalation must follow course ownership.

The lookup is:

Student
    ↓
Attendance Record
    ↓
Course
    ↓
Course Department
    ↓
HOD

NOT:

Student
    ↓
Student Department
    ↓
HOD

---

## Example

A CSE student takes Engineering Mathematics.

The student belongs to:

CSE

The course belongs to:

Science & Humanities

The mathematics teacher belongs to the Science & Humanities department.

Therefore, if the attendance dispute is escalated:

Student
    ↓
Mathematics Course
    ↓
Science & Humanities Department
    ↓
Science & Humanities HOD

The CSE HOD must NOT receive the escalation merely because the student is from CSE.

---

# 4. Assumptions

The following assumptions are intentionally made to keep the system manageable.

1. Each student belongs to one department.
2. Each course belongs to one department.
3. Each course has an assigned teacher.
4. Each department has one HOD.
5. The HOD responsible for escalation is determined by the course's department.
6. A student can be enrolled in courses belonging to another department.
7. A teacher may teach courses outside their own department if required.
8. Attendance belongs to a student-course relationship.
9. A dispute belongs to a specific attendance record.
10. Escalation occurs when the current owner does not act within the configured deadline.

---

# 5. Special Edge Cases

### Teacher is also the HOD

If the teacher responsible for the dispute is also the HOD:

Teacher
    ↓
HOD

must not result in the dispute being assigned to the same person twice.

The system should skip the duplicate escalation level and continue to Admin.

---

### Department has no HOD

If a course's department has no assigned HOD:

Teacher
    ↓
Admin

---

# 6. Users and Roles

The system contains four primary roles.

## STUDENT

Students can:

- Login
- View their courses
- View attendance
- View attendance history
- Raise attendance disputes
- View their disputes
- Track dispute status
- Receive notifications

Students must only be able to access their own student-related data.

---

## TEACHER

Teachers can:

- Login
- View assigned courses
- View enrolled students
- Mark attendance
- View attendance
- View disputes assigned to them
- Review disputes
- Approve disputes
- Reject disputes
- Add resolution comments
- Receive notifications

Teachers must only access courses and disputes assigned to them.

---

## HOD

HODs can:

- Login
- View department information
- View department courses
- View teachers
- View escalated disputes
- Review escalated disputes
- Resolve/reassign disputes where permitted
- View department-level statistics
- Receive escalation notifications

An HOD should only receive disputes for courses belonging to their department.

---

## ADMIN

Admin has system-wide access.

Admin can:

- Manage users
- Manage departments
- Assign HODs
- Manage courses
- Assign teachers
- Manage enrollments
- View all disputes
- View escalated disputes
- View audit logs
- View system health
- Handle disputes that cannot be resolved through normal escalation

---

# 7. Core Workflow

## Attendance

Teacher
    ↓
Select Course
    ↓
Select Student
    ↓
Mark Attendance
    ↓
Attendance Record

Student
    ↓
View Attendance

---

# 8. Dispute Workflow

Student notices incorrect attendance.

Student
    ↓
Select Attendance Record
    ↓
Raise Dispute
    ↓
Enter Reason
    ↓
Submit

Dispute is created with:

status = OPEN

owner = responsible teacher

---

# 9. Teacher Resolution

Teacher receives notification.

Teacher opens dispute.

Teacher can:

### Approve

Attendance is corrected.

### Reject

Attendance remains unchanged.

Teacher must provide an explanation when resolving the dispute.

---

# 10. Escalation Workflow

Default escalation:

OPEN
    ↓
Teacher
    ↓
48 hours
    ↓
Course Department HOD
    ↓
48 hours
    ↓
Admin

The escalation period should be configurable through environment/configuration rather than hardcoded throughout the application.

---

# 11. Important Statuses

Possible dispute statuses:

- OPEN
- UNDER_REVIEW
- RESOLVED
- REJECTED
- ESCALATED
- CLOSED

The implementation should maintain a clear state transition model.

Invalid transitions should be rejected.

---

# 12. Attendance Versioning

Attendance changes should not destroy the original history.

Example:

Version 1:

Attendance = ABSENT

Teacher approves dispute.

Version 2:

Attendance = PRESENT

The system should retain the history.

---

# 13. Audit Trail

Important actions should generate audit events.

Examples:

- Student created dispute
- Teacher opened dispute
- Teacher approved dispute
- Teacher rejected dispute
- Attendance changed
- Dispute escalated
- HOD reviewed dispute
- Admin resolved dispute
- Notification generated

Audit records should be append-only.

---

# 14. Data Model

Initial entities:

## users

- id
- name
- email
- password_hash
- role
- department_id
- created_at
- updated_at

## departments

- id
- name
- hod_id
- created_at

## courses

- id
- code
- name
- department_id
- teacher_id
- created_at

## enrollments

- id
- student_id
- course_id

## attendance_records

- id
- student_id
- course_id
- attendance_date
- status
- created_at
- updated_at

## attendance_versions

- id
- attendance_record_id
- previous_status
- new_status
- changed_by
- reason
- created_at

## disputes

- id
- attendance_record_id
- student_id
- course_id
- assigned_to
- status
- reason
- resolution_comment
- due_at
- escalated_at
- created_at
- updated_at

## notifications

- id
- user_id
- type
- title
- message
- read_at
- created_at

## notification_outbox

- id
- notification_id
- recipient
- status
- attempts
- last_error
- created_at
- sent_at

## audit_logs

- id
- actor_id
- action
- entity_type
- entity_id
- metadata
- created_at

---

# 15. Technology Stack

## Frontend

React
Vite
React Router
JavaScript/TypeScript

The frontend should provide separate experiences for:

- Student
- Teacher
- HOD
- Admin

---

## Backend

Python
FastAPI
SQLAlchemy
Alembic
Pydantic
JWT
bcrypt/password hashing

---

## Database

MySQL

Use migrations through Alembic.

Do not use:

create_all()

as the primary production database initialization mechanism.

---

## Background Processing

Use a background worker/scheduler.

Possible implementation:

APScheduler

The worker should periodically check for disputes whose deadlines have expired.

---

## Notifications

In-app notifications are stored in the database.

Email notifications should use SMTP.

Use an outbox pattern so notification failures can be retried.

WhatsApp is outside the scope of this assignment.

---

## Deployment

Use Docker.

Expected services:

frontend
backend
mysql
worker

The application should be runnable using:

docker compose up --build

---

# 16. Security Requirements

Authentication must use:

- Password hashing
- JWT authentication
- Role-based authorization

Never trust:

- X-User-ID headers
- Client-side role values
- Client-side ownership claims

Every protected backend endpoint must verify authorization server-side.

Additional security:

- Input validation
- SQL injection prevention
- CORS restrictions
- Rate limiting on login
- Secure environment configuration
- No secrets committed to Git
- Proper HTTP status codes
- Authorization checks on object access

---

# 17. Concurrency Requirements

The system must prevent two users from performing conflicting operations simultaneously.

Example:

Two administrators must not both resolve the same dispute.

Use transactional/conditional database operations where necessary.

---

# 18. API Design

Example API groups:

/api/auth/*
/api/students/*
/api/teachers/*
/api/hod/*
/api/admin/*
/api/attendance/*
/api/disputes/*
/api/notifications/*
/api/health

Exact API design is left to implementation.

---

# 19. Frontend Pages

## Student

Dashboard
Attendance
Attendance Details
Raise Dispute
My Disputes
Dispute Details
Notifications
Profile

## Teacher

Dashboard
My Courses
Course Attendance
Mark Attendance
Disputes
Dispute Details
Notifications
Profile

## HOD

Dashboard
Department Overview
Courses
Teachers
Escalated Disputes
Dispute Details
Notifications
Profile

## Admin

Dashboard
Users
Departments
Courses
Enrollments
All Disputes
Audit Logs
Notifications
System Health

---

# 20. Project Goal

The project should demonstrate:

1. Understanding of ambiguous real-world requirements.
2. Correct domain modeling.
3. Backend API design.
4. Authentication and authorization.
5. Database design.
6. Automatic escalation.
7. Notifications.
8. Auditability.
9. Concurrency handling.
10. Production-oriented engineering.

The project should not attempt to become a complete ERP or college management platform.

Focus on solving the coordination problem well.

---

# 21. Important Engineering Principle

Do not over-engineer features that are unrelated to the core problem.

Prioritize:

Correctness
Security
Maintainability
Testability
Clear architecture
Good user experience

over:

Large feature count
Unnecessary animations
Unrelated modules
Artificial complexity