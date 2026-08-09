-- Add support for custom items in stock issuance requests
-- This can be easily reverted by dropping the added columns

-- Add custom item support columns
ALTER TABLE stock_issuance_items 
ADD COLUMN item_type VARCHAR(20) DEFAULT 'inventory' 
CHECK (item_type IN ('inventory', 'custom'));

ALTER TABLE stock_issuance_items 
ADD COLUMN custom_item_name VARCHAR(255);

-- Make item_master_id nullable for custom items
ALTER TABLE stock_issuance_items 
ALTER COLUMN item_master_id DROP NOT NULL;

-- Add constraint for data integrity
ALTER TABLE stock_issuance_items 
ADD CONSTRAINT check_item_reference 
CHECK (
  (item_type = 'inventory' AND item_master_id IS NOT NULL AND custom_item_name IS NULL) OR
  (item_type = 'custom' AND item_master_id IS NULL AND custom_item_name IS NOT NULL)
);

-- Create revert script for easy rollback
COMMENT ON COLUMN stock_issuance_items.item_type IS 'REVERT: DROP COLUMN item_type';
COMMENT ON COLUMN stock_issuance_items.custom_item_name IS 'REVERT: DROP COLUMN custom_item_name';
COMMENT ON CONSTRAINT check_item_reference ON stock_issuance_items IS 'REVERT: DROP CONSTRAINT check_item_reference';

SELECT 'Custom items support added - can be reverted easily' as status;
