-- Add is_successful column to tender_vendors table
-- This column tracks which vendor is the successful bidder

USE InventoryManagementDB;
GO

-- Check if column already exists
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tender_vendors' 
    AND COLUMN_NAME = 'is_successful'
)
BEGIN
    ALTER TABLE tender_vendors
    ADD is_successful BIT DEFAULT 0 NOT NULL;
    
    PRINT '✅ Added is_successful column to tender_vendors table';
END
ELSE
BEGIN
    PRINT '⚠️ is_successful column already exists';
END
GO

-- Create index for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_vendors_is_successful')
BEGIN
    SET QUOTED_IDENTIFIER ON;
    CREATE INDEX IX_tender_vendors_is_successful 
    ON tender_vendors(is_successful)
    WHERE is_successful = 1;
    
    PRINT '✅ Created index IX_tender_vendors_is_successful';
END
ELSE
BEGIN
    PRINT '⚠️ Index IX_tender_vendors_is_successful already exists';
END
GO

-- Update view to include is_successful column
IF OBJECT_ID('vw_tender_vendors_details', 'V') IS NOT NULL
    DROP VIEW vw_tender_vendors_details;
GO

CREATE VIEW vw_tender_vendors_details AS
SELECT 
    tv.id,
    tv.tender_id,
    tv.vendor_id,
    tv.vendor_name,
    v.vendor_code,
    v.contact_person,
    v.email,
    v.phone,
    tv.quoted_amount,
    tv.proposal_document_path,
    tv.proposal_document_name,
    tv.proposal_upload_date,
    tv.proposal_file_size,
    tv.is_awarded,
    tv.is_successful,
    tv.remarks,
    tv.created_at,
    tv.updated_at,
    t.title AS tender_title,
    t.tender_number,
    t.tender_status
FROM tender_vendors tv
INNER JOIN vendors v ON tv.vendor_id = v.id
INNER JOIN tenders t ON tv.tender_id = t.id;
GO

PRINT '✅ Updated vw_tender_vendors_details view';
GO

-- Show summary
SELECT 
    COUNT(*) as total_vendors,
    SUM(CASE WHEN is_successful = 1 THEN 1 ELSE 0 END) as successful_vendors,
    SUM(CASE WHEN is_awarded = 1 THEN 1 ELSE 0 END) as awarded_vendors
FROM tender_vendors;
GO

PRINT '✅ is_successful column migration complete!';
