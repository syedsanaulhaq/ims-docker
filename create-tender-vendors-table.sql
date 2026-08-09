-- =====================================================
-- CREATE TENDER VENDORS TABLE
-- Multiple vendors can participate in a tender with proposals
-- =====================================================

USE InventoryManagementDB;
GO

-- Create tender_vendors table for managing multiple vendors per tender
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tender_vendors')
BEGIN
    CREATE TABLE tender_vendors (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        tender_id UNIQUEIDENTIFIER NOT NULL,
        vendor_id UNIQUEIDENTIFIER NOT NULL,
        vendor_name NVARCHAR(200) NOT NULL,
        quoted_amount DECIMAL(15,2),
        proposal_document_path NVARCHAR(500),
        proposal_document_name NVARCHAR(200),
        proposal_upload_date DATETIME2,
        proposal_file_size BIGINT, -- File size in bytes
        is_awarded BIT DEFAULT 0,
        remarks NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by NVARCHAR(100),
        CONSTRAINT FK_tender_vendors_tender FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
        CONSTRAINT FK_tender_vendors_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
        CONSTRAINT UQ_tender_vendor UNIQUE (tender_id, vendor_id) -- Prevent duplicate vendor entries
    );
    
    PRINT '✅ Created tender_vendors table';
END
ELSE
BEGIN
    PRINT '⚠️ tender_vendors table already exists';
END
GO

-- Create indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_vendors_tender_id')
BEGIN
    CREATE INDEX IX_tender_vendors_tender_id ON tender_vendors(tender_id);
    PRINT '✅ Created index: IX_tender_vendors_tender_id';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_vendors_vendor_id')
BEGIN
    CREATE INDEX IX_tender_vendors_vendor_id ON tender_vendors(vendor_id);
    PRINT '✅ Created index: IX_tender_vendors_vendor_id';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_vendors_is_awarded')
BEGIN
    CREATE INDEX IX_tender_vendors_is_awarded ON tender_vendors(is_awarded);
    PRINT '✅ Created index: IX_tender_vendors_is_awarded';
END
GO

-- Add awarded_vendor_id to tenders table to track the winning vendor
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tenders') AND name = 'awarded_vendor_id')
BEGIN
    ALTER TABLE tenders ADD awarded_vendor_id UNIQUEIDENTIFIER;
    ALTER TABLE tenders ADD CONSTRAINT FK_tenders_awarded_vendor FOREIGN KEY (awarded_vendor_id) REFERENCES vendors(id);
    PRINT '✅ Added awarded_vendor_id column to tenders table';
END
ELSE
BEGIN
    PRINT '⚠️ awarded_vendor_id column already exists in tenders table';
END
GO

-- Create a view to easily fetch tender vendors with vendor details
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_tender_vendors_details')
BEGIN
    DROP VIEW vw_tender_vendors_details;
    PRINT '🔄 Dropped existing view: vw_tender_vendors_details';
END
GO

CREATE VIEW vw_tender_vendors_details AS
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
    tv.remarks,
    tv.created_at,
    tv.updated_at,
    tv.created_by,
    -- Vendor details
    v.vendor_code,
    v.contact_person,
    v.email,
    v.phone,
    v.address,
    v.city,
    v.country,
    v.registration_number,
    -- Tender details
    t.tender_number,
    t.title AS tender_title,
    t.tender_spot_type,
    t.estimated_value AS tender_estimated_value
FROM 
    tender_vendors tv
    LEFT JOIN vendors v ON tv.vendor_id = v.id
    LEFT JOIN tenders t ON tv.tender_id = t.id;
GO

PRINT '✅ Created view: vw_tender_vendors_details';
GO

-- Sample query to verify
SELECT 
    COUNT(*) AS tender_vendors_count
FROM tender_vendors;
GO

PRINT '';
PRINT '✅ Tender vendors schema setup complete!';
PRINT '';
PRINT 'You can now:';
PRINT '  - Add multiple vendors to a tender';
PRINT '  - Upload vendor proposals';
PRINT '  - Track quoted amounts';
PRINT '  - Mark awarded vendor';
PRINT '';
GO
