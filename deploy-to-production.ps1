# IMS Production Deployment Script for Windows
# Usage: .\deploy-to-production.ps1 -ServerIP "172.20.150.127" -SSHUser "ubuntu" -SSHKey "C:\path\to\ssh\key.pem"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP = "172.20.150.127",
    
    [Parameter(Mandatory=$false)]
    [string]$SSHUser = "ubuntu",
    
    [Parameter(Mandatory=$false)]
    [string]$SSHKey = ""
)

$RemoteDir = "/home/$SSHUser/ims-docker-v1"
$SSHOpts = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=nul"

if ($SSHKey) {
    $SSHOpts += " -i `"$SSHKey`""
}

Write-Host "🚀 Starting IMS Production Deployment..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Server: $ServerIP" -ForegroundColor White
Write-Host "User: $SSHUser" -ForegroundColor White
Write-Host ""

# Step 1: Check SSH connection
Write-Host "1️⃣  Checking SSH connection..." -ForegroundColor Yellow
$sshTest = ssh $SSHOpts.Split() $SSHUser@$ServerIP "echo 'SSH connection successful'" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SSH connection successful!" -ForegroundColor Green
} else {
    Write-Host "❌ SSH connection failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Check Docker installation
Write-Host ""
Write-Host "2️⃣  Checking Docker on remote server..." -ForegroundColor Yellow
ssh $SSHOpts.Split() $SSHUser@$ServerIP "docker --version && docker compose --version" 2>$null

# Step 3: Create remote directory
Write-Host ""
Write-Host "3️⃣  Creating project directory..." -ForegroundColor Yellow
ssh $SSHOpts.Split() $SSHUser@$ServerIP "mkdir -p $RemoteDir"

# Step 4: Copy files
Write-Host ""
Write-Host "4️⃣  Copying files to remote server..." -ForegroundColor Yellow

# Copy config files
scp $SSHOpts.Split() ".env-production" "$SSHUser@$ServerIP`:$RemoteDir/.env" 2>$null
scp $SSHOpts.Split() "docker-compose.production.yml" "$SSHUser@$ServerIP`:$RemoteDir/docker-compose.yml" 2>$null
scp $SSHOpts.Split() "nginx.conf" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null
scp $SSHOpts.Split() "Dockerfile.backend" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null
scp $SSHOpts.Split() "Dockerfile.frontend" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null
scp $SSHOpts.Split() ".dockerignore" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null

# Copy source code
Write-Host "   Copying source code..." -ForegroundColor White
scp $SSHOpts.Split() -r "backend" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null
scp $SSHOpts.Split() -r "src" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null
scp $SSHOpts.Split() "package.json" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null
scp $SSHOpts.Split() "package-lock.json" "$SSHUser@$ServerIP`:$RemoteDir/" 2>$null

Write-Host "✅ Files copied!" -ForegroundColor Green

# Step 5: Build Docker images
Write-Host ""
Write-Host "5️⃣  Building Docker images..." -ForegroundColor Yellow
ssh $SSHOpts.Split() $SSHUser@$ServerIP "cd $RemoteDir && docker compose build --no-cache"

Write-Host "✅ Build complete!" -ForegroundColor Green

# Step 6: Start services
Write-Host ""
Write-Host "6️⃣  Starting production services..." -ForegroundColor Yellow
ssh $SSHOpts.Split() $SSHUser@$ServerIP "cd $RemoteDir && docker compose up -d"

Write-Host "✅ Services started!" -ForegroundColor Green

# Step 7: Verify
Write-Host ""
Write-Host "7️⃣  Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
ssh $SSHOpts.Split() $SSHUser@$ServerIP "cd $RemoteDir && docker compose ps"

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🌐 Production URL: http://$ServerIP" -ForegroundColor Cyan
Write-Host "📊 API: http://$ServerIP/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Check logs:" -ForegroundColor White
Write-Host "   ssh $SSHUser@$ServerIP 'cd $RemoteDir && docker compose logs -f'" -ForegroundColor Gray
Write-Host "2. Stop services:" -ForegroundColor White
Write-Host "   ssh $SSHUser@$ServerIP 'cd $RemoteDir && docker compose down'" -ForegroundColor Gray
Write-Host "3. Restart services:" -ForegroundColor White
Write-Host "   ssh $SSHUser@$ServerIP 'cd $RemoteDir && docker compose restart'" -ForegroundColor Gray
