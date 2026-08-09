-- Create delivery_item_serial_numbers table
-- This table stores serial numbers for items in deliveries

CREATE TABLE IF NOT EXISTS delivery_item_serial_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    delivery_item_id UUID NOT NULL, -- Reference to the specific delivery item
    item_master_id UUID NOT NULL,
    serial_number VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique serial numbers per item across all deliveries
    UNIQUE(item_master_id, serial_number),
    
    -- Ensure delivery_id and delivery_item_id are consistent
    CONSTRAINT delivery_item_consistency CHECK (delivery_item_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_delivery_id 
    ON delivery_item_serial_numbers(delivery_id);

CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_delivery_item_id 
    ON delivery_item_serial_numbers(delivery_item_id);

CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_item_master_id 
    ON delivery_item_serial_numbers(item_master_id);

CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_serial_number 
    ON delivery_item_serial_numbers(serial_number);

-- Enable Row Level Security
ALTER TABLE delivery_item_serial_numbers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read delivery item serial numbers" ON delivery_item_serial_numbers;
DROP POLICY IF EXISTS "Allow authenticated users to insert delivery item serial numbers" ON delivery_item_serial_numbers;
DROP POLICY IF EXISTS "Allow authenticated users to update delivery item serial numbers" ON delivery_item_serial_numbers;
DROP POLICY IF EXISTS "Allow authenticated users to delete delivery item serial numbers" ON delivery_item_serial_numbers;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read delivery item serial numbers" 
    ON delivery_item_serial_numbers FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert delivery item serial numbers" 
    ON delivery_item_serial_numbers FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update delivery item serial numbers" 
    ON delivery_item_serial_numbers FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete delivery item serial numbers" 
    ON delivery_item_serial_numbers FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_delivery_item_serial_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_delivery_item_serial_numbers_updated_at ON delivery_item_serial_numbers;
CREATE TRIGGER update_delivery_item_serial_numbers_updated_at
    BEFORE UPDATE ON delivery_item_serial_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_item_serial_numbers_updated_at();

-- Add helpful comments
COMMENT ON TABLE delivery_item_serial_numbers IS 'Stores serial numbers for items delivered in deliveries';
COMMENT ON COLUMN delivery_item_serial_numbers.delivery_id IS 'Reference to the delivery';
COMMENT ON COLUMN delivery_item_serial_numbers.delivery_item_id IS 'Reference to the specific delivery item record';
COMMENT ON COLUMN delivery_item_serial_numbers.item_master_id IS 'Reference to the item master record';
COMMENT ON COLUMN delivery_item_serial_numbers.serial_number IS 'The actual serial number of the item';
COMMENT ON COLUMN delivery_item_serial_numbers.notes IS 'Optional notes about this serial number entry';
