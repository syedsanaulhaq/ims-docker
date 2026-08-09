# =====================================================
# Fix Test Environment - Complete Setup Script
# =====================================================
# This script fixes all API URL issues and starts test environment properly

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FIX TEST ENVIRONMENT" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill all node processes
Write-Host "[1/6] Stopping all node processes..." -ForegroundColor Yellow
try {
    taskkill /f /im node.exe 2>$null
    Start-Sleep -Seconds 2
    Write-Host "   [OK] All node processes stopped" -ForegroundColor Green
} catch {
    Write-Host "   [INFO] No node processes were running" -ForegroundColor Cyan
}

# Step 2: Switch to test environment
Write-Host "`n[2/6] Switching to test environment..." -ForegroundColor Yellow
.\switch-env.ps1 test

# Step 3: Verify .env file
Write-Host "`n[3/6] Verifying .env configuration..." -ForegroundColor Yellow
$viteApiUrl = Get-Content .env | Select-String "VITE_API_URL=" | Select-Object -First 1
Write-Host "   $viteApiUrl" -ForegroundColor Cyan

$sqlDb = Get-Content .env | Select-String "SQL_SERVER_DATABASE=" | Select-Object -First 1
Write-Host "   $sqlDb" -ForegroundColor Cyan

# Step 4: Clean old build
Write-Host "`n[4/6] Cleaning old build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "   [OK] Old build removed" -ForegroundColor Green
} else {
    Write-Host "   [INFO] No old build found" -ForegroundColor Cyan
}

# Step 5: Build frontend with correct environment
Write-Host "`n[5/6] Building frontend with test environment..." -ForegroundColor Yellow
Write-Host "   This will take 30-60 seconds..." -ForegroundColor Cyan
npm run build

# Step 6: Start servers
Write-Host "`n[6/6] Starting backend and frontend servers..." -ForegroundColor Yellow
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST ENVIRONMENT READY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n  Frontend: http://localhost:4173" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:5001" -ForegroundColor Yellow
Write-Host "  Database: InventoryManagementDB_TEST" -ForegroundColor Yellow
Write-Host "`n  Opening browser in 5 seconds..." -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop servers`n" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

# Start servers
Write-Host "`nStarting servers..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Use npm script that uses concurrently
npm run backend-and-preview

function Start-ServersManually {
    Write-Host "`nIf servers don't start, run these commands in separate terminals:" -ForegroundColor Yellow
    Write-Host "  Terminal 1: npm run backend" -ForegroundColor Cyan
    Write-Host "  Terminal 2: npm run preview" -ForegroundColor Cyan
}

# If concurrently doesn't work, show manual instructions
if ($LASTEXITCODE -ne 0) {
    Start-ServersManually
}
