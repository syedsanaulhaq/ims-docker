-- List all roles and permissions in the system to understand the structure

PRINT '======================================================'
PRINT 'SYSTEM AUDIT: All Roles & Permissions'
PRINT '======================================================'

PRINT ''
PRINT '📋 ALL ROLES IN SYSTEM:'
SELECT 
  id,
  role_name,
  display_name,
  scope_type,
  is_active
FROM ims_roles
ORDER BY role_name

PRINT ''
PRINT '🔐 ALL PERMISSIONS IN SYSTEM:'
SELECT 
  id,
  permission_key,
  module_name,
  action_name,
  is_active
FROM ims_permissions
ORDER BY module_name, permission_key

PRINT ''
PRINT '🔗 ALL ROLE-PERMISSION ASSIGNMENTS:'
SELECT 
  r.role_name,
  COUNT(*) as permission_count,
  STRING_AGG(p.permission_key, ', ') as permissions
FROM ims_role_permissions rp
JOIN ims_roles r ON rp.role_id = r.id
JOIN ims_permissions p ON rp.permission_id = p.id
GROUP BY r.role_name
ORDER BY r.role_name

PRINT ''
PRINT '👤 USER 3740506012171 DETAILS:'
SELECT * FROM AspNetUsers WHERE Id = '3740506012171'

PRINT ''
PRINT '👥 USER 3740506012171 ROLES:'
SELECT 
  r.id as role_id,
  r.role_name,
  r.display_name,
  ur.is_active,
  ur.scope_type,
  ur.scope_wing_id
FROM ims_user_roles ur
JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.user_id = '3740506012171'
