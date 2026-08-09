-- Script to fix item master relationship issues in stock_transactions_clean
-- This script will help identify and resolve mismatched item_master_id values

-- Step 1: Identify orphaned stock transactions (those without matching item_masters)
SELECT 
    'Orphaned Stock Transactions' as issue_type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT st.item_master_id, ', ') as orphaned_item_master_ids
FROM stock_transactions_clean st
LEFT JOIN item_masters im ON st.item_master_id = CAST(im.id AS VARCHAR(50))
WHERE im.id IS NULL;

-- Step 2: Check for data type mismatches and provide conversion
SELECT 
    'Data Type Mismatch Check' as info,
    st.item_master_id as stock_transaction_id,
    CAST(im.id AS VARCHAR(50)) as item_master_id_string,
    im.nomenclature,
    CASE 
        WHEN CAST(im.id AS VARCHAR(50)) = st.item_master_id THEN 'MATCH'
        ELSE 'NO MATCH'
    END as match_status
FROM stock_transactions_clean st
LEFT JOIN item_masters im ON CAST(im.id AS VARCHAR(50)) = st.item_master_id
ORDER BY match_status DESC;

-- Step 3: Create missing item_masters for orphaned stock transactions
-- (You may need to adjust this based on your business requirements)
INSERT INTO item_masters (
    id, 
    nomenclature, 
    unit, 
    status, 
    created_at, 
    updated_at
)
SELECT DISTINCT
    CAST(st.item_master_id AS UNIQUEIDENTIFIER) as id,
    'Unknown Item - ' + st.item_master_id as nomenclature,
    'Units' as unit,
    'Active' as status,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM stock_transactions_clean st
LEFT JOIN item_masters im ON CAST(im.id AS VARCHAR(50)) = st.item_master_id
WHERE im.id IS NULL
AND TRY_CAST(st.item_master_id AS UNIQUEIDENTIFIER) IS NOT NULL;

-- Step 4: Verify the fix
SELECT 
    'After Fix Verification' as status,
    COUNT(DISTINCT st.item_master_id) as total_stock_transaction_items,
    COUNT(DISTINCT im.id) as matched_item_masters,
    COUNT(DISTINCT st.item_master_id) - COUNT(DISTINCT im.id) as remaining_orphans
FROM stock_transactions_clean st
LEFT JOIN item_masters im ON CAST(im.id AS VARCHAR(50)) = st.item_master_id;
