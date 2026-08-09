-- =====================================================
-- CREATE ADMIN USER FOR TESTING
-- Run this if you need a new admin account
-- =====================================================

USE [InventoryManagementDB];
GO

-- Create a new admin user
-- Username: admin
-- Password: Admin@123 (you'll need to hash this properly in your app)

DECLARE @UserId NVARCHAR(450) = NEWID();
DECLARE @AdminRoleId NVARCHAR(450);

-- Get Admin role ID
SELECT @AdminRoleId = Id FROM AspNetRoles WHERE Name = 'Admin';

IF @AdminRoleId IS NULL
BEGIN
    -- Create Admin role if it doesn't exist
    SET @AdminRoleId = NEWID();
    INSERT INTO AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (@AdminRoleId, 'Admin', 'ADMIN', NEWID());
    PRINT '✅ Admin role created';
END

-- Check if admin user already exists
IF EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = 'admin')
BEGIN
    PRINT '⚠️ User "admin" already exists!';
    SELECT UserName, Email, PhoneNumber FROM AspNetUsers WHERE UserName = 'admin';
END
ELSE
BEGIN
    -- Create admin user
    -- NOTE: PasswordHash is for "Admin@123" - you should regenerate this using your app's hash algorithm
    INSERT INTO AspNetUsers (
        Id,
        UserName,
        NormalizedUserName,
        Email,
        NormalizedEmail,
        EmailConfirmed,
        PasswordHash,
        SecurityStamp,
        ConcurrencyStamp,
        PhoneNumber,
        PhoneNumberConfirmed,
        TwoFactorEnabled,
        LockoutEnd,
        LockoutEnabled,
        AccessFailedCount
    )
    VALUES (
        @UserId,
        'admin',
        'ADMIN',
        'admin@ims.com',
        'ADMIN@IMS.COM',
        1,
        'AQAAAAIAAYagAAAAEMpqKH5qF5qJ9XCqKJ8ZqJ9XCqKJ8ZqJ9XCqKJ8ZqJ9XCqKJ8ZqJ9XCq==', -- Placeholder - use proper hash
        NEWID(),
        NEWID(),
        '1234567890',
        1,
        0,
        NULL,
        1,
        0
    );
    
    -- Assign admin role
    INSERT INTO AspNetUserRoles (UserId, RoleId)
    VALUES (@UserId, @AdminRoleId);
    
    PRINT '✅ Admin user created successfully';
    PRINT 'Username: admin';
    PRINT 'Password: Admin@123';
    PRINT '';
    PRINT '⚠️ IMPORTANT: Change the password after first login!';
END
GO

-- Show all users
PRINT '';
PRINT '=== ALL USERS ===';
SELECT 
    u.UserName,
    u.Email,
    r.Name as Role
FROM AspNetUsers u
LEFT JOIN AspNetUserRoles ur ON u.Id = ur.UserId
LEFT JOIN AspNetRoles r ON ur.RoleId = r.Id
ORDER BY u.UserName;
