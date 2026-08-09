# Production Deployment Script
Write-Host "Production Deployment Starting..." -ForegroundColor Cyan

# Step 1: Build
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    
    # Check build output
    if (Test-Path "dist\index.html") {
        Write-Host "Build output verified!" -ForegroundColor Green
        
        # Show deployment info
        Write-Host "Deployment ready!" -ForegroundColor Green
        Write-Host "Frontend files: .\dist\" -ForegroundColor White
        Write-Host "Backend file: .\backend-server.cjs" -ForegroundColor White
        Write-Host "Production ready!" -ForegroundColor Green
    } else {
        Write-Host "Build output not found!" -ForegroundColor Red
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}

Read-Host "Press Enter to continue..."
