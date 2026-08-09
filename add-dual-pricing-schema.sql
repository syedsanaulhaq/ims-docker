-- Add dual pricing mode support to delivery tables
-- This enables both individual item pricing and total amount distribution

-- Add pricing method and total amount fields to delivery table
ALTER TABLE delivery 
ADD COLUMN pricing_method VARCHAR(20) DEFAULT 'individual' CHECK (pricing_method IN ('individual', 'total_only'));

ALTER TABLE delivery 
ADD COLUMN total_amount DECIMAL(12,2) NULL;

-- Add comments for clarity
COMMENT ON COLUMN delivery.pricing_method IS 'Pricing method: individual (item-wise pricing) or total_only (single total amount)';
COMMENT ON COLUMN delivery.total_amount IS 'Total delivery amount when using total_only pricing method';

-- Create validation constraints
ALTER TABLE delivery 
ADD CONSTRAINT pricing_method_validation 
CHECK (
  (pricing_method = 'individual' AND total_amount IS NULL) OR
  (pricing_method = 'total_only' AND total_amount IS NOT NULL AND total_amount > 0)
);

-- Update existing records to use 'individual' method
UPDATE delivery 
SET pricing_method = 'individual' 
WHERE pricing_method IS NULL;

-- Create indexes for better performance
CREATE INDEX idx_delivery_pricing_method ON delivery(pricing_method);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'delivery' 
  AND column_name IN ('pricing_method', 'total_amount')
ORDER BY column_name;
