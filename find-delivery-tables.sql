-- Find the correct table name for deliveries
-- This query will help identify the right table structure

-- Check for tables with 'delivery' in the name
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_name ILIKE '%delivery%' 
  AND table_schema = 'public'
ORDER BY table_name;

-- Check for tables with 'stock' or 'acquisition' in the name
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE (table_name ILIKE '%stock%' OR table_name ILIKE '%acquisition%')
  AND table_schema = 'public'
ORDER BY table_name;

-- List all tables to see the structure
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
