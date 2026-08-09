-- ADD MISSING FIELDS TO EXISTING STOCK ISSUANCE TABLES
-- This script adds fields needed by the enhanced approval system

USE InventoryManagementDB;

PRINT '🔧 Adding missing fields to existing stock issuance tables...';

-- =====================================================================================
-- Add missing fields to stock_issuance_requests table
-- =====================================================================================

-- Check if approved_by field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_by')
BEGIN
    ALTER TABLE stock_issuance_requests ADD approved_by NVARCHAR(450) NULL;
    PRINT '✅ Added approved_by field to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Field approved_by already exists in stock_issuance_requests';
END;

-- Check if approved_at field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_at')
BEGIN
    ALTER TABLE stock_issuance_requests ADD approved_at DATETIME2 NULL;
    PRINT '✅ Added approved_at field to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Field approved_at already exists in stock_issuance_requests';
END;

-- Check if reviewed_by field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'reviewed_by')
BEGIN
    ALTER TABLE stock_issuance_requests ADD reviewed_by NVARCHAR(450) NULL;
    PRINT '✅ Added reviewed_by field to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Field reviewed_by already exists in stock_issuance_requests';
END;

-- Check if reviewed_at field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'reviewed_at')
BEGIN
    ALTER TABLE stock_issuance_requests ADD reviewed_at DATETIME2 NULL;
    PRINT '✅ Added reviewed_at field to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Field reviewed_at already exists in stock_issuance_requests';
END;

-- Check if review_comments field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'review_comments')
BEGIN
    ALTER TABLE stock_issuance_requests ADD review_comments NVARCHAR(1000) NULL;
    PRINT '✅ Added review_comments field to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Field review_comments already exists in stock_issuance_requests';
END;

-- =====================================================================================
-- Add missing fields to stock_issuance_items table
-- =====================================================================================

-- Check if approved_quantity field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'approved_quantity')
BEGIN
    ALTER TABLE stock_issuance_items ADD approved_quantity INT NULL;
    PRINT '✅ Added approved_quantity field to stock_issuance_items';
END
ELSE
BEGIN
    PRINT '⚠️  Field approved_quantity already exists in stock_issuance_items';
END;

-- Check if item_status field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'item_status')
BEGIN
    ALTER TABLE stock_issuance_items ADD item_status NVARCHAR(50) DEFAULT 'Pending';
    PRINT '✅ Added item_status field to stock_issuance_items';
END
ELSE
BEGIN
    PRINT '⚠️  Field item_status already exists in stock_issuance_items';
END;

-- Check if rejection_reason field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'rejection_reason')
BEGIN
    ALTER TABLE stock_issuance_items ADD rejection_reason NVARCHAR(500) NULL;
    PRINT '✅ Added rejection_reason field to stock_issuance_items';
END
ELSE
BEGIN
    PRINT '⚠️  Field rejection_reason already exists in stock_issuance_items';
END;

-- =====================================================================================
-- Add missing fields to current_inventory_stock table
-- =====================================================================================

-- Check if reserved_stock field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'reserved_stock')
BEGIN
    ALTER TABLE current_inventory_stock ADD reserved_stock INT DEFAULT 0;
    PRINT '✅ Added reserved_stock field to current_inventory_stock';
END
ELSE
BEGIN
    PRINT '⚠️  Field reserved_stock already exists in current_inventory_stock';
END;

-- Check if available_stock field exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
BEGIN
    ALTER TABLE current_inventory_stock ADD available_stock INT DEFAULT 0;
    PRINT '✅ Added available_stock field to current_inventory_stock';
    
    -- Update available_stock values immediately after adding the field
    UPDATE current_inventory_stock 
    SET available_stock = current_stock - ISNULL(reserved_stock, 0);
    
    PRINT '✅ Updated available_stock values for existing records';
END
ELSE
BEGIN
    PRINT '⚠️  Field available_stock already exists in current_inventory_stock';
    
    -- Update any NULL or zero values
    UPDATE current_inventory_stock 
    SET available_stock = current_stock - ISNULL(reserved_stock, 0)
    WHERE available_stock IS NULL OR available_stock = 0;
    
    PRINT '✅ Updated NULL/zero available_stock values';
END;

-- =====================================================================================
-- Update existing item_status values
-- =====================================================================================

-- Update NULL item_status to 'Pending' for existing records
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'item_status')
BEGIN
    UPDATE stock_issuance_items 
    SET item_status = 'Pending' 
    WHERE item_status IS NULL;
    
    PRINT '✅ Updated NULL item_status values to "Pending"';
END;

-- =====================================================================================
-- Add indexes for new fields (only if fields exist)
-- =====================================================================================

-- Index on approved_by
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_issuance_requests_approved_by')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'approved_by')
BEGIN
    CREATE INDEX IX_stock_issuance_requests_approved_by ON stock_issuance_requests(approved_by);
    PRINT '✅ Created index: IX_stock_issuance_requests_approved_by';
END;

-- Index on item_status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_issuance_items_status')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_items') AND name = 'item_status')
BEGIN
    CREATE INDEX IX_stock_issuance_items_status ON stock_issuance_items(item_status);
    PRINT '✅ Created index: IX_stock_issuance_items_status';
END;

-- Index on available_stock (only if field exists)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_current_inventory_available_stock')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'available_stock')
BEGIN
    CREATE INDEX IX_current_inventory_available_stock ON current_inventory_stock(available_stock);
    PRINT '✅ Created index: IX_current_inventory_available_stock';
END;

PRINT '';
PRINT '📊 Enhanced Approval System - Field Updates Complete!';
PRINT '';
PRINT 'Fields Added:';
PRINT '  stock_issuance_requests: approved_by, approved_at, reviewed_by, reviewed_at, review_comments';
PRINT '  stock_issuance_items: approved_quantity, item_status, rejection_reason';  
PRINT '  current_inventory_stock: reserved_stock, available_stock';
PRINT '';
PRINT 'Ready for enhanced approval system!';
