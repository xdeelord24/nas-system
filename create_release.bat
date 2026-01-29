@echo off
echo ===================================================
echo   NAS System - Release Builder
echo ===================================================

echo.
echo [1/4] Cleaning previous release...
if exist release rmdir /s /q release
mkdir release

echo.
echo [2/4] Building Frontend...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building frontend!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/4] Copying Server Files...
copy server.js release\
copy package.json release\
copy nas-metadata.json release\
copy start_nas.bat release\
copy install_dependencies.bat release\

:: Create storage directories but keep them empty
mkdir release\storage
mkdir release\storage\.nas_trash

echo.
echo [4/4] Copying Frontend Assets...
:: We need to copy the dist folder specifically as the server serves from 'frontend/dist'
mkdir release\frontend
xcopy frontend\dist release\frontend\dist /E /I /H /Y

echo.
echo ===================================================
echo   Release Package Created Successfully!
echo   Location: %~dp0release
echo ===================================================
pause
