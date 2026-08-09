@echo off
echo Restarting VS Code with optimized performance settings...

REM Kill VS Code processes
taskkill /f /im code.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start VS Code with performance flags
code --disable-extensions --max-memory=8192 --disable-gpu --no-sandbox .

echo VS Code started with performance optimizations
echo - Extensions disabled
echo - Increased memory limit
echo - GPU acceleration disabled
echo - Sandbox disabled
pause
