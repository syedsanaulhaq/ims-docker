-- Add inventory.manage permission to Wing Supervisor role
-- This allows Wing Supervisors to see and manage pending inventory verifications

DECLARE @RoleId INT, @PermissionId INT;

-- Get Wing Supervisor role ID
SELECT @RoleId = id FROM ims_roles WHERE role_name = 'WING_SUPERVISOR';

-- Get inventory.manage permission ID
SELECT @PermissionId = id FROM ims_permissions WHERE permission_key = 'inventory.manage';

IF @RoleId IS NOT NULL AND @PermissionId IS NOT NULL
BEGIN
    -- Check if permission already exists
    IF NOT EXISTS (
        SELECT 1 FROM ims_role_permissions 
        WHERE role_id = @RoleId AND permission_id = @PermissionId
    )
    BEGIN
        INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
        VALUES (@RoleId, @PermissionId, 'SYSTEM_SETUP');
        
        PRINT '✅ Added inventory.manage permission to Wing Supervisor role';
    END
    ELSE
    BEGIN
        PRINT '⚠️  Wing Supervisor already has inventory.manage permission';
    END
END
ELSE
BEGIN
    PRINT '❌ Could not find Wing Supervisor role or inventory.manage permission';
    IF @RoleId IS NULL PRINT '   - Wing Supervisor role not found';
    IF @PermissionId IS NULL PRINT '   - inventory.manage permission not found';
END
