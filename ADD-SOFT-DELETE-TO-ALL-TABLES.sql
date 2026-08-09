-- ============================================================================
-- ADD SOFT DELETE COLUMNS TO ALL TABLES
-- ============================================================================
-- This script adds soft delete columns to all main tables in the system
-- Columns added: is_deleted (BIT), deleted_at (DATETIME), deleted_by (UNIQUEIDENTIFIER)
-- ============================================================================

USE InventoryManagementDB;
GO

-- ============================================================================
-- Helper procedure to add soft delete columns to a table
-- ============================================================================
CREATE OR ALTER PROCEDURE AddSoftDeleteColumns
    @TableName NVARCHAR(128)
AS
BEGIN
    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @ColumnsAdded INT = 0;
    
    PRINT 'Processing table: ' + @TableName;
    
    -- Check and add is_deleted
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'is_deleted')
    BEGIN
        SET @SQL = 'ALTER TABLE ' + QUOTENAME(@TableName) + ' ADD is_deleted BIT NOT NULL DEFAULT 0';
        EXEC sp_executesql @SQL;
        PRINT '  ✅ Added is_deleted column';
        SET @ColumnsAdded = @ColumnsAdded + 1;
    END
    ELSE
    BEGIN
        PRINT '  ℹ️  is_deleted column already exists';
    END
    
    -- Check and add deleted_at
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'deleted_at')
    BEGIN
        SET @SQL = 'ALTER TABLE ' + QUOTENAME(@TableName) + ' ADD deleted_at DATETIME NULL';
        EXEC sp_executesql @SQL;
        PRINT '  ✅ Added deleted_at column';
        SET @ColumnsAdded = @ColumnsAdded + 1;
    END
    ELSE
    BEGIN
        PRINT '  ℹ️  deleted_at column already exists';
    END
    
    -- Check and add deleted_by
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'deleted_by')
    BEGIN
        SET @SQL = 'ALTER TABLE ' + QUOTENAME(@TableName) + ' ADD deleted_by UNIQUEIDENTIFIER NULL';
        EXEC sp_executesql @SQL;
        PRINT '  ✅ Added deleted_by column';
        SET @ColumnsAdded = @ColumnsAdded + 1;
    END
    ELSE
    BEGIN
        PRINT '  ℹ️  deleted_by column already exists';
    END
    
    IF @ColumnsAdded > 0
        PRINT '  ✅ Added ' + CAST(@ColumnsAdded AS VARCHAR) + ' column(s) to ' + @TableName;
    ELSE
        PRINT '  ✅ All columns already exist in ' + @TableName;
        
    PRINT '';
END
GO

-- ============================================================================
-- Apply soft delete columns to all main tables
-- ============================================================================

PRINT '====================================================================';
PRINT 'ADDING SOFT DELETE COLUMNS TO ALL TABLES';
PRINT '====================================================================';
PRINT '';
PRINT 'Step 1: Core Business Tables';
PRINT '========================================';
PRINT '';

-- Tenders
EXEC AddSoftDeleteColumns 'tenders';
EXEC AddSoftDeleteColumns 'tender_items';
EXEC AddSoftDeleteColumns 'tender_vendors';

-- Annual Tenders
EXEC AddSoftDeleteColumns 'annual_tenders';
EXEC AddSoftDeleteColumns 'annual_tender_groups';
EXEC AddSoftDeleteColumns 'annual_tender_vendors';

-- Purchase Orders
EXEC AddSoftDeleteColumns 'purchase_orders';
EXEC AddSoftDeleteColumns 'purchase_order_items';

-- Deliveries
EXEC AddSoftDeleteColumns 'deliveries';
EXEC AddSoftDeleteColumns 'delivery_items';

-- Stock Management
EXEC AddSoftDeleteColumns 'stock_acquisitions';
EXEC AddSoftDeleteColumns 'stock_issuance_requests';
EXEC AddSoftDeleteColumns 'stock_issuance_items';
EXEC AddSoftDeleteColumns 'stock_returns';
EXEC AddSoftDeleteColumns 'stock_return_items';

PRINT '';
PRINT 'Step 2: Master Data Tables';
PRINT '========================================';
PRINT '';

-- Items
EXEC AddSoftDeleteColumns 'item_masters';
EXEC AddSoftDeleteColumns 'categories';
EXEC AddSoftDeleteColumns 'sub_categories';

-- Vendors
EXEC AddSoftDeleteColumns 'vendors';

-- Organizational Structure
EXEC AddSoftDeleteColumns 'warehouses';
EXEC AddSoftDeleteColumns 'wings';
EXEC AddSoftDeleteColumns 'sections';

-- Users (be careful with this)
EXEC AddSoftDeleteColumns 'users';

PRINT '';
PRINT 'Step 3: Supporting Tables';
PRINT '========================================';
PRINT '';

-- Verification & Approval
IF OBJECT_ID('inventory_verification_requests', 'U') IS NOT NULL
    EXEC AddSoftDeleteColumns 'inventory_verification_requests';

IF OBJECT_ID('acquisition_approvals', 'U') IS NOT NULL
    EXEC AddSoftDeleteColumns 'acquisition_approvals';

IF OBJECT_ID('issuance_approvals', 'U') IS NOT NULL
    EXEC AddSoftDeleteColumns 'issuance_approvals';

-- Reorder Requests
IF OBJECT_ID('reorder_requests', 'U') IS NOT NULL
    EXEC AddSoftDeleteColumns 'reorder_requests';

-- Item Groups
IF OBJECT_ID('item_groups', 'U') IS NOT NULL
    EXEC AddSoftDeleteColumns 'item_groups';

IF OBJECT_ID('group_items', 'U') IS NOT NULL
    EXEC AddSoftDeleteColumns 'group_items';

PRINT '';
PRINT '====================================================================';
PRINT '✅ SOFT DELETE COLUMNS ADDED SUCCESSFULLY';
PRINT '====================================================================';
PRINT '';

-- ============================================================================
-- Verification: Show all tables with soft delete columns
-- ============================================================================
PRINT 'Verification: Tables with soft delete columns';
PRINT '========================================';
PRINT '';

SELECT 
    t.TABLE_NAME,
    CASE WHEN c1.COLUMN_NAME IS NOT NULL THEN '✅' ELSE '❌' END as has_is_deleted,
    CASE WHEN c2.COLUMN_NAME IS NOT NULL THEN '✅' ELSE '❌' END as has_deleted_at,
    CASE WHEN c3.COLUMN_NAME IS NOT NULL THEN '✅' ELSE '❌' END as has_deleted_by
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
-- Create indexes on is_deleted for better query performance
-- ============================================================================
PRINT '';
PRINT 'Creating indexes on is_deleted columns...';
PRINT '';

-- Only create if table exists and index doesn't exist
IF OBJECT_ID('tenders', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tenders_IsDeleted' AND object_id = OBJECT_ID('tenders'))
BEGIN
    CREATE INDEX IX_Tenders_IsDeleted ON tenders(is_deleted);
    PRINT '  ✅ Created index on tenders';
END
    
IF OBJECT_ID('tender_items', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TenderItems_IsDeleted' AND object_id = OBJECT_ID('tender_items'))
BEGIN
    CREATE INDEX IX_TenderItems_IsDeleted ON tender_items(is_deleted);
    PRINT '  ✅ Created index on tender_items';
END
    
IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PurchaseOrders_IsDeleted' AND object_id = OBJECT_ID('purchase_orders'))
BEGIN
    CREATE INDEX IX_PurchaseOrders_IsDeleted ON purchase_orders(is_deleted);
    PRINT '  ✅ Created index on purchase_orders';
END
    
IF OBJECT_ID('deliveries', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Deliveries_IsDeleted' AND object_id = OBJECT_ID('deliveries'))
BEGIN
    CREATE INDEX IX_Deliveries_IsDeleted ON deliveries(is_deleted);
    PRINT '  ✅ Created index on deliveries';
END
    
IF OBJECT_ID('stock_acquisitions', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcquisitions_IsDeleted' AND object_id = OBJECT_ID('stock_acquisitions'))
BEGIN
    CREATE INDEX IX_StockAcquisitions_IsDeleted ON stock_acquisitions(is_deleted);
    PRINT '  ✅ Created index on stock_acquisitions';
END
    
IF OBJECT_ID('item_masters', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ItemMasters_IsDeleted' AND object_id = OBJECT_ID('item_masters'))
BEGIN
    CREATE INDEX IX_ItemMasters_IsDeleted ON item_masters(is_deleted);
    PRINT '  ✅ Created index on item_masters';
END
    
IF OBJECT_ID('categories', 'U') IS NOT NULL AND NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Categories_IsDeleted' AND object_id = OBJECT_ID('categories'))
BEGIN
    CREATE INDEX IX_Categories_IsDeleted ON categories(is_deleted);
    PRINT '  ✅ Created index on categories';
END

PRINT '✅ Indexes created/verified';
PRINT '';

-- ============================================================================
-- Clean up helper procedure
-- ============================================================================
DROP PROCEDURE IF EXISTS AddSoftDeleteColumns;
GO

PRINT '====================================================================';
PRINT '🎉 SOFT DELETE SETUP COMPLETE';
PRINT '====================================================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Review the verification results above';
PRINT '  2. Update backend DELETE endpoints to use UPDATE instead';
PRINT '  3. Update all SELECT queries to include WHERE is_deleted = 0';
PRINT '  4. Implement restore endpoints';
PRINT '  5. Create trash/archive UI views';
PRINT '';
PRINT 'See SOFT-DELETE-IMPLEMENTATION-GUIDE.md for detailed instructions';
PRINT '';
PRINT '====================================================================';
GO
