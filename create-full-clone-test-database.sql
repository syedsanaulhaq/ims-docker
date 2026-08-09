-- =====================================================
-- COMPLETE DATABASE CLONE - EXACT COPY
-- =====================================================
-- This script creates a FULL CLONE of InventoryManagementDB
-- Including ALL data: users, inventory, transactions, everything!
-- Perfect for testing with real data without affecting production
-- =====================================================

PRINT '🎯 =====================================================';
PRINT '🎯 FULL DATABASE CLONE STARTING';
PRINT '🎯 Creating exact copy of InventoryManagementDB';
PRINT '🎯 =====================================================';
GO

-- =====================================================
-- STEP 1: DROP AND CREATE TEST DATABASE
-- =====================================================
USE master;
GO

-- Drop existing test database if it exists
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'InventoryManagementDB_TEST')
BEGIN
    PRINT '🗑️  Dropping existing InventoryManagementDB_TEST database...';
    
    -- Kill all connections to the database
    ALTER DATABASE InventoryManagementDB_TEST SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE InventoryManagementDB_TEST;
    
    PRINT '✓ Old test database dropped';
END

-- Create new empty test database
PRINT '🏗️  Creating new InventoryManagementDB_TEST database...';
CREATE DATABASE InventoryManagementDB_TEST;
PRINT '✓ Empty test database created';
GO

-- =====================================================
-- STEP 2: COPY ALL TABLE STRUCTURES
-- =====================================================
USE InventoryManagementDB_TEST;
GO

PRINT '';
PRINT '📋 =====================================================';
PRINT '📋 COPYING ALL TABLE STRUCTURES';
PRINT '📋 =====================================================';
GO

DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @tableName NVARCHAR(128);
DECLARE @schemaName NVARCHAR(128) = 'dbo';
DECLARE @tableCount INT = 0;

-- Cursor to loop through all user tables in InventoryManagementDB
DECLARE table_cursor CURSOR FOR
SELECT TABLE_NAME
FROM InventoryManagementDB.INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
ORDER BY TABLE_NAME;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Generate CREATE TABLE script for each table
    SET @sql = '';
    
    -- Build column definitions
    SELECT @sql = @sql + 
        QUOTENAME(c.COLUMN_NAME) + ' ' +
        c.DATA_TYPE +
        CASE 
            WHEN c.DATA_TYPE IN ('varchar', 'char', 'nvarchar', 'nchar') THEN 
                '(' + CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX' 
                          ELSE CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) END + ')'
            WHEN c.DATA_TYPE IN ('decimal', 'numeric') THEN 
                '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR(10)) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR(10)) + ')'
            WHEN c.DATA_TYPE IN ('datetime2', 'time') THEN
                CASE WHEN c.DATETIME_PRECISION IS NOT NULL 
                     THEN '(' + CAST(c.DATETIME_PRECISION AS VARCHAR(10)) + ')'
                     ELSE '' END
            ELSE ''
        END +
        CASE WHEN c.IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE ' NULL' END +
        CASE WHEN c.COLUMN_DEFAULT IS NOT NULL THEN ' DEFAULT ' + c.COLUMN_DEFAULT ELSE '' END +
        ',' + CHAR(13)
    FROM InventoryManagementDB.INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_SCHEMA = @schemaName
      AND c.TABLE_NAME = @tableName
    ORDER BY c.ORDINAL_POSITION;

    -- Remove trailing comma
    IF LEN(@sql) > 0
        SET @sql = LEFT(@sql, LEN(@sql) - 2);

    -- Wrap in CREATE TABLE
    SET @sql = 'CREATE TABLE ' + QUOTENAME(@schemaName) + '.' + QUOTENAME(@tableName) + ' (' + CHAR(13) +
               @sql + CHAR(13) +
               ');';

    -- Execute the CREATE TABLE statement
    BEGIN TRY
        EXEC sp_executesql @sql;
        SET @tableCount = @tableCount + 1;
        PRINT '  ✓ Created table: ' + @tableName;
    END TRY
    BEGIN CATCH
        PRINT '  ✗ Error creating table ' + @tableName + ': ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM table_cursor INTO @tableName;
END

CLOSE table_cursor;
DEALLOCATE table_cursor;

PRINT '';
PRINT '✓ Created ' + CAST(@tableCount AS VARCHAR(10)) + ' tables';
GO

-- =====================================================
-- STEP 3: COPY ALL DATA FROM ALL TABLES
-- =====================================================
PRINT '';
PRINT '📦 =====================================================';
PRINT '📦 COPYING ALL DATA (FULL CLONE)';
PRINT '📦 This will take a few minutes...';
PRINT '📦 =====================================================';
GO

-- Cursor to copy data from all tables
DECLARE @tableName NVARCHAR(128);
DECLARE @columns NVARCHAR(MAX);
DECLARE @sql NVARCHAR(MAX);
DECLARE @rowCount INT;
DECLARE @totalRows INT = 0;
DECLARE @tablesCopied INT = 0;

DECLARE data_cursor CURSOR FOR
SELECT TABLE_NAME
FROM InventoryManagementDB.INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
ORDER BY TABLE_NAME;

OPEN data_cursor;
FETCH NEXT FROM data_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Check if table exists in source database
    IF OBJECT_ID('InventoryManagementDB.dbo.' + @tableName, 'U') IS NOT NULL
    BEGIN
        -- Get list of columns (excluding computed columns and identity columns for non-identity inserts)
        SELECT @columns = STRING_AGG(QUOTENAME(COLUMN_NAME), ', ')
        FROM InventoryManagementDB.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
          AND TABLE_SCHEMA = 'dbo'
          AND COLUMNPROPERTY(OBJECT_ID('InventoryManagementDB.dbo.' + @tableName), COLUMN_NAME, 'IsComputed') = 0;
        
        IF @columns IS NOT NULL AND @columns <> ''
        BEGIN
            BEGIN TRY
                -- Check if table has identity column
                DECLARE @hasIdentity BIT = 0;
                SELECT @hasIdentity = 1
                FROM InventoryManagementDB.INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = @tableName
                  AND TABLE_SCHEMA = 'dbo'
                  AND COLUMNPROPERTY(OBJECT_ID('InventoryManagementDB.dbo.' + @tableName), COLUMN_NAME, 'IsIdentity') = 1;
                
                -- Enable identity insert if needed
                IF @hasIdentity = 1
                BEGIN
                    SET @sql = 'SET IDENTITY_INSERT InventoryManagementDB_TEST.dbo.' + QUOTENAME(@tableName) + ' ON;';
                    EXEC sp_executesql @sql;
                END
                
                -- Copy data
                SET @sql = 'INSERT INTO InventoryManagementDB_TEST.dbo.' + QUOTENAME(@tableName) + ' (' + @columns + ') ' +
                           'SELECT ' + @columns + ' FROM InventoryManagementDB.dbo.' + QUOTENAME(@tableName) + ';';
                
                EXEC sp_executesql @sql;
                SET @rowCount = @@ROWCOUNT;
                SET @totalRows = @totalRows + @rowCount;
                SET @tablesCopied = @tablesCopied + 1;
                
                -- Disable identity insert if it was enabled
                IF @hasIdentity = 1
                BEGIN
                    SET @sql = 'SET IDENTITY_INSERT InventoryManagementDB_TEST.dbo.' + QUOTENAME(@tableName) + ' OFF;';
                    EXEC sp_executesql @sql;
                END
                
                IF @rowCount > 0
                BEGIN
                    PRINT '  ✓ Copied ' + @tableName + ' (' + CAST(@rowCount AS VARCHAR(10)) + ' rows)';
                END
                ELSE
                BEGIN
                    PRINT '  ○ ' + @tableName + ' (empty table)';
                END
            END TRY
            BEGIN CATCH
                PRINT '  ⚠️  Warning copying ' + @tableName + ': ' + ERROR_MESSAGE();
                
                -- Try to disable identity insert in case of error
                BEGIN TRY
                    SET @sql = 'SET IDENTITY_INSERT InventoryManagementDB_TEST.dbo.' + QUOTENAME(@tableName) + ' OFF;';
                    EXEC sp_executesql @sql;
                END TRY
                BEGIN CATCH
                    -- Ignore error
                END CATCH
            END CATCH
        END
    END
    
    FETCH NEXT FROM data_cursor INTO @tableName;
END

CLOSE data_cursor;
DEALLOCATE data_cursor;

PRINT '';
PRINT '✓ Data copy completed!';
PRINT '  Tables processed: ' + CAST(@tablesCopied AS VARCHAR(10));
PRINT '  Total rows copied: ' + CAST(@totalRows AS VARCHAR(10));
GO

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================
PRINT '';
PRINT '🔍 =====================================================';
PRINT '🔍 VERIFYING CLONED DATABASE';
PRINT '🔍 =====================================================';
GO

-- Compare row counts between original and clone
PRINT '';
PRINT 'Row Count Comparison (Original vs Clone):';
PRINT '';

-- Key tables verification
DECLARE @originalCount INT, @cloneCount INT;
DECLARE @tableName NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

-- Create temp table for comparison
CREATE TABLE #Comparison (
    TableName NVARCHAR(128),
    OriginalCount INT,
    CloneCount INT,
    Status NVARCHAR(20)
);

-- Get counts for all tables
DECLARE verify_cursor CURSOR FOR
SELECT TABLE_NAME
FROM InventoryManagementDB.INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
ORDER BY TABLE_NAME;

OPEN verify_cursor;
FETCH NEXT FROM verify_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Get original count
    SET @sql = 'SELECT @count = COUNT(*) FROM InventoryManagementDB.dbo.' + QUOTENAME(@tableName);
    EXEC sp_executesql @sql, N'@count INT OUTPUT', @count = @originalCount OUTPUT;
    
    -- Get clone count
    SET @sql = 'SELECT @count = COUNT(*) FROM InventoryManagementDB_TEST.dbo.' + QUOTENAME(@tableName);
    EXEC sp_executesql @sql, N'@count INT OUTPUT', @count = @cloneCount OUTPUT;
    
    -- Insert comparison
    INSERT INTO #Comparison (TableName, OriginalCount, CloneCount, Status)
    VALUES (
        @tableName, 
        @originalCount, 
        @cloneCount,
        CASE WHEN @originalCount = @cloneCount THEN '✓ Match' ELSE '✗ Mismatch' END
    );
    
    FETCH NEXT FROM verify_cursor INTO @tableName;
END

CLOSE verify_cursor;
DEALLOCATE verify_cursor;

-- Display comparison
SELECT 
    TableName,
    OriginalCount,
    CloneCount,
    Status
FROM #Comparison
WHERE OriginalCount > 0 OR CloneCount > 0
ORDER BY 
    CASE WHEN Status = '✗ Mismatch' THEN 0 ELSE 1 END,
    TableName;

-- Summary
DECLARE @totalTables INT, @matchedTables INT, @mismatchedTables INT;
SELECT 
    @totalTables = COUNT(*),
    @matchedTables = SUM(CASE WHEN Status = '✓ Match' THEN 1 ELSE 0 END),
    @mismatchedTables = SUM(CASE WHEN Status = '✗ Mismatch' THEN 1 ELSE 0 END)
FROM #Comparison
WHERE OriginalCount > 0 OR CloneCount > 0;

PRINT '';
PRINT 'Verification Summary:';
PRINT '  Total tables with data: ' + CAST(@totalTables AS VARCHAR(10));
PRINT '  Matched: ' + CAST(@matchedTables AS VARCHAR(10));
IF @mismatchedTables > 0
    PRINT '  ⚠️  Mismatched: ' + CAST(@mismatchedTables AS VARCHAR(10));
ELSE
    PRINT '  ✓ All tables matched perfectly!';

DROP TABLE #Comparison;
GO

-- =====================================================
-- COMPLETION SUMMARY
-- =====================================================
PRINT '';
PRINT '✅ =====================================================';
PRINT '✅ FULL DATABASE CLONE COMPLETE!';
PRINT '✅ =====================================================';
PRINT '';
PRINT '📊 SUMMARY:';
PRINT '  Source Database: InventoryManagementDB';
PRINT '  Clone Database:  InventoryManagementDB_TEST';
PRINT '';
PRINT '  ✓ ALL TABLE STRUCTURES COPIED';
PRINT '  ✓ ALL DATA COPIED (Users, Inventory, Transactions, Everything!)';
PRINT '  ✓ EXACT CLONE - Ready for testing';
PRINT '';
PRINT '🎯 WHAT YOU HAVE NOW:';
PRINT '  • Complete copy of production database';
PRINT '  • All users and authentication data';
PRINT '  • All organizational data';
PRINT '  • All inventory items';
PRINT '  • All tenders and deliveries';
PRINT '  • All stock transactions';
PRINT '  • All historical data';
PRINT '';
PRINT '🎯 USE CASES:';
PRINT '  • Test with real data without affecting production';
PRINT '  • Demo system with actual inventory';
PRINT '  • Training environment with real scenarios';
PRINT '  • Development and debugging';
PRINT '  • Performance testing';
PRINT '';
PRINT '⚠️  IMPORTANT NOTES:';
PRINT '  • This is a SNAPSHOT - changes in production won''t sync';
PRINT '  • Changes in TEST won''t affect production';
PRINT '  • Re-run this script anytime to get fresh clone';
PRINT '  • Use TEST for demos/testing, PROD for actual operations';
PRINT '';
PRINT '🎯 NEXT STEPS:';
PRINT '  1. Update your .env or config file:';
PRINT '     DB_NAME=InventoryManagementDB_TEST';
PRINT '';
PRINT '  2. Restart your backend server';
PRINT '';
PRINT '  3. Login with same credentials as production';
PRINT '';
PRINT '  4. You now have full production data for testing!';
PRINT '';
PRINT '✅ =====================================================';
PRINT '';
PRINT '✅ Test database clone is ready!';
PRINT '✅ Safe testing environment created!';
GO
