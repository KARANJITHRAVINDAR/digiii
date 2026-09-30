@echo off
TITLE DigiCampus Stopper
COLOR 0C

echo ======================================================================
echo    STOPPING DIGICAMPUS SERVICES
echo ======================================================================
echo.
echo Terminating running DigiCampus windows and dev processes...

:: 1. Close specific DigiCampus CMD windows
taskkill /F /FI "WINDOWTITLE eq DigiCampus Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq DigiCampus Worker*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq DigiCampus Frontend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq DigiCampus - *" /T >nul 2>&1

:: 2. Terminate any processes listening on port 8000 (Backend API)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 3. Terminate any processes listening on port 5173 (Vite Frontend)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 4. Terminate uvicorn and node if running directly
taskkill /F /IM uvicorn.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo ======================================================================
echo    ALL DIGICAMPUS PROCESSES TERMINATED SUCCESSFULLY!
echo ======================================================================
echo.
timeout /t 2 >nul
exit
