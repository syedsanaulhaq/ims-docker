-- ============================================================================
-- Populate current_inventory_stock from existing opening_balance_entries
-- Run this script to fix inventory dashboard showing 0
-- ============================================================================

USE IMS;
GO

PRINT '=== Populating Inventory from Opening Balance Entries ===';
PRINT '';

-- First, check what we have
SELECT 
    'Opening Balance Entries' as Source,
    COUNT(*) as TotalRecords,
    SUM(quantity_received - ISNULL(quantity_already_issued, 0)) as TotalQuantity
FROM opening_balance_entries;

SELECT 
    'Current Inventory Stock (Before)' as Source,
    COUNT(*) as TotalRecords,
    SUM(current_quantity) as TotalQuantity
FROM current_inventory_stock;

PRINT 'Inserting/Updating inventory from opening balance entries...';

-- Insert or update current_inventory_stock from opening_balance_entries
MERGE INTO current_inventory_stock AS target
USING (
    SELECT 
        item_master_id,
        SUM(quantity_received - ISNULL(quantity_already_issued, 0)) as available_quantity,
        MAX(acquisition_date) as last_date
    FROM opening_balance_entries
    GROUP BY item_master_id
) AS source (item_master_id, available_quantity, last_date)
ON target.item_master_id = source.item_master_id
WHEN MATCHED THEN
    UPDATE SET 
        current_quantity = source.available_quantity,
        last_transaction_date = source.last_date,
        last_transaction_type = 'OPENING_BALANCE',
        last_updated = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (id, item_master_id, current_quantity, last_transaction_date, last_transaction_type, last_updated)
    VALUES (NEWID(), source.item_master_id, source.available_quantity, source.last_date, 'OPENING_BALANCE', GETDATE());

PRINT '✅ Inventory updated successfully';
PRINT '';

-- Show results
SELECT 
    'Current Inventory Stock (After)' as Source,
    COUNT(*) as TotalRecords,
    SUM(current_quantity) as TotalQuantity
FROM current_inventory_stock;

-- Show detailed inventory
SELECT 
    im.nomenclature,
    im.item_code,
    cis.current_quantity,
    cis.last_transaction_type,
    cis.last_transaction_date
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
ORDER BY im.nomenclature;

PRINT '';
PRINT '=== Done! Inventory Dashboard should now show correct values ===';
GO
