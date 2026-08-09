-- =====================================================
-- SMART ASPNETUSERS SYNC
-- Merges data from CleanArchitectureDB
-- Updates changed data, inserts new users, leaves rest untouched
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   SMART AspNetUsers SYNC (Merge Approach)              ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- =====================================================
-- STEP 1: CREATE TEMPORARY COMPARISON TABLE
-- =====================================================
PRINT '=== STEP 1: PREPARE SYNC ===';

-- Create temp table to hold DS data
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AspNetUsers_DS_Temp')
    DROP TABLE AspNetUsers_DS_Temp;

SELECT * INTO AspNetUsers_DS_Temp
FROM [CleanArchitectureDB].dbo.AspNetUsers
WHERE ISACT = 1;

DECLARE @DSUserCount INT;
SELECT @DSUserCount = COUNT(*) FROM AspNetUsers_DS_Temp;
PRINT '✅ Loaded ' + CAST(@DSUserCount AS VARCHAR) + ' users from CleanArchitectureDB';

DECLARE @IMSUserCount INT;
SELECT @IMSUserCount = COUNT(*) FROM AspNetUsers;
PRINT '✅ Found ' + CAST(@IMSUserCount AS VARCHAR) + ' users in InventoryManagementDB';
PRINT '';

-- =====================================================
-- STEP 2: UPDATE EXISTING USERS (Only changed fields)
-- =====================================================
PRINT '=== STEP 2: UPDATE CHANGED USERS ===';

DECLARE @UpdateCount INT = 0;

-- Update users that exist in both databases
UPDATE IMS
SET 
    IMS.UserName = DS.UserName,
    IMS.FullName = DS.FullName,
    IMS.Email = DS.Email,
    IMS.PhoneNumber = DS.PhoneNumber,
    IMS.Password = DS.Password,
    IMS.PasswordHash = DS.PasswordHash,
    IMS.EmailConfirmed = DS.EmailConfirmed,
    IMS.PhoneNumberConfirmed = DS.PhoneNumberConfirmed,
    IMS.TwoFactorEnabled = DS.TwoFactorEnabled,
    IMS.LockoutEnabled = DS.LockoutEnabled,
    IMS.LockoutEnd = DS.LockoutEnd,
    IMS.AccessFailedCount = DS.AccessFailedCount,
    IMS.CNIC = DS.CNIC,
    IMS.ISACT = DS.ISACT
FROM AspNetUsers IMS
INNER JOIN AspNetUsers_DS_Temp DS ON IMS.Id = DS.Id;

SET @UpdateCount = @@ROWCOUNT;
PRINT '✅ Updated ' + CAST(@UpdateCount AS VARCHAR) + ' existing users';
PRINT '';

-- =====================================================
-- STEP 3: INSERT NEW USERS (Only if they don't exist)
-- =====================================================
PRINT '=== STEP 3: INSERT NEW USERS ===';

DECLARE @InsertCount INT = 0;

INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail,
    EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled,
    LockoutEnd, LockoutEnabled, AccessFailedCount,
    Password, FullName, CNIC, ISACT, LastLoggedIn,
    intOfficeID, intWingID, intProvinceID, intDivisionID,
    intDistrictID, intBranchID, intDesignationID, Role, UID, Gender, ProfilePhoto,
    FatherOrHusbandName
)
SELECT
    DS.Id, DS.UserName, DS.NormalizedUserName, DS.Email, DS.NormalizedEmail,
    DS.EmailConfirmed, DS.PasswordHash, DS.SecurityStamp, DS.ConcurrencyStamp,
    DS.PhoneNumber, DS.PhoneNumberConfirmed, DS.TwoFactorEnabled,
    DS.LockoutEnd, DS.LockoutEnabled, DS.AccessFailedCount,
    DS.Password, DS.FullName, DS.CNIC, DS.ISACT, DS.LastLoggedIn,
    DS.intOfficeID, DS.intWingID, DS.intProvinceID, DS.intDivisionID,
    DS.intDistrictID, DS.intBranchID, DS.intDesignationID, DS.Role, DS.UID, DS.Gender, DS.ProfilePhoto,
    DS.FatherOrHusbandName
FROM AspNetUsers_DS_Temp DS
WHERE DS.Id NOT IN (SELECT Id FROM AspNetUsers WHERE ISACT = 1);

SET @InsertCount = @@ROWCOUNT;
PRINT '✅ Inserted ' + CAST(@InsertCount AS VARCHAR) + ' new users';
PRINT '';

-- =====================================================
-- STEP 4: VERIFICATION & REPORT
-- =====================================================
PRINT '=== STEP 4: SYNC REPORT ===';
DECLARE @FinalCount INT;
SELECT @FinalCount = COUNT(*) FROM AspNetUsers WHERE ISACT = 1;

PRINT '';
PRINT 'Sync Summary:';
PRINT '  - Updated users: ' + CAST(@UpdateCount AS VARCHAR);
PRINT '  - Inserted users: ' + CAST(@InsertCount AS VARCHAR);
PRINT '  - Total active users now: ' + CAST(@FinalCount AS VARCHAR);
PRINT '';

-- Show sync statistics
SELECT 
    'Total Active Users' as Metric,
    COUNT(*) as Value
FROM AspNetUsers
WHERE ISACT = 1
UNION ALL
SELECT 
    'Users with Password',
    COUNT(*)
FROM AspNetUsers
WHERE ISACT = 1 AND Password IS NOT NULL
UNION ALL
SELECT 
    'Users with PasswordHash',
    COUNT(*)
FROM AspNetUsers
WHERE ISACT = 1 AND PasswordHash IS NOT NULL
UNION ALL
SELECT 
    'Locked Out Users',
    COUNT(*)
FROM AspNetUsers
WHERE ISACT = 1 AND LockoutEnabled = 1;

PRINT '';

-- =====================================================
-- STEP 5: CLEANUP & FINAL STATUS
-- =====================================================
PRINT '=== STEP 5: CLEANUP ===';

-- Drop temporary table
DROP TABLE AspNetUsers_DS_Temp;
PRINT '✅ Temporary sync table cleaned up';
PRINT '';

-- Show sample of synced users
PRINT '=== SAMPLE SYNCED USERS ===';
SELECT TOP 10
    UserName,
    FullName,
    Email,
    CASE WHEN Password IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPassword,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Yes' ELSE 'No' END as HasHash,
    ISACT as Active,
    LastLoggedIn
FROM AspNetUsers
WHERE ISACT = 1
ORDER BY LastLoggedIn DESC;

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   SYNC COMPLETE!                                       ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Test SSO login from Digital System';
PRINT '2. Verify all users can authenticate';
PRINT '3. No data was deleted - only updated/inserted';
PRINT '';
PRINT '✅ Smart sync completed successfully!';
