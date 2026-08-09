-- =====================================================
-- DATA MIGRATION SCRIPT - OLD TO NEW CLEAN STRUCTURE
-- =====================================================
-- This script migrates existing data from the old structure 
-- to the new clean inventory database structure

USE InventoryManagementDB;
GO

PRINT '===============================================';
PRINT 'STARTING DATA MIGRATION TO CLEAN STRUCTURE';
PRINT '===============================================';

-- =====================================================
-- 1. BACKUP EXISTING TABLES (SAFETY MEASURE)
-- =====================================================
PRINT 'Creating backup tables...';

-- Backup current_inventory_stock
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'current_inventory_stock')
BEGIN
    SELECT * INTO current_inventory_stock_backup FROM current_inventory_stock;
    PRINT 'Backed up current_inventory_stock to current_inventory_stock_backup';
END

-- Backup item_masters if exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'item_masters_old')
BEGIN
    SELECT * INTO item_masters_backup FROM item_masters;
    PRINT 'Backed up existing item_masters to item_masters_backup';
END

-- =====================================================
-- 2. MIGRATE ITEM MASTERS DATA
-- =====================================================
PRINT 'Migrating item masters data...';

-- Check if we have existing item masters data to migrate
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'current_inventory_stock')
BEGIN
    -- Insert item masters from current_inventory_stock if they don't exist in new structure
    INSERT INTO item_masters (id, item_code, nomenclature, category_id, unit, minimum_stock_level, maximum_stock_level, reorder_point, status, created_at)
    SELECT DISTINCT
        cis.item_master_id as id,
        COALESCE(im_old.item_code, 'ITM-' + RIGHT('000000' + CAST(ROW_NUMBER() OVER (ORDER BY cis.item_master_id) AS NVARCHAR(6)), 6)) as item_code,
        COALESCE(im_old.nomenclature, 'Unknown Item') as nomenclature,
        COALESCE(im_old.category_id, (SELECT TOP 1 id FROM categories)) as category_id,
        COALESCE(im_old.unit, 'PCS') as unit,
        COALESCE(cis.minimum_stock_level, im_old.minimum_stock_level, 0) as minimum_stock_level,
        COALESCE(cis.maximum_stock_level, im_old.maximum_stock_level, 0) as maximum_stock_level,
        COALESCE(cis.reorder_point, im_old.reorder_level, 0) as reorder_point,
        'ACTIVE' as status,
        GETDATE() as created_at
    FROM current_inventory_stock cis
    LEFT JOIN item_masters_backup im_old ON cis.item_master_id = im_old.id
    WHERE cis.item_master_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM item_masters WHERE id = cis.item_master_id);
      
    PRINT 'Migrated item masters from current_inventory_stock';
END

-- =====================================================
-- 3. CREATE INITIAL STOCK TRANSACTIONS
-- =====================================================
PRINT 'Creating initial stock transactions...';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'current_inventory_stock')
BEGIN
    -- Create initial stock transactions for existing inventory
    INSERT INTO stock_transactions (
        id, transaction_number, item_master_id, transaction_type, quantity,
        unit_price, total_value, reference_type, reference_number,
        transaction_date, remarks, created_by, created_at, status
    )
    SELECT 
        NEWID() as id,
        'TXN-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '-' + 
        RIGHT('0000' + CAST(ROW_NUMBER() OVER (ORDER BY cis.item_master_id) AS NVARCHAR(4)), 4) as transaction_number,
        cis.item_master_id,
        'INITIAL' as transaction_type,
        ISNULL(cis.current_quantity, 0) as quantity,
        NULL as unit_price,
        NULL as total_value,
        'MIGRATION' as reference_type,
        'DATA-MIGRATION-' + FORMAT(GETDATE(), 'yyyyMMdd') as reference_number,
        GETDATE() as transaction_date,
        'Initial stock from data migration on ' + FORMAT(GETDATE(), 'yyyy-MM-dd') as remarks,
        (SELECT TOP 1 Id FROM AspNetUsers) as created_by, -- Use first available user
        GETDATE() as created_at,
        'ACTIVE' as status
    FROM current_inventory_stock cis
    WHERE cis.item_master_id IS NOT NULL 
      AND ISNULL(cis.current_quantity, 0) > 0
      AND EXISTS (SELECT 1 FROM item_masters WHERE id = cis.item_master_id);
      
    PRINT 'Created initial stock transactions from current_inventory_stock';
END

-- =====================================================
-- 4. MIGRATE STOCK TRANSACTIONS FROM EXISTING DATA
-- =====================================================
PRINT 'Migrating existing stock transactions...';

-- Migrate from stock_transactions_clean if it exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_transactions_clean')
BEGIN
    INSERT INTO stock_transactions (
        id, transaction_number, item_master_id, transaction_type, quantity,
        unit_price, total_value, reference_type, reference_id,
        transaction_date, remarks, created_by, created_at, status
    )
    SELECT 
        stc.id,
        'TXN-' + CAST(YEAR(ISNULL(stc.created_at, GETDATE())) AS NVARCHAR(4)) + '-' + 
        RIGHT('0000' + CAST(ROW_NUMBER() OVER (ORDER BY stc.created_at) AS NVARCHAR(4)), 4) as transaction_number,
        stc.item_master_id,
        CASE 
            WHEN stc.type = 'received' THEN 'RECEIVED'
            WHEN stc.type = 'issued' THEN 'ISSUED'
            WHEN stc.type = 'returned' THEN 'RETURNED'
            ELSE 'RECEIVED'
        END as transaction_type,
        ISNULL(stc.total_quantity_received, 0) as quantity,
        stc.actual_unit_price as unit_price,
        (ISNULL(stc.total_quantity_received, 0) * ISNULL(stc.actual_unit_price, 0)) as total_value,
        'TENDER' as reference_type,
        stc.tender_id as reference_id,
        ISNULL(stc.created_at, GETDATE()) as transaction_date,
        stc.remarks,
        (SELECT TOP 1 Id FROM AspNetUsers) as created_by,
        ISNULL(stc.created_at, GETDATE()) as created_at,
        CASE WHEN stc.is_deleted = 1 THEN 'CANCELLED' ELSE 'ACTIVE' END as status
    FROM stock_transactions_clean stc
    WHERE stc.item_master_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM item_masters WHERE id = stc.item_master_id)
      AND NOT EXISTS (SELECT 1 FROM stock_transactions WHERE id = stc.id);
      
    PRINT 'Migrated transactions from stock_transactions_clean';
END

-- =====================================================
-- 5. VERIFY ORGANIZATIONAL STRUCTURE
-- =====================================================
PRINT 'Verifying organizational structure...';

-- Check if we have DEC_MST data (using existing organizational structure)
DECLARE @DecCount INT;
SELECT @DecCount = COUNT(*) FROM DEC_MST;

IF @DecCount > 0
BEGIN
    PRINT 'Found ' + CAST(@DecCount AS NVARCHAR(10)) + ' DEC records in organizational structure';
END
ELSE
BEGIN
    PRINT 'Warning: No DEC_MST records found. Please ensure organizational structure is properly set up.';
END

-- =====================================================
-- 6. UPDATE CURRENT STOCK LEVELS
-- =====================================================
PRINT 'Updating current stock levels...';
EXEC sp_UpdateCurrentStockLevels;

-- =====================================================
-- 7. VALIDATION AND SUMMARY
-- =====================================================
PRINT 'Performing validation...';

-- Count migrated records
DECLARE @ItemCount INT, @TransactionCount INT, @StockLevelCount INT;

SELECT @ItemCount = COUNT(*) FROM item_masters WHERE status = 'ACTIVE';
SELECT @TransactionCount = COUNT(*) FROM stock_transactions WHERE status = 'ACTIVE';
SELECT @StockLevelCount = COUNT(*) FROM current_stock_levels WHERE current_quantity > 0;

PRINT '===============================================';
PRINT 'MIGRATION COMPLETED SUCCESSFULLY!';
PRINT '===============================================';
PRINT 'Summary:';
PRINT '- Item Masters: ' + CAST(@ItemCount AS NVARCHAR(10)) + ' records';
PRINT '- Stock Transactions: ' + CAST(@TransactionCount AS NVARCHAR(10)) + ' records';
PRINT '- Current Stock Levels: ' + CAST(@StockLevelCount AS NVARCHAR(10)) + ' items with stock';
PRINT '===============================================';

-- Show sample data
PRINT 'Sample migrated data:';
SELECT TOP 5 
    im.item_code,
    im.nomenclature,
    csl.current_quantity,
    csl.stock_status
FROM item_masters im
LEFT JOIN current_stock_levels csl ON im.id = csl.item_master_id
ORDER BY im.created_at DESC;

-- =====================================================
-- 8. CLEANUP RECOMMENDATIONS
-- =====================================================
PRINT '===============================================';
PRINT 'POST-MIGRATION CLEANUP RECOMMENDATIONS:';
PRINT '===============================================';
PRINT '1. Review and verify migrated data accuracy';
PRINT '2. Update item codes and nomenclature if needed';
PRINT '3. Set proper minimum/maximum stock levels';
PRINT '4. Test the new inventory management system';
PRINT '5. Once satisfied, consider dropping old tables:';
PRINT '   - DROP TABLE current_inventory_stock_backup;';
PRINT '   - DROP TABLE item_masters_backup;';
PRINT '   - DROP TABLE current_inventory_stock;';
PRINT '   - DROP TABLE stock_transactions_clean;';
PRINT '===============================================';
PRINT 'MIGRATION SCRIPT COMPLETED!';
PRINT '===============================================';
