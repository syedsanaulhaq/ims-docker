-- =====================================================
-- IMS INTERNAL ROLE & PERMISSION SYSTEM
-- Fully independent from AspNetRoles
-- Created: November 28, 2025
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '🚀 Creating IMS Internal Role System...';
PRINT '========================================';
GO

-- =====================================================
-- 1. IMS ROLES TABLE
-- =====================================================
IF OBJECT_ID('dbo.ims_roles', 'U') IS NULL
BEGIN
    CREATE TABLE ims_roles (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        role_name NVARCHAR(100) NOT NULL UNIQUE,
        display_name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        is_system_role BIT DEFAULT 0, -- Cannot be deleted/modified if true
        is_active BIT DEFAULT 1,
        created_by NVARCHAR(450),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_by NVARCHAR(450),
        updated_at DATETIME2,
        
        CONSTRAINT CHK_ims_roles_name CHECK (LEN(role_name) > 0)
    );
    
    CREATE INDEX IX_ims_roles_name ON ims_roles(role_name);
    CREATE INDEX IX_ims_roles_active ON ims_roles(is_active);
    
    PRINT '✅ Created ims_roles table';
END
ELSE
    PRINT '⚠️  ims_roles table already exists';
GO

-- =====================================================
-- 2. IMS PERMISSIONS TABLE (Granular Access Control)
-- =====================================================
IF OBJECT_ID('dbo.ims_permissions', 'U') IS NULL
BEGIN
    CREATE TABLE ims_permissions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        permission_key NVARCHAR(100) NOT NULL UNIQUE,
        module_name NVARCHAR(50) NOT NULL,
        action_name NVARCHAR(50) NOT NULL,
        description NVARCHAR(500),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT CHK_ims_permissions_key CHECK (permission_key LIKE '%.%')
    );
    
    CREATE INDEX IX_ims_permissions_module ON ims_permissions(module_name);
    CREATE INDEX IX_ims_permissions_key ON ims_permissions(permission_key);
    
    PRINT '✅ Created ims_permissions table';
END
ELSE
    PRINT '⚠️  ims_permissions table already exists';
GO

-- =====================================================
-- 3. ROLE-PERMISSION MAPPING
-- =====================================================
IF OBJECT_ID('dbo.ims_role_permissions', 'U') IS NULL
BEGIN
    CREATE TABLE ims_role_permissions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        role_id UNIQUEIDENTIFIER NOT NULL,
        permission_id UNIQUEIDENTIFIER NOT NULL,
        granted_by NVARCHAR(450),
        granted_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_role_permissions_role FOREIGN KEY (role_id) 
            REFERENCES ims_roles(id) ON DELETE CASCADE,
        CONSTRAINT FK_role_permissions_permission FOREIGN KEY (permission_id) 
            REFERENCES ims_permissions(id) ON DELETE CASCADE,
        CONSTRAINT UQ_role_permission UNIQUE (role_id, permission_id)
    );
    
    CREATE INDEX IX_role_permissions_role ON ims_role_permissions(role_id);
    CREATE INDEX IX_role_permissions_permission ON ims_role_permissions(permission_id);
    
    PRINT '✅ Created ims_role_permissions table';
END
ELSE
    PRINT '⚠️  ims_role_permissions table already exists';
GO

-- =====================================================
-- 4. USER-ROLE MAPPING (with Scope)
-- =====================================================
IF OBJECT_ID('dbo.ims_user_roles', 'U') IS NULL
BEGIN
    CREATE TABLE ims_user_roles (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(450) NOT NULL,
        role_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Scope: Global, Office, Wing, or Branch level
        scope_type NVARCHAR(20) NOT NULL DEFAULT 'Global',
        scope_office_id INT NULL,
        scope_wing_id INT NULL,
        scope_branch_id INT NULL,
        
        assigned_by NVARCHAR(450),
        assigned_at DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1,
        notes NVARCHAR(500),
        
        CONSTRAINT FK_ims_user_roles_user FOREIGN KEY (user_id) 
            REFERENCES AspNetUsers(Id),
        CONSTRAINT FK_ims_user_roles_role FOREIGN KEY (role_id) 
            REFERENCES ims_roles(id),
        CONSTRAINT CHK_scope_type CHECK (scope_type IN ('Global', 'Office', 'Wing', 'Branch')),
        
        -- User can have same role for different wings
        CONSTRAINT UQ_ims_user_role_scope UNIQUE (user_id, role_id, scope_type, scope_office_id, scope_wing_id, scope_branch_id)
    );
    
    CREATE INDEX IX_ims_user_roles_user ON ims_user_roles(user_id);
    CREATE INDEX IX_ims_user_roles_role ON ims_user_roles(role_id);
    CREATE INDEX IX_ims_user_roles_active ON ims_user_roles(is_active);
    CREATE INDEX IX_ims_user_roles_scope_wing ON ims_user_roles(scope_wing_id);
    
    PRINT '✅ Created ims_user_roles table';
END
ELSE
    PRINT '⚠️  ims_user_roles table already exists';
GO

-- =====================================================
-- 5. ROLE CHANGE AUDIT LOG
-- =====================================================
IF OBJECT_ID('dbo.ims_role_audit_log', 'U') IS NULL
BEGIN
    CREATE TABLE ims_role_audit_log (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(450) NOT NULL,
        role_id UNIQUEIDENTIFIER NOT NULL,
        action NVARCHAR(20) NOT NULL, -- 'ASSIGNED', 'REVOKED', 'MODIFIED'
        scope_type NVARCHAR(20),
        scope_office_id INT,
        scope_wing_id INT,
        scope_branch_id INT,
        performed_by NVARCHAR(450) NOT NULL,
        performed_at DATETIME2 DEFAULT GETDATE(),
        notes NVARCHAR(MAX),
        
        CONSTRAINT CHK_audit_action CHECK (action IN ('ASSIGNED', 'REVOKED', 'MODIFIED'))
    );
    
    CREATE INDEX IX_role_audit_user ON ims_role_audit_log(user_id);
    CREATE INDEX IX_role_audit_date ON ims_role_audit_log(performed_at);
    
    PRINT '✅ Created ims_role_audit_log table';
END
ELSE
    PRINT '⚠️  ims_role_audit_log table already exists';
GO

-- =====================================================
-- SEED DATA: SYSTEM ROLES
-- =====================================================
PRINT '';
PRINT '🌱 Seeding System Roles...';
GO

-- Define role IDs as constants
DECLARE @SuperAdminRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @SupervisorRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @BranchSupervisorRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @BranchStoreKeeperRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @UserRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @ProcurementRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @AuditorRoleId UNIQUEIDENTIFIER = NEWID();

-- 1. IMS Super Admin
IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'IMS_SUPER_ADMIN')
BEGIN
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
    VALUES (
        @SuperAdminRoleId,
        'IMS_SUPER_ADMIN',
        'IMS Super Administrator',
        'Full system access. Can create/modify roles, manage users, and access all features. Only role that can create new roles.',
        1
    );
    PRINT '✅ Created IMS Super Admin role';
END

-- 2. IMS Administrator
IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'IMS_ADMIN')
BEGIN
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
    VALUES (
        @AdminRoleId,
        'IMS_ADMIN',
        'IMS Administrator',
        'Manage inventory system, approve high-level requests, access all stock levels, generate reports. Global scope.',
        1
    );
    PRINT '✅ Created IMS Administrator role';
END

-- 3. Wing Supervisor
IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'WING_SUPERVISOR')
BEGIN
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
    VALUES (
        @SupervisorRoleId,
        'WING_SUPERVISOR',
        'Wing Supervisor',
        'Manage wing-level inventory, approve wing requests. Scope limited to assigned wing(s).',
        1
    );
    PRINT '✅ Created Wing Supervisor role';
END

    -- 4. Branch Supervisor
    IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'BRANCH_SUPERVISOR')
    BEGIN
        INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
        VALUES (
            @BranchSupervisorRoleId,
            'BRANCH_SUPERVISOR',
            'Branch Supervisor',
            'Manage branch-level inventory and approve branch requests. Scope limited to assigned branch(es).',
            1
        );
        PRINT '✅ Created Branch Supervisor role';
    END

    -- 5. Branch Store Keeper
    IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'BRANCH_STORE_KEEPER')
    BEGIN
        INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
        VALUES (
            @BranchStoreKeeperRoleId,
            'BRANCH_STORE_KEEPER',
            'Branch Store Keeper',
            'Process approved stock issuance for assigned branch inventory. Scope limited to assigned branch(es).',
            1
        );
        PRINT '✅ Created Branch Store Keeper role';
    END

    -- 6. General User (Default)
IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'GENERAL_USER')
BEGIN
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
    VALUES (
        @UserRoleId,
        'GENERAL_USER',
        'General User',
        'Create personal stock requests, view own inventory, track request status. Default role for all users.',
        1
    );
    PRINT '✅ Created General User role';
END

-- 7. Procurement Officer
IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'PROCUREMENT_OFFICER')
BEGIN
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
    VALUES (
        @ProcurementRoleId,
        'PROCUREMENT_OFFICER',
        'Procurement Officer',
        'Manage tenders, acquisitions, vendor relations. Add stock to admin store.',
        1
    );
    PRINT '✅ Created Procurement Officer role';
END

-- 8. Auditor (Read-Only)
IF NOT EXISTS (SELECT 1 FROM ims_roles WHERE role_name = 'AUDITOR')
BEGIN
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role)
    VALUES (
        @AuditorRoleId,
        'AUDITOR',
        'Auditor',
        'View-only access to all inventory, transactions, and reports. Cannot modify anything.',
        1
    );
    PRINT '✅ Created Auditor role';
END

GO

-- =====================================================
-- SEED DATA: PERMISSIONS
-- =====================================================
PRINT '';
PRINT '🔑 Seeding Permissions...';
GO

-- Inventory Module Permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.view_all', 'Inventory', 'View All', 'View all inventory across all locations'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.view_all');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.view_wing', 'Inventory', 'View Wing', 'View inventory for assigned wing only'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.view_wing');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.view_personal', 'Inventory', 'View Personal', 'View own inventory only'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.view_personal');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.edit_all', 'Inventory', 'Edit All', 'Edit any inventory item'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.edit_all');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'inventory.edit_wing', 'Inventory', 'Edit Wing', 'Edit wing inventory only'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.edit_wing');

-- Stock Request Permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.create', 'Stock Request', 'Create', 'Create stock issuance request'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.create');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.approve_supervisor', 'Stock Request', 'Approve as Supervisor', 'Approve wing-level stock requests'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.approve_supervisor');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.approve_admin', 'Stock Request', 'Approve as Admin', 'Approve admin-level stock requests'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.approve_admin');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.forward', 'Stock Request', 'Forward', 'Forward request to higher authority'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.forward');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.reject', 'Stock Request', 'Reject', 'Reject stock requests'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.reject');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.view_all', 'Stock Request', 'View All', 'View all requests system-wide'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.view_all');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.view_wing', 'Stock Request', 'View Wing', 'View requests for assigned wing'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.view_wing');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_request.view_own', 'Stock Request', 'View Own', 'View own requests only'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_request.view_own');

-- Stock Transfer Permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_transfer.admin_to_wing', 'Stock Transfer', 'Admin to Wing', 'Transfer from admin store to wing store'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_transfer.admin_to_wing');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'stock_transfer.wing_to_personal', 'Stock Transfer', 'Wing to Personal', 'Transfer from wing store to personal inventory'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'stock_transfer.wing_to_personal');

-- Procurement Permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'tender.create', 'Tender', 'Create', 'Create and manage tenders'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'tender.create');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'tender.approve', 'Tender', 'Approve', 'Approve tenders and acquisitions'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'tender.approve');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'vendor.manage', 'Vendor', 'Manage', 'Create and manage vendor information'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'vendor.manage');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'acquisition.create', 'Acquisition', 'Create', 'Add stock through acquisitions'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'acquisition.create');

-- Report Permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'reports.view_all', 'Reports', 'View All', 'Generate and view all reports'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'reports.view_all');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'reports.view_wing', 'Reports', 'View Wing', 'View reports for assigned wing'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'reports.view_wing');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'reports.view_own', 'Reports', 'View Own', 'View own activity reports'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'reports.view_own');

-- Settings & Management Permissions
INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'roles.manage', 'Roles', 'Manage', 'Create, edit, and delete roles (Super Admin only)'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'roles.manage');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'users.assign_roles', 'Users', 'Assign Roles', 'Assign roles to users'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'users.assign_roles');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'users.view_all', 'Users', 'View All', 'View all user information'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'users.view_all');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'categories.manage', 'Categories', 'Manage', 'Create and manage item categories'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'categories.manage');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'items.manage', 'Items', 'Manage', 'Create and manage item masters'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'items.manage');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'settings.view', 'Settings', 'View', 'View system settings'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'settings.view');

INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
SELECT 'settings.edit', 'Settings', 'Edit', 'Modify system settings'
WHERE NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'settings.edit');

PRINT '✅ Seeded 30+ permissions';
GO

-- =====================================================
-- ASSIGN PERMISSIONS TO ROLES
-- =====================================================
PRINT '';
PRINT '🔗 Assigning Permissions to Roles...';
GO

-- Super Admin: ALL PERMISSIONS
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT 
    r.id,
    p.id,
    'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'IMS_SUPER_ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM ims_role_permissions rp 
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
PRINT '✅ Super Admin: All permissions assigned';

-- IMS Admin Permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'IMS_ADMIN'
  AND p.permission_key IN (
      'inventory.view_all', 'inventory.edit_all',
      'stock_request.view_all', 'stock_request.approve_admin', 'stock_request.reject',
      'stock_transfer.admin_to_wing', 'stock_transfer.wing_to_personal',
      'tender.approve', 'vendor.manage', 'acquisition.create',
      'reports.view_all', 'users.view_all', 'users.assign_roles',
      'categories.manage', 'items.manage', 'settings.view', 'settings.edit'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ IMS Admin: Permissions assigned';

-- Wing Supervisor Permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'WING_SUPERVISOR'
  AND p.permission_key IN (
      'inventory.view_wing', 'inventory.edit_wing',
    'stock_request.view_wing', 'stock_request.approve_supervisor',
      'stock_request.forward', 'stock_request.reject',
      'stock_transfer.wing_to_personal',
      'reports.view_wing'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Wing Supervisor: Permissions assigned';

-- Branch Supervisor Permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'BRANCH_SUPERVISOR'
    AND p.permission_key IN (
            'inventory.view_wing', 'inventory.edit_wing',
            'stock_request.view_wing', 'stock_request.approve_supervisor',
            'stock_request.forward', 'stock_request.reject',
            'reports.view_wing'
    )
    AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Branch Supervisor: Permissions assigned';

-- Branch Store Keeper Permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'BRANCH_STORE_KEEPER'
    AND p.permission_key IN (
            'inventory.view_wing',
            'stock_request.view_wing',
            'stock_transfer.wing_to_personal',
            'reports.view_wing'
    )
    AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Branch Store Keeper: Permissions assigned';

-- General User Permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'GENERAL_USER'
  AND p.permission_key IN (
      'inventory.view_personal',
      'stock_request.create', 'stock_request.view_own',
      'reports.view_own'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ General User: Permissions assigned';

-- Procurement Officer Permissions
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'PROCUREMENT_OFFICER'
  AND p.permission_key IN (
      'tender.create', 'tender.approve',
      'vendor.manage', 'acquisition.create',
      'inventory.view_all', 'reports.view_all'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Procurement Officer: Permissions assigned';

-- Auditor Permissions (Read-Only)
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_SETUP'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'AUDITOR'
  AND p.permission_key IN (
      'inventory.view_all',
      'stock_request.view_all',
      'reports.view_all',
      'users.view_all',
      'settings.view'
  )
  AND NOT EXISTS (SELECT 1 FROM ims_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
PRINT '✅ Auditor: Permissions assigned';

GO

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
PRINT '';
PRINT '🔧 Creating Helper Functions...';
GO

-- Check if user has permission
IF OBJECT_ID('dbo.fn_HasPermission', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_HasPermission;
GO

CREATE FUNCTION dbo.fn_HasPermission(
    @userId NVARCHAR(450),
    @permissionKey NVARCHAR(100)
)
RETURNS BIT
AS
BEGIN
    DECLARE @hasPermission BIT = 0;
    
    IF EXISTS (
        SELECT 1
        FROM ims_user_roles ur
        INNER JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
        INNER JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = @userId
          AND p.permission_key = @permissionKey
          AND ur.is_active = 1
          AND p.is_active = 1
    )
        SET @hasPermission = 1;
    
    RETURN @hasPermission;
END;
GO
PRINT '✅ Created fn_HasPermission function';

-- Get user's roles
IF OBJECT_ID('dbo.fn_GetUserRoles', 'IF') IS NOT NULL
    DROP FUNCTION dbo.fn_GetUserRoles;
GO

CREATE FUNCTION dbo.fn_GetUserRoles(@userId NVARCHAR(450))
RETURNS TABLE
AS
RETURN
(
    SELECT 
        r.id as role_id,
        r.role_name,
        r.display_name,
        ur.scope_type,
        ur.scope_office_id,
        ur.scope_wing_id,
        ur.scope_branch_id,
        ur.assigned_at,
        ur.notes
    FROM ims_user_roles ur
    INNER JOIN ims_roles r ON ur.role_id = r.id
    WHERE ur.user_id = @userId
      AND ur.is_active = 1
      AND r.is_active = 1
);
GO
PRINT '✅ Created fn_GetUserRoles function';

-- Get role permissions
IF OBJECT_ID('dbo.fn_GetRolePermissions', 'IF') IS NOT NULL
    DROP FUNCTION dbo.fn_GetRolePermissions;
GO

CREATE FUNCTION dbo.fn_GetRolePermissions(@roleId UNIQUEIDENTIFIER)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        p.permission_key,
        p.module_name,
        p.action_name,
        p.description
    FROM ims_role_permissions rp
    INNER JOIN ims_permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = @roleId
      AND p.is_active = 1
);
GO
PRINT '✅ Created fn_GetRolePermissions function';

-- Check if user is Super Admin
IF OBJECT_ID('dbo.fn_IsSuperAdmin', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_IsSuperAdmin;
GO

CREATE FUNCTION dbo.fn_IsSuperAdmin(@userId NVARCHAR(450))
RETURNS BIT
AS
BEGIN
    DECLARE @isSuperAdmin BIT = 0;
    
    IF EXISTS (
        SELECT 1
        FROM ims_user_roles ur
        INNER JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = @userId
          AND r.role_name = 'IMS_SUPER_ADMIN'
          AND ur.is_active = 1
    )
        SET @isSuperAdmin = 1;
    
    RETURN @isSuperAdmin;
END;
GO
PRINT '✅ Created fn_IsSuperAdmin function';

GO

-- =====================================================
-- CREATE VIEWS FOR EASY QUERYING
-- =====================================================
PRINT '';
PRINT '👁️  Creating Views...';
GO

-- User roles with scope details
IF OBJECT_ID('dbo.vw_ims_user_roles_detail', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ims_user_roles_detail;
GO

CREATE VIEW dbo.vw_ims_user_roles_detail AS
SELECT 
    ur.id as assignment_id,
    ur.user_id,
    u.FullName as user_name,
    u.Email as user_email,
    r.id as role_id,
    r.role_name,
    r.display_name as role_display_name,
    ur.scope_type,
    ur.scope_office_id,
    ur.scope_wing_id,
    ur.scope_branch_id,
    ur.assigned_by,
    ur.assigned_at,
    ur.is_active,
    ur.notes
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id;
GO
PRINT '✅ Created vw_ims_user_roles_detail';

-- User permissions (all permissions user has)
IF OBJECT_ID('dbo.vw_ims_user_permissions', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ims_user_permissions;
GO

CREATE VIEW dbo.vw_ims_user_permissions AS
SELECT DISTINCT
    ur.user_id,
    u.FullName as user_name,
    p.permission_key,
    p.module_name,
    p.action_name,
    p.description,
    r.role_name,
    ur.scope_type,
    ur.scope_wing_id
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id
INNER JOIN ims_role_permissions rp ON r.id = rp.role_id
INNER JOIN ims_permissions p ON rp.permission_id = p.id
WHERE ur.is_active = 1
  AND r.is_active = 1
  AND p.is_active = 1;
GO
PRINT '✅ Created vw_ims_user_permissions';

GO

-- =====================================================
-- SUMMARY REPORT
-- =====================================================
PRINT '';
PRINT '═══════════════════════════════════════════════';
PRINT '✅ IMS ROLE SYSTEM CREATED SUCCESSFULLY!';
PRINT '═══════════════════════════════════════════════';
PRINT '';

SELECT 
    'System Roles' as Category,
    COUNT(*) as Count
FROM ims_roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM ims_permissions
UNION ALL
SELECT 'Role-Permission Mappings', COUNT(*) FROM ims_role_permissions;

PRINT '';
PRINT '📊 System Roles Created:';
SELECT role_name, display_name, is_system_role 
FROM ims_roles 
ORDER BY 
    CASE role_name
        WHEN 'IMS_SUPER_ADMIN' THEN 1
        WHEN 'IMS_ADMIN' THEN 2
        WHEN 'WING_SUPERVISOR' THEN 3
        WHEN 'GENERAL_USER' THEN 4
        ELSE 5
    END;

PRINT '';
PRINT '🎯 Next Steps:';
PRINT '  1. Assign IMS_SUPER_ADMIN role to initial administrators';
PRINT '  2. Auto-assign GENERAL_USER to all existing users';
PRINT '  3. Update backend APIs to use ims_user_roles';
PRINT '  4. Create role management UI';
PRINT '';
