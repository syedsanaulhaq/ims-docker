-- =====================================================
-- Data Migration Script for TenderAwards Normalization
-- Creates vendors from existing TenderAwards data and links them
-- =====================================================

USE [InvMISDB];
GO

-- Step 1: Create vendors from existing TenderAwards data (where they don't exist)
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
    COALESCE(ta.vendor_registration, 'VEN-' + CAST(ROW_NUMBER() OVER (ORDER BY ta.vendor_name) AS VARCHAR(10))) as vendor_code,
    ta.vendor_name,
    ta.vendor_contact_person,
    ta.vendor_email,
    ta.vendor_phone,
    ta.vendor_address,
    NULL as city, -- Extract from address if needed
    NULL as country, -- Extract from address if needed  
    ta.vendor_registration as tax_number,
    'Active' as status,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM [dbo].[TenderAwards] ta
WHERE ta.vendor_name IS NOT NULL
AND ta.vendor_name != ''
AND NOT EXISTS (
    SELECT 1 FROM [dbo].[vendors] v 
    WHERE v.vendor_name = ta.vendor_name 
    AND (v.email = ta.vendor_email OR (v.email IS NULL AND ta.vendor_email IS NULL))
);

PRINT 'Created new vendors from TenderAwards data';

-- Step 2: Update TenderAwards with vendor_id references
UPDATE ta
SET vendor_id = v.id
FROM [dbo].[TenderAwards] ta
INNER JOIN [dbo].[vendors] v ON v.vendor_name = ta.vendor_name
WHERE ta.vendor_id IS NULL
AND ta.vendor_name IS NOT NULL;

PRINT 'Updated TenderAwards with vendor_id references';

-- Step 3: Verify the migration
SELECT 
    COUNT(*) as TotalAwards,
    COUNT(vendor_id) as AwardsWithVendorId,
    COUNT(*) - COUNT(vendor_id) as AwardsWithoutVendorId
FROM [dbo].[TenderAwards];

SELECT 
    'Migration Summary' as Status,
    COUNT(DISTINCT ta.vendor_id) as UniqueVendorsReferenced,
    (SELECT COUNT(*) FROM vendors) as TotalVendorsInSystem
FROM [dbo].[TenderAwards] ta
WHERE ta.vendor_id IS NOT NULL;

PRINT 'Data migration verification complete';
GO