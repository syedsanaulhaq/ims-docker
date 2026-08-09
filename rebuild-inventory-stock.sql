-- REBUILD current_inventory_stock with proper data from delivery_items
-- This will ensure the inventory dashboard shows correct data

-- Step 1: Clear current_inventory_stock (it might be empty)
DELETE FROM current_inventory_stock;

-- Step 2: Insert items that have been actually delivered
WITH delivered_items AS (
    SELECT DISTINCT
        di.item_master_id,
        di.item_name,
        SUM(di.delivery_qty) as total_delivered,
        -- Use latest delivery info for pricing if available
        AVG(COALESCE(di.unit_price, 100)) as avg_price
    FROM delivery_items di
    WHERE di.item_master_id IS NOT NULL
      AND di.delivery_qty > 0
    GROUP BY di.item_master_id, di.item_name
),
stock_usage AS (
    SELECT 
        im.id as item_master_id,
        im.nomenclature,
        COALESCE(SUM(CASE WHEN st.type = 'OUT' THEN st.quantity ELSE 0 END), 0) as total_issued
    FROM item_masters im
    LEFT JOIN stock_transactions st ON LOWER(st.item) = LOWER(im.nomenclature)
    GROUP BY im.id, im.nomenclature
)
INSERT INTO current_inventory_stock (
    item_master_id,
    current_quantity,
    available_quantity,
    reserved_quantity,
    minimum_stock_level,
    reorder_point,
    maximum_stock_level,
    last_updated
)
SELECT 
    di.item_master_id,
    -- Current quantity = delivered - issued
    GREATEST(0, di.total_delivered - COALESCE(su.total_issued, 0)) as current_quantity,
    -- Available = current (assuming no reservations for now)
    GREATEST(0, di.total_delivered - COALESCE(su.total_issued, 0)) as available_quantity,
    0 as reserved_quantity,
    -- Set reasonable defaults
    GREATEST(5, ROUND(di.total_delivered * 0.1)) as minimum_stock_level,
    GREATEST(10, ROUND(di.total_delivered * 0.2)) as reorder_point,
    GREATEST(50, ROUND(di.total_delivered * 1.5)) as maximum_stock_level,
    NOW() as last_updated
FROM delivered_items di
LEFT JOIN stock_usage su ON di.item_master_id = su.item_master_id
WHERE di.total_delivered > 0;

-- Step 3: Verify the results
SELECT 
    COUNT(*) as total_items,
    SUM(current_quantity) as total_stock,
    SUM(available_quantity) as total_available,
    COUNT(CASE WHEN current_quantity > 0 THEN 1 END) as items_with_stock
FROM current_inventory_stock;

-- Step 4: Show sample data
SELECT 
    cis.id,
    im.nomenclature,
    cis.current_quantity,
    cis.available_quantity,
    cis.minimum_stock_level
FROM current_inventory_stock cis
JOIN item_masters im ON cis.item_master_id = im.id
ORDER BY cis.current_quantity DESC
LIMIT 10;
