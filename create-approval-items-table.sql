-- Add missing approval_items table for per-item approval decisions

USE InventoryManagementDB;

-- Create approval_items table for storing item-level approval decisions
CREATE TABLE approval_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_approval_id UNIQUEIDENTIFIER REFERENCES request_approvals(id),

    -- Item details (copied from original request for reference)
    item_master_id UNIQUEIDENTIFIER,
    nomenclature NVARCHAR(500),
    custom_item_name NVARCHAR(500),
    requested_quantity INT,
    unit NVARCHAR(50),

    -- Approval decisions
    allocated_quantity INT DEFAULT 0,
    decision_type NVARCHAR(50), -- 'APPROVE_FROM_STOCK', 'FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN', 'REJECT'
    rejection_reason NVARCHAR(1000),
    forwarding_reason NVARCHAR(1000),

    -- Metadata
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Add indexes for performance
CREATE INDEX IDX_approval_items_request ON approval_items(request_approval_id);
CREATE INDEX IDX_approval_items_item_master ON approval_items(item_master_id);

PRINT 'Created approval_items table successfully';