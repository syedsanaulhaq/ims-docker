-- =====================================================
-- Final Step: Remove duplicate vendor columns and add constraints
-- Run this AFTER data migration is complete and verified
-- =====================================================

USE [InvMISDB];
GO

-- Step 1: Verify all awards have vendor_id before dropping columns
DECLARE @AwardsWithoutVendor INT;
SELECT @AwardsWithoutVendor = COUNT(*) 
FROM [dbo].[TenderAwards] 
WHERE vendor_id IS NULL AND vendor_name IS NOT NULL;

IF @AwardsWithoutVendor > 0
BEGIN
    PRINT 'WARNING: ' + CAST(@AwardsWithoutVendor AS VARCHAR(10)) + ' awards still have no vendor_id. Please complete data migration first.';
    RETURN;
END

PRINT 'All awards have proper vendor_id references. Proceeding with table cleanup...';

-- Step 2: Make vendor_id NOT NULL (after data migration)
ALTER TABLE [dbo].[TenderAwards]
ALTER COLUMN [vendor_id] [uniqueidentifier] NOT NULL;

PRINT 'Made vendor_id column NOT NULL';

-- Step 3: Add foreign key constraint to vendors table
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TenderAwards_Vendors')
BEGIN
    ALTER TABLE [dbo].[TenderAwards]
    ADD CONSTRAINT [FK_TenderAwards_Vendors] 
    FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors] ([id]);
    
    PRINT 'Added foreign key constraint FK_TenderAwards_Vendors';
END

-- Step 4: Drop the old vendor columns (CAREFUL - This is permanent!)
-- Uncomment these lines one by one after confirming the migration worked

/*
ALTER TABLE [dbo].[TenderAwards] DROP COLUMN [vendor_name];
PRINT 'Dropped vendor_name column';

ALTER TABLE [dbo].[TenderAwards] DROP COLUMN [vendor_registration];  
PRINT 'Dropped vendor_registration column';

ALTER TABLE [dbo].[TenderAwards] DROP COLUMN [vendor_address];
PRINT 'Dropped vendor_address column';

ALTER TABLE [dbo].[TenderAwards] DROP COLUMN [vendor_contact_person];
PRINT 'Dropped vendor_contact_person column';

ALTER TABLE [dbo].[TenderAwards] DROP COLUMN [vendor_phone];
PRINT 'Dropped vendor_phone column';

ALTER TABLE [dbo].[TenderAwards] DROP COLUMN [vendor_email];
PRINT 'Dropped vendor_email column';
*/

-- Step 5: Verify final table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'TenderAwards'
ORDER BY ORDINAL_POSITION;

-- Step 6: Test the relationship with a sample query
SELECT TOP 5
    ta.award_code,
    ta.award_title,
    v.vendor_name,
    v.vendor_code,
    v.email,
    v.phone,
    ta.total_contract_amount
FROM [dbo].[TenderAwards] ta
INNER JOIN [dbo].[vendors] v ON ta.vendor_id = v.id
ORDER BY ta.award_date DESC;

PRINT 'Table normalization completed successfully!';
PRINT 'TenderAwards now properly references the vendors table.';
GO