-- =====================================================
-- QUICK CHECK: What users exist in production?
-- Run this RIGHT NOW on production database
-- =====================================================

USE [InventoryManagementDB];
GO

-- Show all existing usernames
PRINT '=== ALL USERS IN DATABASE ===';
SELECT 
    UserName,
    Email,
    PhoneNumber,
    EmailConfirmed,
    CASE WHEN LockoutEnabled = 1 THEN 'Locked' ELSE 'Active' END as Status
FROM AspNetUsers
ORDER BY UserName;

-- Check if the username from error log exists
PRINT '';
PRINT '=== CHECKING USERNAME: 1730115698727 ===';
IF EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = '1730115698727')
BEGIN
    PRINT '✅ Username EXISTS';
    SELECT * FROM AspNetUsers WHERE UserName = '1730115698727';
END
ELSE
BEGIN
    PRINT '❌ Username NOT FOUND - This is why login fails!';
    PRINT '';
    PRINT 'The database was restored from backup and your user accounts were replaced.';
    PRINT 'You need to either:';
    PRINT '  1. Use one of the usernames listed above, OR';
    PRINT '  2. Create a new user account';
END
