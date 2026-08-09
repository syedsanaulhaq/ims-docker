-- =====================================================
-- ASSIGN WING_SUPERVISOR ROLE TO TEST USERS
-- =====================================================
-- This script assigns the WING_SUPERVISOR role to test users
-- so they can view pending verifications for their wings

USE InventoryManagementDB;
GO

PRINT '🔧 Assigning WING_SUPERVISOR role to test users...';
PRINT '====================================================';
GO

-- Get the WING_SUPERVISOR role ID
DECLARE @WingSupervisorRoleId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'WING_SUPERVISOR');

IF @WingSupervisorRoleId IS NULL
BEGIN
    PRINT '❌ ERROR: WING_SUPERVISOR role not found!';
    GOTO EndOfScript;
END

PRINT '✓ Found WING_SUPERVISOR role: ' + CAST(@WingSupervisorRoleId AS NVARCHAR(36));
GO

-- Get test users
DECLARE @TestUsers TABLE (
    UserId NVARCHAR(128),
    FullName NVARCHAR(255),
    IntWingID INT,
    WingName NVARCHAR(255)
);

INSERT INTO @TestUsers
SELECT 
    u.Id,
    u.FullName,
    u.intWingID,
    w.wing_name
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.wing_id
WHERE u.FullName IN ('Muhammad Ehtesham Siddiqui', 'Asad ur Rehman')
  AND u.ISACT = 1;

IF (SELECT COUNT(*) FROM @TestUsers) = 0
BEGIN
    PRINT '⚠️  No matching test users found!';
    GOTO EndOfScript;
END

PRINT '';
PRINT '📝 Found test users:';
SELECT '  - ' + FullName + ' (Wing: ' + ISNULL(WingName, 'NOT SET') + ')' as Info FROM @TestUsers;
PRINT '';
GO

-- Assign WING_SUPERVISOR role to each test user for their wing
DECLARE @TestUsers TABLE (
    UserId NVARCHAR(128),
    FullName NVARCHAR(255),
    IntWingID INT
);

INSERT INTO @TestUsers
SELECT 
    u.Id,
    u.FullName,
    u.intWingID
FROM AspNetUsers u
WHERE u.FullName IN ('Muhammad Ehtesham Siddiqui', 'Asad ur Rehman')
  AND u.ISACT = 1
  AND u.intWingID IS NOT NULL
  AND u.intWingID > 0;

DECLARE @WingSupervisorRoleId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'WING_SUPERVISOR');
DECLARE @UserId NVARCHAR(128);
DECLARE @FullName NVARCHAR(255);
DECLARE @IntWingID INT;
DECLARE UserCursor CURSOR FOR SELECT UserId, FullName, IntWingID FROM @TestUsers;

OPEN UserCursor;
FETCH NEXT FROM UserCursor INTO @UserId, @FullName, @IntWingID;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Check if this user already has the WING_SUPERVISOR role for this wing
    IF NOT EXISTS (
        SELECT 1 FROM ims_user_roles 
        WHERE user_id = @UserId 
          AND role_id = @WingSupervisorRoleId 
          AND scope_wing_id = @IntWingID
    )
    BEGIN
        INSERT INTO ims_user_roles (user_id, role_id, scope_type, scope_wing_id, assigned_by, notes, created_at)
        VALUES (
            @UserId,
            @WingSupervisorRoleId,
            'Wing',
            @IntWingID,
            'MANUAL_SETUP',
            'Wing supervisor for test user - can view pending verifications',
            GETUTCDATE()
        );
        
        PRINT '✅ Assigned WING_SUPERVISOR to: ' + @FullName + ' (Wing ID: ' + CAST(@IntWingID AS NVARCHAR(10)) + ')';
    END
    ELSE
    BEGIN
        PRINT '⚠️  Already assigned: ' + @FullName + ' (Wing ID: ' + CAST(@IntWingID AS NVARCHAR(10)) + ')';
    END

    FETCH NEXT FROM UserCursor INTO @UserId, @FullName, @IntWingID;
END

CLOSE UserCursor;
DEALLOCATE UserCursor;

PRINT '';
PRINT '✅ Completed role assignment!';

EndOfScript:
GO
