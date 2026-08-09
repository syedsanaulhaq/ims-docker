const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tukbgfnxtvdnomfvihei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1a2JnZm54dHZkbm9tZnZpaGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NTEwNzYsImV4cCI6MjA1MjUyNzA3Nn0.lV8UKNWe_gqOi3YR9tKaKJg3LU32T-8m55ZrGUvP1Qg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  const sql = `
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
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read delivery item serial numbers" 
ON delivery_item_serial_numbers FOR SELECT 
TO authenticated 
USING (true);

-- Policy for authenticated users to insert delivery item serial numbers
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert delivery item serial numbers" 
ON delivery_item_serial_numbers FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy for authenticated users to update delivery item serial numbers
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update delivery item serial numbers" 
ON delivery_item_serial_numbers FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policy for authenticated users to delete delivery item serial numbers
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete delivery item serial numbers" 
ON delivery_item_serial_numbers FOR DELETE 
TO authenticated 
USING (true);
`;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
  
  }

createTable().catch(console.error);
