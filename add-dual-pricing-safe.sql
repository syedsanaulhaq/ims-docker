-- Add dual pricing mode support to deliveries and delivery_items tables (SAFE VERSION)
-- This enables both individual item pricing and total amount distribution
-- This version checks for existing columns before adding them

-- Step 1: Add pricing method field to deliveries table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'pricing_method') THEN
        ALTER TABLE deliveries ADD COLUMN pricing_method VARCHAR(20) DEFAULT 'individual';
    END IF;
END $$;

-- Step 2: Add total amount field for total-only pricing (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'total_amount') THEN
        ALTER TABLE deliveries ADD COLUMN total_amount DECIMAL(12,2) NULL;
    END IF;
END $$;

-- Step 3: Add unit price field to delivery_items for individual pricing (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_items' AND column_name = 'unit_price') THEN
        ALTER TABLE delivery_items ADD COLUMN unit_price DECIMAL(12,2) NULL;
    END IF;
END $$;

-- Step 4: Add total item amount field to delivery_items (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_items' AND column_name = 'total_item_amount') THEN
        ALTER TABLE delivery_items ADD COLUMN total_item_amount DECIMAL(12,2) NULL;
    END IF;
END $$;

-- Step 5: Add constraint to ensure valid pricing method values (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_pricing_method') THEN
        ALTER TABLE deliveries ADD CONSTRAINT chk_pricing_method CHECK (pricing_method IN ('individual', 'total_only'));
    END IF;
END $$;

-- Step 6: Add validation constraint for pricing method logic (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_pricing_method_validation') THEN
        ALTER TABLE deliveries ADD CONSTRAINT chk_pricing_method_validation 
        CHECK (
          (pricing_method = 'individual' AND total_amount IS NULL) OR
          (pricing_method = 'total_only' AND total_amount IS NOT NULL AND total_amount > 0)
        );
    END IF;
END $$;

-- Step 7: Update existing records to use 'individual' method
UPDATE deliveries 
SET pricing_method = 'individual' 
WHERE pricing_method IS NULL;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN deliveries.pricing_method IS 'Pricing method: individual (item-wise pricing) or total_only (single total amount)';
COMMENT ON COLUMN deliveries.total_amount IS 'Total delivery amount when using total_only pricing method';
COMMENT ON COLUMN delivery_items.unit_price IS 'Price per unit for individual pricing method';
COMMENT ON COLUMN delivery_items.total_item_amount IS 'Total amount for this item (qty * unit_price or distributed from total)';

-- Step 9: Create indexes for better performance (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_deliveries_pricing_method') THEN
        CREATE INDEX idx_deliveries_pricing_method ON deliveries(pricing_method);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_items_unit_price') THEN
        CREATE INDEX idx_delivery_items_unit_price ON delivery_items(unit_price);
    END IF;
END $$;

-- Step 10: Verify the changes
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE (table_name = 'deliveries' AND column_name IN ('pricing_method', 'total_amount'))
   OR (table_name = 'delivery_items' AND column_name IN ('unit_price', 'total_item_amount'))
ORDER BY table_name, column_name;
