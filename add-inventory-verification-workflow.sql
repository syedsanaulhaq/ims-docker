-- =========================================
-- INVENTORY VERIFICATION WORKFLOW SCHEMA
-- =========================================
-- Adds inventory verification capabilities to approval workflow

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '🔄 Adding Inventory Verification Workflow Schema...';
PRINT '';

-- =========================================
-- 1. INVENTORY VERIFICATION REQUESTS TABLE
-- =========================================
-- Tracks when supervisors request physical inventory verification

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_verification_requests]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.inventory_verification_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Link to stock issuance request
        stock_issuance_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id INT NOT NULL,
        
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
        
        -- Wing/Location context
        wing_id INT NULL,
        wing_name NVARCHAR(255) NULL,
        storage_location NVARCHAR(255) NULL,
        
        -- Timestamps
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT FK_verification_stock_issuance FOREIGN KEY (stock_issuance_id) 
            REFERENCES dbo.stock_issuance_requests(id),
        CONSTRAINT FK_verification_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.item_master(id),
        CONSTRAINT FK_verification_requested_by FOREIGN KEY (requested_by_user_id) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_verification_verified_by FOREIGN KEY (verified_by_user_id) 
            REFERENCES dbo.AspNetUsers(Id)
    );
    
    PRINT '✅ Created inventory_verification_requests table';
END
ELSE
BEGIN
    PRINT '⚠️  Table inventory_verification_requests already exists';
END
GO

-- =========================================
-- 2. ADD INVENTORY CHECK COLUMNS TO STOCK ISSUANCE ITEMS
-- =========================================

-- Add inventory availability tracking
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'inventory_check_status')
BEGIN
    ALTER TABLE dbo.stock_issuance_items
    ADD 
        inventory_check_status NVARCHAR(30) DEFAULT 'not_checked'
            CHECK (inventory_check_status IN (
                'not_checked',
                'checking',
                'available',
                'partial',
                'unavailable',
                'verification_requested'
            )),
        inventory_checked_at DATETIME2 NULL,
        inventory_checked_by NVARCHAR(450) NULL,
        available_in_wing_store BIT DEFAULT 0,
        wing_store_quantity INT NULL,
        source_store_type NVARCHAR(20) NULL 
            CHECK (source_store_type IN ('wing', 'admin', 'procurement'));
    
    PRINT '✅ Added inventory check columns to stock_issuance_items';
END
ELSE
BEGIN
    PRINT '⚠️  Inventory check columns already exist in stock_issuance_items';
END
GO

-- =========================================
-- 3. ADD ENHANCED STATUS TRACKING
-- =========================================

-- Update stock_issuance_requests to track inventory verification stage
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'inventory_verification_required')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD 
        inventory_verification_required BIT DEFAULT 0,
        inventory_verification_completed BIT DEFAULT 0,
        pending_verification_count INT DEFAULT 0,
        issuance_source NVARCHAR(20) NULL 
            CHECK (issuance_source IN ('wing_store', 'admin_store', 'mixed', 'procurement'));
    
    PRINT '✅ Added inventory verification tracking to stock_issuance_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Inventory verification columns already exist';
END
GO

-- =========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =========================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_verification_status' AND object_id = OBJECT_ID('dbo.inventory_verification_requests'))
BEGIN
    CREATE INDEX IX_verification_status ON dbo.inventory_verification_requests(verification_status);
    PRINT '✅ Created index on verification_status';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_verification_stock_issuance' AND object_id = OBJECT_ID('dbo.inventory_verification_requests'))
BEGIN
    CREATE INDEX IX_verification_stock_issuance ON dbo.inventory_verification_requests(stock_issuance_id);
    PRINT '✅ Created index on stock_issuance_id';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_verification_verified_by' AND object_id = OBJECT_ID('dbo.inventory_verification_requests'))
BEGIN
    CREATE INDEX IX_verification_verified_by ON dbo.inventory_verification_requests(verified_by_user_id);
    PRINT '✅ Created index on verified_by_user_id';
END
GO

-- =========================================
-- 5. CREATE VIEW FOR PENDING VERIFICATIONS
-- =========================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications')
    DROP VIEW dbo.View_Pending_Inventory_Verifications;
GO

CREATE VIEW dbo.View_Pending_Inventory_Verifications AS
SELECT 
    ivr.id AS verification_id,
    ivr.stock_issuance_id,
    ivr.item_master_id,
    im.nomenclature AS item_name,
    im.item_code,
    ivr.requested_quantity,
    ivr.requested_by_name,
    ivr.requested_at,
    ivr.verification_status,
    ivr.wing_id,
    ivr.wing_name,
    w.wing_name AS wing_full_name,
    sir.purpose AS request_purpose,
    sir.request_type,
    u.FullName AS requester_name
FROM dbo.inventory_verification_requests ivr
LEFT JOIN dbo.item_master im ON ivr.item_master_id = im.id
LEFT JOIN dbo.wings w ON ivr.wing_id = w.id
LEFT JOIN dbo.stock_issuance_requests sir ON ivr.stock_issuance_id = sir.id
LEFT JOIN dbo.AspNetUsers u ON sir.requester_id = u.Id
WHERE ivr.verification_status = 'pending';
GO

PRINT '✅ Created View_Pending_Inventory_Verifications';
GO

-- =========================================
-- 6. CREATE STORED PROCEDURE FOR INVENTORY CHECK
-- =========================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CheckWingInventoryAvailability')
    DROP PROCEDURE dbo.sp_CheckWingInventoryAvailability;
GO

CREATE PROCEDURE dbo.sp_CheckWingInventoryAvailability
    @ItemMasterId INT,
    @WingId INT,
    @RequestedQuantity INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AvailableQty INT;
    DECLARE @IsAvailable BIT;
    DECLARE @ItemName NVARCHAR(255);
    DECLARE @Unit NVARCHAR(50);
    
    -- Get item details
    SELECT 
        @ItemName = nomenclature,
        @Unit = unit
    FROM dbo.item_master
    WHERE id = @ItemMasterId;
    
    -- Check wing inventory stock
    -- Assuming there's a wing_inventory_stock table or View_Current_Inv_Stock filtered by wing
    SELECT 
        @AvailableQty = ISNULL(SUM(current_quantity), 0)
    FROM dbo.View_Current_Inv_Stock
    WHERE item_master_id = @ItemMasterId
        AND (wing_id = @WingId OR wing_id IS NULL); -- Include unassigned stock
    
    -- Determine availability
    SET @IsAvailable = CASE 
        WHEN @AvailableQty >= @RequestedQuantity THEN 1 
        ELSE 0 
    END;
    
    -- Return results
    SELECT 
        @ItemMasterId AS item_master_id,
        @ItemName AS item_name,
        @Unit AS unit,
        @RequestedQuantity AS requested_quantity,
        @AvailableQty AS available_quantity,
        @IsAvailable AS is_available,
        CASE 
            WHEN @AvailableQty >= @RequestedQuantity THEN 'Sufficient Stock'
            WHEN @AvailableQty > 0 THEN 'Partial Stock Available'
            ELSE 'Out of Stock'
        END AS availability_status;
END
GO

PRINT '✅ Created sp_CheckWingInventoryAvailability';
GO

-- =========================================
-- 7. SUMMARY
-- =========================================

PRINT '';
PRINT '========================================';
PRINT '✅ INVENTORY VERIFICATION WORKFLOW SCHEMA COMPLETE!';
PRINT '========================================';
PRINT '';
PRINT 'Created/Updated:';
PRINT '  ✅ inventory_verification_requests table';
PRINT '  ✅ stock_issuance_items inventory columns';
PRINT '  ✅ stock_issuance_requests verification tracking';
PRINT '  ✅ Performance indexes';
PRINT '  ✅ View_Pending_Inventory_Verifications';
PRINT '  ✅ sp_CheckWingInventoryAvailability';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run this script on your database';
PRINT '  2. Update backend API endpoints';
PRINT '  3. Update frontend approval components';
PRINT '';
