# ============================================================================
# Remote Production Deployment Script
# This script connects to the Ubuntu VM and triggers the deployment process.
# ============================================================================

param (
    [string]$ServerIp = "172.20.150.127",
    [string]$Username = "ecpadmin",
    [string]$RemoteDir = "~/ims-docker-v1",
    [string]$Branch = "provision_production_infrastructure"
)

Write-Host "[START] Starting Remote Production Deployment..." -ForegroundColor Cyan

Write-Host "[1/2] Pushing local changes to GitHub..." -ForegroundColor Yellow
git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to push local changes. Aborting deployment." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Local changes pushed successfully!" -ForegroundColor Green

$sshTarget = $Username + "@" + $ServerIp

Write-Host "`n[2/2] Connecting to Production Server ($sshTarget)..." -ForegroundColor Yellow
Write-Host "(You will be prompted to enter the password: Server%2022)" -ForegroundColor Yellow

# The exact commands to run on the Ubuntu server
$RemoteCommands = @"
cd $RemoteDir
echo '[INFO] Fetching latest code from GitHub...'
git fetch origin
echo '[INFO] Checking out branch: $Branch...'
git checkout $Branch
echo '[INFO] Cleaning up any malformed config directories created by Docker...'
sudo rm -rf ./monitoring/prometheus.yml
echo '[INFO] Resetting local changes on server to match GitHub...'
git reset --hard origin/$Branch
echo '[INFO] Pulling latest changes...'
git pull origin $Branch

echo '[INFO] Making the deployment script executable...'
chmod +x ./scripts/deploy-production.sh

echo '[INFO] Running the production deployment script with sudo...'
sudo ./scripts/deploy-production.sh
"@

# Execute the commands over SSH
ssh -t $sshTarget $RemoteCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Remote deployment completed successfully!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Remote deployment failed or was interrupted." -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
