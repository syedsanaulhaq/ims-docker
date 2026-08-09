-- Add dual pricing mode support to tenders table
-- This enables both individual item pricing and total amount pricing at tender level
-- IMPORTANT: Run revert-database-to-original.sql FIRST if any previous pricing changes were applied

-- Step 1: Add pricing method field to tenders table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'individual_total') THEN
        ALTER TABLE tenders ADD COLUMN individual_total BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added individual_total column to tenders table';
    ELSE
        RAISE NOTICE 'individual_total column already exists in tenders table';
    END IF;
END $$;

-- Step 2: Add actual price total field for total pricing (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'actual_price_total') THEN
        ALTER TABLE tenders ADD COLUMN actual_price_total DECIMAL(12,2) NULL;
        RAISE NOTICE 'Added actual_price_total column to tenders table';
    ELSE
        RAISE NOTICE 'actual_price_total column already exists in tenders table';
    END IF;
END $$;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN tenders.individual_total IS 'Boolean flag: true for individual item pricing, false for total amount pricing';
COMMENT ON COLUMN tenders.actual_price_total IS 'Total price amount when using total pricing method (saved from stock acquisition form)';

-- Step 4: Create indexes for better performance (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenders_individual_total') THEN
        CREATE INDEX idx_tenders_individual_total ON tenders(individual_total);
    END IF;
END $$;

-- Step 5: Update existing records to use individual pricing by default
UPDATE tenders 
SET individual_total = true 
WHERE individual_total IS NULL;

-- Step 6: Verify the changes
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'tenders' AND column_name IN ('individual_total', 'actual_price_total')
ORDER BY table_name, column_name;
