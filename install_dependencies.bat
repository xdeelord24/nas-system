@echo off
echo ===================================================
echo   NAS System - Dependency Installer
echo ===================================================

echo.
echo [1/2] Installing Backend Dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Installing Frontend Dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ===================================================
echo   Installation Complete!
echo   You can now run 'start_nas.bat' to start the system.
echo ===================================================
pause
