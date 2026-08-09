# Production Deployment Script
# This script prepares and publishes the Inventory Management System

Write-Host "🚀 Starting Production Deployment..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Step 1: Clean and Build
Write-Host "`n📦 Step 1: Building Application for Production..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green

# Step 2: Verify Build Output
Write-Host "`n🔍 Step 2: Verifying Build Output..." -ForegroundColor Yellow

if (Test-Path "dist\index.html") {
    $buildSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "✅ Build output verified!" -ForegroundColor Green
    Write-Host "📊 Total build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor White
} else {
    Write-Host "❌ Build output not found! Check build process." -ForegroundColor Red
    exit 1
}

# Step 3: Test Production Build Locally
Write-Host "`n🧪 Step 3: Testing Production Build..." -ForegroundColor Yellow
Write-Host "Starting preview server to test production build..." -ForegroundColor White

# Start backend and preview concurrently for testing
Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run prod:start" -NoNewWindow

Write-Host "✅ Production servers started!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:4173" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Cyan

# Step 4: Deployment Options
Write-Host "`n📤 Step 4: Deployment Options" -ForegroundColor Yellow
Write-Host "Choose your deployment method:" -ForegroundColor White
Write-Host "1. 🌍 Deploy to Web Server (copy dist folder)" -ForegroundColor White
Write-Host "2. ☁️  Deploy to Cloud Platform (AWS, Azure, etc.)" -ForegroundColor White
Write-Host "3. 🐳 Docker Deployment" -ForegroundColor White
Write-Host "4. 📁 Local Network Deployment" -ForegroundColor White

Write-Host "`n📋 Deployment Checklist:" -ForegroundColor Yellow
Write-Host "□ Database server accessible from production environment" -ForegroundColor White
Write-Host "□ Environment variables configured (.env.production)" -ForegroundColor White
Write-Host "□ SSL certificates configured (if HTTPS)" -ForegroundColor White
Write-Host "□ Firewall rules configured for ports 3001 and web server port" -ForegroundColor White
Write-Host "□ Backend server configured for production environment" -ForegroundColor White

Write-Host "`n📂 Built Files Location:" -ForegroundColor Yellow
Write-Host "Frontend: .\dist\" -ForegroundColor White
Write-Host "Backend: .\backend-server.cjs" -ForegroundColor White
Write-Host "Database: SQL Server on SYED-FAZLI-LAPT" -ForegroundColor White

Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy the 'dist' folder to your web server" -ForegroundColor White
Write-Host "2. Deploy 'backend-server.cjs' to your application server" -ForegroundColor White
Write-Host "3. Configure database connection for production" -ForegroundColor White
Write-Host "4. Set up reverse proxy (nginx, IIS, etc.) if needed" -ForegroundColor White

Write-Host "`n✅ Production build ready for deployment!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan

# Keep the script open for review
Read-Host "`nPress Enter to continue..."
