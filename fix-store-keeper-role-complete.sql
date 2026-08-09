-- COMPREHENSIVE FIX: Add Store Keeper Role and Permission if missing
-- This script ensures the Store Keeper role and permission are properly set up

PRINT ''
PRINT '========================================'
PRINT 'Store Keeper Role & Permission Setup'
PRINT '========================================'

-- Step 1: Create the permission if it doesn't exist
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
  -- Make sure it's active
  UPDATE ims_permissions SET is_active = 1 WHERE permission_key = 'inventory.manage_store_keeper'
END

-- Step 2: Get the role ID for WING_STORE_KEEPER
PRINT ''
PRINT '🔍 Step 2: Finding WING_STORE_KEEPER role...'

DECLARE @storeKeeperRoleId UNIQUEIDENTIFIER
SELECT @storeKeeperRoleId = id FROM ims_roles WHERE role_name = 'WING_STORE_KEEPER' AND is_active = 1

IF @storeKeeperRoleId IS NULL
BEGIN
  PRINT '❌ ERROR: WING_STORE_KEEPER role not found!'
  PRINT '   Available roles:'
  SELECT id, role_name FROM ims_roles WHERE is_active = 1
END
ELSE
BEGIN
  PRINT '✅ Found WING_STORE_KEEPER role: ' + CAST(@storeKeeperRoleId AS NVARCHAR(36))
  
  -- Step 3: Assign permission to role
  PRINT ''
  PRINT '🔗 Step 3: Assigning permission to role...'
  
  DECLARE @permissionId UNIQUEIDENTIFIER
  SELECT @permissionId = id FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper'
  
  IF @permissionId IS NULL
  BEGIN
    PRINT '❌ ERROR: Permission ID not found'
  END
  ELSE
  BEGIN
    -- Check if assignment already exists
    IF NOT EXISTS (
      SELECT 1 FROM ims_role_permissions 
      WHERE role_id = @storeKeeperRoleId AND permission_id = @permissionId
    )
    BEGIN
      INSERT INTO ims_role_permissions (role_id, permission_id)
      VALUES (@storeKeeperRoleId, @permissionId)
      PRINT '✅ Permission assigned to WING_STORE_KEEPER role'
    END
    ELSE
    BEGIN
      PRINT '⚠️  Permission already assigned to WING_STORE_KEEPER role'
    END
  END
END

-- Step 4: Verify user has the role
PRINT ''
PRINT '👤 Step 4: Verifying user 3740506012171 has WING_STORE_KEEPER role...'

DECLARE @userHasRole INT
SELECT @userHasRole = COUNT(*) 
FROM ims_user_roles ur
JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.user_id = '3740506012171' AND r.role_name = 'WING_STORE_KEEPER' AND ur.is_active = 1

IF @userHasRole > 0
BEGIN
  PRINT '✅ User has WING_STORE_KEEPER role'
  
  -- Step 5: Test permission visibility
  PRINT ''
  PRINT '🔐 Step 5: Verifying user can see the permission...'
  
  DECLARE @userHasPermission INT
  SELECT @userHasPermission = COUNT(*)
  FROM vw_ims_user_permissions
  WHERE user_id = '3740506012171' AND permission_key = 'inventory.manage_store_keeper'
  
  IF @userHasPermission > 0
  BEGIN
    PRINT '✅ User can see inventory.manage_store_keeper permission'
  END
  ELSE
  BEGIN
    PRINT '❌ ERROR: User cannot see inventory.manage_store_keeper permission'
    PRINT '   Debugging: Checking database setup...'
    
    PRINT ''
    PRINT '   User roles:'
    SELECT role_name FROM ims_user_roles ur
    JOIN ims_roles r ON ur.role_id = r.id
    WHERE ur.user_id = '3740506012171' AND ur.is_active = 1
    
    PRINT ''
    PRINT '   Role permissions for WING_STORE_KEEPER:'
    SELECT p.permission_key FROM ims_role_permissions rp
    JOIN ims_permissions p ON rp.permission_id = p.id
    JOIN ims_roles r ON rp.role_id = r.id
    WHERE r.role_name = 'WING_STORE_KEEPER'
  END
END
ELSE
BEGIN
  PRINT '❌ ERROR: User does not have WING_STORE_KEEPER role'
  PRINT '   Current roles for this user:'
  SELECT role_name FROM ims_user_roles ur
  JOIN ims_roles r ON ur.role_id = r.id
  WHERE ur.user_id = '3740506012171' AND ur.is_active = 1
END

PRINT ''
PRINT '========================================'
PRINT 'Setup Complete'
PRINT '========================================'
