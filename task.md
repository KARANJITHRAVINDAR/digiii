# DigiCampus Assignment — Implementation Tasks

## Project

Campus Attendance Dispute & Escalation System

Stack:

- React + Vite
- FastAPI
- SQLAlchemy
- Alembic
- MySQL
- JWT
- bcrypt/password hashing
- APScheduler/background worker
- SMTP
- Docker Compose
- pytest

---

# Development Rules

1. Work milestone by milestone.
2. Do not implement future milestones prematurely.
3. Do not rewrite working modules without a reason.
4. Do not introduce unnecessary dependencies.
5. Do not hardcode secrets.
6. Do not use fake authentication mechanisms.
7. All authorization must happen server-side.
8. Keep business logic out of React components.
9. Keep database logic out of API route handlers where possible.
10. Use migrations for database changes.
11. Write tests for important business rules.
12. Keep the application runnable after every milestone.
13. Update README/documentation when architecture changes.
14. Do not generate mock functionality where real functionality is required.
15. Follow PS.md as the source of truth for business requirements.

---

# M1 — Foundation

## Goal

Create the project skeleton and verify:

React → FastAPI → MySQL

## Tasks

### Backend

- [ ] Create FastAPI project
- [ ] Create application package structure
- [ ] Configure environment variables
- [ ] Configure SQLAlchemy
- [ ] Configure MySQL connection
- [ ] Configure Alembic
- [ ] Create `/api/health`
- [ ] Add centralized exception handling
- [ ] Add Pydantic configuration
- [ ] Add basic logging

### Frontend

- [ ] Create React + Vite application
- [ ] Configure React Router
- [ ] Create common layout
- [ ] Create API client/service
- [ ] Create basic login page placeholder
- [ ] Create dashboard placeholders

### Infrastructure

- [ ] Create Dockerfile for backend
- [ ] Create Dockerfile for frontend
- [ ] Create docker-compose.yml
- [ ] Add MySQL service
- [ ] Add `.env.example`

## Acceptance Criteria

```text
docker compose up --build