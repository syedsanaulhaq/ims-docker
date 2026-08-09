-- =====================================================
-- TenderAwards Table Normalization Script
-- Removes duplicate vendor fields and adds proper vendor_id FK
-- =====================================================

USE [InvMISDB];
GO

-- Step 1: Check if there's existing data in TenderAwards
SELECT COUNT(*) as ExistingAwardsCount FROM TenderAwards;
GO

-- Step 2: Add vendor_id column first (nullable initially for data migration)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TenderAwards]') AND name = 'vendor_id')
BEGIN
    ALTER TABLE [dbo].[TenderAwards]
    ADD [vendor_id] [uniqueidentifier] NULL;
    
    PRINT 'Added vendor_id column to TenderAwards table';
END
ELSE
BEGIN
    PRINT 'vendor_id column already exists in TenderAwards table';
END
GO

-- Step 3: Create a staging script to help with data migration
-- This will show existing vendor data that needs to be matched/created in vendors table
SELECT 
    award_id,
    award_code,
    vendor_name,
    vendor_registration,
    vendor_address,
    vendor_contact_person,
    vendor_phone,
    vendor_email,
    -- Check if vendor already exists in vendors table
    (SELECT TOP 1 id FROM vendors v 
     WHERE v.vendor_name = ta.vendor_name 
     AND v.email = ta.vendor_email) as existing_vendor_id
FROM TenderAwards ta
WHERE vendor_name IS NOT NULL
ORDER BY award_id;

PRINT 'Data migration analysis complete. Review the results above.';
GO