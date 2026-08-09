-- =====================================================
-- DIAGNOSE DS SSO LOGIN ISSUE
-- Check if users from .NET app exist in restored database
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║      DS SSO LOGIN DIAGNOSTIC                           ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- 1. Show all active users
PRINT '=== 1. ALLACTIVE USERS IN DATABASE ===';
SELECT 
    UserName,
    FullName,
    Email,
    CNIC,
    CASE 
        WHEN Password IS NOT NULL THEN 'Plain text exists (length: ' + CAST(LEN(Password) AS VARCHAR) + ')'
        ELSE 'NULL'
    END as PasswordField,
    CASE 
        WHEN PasswordHash IS NOT NULL THEN 'Hash exists (length: ' + CAST(LEN(PasswordHash) AS VARCHAR) + ')'
        ELSE 'NULL'
    END as PasswordHashField,
    CASE 
        WHEN PasswordHash LIKE 'AQA%' THEN 'ASP.NET Identity'
        WHEN PasswordHash LIKE '$2%' THEN 'Bcrypt'
        WHEN PasswordHash IS NULL AND Password IS NOT NULL THEN 'Plain text only'
        ELSE 'Unknown format'
    END as PasswordType,
    ISACT as IsActive,
    LastLoggedIn
FROM AspNetUsers
WHERE ISACT = 1
ORDER BY UserName;
PRINT '';

-- 2. Check if the .NET session username exists
PRINT '=== 2. CHECK SPECIFIC USERNAMES ===';
PRINT 'Checking common usernames from .NET Digital System...';
PRINT '';

-- Check for a specific user (modify this based on what the .NET app is sending)
DECLARE @TestUser VARCHAR(100);

-- Check top 5 most recently logged in users (likely candidates)
PRINT 'Most recently logged in users:';
SELECT TOP 5
    UserName,
    FullName,
    Email,
    LastLoggedIn,
    CASE WHEN Password IS NOT NULL THEN 'Has Plain Password' ELSE 'No Plain Password' END as PasswordStatus
FROM AspNetUsers
WHERE ISACT = 1 AND LastLoggedIn IS NOT NULL
ORDER BY LastLoggedIn DESC;
PRINT '';

-- 3. Show password verification methods available
PRINT '=== 3. PASSWORD VERIFICATION METHODS ===';
SELECT 
    COUNT(*) as TotalUsers,
    SUM(CASE WHEN PasswordHash LIKE 'AQA%' THEN 1 ELSE 0 END) as AspNetIdentityHashes,
    SUM(CASE WHEN PasswordHash LIKE '$2%' THEN 1 ELSE 0 END) as BcryptHashes,
    SUM(CASE WHEN Password IS NOT NULL AND PasswordHash IS NULL THEN 1 ELSE 0 END) as PlainTextOnly,
    SUM(CASE WHEN Password IS NOT NULL AND PasswordHash IS NOT NULL THEN 1 ELSE 0 END) as BothPasswordFields
FROM AspNetUsers
WHERE ISACT = 1;
PRINT '';

-- 4. Recommendations
PRINT '=== 4. DIAGNOSIS & RECOMMENDATIONS ===';
PRINT '';
PRINT 'If users cannot login from Digital System:';
PRINT '';
PRINT '1. VERIFY USERNAME: Check that the username in .NET session matches a UserName in this database';
PRINT '   - The .NET app sends: HttpContext.Session.GetString("CNIC") as username';
PRINT '   - This should match the UserName column in AspNetUsers';
PRINT '';
PRINT '2. PASSWORD SYNC: The database restore may have overwritten passwords';
PRINT '   - Option A: Update passwords in IMS database to match Digital System';
PRINT '   - Option B: Update passwords in Digital System to match IMS database';
PRINT '   - Option C: Reset passwords for affected users in both systems';
PRINT '';
PRINT '3. CHECK PASSWORD HASH FORMAT:';
PRINT '   - ASP.NET Identity: Should work with aspnet-identity-pw library';
PRINT '   - Bcrypt: Should work with bcrypt library';
PRINT '   - Plain text: Will compare directly (less secure)';
PRINT '';

-- 5. Create a test admin user if needed
PRINT '=== 5. QUICK FIX: CREATE TEST USER ===';
PRINT '';
PRINT 'If you need to quickly test SSO, you can create a test user:';
PRINT '';
PRINT '-- Example: Create user with plain text password (for testing only!)';
PRINT 'INSERT INTO AspNetUsers (Id, UserName, FullName, Email, Password, ISACT)';
PRINT 'VALUES (NEWID(), ''testuser'', ''Test User'', ''test@test.com'', ''Test123'', 1);';
PRINT '';
PRINT '-- Then set this username/password in Digital System session';
PRINT '';
PRINT '⚠️ WARNING: Plain text passwords are INSECURE! Use only for testing!';
PRINT '';

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║      DIAGNOSIS COMPLETE                                ║';
PRINT '╚════════════════════════════════════════════════════════╝';
