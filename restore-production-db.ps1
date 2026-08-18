# 🚀 Restore Production Database Script

$ServerIP = "172.20.150.127"
$Username = "ecpadmin"
$LocalBackupPath = "C:\Temp\InventoryManagementDB_Backup.bak"
$RemoteBackupPath = "/home/ecpadmin/InventoryManagementDB_Backup.bak"
$ContainerName = "invmis-db-prod"

Write-Host "[1/4] Copying backup file to remote server..." -ForegroundColor Cyan
scp $LocalBackupPath ${Username}@${ServerIP}:${RemoteBackupPath}

Write-Host "\n[2/4] Copying backup from remote server into the Docker container..." -ForegroundColor Cyan
ssh -t ${Username}@${ServerIP} "sudo docker cp $RemoteBackupPath ${ContainerName}:/var/opt/mssql/data/"

Write-Host "\n[3/4] Restoring database inside Docker container..." -ForegroundColor Cyan
ssh -t ${Username}@${ServerIP} "sudo docker exec $ContainerName /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Syed@2020' -Q \"RESTORE DATABASE InvMISDB FROM DISK = '/var/opt/mssql/data/InventoryManagementDB_Backup.bak' WITH REPLACE\""

Write-Host "\n[4/4] Restarting API container to reconnect..." -ForegroundColor Cyan
ssh -t ${Username}@${ServerIP} "sudo docker restart invmis-api-prod"

Write-Host "\n✅ Database restored successfully!" -ForegroundColor Green
