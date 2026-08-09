-- =====================================================
-- COMPLETE TENDERAWARDS NORMALIZATION SCRIPT
-- Safely normalizes TenderAwards to reference vendors table
-- =====================================================

USE [InvMISDB];
GO

PRINT '=== STARTING TENDERAWARDS NORMALIZATION ===';
PRINT 'This script will normalize TenderAwards to properly reference the vendors table';
PRINT '';

-- STEP 1: BACKUP VERIFICATION
PRINT '1. CHECKING CURRENT STATE...';
SELECT 
    'TenderAwards' as TableName,
    COUNT(*) as RecordCount,
    COUNT(CASE WHEN vendor_name IS NOT NULL THEN 1 END) as RecordsWithVendorData
FROM TenderAwards;

SELECT 
    'Vendors' as TableName,
    COUNT(*) as RecordCount
FROM vendors;

-- STEP 2: ADD VENDOR_ID COLUMN
PRINT '';
PRINT '2. ADDING VENDOR_ID COLUMN...';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TenderAwards]') AND name = 'vendor_id')
BEGIN
    ALTER TABLE [dbo].[TenderAwards]
    ADD [vendor_id] [uniqueidentifier] NULL;
    PRINT '✓ Added vendor_id column';
END
ELSE
BEGIN
    PRINT '✓ vendor_id column already exists';
END

-- STEP 3: CREATE MISSING VENDORS
PRINT '';
PRINT '3. CREATING MISSING VENDORS FROM TENDERAWARDS DATA...';

-- First, let's see what vendors need to be created
DECLARE @NewVendorsNeeded INT;
SELECT @NewVendorsNeeded = COUNT(DISTINCT ta.vendor_name)
FROM TenderAwards ta
WHERE ta.vendor_name IS NOT NULL 
AND ta.vendor_name != ''
AND NOT EXISTS (
    SELECT 1 FROM vendors v 
    WHERE CAST(v.vendor_name AS VARCHAR(200)) = CAST(ta.vendor_name AS VARCHAR(200))
);

PRINT 'Vendors to be created: ' + CAST(@NewVendorsNeeded AS VARCHAR(10));

-- Create the missing vendors
INSERT INTO [dbo].[vendors] (
    [id],
    [vendor_code], 
    [vendor_name],
    [contact_person],
    [email],
    [phone],
    [address],
    [city],
    [country],
    [tax_number],
    [status],
    [created_at],
    [updated_at]
)
SELECT DISTINCT
    NEWID() as id,
    COALESCE(
        CASE 
            WHEN ta.vendor_registration IS NOT NULL AND ta.vendor_registration != '' 
            THEN CAST(ta.vendor_registration AS NVARCHAR(255))
            ELSE 'VEN-' + RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY ta.vendor_name) AS VARCHAR(3)), 4)
        END
    ) as vendor_code,
    CAST(ta.vendor_name AS NVARCHAR(255)) as vendor_name,
    CASE 
        WHEN ta.vendor_contact_person IS NOT NULL AND ta.vendor_contact_person != '' 
        THEN CAST(ta.vendor_contact_person AS NVARCHAR(255))
        ELSE NULL 
    END as contact_person,
    CASE 
        WHEN ta.vendor_email IS NOT NULL AND ta.vendor_email != '' 
        THEN CAST(ta.vendor_email AS NVARCHAR(255))
        ELSE NULL 
    END as email,
    CASE 
        WHEN ta.vendor_phone IS NOT NULL AND ta.vendor_phone != '' 
        THEN CAST(ta.vendor_phone AS NVARCHAR(255))
        ELSE NULL 
    END as phone,
    CASE 
        WHEN ta.vendor_address IS NOT NULL AND ta.vendor_address != '' 
        THEN CAST(ta.vendor_address AS NVARCHAR(255))
        ELSE NULL 
    END as address,
    NULL as city,
    NULL as country,
    CASE 
        WHEN ta.vendor_registration IS NOT NULL AND ta.vendor_registration != '' 
        THEN CAST(ta.vendor_registration AS NVARCHAR(255))
        ELSE NULL 
    END as tax_number,
    'Active' as status,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM [dbo].[TenderAwards] ta
WHERE ta.vendor_name IS NOT NULL 
AND ta.vendor_name != ''
AND NOT EXISTS (
    SELECT 1 FROM [dbo].[vendors] v 
    WHERE CAST(v.vendor_name AS VARCHAR(200)) = CAST(ta.vendor_name AS VARCHAR(200))
);

PRINT '✓ Created ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' new vendors';

-- STEP 4: LINK TENDERAWARDS TO VENDORS
PRINT '';
PRINT '4. LINKING TENDERAWARDS TO VENDORS...';

-- Check if vendor_id column exists before updating
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TenderAwards]') AND name = 'vendor_id')
BEGIN
    UPDATE ta
    SET vendor_id = v.id
    FROM [dbo].[TenderAwards] ta
    INNER JOIN [dbo].[vendors] v ON CAST(v.vendor_name AS VARCHAR(200)) = CAST(ta.vendor_name AS VARCHAR(200))
    WHERE ta.vendor_id IS NULL
    AND ta.vendor_name IS NOT NULL
    AND ta.vendor_name != '';

    PRINT '✓ Linked ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' tender awards to vendors';
END
ELSE
BEGIN
    PRINT '⚠ vendor_id column not found, skipping linking step';
END

-- STEP 5: VERIFY MIGRATION
PRINT '';
PRINT '5. VERIFYING MIGRATION...';

-- Check if vendor_id column exists before verification
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TenderAwards]') AND name = 'vendor_id')
BEGIN
    SELECT 
        COUNT(*) as TotalAwards,
        COUNT(vendor_id) as AwardsWithVendorId,
        COUNT(*) - COUNT(vendor_id) as AwardsWithoutVendorId,
        CASE 
            WHEN COUNT(*) - COUNT(vendor_id) = 0 THEN '✓ ALL AWARDS LINKED'
            ELSE '⚠ SOME AWARDS NOT LINKED'
        END as MigrationStatus
    FROM [dbo].[TenderAwards];
END
ELSE
BEGIN
    SELECT 
        COUNT(*) as TotalAwards,
        0 as AwardsWithVendorId,
        COUNT(*) as AwardsWithoutVendorId,
        '⚠ VENDOR_ID COLUMN NOT FOUND' as MigrationStatus
    FROM [dbo].[TenderAwards];
END

-- STEP 6: ADD FOREIGN KEY CONSTRAINT
PRINT '';
PRINT '6. ADDING FOREIGN KEY CONSTRAINT...';
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

-- STEP 7: SHOW SAMPLE DATA WITH NEW STRUCTURE
PRINT '';
PRINT '7. SAMPLE DATA WITH NEW STRUCTURE:';

-- Check if vendor_id column exists before showing sample data
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TenderAwards]') AND name = 'vendor_id')
BEGIN
    SELECT TOP 3
        ta.award_code,
        ta.award_title,
        v.vendor_name,
        v.vendor_code,
        v.email as vendor_email,
        ta.total_contract_amount,
        'OLD: ' + ISNULL(CAST(ta.vendor_name AS VARCHAR(200)), 'NULL') as old_vendor_name
    FROM [dbo].[TenderAwards] ta
    LEFT JOIN [dbo].[vendors] v ON ta.vendor_id = v.id
    ORDER BY ta.award_date DESC;
END
ELSE
BEGIN
    PRINT 'Cannot show sample data - vendor_id column not found';
    SELECT TOP 3
        ta.award_code,
        ta.award_title,
        CAST(ta.vendor_name AS VARCHAR(200)) as vendor_name,
        ta.total_contract_amount
    FROM [dbo].[TenderAwards] ta
    ORDER BY ta.award_date DESC;
END

PRINT '';
PRINT '=== NORMALIZATION COMPLETE ===';
PRINT 'TenderAwards now properly references the vendors table via vendor_id';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '1. Test your application with the new structure';
PRINT '2. Update your backend API to use vendor_id instead of vendor fields';
PRINT '3. Once confirmed working, run the cleanup script to remove old vendor columns';
PRINT '';

-- Show the final recommended table structure
PRINT 'RECOMMENDED FINAL TENDERAWARDS STRUCTURE:';
SELECT 
    COLUMN_NAME,
    DATA_TYPE + 
    CASE 
        WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) + ')' 
        ELSE '' 
    END as DataType,
    IS_NULLABLE,
    CASE WHEN COLUMN_NAME LIKE '%vendor_%' AND COLUMN_NAME != 'vendor_id' 
         THEN '← REMOVE AFTER TESTING' 
         ELSE '' 
    END as Notes
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'TenderAwards'
AND COLUMN_NAME LIKE '%vendor%'
ORDER BY ORDINAL_POSITION;

GO