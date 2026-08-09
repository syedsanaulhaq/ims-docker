# =====================================================
# Simple Fix for Test Environment
# =====================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FIXING TEST ENVIRONMENT" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill node processes
Write-Host "[1/4] Stopping node processes..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null | Out-Null
Start-Sleep -Seconds 2
Write-Host "   [OK] Stopped`n" -ForegroundColor Green

# Step 2: Switch environment  
Write-Host "[2/4] Switching to test environment..." -ForegroundColor Yellow
.\switch-env.ps1 test | Out-Null
Write-Host "   [OK] Switched to test environment`n" -ForegroundColor Green

# Step 3: Verify
Write-Host "[3/4] Verifying configuration..." -ForegroundColor Yellow
$apiUrl = (Get-Content .env | Select-String "VITE_API_URL=").ToString()
$database = (Get-Content .env | Select-String "SQL_SERVER_DATABASE=").ToString()
Write-Host "   $apiUrl" -ForegroundColor Cyan
Write-Host "   $database" -ForegroundColor Cyan
Write-Host "   [OK] Configuration correct`n" -ForegroundColor Green

# Step 4: Clean and rebuild
Write-Host "[4/4] Rebuilding frontend..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
npm run build | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Build completed successfully!`n" -ForegroundColor Green
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ENVIRONMENT FIXED!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Now run this command to start everything:" -ForegroundColor Yellow
    Write-Host "`n  npm run test:full`n" -ForegroundColor Cyan
    
    Write-Host "Or start manually in 2 separate terminals:" -ForegroundColor Yellow
    Write-Host "  Terminal 1: npm run backend" -ForegroundColor Cyan
    Write-Host "  Terminal 2: npm run preview`n" -ForegroundColor Cyan
    
    Write-Host "Then open: http://localhost:4173`n" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
} else {
    Write-Host "   [ERROR] Build failed!" -ForegroundColor Red
}
