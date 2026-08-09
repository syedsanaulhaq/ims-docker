-- ============================================================================
-- ADD SOFT DELETE COLUMNS TO ALL TABLES - PRODUCTION READY
-- ============================================================================
-- Run this script in SQL Server Management Studio (SSMS)
-- Compatible with SQL Server 2012+
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'ADDING SOFT DELETE COLUMNS TO ALL TABLES';
PRINT '====================================================================';
PRINT '';

-- ============================================================================
-- TENDERS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE tenders ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE tenders ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE tenders ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: tenders';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE tender_items ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE tender_items ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE tender_items ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: tender_items';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tender_vendors' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE tender_vendors ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tender_vendors' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE tender_vendors ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tender_vendors' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE tender_vendors ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: tender_vendors';
GO

-- ============================================================================
-- ANNUAL TENDERS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tenders' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE annual_tenders ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tenders' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE annual_tenders ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tenders' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE annual_tenders ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: annual_tenders';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tender_groups' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE annual_tender_groups ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tender_groups' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE annual_tender_groups ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tender_groups' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE annual_tender_groups ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: annual_tender_groups';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tender_vendors' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE annual_tender_vendors ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tender_vendors' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE annual_tender_vendors ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'annual_tender_vendors' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE annual_tender_vendors ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: annual_tender_vendors';
GO

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE purchase_orders ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE purchase_orders ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE purchase_orders ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: purchase_orders';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE purchase_order_items ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE purchase_order_items ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE purchase_order_items ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: purchase_order_items';
GO

-- ============================================================================
-- DELIVERIES
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE deliveries ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE deliveries ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE deliveries ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: deliveries';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'delivery_items' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE delivery_items ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'delivery_items' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE delivery_items ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'delivery_items' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE delivery_items ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: delivery_items';
GO

-- ============================================================================
-- STOCK MANAGEMENT
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_acquisitions' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE stock_acquisitions ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_acquisitions' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE stock_acquisitions ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_acquisitions' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE stock_acquisitions ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: stock_acquisitions';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE stock_issuance_requests ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE stock_issuance_requests ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE stock_issuance_requests ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: stock_issuance_requests';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE stock_issuance_items ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE stock_issuance_items ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE stock_issuance_items ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: stock_issuance_items';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE stock_returns ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE stock_returns ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE stock_returns ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: stock_returns';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE stock_return_items ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE stock_return_items ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE stock_return_items ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: stock_return_items';
GO

-- ============================================================================
-- MASTER DATA: ITEMS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE item_masters ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE item_masters ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE item_masters ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: item_masters';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE categories ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE categories ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE categories ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: categories';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sub_categories' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE sub_categories ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sub_categories' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE sub_categories ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sub_categories' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE sub_categories ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: sub_categories';
GO

-- ============================================================================
-- MASTER DATA: VENDORS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vendors' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE vendors ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vendors' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE vendors ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vendors' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE vendors ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: vendors';
GO

-- ============================================================================
-- ORGANIZATIONAL STRUCTURE
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE warehouses ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE warehouses ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE warehouses ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: warehouses';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wings' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE wings ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wings' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE wings ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wings' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE wings ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: wings';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sections' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE sections ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sections' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE sections ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sections' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE sections ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: sections';
GO

-- ============================================================================
-- USERS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'is_deleted')
    ALTER TABLE users ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at')
    ALTER TABLE users ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_by')
    ALTER TABLE users ADD deleted_by UNIQUEIDENTIFIER NULL;
PRINT 'Processed: users';
GO

-- ============================================================================
-- VERIFICATION
-- ============================================================================
PRINT '';
PRINT '====================================================================';
PRINT 'VERIFICATION: Tables with soft delete columns';
PRINT '====================================================================';

SELECT 
    t.TABLE_NAME,
    CASE WHEN c1.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END as has_is_deleted,
    CASE WHEN c2.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END as has_deleted_at,
    CASE WHEN c3.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END as has_deleted_by
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c1 ON t.TABLE_NAME = c1.TABLE_NAME AND c1.COLUMN_NAME = 'is_deleted'
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c2 ON t.TABLE_NAME = c2.TABLE_NAME AND c2.COLUMN_NAME = 'deleted_at'
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c3 ON t.TABLE_NAME = c3.TABLE_NAME AND c3.COLUMN_NAME = 'deleted_by'
WHERE t.TABLE_TYPE = 'BASE TABLE'
  AND t.TABLE_NAME IN (
    'tenders', 'tender_items', 'tender_vendors',
    'annual_tenders', 'annual_tender_groups', 'annual_tender_vendors',
    'purchase_orders', 'purchase_order_items',
    'deliveries', 'delivery_items',
    'stock_acquisitions', 'stock_issuance_requests', 'stock_issuance_items',
    'stock_returns', 'stock_return_items',
    'item_masters', 'categories', 'sub_categories',
    'vendors', 'warehouses', 'wings', 'sections', 'users'
  )
ORDER BY t.TABLE_NAME;
GO

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
PRINT '';
PRINT 'Creating indexes on is_deleted columns...';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tenders_IsDeleted')
    CREATE INDEX IX_Tenders_IsDeleted ON tenders(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TenderItems_IsDeleted')
    CREATE INDEX IX_TenderItems_IsDeleted ON tender_items(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PurchaseOrders_IsDeleted')
    CREATE INDEX IX_PurchaseOrders_IsDeleted ON purchase_orders(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Deliveries_IsDeleted')
    CREATE INDEX IX_Deliveries_IsDeleted ON deliveries(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StockAcquisitions_IsDeleted')
    CREATE INDEX IX_StockAcquisitions_IsDeleted ON stock_acquisitions(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ItemMasters_IsDeleted')
    CREATE INDEX IX_ItemMasters_IsDeleted ON item_masters(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Categories_IsDeleted')
    CREATE INDEX IX_Categories_IsDeleted ON categories(is_deleted);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Vendors_IsDeleted')
    CREATE INDEX IX_Vendors_IsDeleted ON vendors(is_deleted);
GO

PRINT '';
PRINT '====================================================================';
PRINT 'SOFT DELETE SETUP COMPLETE';
PRINT '====================================================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Verify all columns added (check table above)';
PRINT '  2. Update backend DELETE endpoints to use UPDATE';
PRINT '  3. Add WHERE is_deleted = 0 to SELECT queries';
PRINT '  4. Implement restore endpoints';
PRINT '';
GO
