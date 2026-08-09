-- Assign default "User" role to all users without any IMS role
-- Run this on production database: InventoryManagementDB

USE InventoryManagementDB;
GO

DECLARE @UserRoleId UNIQUEIDENTIFIER;
DECLARE @AssignedCount INT = 0;

-- Get the "General User" role ID
SELECT @UserRoleId = id 
FROM ims_roles 
WHERE role_name = 'GENERAL_USER';

IF @UserRoleId IS NULL
BEGIN
    PRINT '❌ Error: GENERAL_USER role not found. Please run create-ims-role-system.sql first.';
END
ELSE
BEGIN
    PRINT '✅ Found GENERAL_USER role: ' + CAST(@UserRoleId AS NVARCHAR(50));
    PRINT '';
    PRINT '🔍 Finding users without IMS roles...';
    
    -- Insert default role for all active users who don't have any IMS role yet
    INSERT INTO ims_user_roles (
        user_id, 
        role_id, 
        scope_type,
        assigned_by,
        is_active
    )
    SELECT 
        u.Id as user_id,
        @UserRoleId as role_id,
        'Global' as scope_type,
        '869dd81b-a782-494d-b8c2-695369b5ebb6' as assigned_by, -- Super admin user
        1 as is_active
    FROM AspNetUsers u
    WHERE u.ISACT = 1  -- Only active users
      AND NOT EXISTS (
          SELECT 1 
          FROM ims_user_roles ur 
          WHERE ur.user_id = u.Id 
            AND ur.is_active = 1
      );
    
    SET @AssignedCount = @@ROWCOUNT;
    
    PRINT '✅ Assigned default "General User" role to ' + CAST(@AssignedCount AS NVARCHAR(10)) + ' users';
    PRINT '';
END
GO

-- Show summary of all users with their roles
PRINT '📊 Current User Role Summary:';
PRINT '';

SELECT 
    r.role_name,
    r.display_name,
    COUNT(DISTINCT ur.user_id) as user_count
FROM ims_roles r
LEFT JOIN ims_user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
GROUP BY r.role_name, r.display_name
ORDER BY 
    CASE r.role_name
        WHEN 'IMS_SUPER_ADMIN' THEN 1
        WHEN 'IMS_ADMIN' THEN 2
        WHEN 'WING_SUPERVISOR' THEN 3
        WHEN 'GENERAL_USER' THEN 4
        WHEN 'PROCUREMENT_OFFICER' THEN 5
        WHEN 'AUDITOR' THEN 6
        ELSE 7
    END;

PRINT '';
PRINT '✅ Script completed successfully!';
PRINT '💡 Tip: Users will see their new permissions after logging out and logging back in.';
