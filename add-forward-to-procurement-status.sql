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
