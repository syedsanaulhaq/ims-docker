-- ============================================================================
-- Fix: Create vw_stock_quantity_breakdown view with proper syntax
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '✅ Dropping old view if exists...';
DROP VIEW IF EXISTS vw_stock_quantity_breakdown;
GO

PRINT 'Creating vw_stock_quantity_breakdown view...';
GO

CREATE VIEW vw_stock_quantity_breakdown AS
SELECT 
    im.id as item_master_id,
    im.nomenclature,
    im.item_code,
    im.unit,
    im.specifications,
    c.id as category_id,
    c.category_name,
    sc.id as sub_category_id,
    sc.sub_category_name,
    
    -- Opening Balance (OPB entries from 2020+ historical stock)
    ISNULL(SUM(CASE 
        WHEN sa.acquisition_number LIKE 'OPB-%' 
        THEN sa.quantity_available 
        ELSE 0 
    END), 0) as opening_balance_quantity,
    
    -- New Acquisitions (regular deliveries after system started + legacy stock from current_inventory_stock)
    ISNULL(SUM(CASE 
        WHEN sa.acquisition_number NOT LIKE 'OPB-%' AND sa.acquisition_number IS NOT NULL
        THEN sa.quantity_available 
        ELSE 0 
    END), 0) + ISNULL(cis.current_quantity, 0) as new_acquisition_quantity,
    
    -- Total Stock = Opening Balance + New Acquisitions + Legacy Stock
    ISNULL(SUM(sa.quantity_available), 0) + ISNULL(cis.current_quantity, 0) as total_quantity,
    
    -- Additional metrics
    ISNULL(SUM(sa.quantity_received), 0) as total_received,
    ISNULL(SUM(sa.quantity_issued), 0) as total_issued,
    
    -- Stock status (use latest from either stock_acquisitions or current_inventory_stock)
    CASE 
        WHEN MAX(sa.updated_at) > cis.last_updated OR cis.last_updated IS NULL 
        THEN MAX(sa.updated_at)
        ELSE cis.last_updated
    END as last_transaction_date,
    
    -- Count of acquisition records
    COUNT(sa.id) as acquisition_count,
    COUNT(CASE WHEN sa.acquisition_number LIKE 'OPB-%' THEN 1 END) as opening_balance_count,
    COUNT(CASE WHEN sa.acquisition_number NOT LIKE 'OPB-%' THEN 1 END) as new_acquisition_count

FROM item_masters im
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN stock_acquisitions sa ON im.id = sa.item_master_id
LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id

GROUP BY 
    im.id,
    im.nomenclature,
    im.item_code,
    im.unit,
    im.specifications,
    c.id,
    c.category_name,
    sc.id,
    sc.sub_category_name,
    cis.current_quantity,
    cis.last_updated;

GO

PRINT '✅ View vw_stock_quantity_breakdown created successfully!';

-- Test the view
PRINT '';
PRINT 'Testing the view...';
SELECT TOP 5 
    nomenclature,
    opening_balance_quantity,
    new_acquisition_quantity,
    total_quantity
FROM vw_stock_quantity_breakdown 
WHERE total_quantity > 0 
ORDER BY total_quantity DESC;

PRINT '';
PRINT '✅ View is working correctly!';
GO
