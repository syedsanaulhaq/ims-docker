-- =====================================================
-- INITIAL ROLE ASSIGNMENT FOR EXISTING USERS
-- Auto-assign roles based on current system state
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '🎯 Assigning roles to existing users...';
PRINT '========================================';
GO

-- =====================================================
-- 1. Assign IMS_SUPER_ADMIN to current administrators
-- =====================================================
PRINT '';
PRINT '👑 Assigning Super Admin roles...';

-- Assign Super Admin to Syed Sana ul Haq Fazli (you)
INSERT INTO ims_user_roles (user_id, role_id, scope_type, assigned_by, notes)
SELECT 
    u.Id,
    r.id,
    'Global',
    'INITIAL_SETUP',
    'Initial Super Admin - System Creator'
FROM AspNetUsers u
CROSS JOIN ims_roles r
WHERE u.CNIC = '1730115698727'
  AND r.role_name = 'IMS_SUPER_ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM ims_user_roles ur 
      WHERE ur.user_id = u.Id AND ur.role_id = r.id
  );

PRINT '✅ Assigned Super Admin to: Syed Sana ul Haq Fazli';

-- Assign Super Admin to Test Account (for testing)
INSERT INTO ims_user_roles (user_id, role_id, scope_type, assigned_by, notes)
SELECT 
    u.Id,
    r.id,
    'Global',
    'INITIAL_SETUP',
    'Test Super Admin Account'
FROM AspNetUsers u
CROSS JOIN ims_roles r
WHERE u.CNIC = '1111111111111'
  AND r.role_name = 'IMS_SUPER_ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM ims_user_roles ur 
      WHERE ur.user_id = u.Id AND ur.role_id = r.id
  );

PRINT '✅ Assigned Super Admin to: Test Account';

GO

-- =====================================================
-- 2. Assign GENERAL_USER to ALL existing users (default)
-- =====================================================
PRINT '';
PRINT '👥 Auto-assigning General User role to all users...';

INSERT INTO ims_user_roles (user_id, role_id, scope_type, assigned_by, notes)
SELECT 
    u.Id,
    r.id,
    'Global',
    'AUTO_ASSIGN',
    'Default role for all users'
FROM AspNetUsers u
CROSS JOIN ims_roles r
WHERE r.role_name = 'GENERAL_USER'
  AND u.ISACT = 1  -- Only active users
  AND NOT EXISTS (
      SELECT 1 FROM ims_user_roles ur 
      WHERE ur.user_id = u.Id AND ur.role_id = r.id
  );

DECLARE @GeneralUserCount INT = @@ROWCOUNT;
PRINT '✅ Assigned General User role to ' + CAST(@GeneralUserCount AS NVARCHAR) + ' users';

GO

-- =====================================================
-- 3. Identify and assign IMS_ADMIN to key administrators
-- =====================================================
PRINT '';
PRINT '🔑 Assigning IMS Admin roles to administrators...';

-- Assign IMS Admin to users with Administrator role in AspNetRoles
INSERT INTO ims_user_roles (user_id, role_id, scope_type, assigned_by, notes)
SELECT 
    u.Id,
    ims_r.id,
    'Global',
    'INITIAL_SETUP',
    'Migrated from AspNetRoles: ' + ar.Name
FROM AspNetUsers u
INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
INNER JOIN AspNetRoles ar ON ur.RoleId = ar.Id
CROSS JOIN ims_roles ims_r
WHERE ar.Name IN ('Administrator', 'DS Admin', 'SAAdminHR')
  AND ims_r.role_name = 'IMS_ADMIN'
  AND u.ISACT = 1
  AND NOT EXISTS (
      SELECT 1 FROM ims_user_roles iur 
      WHERE iur.user_id = u.Id 
        AND iur.role_id = ims_r.id
        AND iur.scope_type = 'Global'
  );

DECLARE @AdminCount INT = @@ROWCOUNT;
PRINT '✅ Assigned IMS Admin to ' + CAST(@AdminCount AS NVARCHAR) + ' administrators';

GO

-- =====================================================
-- 4. Assign WING_SUPERVISOR to wing heads
-- =====================================================
PRINT '';
PRINT '📋 Assigning Wing Supervisor roles...';

-- Assign Wing Supervisor to users with HoD, Manager, or Admin roles for their specific wings
INSERT INTO ims_user_roles (user_id, role_id, scope_type, scope_wing_id, assigned_by, notes)
SELECT 
    u.Id,
    ims_r.id,
    'Wing',
    u.intWingID,
    'INITIAL_SETUP',
    'Wing supervisor for: ' + ar.Name
FROM AspNetUsers u
INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
INNER JOIN AspNetRoles ar ON ur.RoleId = ar.Id
CROSS JOIN ims_roles ims_r
WHERE (
    ar.Name LIKE '%HoD%' 
    OR ar.Name LIKE '%Admin%'
    OR ar.Name LIKE '%Manager%'
    OR ar.Name LIKE 'DG%'
    OR ar.Name LIKE 'ADG%'
  )
  AND u.intWingID IS NOT NULL
  AND u.intWingID > 0
  AND ims_r.role_name = 'WING_SUPERVISOR'
  AND u.ISACT = 1
  AND NOT EXISTS (
      SELECT 1 FROM ims_user_roles iur 
      WHERE iur.user_id = u.Id 
        AND iur.role_id = ims_r.id
        AND iur.scope_wing_id = u.intWingID
  );

DECLARE @SupervisorCount INT = @@ROWCOUNT;
PRINT '✅ Assigned Wing Supervisor to ' + CAST(@SupervisorCount AS NVARCHAR) + ' users';

GO

-- =====================================================
-- 5. Log all assignments in audit log
-- =====================================================
PRINT '';
PRINT '📝 Creating audit trail...';

INSERT INTO ims_role_audit_log (
    user_id, 
    role_id, 
    action, 
    scope_type, 
    scope_wing_id, 
    performed_by, 
    notes
)
SELECT 
    ur.user_id,
    ur.role_id,
    'ASSIGNED',
    ur.scope_type,
    ur.scope_wing_id,
    ur.assigned_by,
    'Initial system setup: ' + ur.notes
FROM ims_user_roles ur
WHERE ur.assigned_by IN ('INITIAL_SETUP', 'AUTO_ASSIGN')
  AND NOT EXISTS (
      SELECT 1 FROM ims_role_audit_log al
      WHERE al.user_id = ur.user_id 
        AND al.role_id = ur.role_id
        AND al.action = 'ASSIGNED'
  );

PRINT '✅ Audit log created';

GO

-- =====================================================
-- SUMMARY REPORT
-- =====================================================
PRINT '';
PRINT '═══════════════════════════════════════════════';
PRINT '✅ ROLE ASSIGNMENT COMPLETE!';
PRINT '═══════════════════════════════════════════════';
PRINT '';

-- Count assignments by role
SELECT 
    r.display_name as Role,
    COUNT(DISTINCT ur.user_id) as UserCount,
    COUNT(CASE WHEN ur.scope_type = 'Global' THEN 1 END) as Global,
    COUNT(CASE WHEN ur.scope_type = 'Wing' THEN 1 END) as Wing,
    COUNT(CASE WHEN ur.scope_type = 'Office' THEN 1 END) as Office
FROM ims_user_roles ur
INNER JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.is_active = 1
GROUP BY r.display_name, r.role_name
ORDER BY 
    CASE r.role_name
        WHEN 'IMS_SUPER_ADMIN' THEN 1
        WHEN 'IMS_ADMIN' THEN 2
        WHEN 'WING_SUPERVISOR' THEN 3
        WHEN 'GENERAL_USER' THEN 4
        ELSE 5
    END;

PRINT '';
PRINT '👑 Super Admins:';
SELECT 
    u.FullName,
    u.Email,
    ur.notes
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name = 'IMS_SUPER_ADMIN'
  AND ur.is_active = 1;

PRINT '';
PRINT '🔑 IMS Administrators (Sample - Top 10):';
SELECT TOP 10
    u.FullName,
    u.Email,
    ur.scope_type
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name = 'IMS_ADMIN'
  AND ur.is_active = 1;

PRINT '';
PRINT '📋 Wing Supervisors (Sample - Top 10):';
SELECT TOP 10
    u.FullName,
    u.Email,
    ur.scope_wing_id as WingID
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name = 'WING_SUPERVISOR'
  AND ur.is_active = 1
ORDER BY ur.scope_wing_id;

PRINT '';
PRINT '🎯 Next Steps:';
PRINT '  1. Review assigned roles';
PRINT '  2. Adjust wing supervisors as needed';
PRINT '  3. Update backend APIs to check ims_user_roles';
PRINT '  4. Create role management UI';
PRINT '  5. Test permission system';
PRINT '';
