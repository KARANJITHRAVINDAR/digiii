@echo off
TITLE DigiCampus Launcher
COLOR 0B

echo ======================================================================
echo    DIGICAMPUS ATTENDANCE DISPUTE ^& SLA ESCALATION SYSTEM
echo ======================================================================
echo.
echo [1/4] Preparing Backend Database and Running Migrations...
cd /d "%~dp0backend"
call python -m alembic upgrade head
call python seed.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTE] If database connection failed, ensure your MySQL service is running.
    echo.
)

echo.
echo [2/4] Starting FastAPI Backend on http://localhost:8000 ...
start "DigiCampus - FastAPI Backend" cmd /k "cd /d %~dp0backend && title DigiCampus Backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo [3/4] Starting Background SLA Escalation and Outbox Worker...
start "DigiCampus - Background Worker" cmd /k "cd /d %~dp0backend && title DigiCampus Worker && python worker.py"

echo.
echo [4/4] Starting React + Vite Frontend on http://localhost:5173 ...
start "DigiCampus - React Frontend" cmd /k "cd /d %~dp0frontend && title DigiCampus Frontend && npm run dev"

echo.
echo ======================================================================
echo    ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ======================================================================
echo.
echo  - Frontend Web App:   http://localhost:5173
echo  - Backend REST API:   http://localhost:8000
echo  - Interactive Docs:   http://localhost:8000/docs
echo.
echo  Demo Credentials:
echo   - Student:  student.cse@digiicampus.com  / student123
echo   - Teacher:  teacher.math@digiicampus.com / teacher123
echo   - HOD:      hod.sh@digiicampus.com       / hod123
echo   - Admin:    admin@digiicampus.com        / admin123
echo.
echo ======================================================================
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
exit
