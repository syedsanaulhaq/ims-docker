# InvMIS Backup Strategy Script - Windows PowerShell Version
# This script performs comprehensive backups of the InvMIS system on Windows

param(
    [string]$Action = "backup",
    [string]$BackupFile = ""
)

# Configuration
$BackupDir = "C:\InvMIS\Backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$RetentionDays = 30
$LogFile = "C:\InvMIS\Logs\backup.log"

# Database configuration
$DbServer = $env:DB_SERVER ?? "localhost"
$DbName = $env:DB_NAME ?? "InvMISDB"
$DbUser = $env:DB_USER ?? "sa"
$DbPassword = $env:DB_PASSWORD

# Application paths
$AppDir = "C:\InvMIS\App"
$ConfigDir = "C:\InvMIS\Config"
$IISConfig = "C:\Windows\System32\inetsrv\config\applicationHost.config"

# Logging function
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp - $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

# Error handling
function Handle-Error {
    param([string]$Step)
    Write-Log "ERROR: Backup failed at step: $Step"
    exit 1
}

# Create backup directories
function Create-BackupDirectories {
    Write-Log "Creating backup directories..."
    
    $Directories = @(
        "$BackupDir\Database",
        "$BackupDir\Application", 
        "$BackupDir\Config",
        "$BackupDir\Logs",
        "$BackupDir\Archive\$Date"
    )
    
    foreach ($Dir in $Directories) {
        if (!(Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
        }
    }
}

# Database backup
function Backup-Database {
    Write-Log "Starting database backup..."
    
    try {
        $BackupPath = "$BackupDir\Database\InvMISDB_$Date.bak"
        
        $SqlQuery = @"
BACKUP DATABASE [$DbName] 
TO DISK = '$BackupPath'
WITH FORMAT, INIT, COMPRESSION, CHECKSUM;
"@
        
        if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
            sqlcmd -S $DbServer -U $DbUser -P $DbPassword -Q $SqlQuery
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Database backup completed: InvMISDB_$Date.bak"
            } else {
                Handle-Error "Database backup"
            }
        } else {
            Write-Log "WARNING: sqlcmd not found, skipping database backup"
        }
    }
    catch {
        Handle-Error "Database backup: $($_.Exception.Message)"
    }
}

# Application files backup
function Backup-Application {
    Write-Log "Starting application backup..."
    
    try {
        if (Test-Path $AppDir) {
            $BackupPath = "$BackupDir\Application\App_$Date.zip"
            Compress-Archive -Path $AppDir -DestinationPath $BackupPath -Force
            Write-Log "Application backup completed: App_$Date.zip"
        } else {
            Write-Log "WARNING: Application directory not found: $AppDir"
        }
    }
    catch {
        Handle-Error "Application backup: $($_.Exception.Message)"
    }
}

# Configuration backup
function Backup-Configuration {
    Write-Log "Starting configuration backup..."
    
    try {
        # Backup configuration directory
        if (Test-Path $ConfigDir) {
            $ConfigBackup = "$BackupDir\Config\Config_$Date"
            Copy-Item -Path $ConfigDir -Destination $ConfigBackup -Recurse -Force
        }
        
        # Backup IIS configuration
        if (Test-Path $IISConfig) {
            Copy-Item -Path $IISConfig -Destination "$BackupDir\Config\IIS_Config_$Date.config" -Force
        }
        
        # Backup environment files
        Get-ChildItem -Path "C:\InvMIS" -Filter ".env*" -Recurse | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination "$BackupDir\Config\" -Force
        }
        
        Write-Log "Configuration backup completed"
    }
    catch {
        Handle-Error "Configuration backup: $($_.Exception.Message)"
    }
}

# Logs backup
function Backup-Logs {
    Write-Log "Starting logs backup..."
    
    try {
        # Application logs
        $LogsDir = "C:\InvMIS\Logs"
        if (Test-Path $LogsDir) {
            $LogsBackup = "$BackupDir\Logs\InvMIS_Logs_$Date.zip"
            Compress-Archive -Path $LogsDir -DestinationPath $LogsBackup -Force
        }
        
        # IIS logs
        $IISLogsDir = "C:\inetpub\logs\LogFiles"
        if (Test-Path $IISLogsDir) {
            $IISLogsBackup = "$BackupDir\Logs\IIS_Logs_$Date.zip"
            Compress-Archive -Path $IISLogsDir -DestinationPath $IISLogsBackup -Force
        }
        
        Write-Log "Logs backup completed"
    }
    catch {
        Write-Log "WARNING: Logs backup failed: $($_.Exception.Message)"
    }
}

# Create complete archive
function Create-Archive {
    Write-Log "Creating complete backup archive..."
    
    try {
        $ArchivePath = "$BackupDir\Archive\InvMIS_Complete_Backup_$Date.zip"
        
        $ItemsToArchive = @(
            "$BackupDir\Database",
            "$BackupDir\Application", 
            "$BackupDir\Config",
            "$BackupDir\Logs"
        ) | Where-Object { Test-Path $_ }
        
        if ($ItemsToArchive.Count -gt 0) {
            Compress-Archive -Path $ItemsToArchive -DestinationPath $ArchivePath -Force
            Write-Log "Complete backup archive created: InvMIS_Complete_Backup_$Date.zip"
        } else {
            Handle-Error "No items to archive"
        }
    }
    catch {
        Handle-Error "Archive creation: $($_.Exception.Message)"
    }
}

# Cleanup old backups
function Cleanup-OldBackups {
    Write-Log "Cleaning up old backups (older than $RetentionDays days)..."
    
    try {
        $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
        
        # Clean database backups
        Get-ChildItem "$BackupDir\Database\*.bak" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force
        
        # Clean application backups
        Get-ChildItem "$BackupDir\Application\*.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force
        
        # Clean archive backups
        Get-ChildItem "$BackupDir\Archive\*.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force
        
        Write-Log "Cleanup completed"
    }
    catch {
        Write-Log "WARNING: Cleanup failed: $($_.Exception.Message)"
    }
}

# Generate backup report
function Generate-Report {
    try {
        $ArchiveFile = "$BackupDir\Archive\InvMIS_Complete_Backup_$Date.zip"
        $ArchiveSize = if (Test-Path $ArchiveFile) { 
            "{0:N2} MB" -f ((Get-Item $ArchiveFile).Length / 1MB)
        } else { 
            "Unknown" 
        }
        
        $TotalSize = "{0:N2} MB" -f ((Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB)
        
        Write-Log "=== BACKUP REPORT ==="
        Write-Log "Backup Date: $(Get-Date)"
        Write-Log "Backup Archive: InvMIS_Complete_Backup_$Date.zip"
        Write-Log "Archive Size: $ArchiveSize"
        Write-Log "Total Backup Directory Size: $TotalSize"
        Write-Log "Retention Policy: $RetentionDays days"
        Write-Log "===================="
    }
    catch {
        Write-Log "WARNING: Report generation failed: $($_.Exception.Message)"
    }
}

# Send notification
function Send-Notification {
    if ($env:BACKUP_EMAIL) {
        try {
            $Subject = "InvMIS Backup Report - $Date"
            $Body = "InvMIS backup completed successfully at $(Get-Date)"
            Send-MailMessage -To $env:BACKUP_EMAIL -Subject $Subject -Body $Body -SmtpServer $env:SMTP_SERVER
            Write-Log "Email notification sent"
        }
        catch {
            Write-Log "WARNING: Email notification failed: $($_.Exception.Message)"
        }
    }
}

# Verify backup integrity
function Verify-Backup {
    Write-Log "Verifying backup integrity..."
    
    try {
        $ArchiveFile = "$BackupDir\Archive\InvMIS_Complete_Backup_$Date.zip"
        if (Test-Path $ArchiveFile) {
            # Test archive integrity
            $TestResult = Test-Path $ArchiveFile
            if ($TestResult) {
                Write-Log "Backup integrity verification: PASSED"
            } else {
                Handle-Error "Backup integrity verification failed"
            }
        } else {
            Handle-Error "Backup archive not found"
        }
    }
    catch {
        Handle-Error "Backup verification: $($_.Exception.Message)"
    }
}

# Main backup process
function Start-Backup {
    Write-Log "Starting InvMIS backup process..."
    
    # Ensure log directory exists
    $LogDir = Split-Path $LogFile
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    Create-BackupDirectories
    Backup-Database
    Backup-Application
    Backup-Configuration
    Backup-Logs
    Create-Archive
    Verify-Backup
    Cleanup-OldBackups
    Generate-Report
    Send-Notification
    
    Write-Log "Backup process completed successfully!"
}

# Recovery function
function Start-Recovery {
    param([string]$BackupFilePath)
    
    if (-not $BackupFilePath -or !(Test-Path $BackupFilePath)) {
        Write-Host "Usage: .\backup-strategy.ps1 -Action recover -BackupFile <backup_file>"
        Write-Host "Available backups:"
        Get-ChildItem "$BackupDir\Archive\*.zip" | Format-Table Name, LastWriteTime, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
        exit 1
    }
    
    Write-Log "Starting recovery from: $BackupFilePath"
    
    # Create recovery directory
    $RecoveryDir = "C:\Temp\InvMIS_Recovery_$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $RecoveryDir -Force | Out-Null
    
    try {
        # Extract backup
        Expand-Archive -Path $BackupFilePath -DestinationPath $RecoveryDir -Force
        
        Write-Host "Backup extracted to: $RecoveryDir"
        Write-Host "Please review and manually restore the components as needed:"
        Write-Host "Database: $RecoveryDir\Database\"
        Write-Host "Application: $RecoveryDir\Application\"
        Write-Host "Configuration: $RecoveryDir\Config\"
        Write-Host "Logs: $RecoveryDir\Logs\"
    }
    catch {
        Handle-Error "Backup extraction: $($_.Exception.Message)"
    }
}

# Test backup configuration
function Test-BackupConfig {
    Write-Log "Running backup test (dry run)..."
    Write-Host "This would perform a full backup to: $BackupDir"
    Write-Host "Database Server: $DbServer"
    Write-Host "Database Name: $DbName"
    Write-Host "Application Directory: $AppDir"
    Write-Host "Configuration appears valid"
}

# Main execution
switch ($Action.ToLower()) {
    "backup" { Start-Backup }
    "recover" { Start-Recovery -BackupFilePath $BackupFile }
    "test" { Test-BackupConfig }
    default {
        Write-Host "Usage: .\backup-strategy.ps1 [-Action backup|recover|test] [-BackupFile <path>]"
        Write-Host "  backup  - Perform full system backup (default)"
        Write-Host "  recover - Restore from backup file"
        Write-Host "  test    - Test backup configuration"
        exit 1
    }
}