@echo off
TITLE DigiCampus Launcher
COLOR 0B

echo ======================================================================
echo    DIGICAMPUS ATTENDANCE DISPUTE ^& SLA ESCALATION SYSTEM
echo ======================================================================
echo.

:: Detect virtualenv if present
set "VENV_ACT="
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    set "VENV_ACT=call "%~dp0backend\venv\Scripts\activate.bat" ^&^& "
    call "%~dp0backend\venv\Scripts\activate.bat"
) else if exist "%~dp0backend\.venv\Scripts\activate.bat" (
    set "VENV_ACT=call "%~dp0backend\.venv\Scripts\activate.bat" ^&^& "
    call "%~dp0backend\.venv\Scripts\activate.bat"
)

echo [1/4] Preparing Backend Database and Running Migrations...
cd /d "%~dp0backend"
call python -m alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Alembic migration failed or database unreachable.
    echo Ensure MySQL is running on localhost:3306 before continuing.
    echo.
) else (
    echo [INFO] Checking / seeding demo data...
    call python seed.py
)

echo.
echo [2/4] Starting FastAPI Backend on http://localhost:8000 ...
start "DigiCampus Backend" cmd /k "%VENV_ACT%cd /d %~dp0backend && title DigiCampus Backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo [3/4] Starting Background SLA Escalation and Outbox Worker...
start "DigiCampus Worker" cmd /k "%VENV_ACT%cd /d %~dp0backend && title DigiCampus Worker && python worker.py"

echo.
echo [4/4] Starting React + Vite Frontend on http://localhost:5173 ...
if not exist "%~dp0frontend\node_modules" (
    echo [INFO] frontend node_modules not found. Running npm install...
    cd /d "%~dp0frontend"
    call npm install
)
start "DigiCampus Frontend" cmd /k "cd /d %~dp0frontend && title DigiCampus Frontend && npm run dev"

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
echo   - Student:      student.cse@digiicampus.com  / student123
echo   - Teacher (CS): teacher.cse@digiicampus.com  / teacher123
echo   - Teacher (MA): teacher.math@digiicampus.com / teacher123
echo   - HOD (CSE):    hod.cse@digiicampus.com      / hod123
echo   - HOD (S^&H):    hod.sh@digiicampus.com       / hod123
echo   - Admin:        admin@digiicampus.com        / admin123
echo.
echo ======================================================================
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
exit
