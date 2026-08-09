-- Add explicit admin workflow flag to request_approvals
-- 0 = supervisor/normal workflow, 1 = admin workflow path

IF OBJECT_ID('request_approvals', 'U') IS NULL
BEGIN
    PRINT 'request_approvals table does not exist. Skipping migration.';
    RETURN;
END

IF COL_LENGTH('request_approvals', 'is_admin_workflow') IS NULL
BEGIN
    ALTER TABLE request_approvals
    ADD is_admin_workflow BIT NOT NULL
        CONSTRAINT DF_request_approvals_is_admin_workflow DEFAULT(0);

    PRINT 'Added column request_approvals.is_admin_workflow (BIT, default 0).';
END
ELSE
BEGIN
    PRINT 'Column request_approvals.is_admin_workflow already exists.';
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_request_approvals_admin_workflow'
      AND object_id = OBJECT_ID('request_approvals')
)
BEGIN
    CREATE INDEX IX_request_approvals_admin_workflow
    ON request_approvals(is_admin_workflow, current_status, current_approver_id);

    PRINT 'Created index IX_request_approvals_admin_workflow.';
END
ELSE
BEGIN
    PRINT 'Index IX_request_approvals_admin_workflow already exists.';
END
