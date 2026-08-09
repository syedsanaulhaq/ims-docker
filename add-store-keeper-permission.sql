-- Add Store Keeper permission to the database
-- This permission will be assigned to users with WING_STORE_KEEPER or BRANCH_STORE_KEEPER role

-- Check if permission already exists
IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper')
BEGIN
  INSERT INTO ims_permissions (permission_key, module_name, action_name)
  VALUES ('inventory.manage_store_keeper', 'Inventory', 'Manage Store')
END

PRINT '✅ Store Keeper permission setup complete'

-- Assign permission to store keeper roles
DECLARE @permissionId NVARCHAR(MAX)
SELECT TOP 1 @permissionId = id
FROM ims_permissions
WHERE permission_key = 'inventory.manage_store_keeper'

IF @permissionId IS NOT NULL
BEGIN
  INSERT INTO ims_role_permissions (role_id, permission_id)
  SELECT r.id, @permissionId
  FROM ims_roles r
  WHERE r.role_name IN ('WING_STORE_KEEPER', 'BRANCH_STORE_KEEPER')
    AND NOT EXISTS (
      SELECT 1 FROM ims_role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = @permissionId
    )

  PRINT '✅ Permission assigned to store keeper roles'
END
ELSE
BEGIN
  PRINT '⚠️ inventory.manage_store_keeper permission not found in database'
END
