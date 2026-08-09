-- ============================================================================
-- Production Fix: Create workflow tables + seed configuration data
-- Safe to re-run. Skips existing IDs.
-- ============================================================================
USE [InventoryManagementDB];
GO
SET NOCOUNT ON;
GO

-- ============================================================================
-- 1. CREATE ims_workflow_roles TABLE IF MISSING
-- ============================================================================
PRINT 'Ensuring ims_workflow_roles table...';
GO

IF OBJECT_ID('dbo.ims_workflow_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ims_workflow_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(100) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created ims_workflow_roles table.';
END
ELSE
BEGIN
  PRINT 'ims_workflow_roles table already exists.';
END
GO

-- ============================================================================
-- 2. CREATE ims_dynamic_workflow_steps TABLE IF MISSING
-- ============================================================================
PRINT 'Ensuring ims_dynamic_workflow_steps table...';
GO

IF OBJECT_ID('dbo.ims_dynamic_workflow_steps', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ims_dynamic_workflow_steps (
    id INT IDENTITY(1,1) PRIMARY KEY,
    group_number INT NOT NULL,
    step_order INT NOT NULL,
    designation_value NVARCHAR(200) NOT NULL,
    match_mode NVARCHAR(20) NOT NULL DEFAULT 'exact',
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created ims_dynamic_workflow_steps table.';
END
ELSE
BEGIN
  PRINT 'ims_dynamic_workflow_steps table already exists.';
END
GO

-- ============================================================================
-- 3. SEED ims_workflow_roles
-- ============================================================================
PRINT 'Seeding ims_workflow_roles...';
GO

SET IDENTITY_INSERT dbo.ims_workflow_roles ON;
GO

INSERT INTO dbo.ims_workflow_roles (id, role_name, is_active, created_at, updated_at)
SELECT src.id, src.role_name, src.is_active, src.created_at, src.updated_at
FROM (VALUES
  (1, N'DG Admin', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (2, N'DD Admin', 1, '2026-05-13T10:09:29.110', '2026-05-13T10:09:29.110'),
  (3, N'AD Admin', 0, '2026-05-13T10:09:29.113', '2026-05-13T10:13:46.300'),
  (4, N'Storekeeper', 1, '2026-05-13T10:09:29.120', '2026-05-13T10:09:29.120'),
  (5, N'Transport Supervisor', 1, '2026-05-13T10:09:29.123', '2026-05-13T10:09:29.123'),
  (6, N'AD Admin-I', 1, '2026-05-13T10:13:46.297', '2026-05-13T10:13:46.297'),
  (7, N'AD Admin-II', 1, '2026-05-13T10:13:46.300', '2026-05-13T10:13:46.300')
) AS src(id, role_name, is_active, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ims_workflow_roles t WHERE t.id = src.id
);
GO

SET IDENTITY_INSERT dbo.ims_workflow_roles OFF;
GO

PRINT 'Seeded ims_workflow_roles.';
GO

-- ============================================================================
-- 4. SEED ims_dynamic_workflow_steps
-- ============================================================================
PRINT 'Seeding ims_dynamic_workflow_steps...';
GO

SET IDENTITY_INSERT dbo.ims_dynamic_workflow_steps ON;
GO

INSERT INTO dbo.ims_dynamic_workflow_steps (id, group_number, step_order, designation_value, match_mode, is_active, created_at, updated_at)
SELECT src.id, src.group_number, src.step_order, src.designation_value, src.match_mode, src.is_active, src.created_at, src.updated_at
FROM (VALUES
  (1, 3, 1, N'Deputy Director', N'prefix', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (2, 3, 2, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (3, 3, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (4, 1, 1, N'Additional Director General', N'prefix', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (5, 1, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (6, 1, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (7, 1, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (8, 1, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (9, 1, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (10, 2, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (11, 2, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (12, 2, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (13, 2, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (14, 3, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (15, 3, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (16, 3, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (17, 3, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (18, 4, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (19, 4, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (20, 4, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (21, 4, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (22, 5, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (23, 5, 2, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (24, 5, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (25, 6, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (26, 6, 2, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (27, 6, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (28, 7, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (29, 7, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (30, 7, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (31, 7, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (32, 8, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (33, 8, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (34, 8, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (35, 8, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (36, 9, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (37, 9, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (38, 9, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (39, 9, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (40, 1, 1, N'IMS_ADMIN', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (41, 1, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (42, 2, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (43, 10, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (44, 10, 2, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (45, 10, 2, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (46, 10, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (47, 1, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (48, 2, 1, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (49, 11, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (50, 11, 2, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (51, 11, 3, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (52, 12, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (53, 1, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (54, 1, 2, N'DD Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (55, 1, 3, N'AD Admin-I', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (56, 1, 3, N'AD Admin-II', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (57, 1, 4, N'Storekeeper', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (58, 1, 1, N'DG Admin', N'exact', 0, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (59, 1, 1, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (60, 1, 2, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (61, 1, 2, N'AD Admin-II', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (62, 1, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (63, 2, 1, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (64, 2, 2, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (65, 2, 2, N'AD Admin-II', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (66, 2, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (67, 3, 1, N'Deputy Director', N'prefix', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (68, 3, 2, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (69, 3, 3, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (70, 3, 3, N'AD Admin-II', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (71, 3, 4, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (72, 4, 1, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (73, 4, 2, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (74, 4, 2, N'AD Admin-II', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (75, 4, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (76, 5, 1, N'DG Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (77, 5, 2, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (78, 5, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (79, 6, 1, N'DG Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (80, 6, 2, N'DD Admin', N'exact', 1, '2026-05-13T13:13:00.000', '2026-05-13T13:13:00.000'),
  (81, 6, 3, N'Storekeeper', N'exact', 1, '2026-05-13T13:13:00.000', '2026-05-13T13:13:00.000'),
  (82, 7, 1, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (83, 7, 2, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (84, 7, 2, N'AD Admin-II', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (85, 7, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (86, 8, 1, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (87, 8, 2, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (88, 8, 2, N'AD Admin-II', N'exact', 1, '2026-05-13T13:13:00.000', '2026-05-13T13:13:00.000'),
  (89, 8, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (90, 9, 1, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (91, 9, 2, N'AD Admin-I', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (92, 9, 2, N'AD Admin-II', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (93, 9, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (94, 10, 1, N'DG Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (95, 10, 2, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (96, 10, 3, N'Storekeeper', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (97, 11, 1, N'DG Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093'),
  (98, 11, 2, N'DD Admin', N'exact', 1, '2026-05-13T10:09:29.093', '2026-05-13T10:09:29.093')
) AS src(id, group_number, step_order, designation_value, match_mode, is_active, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ims_dynamic_workflow_steps t WHERE t.id = src.id
);
GO

SET IDENTITY_INSERT dbo.ims_dynamic_workflow_steps OFF;
GO

PRINT 'Seeded ims_dynamic_workflow_steps.';
GO

SET NOCOUNT OFF;
PRINT 'Workflow data seed complete.';
GO
