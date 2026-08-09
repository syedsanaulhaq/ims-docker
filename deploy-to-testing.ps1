# =====================================================
# Deploy to Testing Stage Script
# =====================================================
# Purpose: Deploy from Development to Testing Stage
# Database: Same as development (InventoryManagementDB)
# Ports: Testing uses 5001 (backend) and 4173 (frontend)
# Usage: ./deploy-to-testing.ps1
# =====================================================

Write-Host "`n" -NoNewline
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DEPLOY DEVELOPMENT TO TESTING STAGE" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running Node processes
Write-Host "[1/7] Stopping all running servers..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "      ✅ All servers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Switch to test environment
Write-Host "[2/7] Switching to TESTING environment..." -ForegroundColor Yellow
& ./switch-env.ps1 test
Write-Host "      ✅ Environment switched to TESTING" -ForegroundColor Green
Write-Host ""

# Step 3: Update .env.sqlserver for testing
Write-Host "[3/7] Configuring backend for TESTING stage..." -ForegroundColor Yellow
$sqlServerConfig = @"
# SQL Server Configuration - Testing Stage
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433 
SQL_SERVER_ENCRYPT=false 
SQL_SERVER_TRUST_CERT=true 
PORT=5001
"@
Set-Content -Path ".env.sqlserver" -Value $sqlServerConfig
Write-Host "      ✅ Backend configured for port 5001" -ForegroundColor Green
Write-Host ""

# Step 4: Clean old build
Write-Host "[4/7] Cleaning old build files..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "      OK Old build cleaned" -ForegroundColor Green
} else {
    Write-Host "      INFO No old build to clean" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Build frontend with testing configuration
Write-Host "[5/7] Building frontend for TESTING stage..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✅ Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "      ❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Start backend server
Write-Host "[6/7] Starting TESTING backend server..." -ForegroundColor Yellow
Write-Host "      Port: 5001" -ForegroundColor Gray
Write-Host "      Database: InventoryManagementDB" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'TESTING Backend Server' -ForegroundColor Cyan; npm run backend"
Start-Sleep -Seconds 5
Write-Host "      OK Backend started on http://localhost:5001" -ForegroundColor Green
Write-Host ""

# Step 7: Start frontend preview
Write-Host "[7/7] Starting TESTING frontend preview..." -ForegroundColor Yellow
Write-Host "      Port: 4173" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'TESTING Frontend Server' -ForegroundColor Blue; npm run preview"
Start-Sleep -Seconds 3
Write-Host "      OK Frontend started on http://localhost:4173" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT TO TESTING STAGE COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing Stage Details:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:4173" -ForegroundColor White
Write-Host "   Backend:   http://localhost:5001" -ForegroundColor White
Write-Host "   Database:  InventoryManagementDB" -ForegroundColor White
Write-Host "   Users:     425 users - same as development" -ForegroundColor White
Write-Host ""
Write-Host "Ready for Boss Presentation!" -ForegroundColor Green
Write-Host ""
Write-Host "To return to development environment:" -ForegroundColor Yellow
Write-Host "   Run: .\return-to-development.ps1" -ForegroundColor White
Write-Host ""
