-- =====================================================
-- DIAGNOSE LOGIN ISSUE FOR SPECIFIC USER
-- Check user 1730115698727 password and status
-- =====================================================

USE [InventoryManagementDB];
GO

DECLARE @Username NVARCHAR(256) = '1730115698727';

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   DIAGNOSE LOGIN ISSUE                                 ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

PRINT 'Checking user: ' + @Username;
PRINT '';

-- Check if user exists
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = @Username)
BEGIN
    PRINT '❌ ERROR: User not found with username: ' + @Username;
    PRINT '';
    PRINT 'Available similar usernames (from top 10 users):';
    SELECT TOP 10 UserName, FullName, Email FROM AspNetUsers WHERE ISACT = 1 ORDER BY LastLoggedIn DESC;
    RETURN;
END

-- Show detailed user info
PRINT '=== USER DETAILS ===';
SELECT 
    Id,
    UserName,
    FullName,
    Email,
    PhoneNumber,
    CASE WHEN ISACT = 1 THEN '✅ Active' ELSE '❌ Inactive' END as AccountStatus,
    LastLoggedIn,
    EmailConfirmed,
    LockoutEnabled,
    LockoutEnd,
    AccessFailedCount
FROM AspNetUsers
WHERE UserName = @Username;

PRINT '';
PRINT '=== PASSWORD STATUS ===';

DECLARE @HasPlainPassword BIT = 0;
DECLARE @HasPasswordHash BIT = 0;
DECLARE @PlainPassword NVARCHAR(MAX) = NULL;
DECLARE @PasswordHashValue NVARCHAR(MAX) = NULL;

SELECT 
    @HasPlainPassword = CASE WHEN Password IS NOT NULL THEN 1 ELSE 0 END,
    @HasPasswordHash = CASE WHEN PasswordHash IS NOT NULL THEN 1 ELSE 0 END,
    @PlainPassword = Password,
    @PasswordHashValue = PasswordHash
FROM AspNetUsers
WHERE UserName = @Username;

PRINT 'Plain Password field: ' + CASE WHEN @HasPlainPassword = 1 THEN '✅ EXISTS (length: ' + CAST(LEN(@PlainPassword) AS VARCHAR) + ')' ELSE '❌ NULL (MISSING!)' END;
PRINT 'PasswordHash field: ' + CASE WHEN @HasPasswordHash = 1 THEN '✅ EXISTS (length: ' + CAST(LEN(@PasswordHashValue) AS VARCHAR) + ')' ELSE '❌ NULL (MISSING!)' END;

IF @HasPasswordHash = 1
BEGIN
    PRINT 'Hash type: ' + 
        CASE 
            WHEN @PasswordHashValue LIKE 'AQA%' THEN 'ASP.NET Identity'
            WHEN @PasswordHashValue LIKE '$2%' THEN 'Bcrypt'
            ELSE 'Unknown format'
        END;
END

PRINT '';
PRINT '=== DIAGNOSIS ===';

IF @HasPlainPassword = 0 AND @HasPasswordHash = 0
BEGIN
    PRINT '❌ PROBLEM: User has NO password!';
    PRINT '   This user cannot login until password is set.';
    PRINT '';
    PRINT 'SOLUTION: Set a password for this user';
END
ELSE IF @HasPlainPassword = 1
BEGIN
    PRINT '✅ GOOD: User has plain text password';
    PRINT '   Password will be checked directly';
    PRINT '   Make sure the password in Digital System session matches';
END
ELSE IF @HasPasswordHash = 1
BEGIN
    PRINT '✅ GOOD: User has password hash';
    PRINT '   Hash format will be verified';
    PRINT '   Make sure authentication endpoint tries all hash formats';
END

PRINT '';
PRINT '=== AUTHENTICATION CHECK ===';

-- Test if user would be found by login endpoint
DECLARE @TestAuth INT = 0;
SELECT @TestAuth = COUNT(*) FROM AspNetUsers 
WHERE UserName = @Username AND ISACT = 1;

IF @TestAuth = 1
BEGIN
    PRINT '✅ User WOULD be found by authentication endpoint';
    PRINT '   User is active and will be authenticated';
END
ELSE
BEGIN
    PRINT '❌ User WOULD NOT be found (inactive or doesn''t exist)';
END

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   SOLUTIONS                                            ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

IF @HasPlainPassword = 0 AND @HasPasswordHash = 0
BEGIN
    PRINT 'Run this to set a test password:';
    PRINT '';
    PRINT 'UPDATE AspNetUsers SET Password = ''Test@123'' WHERE UserName = ''' + @Username + ''';';
    PRINT '';
    PRINT 'Then try logging in with:';
    PRINT '  Username: ' + @Username;
    PRINT '  Password: Test@123';
END
ELSE
BEGIN
    PRINT '1. Verify password matches between Digital System and IMS';
    PRINT '2. Check IMS server logs for authentication error details';
    PRINT '3. Test SSO endpoint directly: POST http://172.20.150.34:3001/api/auth/ds-authenticate';
    PRINT '   Body: {"UserName": "' + @Username + '", "Password": "password_here"}';
    PRINT '';
    PRINT '4. Check if account is locked out: AccessFailedCount = 5?';
    PRINT '   If yes, reset: UPDATE AspNetUsers SET AccessFailedCount = 0 WHERE UserName = ''' + @Username + ''';';
END

PRINT '';
