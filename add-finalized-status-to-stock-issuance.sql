-- ========================================
-- ADD FINALIZED STATUS TO STOCK ISSUANCE
-- ========================================
-- Add finalization tracking to stock_issuance_requests table

PRINT '🚀 Starting Stock Issuance Finalization Schema Update...';

-- Add finalization columns to stock_issuance_requests table
PRINT '📋 Adding finalization columns to stock_issuance_requests table...';

-- Add is_finalized column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'is_finalized')
BEGIN
    ALTER TABLE stock_issuance_requests ADD is_finalized BIT NOT NULL DEFAULT 0;
    PRINT '✅ Added is_finalized column to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Column is_finalized already exists in stock_issuance_requests';
END

-- Add finalized_by column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'finalized_by')
BEGIN
    ALTER TABLE stock_issuance_requests ADD finalized_by NVARCHAR(450) NULL;
    PRINT '✅ Added finalized_by column to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Column finalized_by already exists in stock_issuance_requests';
END

-- Add finalized_at column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'finalized_at')
BEGIN
    ALTER TABLE stock_issuance_requests ADD finalized_at DATETIME2 NULL;
    PRINT '✅ Added finalized_at column to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Column finalized_at already exists in stock_issuance_requests';
END

-- Create index for finalized status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_issuance_requests_is_finalized')
BEGIN
    CREATE INDEX IX_stock_issuance_requests_is_finalized ON stock_issuance_requests(is_finalized);
    PRINT '✅ Created index IX_stock_issuance_requests_is_finalized';
END
ELSE
BEGIN
    PRINT '⚠️  Index IX_stock_issuance_requests_is_finalized already exists';
END

PRINT '📊 Finalization Schema Summary:';
PRINT '   - is_finalized: BIT column to track if request is finalized';
PRINT '   - finalized_by: NVARCHAR(450) column to store who finalized the request';
PRINT '   - finalized_at: DATETIME2 column to store when the request was finalized';
PRINT '   - Index on is_finalized for performance';

-- Verify the new columns exist
PRINT '🔍 Verifying new columns in stock_issuance_requests:';
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_issuance_requests') AND name = 'is_finalized')
BEGIN
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'stock_issuance_requests'
        AND COLUMN_NAME IN ('is_finalized', 'finalized_at', 'finalized_by')
    ORDER BY COLUMN_NAME;
END
ELSE
BEGIN
    PRINT '⚠️  Finalization columns not found - schema update may have failed';
END

PRINT '✅ Stock Issuance Finalization Schema Update Complete!';
PRINT '';
PRINT '📝 Next Steps:';
PRINT '   1. Update frontend components to include finalize functionality';
PRINT '   2. Test finalization workflow with approved requests';
PRINT '   3. Verify proper status transitions and validation';
