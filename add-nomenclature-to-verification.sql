-- =============================================
-- ADD NOMENCLATURE TO INVENTORY VERIFICATION REQUESTS
-- =============================================

PRINT '📋 Adding nomenclature column to inventory_verification_requests...';

-- Check if column exists, if not add it
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' 
    AND COLUMN_NAME = 'item_nomenclature'
)
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD item_nomenclature NVARCHAR(500) NULL;
    
    PRINT '✅ Added item_nomenclature column';
END
ELSE
BEGIN
    PRINT '⚠️  Column item_nomenclature already exists';
END
GO

-- =============================================
-- UPDATE VIEW TO USE NOMENCLATURE
-- =============================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications')
    DROP VIEW dbo.View_Pending_Inventory_Verifications;
GO

CREATE VIEW dbo.View_Pending_Inventory_Verifications AS
SELECT 
    ivr.id,
    ivr.stock_issuance_id,
    ivr.item_master_id,
    ISNULL(ivr.item_nomenclature, ISNULL(im.nomenclature, 'Unknown Item')) AS item_nomenclature,
    im.nomenclature AS item_name,
    im.item_code,
    ivr.requested_quantity,
    ivr.requested_by_name,
    ivr.requested_by_user_id,
    ivr.requested_at,
    ivr.verification_status,
    CASE 
        WHEN ivr.verification_status LIKE 'verified%' THEN 'verified'
        ELSE 'pending'
    END AS status,
    ivr.verified_by_user_id,
    ivr.verified_by_name,
    ivr.verified_at,
    ivr.physical_count,
    ivr.available_quantity,
    ivr.verification_notes,
    ivr.wing_id,
    ivr.wing_name,
    w.wing_name AS wing_full_name,
    sir.purpose AS request_purpose,
    sir.request_type,
    u.FullName AS requester_name,
    ivr.created_at,
    ivr.updated_at
FROM dbo.inventory_verification_requests ivr
LEFT JOIN dbo.item_masters im ON ivr.item_master_id = im.id
LEFT JOIN dbo.wings w ON ivr.wing_id = w.id
LEFT JOIN dbo.stock_issuance_requests sir ON ivr.stock_issuance_id = sir.id
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id;
GO

PRINT '✅ Updated View_Pending_Inventory_Verifications';
GO

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
PRINT '✅ All nomenclature updates complete!';
