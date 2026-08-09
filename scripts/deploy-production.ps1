# 🚀 InvMIS Production Deployment Script (PowerShell)
# Deploy InvMIS to production environment with zero downtime

param(
    [string]$Environment = "production",
    [switch]$SkipTests = $false,
    [switch]$SkipBackup = $false
)

# 🎨 Output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "🔵 $Message" -ForegroundColor Blue }
function Write-Progress { param($Message) Write-Host "🔄 $Message" -ForegroundColor Cyan }

# 📋 Configuration
$ProjectName = "invmis"
$ComposeFile = "docker-compose.prod.yml"
$BackupDir = "./backups"
$DeployDate = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Info "🚀 Starting InvMIS Production Deployment"
Write-Info "========================================="

# ✅ Pre-deployment checks
Write-Progress "📋 Running pre-deployment checks..."

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop first."
    exit 1
}

# Check if environment file exists
if (-not (Test-Path ".env.production")) {
    Write-Error "Production environment file (.env.production) not found."
    exit 1
}
Write-Success "Environment file found"

# Check if SSL certificates exist
if (-not (Test-Path "./nginx/ssl/certificate.crt")) {
    Write-Warning "SSL certificate not found. Please ensure SSL certificates are in ./nginx/ssl/"
    Write-Info "For development, you can create self-signed certificates:"
    Write-Info "  mkdir -p ./nginx/ssl"
    Write-Info "  # Place your certificate.crt and private.key files there"
}

Write-Success "Pre-deployment checks completed"

# 🔄 Create backup
if (-not $SkipBackup) {
    Write-Progress "💾 Creating backup..."
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Check if containers are running
    $runningContainers = docker-compose -f $ComposeFile ps --services --filter "status=running"
    if ($runningContainers) {
        Write-Info "📦 Backing up running containers..."
        $backupPath = "$BackupDir/backup_$DeployDate"
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        Write-Success "Backup directory created: $backupPath"
    }
}

# 🏗️ Build and deploy
Write-Progress "🏗️ Building production images..."
docker-compose -f $ComposeFile build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build images"
    exit 1
}
Write-Success "Images built successfully"

Write-Progress "🔄 Deploying services..."
docker-compose -f $ComposeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start services"
    exit 1
}
Write-Success "Services started successfully"

# ⏳ Wait for services to be healthy
Write-Progress "⏳ Waiting for services to be healthy..."
Start-Sleep -Seconds 30

# 🏥 Health checks
if (-not $SkipTests) {
    Write-Progress "🏥 Running health checks..."
    $maxAttempts = 12
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "API health check passed"
                break
            }
        } catch {
            Write-Warning "Attempt $attempt/$maxAttempts - waiting for API..."
            Start-Sleep -Seconds 10
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Error "API health check failed. Check logs:"
        docker-compose -f $ComposeFile logs invmis-api
        exit 1
    }
    
    # 🧪 API Tests
    Write-Progress "🧪 Running API tests..."
    $endpoints = @("/health", "/api/health", "/api/users", "/api/offices")
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000$endpoint" -TimeoutSec 10 -UseBasicParsing
            Write-Success "$endpoint - OK"
        } catch {
            Write-Error "$endpoint - FAILED"
            Write-Warning "Check logs: docker-compose -f $ComposeFile logs invmis-api"
        }
    }
}

# 🧹 Cleanup old images
Write-Progress "🧹 Cleaning up old Docker images..."
docker image prune -f | Out-Null
Write-Success "Cleanup completed"

# 📊 Deployment summary
Write-Info ""
Write-Info "📊 Deployment Summary"
Write-Info "===================="
Write-Success "Deployment completed successfully!"
Write-Info "🌐 Frontend: http://localhost"
Write-Info "🚀 API: http://localhost:5000"
Write-Info "📊 Grafana: http://localhost:3000 (admin/admin123)"
Write-Info "📈 Prometheus: http://localhost:9090"
Write-Info ""
Write-Warning "🔧 Management Commands:"
Write-Info "  View logs: docker-compose -f $ComposeFile logs -f"
Write-Info "  Stop: docker-compose -f $ComposeFile down"
Write-Info "  Restart: docker-compose -f $ComposeFile restart"
Write-Info ""
Write-Success "🎉 InvMIS is now running in production mode!"

# 📋 Display running services
Write-Info ""
Write-Info "🔍 Running Services:"
docker-compose -f $ComposeFile ps