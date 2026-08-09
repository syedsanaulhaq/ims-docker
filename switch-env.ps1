# =====================================================
# Environment Switcher for InvMIS
# =====================================================
# Easily switch between development, test, and production environments

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "development", "test", "staging", "prod", "production")]
    [string]$Environment
)

# Normalize environment name
$env = switch ($Environment.ToLower()) {
    { $_ -in "dev", "development" } { "development"; break }
    { $_ -in "test", "staging" } { "test"; break }
    { $_ -in "prod", "production" } { "production"; break }
}

# Define source and target
$source = ".env-$env"
$target = ".env"

# Color output functions
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }

Write-Host "`n=== Environment Switcher ===" -ForegroundColor Magenta
Write-Host ""

# Check if source file exists
if (-not (Test-Path $source)) {
    Write-Error "Source file not found: $source"
    Write-Info "Available environment files:"
    Get-ChildItem -Filter ".env-*" | ForEach-Object { Write-Info "  - $($_.Name)" }
    exit 1
}

# Backup current .env if it exists
if (Test-Path $target) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backup = ".env.backup.$timestamp"
    Copy-Item $target $backup
    Write-Info "Backed up current .env to: $backup"
}

# Copy environment file
try {
    Copy-Item $source $target -Force
    Write-Success "Switched to $env environment!"
    Write-Info "Active file: $source -> .env"
    
    # Display key settings
    Write-Host "`n=== Environment Settings ===" -ForegroundColor Yellow
    $content = Get-Content $target
    
    $dbName = ($content | Select-String "DB_NAME=").ToString().Split("=")[1]
    $port = ($content | Select-String "^PORT=").ToString().Split("=")[1]
    $frontendPort = ($content | Select-String "FRONTEND_PORT=").ToString().Split("=")[1]
    $nodeEnv = ($content | Select-String "NODE_ENV=").ToString().Split("=")[1]
    
    Write-Info "  Environment: $nodeEnv"
    Write-Info "  Database: $dbName"
    Write-Info "  Backend Port: $port"
    Write-Info "  Frontend Port: $frontendPort"
    
    Write-Host "`n=== Next Steps ===" -ForegroundColor Yellow
    Write-Info "1. Restart your backend server"
    Write-Info "2. Restart your frontend (if running)"
    Write-Info "3. Backend will connect to: $dbName"
    Write-Info "4. Frontend will run on: http://localhost:$frontendPort"
    Write-Info "5. Backend API on: http://localhost:$port"
    
    if ($env -eq "test") {
        Write-Host ""
        Write-Warning "TEST Environment Notes:"
        Write-Info "- Uses InventoryManagementDB_TEST database"
        Write-Info "- Run create-full-clone-test-database.sql if needed"
        Write-Info "- Safe for testing without affecting production"
    }
    
    if ($env -eq "production") {
        Write-Host ""
        Write-Warning "PRODUCTION Environment - Important:"
        Write-Info "- Review security settings before deployment"
        Write-Info "- Change JWT_SECRET and SESSION_SECRET"
        Write-Info "- Update domain URLs"
        Write-Info "- Enable SSL/TLS encryption"
    }
    
    Write-Host ""
    Write-Success "Environment switch complete!"
    
} catch {
    Write-Error "Failed to switch environment: $_"
    exit 1
}
