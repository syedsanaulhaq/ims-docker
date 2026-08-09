-- =====================================================
-- FIX: Convert workflow roles to proper system roles
-- and remove custom duplicate roles
-- Run this on PRODUCTION after backing up the database
-- =====================================================

USE InventoryManagementDB;
GO

SET NOCOUNT ON;

PRINT '==================================================';
PRINT 'Fixing IMS system roles and cleaning custom roles';
PRINT '==================================================';
GO

-- =====================================================
-- 1. ENSURE REQUIRED PERMISSIONS EXIST
-- =====================================================
PRINT '';
PRINT 'Step 1: Ensuring required permissions exist...';

INSERT INTO ims_permissions (permission_key, module_name, action_name, description, is_active)
SELECT permission_key, module_name, action_name, description, 1
FROM (VALUES
    ('inventory.view',           'Inventory', 'View',           'View inventory (generic)'),
    ('inventory.manage',         'Inventory', 'Manage',         'Manage inventory (generic)'),
    ('inventory.manage_store_keeper', 'Inventory', 'Manage Store', 'Manage store keeper operations'),
    ('issuance.request',         'Issuance',  'Request',        'Request item issuance'),
    ('issuance.process',         'Issuance',  'Process',        'Process issuance requests'),
    ('issuance.view',            'Issuance',  'View',           'View issuance records'),
    ('approval.approve',         'Approval',  'Approve',        'Approve requests'),
    ('approval.manage',          'Approval',  'Manage',         'Manage approval workflows'),
    ('reports.view',             'Reports',   'View',           'View reports'),
    ('procurement.view',         'Procurement','View',          'View procurement data'),
    ('procurement.manage',       'Procurement','Manage',        'Manage procurement processes')
) AS v(permission_key, module_name, action_name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM ims_permissions p WHERE p.permission_key = v.permission_key
);

PRINT '✅ Required permissions ensured';
GO

-- =====================================================
-- 2. ENSURE ONE SYSTEM ROLE PER WORKFLOW ROLE NAME
-- =====================================================
-- If a custom role exists with the same name as a system role,
-- migrate its users/permissions to the system role and delete the custom one.
-- If only a custom role exists, convert it to a system role.
-- If no role exists, insert a new system role.
PRINT '';
PRINT 'Step 2: Merging duplicate/custom workflow roles into single system roles...';

DECLARE @roleName NVARCHAR(100);
DECLARE @systemRoleId UNIQUEIDENTIFIER;
DECLARE @customRoleId UNIQUEIDENTIFIER;

DECLARE role_cursor CURSOR FOR
SELECT role_name
FROM (VALUES
    ('AD Admin-I'),
    ('AD Admin-II'),
    ('DD Admin'),
    ('DG Admin'),
    ('Storekeeper'),
    ('Transport Supervisor'),
    ('WING_STORE_KEEPER'),
    ('Tender DEO')
) AS v(role_name);

OPEN role_cursor;
FETCH NEXT FROM role_cursor INTO @roleName;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '';
    PRINT 'Processing role: ' + @roleName;

    -- Pick the existing system role (oldest if multiple)
    SELECT TOP 1 @systemRoleId = id
    FROM ims_roles
    WHERE role_name = @roleName AND is_system_role = 1 AND is_active = 1
    ORDER BY created_at ASC, id ASC;

    -- Pick the first custom duplicate (oldest if multiple)
    SELECT TOP 1 @customRoleId = id
    FROM ims_roles
    WHERE role_name = @roleName AND is_system_role = 0 AND is_active = 1
    ORDER BY created_at ASC, id ASC;

    IF @systemRoleId IS NULL AND @customRoleId IS NULL
    BEGIN
        -- Insert new system role
        SET @systemRoleId = NEWID();
        INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active)
        VALUES (
            @systemRoleId,
            @roleName,
            CASE
                WHEN @roleName = 'WING_STORE_KEEPER' THEN 'Wing Store Keeper'
                ELSE @roleName
            END,
            CASE
                WHEN @roleName = 'WING_STORE_KEEPER' THEN 'Wing Store Keeper - manage wing store operations'
                ELSE 'Workflow approval role - ' + @roleName
            END,
            1,
            1
        );
        PRINT '  ✅ Inserted new system role: ' + @roleName;
    END
    ELSE IF @systemRoleId IS NOT NULL AND @customRoleId IS NULL
    BEGIN
        PRINT '  ✅ System role already exists: ' + @roleName;
    END
    ELSE IF @systemRoleId IS NULL AND @customRoleId IS NOT NULL
    BEGIN
        -- Convert the custom role to system
        SET @systemRoleId = @customRoleId;
        UPDATE ims_roles
        SET is_system_role = 1,
            description = CASE
                WHEN role_name = 'WING_STORE_KEEPER' THEN 'Wing Store Keeper - manage wing store operations'
                ELSE 'Workflow approval role - ' + role_name
            END
        WHERE id = @systemRoleId;
        PRINT '  ✅ Converted custom role to system: ' + @roleName;
    END
    ELSE
    BEGIN
        -- Both system and custom exist: migrate users and permissions, then delete custom
        PRINT '  ⚠️ Found custom duplicate for ' + @roleName + ', merging into system role...';

        UPDATE ur
        SET role_id = @systemRoleId
        FROM ims_user_roles ur
        WHERE ur.role_id = @customRoleId
          AND NOT EXISTS (
              SELECT 1 FROM ims_user_roles existing
              WHERE existing.user_id = ur.user_id
                AND existing.role_id = @systemRoleId
                AND existing.scope_type = ur.scope_type
                AND ISNULL(existing.scope_office_id, 0) = ISNULL(ur.scope_office_id, 0)
                AND ISNULL(existing.scope_wing_id, 0) = ISNULL(ur.scope_wing_id, 0)
                AND ISNULL(existing.scope_branch_id, 0) = ISNULL(ur.scope_branch_id, 0)
          );

        PRINT '    ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' user assignments migrated';

        -- Move permissions that the system role does not already have
        INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
        SELECT @systemRoleId, rp.permission_id, 'SYSTEM_RESEED'
        FROM ims_role_permissions rp
        WHERE rp.role_id = @customRoleId
          AND NOT EXISTS (
              SELECT 1 FROM ims_role_permissions existing
              WHERE existing.role_id = @systemRoleId AND existing.permission_id = rp.permission_id
          );

        PRINT '    ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' permissions migrated';

        -- Delete remaining user/permission links and the custom role
        DELETE FROM ims_user_roles WHERE role_id = @customRoleId;
        DELETE FROM ims_role_permissions WHERE role_id = @customRoleId;
        DELETE FROM ims_roles WHERE id = @customRoleId;

        PRINT '    ✅ Removed custom duplicate: ' + @roleName;
    END

    -- Also delete any additional duplicates beyond the first custom one processed
    DELETE FROM ims_user_roles WHERE role_id IN (
        SELECT id FROM ims_roles WHERE role_name = @roleName AND id <> @systemRoleId
    );
    DELETE FROM ims_role_permissions WHERE role_id IN (
        SELECT id FROM ims_roles WHERE role_name = @roleName AND id <> @systemRoleId
    );
    DELETE FROM ims_roles WHERE role_name = @roleName AND id <> @systemRoleId;

    FETCH NEXT FROM role_cursor INTO @roleName;
END

CLOSE role_cursor;
DEALLOCATE role_cursor;

PRINT '';
PRINT '✅ Duplicate/custom workflow role merge complete';
GO

-- =====================================================
-- 3. MERGE CUSTOM_* ROLES INTO THEIR SYSTEM COUNTERPARTS
-- =====================================================
PRINT '';
PRINT 'Step 3: Merging CUSTOM_* roles into system counterparts...';

-- Helper procedure for merging a custom role into a system role
DECLARE @SystemRoleId UNIQUEIDENTIFIER;
DECLARE @CustomRoleId UNIQUEIDENTIFIER;
DECLARE @SystemRoleName NVARCHAR(100);
DECLARE @CustomRoleName NVARCHAR(100);

DECLARE custom_role_merge_cursor CURSOR FOR
SELECT system_role_name, custom_role_name
FROM (VALUES
    ('WING_STORE_KEEPER', 'CUSTOM_WING_STORE_KEEPER'),
    ('Storekeeper',       'CUSTOM_STOREKEEPER')
) AS v(system_role_name, custom_role_name);

OPEN custom_role_merge_cursor;
FETCH NEXT FROM custom_role_merge_cursor INTO @SystemRoleName, @CustomRoleName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @SystemRoleId = NULL;
    SET @CustomRoleId = NULL;

    SELECT @SystemRoleId = id FROM ims_roles WHERE role_name = @SystemRoleName AND is_active = 1;
    SELECT @CustomRoleId = id FROM ims_roles WHERE role_name = @CustomRoleName AND is_active = 1;

    PRINT '';
    PRINT 'Processing: ' + @CustomRoleName + ' -> ' + @SystemRoleName;

    IF @SystemRoleId IS NULL
    BEGIN
        SET @SystemRoleId = NEWID();
        INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active)
        VALUES (
            @SystemRoleId,
            @SystemRoleName,
            CASE
                WHEN @SystemRoleName = 'WING_STORE_KEEPER' THEN 'Wing Store Keeper'
                ELSE @SystemRoleName
            END,
            CASE
                WHEN @SystemRoleName = 'WING_STORE_KEEPER' THEN 'Wing Store Keeper - manage wing store operations'
                ELSE 'Workflow approval role - ' + @SystemRoleName
            END,
            1,
            1
        );
        PRINT '  ✅ Created system role: ' + @SystemRoleName;
    END
    ELSE
    BEGIN
        PRINT '  ✅ System role already exists: ' + @SystemRoleName;
    END

    IF @CustomRoleId IS NOT NULL
    BEGIN
        UPDATE ur
        SET role_id = @SystemRoleId
        FROM ims_user_roles ur
        WHERE ur.role_id = @CustomRoleId
          AND NOT EXISTS (
              SELECT 1 FROM ims_user_roles existing
              WHERE existing.user_id = ur.user_id
                AND existing.role_id = @SystemRoleId
                AND existing.scope_type = ur.scope_type
                AND ISNULL(existing.scope_office_id, 0) = ISNULL(ur.scope_office_id, 0)
                AND ISNULL(existing.scope_wing_id, 0) = ISNULL(ur.scope_wing_id, 0)
                AND ISNULL(existing.scope_branch_id, 0) = ISNULL(ur.scope_branch_id, 0)
          );

        PRINT '    ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' user assignments migrated from ' + @CustomRoleName + ' to ' + @SystemRoleName;

        DELETE FROM ims_user_roles WHERE role_id = @CustomRoleId;

        INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
        SELECT @SystemRoleId, rp.permission_id, 'SYSTEM_RESEED'
        FROM ims_role_permissions rp
        WHERE rp.role_id = @CustomRoleId
          AND NOT EXISTS (
              SELECT 1 FROM ims_role_permissions existing
              WHERE existing.role_id = @SystemRoleId AND existing.permission_id = rp.permission_id
          );

        PRINT '    ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' permissions migrated from ' + @CustomRoleName + ' to ' + @SystemRoleName;

        DELETE FROM ims_role_permissions WHERE role_id = @CustomRoleId;
        DELETE FROM ims_roles WHERE id = @CustomRoleId;

        PRINT '  ✅ Removed custom role: ' + @CustomRoleName;
    END
    ELSE
    BEGIN
        PRINT '  ✅ Custom role did not exist: ' + @CustomRoleName;
    END

    FETCH NEXT FROM custom_role_merge_cursor INTO @SystemRoleName, @CustomRoleName;
END

CLOSE custom_role_merge_cursor;
DEALLOCATE custom_role_merge_cursor;

PRINT '';
PRINT '✅ CUSTOM_* role merge complete';
GO

-- =====================================================
-- 4. ASSIGN PERMISSIONS TO SYSTEM ROLES
-- =====================================================
PRINT '';
PRINT 'Step 4: Assigning permissions to system roles...';

-- Helper: clear previous workflow role permissions to avoid stale grants
DELETE FROM ims_role_permissions
WHERE role_id IN (
    SELECT id FROM ims_roles
    WHERE role_name IN ('AD Admin-I','AD Admin-II','DD Admin','DG Admin','Storekeeper','Transport Supervisor','WING_STORE_KEEPER')
);

-- Admin chain approval roles: DD Admin, AD Admin-I, AD Admin-II, DG Admin
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name IN ('DD Admin', 'AD Admin-I', 'AD Admin-II', 'DG Admin')
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view',
      'issuance.process',
      'approval.approve',
      'reports.view'
  );

-- Storekeeper
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'Storekeeper'
  AND p.permission_key IN (
      'inventory.view',
      'inventory.manage_store_keeper',
      'issuance.view',
      'issuance.process',
      'reports.view'
  );

-- Wing Store Keeper
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'WING_STORE_KEEPER'
  AND p.permission_key IN (
      'inventory.view',
      'inventory.manage_store_keeper',
      'issuance.view',
      'issuance.process',
      'reports.view'
  );

-- Transport Supervisor
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'Transport Supervisor'
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view',
      'issuance.process',
      'approval.approve',
      'reports.view'
  );

PRINT '✅ Permissions assigned to system roles';
GO

-- =====================================================
-- 5. CLEANUP ANY OTHER UNWANTED CUSTOM ROLES
-- =====================================================
-- Edit the @RolesToDelete list below with the exact role_name values you want removed.
-- Users assigned to a deleted role are moved to GENERAL_USER if not already assigned.
-- System roles and GENERAL_USER cannot be deleted.
PRINT '';
PRINT 'Step 5: Cleaning up additional unwanted custom roles...';

DECLARE @RolesToDelete TABLE (role_name NVARCHAR(100) NOT NULL PRIMARY KEY);

-- ===== ADD CUSTOM ROLE NAMES TO DELETE BELOW =====
-- INSERT INTO @RolesToDelete (role_name) VALUES ('Custom Role Name 1');
-- INSERT INTO @RolesToDelete (role_name) VALUES ('Custom Role Name 2');
-- ==================================================

DECLARE @GeneralUserRoleId UNIQUEIDENTIFIER;
SELECT @GeneralUserRoleId = id FROM ims_roles WHERE role_name = 'GENERAL_USER' AND is_active = 1;

IF @GeneralUserRoleId IS NULL
BEGIN
    RAISERROR('GENERAL_USER role not found. Cannot proceed with custom role cleanup.', 16, 1);
END
ELSE
BEGIN
    DECLARE @deleteRoleName NVARCHAR(100);
    DECLARE @deleteRoleId UNIQUEIDENTIFIER;

    DECLARE delete_role_cursor CURSOR FOR
    SELECT rt.role_name
    FROM @RolesToDelete rt;

    OPEN delete_role_cursor;
    FETCH NEXT FROM delete_role_cursor INTO @deleteRoleName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @deleteRoleId = NULL;
        SELECT @deleteRoleId = id FROM ims_roles WHERE role_name = @deleteRoleName;

        IF @deleteRoleId IS NULL
        BEGIN
            PRINT '  ⚠️ Role not found: ' + @deleteRoleName;
        END
        ELSE IF @deleteRoleName = 'GENERAL_USER'
        BEGIN
            PRINT '  ❌ Cannot delete GENERAL_USER role: ' + @deleteRoleName;
        END
        ELSE IF EXISTS (SELECT 1 FROM ims_roles WHERE id = @deleteRoleId AND is_system_role = 1)
        BEGIN
            PRINT '  ❌ Cannot delete system role: ' + @deleteRoleName;
        END
        ELSE
        BEGIN
            -- Move users to GENERAL_USER (avoid duplicate scope assignments)
            UPDATE ur
            SET role_id = @GeneralUserRoleId
            FROM ims_user_roles ur
            WHERE ur.role_id = @deleteRoleId
              AND NOT EXISTS (
                  SELECT 1 FROM ims_user_roles existing
                  WHERE existing.user_id = ur.user_id
                    AND existing.role_id = @GeneralUserRoleId
                    AND existing.scope_type = ur.scope_type
                    AND ISNULL(existing.scope_office_id, 0) = ISNULL(ur.scope_office_id, 0)
                    AND ISNULL(existing.scope_wing_id, 0) = ISNULL(ur.scope_wing_id, 0)
                    AND ISNULL(existing.scope_branch_id, 0) = ISNULL(ur.scope_branch_id, 0)
              );

            PRINT '  ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' user(s) moved from ' + @deleteRoleName + ' to GENERAL_USER';

            -- Delete remaining duplicate assignments tied to this role
            DELETE FROM ims_user_roles WHERE role_id = @deleteRoleId;
            DELETE FROM ims_role_permissions WHERE role_id = @deleteRoleId;
            DELETE FROM ims_roles WHERE id = @deleteRoleId;

            PRINT '  ✅ Deleted custom role: ' + @deleteRoleName;
        END

        FETCH NEXT FROM delete_role_cursor INTO @deleteRoleName;
    END

    CLOSE delete_role_cursor;
    DEALLOCATE delete_role_cursor;
END

PRINT '✅ Custom role cleanup complete';
GO

-- =====================================================
-- 6. VERIFICATION
-- =====================================================
PRINT '';
PRINT '==================================================';
PRINT 'Verification Summary';
PRINT '==================================================';

SELECT
    role_name,
    display_name,
    is_system_role,
    is_active,
    (SELECT COUNT(*) FROM ims_user_roles ur WHERE ur.role_id = r.id AND ur.is_active = 1) AS active_users,
    (SELECT COUNT(*) FROM ims_role_permissions rp WHERE rp.role_id = r.id) AS permissions
FROM ims_roles r
WHERE r.role_name IN (
    'IMS_SUPER_ADMIN','IMS_ADMIN','WING_SUPERVISOR','BRANCH_SUPERVISOR',
    'BRANCH_STORE_KEEPER','GENERAL_USER','PROCUREMENT_OFFICER','AUDITOR',
    'AD Admin-I','AD Admin-II','DD Admin','DG Admin','Storekeeper',
    'Transport Supervisor','WING_STORE_KEEPER'
)
ORDER BY
    CASE WHEN is_system_role = 1 THEN 0 ELSE 1 END,
    role_name;
GO

PRINT '';
PRINT '✅ Role cleanup complete. Review the summary above before committing.';
PRINT '   If this was run inside a transaction, run COMMIT to apply changes.';
GO
