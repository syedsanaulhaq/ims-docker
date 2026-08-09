-- =====================================================
-- MANUAL APPROACH: Export/Import AspNetUsers
-- Use this if DS database is on a different server
-- =====================================================

-- =====================================================
-- PART 1: RUN THIS ON DIGITAL SYSTEM SERVER
-- =====================================================
/*
USE [CleanArchitectureDB]; -- Digital System database
GO

-- Export AspNetUsers to script format
-- Right-click AspNetUsers table → "Script Table as" → "INSERT To" → "New Query Window"
-- OR use SQL Server Management Studio's "Generate Scripts" wizard:
-- 1. Right-click database → Tasks → Generate Scripts
-- 2. Select AspNetUsers table only
-- 3. Advanced → Types of data to script → "Data only"
-- 4. Save the output script file

-- Or use BCP command to export:
-- bcp "SELECT * FROM CleanArchitectureDB.dbo.AspNetUsers WHERE ISACT = 1" queryout "C:\Temp\AspNetUsers.csv" -c -t"," -S YourServerName -T
*/

-- =====================================================
-- PART 2: RUN THIS ON IMS SERVER (PRODUCTION)
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   PREPARE IMS FOR AspNetUsers IMPORT                   ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- Step 1: Create backup
DECLARE @BackupTable NVARCHAR(128) = 'AspNetUsers_Backup_BeforeDS_' + CONVERT(VARCHAR(8), GETDATE(), 112);
EXEC('SELECT * INTO ' + @BackupTable + ' FROM AspNetUsers');
PRINT '✅ Backup created: ' + @BackupTable;
PRINT '';

-- Step 2: Show current counts
PRINT '=== BEFORE IMPORT ===';
SELECT 
    'IMS (Before)' as [Source],
    COUNT(*) as TotalUsers,
    SUM(CASE WHEN ISACT = 1 THEN 1 ELSE 0 END) as ActiveUsers
FROM AspNetUsers;
PRINT '';

-- Step 3: Clear existing users
PRINT '⚠️ WARNING: About to delete all existing users!';
PRINT 'Backup saved in: ' + @BackupTable;
PRINT '';
PRINT 'To proceed, uncomment the DELETE statement below:';
PRINT '';
PRINT '📍 Source: CleanArchitectureDB.dbo.AspNetUsers';
PRINT '📍 Target: InventoryManagementDB.dbo.AspNetUsers';
PRINT '';

-- UNCOMMENT TO DELETE:
/*
DELETE FROM AspNetUsers;
PRINT '✅ Existing users cleared';
PRINT '';
PRINT '👉 NOW: Paste the INSERT statements from Digital System export and run them';
PRINT '';
*/

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   AFTER IMPORT VERIFICATION                            ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT 'After importing, run this to verify:';
PRINT '';
PRINT 'SELECT';
PRINT '    COUNT(*) as TotalUsers,';
PRINT '    SUM(CASE WHEN ISACT = 1 THEN 1 ELSE 0 END) as ActiveUsers,';
PRINT '    SUM(CASE WHEN Password IS NOT NULL THEN 1 ELSE 0 END) as WithPassword,';
PRINT '    SUM(CASE WHEN PasswordHash IS NOT NULL THEN 1 ELSE 0 END) as WithPasswordHash';
PRINT 'FROM AspNetUsers;';
PRINT '';

-- Step 4: After import, verify specific test user
PRINT '=== TEST USER VERIFICATION (Run after import) ===';
PRINT '';
PRINT '-- Check if your test user exists:';
PRINT 'SELECT UserName, FullName, Email, Password, ISACT';
PRINT 'FROM AspNetUsers'; 
PRINT 'WHERE UserName = ''1730115698727''; -- Or your test CNIC';
PRINT '';
PRINT '-- Show sample users:';
PRINT 'SELECT TOP 10 UserName, FullName, Email, ISACT';
PRINT 'FROM AspNetUsers';
PRINT 'ORDER BY LastLoggedIn DESC;';
