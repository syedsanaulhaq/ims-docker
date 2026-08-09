-- ====================================================================
-- 🔄 COPY ORGANIZATIONAL TABLES WITH IDENTITY HANDLING
-- ====================================================================

USE SimpleInventoryDB;
GO

-- ====================================================================
-- 📋 1. COPY DEC_MST WITH PROPER IDENTITY HANDLING
-- ====================================================================

-- Drop existing table
IF OBJECT_ID('DEC_MST', 'U') IS NOT NULL DROP TABLE DEC_MST;

-- Create table structure without identity
CREATE TABLE DEC_MST (
    intAutoID INT NOT NULL,
    WingID INT NULL,
    DECName NVARCHAR(MAX) NULL,
    DECAcronym NVARCHAR(MAX) NULL,
    DECAddress NVARCHAR(MAX) NULL,
    Location NVARCHAR(MAX) NULL,
    IS_ACT BIT NULL,
    DateAdded DATETIME2(7) NULL,
    DECCode NVARCHAR(7) NULL,
    HODID INT NULL,
    HODName NVARCHAR(MAX) NULL,
    CreatedBy NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(7) NULL,
    UpdatedBy NVARCHAR(MAX) NULL,
    UpdatedAt DATETIME2(7) NULL,
    Version INT NULL
);

-- Insert data from original table
INSERT INTO DEC_MST
SELECT 
    intAutoID, WingID, DECName, DECAcronym, DECAddress, Location, 
    IS_ACT, DateAdded, DECCode, HODID, HODName, CreatedBy, 
    CreatedAt, UpdatedBy, UpdatedAt, Version
FROM InventoryManagementDB.dbo.DEC_MST;

-- Add primary key
ALTER TABLE DEC_MST ADD CONSTRAINT PK_DEC_MST PRIMARY KEY (intAutoID);

PRINT '✅ DEC_MST copied: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 2. COPY WingsInformation WITH PROPER IDENTITY HANDLING  
-- ====================================================================

-- Drop existing table
IF OBJECT_ID('WingsInformation', 'U') IS NOT NULL DROP TABLE WingsInformation;

-- Create table structure without identity
CREATE TABLE WingsInformation (
    Id INT NOT NULL,
    Name NVARCHAR(MAX) NULL,
    ShortName NVARCHAR(50) NULL,
    FocalPerson NVARCHAR(MAX) NULL,
    ContactNo NVARCHAR(MAX) NULL,
    Creator NVARCHAR(MAX) NULL,
    CreateDate DATETIME2(7) NULL,
    Modifier NVARCHAR(MAX) NULL,
    ModifyDate DATETIME2(7) NULL,
    OfficeID INT NULL,
    IS_ACT BIT NULL,
    HODID INT NULL,
    HODName NVARCHAR(MAX) NULL,
    WingCode NVARCHAR(8) NULL,
    CreatedBy NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(7) NULL,
    UpdatedBy NVARCHAR(MAX) NULL,
    UpdatedAt DATETIME2(7) NULL,
    Version INT NULL
);

-- Insert data from original table  
INSERT INTO WingsInformation
SELECT 
    Id, Name, ShortName, FocalPerson, ContactNo, Creator, CreateDate,
    Modifier, ModifyDate, OfficeID, IS_ACT, HODID, HODName, WingCode,
    CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, Version
FROM InventoryManagementDB.dbo.WingsInformation;

-- Add primary key
ALTER TABLE WingsInformation ADD CONSTRAINT PK_WingsInformation PRIMARY KEY (Id);

PRINT '✅ WingsInformation copied: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 3. COPY tblOffices WITH PROPER IDENTITY HANDLING
-- ====================================================================

-- Drop existing table
IF OBJECT_ID('tblOffices', 'U') IS NOT NULL DROP TABLE tblOffices;

-- Create table structure without identity
CREATE TABLE tblOffices (
    intOfficeID INT NOT NULL,
    strOfficeName NVARCHAR(MAX) NULL,
    strOfficeDescription NVARCHAR(MAX) NULL,
    CRT_BY INT NULL,
    CRT_AT DATETIME2(7) NULL,
    LST_MOD_BY INT NULL,
    LST_MOD_AT DATETIME2(7) NULL,
    IS_DELETED BIT NULL,
    IS_ACT BIT NULL,
    DEL_BY INT NULL,
    DEL_AT DATETIME2(7) NULL,
    DEL_IP NVARCHAR(20) NULL,
    strTelephoneNumber NVARCHAR(50) NULL,
    strFax NVARCHAR(50) NULL,
    strEmail NVARCHAR(MAX) NULL,
    strGPSCoords NVARCHAR(MAX) NULL,
    strPhotoPath NVARCHAR(MAX) NULL,
    intProvinceID INT NULL,
    intDivisionID INT NULL,
    intDistrictID INT NULL,
    intConstituencyID INT NULL,
    intPollingStationID INT NULL,
    OfficeCode NVARCHAR(10) NULL,
    CreatedBy NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(7) NULL,
    UpdatedBy NVARCHAR(MAX) NULL,
    UpdatedAt DATETIME2(7) NULL,
    Version INT NULL
);

-- Insert data from original table
INSERT INTO tblOffices
SELECT 
    intOfficeID, strOfficeName, strOfficeDescription, CRT_BY, CRT_AT,
    LST_MOD_BY, LST_MOD_AT, IS_DELETED, IS_ACT, DEL_BY, DEL_AT, DEL_IP,
    strTelephoneNumber, strFax, strEmail, strGPSCoords, strPhotoPath,
    intProvinceID, intDivisionID, intDistrictID, intConstituencyID,
    intPollingStationID, OfficeCode, CreatedBy, CreatedAt, UpdatedBy,
    UpdatedAt, Version
FROM InventoryManagementDB.dbo.tblOffices;

-- Add primary key
ALTER TABLE tblOffices ADD CONSTRAINT PK_tblOffices PRIMARY KEY (intOfficeID);

PRINT '✅ tblOffices copied: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records';
GO

-- ====================================================================
-- 📋 4. FINAL VERIFICATION AND SAMPLE DATA
-- ====================================================================

-- Record counts
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

-- Sample data from key organizational tables
PRINT '📊 Sample DEC_MST Records:';
SELECT TOP 3 intAutoID, DECName, DECAcronym, WingID FROM DEC_MST ORDER BY intAutoID;

PRINT '📊 Sample WingsInformation Records:';  
SELECT TOP 3 Id, Name, ShortName, OfficeID FROM WingsInformation ORDER BY Id;

PRINT '📊 Sample tblOffices Records:';
SELECT TOP 3 intOfficeID, strOfficeName FROM tblOffices ORDER BY intOfficeID;

PRINT '✅ SUCCESS! All organizational tables copied from InventoryManagementDB';
PRINT '🔗 SimpleInventoryDB now uses the same organizational structure as the original system!';
GO
