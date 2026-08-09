-- ============================================================================
-- IMS Production Delta Deployment Script
-- Generated: 2026-07-14T06:53:36.802Z
-- Scope: Only new/altered schema objects since last production deployment
-- Excludes: user data, item data, vendor data, transactional data
-- NOTE: Run this in SSMS or sqlcmd. Do NOT wrap in a manual transaction.
-- ============================================================================
USE [InventoryManagementDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO


-- ============================================================================
-- Source: add-forward-to-procurement-status.sql
-- ============================================================================
-- Add support for 'forwarded_to_procurement' workflow status
-- Widens status columns and updates check constraints

ALTER TABLE request_approvals ALTER COLUMN current_status NVARCHAR(50) NULL;
GO

ALTER TABLE approval_history ALTER COLUMN action_type NVARCHAR(50) NULL;
GO

-- Update request_approvals status check constraint
IF EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('request_approvals') AND name = 'CHK_request_approvals_status')
  ALTER TABLE request_approvals DROP CONSTRAINT CHK_request_approvals_status;
GO

ALTER TABLE request_approvals ADD CONSTRAINT CHK_request_approvals_status
  CHECK (current_status IN ('pending', 'approved', 'rejected', 'returned', 'forwarded_to_admin', 'forwarded_to_supervisor', 'forwarded_to_procurement', 'completed'));
GO

-- Update approval_history action_type check constraint
IF EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('approval_history') AND name = 'CHK_approval_history_action_type')
  ALTER TABLE approval_history DROP CONSTRAINT CHK_approval_history_action_type;
GO

ALTER TABLE approval_history ADD CONSTRAINT CHK_approval_history_action_type
  CHECK (action_type IN (
    'submitted', 'approved', 'rejected', 'returned',
    'forwarded_to_admin', 'forwarded_to_supervisor', 'forwarded_to_procurement',
    'approved_step', 'completed', 'dispatched', 'issued', 'sent_to_store_keeper'
  ));
GO

-- Update stock_issuance_requests approval_status check constraint
IF EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('stock_issuance_requests') AND name = 'CK_sir_approval_status')
  ALTER TABLE stock_issuance_requests DROP CONSTRAINT CK_sir_approval_status;
GO

ALTER TABLE stock_issuance_requests ADD CONSTRAINT CK_sir_approval_status
  CHECK (approval_status IN (
    'Pending Supervisor Review',
    'Approved by Supervisor',
    'Forwarded to Admin',
    'Forwarded to Procurement',
    'Approved by Admin',
    'Partially Approved',
    'Rejected by Supervisor',
    'Rejected by Admin',
    'Issued',
    'Dispatched',
    'Delivered',
    'Completed'
  ));
GO


-- ============================================================================
-- Source: server/migrations/create_required_items_table.sql
-- ============================================================================
-- ============================================================================
-- Migration: Create required_items table
-- Purpose: Track items that could not be issued due to insufficient stock
--          so they can be routed into the tender procurement pipeline
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'required_items')
BEGIN
  CREATE TABLE required_items (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    item_master_id          UNIQUEIDENTIFIER NULL REFERENCES item_masters(id),
    nomenclature            NVARCHAR(500)    NOT NULL,
    quantity_needed         INT              NOT NULL DEFAULT 1,
    unit                    NVARCHAR(50)     NULL,
    source_request_id       UNIQUEIDENTIFIER NULL REFERENCES stock_issuance_requests(id),
    source_request_number   NVARCHAR(100)    NULL,
    requested_by_wing_id    INT              NULL,
    requested_by_wing_name  NVARCHAR(200)    NULL,
    urgency_level           NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    status                  NVARCHAR(50)     NOT NULL DEFAULT 'Pending',
    -- Tender linkage
    tender_id               UNIQUEIDENTIFIER NULL REFERENCES tenders(id),
    tender_type             NVARCHAR(50)     NULL,
    tender_reference        NVARCHAR(200)    NULL,
    -- Audit
    notes                   NVARCHAR(MAX)    NULL,
    created_at              DATETIME2        NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2        NOT NULL DEFAULT GETDATE(),
    created_by              NVARCHAR(450)    NULL,
    resolved_at             DATETIME2        NULL,
    is_deleted              BIT              NOT NULL DEFAULT 0
  );

  PRINT 'required_items table created.';
END
ELSE
BEGIN
  PRINT 'required_items table already exists.';
END

-- Index for fast lookup by status and source request
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_status' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_status ON required_items(status, is_deleted);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_source' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_source ON required_items(source_request_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_tender' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_tender ON required_items(tender_id);


-- ============================================================================
-- Source: server/migrations/add-procurement-type-to-required-items.sql
-- ============================================================================
-- ============================================================================
-- Migration: Add procurement classification columns to required_items
-- Purpose: Track recommended procurement type and estimated value per item
--          so procurement officers can route items to the correct tender lane.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('required_items') AND name = 'recommended_procurement_type')
BEGIN
  ALTER TABLE required_items ADD recommended_procurement_type NVARCHAR(50) NULL;
  PRINT 'Added recommended_procurement_type column.';
END
ELSE
BEGIN
  PRINT 'recommended_procurement_type column already exists.';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('required_items') AND name = 'estimated_value')
BEGIN
  ALTER TABLE required_items ADD estimated_value DECIMAL(18,2) NULL;
  PRINT 'Added estimated_value column.';
END
ELSE
BEGIN
  PRINT 'estimated_value column already exists.';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('required_items') AND name = 'category_id')
BEGIN
  ALTER TABLE required_items ADD category_id UNIQUEIDENTIFIER NULL;
  PRINT 'Added category_id column.';
END
ELSE
BEGIN
  PRINT 'category_id column already exists.';
END

-- Add source required item tracking to tender_items so we can mark demand as In Tender
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tender_items') AND name = 'source_required_item_id')
BEGIN
  ALTER TABLE tender_items ADD source_required_item_id UNIQUEIDENTIFIER NULL;
  PRINT 'Added source_required_item_id column to tender_items.';
END
ELSE
BEGIN
  PRINT 'source_required_item_id column already exists in tender_items.';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tender_items') AND name = 'source_required_item_ids')
BEGIN
  ALTER TABLE tender_items ADD source_required_item_ids NVARCHAR(MAX) NULL;
  PRINT 'Added source_required_item_ids column to tender_items.';
END
ELSE
BEGIN
  PRINT 'source_required_item_ids column already exists in tender_items.';
END


-- ============================================================================
-- Source: add-generic-permissions.sql
-- ============================================================================
-- Add generic permissions that the frontend expects
-- These will be mapped to the appropriate granular permissions based on role
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


-- ============================================================================
-- Source: add-store-keeper-permission.sql
-- ============================================================================
-- Add Store Keeper permission to the database
-- This permission will be assigned to users with WING_STORE_KEEPER or BRANCH_STORE_KEEPER role

-- Check if permission already exists
IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper')
BEGIN
  INSERT INTO ims_permissions (permission_key, module_name, action_name)
  VALUES ('inventory.manage_store_keeper', 'Inventory', 'Manage Store')
END

PRINT '✅ Store Keeper permission setup complete'

-- Assign permission to store keeper roles
DECLARE @permissionId NVARCHAR(MAX)
SELECT TOP 1 @permissionId = id
FROM ims_permissions
WHERE permission_key = 'inventory.manage_store_keeper'

IF @permissionId IS NOT NULL
BEGIN
  INSERT INTO ims_role_permissions (role_id, permission_id)
  SELECT r.id, @permissionId
  FROM ims_roles r
  WHERE r.role_name IN ('WING_STORE_KEEPER', 'BRANCH_STORE_KEEPER')
    AND NOT EXISTS (
      SELECT 1 FROM ims_role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = @permissionId
    )

  PRINT '✅ Permission assigned to store keeper roles'
END
ELSE
BEGIN
  PRINT '⚠️ inventory.manage_store_keeper permission not found in database'
END


-- ============================================================================
-- Source: add-branch-roles.sql
-- ============================================================================
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


-- ============================================================================
-- Source: create-ims-role-system.sql
-- ============================================================================
-- =====================================================
-- IMS INTERNAL ROLE & PERMISSION SYSTEM
-- Fully independent from AspNetRoles
-- Created: November 28, 2025
-- =====================================================
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

GO
SET NOCOUNT OFF;
