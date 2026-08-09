# =====================================================
# Return to Development Environment Script
# =====================================================
# Purpose: Switch back from testing to development
# Usage: ./return-to-development.ps1
# =====================================================

Write-Host "`n" -NoNewline
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  RETURN TO DEVELOPMENT ENVIRONMENT" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running Node processes
Write-Host "[1/4] Stopping TESTING servers..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "      ✅ Servers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Switch to development environment
Write-Host "[2/4] Switching to DEVELOPMENT environment..." -ForegroundColor Yellow
& ./switch-env.ps1 dev
Write-Host "      ✅ Environment switched to DEVELOPMENT" -ForegroundColor Green
Write-Host ""

# Step 3: Update .env.sqlserver for development
Write-Host "[3/4] Configuring backend for DEVELOPMENT..." -ForegroundColor Yellow
$sqlServerConfig = @"
# SQL Server Configuration - Development Environment
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433 
SQL_SERVER_ENCRYPT=false 
SQL_SERVER_TRUST_CERT=true 
PORT=3001
"@
Set-Content -Path ".env.sqlserver" -Value $sqlServerConfig
Write-Host "      ✅ Backend configured for port 3001" -ForegroundColor Green
Write-Host ""

# Step 4: Start development servers
Write-Host "[4/4] Starting DEVELOPMENT servers..." -ForegroundColor Yellow
Write-Host "      Backend: Port 3001" -ForegroundColor Gray
Write-Host "      Frontend: Port 8080 with hot reload" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Development Backend Server' -ForegroundColor Cyan; npm run backend"
Start-Sleep -Seconds 5

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Development Frontend Server' -ForegroundColor Blue; npm run dev"
Start-Sleep -Seconds 3
Write-Host "      OK Development servers started" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  BACK TO DEVELOPMENT MODE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Development Environment Details:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:8080 - hot reload enabled" -ForegroundColor White
Write-Host "   Backend:   http://localhost:3001" -ForegroundColor White
Write-Host "   Database:  InventoryManagementDB" -ForegroundColor White
Write-Host "   Users:     425 users" -ForegroundColor White
Write-Host ""
Write-Host "Ready for Development!" -ForegroundColor Green
Write-Host ""
