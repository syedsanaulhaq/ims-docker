-- Add rejection_reason column to stock_issuance_items if it doesn't exist
-- This is needed for storing custom item tender routing information

-- Check if rejection_reason column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stock_issuance_items' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE stock_issuance_items 
        ADD COLUMN rejection_reason TEXT;
        
        RAISE NOTICE 'Added rejection_reason column to stock_issuance_items';
    ELSE
        RAISE NOTICE 'rejection_reason column already exists in stock_issuance_items';
    END IF;
END $$;

-- Add issuance_notes column to stock_issuance_requests if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stock_issuance_requests' 
        AND column_name = 'issuance_notes'
    ) THEN
        ALTER TABLE stock_issuance_requests 
        ADD COLUMN issuance_notes TEXT;
        
        RAISE NOTICE 'Added issuance_notes column to stock_issuance_requests';
    ELSE
        RAISE NOTICE 'issuance_notes column already exists in stock_issuance_requests';
    END IF;
END $$;

-- Update possible item statuses to include new ones
COMMENT ON COLUMN stock_issuance_items.item_status IS 'Possible values: Pending, Approved, Rejected, Issued, Referred to Tender, Rejected for Issuance';

-- Update possible request statuses to include new ones  
COMMENT ON COLUMN stock_issuance_requests.request_status IS 'Possible values: Submitted, Under Review, Approved, Rejected, Issued, Partially Issued, Partially Approved, Referred to Tender';

-- Create indexes for faster stock lookups (these already exist but ensuring they're there)
-- Index for nomenclature already exists: idx_inventory_stock_nomenclature
-- Index for item_master_id already exists: idx_inventory_stock_item_master_id

-- Additional index for case-insensitive nomenclature searches
CREATE INDEX IF NOT EXISTS idx_inventory_stock_nomenclature_lower ON inventory_stock(lower(nomenclature));

SELECT 'Enhanced approval system database schema updated successfully' as status;
