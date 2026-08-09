-- =============================================
-- WING DASHBOARD ENHANCEMENTS - DATABASE MIGRATION
-- Deploy Date: December 8, 2025
-- =============================================
-- This script contains all necessary database changes for:
-- - Inventory verification workflow
-- - Wing Dashboard enhancements
-- - Requester information tracking

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '========================================';
PRINT '🚀 DEPLOYING WING DASHBOARD DATABASE CHANGES';
PRINT '========================================';
PRINT '';

-- =========================================
-- CLEANUP: Drop existing objects if they exist (from failed runs)
-- =========================================

PRINT '🧹 CLEANUP: Removing any existing objects from failed runs...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications')
BEGIN
    DROP VIEW dbo.View_Pending_Inventory_Verifications;
    PRINT '   ✅ Dropped existing view';
END

IF OBJECT_ID('dbo.inventory_verification_requests', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.inventory_verification_requests;
    PRINT '   ✅ Dropped existing table';
END

PRINT '';

-- =========================================
-- PHASE 1: INVENTORY VERIFICATION REQUESTS TABLE
-- =========================================

PRINT '📋 PHASE 1: Creating inventory_verification_requests table...';

IF OBJECT_ID('dbo.inventory_verification_requests', 'U') IS NULL
BEGIN
    PRINT '   Creating inventory_verification_requests table...';
    CREATE TABLE dbo.inventory_verification_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Link to stock issuance request
        stock_issuance_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Who requested verification
        requested_by_user_id NVARCHAR(450) NOT NULL,
        requested_by_name NVARCHAR(255),
        requested_at DATETIME2 DEFAULT GETDATE(),
        
        -- Verification details
        requested_quantity INT NOT NULL,
        verification_status NVARCHAR(30) DEFAULT 'pending'
            CHECK (verification_status IN (
                'pending',
                'verified_available',
                'verified_partial',
                'verified_unavailable',
                'cancelled'
            )),
        
        -- Verified by inventory supervisor
        verified_by_user_id NVARCHAR(450) NULL,
        verified_by_name NVARCHAR(255) NULL,
        verified_at DATETIME2 NULL,
        
        -- Verification results
        physical_count INT NULL,
        available_quantity INT NULL,
        verification_notes NVARCHAR(MAX) NULL,
        
        -- Wing information
        wing_id INT NULL,
        wing_name NVARCHAR(255) NULL,
        
        -- Audit columns
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_ivr_item_master FOREIGN KEY (item_master_id) REFERENCES dbo.item_masters(id),
        CONSTRAINT fk_ivr_requester FOREIGN KEY (requested_by_user_id) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT fk_ivr_verifier FOREIGN KEY (verified_by_user_id) REFERENCES dbo.AspNetUsers(Id)
    );
    
    PRINT '   ✅ Created inventory_verification_requests table';
    
    -- Create indexes
    CREATE INDEX idx_ivr_requested_by ON dbo.inventory_verification_requests(requested_by_user_id);
    CREATE INDEX idx_ivr_wing ON dbo.inventory_verification_requests(wing_id);
    CREATE INDEX idx_ivr_status ON dbo.inventory_verification_requests(verification_status);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  inventory_verification_requests table already exists';
END
GO

-- =========================================
-- PHASE 2: ADD NOMENCLATURE COLUMN
-- =========================================

PRINT '';
PRINT '📋 PHASE 2: Adding nomenclature column to inventory verification...';

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' 
    AND COLUMN_NAME = 'item_nomenclature'
)
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD item_nomenclature NVARCHAR(500) NULL;
    
    PRINT '   ✅ Added item_nomenclature column';
END
ELSE
BEGIN
    PRINT '   ⚠️  item_nomenclature column already exists';
END
GO

-- =========================================
-- PHASE 3: UPDATE VIEW FOR VERIFICATION
-- =========================================

PRINT '';
PRINT '📋 PHASE 3: Creating View_Pending_Inventory_Verifications...';
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
    w.Name AS wing_full_name,
    sir.purpose AS request_purpose,
    sir.request_type,
    u.FullName AS requester_name,
    ivr.created_at,
    ivr.updated_at
FROM dbo.inventory_verification_requests ivr
LEFT JOIN dbo.item_masters im ON ivr.item_master_id = im.id
LEFT JOIN dbo.WingsInformation w ON ivr.wing_id = w.Id
LEFT JOIN dbo.stock_issuance_requests sir ON ivr.stock_issuance_id = sir.id
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id;
GO

PRINT '   ✅ Created/Updated View_Pending_Inventory_Verifications';

-- =========================================
-- PHASE 4: VERIFICATION COMPLETE
-- =========================================

PRINT '';
PRINT '========================================';
PRINT '✅ DATABASE MIGRATION COMPLETE!';
PRINT '========================================';
PRINT '';
PRINT 'Summary:';
PRINT '   ✅ Inventory verification requests table created/updated';
PRINT '   ✅ Nomenclature column added';
PRINT '   ✅ View for pending verifications created';
PRINT '';
PRINT 'Ready for deployment!';
PRINT '';

