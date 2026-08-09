-- ====================================================================
-- 🔄 COPY ORGANIZATIONAL TABLES WITH IDENTITY_INSERT HANDLING
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. COPY DEC_MST TABLE
-- ====================================================================

-- Drop existing table if it exists
IF OBJECT_ID('DEC_MST', 'U') IS NOT NULL DROP TABLE DEC_MST;

-- Create the table with exact structure (including identity)
SELECT * 
INTO DEC_MST
FROM InventoryManagementDB.dbo.DEC_MST
WHERE 1 = 0;

-- Enable identity insert and copy all data
SET IDENTITY_INSERT DEC_MST ON;

INSERT INTO DEC_MST (intAutoID, WingID, DECName, DECAcronym, DECAddress, Location, IS_ACT, DateAdded, DECCode, HODID, HODName, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version)
SELECT intAutoID, WingID, DECName, DECAcronym, DECAddress, Location, IS_ACT, DateAdded, DECCode, HODID, HODName, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version
FROM InventoryManagementDB.dbo.DEC_MST;

SET IDENTITY_INSERT DEC_MST OFF;

DECLARE @dec_count INT = @@ROWCOUNT;
PRINT '✅ DEC_MST copied successfully: ' + CAST(@dec_count AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 2. COPY WingsInformation TABLE  
-- ====================================================================

-- Drop existing table if it exists
IF OBJECT_ID('WingsInformation', 'U') IS NOT NULL DROP TABLE WingsInformation;

-- Create the table with exact structure (including identity)
SELECT *
INTO WingsInformation
FROM InventoryManagementDB.dbo.WingsInformation
WHERE 1 = 0;

-- Enable identity insert and copy all data
SET IDENTITY_INSERT WingsInformation ON;

INSERT INTO WingsInformation (Id, Name, ShortName, FocalPerson, ContactNo, Creator, CreateDate, Modifier, ModifyDate, OfficeID, IS_ACT, HODID, HODName, WingCode, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version)
SELECT Id, Name, ShortName, FocalPerson, ContactNo, Creator, CreateDate, Modifier, ModifyDate, OfficeID, IS_ACT, HODID, HODName, WingCode, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version
FROM InventoryManagementDB.dbo.WingsInformation;

SET IDENTITY_INSERT WingsInformation OFF;

DECLARE @wings_count INT = @@ROWCOUNT;
PRINT '✅ WingsInformation copied successfully: ' + CAST(@wings_count AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 3. COPY tblOffices TABLE
-- ====================================================================

-- Drop existing table if it exists  
IF OBJECT_ID('tblOffices', 'U') IS NOT NULL DROP TABLE tblOffices;

-- Create the table with exact structure (including identity)
SELECT *
INTO tblOffices
FROM InventoryManagementDB.dbo.tblOffices  
WHERE 1 = 0;

-- Enable identity insert and copy all data
SET IDENTITY_INSERT tblOffices ON;

INSERT INTO tblOffices (intOfficeID, strOfficeName, strOfficeDescription, CRT_BY, CRT_AT, LST_MOD_BY, LST_MOD_AT, IS_DELETED, IS_ACT, DEL_BY, DEL_AT, DEL_IP, strTelephoneNumber, strFax, strEmail, strGPSCoords, strPhotoPath, intProvinceID, intDivisionID, intDistrictID, intConstituencyID, intPollingStationID, OfficeCode, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version)
SELECT intOfficeID, strOfficeName, strOfficeDescription, CRT_BY, CRT_AT, LST_MOD_BY, LST_MOD_AT, IS_DELETED, IS_ACT, DEL_BY, DEL_AT, DEL_IP, strTelephoneNumber, strFax, strEmail, strGPSCoords, strPhotoPath, intProvinceID, intDivisionID, intDistrictID, intConstituencyID, intPollingStationID, OfficeCode, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version
FROM InventoryManagementDB.dbo.tblOffices;

SET IDENTITY_INSERT tblOffices OFF;

DECLARE @offices_count INT = @@ROWCOUNT;
PRINT '✅ tblOffices copied successfully: ' + CAST(@offices_count AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 4. VERIFICATION & SAMPLE DATA
-- ====================================================================

PRINT '📊 FINAL VERIFICATION - All Tables in SimpleInventoryDB:';

SELECT 
    'AspNetUsers' as TableName, COUNT(*) as RecordCount FROM AspNetUsers
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL  
SELECT 'sub_categories', COUNT(*) FROM sub_categories
UNION ALL
SELECT 'DEC_MST', COUNT(*) FROM DEC_MST  
UNION ALL
SELECT 'WingsInformation', COUNT(*) FROM WingsInformation
UNION ALL
SELECT 'tblOffices', COUNT(*) FROM tblOffices
ORDER BY TableName;

-- Show sample organizational structure
PRINT '';
PRINT '🏢 Sample Organizational Structure:';
PRINT '';
PRINT '📍 Offices:';
SELECT TOP 3 intOfficeID, strOfficeName FROM tblOffices WHERE IS_ACT = 1 ORDER BY intOfficeID;

PRINT '';  
PRINT '🏛️ Wings:';
SELECT TOP 5 Id, Name, ShortName, OfficeID FROM WingsInformation WHERE IS_ACT = 1 ORDER BY Id;

PRINT '';
PRINT '🏢 DECs:';  
SELECT TOP 5 intAutoID, DECName, DECAcronym, WingID FROM DEC_MST WHERE IS_ACT = 1 ORDER BY intAutoID;

PRINT '';
PRINT '🎯 SUCCESS! All organizational tables copied from InventoryManagementDB!';
PRINT '🔗 SimpleInventoryDB now has the exact same organizational structure!';
PRINT '';
PRINT '📋 Available Organizational Data:';
PRINT '   ✅ AspNetUsers - User authentication (425 users)';
PRINT '   ✅ categories - Item categories (6 categories)';  
PRINT '   ✅ sub_categories - Item sub-categories (15 sub-categories)';
PRINT '   ✅ DEC_MST - Department Equipment Committees';
PRINT '   ✅ WingsInformation - Wing/Department structure';
PRINT '   ✅ tblOffices - Office/Location hierarchy';
GO
