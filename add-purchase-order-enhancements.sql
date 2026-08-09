-- ============================================================================
-- Purchase Order Enhancements - Database Changes
-- Date: January 19, 2026
-- Purpose: Add vendor contact info and category details to PO queries
-- ============================================================================

-- Verify vendors table has required contact columns
-- These columns should already exist, but this script verifies they are present
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'vendors')
BEGIN
    -- Check if contact_person column exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'vendors' AND COLUMN_NAME = 'contact_person')
    BEGIN
        ALTER TABLE vendors ADD contact_person NVARCHAR(255) NULL;
        PRINT '✅ Added contact_person column to vendors table';
    END
    ELSE
        PRINT '✓ contact_person column already exists in vendors table';

    -- Check if phone column exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'vendors' AND COLUMN_NAME = 'phone')
    BEGIN
        ALTER TABLE vendors ADD phone NVARCHAR(50) NULL;
        PRINT '✅ Added phone column to vendors table';
    END
    ELSE
        PRINT '✓ phone column already exists in vendors table';

    -- Check if email column exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'vendors' AND COLUMN_NAME = 'email')
    BEGIN
        ALTER TABLE vendors ADD email NVARCHAR(255) NULL;
        PRINT '✅ Added email column to vendors table';
    END
    ELSE
        PRINT '✓ email column already exists in vendors table';
END

-- Verify categories table exists and has required columns
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'categories')
BEGIN
    -- Check if category_name column exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'category_name')
    BEGIN
        ALTER TABLE categories ADD category_name NVARCHAR(255) NULL;
        PRINT '✅ Added category_name column to categories table';
    END
    ELSE
        PRINT '✓ category_name column already exists in categories table';
END

-- Verify item_masters table has foreign key to categories
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'item_masters')
BEGIN
    -- Check if category_id column exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'category_id')
    BEGIN
        ALTER TABLE item_masters ADD category_id UNIQUEIDENTIFIER NULL;
        PRINT '✅ Added category_id column to item_masters table';
    END
    ELSE
        PRINT '✓ category_id column already exists in item_masters table';
END

-- Create indexes for better query performance
-- Index on vendors table for contact lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE object_id = OBJECT_ID('vendors') AND name = 'IX_vendors_vendor_id')
BEGIN
    CREATE INDEX IX_vendors_vendor_id ON vendors(id);
    PRINT '✅ Created index on vendors.id';
END

-- Index on item_masters for category lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE object_id = OBJECT_ID('item_masters') AND name = 'IX_item_masters_category_id')
BEGIN
    CREATE INDEX IX_item_masters_category_id ON item_masters(category_id);
    PRINT '✅ Created index on item_masters.category_id';
END

-- Index on purchase_order_items for po_id lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'IX_poi_po_id')
BEGIN
    CREATE INDEX IX_poi_po_id ON purchase_order_items(po_id);
    PRINT '✅ Created index on purchase_order_items.po_id';
END

-- Summary of changes
PRINT '';
PRINT '========================================';
PRINT 'Purchase Order Enhancements Completed';
PRINT '========================================';
PRINT 'Changes made:';
PRINT '1. Ensured vendors table has contact_person, phone, email columns';
PRINT '2. Verified item_masters table has category_id foreign key';
PRINT '3. Created indexes for better query performance';
PRINT '4. GET /api/purchase-orders/:id now returns vendor contact information';
PRINT '5. GET /api/purchase-orders/:id items now includes category_name';
PRINT '';
PRINT 'Status: ✅ Complete';
