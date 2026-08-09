-- ========================================================================
-- ADD vendor_id COLUMN TO CORRECT tender_items TABLE
-- ========================================================================
-- CRITICAL: Add vendor_id to tender_items (lowercase) - the CORRECT table
-- This allows annual-tenders to store per-item vendor assignments
-- ========================================================================

BEGIN TRANSACTION

-- Step 1: Add vendor_id column to tender_items (if it doesn't exist)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'vendor_id'
)
BEGIN
    ALTER TABLE [dbo].[tender_items] 
    ADD [vendor_id] [uniqueidentifier] NULL;
    
    PRINT '✅ Added vendor_id column to tender_items (correct table)';
END
ELSE
BEGIN
    PRINT '✅ vendor_id column already exists in tender_items';
END

-- Step 2: Drop existing FK if it exists (to recreate with correct type)
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'FK_tender_items_vendor_id'
)
BEGIN
    ALTER TABLE [dbo].[tender_items] DROP CONSTRAINT [FK_tender_items_vendor_id];
    PRINT '✅ Dropped existing FK_tender_items_vendor_id';
END

-- Step 3: Add foreign key constraint with correct data type
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'FK_tender_items_vendor_id'
)
BEGIN
    ALTER TABLE [dbo].[tender_items]
    ADD CONSTRAINT [FK_tender_items_vendor_id] 
    FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors]([id]) ON DELETE SET NULL;
    
    PRINT '✅ Added foreign key constraint FK_tender_items_vendor_id';
END
ELSE
BEGIN
    PRINT '✅ Foreign key constraint already exists';
END

-- Step 4: Add index for vendor_id lookups
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IDX_tender_items_vendor_id' AND object_id = OBJECT_ID('tender_items')
)
BEGIN
    CREATE INDEX [IDX_tender_items_vendor_id] ON [dbo].[tender_items]([vendor_id]);
    PRINT '✅ Created index IDX_tender_items_vendor_id';
END
ELSE
BEGIN
    PRINT '✅ Index IDX_tender_items_vendor_id already exists';
END

-- Step 5: Add composite index for tender_id + vendor_id (useful for queries)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IDX_tender_items_tender_vendor' AND object_id = OBJECT_ID('tender_items')
)
BEGIN
    CREATE INDEX [IDX_tender_items_tender_vendor] ON [dbo].[tender_items]([tender_id], [vendor_id]);
    PRINT '✅ Created composite index IDX_tender_items_tender_vendor';
END
ELSE
BEGIN
    PRINT '✅ Composite index already exists';
END

-- Step 6: Verify the column was added
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'vendor_id'
)
BEGIN
    PRINT '';
    PRINT '========== SCHEMA UPDATE COMPLETE ==========';
    PRINT '✅ tender_items table now has vendor_id column';
    PRINT '✅ Annual tenders can store vendor per item';
    PRINT '✅ Contract tenders can leave vendor_id NULL (use tender.vendor_id)';
    PRINT '';
END

COMMIT TRANSACTION
