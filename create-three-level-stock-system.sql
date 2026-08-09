-- =========================================
-- THREE-LEVEL INVENTORY STOCK SYSTEM
-- =========================================
-- Creates Admin Store, Wing Store, and Personal Store tables
-- Implementation Date: November 27, 2025

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO

-- =========================================
-- LEVEL 1: ADMIN STORE (Central Inventory)
-- =========================================
-- This is the master inventory managed by admins
-- Handles procurement, tenders, and supplies wings

IF OBJECT_ID('dbo.stock_admin', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_admin (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_master_id NVARCHAR(450) NOT NULL,  -- Changed to match ItemMaster.intOfficeID type
        
        -- Stock Quantities
        current_quantity INT NOT NULL DEFAULT 0,
        available_quantity INT NOT NULL DEFAULT 0,  -- current - reserved
        reserved_quantity INT NOT NULL DEFAULT 0,   -- pending issuances
        
        -- Stock Levels
        minimum_stock_level INT NOT NULL DEFAULT 0,
        reorder_point INT NOT NULL DEFAULT 0,
        maximum_stock_level INT,
        
        -- Pricing
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_value AS (current_quantity * unit_price) PERSISTED,
        
        -- Location
        storage_location NVARCHAR(200),
        warehouse_section NVARCHAR(100),
        
        -- Status
        stock_status NVARCHAR(20) DEFAULT 'Available' 
            CHECK (stock_status IN ('Available', 'Low Stock', 'Out of Stock', 'On Order')),
        
        -- Metadata
        last_restocked_date DATETIME2,
        last_restocked_quantity INT,
        notes NVARCHAR(MAX),
        
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER,
        updated_by UNIQUEIDENTIFIER,
        
        CONSTRAINT FK_stock_admin_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.ItemMaster(intOfficeID) ON DELETE CASCADE,
        CONSTRAINT CK_stock_admin_quantities CHECK (
            available_quantity >= 0 AND 
            reserved_quantity >= 0 AND 
            current_quantity = available_quantity + reserved_quantity
        )
    );
    
    CREATE INDEX IX_stock_admin_item ON dbo.stock_admin(item_master_id);
    CREATE INDEX IX_stock_admin_status ON dbo.stock_admin(stock_status);
    CREATE INDEX IX_stock_admin_available ON dbo.stock_admin(available_quantity);
    
    PRINT '✅ Created stock_admin table (Admin Store - Level 1)';
END
ELSE
BEGIN
    PRINT '⚠️ stock_admin table already exists';
END
GO

-- =========================================
-- LEVEL 2: WING STORE (Department Inventory)
-- =========================================
-- Each wing has its own inventory managed by wing supervisor
-- Fulfills individual user requests from that wing

IF OBJECT_ID('dbo.stock_wing', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_wing (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        wing_id INT NOT NULL,  -- Which wing owns this stock
        
        -- Stock Quantities
        current_quantity INT NOT NULL DEFAULT 0,
        available_quantity INT NOT NULL DEFAULT 0,  -- current - reserved
        reserved_quantity INT NOT NULL DEFAULT 0,   -- pending issuances
        
        -- Stock Levels
        minimum_stock_level INT NOT NULL DEFAULT 0,
        reorder_point INT NOT NULL DEFAULT 0,
        maximum_stock_level INT,
        
        -- Pricing (inherited from admin store or set separately)
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_value AS (current_quantity * unit_price) PERSISTED,
        
        -- Location within wing
        storage_location NVARCHAR(200),
        storage_room NVARCHAR(100),
        
        -- Status
        stock_status NVARCHAR(20) DEFAULT 'Available' 
            CHECK (stock_status IN ('Available', 'Low Stock', 'Out of Stock', 'Requested from Admin')),
        
        -- Source tracking
        sourced_from_admin_date DATETIME2,
        last_replenished_date DATETIME2,
        last_replenished_quantity INT,
        
        -- Metadata
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER,
        updated_by UNIQUEIDENTIFIER,
        
        CONSTRAINT FK_stock_wing_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.ItemMaster(intOfficeID) ON DELETE CASCADE,
        CONSTRAINT FK_stock_wing_wing FOREIGN KEY (wing_id) 
            REFERENCES dbo.Wings(intWingID),
        CONSTRAINT CK_stock_wing_quantities CHECK (
            available_quantity >= 0 AND 
            reserved_quantity >= 0 AND 
            current_quantity = available_quantity + reserved_quantity
        ),
        -- Ensure one entry per item per wing
        CONSTRAINT UQ_stock_wing_item_wing UNIQUE (item_master_id, wing_id)
    );
    
    CREATE INDEX IX_stock_wing_item ON dbo.stock_wing(item_master_id);
    CREATE INDEX IX_stock_wing_wing ON dbo.stock_wing(wing_id);
    CREATE INDEX IX_stock_wing_status ON dbo.stock_wing(stock_status);
    CREATE INDEX IX_stock_wing_available ON dbo.stock_wing(available_quantity);
    
    PRINT '✅ Created stock_wing table (Wing Store - Level 2)';
END
ELSE
BEGIN
    PRINT '⚠️ stock_wing table already exists';
END
GO

-- =========================================
-- LEVEL 3: PERSONAL STORE (User Issued Items)
-- =========================================
-- Tracks items issued to individual users
-- Used for accountability and returns

IF OBJECT_ID('dbo.stock_personal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_personal (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,  -- Who has this item
        wing_id INT NOT NULL,  -- User's wing
        
        -- Issuance Details
        issued_quantity INT NOT NULL,
        current_quantity INT NOT NULL,  -- May decrease if partially returned
        
        -- Issuance Info
        issued_date DATETIME2 NOT NULL,
        issued_by UNIQUEIDENTIFIER,  -- Supervisor who issued
        issuance_request_id UNIQUEIDENTIFIER,  -- Link to original request
        
        -- Return Info
        is_returnable BIT NOT NULL DEFAULT 1,
        expected_return_date DATE,
        return_status NVARCHAR(20) DEFAULT 'Not Returned' 
            CHECK (return_status IN ('Not Returned', 'Partially Returned', 'Fully Returned', 'Overdue')),
        actual_return_date DATETIME2,
        returned_quantity INT DEFAULT 0,
        
        -- Purpose & Notes
        purpose NVARCHAR(MAX),
        issuance_notes NVARCHAR(MAX),
        condition_at_issue NVARCHAR(100),
        condition_at_return NVARCHAR(100),
        
        -- Pricing
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_value AS (current_quantity * unit_price) PERSISTED,
        
        -- Status
        item_status NVARCHAR(20) DEFAULT 'In Use' 
            CHECK (item_status IN ('In Use', 'Returned', 'Damaged', 'Lost', 'Under Maintenance')),
        
        -- Metadata
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_stock_personal_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.ItemMaster(intOfficeID),
        CONSTRAINT FK_stock_personal_user FOREIGN KEY (user_id) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_stock_personal_wing FOREIGN KEY (wing_id) 
            REFERENCES dbo.Wings(intWingID),
        CONSTRAINT FK_stock_personal_issued_by FOREIGN KEY (issued_by) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT CK_stock_personal_quantities CHECK (
            issued_quantity >= current_quantity AND
            current_quantity >= 0 AND
            returned_quantity >= 0 AND
            issued_quantity = current_quantity + returned_quantity
        )
    );
    
    CREATE INDEX IX_stock_personal_item ON dbo.stock_personal(item_master_id);
    CREATE INDEX IX_stock_personal_user ON dbo.stock_personal(user_id);
    CREATE INDEX IX_stock_personal_wing ON dbo.stock_personal(wing_id);
    CREATE INDEX IX_stock_personal_status ON dbo.stock_personal(return_status);
    CREATE INDEX IX_stock_personal_returnable ON dbo.stock_personal(is_returnable);
    
    PRINT '✅ Created stock_personal table (Personal Store - Level 3)';
END
ELSE
BEGIN
    PRINT '⚠️ stock_personal table already exists';
END
GO

-- =========================================
-- STOCK TRANSFER LOG
-- =========================================
-- Tracks movement of stock between the three levels

IF OBJECT_ID('dbo.stock_transfer_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_transfer_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        transfer_number NVARCHAR(50) UNIQUE NOT NULL,
        transfer_date DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        quantity INT NOT NULL,
        
        -- Source & Destination
        from_store_type NVARCHAR(20) NOT NULL 
            CHECK (from_store_type IN ('Admin', 'Wing', 'Personal')),
        from_wing_id INT,  -- NULL if from admin
        from_user_id UNIQUEIDENTIFIER,  -- NULL unless from personal
        
        to_store_type NVARCHAR(20) NOT NULL 
            CHECK (to_store_type IN ('Admin', 'Wing', 'Personal')),
        to_wing_id INT,  -- NULL if to admin
        to_user_id UNIQUEIDENTIFIER,  -- NULL unless to personal
        
        -- Transfer Details
        transfer_type NVARCHAR(30) NOT NULL 
            CHECK (transfer_type IN ('Admin to Wing', 'Wing to Personal', 'Personal Return to Wing', 'Wing Return to Admin')),
        transfer_reason NVARCHAR(MAX),
        request_reference UNIQUEIDENTIFIER,  -- Link to issuance request
        
        -- Approval
        approved_by UNIQUEIDENTIFIER,
        approved_at DATETIME2,
        
        -- Status
        transfer_status NVARCHAR(20) DEFAULT 'Completed' 
            CHECK (transfer_status IN ('Pending', 'In Transit', 'Completed', 'Cancelled')),
        
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER,
        
        CONSTRAINT FK_transfer_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.ItemMaster(intOfficeID),
        CONSTRAINT FK_transfer_from_wing FOREIGN KEY (from_wing_id) 
            REFERENCES dbo.Wings(intWingID),
        CONSTRAINT FK_transfer_to_wing FOREIGN KEY (to_wing_id) 
            REFERENCES dbo.Wings(intWingID),
        CONSTRAINT FK_transfer_from_user FOREIGN KEY (from_user_id) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_transfer_to_user FOREIGN KEY (to_user_id) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_transfer_approved_by FOREIGN KEY (approved_by) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_transfer_created_by FOREIGN KEY (created_by) 
            REFERENCES dbo.AspNetUsers(Id)
    );
    
    CREATE INDEX IX_transfer_item ON dbo.stock_transfer_log(item_master_id);
    CREATE INDEX IX_transfer_date ON dbo.stock_transfer_log(transfer_date);
    CREATE INDEX IX_transfer_from_wing ON dbo.stock_transfer_log(from_wing_id);
    CREATE INDEX IX_transfer_to_wing ON dbo.stock_transfer_log(to_wing_id);
    CREATE INDEX IX_transfer_status ON dbo.stock_transfer_log(transfer_status);
    
    PRINT '✅ Created stock_transfer_log table';
END
ELSE
BEGIN
    PRINT '⚠️ stock_transfer_log table already exists';
END
GO

-- =========================================
-- HELPER VIEWS FOR QUICK ACCESS
-- =========================================

-- View: Combined stock across all levels
IF OBJECT_ID('dbo.vw_stock_all_levels', 'V') IS NOT NULL
    DROP VIEW dbo.vw_stock_all_levels;
GO

CREATE VIEW dbo.vw_stock_all_levels AS
SELECT 
    'Admin' AS store_level,
    NULL AS wing_id,
    NULL AS user_id,
    sa.item_master_id,
    im.strNomenclature AS nomenclature,
    sa.current_quantity,
    sa.available_quantity,
    sa.reserved_quantity,
    sa.stock_status,
    sa.storage_location,
    sa.unit_price,
    sa.total_value
FROM dbo.stock_admin sa
JOIN dbo.ItemMaster im ON sa.item_master_id = im.intOfficeID

UNION ALL

SELECT 
    'Wing' AS store_level,
    sw.wing_id,
    NULL AS user_id,
    sw.item_master_id,
    im.strNomenclature AS nomenclature,
    sw.current_quantity,
    sw.available_quantity,
    sw.reserved_quantity,
    sw.stock_status,
    sw.storage_location,
    sw.unit_price,
    sw.total_value
FROM dbo.stock_wing sw
JOIN dbo.ItemMaster im ON sw.item_master_id = im.intOfficeID

UNION ALL

SELECT 
    'Personal' AS store_level,
    sp.wing_id,
    sp.user_id,
    sp.item_master_id,
    im.strNomenclature AS nomenclature,
    sp.current_quantity,
    sp.current_quantity AS available_quantity,  -- personal items are "in use"
    0 AS reserved_quantity,
    sp.item_status AS stock_status,
    NULL AS storage_location,
    sp.unit_price,
    sp.total_value
FROM dbo.stock_personal sp
JOIN dbo.ItemMaster im ON sp.item_master_id = im.intOfficeID;
GO

PRINT '✅ Created vw_stock_all_levels view';
GO

-- =========================================
-- SUMMARY
-- =========================================
PRINT '';
PRINT '========================================';
PRINT '✅ THREE-LEVEL STOCK SYSTEM CREATED';
PRINT '========================================';
PRINT '📦 Level 1: stock_admin (Central Inventory)';
PRINT '📦 Level 2: stock_wing (Department Inventory)';
PRINT '📦 Level 3: stock_personal (User Issued Items)';
PRINT '📊 Transfer Log: stock_transfer_log';
PRINT '👁️ Combined View: vw_stock_all_levels';
PRINT '';
PRINT '⏭️ Next Steps:';
PRINT '1. Populate stock_admin with initial inventory';
PRINT '2. Configure wing stock levels';
PRINT '3. Update approval workflow in stock issuance';
PRINT '========================================';
