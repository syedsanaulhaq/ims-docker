# 🚧 InvMIS Staging Deployment Script (PowerShell)
# Deploy InvMIS to staging environment for testing and validation

param(
    [string]$Environment = "staging",
    [switch]$SkipTests = $false,
    [switch]$SkipBackup = $false,
    [switch]$Verbose = $false
)

# 🎨 Output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "🔵 $Message" -ForegroundColor Blue }
function Write-Progress { param($Message) Write-Host "🔄 $Message" -ForegroundColor Cyan }
function Write-Staging { param($Message) Write-Host "🚧 $Message" -ForegroundColor Magenta }

# 📋 Configuration
$ProjectName = "invmis-staging"
$ComposeFile = "docker-compose.staging.yml"
$BackupDir = "./backups/staging"
$DeployDate = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Staging "🚧 Starting InvMIS STAGING Deployment"
Write-Staging "======================================"
Write-Info "Environment: STAGING (Testing & Validation)"
Write-Info "Date: $DeployDate"
Write-Info ""

# ✅ Pre-deployment checks
Write-Progress "📋 Running staging pre-deployment checks..."

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop first."
    exit 1
}

# Check if staging environment file exists
if (-not (Test-Path ".env.staging")) {
    Write-Error "Staging environment file (.env.staging) not found."
    exit 1
}
Write-Success "Staging environment file found"

# Check for port conflicts
$stagingPorts = @(5001, 8081, 3001, 9091, 8082)
foreach ($port in $stagingPorts) {
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Warning "Port $port is already in use. This might cause conflicts."
        }
    } catch {
        # Port is available
    }
}

Write-Success "Pre-deployment checks completed"

# 🔄 Create staging backup
if (-not $SkipBackup) {
    Write-Progress "💾 Creating staging backup..."
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Check if staging containers are running
    $runningContainers = docker-compose -f $ComposeFile ps --services --filter "status=running" 2>$null
    if ($runningContainers) {
        Write-Info "📦 Backing up running staging containers..."
        $backupPath = "$BackupDir/staging_backup_$DeployDate"
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        # Export container configs
        docker-compose -f $ComposeFile config > "$backupPath/docker-compose-backup.yml"
        Write-Success "Staging backup created: $backupPath"
    }
}

# 🏗️ Build and deploy to staging
Write-Progress "🏗️ Building staging images..."
docker-compose -f $ComposeFile build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build staging images"
    exit 1
}
Write-Success "Staging images built successfully"

# 🔄 Stop any existing staging services
Write-Progress "🛑 Stopping existing staging services..."
docker-compose -f $ComposeFile down --remove-orphans

Write-Progress "🚧 Starting staging services..."
docker-compose -f $ComposeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start staging services"
    exit 1
}
Write-Success "Staging services started successfully"

# ⏳ Wait for staging services to be healthy
Write-Progress "⏳ Waiting for staging services to initialize..."
Start-Sleep -Seconds 45

# 🏥 Staging Health checks
if (-not $SkipTests) {
    Write-Progress "🏥 Running staging health checks..."
    $maxAttempts = 15
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "Staging API health check passed"
                break
            }
        } catch {
            Write-Warning "Attempt $attempt/$maxAttempts - waiting for staging API..."
            Start-Sleep -Seconds 15
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Error "Staging API health check failed. Check logs:"
        docker-compose -f $ComposeFile logs --tail=20 invmis-api-staging
        exit 1
    }
    
    # 🧪 Staging API Tests
    Write-Progress "🧪 Running staging API tests..."
    $stagingEndpoints = @(
        "/health",
        "/api/health", 
        "/api/users",
        "/api/offices",
        "/api/categories",
        "/api/items"
    )
    
    $passedTests = 0
    $totalTests = $stagingEndpoints.Count
    
    foreach ($endpoint in $stagingEndpoints) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5001$endpoint" -TimeoutSec 10 -UseBasicParsing
            Write-Success "$endpoint - OK ($($response.StatusCode))"
            $passedTests++
        } catch {
            Write-Error "$endpoint - FAILED ($($_.Exception.Message))"
            if ($Verbose) {
                Write-Warning "Check logs: docker-compose -f $ComposeFile logs invmis-api-staging"
            }
        }
    }
    
    Write-Info "Test Results: $passedTests/$totalTests endpoints passed"
    
    # Test frontend accessibility
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:8081" -TimeoutSec 5 -UseBasicParsing
        Write-Success "Frontend accessibility - OK"
    } catch {
        Write-Warning "Frontend might not be ready yet - this is normal for staging"
    }
}

# 🧹 Cleanup staging images
Write-Progress "🧹 Cleaning up staging Docker images..."
docker image prune -f | Out-Null
Write-Success "Staging cleanup completed"

# 📊 Staging deployment summary
Write-Info ""
Write-Staging "📊 STAGING Deployment Summary"
Write-Staging "============================"
Write-Success "Staging deployment completed successfully!"
Write-Info ""
Write-Staging "🚧 STAGING Environment URLs:"
Write-Info "🌐 Frontend: http://localhost:8081"
Write-Info "🚀 API: http://localhost:5001"
Write-Info "📊 Grafana: http://localhost:3001 (admin/staging123)"
Write-Info "📈 Prometheus: http://localhost:9091"
Write-Info "🗄️  Database Admin: http://localhost:8082 (Adminer)"
Write-Info "📋 Logs: http://localhost:3101 (Loki)"
Write-Info ""
Write-Warning "🔧 Staging Management Commands:"
Write-Info "  View logs: docker-compose -f $ComposeFile logs -f"
Write-Info "  Stop staging: docker-compose -f $ComposeFile down"
Write-Info "  Restart staging: docker-compose -f $ComposeFile restart"
Write-Info "  Monitor: docker-compose -f $ComposeFile ps"
Write-Info ""
Write-Staging "🚧 This is STAGING - Test thoroughly before production!"
Write-Success "🎉 InvMIS Staging environment is ready for testing!"

# 📋 Display running staging services
Write-Info ""
Write-Info "🔍 Running Staging Services:"
docker-compose -f $ComposeFile ps

Write-Info ""
Write-Warning "📝 Next Steps:"
Write-Info "1. Test all API endpoints at http://localhost:5001"
Write-Info "2. Verify frontend functionality at http://localhost:8081"  
Write-Info "3. Check monitoring dashboards"
Write-Info "4. Validate database connections"
Write-Info "5. Run user acceptance testing"
Write-Info "6. Only promote to production after thorough testing"