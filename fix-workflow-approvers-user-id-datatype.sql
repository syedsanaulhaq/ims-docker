-- Fix workflow_approvers table user_id column to match AspNetUsers.Id
USE InventoryManagementDB;
GO

PRINT 'Fixing workflow_approvers.user_id data type to match AspNetUsers.Id';

-- First, drop foreign key constraint if it exists
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_workflow_approvers_user_id')
BEGIN
    ALTER TABLE workflow_approvers DROP CONSTRAINT FK_workflow_approvers_user_id;
    PRINT 'Dropped FK_workflow_approvers_user_id constraint';
END

-- Drop the existing records as they have wrong data type
DELETE FROM workflow_approvers;
PRINT 'Cleared existing workflow_approvers records';

-- Alter the user_id column to NVARCHAR(450) to match AspNetUsers.Id
ALTER TABLE workflow_approvers 
ALTER COLUMN user_id NVARCHAR(450) NOT NULL;
PRINT 'Changed user_id column from uniqueidentifier to nvarchar(450)';

-- Also fix added_by column to match AspNetUsers.Id
ALTER TABLE workflow_approvers 
ALTER COLUMN added_by NVARCHAR(450) NULL;
PRINT 'Changed added_by column from uniqueidentifier to nvarchar(450)';

-- Add foreign key constraint
ALTER TABLE workflow_approvers 
ADD CONSTRAINT FK_workflow_approvers_user_id 
FOREIGN KEY (user_id) REFERENCES AspNetUsers(Id);
PRINT 'Added foreign key constraint for user_id';

-- Add foreign key constraint for added_by
ALTER TABLE workflow_approvers 
ADD CONSTRAINT FK_workflow_approvers_added_by 
FOREIGN KEY (added_by) REFERENCES AspNetUsers(Id);
PRINT 'Added foreign key constraint for added_by';

PRINT 'workflow_approvers table fixed successfully!';

-- Verify the changes
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'workflow_approvers' 
    AND COLUMN_NAME IN ('user_id', 'added_by')
ORDER BY ORDINAL_POSITION;