-- =====================================================
-- PRODUCTION DATABASE CLEANUP
-- Safe cleanup script for existing tables only
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '========================================';
PRINT 'PRODUCTION DATABASE CLEANUP';
PRINT '========================================';
GO

-- Disable all FK constraints
PRINT '';
PRINT '1️⃣  Disabling foreign key constraints...';
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
PRINT '   ✅ All FK constraints disabled';
GO

-- Delete data in reverse dependency order (only tables that exist)
PRINT '';
PRINT '2️⃣  Clearing data from tables...';
GO

IF OBJECT_ID('delivery_items', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing delivery_items...';
    DELETE FROM delivery_items;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('deliveries', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing deliveries...';
    DELETE FROM deliveries;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('stock_issuance_items', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing stock_issuance_items...';
    DELETE FROM stock_issuance_items;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('stock_issuance_requests', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing stock_issuance_requests...';
    DELETE FROM stock_issuance_requests;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('purchase_order_items', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing purchase_order_items...';
    DELETE FROM purchase_order_items;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing purchase_orders...';
    DELETE FROM purchase_orders;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('tender_items', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing tender_items...';
    DELETE FROM tender_items;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('tenders', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing tenders...';
    DELETE FROM tenders;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('current_inventory_stock', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing current_inventory_stock...';
    DELETE FROM current_inventory_stock;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('item_masters', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing item_masters...';
    DELETE FROM item_masters;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('categories', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing categories...';
    DELETE FROM categories;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('vendors', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing vendors...';
    DELETE FROM vendors;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

IF OBJECT_ID('stock_returns', 'U') IS NOT NULL
BEGIN
    PRINT '   Clearing stock_returns...';
    DELETE FROM stock_returns;
    PRINT '   ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
END
GO

-- Re-enable all FK constraints
PRINT '';
PRINT '3️⃣  Re-enabling foreign key constraints...';
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
PRINT '   ✅ All FK constraints re-enabled';
GO

PRINT '';
PRINT '========================================';
PRINT '✅ CLEANUP COMPLETED SUCCESSFULLY';
PRINT '========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run GENERATE-INSERT-STATEMENTS.sql on LOCAL database';
PRINT '  2. Copy all INSERT statements from output';
PRINT '  3. Create LOCAL-DATA-INSERT-STATEMENTS.sql file';
PRINT '  4. Run on PRODUCTION database to populate data';
PRINT '';
PRINT '========================================';
GO
