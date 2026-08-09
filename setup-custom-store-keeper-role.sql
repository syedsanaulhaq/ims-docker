-- Setup CUSTOM_WING_STORE_KEEPER role with proper permissions
-- This script ensures the custom store keeper role can access store keeper functionality

PRINT ''
PRINT '========================================'
PRINT 'Setup CUSTOM_WING_STORE_KEEPER Role'
PRINT '========================================'

-- Step 1: Check if the role exists
DECLARE @storeKeeperRoleId UNIQUEIDENTIFIER
SELECT @storeKeeperRoleId = id FROM ims_roles WHERE role_name = 'CUSTOM_WING_STORE_KEEPER' AND is_active = 1

IF @storeKeeperRoleId IS NULL
BEGIN
  PRINT '❌ ERROR: CUSTOM_WING_STORE_KEEPER role not found'
  PRINT ''
  PRINT 'Available store keeper roles:'
  SELECT role_name FROM ims_roles WHERE role_name LIKE '%STORE%KEEPER%'
  RETURN
END

PRINT '✅ Found CUSTOM_WING_STORE_KEEPER role: ' + CAST(@storeKeeperRoleId AS NVARCHAR(36))

-- Step 2: Ensure the permission exists
PRINT ''
PRINT '📝 Step 1: Creating permission if missing...'

IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper')
BEGIN
  INSERT INTO ims_permissions (permission_key, module_name, action_name, description, is_active)
  VALUES (
    'inventory.manage_store_keeper',
    'Inventory',
    'Manage Store Keeper Operations',
    'Permission for store keepers to manage store operations',
    1
  );
  PRINT '✅ Permission created: inventory.manage_store_keeper'
END
ELSE
BEGIN
  PRINT '⚠️  Permission already exists: inventory.manage_store_keeper'
  UPDATE ims_permissions SET is_active = 1 WHERE permission_key = 'inventory.manage_store_keeper'
END

-- Step 3: Get the permission ID
DECLARE @permissionId UNIQUEIDENTIFIER
SELECT @permissionId = id FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper'

IF @permissionId IS NULL
BEGIN
  PRINT '❌ ERROR: Failed to get permission ID'
  RETURN
END

-- Step 4: Assign permission to role if not already assigned
PRINT ''
PRINT '🔗 Step 2: Assigning permission to CUSTOM_WING_STORE_KEEPER role...'

IF NOT EXISTS (
  SELECT 1 FROM ims_role_permissions 
  WHERE role_id = @storeKeeperRoleId AND permission_id = @permissionId
)
BEGIN
  INSERT INTO ims_role_permissions (role_id, permission_id)
  VALUES (@storeKeeperRoleId, @permissionId)
  PRINT '✅ Permission assigned to CUSTOM_WING_STORE_KEEPER role'
END
ELSE
BEGIN
  PRINT '⚠️  Permission already assigned to CUSTOM_WING_STORE_KEEPER role'
END

-- Step 5: Show who has this role
PRINT ''
PRINT '👥 Step 3: Users with CUSTOM_WING_STORE_KEEPER role:'
SELECT 
  ur.user_id,
  u.UserName,
  u.FullName,
  ur.is_active
FROM ims_user_roles ur
JOIN AspNetUsers u ON ur.user_id = u.Id
WHERE ur.role_id = @storeKeeperRoleId
ORDER BY u.UserName

-- Step 6: Verify user 3740506012171 has the role
PRINT ''
PRINT '👤 Checking user 3740506012171...'
DECLARE @userHasRole INT
SELECT @userHasRole = COUNT(*) FROM ims_user_roles WHERE user_id = '3740506012171' AND role_id = @storeKeeperRoleId AND is_active = 1

IF @userHasRole > 0
BEGIN
  PRINT '✅ User 3740506012171 HAS CUSTOM_WING_STORE_KEEPER role'
  
  -- Verify permission is visible
  DECLARE @userCanSeePermission INT
  SELECT @userCanSeePermission = COUNT(*) 
  FROM vw_ims_user_permissions
  WHERE user_id = '3740506012171' AND permission_key = 'inventory.manage_store_keeper'
  
  IF @userCanSeePermission > 0
    PRINT '✅ User can see inventory.manage_store_keeper permission'
  ELSE
    PRINT '⚠️  User cannot see permission yet (might need session refresh)'
END
ELSE
BEGIN
  PRINT '❌ User 3740506012171 DOES NOT have CUSTOM_WING_STORE_KEEPER role'
  
  PRINT ''
  PRINT 'User current roles:'
  SELECT r.role_name FROM ims_user_roles ur
  JOIN ims_roles r ON ur.role_id = r.id
  WHERE ur.user_id = '3740506012171' AND ur.is_active = 1
END

-- Step 7: Show all Store Keeper permissions (for reference)
PRINT ''
PRINT '🔐 Step 4: All permissions assigned to CUSTOM_WING_STORE_KEEPER:'
SELECT 
  p.permission_key,
  p.module_name,
  p.action_name
FROM ims_role_permissions rp
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE rp.role_id = @storeKeeperRoleId
ORDER BY p.permission_key

PRINT ''
PRINT '========================================'
PRINT 'Setup Complete'
PRINT '========================================'
