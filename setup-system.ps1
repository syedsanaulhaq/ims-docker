#!/usr/bin/env pwsh

# IMS System PowerShell Setup Script
# Compatible with both Windows PowerShell and PowerShell Core

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    IMS System Automatic Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "git")) {
    Write-Host "❌ ERROR: Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git for Windows first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Command "node")) {
    Write-Host "❌ ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js v18 or higher first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Create project directory
$ProjectPath = "C:\Projects"
Write-Host "Creating project directory..." -ForegroundColor Yellow

if (-not (Test-Path $ProjectPath)) {
    New-Item -ItemType Directory -Path $ProjectPath | Out-Null
}

Set-Location $ProjectPath

# Clone repository
Write-Host "Cloning IMS repository..." -ForegroundColor Yellow

if (Test-Path "ims-v1") {
    Write-Host "Directory ims-v1 already exists. Updating..." -ForegroundColor Yellow
    Set-Location "ims-v1"
    git pull origin main
} else {
    git clone https://github.com/syedsanaulhaq/ims-v1.git
    Set-Location "ims-v1"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to clone repository" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Repository cloned successfully" -ForegroundColor Green

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Setup environment file
Write-Host "Setting up environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env.sqlserver")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.sqlserver"
        Write-Host "✅ Environment file created from template" -ForegroundColor Green
    } else {
        # Create default environment file
        $EnvContent = @"
DB_SERVER=localhost
DB_DATABASE=IMS_Database
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_PORT=1433
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
"@
        $EnvContent | Out-File -FilePath ".env.sqlserver" -Encoding utf8
        Write-Host "✅ Default environment file created" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Please edit .env.sqlserver with your database credentials" -ForegroundColor Yellow
} else {
    Write-Host "✅ Environment file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Edit .env.sqlserver with your database credentials" -ForegroundColor White
Write-Host "2. Set up your SQL Server database using: node setup-database.cjs" -ForegroundColor White
Write-Host "3. Start backend server: node backend-server.cjs" -ForegroundColor White
Write-Host "4. Start frontend: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Project location: $((Get-Location).Path)" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to open in VS Code
if (Test-Command "code") {
    $OpenInCode = Read-Host "Open project in VS Code? (y/n)"
    if ($OpenInCode -eq "y" -or $OpenInCode -eq "Y") {
        code .
        Write-Host "✅ Project opened in VS Code" -ForegroundColor Green
    }
}

Read-Host "Press Enter to exit"
