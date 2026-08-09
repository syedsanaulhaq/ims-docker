-- ====================================================================
-- 🔄 COPY EXISTING TABLES TO SimpleInventoryDB
-- ====================================================================
-- This script copies specific tables from InventoryManagementDB 
-- to SimpleInventoryDB to maintain consistency
-- ====================================================================

USE SimpleInventoryDB;
GO

-- ====================================================================
-- 📋 1. DROP EXISTING TABLES IF THEY EXIST
-- ====================================================================

-- Drop our custom tables that will be replaced
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('DECs', 'U') IS NOT NULL DROP TABLE DECs;
IF OBJECT_ID('Wings', 'U') IS NOT NULL DROP TABLE Wings;  
IF OBJECT_ID('Offices', 'U') IS NOT NULL DROP TABLE Offices;
IF OBJECT_ID('ItemCategories', 'U') IS NOT NULL DROP TABLE ItemCategories;

-- Drop tables that might conflict
IF OBJECT_ID('AspNetUsers', 'U') IS NOT NULL DROP TABLE AspNetUsers;
IF OBJECT_ID('categories', 'U') IS NOT NULL DROP TABLE categories;
IF OBJECT_ID('sub_categories', 'U') IS NOT NULL DROP TABLE sub_categories;
IF OBJECT_ID('DEC_MST', 'U') IS NOT NULL DROP TABLE DEC_MST;
IF OBJECT_ID('WingsInformation', 'U') IS NOT NULL DROP TABLE WingsInformation;
IF OBJECT_ID('tblOffices', 'U') IS NOT NULL DROP TABLE tblOffices;

PRINT '✅ Existing tables dropped';
GO

-- ====================================================================
-- 📋 2. CREATE AspNetUsers TABLE
-- ====================================================================

SELECT * 
INTO AspNetUsers
FROM InventoryManagementDB.dbo.AspNetUsers
WHERE 1 = 0;  -- Copy structure only first

-- Copy the data
INSERT INTO AspNetUsers
SELECT * FROM InventoryManagementDB.dbo.AspNetUsers;

PRINT '✅ AspNetUsers table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 3. CREATE categories TABLE  
-- ====================================================================

SELECT *
INTO categories
FROM InventoryManagementDB.dbo.categories
WHERE 1 = 0;  -- Copy structure only first

-- Copy the data
INSERT INTO categories
SELECT * FROM InventoryManagementDB.dbo.categories;

PRINT '✅ categories table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 4. CREATE sub_categories TABLE
-- ====================================================================

SELECT *
INTO sub_categories  
FROM InventoryManagementDB.dbo.sub_categories
WHERE 1 = 0;  -- Copy structure only first

-- Copy the data
INSERT INTO sub_categories
SELECT * FROM InventoryManagementDB.dbo.sub_categories;

PRINT '✅ sub_categories table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 5. CREATE DEC_MST TABLE
-- ====================================================================

SELECT *
INTO DEC_MST
FROM InventoryManagementDB.dbo.DEC_MST
WHERE 1 = 0;  -- Copy structure only first

-- Copy the data  
INSERT INTO DEC_MST
SELECT * FROM InventoryManagementDB.dbo.DEC_MST;

PRINT '✅ DEC_MST table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 6. CREATE WingsInformation TABLE
-- ====================================================================

SELECT *
INTO WingsInformation
FROM InventoryManagementDB.dbo.WingsInformation  
WHERE 1 = 0;  -- Copy structure only first

-- Copy the data
INSERT INTO WingsInformation
SELECT * FROM InventoryManagementDB.dbo.WingsInformation;

PRINT '✅ WingsInformation table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 7. CREATE tblOffices TABLE
-- ====================================================================

SELECT *
INTO tblOffices
FROM InventoryManagementDB.dbo.tblOffices
WHERE 1 = 0;  -- Copy structure only first

-- Copy the data
INSERT INTO tblOffices  
SELECT * FROM InventoryManagementDB.dbo.tblOffices;

PRINT '✅ tblOffices table copied with ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 8. VERIFY COPIED TABLES
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

-- ====================================================================
-- 📋 9. UPDATE CURRENT INVENTORY TABLES TO USE COPIED STRUCTURES  
-- ====================================================================

-- Update ItemMaster to reference the copied categories table
IF OBJECT_ID('ItemMaster', 'U') IS NOT NULL
BEGIN
    -- Add foreign key constraint to categories table
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ItemMaster_categories')
    BEGIN
        ALTER TABLE ItemMaster 
        ADD CONSTRAINT FK_ItemMaster_categories 
        FOREIGN KEY (category_id) REFERENCES categories(id);
        
        PRINT '✅ ItemMaster linked to copied categories table';
    END
END

-- Update ProcurementRequests to reference DEC_MST if needed
IF OBJECT_ID('ProcurementRequests', 'U') IS NOT NULL AND OBJECT_ID('DEC_MST', 'U') IS NOT NULL
BEGIN
    -- You can add relationships here as needed
    PRINT '✅ Tables ready for integration with DEC_MST';
END

PRINT '🎯 ALL TABLES SUCCESSFULLY COPIED FROM InventoryManagementDB!';
PRINT '';
PRINT '📋 Summary:';  
PRINT '   ✅ AspNetUsers - User authentication data';
PRINT '   ✅ categories - Item categories';
PRINT '   ✅ sub_categories - Item sub-categories'; 
PRINT '   ✅ DEC_MST - Department Equipment Committee data';
PRINT '   ✅ WingsInformation - Wing/department information';
PRINT '   ✅ tblOffices - Office/location data';
PRINT '';
PRINT '🔗 Your SimpleInventoryDB now uses the same organizational structure!';
GO
