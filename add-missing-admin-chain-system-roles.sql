-- =====================================================
-- ADD MISSING ADMIN CHAIN SYSTEM ROLES
-- Only inserts AD Admin-II, DD Admin, and DG Admin as system roles.
-- Does not modify, merge, or delete any existing roles/users.
-- =====================================================

USE InventoryManagementDB;
GO

SET NOCOUNT ON;

PRINT 'Adding missing admin chain system roles...';
GO

INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active)
SELECT NEWID(), role_name, display_name, description, 1, 1
FROM (VALUES
    ('AD Admin-II', 'AD Admin-II', 'Workflow approval role - AD Admin-II'),
    ('DD Admin',    'DD Admin',    'Workflow approval role - DD Admin'),
    ('DG Admin',    'DG Admin',    'Workflow approval role - DG Admin')
) AS v(role_name, display_name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM ims_roles r WHERE r.role_name = v.role_name
);

PRINT CAST(@@ROWCOUNT AS NVARCHAR) + ' system roles inserted (skipped existing).';
GO

PRINT 'Current admin chain roles:';
SELECT role_name, display_name, is_system_role, is_active
FROM ims_roles
WHERE role_name IN ('AD Admin-I', 'AD Admin-II', 'DD Admin', 'DG Admin')
ORDER BY role_name;
GO
