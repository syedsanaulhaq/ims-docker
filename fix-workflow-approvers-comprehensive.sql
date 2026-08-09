-- Fix workflow_approvers table user_id column to match AspNetUsers.Id
-- Handle all dependencies properly
USE InventoryManagementDB;
GO

PRINT 'Fixing workflow_approvers.user_id data type to match AspNetUsers.Id';

-- Step 1: Drop all dependent objects
PRINT 'Step 1: Dropping dependent objects...';

-- Drop index if exists
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_workflow_approvers_workflow_user')
BEGIN
    DROP INDEX IDX_workflow_approvers_workflow_user ON workflow_approvers;
    PRINT 'Dropped index IDX_workflow_approvers_workflow_user';
END

-- Drop all foreign key constraints on user_id
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'ALTER TABLE workflow_approvers DROP CONSTRAINT ' + name + ';' + CHAR(13)
FROM sys.foreign_keys 
WHERE parent_object_id = OBJECT_ID('workflow_approvers')
  AND (name LIKE '%user_id%' OR name LIKE '%added_by%');

IF @sql != ''
BEGIN
    EXEC sp_executesql @sql;
    PRINT 'Dropped foreign key constraints';
END

-- Step 2: Clear existing data and alter columns
PRINT 'Step 2: Clearing data and altering columns...';

DELETE FROM workflow_approvers;
PRINT 'Cleared existing workflow_approvers records';

-- Alter the user_id column to NVARCHAR(450)
ALTER TABLE workflow_approvers 
ALTER COLUMN user_id NVARCHAR(450) NOT NULL;
PRINT 'Changed user_id column from uniqueidentifier to nvarchar(450)';

-- Alter the added_by column to NVARCHAR(450)
ALTER TABLE workflow_approvers 
ALTER COLUMN added_by NVARCHAR(450) NULL;
PRINT 'Changed added_by column from uniqueidentifier to nvarchar(450)';

-- Step 3: Recreate constraints and indexes
PRINT 'Step 3: Recreating constraints and indexes...';

-- Add foreign key constraint for user_id
ALTER TABLE workflow_approvers 
ADD CONSTRAINT FK_workflow_approvers_user_id 
FOREIGN KEY (user_id) REFERENCES AspNetUsers(Id);
PRINT 'Added foreign key constraint for user_id';

-- Add foreign key constraint for added_by
ALTER TABLE workflow_approvers 
ADD CONSTRAINT FK_workflow_approvers_added_by 
FOREIGN KEY (added_by) REFERENCES AspNetUsers(Id);
PRINT 'Added foreign key constraint for added_by';

-- Recreate index
CREATE INDEX IDX_workflow_approvers_workflow_user ON workflow_approvers(workflow_id, user_id);
PRINT 'Recreated index IDX_workflow_approvers_workflow_user';

PRINT 'workflow_approvers table fixed successfully!';

-- Step 4: Verify the changes
PRINT 'Step 4: Verifying changes...';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'workflow_approvers' 
    AND COLUMN_NAME IN ('user_id', 'added_by')
ORDER BY ORDINAL_POSITION;