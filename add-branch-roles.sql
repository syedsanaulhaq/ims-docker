-- Add Branch Supervisor and Branch Store Keeper system roles
-- Run this on existing IMS databases after deploying branch inventory features.

IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'BRANCH_SUPERVISOR')
BEGIN
  INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active, created_at)
  VALUES (
    NEWID(),
    'BRANCH_SUPERVISOR',
    'Branch Supervisor',
    'Manage branch-level inventory and approve branch requests. Scope limited to assigned branch(es).',
    1,
    1,
    GETDATE()
  );
  PRINT '✅ Created BRANCH_SUPERVISOR role';
END
ELSE
BEGIN
  PRINT '⚠️ BRANCH_SUPERVISOR role already exists';
END

IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'BRANCH_STORE_KEEPER')
BEGIN
  INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active, created_at)
  VALUES (
    NEWID(),
    'BRANCH_STORE_KEEPER',
    'Branch Store Keeper',
    'Process approved stock issuance for assigned branch inventory. Scope limited to assigned branch(es).',
    1,
    1,
    GETDATE()
  );
  PRINT '✅ Created BRANCH_STORE_KEEPER role';
END
ELSE
BEGIN
  PRINT '⚠️ BRANCH_STORE_KEEPER role already exists';
END

IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper')
BEGIN
  INSERT INTO ims_permissions (id, permission_key, module_name, action_name, description, created_at)
  VALUES (NEWID(), 'inventory.manage_store_keeper', 'Inventory', 'Manage Store', 'Manage store keeper verification and issuance work', GETDATE());
END

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

PRINT '✅ Branch roles and permissions setup complete';