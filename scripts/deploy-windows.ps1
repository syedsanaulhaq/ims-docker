# InvMIS Production Deployment Script for Windows
# This script automates the deployment of the InvMIS system to production on Windows Server

param(
    [string]$Action = "deploy",
    [string]$Environment = "production",
    [string]$Version = "latest",
    [switch]$SkipTests = $false,
    [switch]$BackupFirst = $true
)

# Configuration
$AppName = "InvMIS"
$DeployDir = "C:\InvMIS"
$BackupDir = "C:\InvMIS\Backups"
$LogFile = "C:\InvMIS\Logs\deployment.log"
$IISSiteName = "InvMIS"
$AppPoolName = "InvMISAppPool"

# Environment-specific configurations
$Config = @{
    production = @{
        ApiPort = 5000
        FrontendPort = 3000
        DbConnectionString = $env:PROD_DB_CONNECTION ?? "Server=localhost;Database=InvMISDB;Trusted_Connection=true;"
        Domain = $env:PROD_DOMAIN ?? "invmis.company.com"
        SSLCertPath = "C:\Certificates\invmis.pfx"
    }
    staging = @{
        ApiPort = 5001
        FrontendPort = 3001
        DbConnectionString = $env:STAGING_DB_CONNECTION ?? "Server=localhost;Database=InvMISDB_Staging;Trusted_Connection=true;"
        Domain = $env:STAGING_DOMAIN ?? "staging.invmis.company.com"
        SSLCertPath = "C:\Certificates\staging-invmis.pfx"
    }
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp [$Level] - $Message"
    Write-Host $LogEntry
    
    # Ensure log directory exists
    $LogDir = Split-Path $LogFile
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    Add-Content -Path $LogFile -Value $LogEntry
}

# Error handling
function Handle-Error {
    param([string]$Step, [string]$ErrorMessage = "")
    Write-Log "ERROR: Deployment failed at step: $Step - $ErrorMessage" "ERROR"
    exit 1
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking deployment prerequisites..."
    
    $Prerequisites = @{
        "Node.js" = { Get-Command node -ErrorAction SilentlyContinue }
        "npm" = { Get-Command npm -ErrorAction SilentlyContinue }
        "IIS" = { Get-WindowsFeature -Name IIS-WebServer | Where-Object InstallState -eq "Installed" }
        "SQL Server" = { Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue }
    }
    
    foreach ($Prereq in $Prerequisites.Keys) {
        if (& $Prerequisites[$Prereq]) {
            Write-Log "✓ $Prereq is available"
        } else {
            Handle-Error "Prerequisites check" "$Prereq is not available"
        }
    }
}

# Create deployment directories
function New-DeploymentDirectories {
    Write-Log "Creating deployment directories..."
    
    $Directories = @(
        "$DeployDir\App",
        "$DeployDir\Config",
        "$DeployDir\Logs",
        "$DeployDir\Scripts",
        "$BackupDir",
        "C:\Certificates"
    )
    
    foreach ($Dir in $Directories) {
        if (!(Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
            Write-Log "Created directory: $Dir"
        }
    }
}

# Backup current deployment
function Backup-CurrentDeployment {
    if (-not $BackupFirst) {
        Write-Log "Skipping backup as requested"
        return
    }
    
    Write-Log "Backing up current deployment..."
    
    try {
        $BackupScript = Join-Path $PSScriptRoot "backup-strategy.ps1"
        if (Test-Path $BackupScript) {
            & $BackupScript -Action backup
            Write-Log "Backup completed successfully"
        } else {
            Write-Log "Backup script not found, creating manual backup..."
            
            $BackupDate = Get-Date -Format "yyyyMMdd_HHmmss"
            $CurrentBackupDir = "$BackupDir\pre-deployment-$BackupDate"
            New-Item -ItemType Directory -Path $CurrentBackupDir -Force | Out-Null
            
            if (Test-Path "$DeployDir\App") {
                Copy-Item -Path "$DeployDir\App" -Destination "$CurrentBackupDir\App" -Recurse -Force
            }
        }
    }
    catch {
        Handle-Error "Backup" $_.Exception.Message
    }
}

# Stop services
function Stop-Services {
    Write-Log "Stopping application services..."
    
    try {
        # Stop IIS Application Pool
        if (Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue) {
            Stop-WebAppPool -Name $AppPoolName
            Write-Log "Stopped IIS Application Pool: $AppPoolName"
        }
        
        # Stop any Node.js processes
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
            $_.Path -like "*$DeployDir*" 
        } | Stop-Process -Force
        
        Write-Log "Services stopped successfully"
    }
    catch {
        Write-Log "WARNING: Error stopping services: $($_.Exception.Message)" "WARN"
    }
}

# Deploy backend API
function Deploy-BackendAPI {
    Write-Log "Deploying backend API..."
    
    try {
        $ApiDir = "$DeployDir\App\Backend"
        
        # Copy backend files
        Copy-Item -Path ".\backend-server.js" -Destination "$ApiDir\server.js" -Force
        Copy-Item -Path ".\package.json" -Destination "$ApiDir\package.json" -Force
        
        # Install dependencies
        Set-Location $ApiDir
        npm install --production
        
        # Create Windows Service wrapper
        $ServiceScript = @"
const { Service } = require('node-windows');
const svc = new Service({
    name: 'InvMIS API Server',
    description: 'InvMIS Backend API Service',
    script: '$ApiDir\\server.js'
});

svc.on('install', () => {
    svc.start();
});

svc.install();
"@
        
        $ServiceScript | Out-File -FilePath "$ApiDir\install-service.js" -Encoding UTF8
        
        Write-Log "Backend API deployed successfully"
    }
    catch {
        Handle-Error "Backend deployment" $_.Exception.Message
    }
}

# Deploy frontend
function Deploy-Frontend {
    Write-Log "Deploying frontend application..."
    
    try {
        $FrontendDir = "$DeployDir\App\Frontend"
        
        # Build frontend
        Set-Location "."
        npm run build
        
        # Copy build files
        if (Test-Path ".\build") {
            Copy-Item -Path ".\build\*" -Destination $FrontendDir -Recurse -Force
        } elseif (Test-Path ".\dist") {
            Copy-Item -Path ".\dist\*" -Destination $FrontendDir -Recurse -Force
        } else {
            Handle-Error "Frontend deployment" "Build directory not found"
        }
        
        Write-Log "Frontend deployed successfully"
    }
    catch {
        Handle-Error "Frontend deployment" $_.Exception.Message
    }
}

# Configure IIS
function Configure-IIS {
    Write-Log "Configuring IIS..."
    
    try {
        # Import WebAdministration module
        Import-Module WebAdministration -ErrorAction SilentlyContinue
        
        # Create Application Pool
        if (!(Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue)) {
            New-WebAppPool -Name $AppPoolName
            Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name processModel.identityType -Value ApplicationPoolIdentity
            Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name recycling.periodicRestart.time -Value "00:00:00"
        }
        
        # Create Website
        if (!(Get-Website -Name $IISSiteName -ErrorAction SilentlyContinue)) {
            $FrontendDir = "$DeployDir\App\Frontend"
            New-Website -Name $IISSiteName -Port $Config[$Environment].FrontendPort -PhysicalPath $FrontendDir -ApplicationPool $AppPoolName
        }
        
        # Configure SSL if certificate exists
        $SSLCertPath = $Config[$Environment].SSLCertPath
        if (Test-Path $SSLCertPath) {
            $CertPassword = ConvertTo-SecureString -String $env:SSL_CERT_PASSWORD -AsPlainText -Force
            $Cert = Import-PfxCertificate -FilePath $SSLCertPath -CertStoreLocation Cert:\LocalMachine\My -Password $CertPassword
            
            New-WebBinding -Name $IISSiteName -Protocol "https" -Port 443 -SslFlags 1
            $Binding = Get-WebBinding -Name $IISSiteName -Protocol "https"
            $Binding.AddSslCertificate($Cert.Thumbprint, "My")
        }
        
        Write-Log "IIS configured successfully"
    }
    catch {
        Handle-Error "IIS configuration" $_.Exception.Message
    }
}

# Configure reverse proxy
function Configure-ReverseProxy {
    Write-Log "Configuring reverse proxy for API..."
    
    try {
        $WebConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:$($Config[$Environment].ApiPort)/{R:1}" />
                </rule>
                <rule name="React App" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
        </staticContent>
    </system.webServer>
</configuration>
"@
        
        $WebConfigPath = "$DeployDir\App\Frontend\web.config"
        $WebConfigContent | Out-File -FilePath $WebConfigPath -Encoding UTF8
        
        Write-Log "Reverse proxy configured successfully"
    }
    catch {
        Handle-Error "Reverse proxy configuration" $_.Exception.Message
    }
}

# Update configuration files
function Update-Configuration {
    Write-Log "Updating configuration files..."
    
    try {
        $EnvConfig = $Config[$Environment]
        
        # Backend configuration
        $BackendConfig = @"
NODE_ENV=$Environment
PORT=$($EnvConfig.ApiPort)
DB_CONNECTION_STRING=$($EnvConfig.DbConnectionString)
JWT_SECRET=$($env:JWT_SECRET ?? $(New-Guid))
API_DOMAIN=$($EnvConfig.Domain)
"@
        
        $BackendConfig | Out-File -FilePath "$DeployDir\App\Backend\.env" -Encoding UTF8
        
        # Frontend configuration
        $FrontendConfig = @{
            "REACT_APP_API_URL" = "https://$($EnvConfig.Domain)/api"
            "REACT_APP_ENVIRONMENT" = $Environment
        }
        
        $FrontendConfig | ConvertTo-Json | Out-File -FilePath "$DeployDir\App\Frontend\config.json" -Encoding UTF8
        
        Write-Log "Configuration files updated successfully"
    }
    catch {
        Handle-Error "Configuration update" $_.Exception.Message
    }
}

# Run database migrations
function Invoke-DatabaseMigrations {
    Write-Log "Running database migrations..."
    
    try {
        $SqlFiles = Get-ChildItem -Path "." -Filter "*.sql" | Sort-Object Name
        
        foreach ($SqlFile in $SqlFiles) {
            if ($SqlFile.Name -match "^(create-|add-|update-).*\.sql$") {
                Write-Log "Executing: $($SqlFile.Name)"
                sqlcmd -S "localhost" -d $Config[$Environment].DbName -i $SqlFile.FullName
                
                if ($LASTEXITCODE -ne 0) {
                    Write-Log "WARNING: Migration failed: $($SqlFile.Name)" "WARN"
                }
            }
        }
        
        Write-Log "Database migrations completed"
    }
    catch {
        Write-Log "WARNING: Database migrations failed: $($_.Exception.Message)" "WARN"
    }
}

# Start services
function Start-Services {
    Write-Log "Starting application services..."
    
    try {
        # Start backend service
        $BackendDir = "$DeployDir\App\Backend"
        Set-Location $BackendDir
        Start-Process -FilePath "node" -ArgumentList "install-service.js" -Wait
        
        # Start IIS Application Pool
        Start-WebAppPool -Name $AppPoolName
        
        # Verify services are running
        Start-Sleep -Seconds 10
        
        $ApiHealthCheck = Invoke-RestMethod -Uri "http://localhost:$($Config[$Environment].ApiPort)/health" -Method GET -ErrorAction SilentlyContinue
        if ($ApiHealthCheck) {
            Write-Log "✓ Backend API is running"
        } else {
            Write-Log "WARNING: Backend API health check failed" "WARN"
        }
        
        Write-Log "Services started successfully"
    }
    catch {
        Handle-Error "Service startup" $_.Exception.Message
    }
}

# Run smoke tests
function Invoke-SmokeTests {
    if ($SkipTests) {
        Write-Log "Skipping tests as requested"
        return
    }
    
    Write-Log "Running smoke tests..."
    
    try {
        $TestResults = @{
            "API Health" = $false
            "Database Connection" = $false
            "Frontend Accessibility" = $false
        }
        
        # Test API health
        try {
            $ApiResponse = Invoke-RestMethod -Uri "http://localhost:$($Config[$Environment].ApiPort)/health" -Method GET -TimeoutSec 30
            $TestResults["API Health"] = $true
            Write-Log "✓ API health check passed"
        } catch {
            Write-Log "✗ API health check failed" "WARN"
        }
        
        # Test database connection
        try {
            $DbTest = sqlcmd -S "localhost" -d $Config[$Environment].DbName -Q "SELECT 1" -h -1 -W
            if ($DbTest -eq "1") {
                $TestResults["Database Connection"] = $true
                Write-Log "✓ Database connection test passed"
            }
        } catch {
            Write-Log "✗ Database connection test failed" "WARN"
        }
        
        # Test frontend accessibility
        try {
            $FrontendResponse = Invoke-WebRequest -Uri "http://localhost:$($Config[$Environment].FrontendPort)" -Method GET -TimeoutSec 30
            if ($FrontendResponse.StatusCode -eq 200) {
                $TestResults["Frontend Accessibility"] = $true
                Write-Log "✓ Frontend accessibility test passed"
            }
        } catch {
            Write-Log "✗ Frontend accessibility test failed" "WARN"
        }
        
        # Summary
        $PassedTests = ($TestResults.Values | Where-Object { $_ }).Count
        $TotalTests = $TestResults.Count
        Write-Log "Smoke tests completed: $PassedTests/$TotalTests passed"
        
        if ($PassedTests -lt $TotalTests) {
            Write-Log "Some smoke tests failed - deployment may need attention" "WARN"
        }
    }
    catch {
        Write-Log "WARNING: Smoke tests failed: $($_.Exception.Message)" "WARN"
    }
}

# Generate deployment report
function New-DeploymentReport {
    Write-Log "Generating deployment report..."
    
    $ReportContent = @"
========================================
InvMIS Deployment Report
========================================
Deployment Date: $(Get-Date)
Environment: $Environment
Version: $Version
Deployed By: $env:USERNAME

Configuration:
- API Port: $($Config[$Environment].ApiPort)
- Frontend Port: $($Config[$Environment].FrontendPort)
- Domain: $($Config[$Environment].Domain)
- Database: $($Config[$Environment].DbConnectionString)

Deployment Status: SUCCESS

Next Steps:
1. Verify all services are running
2. Test application functionality
3. Monitor logs for any issues
4. Update DNS if needed for domain changes

Log Location: $LogFile
========================================
"@
    
    $ReportPath = "$DeployDir\Logs\deployment-report-$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    $ReportContent | Out-File -FilePath $ReportPath -Encoding UTF8
    
    Write-Log "Deployment report saved: $ReportPath"
    Write-Host "`n$ReportContent"
}

# Main deployment process
function Start-Deployment {
    Write-Log "Starting InvMIS deployment to $Environment environment..."
    
    Test-Prerequisites
    New-DeploymentDirectories
    Backup-CurrentDeployment
    Stop-Services
    Deploy-BackendAPI
    Deploy-Frontend
    Configure-IIS
    Configure-ReverseProxy
    Update-Configuration
    Invoke-DatabaseMigrations
    Start-Services
    Invoke-SmokeTests
    New-DeploymentReport
    
    Write-Log "Deployment completed successfully!" "SUCCESS"
}

# Rollback function
function Start-Rollback {
    Write-Log "Starting rollback process..."
    
    try {
        $LatestBackup = Get-ChildItem "$BackupDir\Archive" -Filter "*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($LatestBackup) {
            Write-Log "Rolling back to: $($LatestBackup.Name)"
            
            Stop-Services
            
            # Extract and restore backup
            $TempDir = "$env:TEMP\InvMIS_Rollback_$(Get-Date -Format 'yyyyMMddHHmmss')"
            Expand-Archive -Path $LatestBackup.FullName -DestinationPath $TempDir
            
            # Restore application files
            if (Test-Path "$TempDir\Application") {
                Copy-Item -Path "$TempDir\Application\*" -Destination "$DeployDir\App" -Recurse -Force
            }
            
            Start-Services
            Write-Log "Rollback completed successfully"
        } else {
            Handle-Error "Rollback" "No backup found for rollback"
        }
    }
    catch {
        Handle-Error "Rollback" $_.Exception.Message
    }
}

# Main execution
switch ($Action.ToLower()) {
    "deploy" { Start-Deployment }
    "rollback" { Start-Rollback }
    default {
        Write-Host "Usage: .\deploy-windows.ps1 [-Action deploy|rollback] [-Environment production|staging] [-Version <version>] [-SkipTests] [-BackupFirst]"
        Write-Host ""
        Write-Host "Options:"
        Write-Host "  -Action       deploy (default) or rollback"
        Write-Host "  -Environment  production (default) or staging" 
        Write-Host "  -Version      Version to deploy (default: latest)"
        Write-Host "  -SkipTests    Skip smoke tests after deployment"
        Write-Host "  -BackupFirst  Create backup before deployment (default: true)"
        exit 1
    }
}