# DigiCampus — Deployment & Verification Guide

This document describes how to deploy, configure, and verify the DigiCampus Attendance Dispute & SLA Escalation System in local and containerized production environments.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Frontend (React + Vite)   |
                      |          Port 3000          |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      FastAPI Backend        |
                      |          Port 8000          |
                      +------+---------------+------+
                             |               |
              +--------------+               +---------------+
              v                                              v
+---------------------------+                  +---------------------------+
|    MySQL 8.0 Database     |                  |       Redis 7 Cache       |
|         Port 3306         |                  |  & Celery Message Broker  |
+---------------------------+                  |         Port 6379         |
                                               +-------------+-------------+
                                                             |
                                                             v
                                               +---------------------------+
                                               |  Celery Background Worker |
                                               |   (SLA Escalation Engine) |
                                               +---------------------------+
```

---

## 1. Quickstart via Docker Compose (Recommended)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+

### Steps

1. **Clone the repository and copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services in detached mode:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify running containers:**
   ```bash
   docker compose ps
   ```
   All 5 services should show state `Up` or `healthy`:
   - `digiicampus_mysql` (Healthy)
   - `digiicampus_redis` (Healthy)
   - `digiicampus_backend`
   - `digiicampus_worker`
   - `digiicampus_frontend`

4. **Run database migrations and seed data:**
   ```bash
   # Run Alembic migrations
   docker compose exec backend alembic upgrade head

   # Seed default departments, courses, users, and demo attendance
   docker compose exec backend python seed.py
   ```

5. **Access the application:**
   - **Web Application:** [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Backend Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 2. 1-Click Windows Setup (`start.bat` & `stop.bat`)

For native Windows development without Docker:

- **Launch all services**: Double-click `start.bat` or run in terminal:
  ```cmd
  start.bat
  ```
  This will:
  1. Auto-detect and activate virtual environments (`backend\venv` or `backend\.venv`) if present.
  2. Run Alembic database migrations (`alembic upgrade head`).
  3. Seed initial demo data (`python seed.py`).
  4. Launch FastAPI on [http://localhost:8000](http://localhost:8000).
  5. Launch the background SLA escalation & outbox worker.
  6. Check `node_modules` and launch the React + Vite frontend on [http://localhost:5173](http://localhost:5173).
  7. Open your default web browser to the app.

- **Stop all services**: Run:
  ```cmd
  stop.bat
  ```
  This terminates all associated CLI windows, frees ports `8000` and `5173`, and shuts down dev workers cleanly.

---

## 3. Default Seed Accounts

The `backend/seed.py` script provisions initial users across all roles:

| Role | Email | Password | Scope / Permissions |
|:-----|:------|:---------|:---------------------|
| **Admin** | `admin@digiicampus.com` | `admin123` | System-wide audit logs, dispute reassignments, manual escalation |
| **HOD (CSE)** | `hod.cse@digiicampus.com` | `hod123` | Computer Science department escalation queue & resolution |
| **HOD (S&H)** | `hod.sh@digiicampus.com` | `hod123` | Science & Humanities department escalation queue |
| **Teacher (CSE)** | `teacher.cse@digiicampus.com` | `teacher123` | CS101 teacher: attendance sessions & dispute review |
| **Teacher (Math)**| `teacher.math@digiicampus.com`| `teacher123` | MA101 teacher: attendance sessions & dispute review |
| **Student (CSE)** | `student.cse@digiicampus.com` | `student123` | Attendance percentage, raise disputes, dispute timeline |

---

## 4. Local Development Setup (Manual)

### Backend

1. **Navigate to the backend directory and create virtualenv:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install pinned dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   Create a `.env` file in `backend/` with database and JWT credentials:
   ```ini
   DATABASE_URL=mysql+pymysql://root:password@localhost:3306/digiicampus
   JWT_SECRET=super_secret_jwt_key_change_in_production_1234567890
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CELERY_BROKER_URL=redis://localhost:6379/0
   CELERY_RESULT_BACKEND=redis://localhost:6379/1
   ```

4. **Run migrations and start backend:**
   ```bash
   alembic upgrade head
   python seed.py
   uvicorn app.main:app --reload --port 8000
   ```

5. **Start the background escalation worker:**
   ```bash
   # Standalone polling worker (processes escalations & outbox emails):
   python worker.py

   # Or Celery worker (if running Redis):
   celery -A app.celery_app.celery worker --loglevel=info
   ```

### Frontend

1. **Navigate to frontend directory and install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Verification & Testing

### Running Backend Test Suite

The test suite validates:
- Authentication & JWT token issuance/refresh
- Role-Based Access Control (RBAC) across Student, Teacher, HOD, and Admin
- Attendance session creation and bulk marking
- Dispute submission, teacher `IN_REVIEW` acknowledgement, and resolutions
- HOD and Admin escalation chains with 48h SLA logic
- Email notifications & in-app mark-all-read workflows
- Celery task dispatch and idempotency

Run all tests:
```bash
cd backend
pytest -v
```

Expected result:
```
============================= 50 passed in ~25s =============================
```

### Verification Checklist

- [x] **Database Connectivity**: `GET http://localhost:8000/health` returns status `healthy`
- [x] **Interactive Docs**: Swagger UI renders at `http://localhost:8000/docs`
- [x] **Student Dispute Creation**: Student can file a dispute on an attended session
- [x] **Teacher Review**: `PATCH /api/v1/teacher/disputes/{id}/start-review` transitions dispute to `IN_REVIEW`
- [x] **SLA Escalation**: Disputes open > 48h escalate to HOD without duplication
- [x] **Notifications**: In-app notifications update and can be marked as read
- [x] **Audit Trail**: Every state change logged with actor, timestamp, and metadata
