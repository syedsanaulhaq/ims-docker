# ============================================================================
# IMS v1 - Database Initialization Script
# ============================================================================
# This script initializes the InventoryManagementDB database with all
# required tables, roles, permissions, and initial data
# 
# Usage: .\INIT-DATABASE.ps1
# ============================================================================

Write-Host "`n" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  IMS v1 - Database Initialization" -ForegroundColor Cyan
Write-Host "  Target Database: InventoryManagementDB" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Read connection details from .env.sqlserver
Write-Host "Step 1: Reading database configuration..." -ForegroundColor Yellow
if (Test-Path ".\.env.sqlserver") {
    $envContent = Get-Content ".\.env.sqlserver"
    $dbServer = ($envContent | Select-String "SQL_SERVER_HOST=(.+)").Matches.Groups[1].Value
    $dbUser = ($envContent | Select-String "SQL_SERVER_USER=(.+)").Matches.Groups[1].Value
    $dbPassword = ($envContent | Select-String "SQL_SERVER_PASSWORD=(.+)").Matches.Groups[1].Value
    $dbName = ($envContent | Select-String "SQL_SERVER_DATABASE=(.+)").Matches.Groups[1].Value
    
    Write-Host "  Server: $dbServer" -ForegroundColor Gray
    Write-Host "  Database: $dbName" -ForegroundColor Gray
    Write-Host "  User: $dbUser" -ForegroundColor Gray
} else {
    Write-Host "  ERROR: .env.sqlserver not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Checking if sqlcmd is available..." -ForegroundColor Yellow
try {
    $sqlcmdVersion = sqlcmd -?
    Write-Host "  sqlcmd found" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: sqlcmd not found! Please install SQL Server Command Line Tools" -ForegroundColor Red
    Write-Host "  Download from: https://learn.microsoft.com/en-us/sql/tools/sqlcmd-utility" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Step 3: Testing database connection..." -ForegroundColor Yellow
$testQuery = "SELECT @@VERSION"
try {
    $result = sqlcmd -S $dbServer -U $dbUser -P $dbPassword -Q $testQuery -h -1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Connection successful" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Could not connect to database" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ERROR: Database connection failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Creating IMS Role System..." -ForegroundColor Yellow
Write-Host "  This will create:" -ForegroundColor Gray
Write-Host "    - ims_roles table" -ForegroundColor Gray
Write-Host "    - ims_permissions table" -ForegroundColor Gray
Write-Host "    - ims_role_permissions table" -ForegroundColor Gray
Write-Host "    - ims_user_roles table" -ForegroundColor Gray
Write-Host "    - vw_ims_user_permissions view" -ForegroundColor Gray
Write-Host ""

if (Test-Path ".\create-ims-role-system.sql") {
    Write-Host "  Executing create-ims-role-system.sql..." -ForegroundColor Cyan
    sqlcmd -S $dbServer -U $dbUser -P $dbPassword -d $dbName -i "create-ims-role-system.sql" -o "init-database.log"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS: IMS Role System created" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Check init-database.log for details" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR: create-ims-role-system.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 5: Assigning initial roles..." -ForegroundColor Yellow
if (Test-Path ".\assign-initial-ims-roles.sql") {
    Write-Host "  Executing assign-initial-ims-roles.sql..." -ForegroundColor Cyan
    sqlcmd -S $dbServer -U $dbUser -P $dbPassword -d $dbName -i "assign-initial-ims-roles.sql" -o "init-roles.log"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS: Initial roles assigned" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Check init-roles.log for details" -ForegroundColor Yellow
    }
} else {
    Write-Host "  SKIP: assign-initial-ims-roles.sql not found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Database Initialization Complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check init-database.log for any errors" -ForegroundColor Cyan
Write-Host "  2. Run: npm run backend" -ForegroundColor Cyan
Write-Host "  3. The backend should connect successfully" -ForegroundColor Cyan
Write-Host ""
Write-Host "Logs saved to:" -ForegroundColor Gray
Write-Host "  - init-database.log (Role system creation)" -ForegroundColor Gray
Write-Host "  - init-roles.log (Role assignments)" -ForegroundColor Gray
Write-Host ""
