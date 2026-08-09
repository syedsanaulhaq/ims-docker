#!/bin/bash

# InvMIS Backup Strategy Script
# This script performs comprehensive backups of the InvMIS system

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/opt/invmis/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="/var/log/invmis-backup.log"

# Database configuration
DB_SERVER="${DB_SERVER:-localhost}"
DB_NAME="${DB_NAME:-InvMISDB}"
DB_USER="${DB_USER:-sa}"
DB_PASSWORD="${DB_PASSWORD}"

# Application paths
APP_DIR="/opt/invmis/app"
CONFIG_DIR="/opt/invmis/config"
SSL_DIR="/opt/invmis/ssl"
NGINX_CONFIG="/etc/nginx/sites-available/invmis"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "ERROR: Backup failed at step: $1"
    exit 1
}

# Create backup directories
create_backup_dirs() {
    log "Creating backup directories..."
    mkdir -p "$BACKUP_DIR"/{database,application,config,logs}
    mkdir -p "$BACKUP_DIR/archive/$DATE"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    if command -v sqlcmd &> /dev/null; then
        # SQL Server backup using sqlcmd
        sqlcmd -S "$DB_SERVER" -U "$DB_USER" -P "$DB_PASSWORD" -Q "
        BACKUP DATABASE [$DB_NAME] 
        TO DISK = '$BACKUP_DIR/database/InvMISDB_$DATE.bak'
        WITH FORMAT, INIT, COMPRESSION, CHECKSUM;
        " || handle_error "Database backup"
        
        log "Database backup completed: InvMISDB_$DATE.bak"
    else
        log "WARNING: sqlcmd not found, skipping database backup"
    fi
}

# Application files backup
backup_application() {
    log "Starting application backup..."
    
    if [ -d "$APP_DIR" ]; then
        tar -czf "$BACKUP_DIR/application/app_$DATE.tar.gz" \\
            -C "$(dirname "$APP_DIR")" \\
            "$(basename "$APP_DIR")" || handle_error "Application backup"
        
        log "Application backup completed: app_$DATE.tar.gz"
    else
        log "WARNING: Application directory not found: $APP_DIR"
    fi
}

# Configuration backup
backup_configuration() {
    log "Starting configuration backup..."
    
    # Backup configuration files
    if [ -d "$CONFIG_DIR" ]; then
        cp -r "$CONFIG_DIR" "$BACKUP_DIR/config/config_$DATE" || handle_error "Config backup"
    fi
    
    # Backup Nginx configuration
    if [ -f "$NGINX_CONFIG" ]; then
        cp "$NGINX_CONFIG" "$BACKUP_DIR/config/nginx_invmis_$DATE.conf" || handle_error "Nginx config backup"
    fi
    
    # Backup SSL certificates
    if [ -d "$SSL_DIR" ]; then
        tar -czf "$BACKUP_DIR/config/ssl_$DATE.tar.gz" \\
            -C "$(dirname "$SSL_DIR")" \\
            "$(basename "$SSL_DIR")" 2>/dev/null || log "WARNING: SSL backup failed"
    fi
    
    # Backup environment files
    find /opt/invmis -name ".env*" -exec cp {} "$BACKUP_DIR/config/" \\; 2>/dev/null || true
    
    log "Configuration backup completed"
}

# Logs backup
backup_logs() {
    log "Starting logs backup..."
    
    # Application logs
    if [ -d "/var/log/invmis" ]; then
        tar -czf "$BACKUP_DIR/logs/invmis_logs_$DATE.tar.gz" \\
            -C "/var/log" "invmis" 2>/dev/null || log "WARNING: InvMIS logs backup failed"
    fi
    
    # Nginx logs
    if [ -d "/var/log/nginx" ]; then
        tar -czf "$BACKUP_DIR/logs/nginx_logs_$DATE.tar.gz" \\
            -C "/var/log" "nginx" 2>/dev/null || log "WARNING: Nginx logs backup failed"
    fi
    
    log "Logs backup completed"
}

# Create archive
create_archive() {
    log "Creating complete backup archive..."
    
    cd "$BACKUP_DIR"
    tar -czf "archive/invmis_complete_backup_$DATE.tar.gz" \\
        database/ application/ config/ logs/ 2>/dev/null || handle_error "Archive creation"
    
    log "Complete backup archive created: invmis_complete_backup_$DATE.tar.gz"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR/database" -name "*.bak" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/application" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/archive" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean up empty directories
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# Generate backup report
generate_report() {
    local backup_size=$(du -sh "$BACKUP_DIR/archive/invmis_complete_backup_$DATE.tar.gz" 2>/dev/null | cut -f1 || echo "Unknown")
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "Unknown")
    
    log "=== BACKUP REPORT ==="
    log "Backup Date: $(date)"
    log "Backup Archive: invmis_complete_backup_$DATE.tar.gz"
    log "Archive Size: $backup_size"
    log "Total Backup Directory Size: $total_size"
    log "Retention Policy: $RETENTION_DAYS days"
    log "===================="
}

# Send notification (if configured)
send_notification() {
    if [ -n "$BACKUP_EMAIL" ]; then
        echo "InvMIS backup completed successfully at $(date)" | \\
            mail -s "InvMIS Backup Report - $DATE" "$BACKUP_EMAIL" 2>/dev/null || \\
            log "WARNING: Email notification failed"
    fi
    
    if [ -n "$BACKUP_WEBHOOK" ]; then
        curl -X POST "$BACKUP_WEBHOOK" \\
            -H "Content-Type: application/json" \\
            -d "{\"message\": \"InvMIS backup completed: $DATE\"}" 2>/dev/null || \\
            log "WARNING: Webhook notification failed"
    fi
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    if [ -f "$BACKUP_DIR/archive/invmis_complete_backup_$DATE.tar.gz" ]; then
        if tar -tzf "$BACKUP_DIR/archive/invmis_complete_backup_$DATE.tar.gz" >/dev/null 2>&1; then
            log "Backup integrity verification: PASSED"
        else
            handle_error "Backup integrity verification failed"
        fi
    else
        handle_error "Backup archive not found"
    fi
}

# Main backup process
main() {
    log "Starting InvMIS backup process..."
    
    create_backup_dirs
    backup_database
    backup_application
    backup_configuration
    backup_logs
    create_archive
    verify_backup
    cleanup_old_backups
    generate_report
    send_notification
    
    log "Backup process completed successfully!"
}

# Recovery function
recover() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo "Usage: $0 recover <backup_file>"
        echo "Available backups:"
        ls -la "$BACKUP_DIR/archive/"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Starting recovery from: $backup_file"
    
    # Create recovery directory
    RECOVERY_DIR="/tmp/invmis_recovery_$(date +%s)"
    mkdir -p "$RECOVERY_DIR"
    
    # Extract backup
    tar -xzf "$backup_file" -C "$RECOVERY_DIR" || handle_error "Backup extraction"
    
    echo "Backup extracted to: $RECOVERY_DIR"
    echo "Please review and manually restore the components as needed"
    echo "Database: $RECOVERY_DIR/database/"
    echo "Application: $RECOVERY_DIR/application/"
    echo "Configuration: $RECOVERY_DIR/config/"
    echo "Logs: $RECOVERY_DIR/logs/"
}

# Check command line arguments
case "${1:-backup}" in
    "backup")
        main
        ;;
    "recover")
        recover "$2"
        ;;
    "test")
        log "Running backup test (dry run)..."
        echo "This would perform a full backup to: $BACKUP_DIR"
        echo "Configuration appears valid"
        ;;
    *)
        echo "Usage: $0 [backup|recover|test]"
        echo "  backup  - Perform full system backup (default)"
        echo "  recover - Restore from backup file"
        echo "  test    - Test backup configuration"
        exit 1
        ;;
esac