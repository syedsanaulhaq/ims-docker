-- ============================================================================
-- Add tender_type field to annual_tenders table
-- ============================================================================
-- Purpose: Store the tender classification (e.g., "Patty Purchase", "Annual Tender")
-- This allows opening balance to use the actual tender type as source type
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'Adding tender_type Field to annual_tenders Table';
PRINT '====================================================================';

-- Add tender_type column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('annual_tenders') AND name = 'tender_type')
BEGIN
    ALTER TABLE annual_tenders ADD tender_type NVARCHAR(100) DEFAULT 'Annual Tender';
    PRINT '✅ Added tender_type column to annual_tenders table';
    
    -- Update existing records to have a default tender_type
    UPDATE annual_tenders SET tender_type = 'Annual Tender' WHERE tender_type IS NULL;
    PRINT '✅ Updated existing records with default tender_type';
END
ELSE
BEGIN
    PRINT 'ℹ️ tender_type column already exists in annual_tenders table';
END

GO

PRINT '';
PRINT '====================================================================';
PRINT '✅ COMPLETE: tender_type field added to annual_tenders';
PRINT '====================================================================';
PRINT '';
PRINT '💡 Usage:';
PRINT '   - Set tender_type to classify tenders (e.g., "Patty Purchase", "Medical Supplies")';
PRINT '   - Used in opening balance to set source_type automatically';
PRINT '   - Default value: "Annual Tender"';
PRINT '';
PRINT '====================================================================';

GO
