-- ============================================================================
-- Diagnostic Script: Check User Roles for CNIC 1111111111111
-- ============================================================================
-- Run this on production InventoryManagementDB

PRINT '=== STEP 1: Find user by CNIC ===';
SELECT 
  Id AS IMS_UserID,
  UserName,
  FullName,
  CNIC,
  Email,
  Role as DS_Role,
  ISACT
FROM AspNetUsers 
WHERE CNIC = '1111111111111';
|
SELECT @UserId = Id FROM AspNetUsers WHERE CNIC = '1111111111111';

IF @UserId IS NOT NULL
BEGIN
  SELECT 
    iur.id as role_assignment_id,
    iur.user_id,
    ir.id as role_id,
    ir.role_name,
    ir.display_name,
    iur.scope_type,
    iur.is_active,
    iur.assigned_at,
    (SELECT COUNT(*) FROM ims_role_permissions WHERE role_id = ir.id) as permission_count
  FROM ims_user_roles iur
  JOIN ims_roles ir ON iur.role_id = ir.id
  WHERE iur.user_id = @UserId;
END
ELSE
BEGIN
  PRINT 'User with CNIC 1111111111111 not found!';
END;

PRINT '';
PRINT '=== STEP 3: Check if IMS_SUPER_ADMIN role exists ===';
SELECT 
  id,
  role_name,
  display_name,
  (SELECT COUNT(*) FROM ims_user_roles WHERE role_id = ims_roles.id) as user_count
FROM ims_roles 
WHERE role_name IN ('IMS_SUPER_ADMIN', 'GENERAL_USER');

PRINT '';
PRINT '=== STEP 4: Count all active users by role ===';
SELECT 
  ir.role_name,
  ir.display_name,
  COUNT(iur.user_id) as active_user_count
FROM ims_roles ir
LEFT JOIN ims_user_roles iur ON ir.id = iur.role_id AND iur.is_active = 1
GROUP BY ir.id, ir.role_name, ir.display_name
ORDER BY active_user_count DESC;
