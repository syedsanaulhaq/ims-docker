-- Add generic permissions that the frontend expects
-- These will be mapped to the appropriate granular permissions based on role

USE InventoryManagementDB;
GO

PRINT '🔧 Adding Generic Frontend Permissions...';
PRINT '';

-- Generic inventory permissions (will be granted based on view_all/wing/personal)
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.view', 'Inventory', 'View', 'View inventory (generic)'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.view');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.manage', 'Inventory', 'Manage', 'Manage inventory (generic)'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.manage');

-- Generic procurement permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'procurement.view', 'Procurement', 'View', 'View procurement data'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'procurement.view');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'procurement.manage', 'Procurement', 'Manage', 'Manage procurement processes'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'procurement.manage');

-- Generic issuance permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'issuance.request', 'Issuance', 'Request', 'Request item issuance'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'issuance.request');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'issuance.process', 'Issuance', 'Process', 'Process issuance requests'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'issuance.process');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'issuance.view', 'Issuance', 'View', 'View issuance records'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'issuance.view');

-- Generic approval permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'approval.approve', 'Approval', 'Approve', 'Approve requests'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'approval.approve');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'approval.manage', 'Approval', 'Manage', 'Manage approval workflows'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'approval.manage');

-- Generic reports permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'reports.view', 'Reports', 'View', 'View reports'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'reports.view');

-- Generic role management permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'roles.manage', 'Roles', 'Manage', 'Manage roles and permissions'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'roles.manage');

PRINT '✅ Added generic permissions';
PRINT '';

-- =====================================================
-- ASSIGN GENERIC PERMISSIONS TO ROLES
-- =====================================================
PRINT '🔗 Assigning Generic Permissions to Roles...';
GO

-- Super Admin: All generic permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'IMS_SUPER_ADMIN'
  AND p.permission_key IN (
      'inventory.view', 'inventory.manage',
      'procurement.view', 'procurement.manage',
      'issuance.request', 'issuance.process', 'issuance.view',
      'approval.approve', 'approval.manage',
      'reports.view', 'roles.manage'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Super Admin: Generic permissions assigned';

-- IMS Admin
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'IMS_ADMIN'
  AND p.permission_key IN (
      'inventory.view', 'inventory.manage',
      'procurement.view', 'procurement.manage',
      'issuance.view', 'issuance.process',
      'approval.approve', 'approval.manage',
      'reports.view', 'roles.manage'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ IMS Admin: Generic permissions assigned';

-- Wing Supervisor
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'WING_SUPERVISOR'
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view', 'issuance.process',
      'approval.approve',
      'reports.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Wing Supervisor: Generic permissions assigned';

-- Branch Supervisor
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'BRANCH_SUPERVISOR'
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view', 'issuance.process',
      'approval.approve',
      'reports.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Branch Supervisor: Generic permissions assigned';

-- Branch Store Keeper
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'BRANCH_STORE_KEEPER'
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view', 'issuance.process',
      'inventory.manage_store_keeper',
      'reports.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Branch Store Keeper: Generic permissions assigned';

-- General User
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'GENERAL_USER'
  AND p.permission_key IN (
      'issuance.request',
      'reports.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ General User: Generic permissions assigned';

-- Procurement Officer
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'PROCUREMENT_OFFICER'
  AND p.permission_key IN (
      'procurement.view', 'procurement.manage',
      'inventory.view',
      'reports.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Procurement Officer: Generic permissions assigned';

-- Auditor
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'AUDITOR'
  AND p.permission_key IN (
      'inventory.view',
      'procurement.view',
      'issuance.view',
      'reports.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Auditor: Generic permissions assigned';

GO

PRINT '';
PRINT '✅ Generic permissions setup complete!';
PRINT '💡 Users will see the sidebar menu items based on these permissions.';
PRINT '';

-- Show summary
SELECT 
    r.role_name,
    r.display_name,
    COUNT(rp.permission_id) as permission_count
FROM ims_roles r
LEFT JOIN ims_role_permissions rp ON r.id = rp.role_id
GROUP BY r.role_name, r.display_name
ORDER BY 
    CASE r.role_name
        WHEN 'IMS_SUPER_ADMIN' THEN 1
        WHEN 'IMS_ADMIN' THEN 2
        WHEN 'WING_SUPERVISOR' THEN 3
        WHEN 'BRANCH_SUPERVISOR' THEN 4
        WHEN 'WING_STORE_KEEPER' THEN 5
        WHEN 'BRANCH_STORE_KEEPER' THEN 6
        WHEN 'GENERAL_USER' THEN 7
        WHEN 'PROCUREMENT_OFFICER' THEN 8
        WHEN 'AUDITOR' THEN 9
        ELSE 10
    END;
