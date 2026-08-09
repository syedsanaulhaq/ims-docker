-- MINIMAL APPROVAL FIELDS ADDITION SCRIPT
-- This script adds only the essential fields needed for enhanced approval system

USE InventoryManagementDB;

PRINT '🔧 Adding minimal approval fields to existing tables...';

-- =====================================================================================
-- Add essential fields to stock_issuance_requests table
-- =====================================================================================

-- Add approved_by field
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_by')
BEGIN
    ALTER TABLE stock_issuance_requests ADD approved_by NVARCHAR(450) NULL;
    PRINT '✅ Added approved_by field';
END;

-- Add approved_at field
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_at')
BEGIN
    ALTER TABLE stock_issuance_requests ADD approved_at DATETIME2 NULL;
    PRINT '✅ Added approved_at field';
END;

-- Add review_comments field
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'review_comments')
BEGIN
    ALTER TABLE stock_issuance_requests ADD review_comments NVARCHAR(1000) NULL;
    PRINT '✅ Added review_comments field';
END;

-- =====================================================================================
-- Add essential fields to stock_issuance_items table
-- =====================================================================================

-- Add approved_quantity field
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'approved_quantity')
BEGIN
    ALTER TABLE stock_issuance_items ADD approved_quantity INT NULL;
    PRINT '✅ Added approved_quantity field';
END;

-- Add item_status field
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'item_status')
BEGIN
    ALTER TABLE stock_issuance_items ADD item_status NVARCHAR(50) DEFAULT 'Pending';
    PRINT '✅ Added item_status field';
    
    -- Update existing records to have 'Pending' status
    UPDATE stock_issuance_items SET item_status = 'Pending' WHERE item_status IS NULL;
    PRINT '✅ Updated existing records with Pending status';
END;

-- Add rejection_reason field
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'rejection_reason')
BEGIN
    ALTER TABLE stock_issuance_items ADD rejection_reason NVARCHAR(500) NULL;
    PRINT '✅ Added rejection_reason field';
END;

-- =====================================================================================
-- Add fields to current_inventory_stock table (if it exists)
-- =====================================================================================

-- Check if current_inventory_stock table exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'current_inventory_stock')
BEGIN
    -- Add reserved_stock field
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'reserved_stock')
    BEGIN
        ALTER TABLE current_inventory_stock ADD reserved_stock INT DEFAULT 0;
        PRINT '✅ Added reserved_stock field';
    END;

    -- Add available_stock field
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
    BEGIN
        ALTER TABLE current_inventory_stock ADD available_stock INT DEFAULT 0;
        PRINT '✅ Added available_stock field';
    END;
END
ELSE
BEGIN
    PRINT '⚠️  current_inventory_stock table does not exist - skipping inventory fields';
END;

-- =====================================================================================
-- Update available_stock values (separate operation)
-- =====================================================================================

-- Wait a moment and then update available_stock values
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'current_inventory_stock')
AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'reserved_stock')
BEGIN
    UPDATE current_inventory_stock 
    SET available_stock = current_stock - ISNULL(reserved_stock, 0)
    WHERE available_stock = 0 OR available_stock IS NULL;
    
    PRINT '✅ Updated available_stock calculations';
END;

PRINT '';
PRINT '📊 Minimal Approval Fields Added Successfully!';
PRINT '';
PRINT 'Fields Added:';
PRINT '  ✅ stock_issuance_requests: approved_by, approved_at, review_comments';
PRINT '  ✅ stock_issuance_items: approved_quantity, item_status, rejection_reason';
PRINT '  ✅ current_inventory_stock: reserved_stock, available_stock (if table exists)';
PRINT '';
PRINT 'Ready to test enhanced approval endpoints!';
