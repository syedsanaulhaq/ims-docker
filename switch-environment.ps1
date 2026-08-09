# =====================================================
# ENVIRONMENT SWITCHER FOR INVENTORY MANAGEMENT SYSTEM
# =====================================================
# Quick switch between DEV, TEST, and PROD databases
# =====================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev','test','prod')]
    [string]$Environment
)

$backendPath = "E:\ECP-Projects\inventory-management-system-ims\ims-v1\backend"
$envFile = "$backendPath\.env"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "ENVIRONMENT SWITCHER" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend folder exists
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend folder not found at: $backendPath" -ForegroundColor Red
    Write-Host "   Please update the `$backendPath variable in this script" -ForegroundColor Yellow
    exit 1
}

# Map environment to database name
$dbMapping = @{
    'dev'  = 'INVMIS'
    'test' = 'INVMIS_TEST'
    'prod' = 'INVMIS_PROD'
}

$targetDB = $dbMapping[$Environment]
$nodeEnv = $Environment.ToLower()

Write-Host "Switching to: $($Environment.ToUpper()) environment" -ForegroundColor Yellow
Write-Host "Database: $targetDB" -ForegroundColor Yellow
Write-Host ""

# Backup current .env if it exists
if (Test-Path $envFile) {
    $backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $envFile $backupFile
    Write-Host "✓ Backed up current .env to: $(Split-Path $backupFile -Leaf)" -ForegroundColor Green
}

# Read current .env or create new one
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Update DB_DATABASE
    if ($envContent -match 'DB_DATABASE=') {
        $envContent = $envContent -replace 'DB_DATABASE=.*', "DB_DATABASE=$targetDB"
    } else {
        $envContent += "`nDB_DATABASE=$targetDB"
    }
    
    # Update NODE_ENV
    if ($envContent -match 'NODE_ENV=') {
        $envContent = $envContent -replace 'NODE_ENV=.*', "NODE_ENV=$nodeEnv"
    } else {
        $envContent += "`nNODE_ENV=$nodeEnv"
    }
    
    # Save updated .env
    $envContent | Set-Content $envFile -NoNewline
    
} else {
    # Create new .env from template
    $templateFile = "E:\ECP-Projects\inventory-management-system-ims\ims-v1\.env.$nodeEnv.template"
    
    if (Test-Path $templateFile) {
        Copy-Item $templateFile $envFile
        Write-Host "✓ Created .env from template" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Please update .env with:" -ForegroundColor Yellow
        Write-Host "   - DB_PASSWORD" -ForegroundColor Yellow
        Write-Host "   - SESSION_SECRET" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Template file not found: $templateFile" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Switched to $($Environment.ToUpper()) environment" -ForegroundColor Green
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "1. Restart your backend server (Ctrl+C and restart)" -ForegroundColor White
Write-Host "2. Backend will now connect to: $targetDB" -ForegroundColor White
Write-Host "3. Frontend will remain at: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Current Configuration:" -ForegroundColor Cyan
Write-Host "  Database: $targetDB" -ForegroundColor White
Write-Host "  Environment: $nodeEnv" -ForegroundColor White
Write-Host "  Backend Port: 3001" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend server is running
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "⚠️  Backend server is currently running" -ForegroundColor Yellow
    Write-Host "   Please restart it for changes to take effect" -ForegroundColor Yellow
    Write-Host ""
}
