# 🚀 Quick Production Deployment (PowerShell)
# Simple deployment script for testing

Write-Host "🚀 Starting InvMIS Quick Deployment..." -ForegroundColor Green

# Build and start services
Write-Host "🏗️ Building and starting services..." -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Quick health check
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ API is healthy!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ API health check failed, checking logs..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml logs --tail=20 invmis-api
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost" -ForegroundColor Blue
Write-Host "🚀 API: http://localhost:5000" -ForegroundColor Blue
Write-Host "📊 Grafana: http://localhost:3000" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 View status: docker-compose -f docker-compose.prod.yml ps" -ForegroundColor Cyan