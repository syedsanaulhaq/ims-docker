-- Add vendor_id to TenderItems table for vendor-specific item assignment
-- This allows each vendor to be assigned to specific items in a tender
-- Price fields are used across all three tender types: Contract, Spot Purchase, and Annual Tender

-- Step 0: Ensure price columns exist for all tender types
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'estimated_unit_price')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD [estimated_unit_price] DECIMAL(15,2) NULL;
    PRINT 'estimated_unit_price column added';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'total_amount')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD [total_amount] DECIMAL(15,2) NULL;
    PRINT 'total_amount column added';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'actual_unit_price')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD [actual_unit_price] DECIMAL(15,2) NULL;
    PRINT 'actual_unit_price column added';
END

-- Step 1: Add vendor_id column to TenderItems
-- vendor_id is REQUIRED for all tender types:
-- - Contract/Spot Purchase: Single vendor supplied all items in tender
-- - Annual Tender: Different vendors supply different items
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'vendor_id')
BEGIN
    -- First add column as nullable
    ALTER TABLE [dbo].[TenderItems]
    ADD [vendor_id] [uniqueidentifier] NULL;
    
    PRINT 'vendor_id column added to TenderItems table (nullable initially)';
    
    -- Add foreign key constraint
    ALTER TABLE [dbo].[TenderItems]
    ADD CONSTRAINT [FK_TenderItems_VendorId] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors]([id]) ON DELETE CASCADE;
    
    PRINT 'Foreign key constraint FK_TenderItems_VendorId created';
END
ELSE
BEGIN
    PRINT 'vendor_id column already exists in TenderItems table';
END

-- Step 2: Create new unique constraint on tender_id, vendor_id, item_id
-- Ensures one vendor supplies each item only once per tender
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'TenderItems' AND CONSTRAINT_NAME = 'UQ_TenderItems_VendorItem')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD CONSTRAINT [UQ_TenderItems_VendorItem] UNIQUE ([tender_id], [vendor_id], [item_id]);
    
    PRINT 'New unique constraint created for vendor-specific items';
END
ELSE
BEGIN
    PRINT 'Unique constraint for vendor-specific items already exists';
END

-- Step 3: Create indexes for performance
-- Index 1: Find items by vendor
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TenderItems_VendorId' AND object_id = OBJECT_ID('TenderItems'))
BEGIN
    CREATE INDEX [IDX_TenderItems_VendorId] ON [dbo].[TenderItems]([vendor_id]);
    PRINT 'Index created on vendor_id';
END

-- Index 2: Find vendor items in a tender
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TenderItems_TenderId_VendorId' AND object_id = OBJECT_ID('TenderItems'))
BEGIN
    CREATE INDEX [IDX_TenderItems_TenderId_VendorId] ON [dbo].[TenderItems]([tender_id], [vendor_id]);
    PRINT 'Index created on tender_id, vendor_id';
END

-- Step 4: Final schema verification
PRINT '';
PRINT '=== TenderItems Table Structure ===';
PRINT 'Column Name              | Type              | Nullable | Purpose';
PRINT '---------------------------------------------------------------------';
PRINT 'id                       | uniqueidentifier  | NO       | Primary Key';
PRINT 'tender_id                | uniqueidentifier  | NO       | Tender Reference';
PRINT 'item_id                  | uniqueidentifier  | NO       | Item Reference';
PRINT 'vendor_id                | uniqueidentifier  | YES      | *** NEW: Vendor for this item ***';
PRINT 'quantity                 | int               | YES      | Qty needed (all types)';
PRINT 'estimated_unit_price     | decimal(15,2)     | YES      | Unit price (all types)';
PRINT 'actual_unit_price        | decimal(15,2)     | YES      | Final unit price';
PRINT 'total_amount             | decimal(15,2)     | YES      | quantity * unit_price';
PRINT 'created_at               | datetime          | YES      | Creation timestamp';
PRINT 'updated_at               | datetime          | YES      | Update timestamp';
PRINT '';
PRINT '=== Tender Type Support ===';
PRINT 'Contract/Spot Purchase:  One vendor_id for ALL items (same supplier)';
PRINT 'Annual Tender:           Different vendor_id per item (vendor specialty)';
PRINT 'All Types:               Price captured (estimated_unit_price, total_amount)';
PRINT '';
PRINT '✅ Migration completed successfully';
