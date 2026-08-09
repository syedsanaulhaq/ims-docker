-- =====================================================
-- SIMPLIFIED TENDERAWARDS NORMALIZATION SCRIPT
-- Since table is empty, we can directly add vendor_id and constraints
-- =====================================================

USE [InvMISDB];
GO

PRINT '=== STARTING TENDERAWARDS NORMALIZATION ===';
PRINT 'Table is empty - proceeding with direct normalization';
PRINT '';

-- STEP 1: ADD VENDOR_ID COLUMN
PRINT '1. ADDING VENDOR_ID COLUMN...';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TenderAwards]') AND name = 'vendor_id')
BEGIN
    ALTER TABLE [dbo].[TenderAwards]
    ADD [vendor_id] [uniqueidentifier] NOT NULL DEFAULT NEWID();
    PRINT '✓ Added vendor_id column';
END
ELSE
BEGIN
    PRINT '✓ vendor_id column already exists';
END

-- STEP 2: ADD FOREIGN KEY CONSTRAINT
PRINT '';
PRINT '2. ADDING FOREIGN KEY CONSTRAINT...';
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TenderAwards_Vendors')
BEGIN
    ALTER TABLE [dbo].[TenderAwards]
    ADD CONSTRAINT [FK_TenderAwards_Vendors] 
    FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors] ([id]);
    
    PRINT '✓ Added foreign key constraint FK_TenderAwards_Vendors';
END
ELSE
BEGIN
    PRINT '✓ Foreign key constraint already exists';
END

-- STEP 3: SHOW FINAL TABLE STRUCTURE
PRINT '';
PRINT '3. FINAL TABLE STRUCTURE:';
SELECT 
    COLUMN_NAME,
    DATA_TYPE + 
    CASE 
        WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) + ')' 
        ELSE '' 
    END as DataType,
    IS_NULLABLE,
    CASE 
        WHEN COLUMN_NAME LIKE '%vendor_%' AND COLUMN_NAME != 'vendor_id' 
        THEN '← RECOMMENDED TO REMOVE' 
        ELSE '' 
    END as RecommendedAction
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'TenderAwards'
AND (COLUMN_NAME LIKE '%vendor%' OR COLUMN_NAME IN ('award_id', 'award_code', 'award_title'))
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '=== NORMALIZATION COMPLETE ===';
PRINT 'TenderAwards now has vendor_id foreign key to vendors table';
PRINT '';
PRINT 'RECOMMENDED NEXT STEPS:';
PRINT '1. Update backend APIs to use vendor_id instead of vendor fields';
PRINT '2. Test the new structure';
PRINT '3. Remove old vendor columns after testing (optional)';
PRINT '';

-- STEP 4: CREATE A SAMPLE INSERT EXAMPLE
PRINT '4. SAMPLE USAGE:';
PRINT 'To insert a new tender award, use:';
PRINT '';
PRINT 'INSERT INTO TenderAwards (';
PRINT '  award_code, request_id, award_title, award_date, expected_delivery_date,';
PRINT '  vendor_id, -- Use this instead of vendor fields';
PRINT '  total_contract_amount, final_amount';
PRINT ') VALUES (';
PRINT '  ''AWD-001'', 1, ''Sample Award'', GETDATE(), DATEADD(day, 30, GETDATE()),';
PRINT '  ''[vendor-uuid-from-vendors-table]'', -- Reference to vendors.id';
PRINT '  100000.00, 100000.00';
PRINT ');';

GO