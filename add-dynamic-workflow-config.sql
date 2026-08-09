-- Dynamic approval workflow configuration by item group + designation steps

IF OBJECT_ID('ims_dynamic_workflow_steps', 'U') IS NULL
BEGIN
  CREATE TABLE ims_dynamic_workflow_steps (
    id INT IDENTITY(1,1) PRIMARY KEY,
    group_number INT NOT NULL,
    step_order INT NOT NULL,
    designation_value NVARCHAR(200) NOT NULL,
    match_mode NVARCHAR(20) NOT NULL DEFAULT 'prefix',
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_ims_dynamic_workflow_steps_group_step
  ON ims_dynamic_workflow_steps(group_number, step_order, is_active);
END
GO

IF OBJECT_ID('ims_request_workflow_state', 'U') IS NULL
BEGIN
  CREATE TABLE ims_request_workflow_state (
    request_id UNIQUEIDENTIFIER PRIMARY KEY,
    request_approval_id UNIQUEIDENTIFIER NULL,
    group_number INT NOT NULL,
    current_step_order INT NOT NULL,
    total_steps INT NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
  );
END
GO

-- Seed initial workflow examples
IF NOT EXISTS (SELECT 1 FROM ims_dynamic_workflow_steps)
BEGIN
  -- Group 1
  INSERT INTO ims_dynamic_workflow_steps (group_number, step_order, designation_value, match_mode)
  VALUES
    (1, 1, 'DD Admin', 'prefix'),
    (1, 2, 'AD Admin-1', 'exact'),
    (1, 2, 'AD Admin-2', 'exact'),
    (1, 3, 'Storekeeper', 'prefix');

  -- Group 4
  INSERT INTO ims_dynamic_workflow_steps (group_number, step_order, designation_value, match_mode)
  VALUES
    (4, 1, 'DG Admin', 'prefix'),
    (4, 2, 'DD Admin', 'prefix'),
    (4, 3, 'AD Admin-1', 'exact'),
    (4, 3, 'AD Admin-2', 'exact'),
    (4, 4, 'Storekeeper', 'prefix');
END
GO
