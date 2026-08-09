# 🚧 Quick Staging Deployment (PowerShell)
# Fast staging deployment for development testing

Write-Host "🚧 Starting InvMIS STAGING Quick Deployment..." -ForegroundColor Magenta

# Check if we want to run with npm (local) or docker
param(
    [switch]$Local = $false,
    [switch]$Docker = $true
)

if ($Local) {
    Write-Host "🚧 Starting STAGING in Local Mode..." -ForegroundColor Cyan
    Write-Host "🚀 Starting Staging API on port 5001..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run invmis-staging-api"
    
    Start-Sleep -Seconds 3
    Write-Host "🌐 Starting Frontend on port 8081..." -ForegroundColor Green  
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "vite --port 8081 --host"
    
    Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    # Build and start staging services with Docker
    Write-Host "🏗️ Building and starting staging services with Docker..." -ForegroundColor Cyan
    docker-compose -f docker-compose.staging.yml up -d --build
}

# Wait for services
Write-Host "⏳ Waiting for staging services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Quick health check
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Staging API is healthy!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Staging API health check failed, checking logs..." -ForegroundColor Yellow
    docker-compose -f docker-compose.staging.yml logs --tail=20 invmis-api-staging
}

Write-Host ""
Write-Host "🚧 STAGING Deployment Complete!" -ForegroundColor Magenta
Write-Host "🌐 Frontend: http://localhost:8081" -ForegroundColor Blue
Write-Host "🚀 API: http://localhost:5001" -ForegroundColor Blue
Write-Host "📊 Grafana: http://localhost:3001 (admin/staging123)" -ForegroundColor Blue
Write-Host "🗄️  Database Admin: http://localhost:8082" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 View status: docker-compose -f docker-compose.staging.yml ps" -ForegroundColor Cyan
Write-Host "🛑 Stop staging: docker-compose -f docker-compose.staging.yml down" -ForegroundColor Yellow