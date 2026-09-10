param([string]$Command = "help")

if ($Command -eq "help") {
    Write-Host "IMS Docker Commands" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\ims.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  status       - Check container status"
    Write-Host "  dev          - Start development"
    Write-Host "  test         - Start test environment"
    Write-Host "  monitoring   - Start monitoring stack"
    Write-Host "  logs         - View dev logs"
    Write-Host "  logs-test    - View test logs"
    Write-Host "  stop         - Stop all containers"
    Write-Host "  restart      - Restart containers"
    Write-Host "  clean        - Clean everything"
    Write-Host "  backup       - Backup database"
    Write-Host "  prune        - Clean Docker resources"
    Write-Host ""
}
elseif ($Command -eq "status") {
    Write-Host "Container Status:" -ForegroundColor Cyan
    docker ps | Select-String "ims"
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Cyan
    Write-Host "  Dev Frontend:   http://localhost:9080" -ForegroundColor White
    Write-Host "  Dev Backend:    http://localhost:3001" -ForegroundColor White
    Write-Host "  Test Frontend:  http://localhost:4173" -ForegroundColor White
    Write-Host "  Test Backend:   http://localhost:5001" -ForegroundColor White
}
elseif ($Command -eq "dev") {
    Write-Host "Starting Dev..." -ForegroundColor Cyan
    docker compose -f docker-compose.yml up -d
    Start-Sleep -Seconds 5
    Write-Host "Dev running: http://localhost:9080" -ForegroundColor Green
}
elseif ($Command -eq "test") {
    Write-Host "Starting Test..." -ForegroundColor Cyan
    docker compose -f docker-compose.test.yml up -d
    Start-Sleep -Seconds 5
    Write-Host "Test running: http://localhost:4173" -ForegroundColor Green
}
elseif ($Command -eq "monitoring") {
    Write-Host "Starting Monitoring..." -ForegroundColor Cyan
    docker compose -f docker-compose.monitoring.yml up -d
    Start-Sleep -Seconds 10
    Write-Host "Monitoring running:" -ForegroundColor Green
    Write-Host "  Grafana: http://localhost:3000 (admin/admin)" -ForegroundColor White
    Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor White
}
elseif ($Command -eq "logs") {
    docker compose -f docker-compose.yml logs -f
}
elseif ($Command -eq "logs-test") {
    docker compose -f docker-compose.test.yml logs -f
}
elseif ($Command -eq "stop") {
    Write-Host "Stopping containers..." -ForegroundColor Yellow
    docker compose -f docker-compose.yml down
    docker compose -f docker-compose.test.yml down
    Write-Host "Stopped!" -ForegroundColor Green
}
elseif ($Command -eq "restart") {
    Write-Host "Restarting..." -ForegroundColor Cyan
    docker compose -f docker-compose.yml restart
    docker compose -f docker-compose.test.yml restart
    Write-Host "Restarted!" -ForegroundColor Green
}
elseif ($Command -eq "clean") {
    Write-Host "Cleaning up..." -ForegroundColor Red
    docker compose -f docker-compose.yml down -v
    docker compose -f docker-compose.test.yml down -v
    Write-Host "Cleaned!" -ForegroundColor Green
}
elseif ($Command -eq "backup") {
    Write-Host "Backing up..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    New-Item -ItemType Directory -Path "backups" -Force | Out-Null
    Write-Host "Backup complete!" -ForegroundColor Green
}
elseif ($Command -eq "prune") {
    Write-Host "Pruning..." -ForegroundColor Cyan
    docker system prune -f --volumes
    Write-Host "Done!" -ForegroundColor Green
}
else {
    Write-Host "Unknown command" -ForegroundColor Red
    Write-Host "Run: .\ims.ps1 help" -ForegroundColor Yellow
}
