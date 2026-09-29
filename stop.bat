@echo off
TITLE DigiCampus Stopper
COLOR 0C

echo ======================================================================
echo    STOPPING DIGICAMPUS SERVICES
echo ======================================================================
echo.
echo Terminating running Uvicorn, Python Worker, and Vite processes...

taskkill /F /IM uvicorn.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo All DigiCampus dev processes terminated.
timeout /t 2 >nul
exit
