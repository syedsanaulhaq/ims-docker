-- Add individual_total and actual_price_total fields to tenders table
-- These fields control pricing mode in transaction manager

ALTER TABLE tenders 
ADD COLUMN IF NOT EXISTS individual_total VARCHAR(20) DEFAULT 'Individual' CHECK (individual_total IN ('Individual', 'Total'));

ALTER TABLE tenders 
ADD COLUMN IF NOT EXISTS actual_price_total DECIMAL(15,2) DEFAULT 0;

-- Add comments for the new fields
COMMENT ON COLUMN tenders.individual_total IS 'Pricing mode: Individual (item-level pricing) or Total (single total price)';
COMMENT ON COLUMN tenders.actual_price_total IS 'Total actual price when using Total pricing mode';

-- Update existing tenders to have default values
UPDATE tenders 
SET individual_total = 'Individual', actual_price_total = 0 
WHERE individual_total IS NULL OR actual_price_total IS NULL;
