-- COMPREHENSIVE PHANTOM INVENTORY CLEANUP
-- This script identifies and removes items from current_inventory_stock that have no actual stock transactions

-- Step 1: Identify phantom items (in current_inventory_stock but no IN transactions)
WITH phantom_items AS (
    SELECT 
        cis.id as stock_id,
        cis.current_quantity,
        cis.available_quantity,
        im.nomenclature,
        im.unit,
        -- Check if there are any IN transactions for this item
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM stock_transactions st 
                WHERE st.item = im.nomenclature 
                AND st.type = 'IN'
            ) THEN 'HAS_TRANSACTIONS'
            ELSE 'NO_TRANSACTIONS'
        END as transaction_status,
        -- Get total IN quantity from transactions
        COALESCE((
            SELECT SUM(st.quantity) 
            FROM stock_transactions st 
            WHERE st.item = im.nomenclature 
            AND st.type = 'IN'
        ), 0) as total_received_qty,
        -- Get total OUT quantity from transactions  
        COALESCE((
            SELECT SUM(st.quantity) 
            FROM stock_transactions st 
            WHERE st.item = im.nomenclature 
            AND st.type = 'OUT'
        ), 0) as total_issued_qty
    FROM current_inventory_stock cis
    JOIN item_masters im ON cis.item_master_id = im.id
)
SELECT 
    'PHANTOM ITEMS REPORT' as report_type,
    stock_id,
    nomenclature,
    unit,
    current_quantity,
    available_quantity,
    transaction_status,
    total_received_qty,
    total_issued_qty,
    CASE 
        WHEN transaction_status = 'NO_TRANSACTIONS' AND current_quantity = 0 
        THEN 'SHOULD_DELETE - No transactions and zero stock'
        WHEN transaction_status = 'NO_TRANSACTIONS' AND current_quantity > 0 
        THEN 'INVESTIGATE - No transactions but has stock value'
        WHEN transaction_status = 'HAS_TRANSACTIONS' AND total_received_qty != current_quantity + total_issued_qty
        THEN 'MISMATCH - Stock quantity does not match transaction history'
        ELSE 'OK - Stock matches transactions'
    END as recommendation
FROM phantom_items
ORDER BY 
    CASE 
        WHEN transaction_status = 'NO_TRANSACTIONS' THEN 0 
        ELSE 1 
    END,
    nomenclature;

-- Step 2: Show items that should be deleted (no transactions, zero stock)
SELECT 
    'ITEMS TO DELETE' as action,
    cis.id as stock_id,
    im.nomenclature,
    im.unit,
    cis.current_quantity,
    cis.available_quantity
FROM current_inventory_stock cis
JOIN item_masters im ON cis.item_master_id = im.id
WHERE NOT EXISTS (
    SELECT 1 FROM stock_transactions st 
    WHERE st.item = im.nomenclature 
    AND st.type = 'IN'
)
AND cis.current_quantity = 0
AND cis.available_quantity = 0;

-- Step 3: Show what's in tenders for these phantom items
SELECT 
    'TENDER REFERENCES' as info_type,
    t.tender_number,
    t.tender_title,
    t.status as tender_status,
    ti.item_name,
    ti.quantity as tender_quantity,
    ti.unit,
    ti.estimated_cost
FROM tenders t
JOIN tender_items ti ON t.id = ti.tender_id
WHERE ti.item_name IN (
    SELECT im.nomenclature
    FROM current_inventory_stock cis
    JOIN item_masters im ON cis.item_master_id = im.id
    WHERE NOT EXISTS (
        SELECT 1 FROM stock_transactions st 
        WHERE st.item = im.nomenclature 
        AND st.type = 'IN'
    )
    AND cis.current_quantity = 0
)
ORDER BY t.tender_number, ti.item_name;

-- CLEANUP COMMANDS (Run these manually after reviewing above results)
/*
-- DELETE PHANTOM ITEMS (Only run after confirming the above analysis)
DELETE FROM current_inventory_stock 
WHERE id IN (
    SELECT cis.id
    FROM current_inventory_stock cis
    JOIN item_masters im ON cis.item_master_id = im.id
    WHERE NOT EXISTS (
        SELECT 1 FROM stock_transactions st 
        WHERE st.item = im.nomenclature 
        AND st.type = 'IN'
    )
    AND cis.current_quantity = 0
    AND cis.available_quantity = 0
);
*/
