-- Populate approval_items table for existing approvals
-- This script copies items from stock_issuance_items to approval_items for existing approvals

USE InventoryManagementDB;

-- Insert approval_items for existing approvals that don't have items yet
INSERT INTO approval_items (
    request_approval_id,
    id,
    item_master_id,
    nomenclature,
    custom_item_name,
    requested_quantity,
    created_at,
    updated_at
)
SELECT
    ra.id as request_approval_id,
    si.id as id,
    si.item_master_id,
    si.nomenclature,
    si.custom_item_name,
    si.requested_quantity,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM request_approvals ra
INNER JOIN stock_issuance_items si ON ra.request_id = si.request_id
LEFT JOIN approval_items ai ON ai.request_approval_id = ra.id AND ai.id = si.id
WHERE ai.id IS NULL;  -- Only insert if not already exists

PRINT 'Populated approval_items table for existing approvals';