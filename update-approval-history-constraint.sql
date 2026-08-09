-- Update approval_history table to allow 'returned' action_type
-- This allows tracking when requests are returned to requesters

USE InventoryManagementDB;

-- Check for existing constraints on action_type
DECLARE @constraint_name NVARCHAR(200)
SELECT @constraint_name = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('approval_history')
AND definition LIKE '%action_type%'

IF @constraint_name IS NOT NULL
BEGIN
    -- Drop the existing constraint
    EXEC('ALTER TABLE approval_history DROP CONSTRAINT ' + @constraint_name)
    PRINT 'Dropped existing CHECK constraint on action_type'
END

-- Add new CHECK constraint that includes 'returned'
ALTER TABLE approval_history
ADD CONSTRAINT CHK_approval_history_action_type
CHECK (action_type IN ('submitted', 'forwarded', 'approved', 'rejected', 'finalized', 'returned'))

PRINT 'Updated action_type CHECK constraint to include returned action'