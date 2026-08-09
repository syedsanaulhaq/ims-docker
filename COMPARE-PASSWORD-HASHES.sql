-- =====================================================
-- COMPARE PASSWORD HASHES BETWEEN DS AND IMS
-- =====================================================
-- Check if the password hash matches between both databases

DECLARE @Username NVARCHAR(256) = '1730115698727';

PRINT '=== COMPARING PASSWORD HASHES ===';
PRINT '';

-- Get hash from Digital System
DECLARE @DSHash NVARCHAR(MAX);
SELECT @DSHash = PasswordHash 
FROM CleanArchitectureDB.dbo.AspNetUsers
WHERE UserName = @Username;

-- Get hash from IMS
DECLARE @IMSHash NVARCHAR(MAX);
SELECT @IMSHash = PasswordHash 
FROM InventoryManagementDB.dbo.AspNetUsers
WHERE UserName = @Username;

PRINT 'Digital System Hash (first 50 chars):';
PRINT SUBSTRING(@DSHash, 1, 50);
PRINT '';

PRINT 'IMS Hash (first 50 chars):';
PRINT SUBSTRING(@IMSHash, 1, 50);
PRINT '';

IF @DSHash = @IMSHash
BEGIN
    PRINT '✅ HASHES MATCH - Password hashes are identical';
    PRINT '';
    PRINT '⚠️ The password you are using (P@ssword@1) is INCORRECT';
    PRINT '   Try a different password or reset in Digital System';
END
ELSE
BEGIN
    PRINT '❌ HASHES DO NOT MATCH - Need to re-sync';
    PRINT '';
    PRINT 'Run SYNC-PASSWORD-HASH-FROM-DS.sql to fix';
END

PRINT '';
PRINT '=== FULL COMPARISON ===';
SELECT 
    'Digital System' as Source,
    UserName,
    FullName,
    PasswordHash,
    LEN(PasswordHash) as HashLength
FROM CleanArchitectureDB.dbo.AspNetUsers
WHERE UserName = @Username

UNION ALL

SELECT 
    'IMS' as Source,
    UserName,
    FullName,
    PasswordHash,
    LEN(PasswordHash) as HashLength
FROM InventoryManagementDB.dbo.AspNetUsers
WHERE UserName = @Username;
