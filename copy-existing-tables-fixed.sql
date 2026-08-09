-- ====================================================================
-- 🔄 COPY EXISTING TABLES TO SimpleInventoryDB (CORRECTED)
-- ====================================================================

USE SimpleInventoryDB;
GO

-- ====================================================================
-- 📋 1. DROP FOREIGN KEY CONSTRAINTS FIRST
-- ====================================================================

-- Get all foreign key constraints and drop them
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + '; '
FROM sys.foreign_keys;

IF LEN(@sql) > 0
    EXEC sp_executesql @sql;

PRINT '✅ Foreign key constraints dropped';
GO

-- ====================================================================
-- 📋 2. DROP EXISTING TABLES  
-- ====================================================================

IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('DECs', 'U') IS NOT NULL DROP TABLE DECs; 
IF OBJECT_ID('Wings', 'U') IS NOT NULL DROP TABLE Wings;
IF OBJECT_ID('Offices', 'U') IS NOT NULL DROP TABLE Offices;
IF OBJECT_ID('ItemCategories', 'U') IS NOT NULL DROP TABLE ItemCategories;
IF OBJECT_ID('AspNetUsers', 'U') IS NOT NULL DROP TABLE AspNetUsers;
IF OBJECT_ID('categories', 'U') IS NOT NULL DROP TABLE categories;
IF OBJECT_ID('sub_categories', 'U') IS NOT NULL DROP TABLE sub_categories;
IF OBJECT_ID('DEC_MST', 'U') IS NOT NULL DROP TABLE DEC_MST;
IF OBJECT_ID('WingsInformation', 'U') IS NOT NULL DROP TABLE WingsInformation;
IF OBJECT_ID('tblOffices', 'U') IS NOT NULL DROP TABLE tblOffices;

PRINT '✅ Tables dropped successfully';
GO

-- ====================================================================
-- 📋 3. CREATE AND POPULATE AspNetUsers
-- ====================================================================

SELECT * 
INTO AspNetUsers
FROM InventoryManagementDB.dbo.AspNetUsers;

PRINT '✅ AspNetUsers table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 4. CREATE AND POPULATE categories
-- ====================================================================

SELECT *
INTO categories  
FROM InventoryManagementDB.dbo.categories;

PRINT '✅ categories table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 5. CREATE AND POPULATE sub_categories
-- ====================================================================

SELECT *
INTO sub_categories
FROM InventoryManagementDB.dbo.sub_categories;

PRINT '✅ sub_categories table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 6. CREATE AND POPULATE DEC_MST (WITH IDENTITY INSERT)
-- ====================================================================

-- Create table structure first
SELECT *
INTO DEC_MST
FROM InventoryManagementDB.dbo.DEC_MST  
WHERE 1 = 0;

-- Enable identity insert and copy data
SET IDENTITY_INSERT DEC_MST ON;
INSERT INTO DEC_MST
SELECT * FROM InventoryManagementDB.dbo.DEC_MST;
SET IDENTITY_INSERT DEC_MST OFF;

PRINT '✅ DEC_MST table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 7. CREATE AND POPULATE WingsInformation (WITH IDENTITY INSERT)
-- ====================================================================

-- Create table structure first  
SELECT *
INTO WingsInformation
FROM InventoryManagementDB.dbo.WingsInformation
WHERE 1 = 0;

-- Enable identity insert and copy data
SET IDENTITY_INSERT WingsInformation ON;
INSERT INTO WingsInformation  
SELECT * FROM InventoryManagementDB.dbo.WingsInformation;
SET IDENTITY_INSERT WingsInformation OFF;

PRINT '✅ WingsInformation table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 8. CREATE AND POPULATE tblOffices (WITH IDENTITY INSERT)  
-- ====================================================================

-- Create table structure first
SELECT *
INTO tblOffices
FROM InventoryManagementDB.dbo.tblOffices
WHERE 1 = 0;

-- Enable identity insert and copy data
SET IDENTITY_INSERT tblOffices ON;
INSERT INTO tblOffices
SELECT * FROM InventoryManagementDB.dbo.tblOffices;  
SET IDENTITY_INSERT tblOffices OFF;

PRINT '✅ tblOffices table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 9. VERIFY COPIED TABLES
-- ====================================================================

PRINT '📊 VERIFICATION - Table Record Counts:';

SELECT 
    'AspNetUsers' as TableName,
    COUNT(*) as RecordCount
FROM AspNetUsers  

UNION ALL

SELECT 
    'categories' as TableName,
    COUNT(*) as RecordCount
FROM categories

UNION ALL

SELECT 
    'sub_categories' as TableName, 
    COUNT(*) as RecordCount
FROM sub_categories

UNION ALL

SELECT 
    'DEC_MST' as TableName,
    COUNT(*) as RecordCount  
FROM DEC_MST

UNION ALL

SELECT 
    'WingsInformation' as TableName,
    COUNT(*) as RecordCount
FROM WingsInformation

UNION ALL

SELECT 
    'tblOffices' as TableName,
    COUNT(*) as RecordCount
FROM tblOffices

ORDER BY TableName;

PRINT '🎯 ALL TABLES SUCCESSFULLY COPIED!';
PRINT '';
PRINT '📋 Available Tables:';
PRINT '   ✅ AspNetUsers - Authentication & user data';  
PRINT '   ✅ categories - Item categories from original system';
PRINT '   ✅ sub_categories - Item sub-categories from original system';
PRINT '   ✅ DEC_MST - Department Equipment Committee data'; 
PRINT '   ✅ WingsInformation - Wing/department structure';
PRINT '   ✅ tblOffices - Office/location hierarchy';
PRINT '';
PRINT '🔗 SimpleInventoryDB now uses the exact same organizational structure!';
GO
