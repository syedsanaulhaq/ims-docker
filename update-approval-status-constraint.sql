-- Update request_approvals table to allow 'returned' status
-- This allows requests to be returned to requesters for editing

USE InventoryManagementDB;

-- First, check if there are any constraints on current_status
-- If there is a CHECK constraint, we need to drop it and recreate it

-- Check for existing constraints
DECLARE @constraint_name NVARCHAR(200)
SELECT @constraint_name = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('request_approvals')
AND definition LIKE '%current_status%'

IF @constraint_name IS NOT NULL
BEGIN
    -- Drop the existing constraint
    EXEC('ALTER TABLE request_approvals DROP CONSTRAINT ' + @constraint_name)
    PRINT 'Dropped existing CHECK constraint on current_status'
END

-- Add new CHECK constraint that includes 'returned'
ALTER TABLE request_approvals
ADD CONSTRAINT CHK_request_approvals_status
CHECK (current_status IN ('pending', 'approved', 'rejected', 'finalized', 'returned', 'forwarded'))

PRINT 'Updated current_status CHECK constraint to include returned status'