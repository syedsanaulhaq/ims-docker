-- Quick database inspection to check what deliveries exist
-- Run this to see what data is actually in the database

-- 1. Check if deliveries table exists and show structure
SELECT 'DELIVERIES TABLE STRUCTURE' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'deliveries'
ORDER BY ordinal_position;

-- 2. Count total deliveries
SELECT 'TOTAL DELIVERIES COUNT' as info;
SELECT COUNT(*) as total_deliveries FROM deliveries;

-- 3. Show all deliveries (limit 10)
SELECT 'ALL DELIVERIES (SAMPLE)' as info;
SELECT id, delivery_number, tender_id, delivery_personnel, delivery_date, created_at 
FROM deliveries 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check delivery_items table structure
SELECT 'DELIVERY_ITEMS TABLE STRUCTURE' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'delivery_items'
ORDER BY ordinal_position;

-- 5. Count total delivery items
SELECT 'TOTAL DELIVERY ITEMS COUNT' as info;
SELECT COUNT(*) as total_items FROM delivery_items;

-- 6. Show sample delivery items
SELECT 'DELIVERY ITEMS (SAMPLE)' as info;
SELECT di.id, di.delivery_id, di.item_name, di.delivery_qty, di.unit_price, d.delivery_number
FROM delivery_items di
JOIN deliveries d ON di.delivery_id = d.id
ORDER BY di.created_at DESC
LIMIT 10;

-- 7. Check tenders table structure to understand the relationship
SELECT 'TENDERS TABLE STRUCTURE' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenders'
ORDER BY ordinal_position;

-- 8. Count total tenders
SELECT 'TOTAL TENDERS COUNT' as info;
SELECT COUNT(*) as total_tenders FROM tenders;

-- 9. Show tenders with their delivery counts
SELECT 'TENDERS WITH DELIVERY COUNTS' as info;
SELECT t.id, t.project_name, t.tender_number, COUNT(d.id) as delivery_count
FROM tenders t
LEFT JOIN deliveries d ON t.id = d.tender_id
GROUP BY t.id, t.project_name, t.tender_number
ORDER BY delivery_count DESC
LIMIT 10;
