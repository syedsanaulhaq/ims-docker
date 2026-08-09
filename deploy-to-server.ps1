# ============================================================================
# IMS Production Deployment Script - November 11, 2025 Stable Version
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IMS Production Deployment" -ForegroundColor Cyan
Write-Host "  Version: Nov 11, 2025 Stable" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$htdocsDir = "C:\xampp\htdocs"
$backupDir = "C:\xampp\htdocs-backups"

# Step 1: Check and install dependencies (only if needed)
Write-Host "[1/7] Checking dependencies..." -ForegroundColor Yellow

$needsInstall = $false

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] No node_modules found, installing dependencies..." -ForegroundColor Yellow
    $needsInstall = $true
}
# Check if vite exists and is valid (critical for build)
elseif (-not (Test-Path "node_modules\vite\package.json")) {
    Write-Host "[INFO] Vite not found or corrupted, reinstalling dependencies..." -ForegroundColor Yellow
    $needsInstall = $true
}
# Check if package.json changed
else {
    $nodeModulesAge = (Get-Item "node_modules").LastWriteTime
    $packageJsonAge = (Get-Item "package.json").LastWriteTime
    
    if ($packageJsonAge -gt $nodeModulesAge) {
        Write-Host "[INFO] package.json changed, reinstalling dependencies..." -ForegroundColor Yellow
        $needsInstall = $true
    } else {
        Write-Host "[OK] Dependencies already up-to-date (skipping install)" -ForegroundColor Green
    }
}

if ($needsInstall) {
    # Clean install
    if (Test-Path "node_modules") {
        Write-Host "[INFO] Removing corrupted node_modules..." -ForegroundColor Yellow
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    npm ci --include=dev --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] npm ci failed, trying npm install..." -ForegroundColor Yellow
        npm install --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Dependency installation failed!" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

# Step 2: Build production bundle
Write-Host ""
Write-Host "[2/7] Building production bundle..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npx vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build completed" -ForegroundColor Green

# Step 3: Create backup
Write-Host ""
Write-Host "[3/7] Creating backup of current deployment..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$backupDir\ims-backup-$timestamp"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
# Only backup IMS-related files (index.html and assets)
if (Test-Path "$htdocsDir\index.html") {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    Copy-Item -Path "$htdocsDir\index.html" -Destination $backupPath -Force -ErrorAction SilentlyContinue
    if (Test-Path "$htdocsDir\assets") {
        Copy-Item -Path "$htdocsDir\assets" -Destination $backupPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "[INFO] No existing IMS deployment to backup" -ForegroundColor Yellow
}

# Step 4: Deploy to htdocs root (only IMS files)
Write-Host ""
Write-Host "[4/7] Deploying IMS to server root..." -ForegroundColor Yellow
# Remove only IMS files (index.html and assets folder)
if (Test-Path "$htdocsDir\index.html") {
    Remove-Item -Path "$htdocsDir\index.html" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$htdocsDir\assets") {
    Remove-Item -Path "$htdocsDir\assets" -Recurse -Force -ErrorAction SilentlyContinue
}
# Copy new IMS files
Copy-Item -Path "$PSScriptRoot\dist\*" -Destination $htdocsDir -Recurse -Force
Write-Host "[OK] IMS files deployed to $htdocsDir (other folders preserved)" -ForegroundColor Green

# Step 5: Stop old backend
Write-Host ""
Write-Host "[5/7] Stopping old backend..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*ims-v1*"} | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "[OK] Old backend stopped" -ForegroundColor Green

# Step 6: Start backend
Write-Host ""
Write-Host "[6/7] Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\ims-v1; $env:NODE_ENV='production'; node server/index.cjs" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "[OK] Backend started on port 3001" -ForegroundColor Green

# Step 7: Restart Apache
Write-Host ""
Write-Host "[7/7] Restarting Apache..." -ForegroundColor Yellow
Get-Process -Name "httpd" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
try {
    & "C:\xampp\apache_start.bat"
    Start-Sleep -Seconds 3
    Write-Host "[OK] Apache restarted" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Apache restart may need manual intervention" -ForegroundColor Yellow
}

# Final verification
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://172.20.150.34/" -ForegroundColor Cyan
Write-Host "   Backend:  http://172.20.150.34:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Deployed Files:" -ForegroundColor Yellow
$jsFiles = Get-ChildItem -Path "$htdocsDir\assets\*.js" -ErrorAction SilentlyContinue
if ($jsFiles) {
    foreach ($file in $jsFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 0)
        Write-Host "   - $($file.Name) ($sizeKB KB)" -ForegroundColor Cyan
    }
}
Write-Host ""
Write-Host "[*] Backup Location: $backupPath" -ForegroundColor Yellow
Write-Host ""
