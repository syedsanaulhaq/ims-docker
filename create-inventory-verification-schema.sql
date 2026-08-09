-- =============================================
-- CREATE INVENTORY VERIFICATION SCHEMA
-- =============================================
-- Simple, corrected version matching actual database

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '📦 Creating Inventory Verification Schema...';

-- =============================================
-- 1. CREATE INVENTORY VERIFICATION REQUESTS TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_verification_requests]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.inventory_verification_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Links to existing tables
        stock_issuance_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id NVARCHAR(450) NULL,  -- Using NVARCHAR to match item_master.id type
        item_nomenclature NVARCHAR(500) NULL,  -- Store item name directly for reliability
        
        -- Who requested
        requested_by_user_id NVARCHAR(450) NOT NULL,
        requested_by_name NVARCHAR(255) NULL,
        requested_at DATETIME2 DEFAULT GETDATE(),
        
        -- Item details
        requested_quantity INT NOT NULL,
        
        -- Status
        verification_status NVARCHAR(30) DEFAULT 'pending',
        
        -- Verification results
        verified_by_user_id NVARCHAR(450) NULL,
        verified_by_name NVARCHAR(255) NULL,
        verified_at DATETIME2 NULL,
        physical_count INT NULL,
        available_quantity INT NULL,
        verification_notes NVARCHAR(MAX) NULL,
        
        -- Location context
        wing_id INT NULL,
        wing_name NVARCHAR(255) NULL,
        
        -- Timestamps
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_verification_status ON dbo.inventory_verification_requests(verification_status);
    CREATE INDEX IX_verification_stock_issuance ON dbo.inventory_verification_requests(stock_issuance_id);
    
    PRINT '✅ Created inventory_verification_requests table';
END
ELSE
BEGIN
    PRINT '⚠️  Table inventory_verification_requests already exists';
END
GO

-- =============================================
-- 2. CREATE VIEW FOR PENDING VERIFICATIONS
-- =============================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications')
    DROP VIEW dbo.View_Pending_Inventory_Verifications;
GO

CREATE VIEW dbo.View_Pending_Inventory_Verifications AS
SELECT 
    ivr.id,
    ivr.stock_issuance_id,
    ivr.item_master_id,
    ISNULL(ivr.item_nomenclature, 'Unknown Item') AS item_nomenclature,
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
    ivr.created_at,
    ivr.updated_at
FROM dbo.inventory_verification_requests ivr;
GO

PRINT '✅ Created View_Pending_Inventory_Verifications';
GO

-- =============================================
-- SUMMARY
-- =============================================

PRINT '';
PRINT '========================================';
PRINT '✅ INVENTORY VERIFICATION SCHEMA READY!';
PRINT '========================================';
PRINT '';
PRINT 'Created:';
PRINT '  ✅ inventory_verification_requests table';
PRINT '  ✅ View_Pending_Inventory_Verifications';
PRINT '';
