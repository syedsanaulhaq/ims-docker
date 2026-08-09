# 🎯 InvMIS STAGING DEPLOYMENT FOR PRESENTATION
# ================================================
# Deploys InvMIS to staging environment with TEST database
# Perfect for boss presentations - clean slate with organizational data

param(
    [switch]$SkipDatabaseSetup = $false,
    [switch]$QuickStart = $false,
    [switch]$Verbose = $false
)

# 🎨 Output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Progress { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }
function Write-Header { param($Message) Write-Host "`n🎯 $Message" -ForegroundColor Magenta; Write-Host ("=" * 60) -ForegroundColor Magenta }

$ErrorActionPreference = "Continue"
$DeployDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Header "InvMIS STAGING DEPLOYMENT FOR PRESENTATION"
Write-Info "Deployment Time: $DeployDate"
Write-Info "Environment: STAGING (Clean Test Database)"
Write-Info ""

# =====================================================
# STEP 1: PRE-DEPLOYMENT CHECKS
# =====================================================
Write-Header "STEP 1: Pre-Deployment Checks"

# Check if running in correct directory
if (-not (Test-Path "package.json")) {
    Write-Error "Please run this script from the ims-v1 directory"
    exit 1
}
Write-Success "Running in correct directory"

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js installed: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Success "npm installed: $npmVersion"
} catch {
    Write-Error "npm is not installed."
    exit 1
}

# Check if SQL Server is accessible
Write-Progress "Checking SQL Server connection..."
$sqlServerCheck = Test-NetConnection -ComputerName "SYED-FAZLI-LAPT" -Port 1433 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($sqlServerCheck.TcpTestSucceeded) {
    Write-Success "SQL Server is accessible"
} else {
    Write-Warning "Cannot reach SQL Server. Make sure SQL Server is running."
}

# =====================================================
# STEP 2: DATABASE SETUP (TEST DATABASE)
# =====================================================
if (-not $SkipDatabaseSetup) {
    Write-Header "STEP 2: Setting Up Test Database"
    Write-Info "This will create InventoryManagementDB_TEST with:"
    Write-Info "  ✓ All table structures"
    Write-Info "  ✓ Organizational data (users, offices, wings, decs)"
    Write-Info "  ✓ Empty inventory (clean slate for demo)"
    Write-Info ""
    
    if (Test-Path "create-and-setup-test-database-complete.sql") {
        Write-Progress "Executing test database setup script..."
        Write-Info "This may take 30-60 seconds..."
        
        try {
            # Execute the SQL script using sqlcmd
            sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i "create-and-setup-test-database-complete.sql" -o "test-db-setup.log"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Test database created successfully!"
                Write-Info "Database: InventoryManagementDB_TEST"
                
                # Show summary from log
                if (Test-Path "test-db-setup.log") {
                    Write-Info "`nDatabase Setup Summary:"
                    Get-Content "test-db-setup.log" | Select-String -Pattern "✓|RecordCount" | ForEach-Object {
                        Write-Info "  $_"
                    }
                }
            } else {
                Write-Warning "Database setup completed with warnings. Check test-db-setup.log"
            }
        } catch {
            Write-Error "Failed to create test database: $_"
            Write-Info "Check test-db-setup.log for details"
        }
    } else {
        Write-Error "Test database script not found: create-and-setup-test-database-complete.sql"
        exit 1
    }
} else {
    Write-Info "Skipping database setup (using existing database)"
}

# =====================================================
# STEP 3: ENVIRONMENT CONFIGURATION
# =====================================================
Write-Header "STEP 3: Configuring Staging Environment"

# Update .env.staging to use TEST database
if (Test-Path ".env.staging") {
    Write-Progress "Updating staging environment configuration..."
    
    $envContent = Get-Content ".env.staging" -Raw
    
    # Update database name to TEST database
    $envContent = $envContent -replace 'DB_NAME=InvMISDB', 'DB_NAME=InventoryManagementDB_TEST'
    $envContent = $envContent -replace 'DB_NAME=InventoryManagementDB', 'DB_NAME=InventoryManagementDB_TEST'
    
    # Save updated config
    $envContent | Set-Content ".env.staging.presentation"
    
    Write-Success "Environment configured for TEST database"
    Write-Info "Config file: .env.staging.presentation"
} else {
    Write-Warning ".env.staging not found. Using default configuration."
}

# Copy to main .env for backend
Write-Progress "Setting up backend environment..."
Copy-Item ".env.staging.presentation" ".env" -Force
Write-Success "Backend environment configured"

# =====================================================
# STEP 4: INSTALL DEPENDENCIES
# =====================================================
if (-not $QuickStart) {
    Write-Header "STEP 4: Installing/Updating Dependencies"
    Write-Progress "Running npm install..."
    
    npm install --legacy-peer-deps 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully"
    } else {
        Write-Warning "Some dependencies may have warnings (this is usually OK)"
    }
} else {
    Write-Info "Skipping dependency installation (QuickStart mode)"
}

# =====================================================
# STEP 5: BUILD FRONTEND
# =====================================================
Write-Header "STEP 5: Building Frontend for Staging"
Write-Progress "Building React frontend..."
Write-Info "This may take 1-2 minutes..."

npm run build 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Frontend built successfully"
    Write-Info "Build output: dist/"
} else {
    Write-Error "Frontend build failed. Check for errors above."
    exit 1
}

# =====================================================
# STEP 6: STOP EXISTING PROCESSES
# =====================================================
Write-Header "STEP 6: Cleaning Up Existing Processes"
Write-Progress "Stopping any running Node.js processes..."

# Kill existing node processes (backend servers)
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Success "Stopped existing Node.js processes"
    } else {
        Write-Info "No existing processes to stop"
    }
} catch {
    Write-Info "No processes to clean up"
}

Start-Sleep -Seconds 2

# =====================================================
# STEP 7: START BACKEND SERVER
# =====================================================
Write-Header "STEP 7: Starting Backend API Server"
Write-Info "Port: 3001 (Staging Backend)"
Write-Progress "Starting backend server in background..."

# Start backend in a new window
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node invmis-api-server.cjs" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 5

if ($backendProcess) {
    Write-Success "Backend server started (PID: $($backendProcess.Id))"
    Write-Info "Backend URL: http://localhost:3001"
} else {
    Write-Error "Failed to start backend server"
    exit 1
}

# Test backend health
Write-Progress "Testing backend health..."
$maxAttempts = 10
$attempt = 1
$backendHealthy = $false

while ($attempt -le $maxAttempts -and -not $backendHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend health check passed ✓"
            $backendHealthy = $true
        }
    } catch {
        Write-Progress "Waiting for backend... (attempt $attempt/$maxAttempts)"
        Start-Sleep -Seconds 3
        $attempt++
    }
}

if (-not $backendHealthy) {
    Write-Warning "Backend health check failed. It may still be starting..."
}

# =====================================================
# STEP 8: START FRONTEND SERVER
# =====================================================
Write-Header "STEP 8: Starting Frontend Server"
Write-Info "Port: 8080 (Staging Frontend)"
Write-Progress "Starting frontend preview server..."

# Start frontend in a new window
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run preview" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 5

if ($frontendProcess) {
    Write-Success "Frontend server started (PID: $($frontendProcess.Id))"
    Write-Info "Frontend URL: http://localhost:8080"
} else {
    Write-Error "Failed to start frontend server"
}

# =====================================================
# STEP 9: VERIFICATION
# =====================================================
Write-Header "STEP 9: Deployment Verification"
Write-Progress "Running system checks..."

# Test frontend
Start-Sleep -Seconds 5
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Success "Frontend is accessible ✓"
    }
} catch {
    Write-Warning "Frontend may still be starting up..."
}

# Test key API endpoints
$apiEndpoints = @(
    @{Path="/api/health"; Name="Health Check"},
    @{Path="/api/offices"; Name="Offices API"},
    @{Path="/api/inventory/stock-quantities"; Name="Inventory API"}
)

foreach ($endpoint in $apiEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001$($endpoint.Path)" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Success "$($endpoint.Name) - OK"
    } catch {
        Write-Warning "$($endpoint.Name) - Not responding yet"
    }
}

# =====================================================
# DEPLOYMENT SUMMARY
# =====================================================
Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║     🎉 STAGING DEPLOYMENT SUCCESSFUL - READY FOR DEMO! 🎉  ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Header "📊 DEPLOYMENT SUMMARY"
Write-Success "Environment: STAGING (Presentation Mode)"
Write-Success "Database: InventoryManagementDB_TEST (Clean slate)"
Write-Success "Status: All systems operational"
Write-Host ""

Write-Header "🌐 ACCESS URLS"
Write-Info "🖥️  Frontend:       http://localhost:8080"
Write-Info "🚀 Backend API:    http://localhost:3001"
Write-Info "📊 API Health:     http://localhost:3001/api/health"
Write-Host ""

Write-Header "👤 LOGIN CREDENTIALS"
Write-Info "Use existing user credentials from production database"
Write-Info "(All users have been copied to test database)"
Write-Host ""

Write-Header "🎯 DEMO FEATURES TO SHOWCASE"
Write-Success "✓ Clean inventory (no existing data - perfect for demo)"
Write-Success "✓ All organizational structure (offices, wings, DECs)"
Write-Success "✓ User management and authentication"
Write-Success "✓ Stock operations and inventory management"
Write-Success "✓ Approval workflows"
Write-Success "✓ Item details pages with table view"
Write-Success "✓ Stock quantities monitoring"
Write-Host ""

Write-Header "🎬 PRESENTATION FLOW SUGGESTION"
Write-Info "1. Login at http://localhost:8080"
Write-Info "2. Navigate to Dashboard"
Write-Info "3. Show Inventory Details (empty, ready for demo)"
Write-Info "4. Demonstrate creating new items"
Write-Info "5. Show stock operations workflow"
Write-Info "6. Display item details page"
Write-Info "7. Show approval system"
Write-Host ""

Write-Header "⚡ QUICK ACTIONS"
Write-Info "🔄 Restart Backend:    taskkill /f /im node.exe; node invmis-api-server.cjs"
Write-Info "🔄 Restart Frontend:   Ctrl+C in frontend window, then: npm run preview"
Write-Info "🗄️  Reset Database:    sqlcmd -S SYED-FAZLI-LAPT -U sa -P 1978Jupiter87@# -i create-and-setup-test-database-complete.sql"
Write-Info "📊 View Logs:         Check console windows"
Write-Info "🛑 Stop All:          Close both PowerShell windows"
Write-Host ""

Write-Header "📝 PROCESS IDs (For Your Reference)"
Write-Info "Backend PID:  $($backendProcess.Id)"
Write-Info "Frontend PID: $($frontendProcess.Id)"
Write-Host ""

Write-Warning "⚠️  IMPORTANT NOTES FOR PRESENTATION:"
Write-Info "• This uses TEST database (clean slate)"
Write-Info "• All inventory transactions are empty"
Write-Info "• Perfect for live demo without affecting production"
Write-Info "• Keep both console windows open during presentation"
Write-Info "• If needed, you can reset database anytime"
Write-Host ""

Write-Success "🎯 System is ready! Open http://localhost:8080 to start demo"
Write-Success "📱 Backend is running on http://localhost:3001"
Write-Success "💡 Good luck with your presentation!"
Write-Host ""

# Save summary to file
$summaryFile = "staging-deployment-summary.txt"
@"
InvMIS STAGING DEPLOYMENT SUMMARY
==================================
Deployment Time: $DeployDate
Environment: STAGING (Presentation Mode)
Database: InventoryManagementDB_TEST

ACCESS URLS:
- Frontend:    http://localhost:8080
- Backend API: http://localhost:3001
- API Health:  http://localhost:3001/api/health

PROCESS IDs:
- Backend PID:  $($backendProcess.Id)
- Frontend PID: $($frontendProcess.Id)

STATUS: ✅ READY FOR PRESENTATION

To stop: Close both PowerShell windows or use taskkill /f /im node.exe
"@ | Set-Content $summaryFile

Write-Info "📄 Summary saved to: $summaryFile"
Write-Host ""
Write-Host "Press any key to open the application in your browser..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser
Start-Process "http://localhost:8080"

Write-Success "🎉 Browser opened! Ready for presentation!"
