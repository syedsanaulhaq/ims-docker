-- Create delivery_item_serial_numbers table
CREATE TABLE IF NOT EXISTS delivery_item_serial_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_item_id UUID NOT NULL,
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  item_master_id UUID NOT NULL,
  serial_number TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_delivery_item_id 
ON delivery_item_serial_numbers(delivery_item_id);

CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_delivery_id 
ON delivery_item_serial_numbers(delivery_id);

CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_item_master_id 
ON delivery_item_serial_numbers(item_master_id);

CREATE INDEX IF NOT EXISTS idx_delivery_item_serial_numbers_serial_number 
ON delivery_item_serial_numbers(serial_number);

-- Add unique constraint to prevent duplicate serial numbers per item
CREATE UNIQUE INDEX IF NOT EXISTS unique_serial_per_item 
ON delivery_item_serial_numbers(item_master_id, serial_number);

-- Add RLS policies
ALTER TABLE delivery_item_serial_numbers ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all delivery item serial numbers
CREATE POLICY "Allow authenticated users to read delivery item serial numbers" 
ON delivery_item_serial_numbers FOR SELECT 
TO authenticated 
USING (true);

-- Policy for authenticated users to insert delivery item serial numbers
CREATE POLICY "Allow authenticated users to insert delivery item serial numbers" 
ON delivery_item_serial_numbers FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy for authenticated users to update delivery item serial numbers
CREATE POLICY "Allow authenticated users to update delivery item serial numbers" 
ON delivery_item_serial_numbers FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policy for authenticated users to delete delivery item serial numbers
CREATE POLICY "Allow authenticated users to delete delivery item serial numbers" 
ON delivery_item_serial_numbers FOR DELETE 
TO authenticated 
USING (true);

-- Add comments for documentation
COMMENT ON TABLE delivery_item_serial_numbers IS 'Serial numbers for items in delivery records';
COMMENT ON COLUMN delivery_item_serial_numbers.delivery_item_id IS 'Reference to delivery_items (though not enforced by FK due to current schema)';
COMMENT ON COLUMN delivery_item_serial_numbers.delivery_id IS 'Reference to the delivery record';
COMMENT ON COLUMN delivery_item_serial_numbers.item_master_id IS 'Reference to the item master record';
COMMENT ON COLUMN delivery_item_serial_numbers.serial_number IS 'Unique serial number for the delivered item';
COMMENT ON COLUMN delivery_item_serial_numbers.notes IS 'Optional notes about the serial number or item condition';
