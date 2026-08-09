-- Find CUSTOM_WING_STORE_KEEPER role and user assignments

PRINT '======================================================'
PRINT 'CUSTOM_WING_STORE_KEEPER Role Diagnostic'
PRINT '======================================================'

-- Check 1: Does the CUSTOM_WING_STORE_KEEPER role exist?
PRINT ''
PRINT '1️⃣  CHECKING FOR CUSTOM_WING_STORE_KEEPER ROLE:'
SELECT 
  id as role_id,
  role_name,
  display_name,
  scope_type,
  is_active
FROM ims_roles 
WHERE role_name LIKE '%CUSTOM_WING_STORE_KEEPER%' OR role_name LIKE '%STORE_KEEPER%'
ORDER BY role_name

-- Check 2: Who has the CUSTOM_WING_STORE_KEEPER role?
PRINT ''
PRINT '2️⃣  WHO HAS CUSTOM_WING_STORE_KEEPER ROLE:'
SELECT 
  ur.user_id,
  u.UserName,
  u.FullName,
  u.Email,
  r.role_name,
  r.display_name,
  ur.is_active
FROM ims_user_roles ur
JOIN AspNetUsers u ON ur.user_id = u.Id
JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name LIKE '%CUSTOM_WING_STORE_KEEPER%'
ORDER BY u.UserName

-- Check 3: What permissions does CUSTOM_WING_STORE_KEEPER role have?
PRINT ''
PRINT '3️⃣  PERMISSIONS FOR CUSTOM_WING_STORE_KEEPER ROLE:'
SELECT 
  r.role_name,
  p.permission_key,
  p.module_name,
  p.action_name,
  p.description,
  p.is_active
FROM ims_role_permissions rp
JOIN ims_roles r ON rp.role_id = r.id
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE r.role_name LIKE '%CUSTOM_WING_STORE_KEEPER%'
ORDER BY p.permission_key

-- Check 4: Check user 3740506012171's roles
PRINT ''
PRINT '4️⃣  USER 3740506012171 ROLES:'
SELECT 
  ur.user_id,
  u.UserName,
  r.role_name,
  r.display_name,
  ur.is_active
FROM ims_user_roles ur
JOIN AspNetUsers u ON ur.user_id = u.Id
JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.user_id = '3740506012171'
ORDER BY r.role_name

-- Check 5: Check user 3740506012171's permissions
PRINT ''
PRINT '5️⃣  USER 3740506012171 PERMISSIONS (from vw_ims_user_permissions):'
SELECT DISTINCT
  permission_key,
  module_name,
  action_name,
  role_name
FROM vw_ims_user_permissions
WHERE user_id = '3740506012171'
ORDER BY permission_key

-- Check 6: Check if inventory.manage_store_keeper exists
PRINT ''
PRINT '6️⃣  CHECKING FOR inventory.manage_store_keeper PERMISSION:'
SELECT 
  id,
  permission_key,
  module_name,
  action_name,
  is_active
FROM ims_permissions
WHERE permission_key = 'inventory.manage_store_keeper'

-- Check 7: All STORE_KEEPER related permissions in system
PRINT ''
PRINT '7️⃣  ALL STORE_KEEPER RELATED PERMISSIONS IN SYSTEM:'
SELECT 
  id,
  permission_key,
  module_name,
  action_name,
  is_active
FROM ims_permissions
WHERE permission_key LIKE '%store%keeper%' OR permission_key LIKE '%store%'
ORDER BY permission_key
