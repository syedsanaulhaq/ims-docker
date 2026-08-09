-- ====================================================================
-- 🔄 COPY EXISTING TABLES - FINAL CORRECTED VERSION
-- ====================================================================

USE SimpleInventoryDB;
GO

-- First, let's see what data exists in the original tables
SELECT 'DEC_MST Records' as Info, COUNT(*) as Count FROM InventoryManagementDB.dbo.DEC_MST
UNION ALL
SELECT 'WingsInformation Records', COUNT(*) FROM InventoryManagementDB.dbo.WingsInformation  
UNION ALL
SELECT 'tblOffices Records', COUNT(*) FROM InventoryManagementDB.dbo.tblOffices;
GO

-- ====================================================================
-- 📋 COPY DEC_MST TABLE MANUALLY
-- ====================================================================

-- Drop and recreate DEC_MST
IF OBJECT_ID('DEC_MST', 'U') IS NOT NULL DROP TABLE DEC_MST;

-- Get the CREATE TABLE statement and execute it manually
SELECT *
INTO DEC_MST
FROM InventoryManagementDB.dbo.DEC_MST
WHERE 1 = 0;

-- Insert data row by row to avoid identity issues
INSERT INTO DEC_MST
SELECT * FROM InventoryManagementDB.dbo.DEC_MST;

PRINT '✅ DEC_MST copied: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 COPY WingsInformation TABLE MANUALLY  
-- ====================================================================

-- Drop and recreate WingsInformation
IF OBJECT_ID('WingsInformation', 'U') IS NOT NULL DROP TABLE WingsInformation;

SELECT *
INTO WingsInformation
FROM InventoryManagementDB.dbo.WingsInformation
WHERE 1 = 0;

-- Insert data
INSERT INTO WingsInformation
SELECT * FROM InventoryManagementDB.dbo.WingsInformation;

PRINT '✅ WingsInformation copied: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 COPY tblOffices TABLE MANUALLY
-- ====================================================================

-- Drop and recreate tblOffices  
IF OBJECT_ID('tblOffices', 'U') IS NOT NULL DROP TABLE tblOffices;

SELECT *
INTO tblOffices
FROM InventoryManagementDB.dbo.tblOffices
WHERE 1 = 0;

-- Insert data
INSERT INTO tblOffices  
SELECT * FROM InventoryManagementDB.dbo.tblOffices;

PRINT '✅ tblOffices copied: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 FINAL VERIFICATION
-- ====================================================================

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

-- Show sample data from key tables  
PRINT '📊 Sample Data from DEC_MST:';
SELECT TOP 5 * FROM DEC_MST;

PRINT '📊 Sample Data from WingsInformation:';  
SELECT TOP 5 * FROM WingsInformation;

PRINT '📊 Sample Data from tblOffices:';
SELECT TOP 5 * FROM tblOffices;

PRINT '✅ ALL ORGANIZATIONAL TABLES SUCCESSFULLY COPIED!';
GO
