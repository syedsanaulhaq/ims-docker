-- =====================================================
-- RE-SYNC SINGLE USER PASSWORD HASH FROM DS
-- =====================================================
-- Force fresh sync for specific user

USE [InventoryManagementDB];
GO

DECLARE @Username NVARCHAR(256) = '1730115698727';

PRINT '=== RE-SYNCING PASSWORD HASH ===';
PRINT 'User: ' + @Username;
PRINT '';

-- Get CURRENT hash from DS
DECLARE @DSPasswordHash NVARCHAR(MAX);
DECLARE @DSPassword NVARCHAR(MAX);

SELECT 
   @DSPasswordHash = PasswordHash,
   @DSPassword = Password
FROM [ECP-DS-DB\MSSQLSERVER2].CleanArchitectureDB.dbo.AspNetUsers
WHERE UserName = @Username;

IF @DSPasswordHash IS NULL
BEGIN
    PRINT '❌ User not found in Digital System';
    RETURN;
END

PRINT 'Digital System data retrieved:';
PRINT '  Password field: ' + ISNULL(@DSPassword, 'NULL');
PRINT '  PasswordHash (first 30 chars): ' + SUBSTRING(@DSPasswordHash, 1, 30);
PRINT '';

-- Update IMS with FRESH data
UPDATE AspNetUsers
SET 
    PasswordHash = @DSPasswordHash,
    Password = @DSPassword
WHERE UserName = @Username;

PRINT '✅ Updated in IMS';
PRINT '';

-- Verify
SELECT 
    UserName,
    FullName,
    Password,
    SUBSTRING(PasswordHash, 1, 40) as PasswordHash_First40
FROM AspNetUsers
WHERE UserName = @Username;

PRINT '';
PRINT 'Now test again with the password from Digital System';
