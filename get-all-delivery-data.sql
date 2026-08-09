-- PART 2: Get delivery_items structure and all data
-- Run these queries after the deliveries table structure

-- 1. Check delivery_items table structure
SELECT 'DELIVERY_ITEMS TABLE STRUCTURE' as info;
\d delivery_items;

-- OR if \d doesn't work, use:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'delivery_items'
ORDER BY ordinal_position;

-- 2. Count records in both tables
SELECT 'RECORD COUNTS' as info;
SELECT 'deliveries' as table_name, COUNT(*) as count FROM deliveries
UNION ALL
SELECT 'delivery_items' as table_name, COUNT(*) as count FROM delivery_items;

-- 3. Show ALL deliveries (to see what data exists)
SELECT 'ALL DELIVERIES DATA' as info;
SELECT * FROM deliveries ORDER BY created_at DESC;

-- 4. Show ALL delivery_items (to see what data exists) 
SELECT 'ALL DELIVERY_ITEMS DATA' as info;
SELECT * FROM delivery_items ORDER BY created_at DESC;

-- 5. Show tenders (to understand the relationship)
SELECT 'TENDERS DATA' as info;
SELECT id, project_name, tender_number, created_at FROM tenders ORDER BY created_at DESC LIMIT 10;

-- 6. Check if any deliveries exist for specific tenders
SELECT 'DELIVERIES PER TENDER' as info;
SELECT 
    t.id as tender_id,
    t.project_name,
    t.tender_number,
    COUNT(d.id) as delivery_count
FROM tenders t
LEFT JOIN deliveries d ON t.id = d.tender_id
GROUP BY t.id, t.project_name, t.tender_number
HAVING COUNT(d.id) > 0
ORDER BY delivery_count DESC;
