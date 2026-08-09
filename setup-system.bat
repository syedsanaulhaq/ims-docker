@echo off
echo ========================================
echo    IMS System Automatic Setup
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git for Windows first
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js v18 or higher first
    pause
    exit /b 1
)

echo ✓ Prerequisites check passed
echo.

REM Create project directory
echo Creating project directory...
if not exist "C:\Projects" mkdir "C:\Projects"
cd /d "C:\Projects"

REM Clone repository
echo Cloning IMS repository...
if exist "ims-v1" (
    echo Directory ims-v1 already exists. Updating...
    cd ims-v1
    git pull origin main
) else (
    git clone https://github.com/syedsanaulhaq/ims-v1.git
    cd ims-v1
)

echo.
echo ✓ Repository cloned successfully

REM Install dependencies
echo Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✓ Dependencies installed successfully

REM Copy environment file
echo Setting up environment configuration...
if not exist ".env.sqlserver" (
    if exist ".env.example" (
        copy ".env.example" ".env.sqlserver"
    ) else (
        echo Creating default .env.sqlserver file...
        echo DB_SERVER=localhost > .env.sqlserver
        echo DB_DATABASE=IMS_Database >> .env.sqlserver
        echo DB_USER=sa >> .env.sqlserver
        echo DB_PASSWORD=YourPassword123 >> .env.sqlserver
        echo DB_PORT=1433 >> .env.sqlserver
        echo JWT_SECRET=your-super-secret-jwt-key-here >> .env.sqlserver
        echo PORT=5000 >> .env.sqlserver
    )
    echo ✓ Environment file created
    echo.
    echo IMPORTANT: Please edit .env.sqlserver with your database credentials
) else (
    echo ✓ Environment file already exists
)

echo.
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env.sqlserver with your database credentials
echo 2. Set up your SQL Server database using the provided SQL scripts
echo 3. Run: node backend-server.cjs (to start backend)
echo 4. Run: npm run dev (to start frontend)
echo.
echo Project location: %CD%
echo.
pause
