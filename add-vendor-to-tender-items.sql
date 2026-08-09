-- Add vendor_id column to TenderItems table for vendor-specific item assignment
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'vendor_id'
)
BEGIN
    -- First, add the column as nullable
    ALTER TABLE [dbo].[TenderItems] 
    ADD [vendor_id] [uniqueidentifier] NULL;
    
    PRINT 'Column vendor_id added to TenderItems (nullable)';
END
ELSE
BEGIN
    PRINT 'vendor_id column already exists in TenderItems';
END

-- Add foreign key constraint if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'TenderItems' AND CONSTRAINT_NAME = 'FK_TenderItems_VendorId'
)
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD CONSTRAINT [FK_TenderItems_VendorId] 
    FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors]([id]) ON DELETE CASCADE;
    
    PRINT 'Foreign key constraint added successfully';
END
ELSE
BEGIN
    PRINT 'Foreign key constraint already exists';
END

-- Add indexes if they don't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IDX_TenderItems_VendorId' AND object_id = OBJECT_ID('TenderItems')
)
BEGIN
    CREATE INDEX [IDX_TenderItems_VendorId] ON [dbo].[TenderItems]([vendor_id]);
    PRINT 'Index IDX_TenderItems_VendorId created';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IDX_TenderItems_TenderId_VendorId' AND object_id = OBJECT_ID('TenderItems')
)
BEGIN
    CREATE INDEX [IDX_TenderItems_TenderId_VendorId] ON [dbo].[TenderItems]([tender_id], [vendor_id]);
    PRINT 'Index IDX_TenderItems_TenderId_VendorId created';
END

PRINT 'TenderItems schema update completed';
