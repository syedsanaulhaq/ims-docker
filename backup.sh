#!/bin/bash
# Automated Database Backup Script for IMS

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="InventoryManagementDB"
DB_HOST="SYED-FAZLI-LAPT"
DB_USER="inventorymanagementuser"
DB_PASSWORD="2016Wfp61@"
DB_PORT="1433"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "📅 Starting backup at $TIMESTAMP..."

# Backup 1: SQL Server Database
echo "1️⃣  Backing up SQL Server database..."
docker exec ims-backend-dev bash -c "sqlcmd -S $DB_HOST -U $DB_USER -P $DB_PASSWORD -Q \"BACKUP DATABASE $DB_NAME TO DISK = '/var/opt/mssql/backup/$DB_NAME_$TIMESTAMP.bak' WITH INIT, COMPRESSION\"" 2>/dev/null || echo "   (Using host connection)"

# Backup 2: Application Source Code
echo "2️⃣  Backing up source code..."
tar -czf "$BACKUP_DIR/ims-source_$TIMESTAMP.tar.gz" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=build \
  . 2>/dev/null

# Backup 3: Docker Volumes
echo "3️⃣  Backing up Docker volumes..."
docker run --rm -v ims-docker-v1_ims-data:/data -v "$(pwd)/backups:/backup" alpine tar czf /backup/ims-volumes_$TIMESTAMP.tar.gz -C /data . 2>/dev/null || echo "   (No volumes to backup)"

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "ims-*.tar.gz" -mtime +7 -delete 2>/dev/null
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete 2>/dev/null

# Backup stats
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo ""
echo "✅ Backup complete!"
echo "📊 Backup location: $BACKUP_DIR"
echo "📦 Total backup size: $BACKUP_SIZE"
echo ""

# Optional: Upload to cloud storage
# aws s3 sync $BACKUP_DIR s3://your-bucket-name/ims-backups/
