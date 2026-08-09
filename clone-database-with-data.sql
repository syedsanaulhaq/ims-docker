-- =====================================================
-- CLONE DATABASE WITH ALL DATA - SIMPLE METHOD
-- Uses BACKUP/RESTORE for exact copy
-- =====================================================

USE master;
GO

-- Step 1: Drop existing test database if it exists
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'InventoryManagementDB_TEST')
BEGIN
    PRINT 'Dropping existing InventoryManagementDB_TEST...';
    ALTER DATABASE InventoryManagementDB_TEST SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE InventoryManagementDB_TEST;
    PRINT '✓ Old test database dropped';
END
GO

-- Step 2: Backup production database
DECLARE @backupPath NVARCHAR(500) = 'C:\Temp\InventoryManagementDB_Backup.bak';
PRINT 'Creating backup of InventoryManagementDB...';
BACKUP DATABASE InventoryManagementDB 
TO DISK = @backupPath
WITH FORMAT, INIT, NAME = 'Full Backup of InventoryManagementDB';
PRINT '✓ Backup created';
GO

-- Step 3: Restore as InventoryManagementDB_TEST
DECLARE @backupPath NVARCHAR(500) = 'C:\Temp\InventoryManagementDB_Backup.bak';
DECLARE @dataPath NVARCHAR(500);
DECLARE @logPath NVARCHAR(500);

-- Get default data path
SELECT @dataPath = SUBSTRING(physical_name, 1, CHARINDEX(N'master.mdf', LOWER(physical_name)) - 1)
FROM master.sys.master_files
WHERE database_id = 1 AND file_id = 1;

SET @dataPath = @dataPath + 'InventoryManagementDB_TEST.mdf';
SET @logPath = SUBSTRING(@dataPath, 1, LEN(@dataPath) - 4) + '_log.ldf';

PRINT 'Restoring as InventoryManagementDB_TEST...';

RESTORE DATABASE InventoryManagementDB_TEST
FROM DISK = @backupPath
WITH MOVE 'InventoryManagementDB' TO @dataPath,
     MOVE 'InventoryManagementDB_log' TO @logPath,
     REPLACE;

PRINT '✓ Database restored as InventoryManagementDB_TEST';
GO

-- Step 4: Verify
USE InventoryManagementDB_TEST;
GO

PRINT '';
PRINT '✅ =====================================================';
PRINT '✅ DATABASE CLONE COMPLETE!';
PRINT '✅ =====================================================';
PRINT '';
PRINT '📊 DATA VERIFICATION:';

SELECT 
    'users' as TableName, 
    COUNT(*) as RecordCount 
FROM users
UNION ALL
SELECT 'item_masters', COUNT(*) FROM item_masters
UNION ALL
SELECT 'tenders', COUNT(*) FROM tenders
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'stock_issuance_requests', COUNT(*) FROM stock_issuance_requests
UNION ALL
SELECT 'tblOffices', COUNT(*) FROM tblOffices
UNION ALL
SELECT 'WingsInformation', COUNT(*) FROM WingsInformation
UNION ALL
SELECT 'DEC_MST', COUNT(*) FROM DEC_MST
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors;

PRINT '';
PRINT '✅ InventoryManagementDB_TEST is ready with FULL DATA!';
GO
