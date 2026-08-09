-- =====================================================
-- ADD is_selected COLUMN TO tender_vendors TABLE
-- =====================================================

USE InventoryManagementDB;
GO

-- Add is_selected column to tender_vendors table
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tender_vendors' 
    AND COLUMN_NAME = 'is_selected'
)
BEGIN
    ALTER TABLE tender_vendors
    ADD is_selected BIT DEFAULT 0 NOT NULL;
    
    PRINT '✅ Added is_selected column to tender_vendors table';
END
ELSE
BEGIN
    PRINT '⚠️ is_selected column already exists';
END
GO

-- Create index for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_vendors_is_selected')
BEGIN
    CREATE INDEX IX_tender_vendors_is_selected 
    ON tender_vendors(is_selected)
    WHERE is_selected = 1;
    
    PRINT '✅ Created index IX_tender_vendors_is_selected';
END
ELSE
BEGIN
    PRINT '⚠️ Index IX_tender_vendors_is_selected already exists';
END
GO

-- Update view to include is_selected column if view exists
IF EXISTS (SELECT 1 FROM sys.views WHERE name = 'tender_vendors_view')
BEGIN
    DROP VIEW tender_vendors_view;
END
GO

CREATE VIEW tender_vendors_view AS
SELECT
    tv.id,
    tv.tender_id,
    tv.vendor_id,
    tv.vendor_name,
    tv.quoted_amount,
    tv.proposal_document_path,
    tv.proposal_document_name,
    tv.proposal_upload_date,
    tv.proposal_file_size,
    tv.is_awarded,
    tv.is_successful,
    tv.is_selected,
    tv.remarks,
    tv.created_at,
    tv.updated_at,
    tv.created_by,
    v.vendor_code,
    v.contact_person,
    v.email,
    v.phone,
    v.address,
    v.city,
    v.country
FROM tender_vendors tv
LEFT JOIN vendors v ON tv.vendor_id = v.id;
GO

PRINT '✅ is_selected column migration complete!';
