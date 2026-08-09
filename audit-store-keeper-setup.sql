-- Comprehensive check for Store Keeper role and permission setup

PRINT '======================================'
PRINT 'Store Keeper Role & Permission Audit'
PRINT '======================================'

-- Check 1: Does WING_STORE_KEEPER role exist?
PRINT ''
PRINT '1️⃣  CHECKING IF WING_STORE_KEEPER ROLE EXISTS:'
SELECT TOP 1 
  role_id,
  role_name,
  display_name,
  scope_type,
  is_active
FROM ims_roles 
WHERE role_name = 'WING_STORE_KEEPER'

-- Check 2: Does the permission exist?
PRINT ''
PRINT '2️⃣  CHECKING IF inventory.manage_store_keeper PERMISSION EXISTS:'
SELECT TOP 1 
  id as permission_id,
  permission_key,
  module_name,
  action_name,
  is_active
FROM ims_permissions 
WHERE permission_key = 'inventory.manage_store_keeper'

-- Check 3: Is the permission assigned to the role?
PRINT ''
PRINT '3️⃣  CHECKING IF PERMISSION IS ASSIGNED TO ROLE:'
SELECT 
  rp.role_id,
  r.role_name,
  rp.permission_id,
  p.permission_key,
  rp.is_active as assignment_active,
  p.is_active as permission_active
FROM ims_role_permissions rp
JOIN ims_roles r ON rp.role_id = r.id
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE r.role_name = 'WING_STORE_KEEPER' AND p.permission_key = 'inventory.manage_store_keeper'

-- Check 4: Does user 3740506012171 have the WING_STORE_KEEPER role?
PRINT ''
PRINT '4️⃣  CHECKING IF USER 3740506012171 HAS WING_STORE_KEEPER ROLE:'
SELECT 
  ur.user_id,
  u.UserName,
  ur.role_id,
  r.role_name,
  ur.is_active as assignment_active,
  r.is_active as role_active
FROM ims_user_roles ur
JOIN AspNetUsers u ON ur.user_id = u.Id
JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.user_id = '3740506012171' AND r.role_name = 'WING_STORE_KEEPER'

-- Check 5: What are ALL the user's IMS roles?
PRINT ''
PRINT '5️⃣  USER 3740506012171 - ALL IMS ROLES:'
SELECT 
  ur.user_id,
  u.UserName,
  ur.role_id,
  r.role_name,
  r.display_name,
  r.scope_type,
  ur.is_active as assignment_active,
  r.is_active as role_active
FROM ims_user_roles ur
JOIN AspNetUsers u ON ur.user_id = u.Id
JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.user_id = '3740506012171'
ORDER BY r.role_name

-- Check 6: Test the vw_ims_user_permissions view for this user
PRINT ''
PRINT '6️⃣  USER 3740506012171 - PERMISSIONS FROM vw_ims_user_permissions VIEW:'
SELECT DISTINCT
  user_id,
  permission_key,
  module_name,
  action_name
FROM vw_ims_user_permissions
WHERE user_id = '3740506012171'
ORDER BY permission_key

-- Check 7: Check what fn_GetUserRoles returns for this user
PRINT ''
PRINT '7️⃣  USER 3740506012171 - ROLES FROM fn_GetUserRoles:'
SELECT * FROM dbo.fn_GetUserRoles('3740506012171')
