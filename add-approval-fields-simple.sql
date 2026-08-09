-- ENHANCED APPROVAL SYSTEM - FIELD UPDATES (SIMPLIFIED)
-- This script adds missing fields to existing tables step by step

USE InventoryManagementDB;

PRINT '🔧 Adding missing fields to existing stock issuance tables...';

-- =====================================================================================
-- Step 1: Add fields to stock_issuance_requests table
-- =====================================================================================

PRINT 'Step 1: Adding fields to stock_issuance_requests...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_by')
BEGIN
    ALTER TABLE stock_issuance_requests ADD approved_by NVARCHAR(450) NULL;
    PRINT '✅ Added approved_by field';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_at')
BEGIN
    ALTER TABLE stock_issuance_requests ADD approved_at DATETIME2 NULL;
    PRINT '✅ Added approved_at field';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'reviewed_by')
BEGIN
    ALTER TABLE stock_issuance_requests ADD reviewed_by NVARCHAR(450) NULL;
    PRINT '✅ Added reviewed_by field';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'reviewed_at')
BEGIN
    ALTER TABLE stock_issuance_requests ADD reviewed_at DATETIME2 NULL;
    PRINT '✅ Added reviewed_at field';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'review_comments')
BEGIN
    ALTER TABLE stock_issuance_requests ADD review_comments NVARCHAR(1000) NULL;
    PRINT '✅ Added review_comments field';
END

-- =====================================================================================
-- Step 2: Add fields to stock_issuance_items table
-- =====================================================================================

PRINT 'Step 2: Adding fields to stock_issuance_items...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'approved_quantity')
BEGIN
    ALTER TABLE stock_issuance_items ADD approved_quantity INT NULL;
    PRINT '✅ Added approved_quantity field';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'item_status')
BEGIN
    ALTER TABLE stock_issuance_items ADD item_status NVARCHAR(50) DEFAULT 'Pending';
    PRINT '✅ Added item_status field';
    
    -- Update existing records
    UPDATE stock_issuance_items SET item_status = 'Pending' WHERE item_status IS NULL;
    PRINT '✅ Updated existing records with default status';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'rejection_reason')
BEGIN
    ALTER TABLE stock_issuance_items ADD rejection_reason NVARCHAR(500) NULL;
    PRINT '✅ Added rejection_reason field';
END

-- =====================================================================================
-- Step 3: Add fields to current_inventory_stock table
-- =====================================================================================

PRINT 'Step 3: Adding fields to current_inventory_stock...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'reserved_stock')
BEGIN
    ALTER TABLE current_inventory_stock ADD reserved_stock INT DEFAULT 0;
    PRINT '✅ Added reserved_stock field';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
BEGIN
    ALTER TABLE current_inventory_stock ADD available_stock INT DEFAULT 0;
    PRINT '✅ Added available_stock field';
END

-- =====================================================================================
-- Step 4: Update available_stock values (separate step to ensure fields exist)
-- =====================================================================================

PRINT 'Step 4: Updating available_stock calculations...';

-- Check if both fields exist before updating
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'reserved_stock')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
BEGIN
    UPDATE current_inventory_stock 
    SET available_stock = current_stock - ISNULL(reserved_stock, 0)
    WHERE current_stock IS NOT NULL;
    
    PRINT '✅ Updated available_stock calculations';
END

-- =====================================================================================
-- Step 5: Create indexes (only if fields exist)
-- =====================================================================================

PRINT 'Step 5: Creating indexes...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_issuance_requests_approved_by')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_by')
BEGIN
    CREATE INDEX IX_stock_issuance_requests_approved_by ON stock_issuance_requests(approved_by);
    PRINT '✅ Created index: IX_stock_issuance_requests_approved_by';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_issuance_items_status')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'item_status')
BEGIN
    CREATE INDEX IX_stock_issuance_items_status ON stock_issuance_items(item_status);
    PRINT '✅ Created index: IX_stock_issuance_items_status';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_current_inventory_available_stock')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
BEGIN
    CREATE INDEX IX_current_inventory_available_stock ON current_inventory_stock(available_stock);
    PRINT '✅ Created index: IX_current_inventory_available_stock';
END

PRINT '';
PRINT '📊 Enhanced Approval System - Field Updates Complete!';
PRINT '';
PRINT 'Fields Added:';
PRINT '  ✅ stock_issuance_requests: approved_by, approved_at, reviewed_by, reviewed_at, review_comments';
PRINT '  ✅ stock_issuance_items: approved_quantity, item_status, rejection_reason';  
PRINT '  ✅ current_inventory_stock: reserved_stock, available_stock';
PRINT '';
PRINT 'Indexes Created:';
PRINT '  ✅ IX_stock_issuance_requests_approved_by';
PRINT '  ✅ IX_stock_issuance_items_status';
PRINT '  ✅ IX_current_inventory_available_stock';
PRINT '';
PRINT 'Ready for enhanced approval system!';
