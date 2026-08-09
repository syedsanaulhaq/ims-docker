-- =====================================================
-- Setup inventoryusertest User for InventoryManagementDB_TEST
-- =====================================================

USE master;
GO

-- Create login if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'inventoryusertest')
BEGIN
    CREATE LOGIN inventoryusertest WITH PASSWORD = '2016Wfp61@';
    PRINT '✓ Created SQL Server login: inventoryusertest';
END
ELSE
BEGIN
    PRINT 'ℹ️ Login inventoryusertest already exists';
END
GO

-- Switch to test database
USE InventoryManagementDB_TEST;
GO

-- Create user if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'inventoryusertest')
BEGIN
    CREATE USER inventoryusertest FOR LOGIN inventoryusertest;
    PRINT '✓ Created database user: inventoryusertest';
END
ELSE
BEGIN
    PRINT 'ℹ️ User inventoryusertest already exists in database';
END
GO

-- Grant permissions
ALTER ROLE db_datareader ADD MEMBER inventoryusertest;
ALTER ROLE db_datawriter ADD MEMBER inventoryusertest;
ALTER ROLE db_ddladmin ADD MEMBER inventoryusertest;
GO

PRINT '';
PRINT '✅ User inventoryusertest setup complete!';
PRINT '';
PRINT '📊 Permissions granted:';
PRINT '  ✓ db_datareader (read all tables)';
PRINT '  ✓ db_datawriter (insert/update/delete)';
PRINT '  ✓ db_ddladmin (create/modify tables)';
PRINT '';
PRINT '🔐 Credentials:';
PRINT '  Username: inventoryusertest';
PRINT '  Password: 2016Wfp61@';
PRINT '  Database: InventoryManagementDB_TEST';
PRINT '';
PRINT '✅ Ready to use in .env-test file!';
GO
