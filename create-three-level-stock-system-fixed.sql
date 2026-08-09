-- =========================================
-- THREE-LEVEL INVENTORY STOCK SYSTEM
-- =========================================
-- Creates Admin Store, Wing Store, and Personal Store tables
-- Implementation Date: November 27, 2025

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
GO

PRINT '📦 Creating Three-Level Stock System...';
PRINT '';

-- =========================================
-- LEVEL 1: ADMIN STORE (Central Inventory)
-- =========================================

IF OBJECT_ID('dbo.stock_admin', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_admin (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Stock Quantities
        current_quantity INT NOT NULL CONSTRAINT DF_stock_admin_current DEFAULT 0,
        available_quantity INT NOT NULL CONSTRAINT DF_stock_admin_available DEFAULT 0,
        reserved_quantity INT NOT NULL CONSTRAINT DF_stock_admin_reserved DEFAULT 0,
        
        -- Stock Levels
        minimum_stock_level INT NOT NULL CONSTRAINT DF_stock_admin_min DEFAULT 0,
        reorder_point INT NOT NULL CONSTRAINT DF_stock_admin_reorder DEFAULT 0,
        maximum_stock_level INT NULL,
        
        -- Pricing
        unit_price DECIMAL(15, 2) CONSTRAINT DF_stock_admin_price DEFAULT 0,
        total_value AS (CAST(current_quantity AS DECIMAL(15,2)) * unit_price) PERSISTED,
        
        -- Location
        storage_location NVARCHAR(200) NULL,
        warehouse_section NVARCHAR(100) NULL,
        
        -- Status
        stock_status NVARCHAR(20) CONSTRAINT DF_stock_admin_status DEFAULT 'Available' 
            CHECK (stock_status IN ('Available', 'Low Stock', 'Out of Stock', 'On Order')),
        
        -- Metadata
        last_restocked_date DATETIME2 NULL,
        last_restocked_quantity INT NULL,
        notes NVARCHAR(MAX) NULL,
        
        created_at DATETIME2 CONSTRAINT DF_stock_admin_created DEFAULT GETDATE(),
        updated_at DATETIME2 CONSTRAINT DF_stock_admin_updated DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        updated_by UNIQUEIDENTIFIER NULL,
        
        CONSTRAINT FK_stock_admin_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.item_masters(id) ON DELETE CASCADE
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

IF OBJECT_ID('dbo.stock_wing', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_wing (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        wing_id INT NOT NULL,
        
        -- Stock Quantities
        current_quantity INT NOT NULL CONSTRAINT DF_stock_wing_current DEFAULT 0,
        available_quantity INT NOT NULL CONSTRAINT DF_stock_wing_available DEFAULT 0,
        reserved_quantity INT NOT NULL CONSTRAINT DF_stock_wing_reserved DEFAULT 0,
        
        -- Stock Levels
        minimum_stock_level INT NOT NULL CONSTRAINT DF_stock_wing_min DEFAULT 0,
        reorder_point INT NOT NULL CONSTRAINT DF_stock_wing_reorder DEFAULT 0,
        maximum_stock_level INT NULL,
        
        -- Pricing
        unit_price DECIMAL(15, 2) CONSTRAINT DF_stock_wing_price DEFAULT 0,
        total_value AS (CAST(current_quantity AS DECIMAL(15,2)) * unit_price) PERSISTED,
        
        -- Location
        storage_location NVARCHAR(200) NULL,
        storage_room NVARCHAR(100) NULL,
        
        -- Status
        stock_status NVARCHAR(20) CONSTRAINT DF_stock_wing_status DEFAULT 'Available' 
            CHECK (stock_status IN ('Available', 'Low Stock', 'Out of Stock', 'Requested from Admin')),
        
        -- Source tracking
        sourced_from_admin_date DATETIME2 NULL,
        last_replenished_date DATETIME2 NULL,
        last_replenished_quantity INT NULL,
        
        -- Metadata
        notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 CONSTRAINT DF_stock_wing_created DEFAULT GETDATE(),
        updated_at DATETIME2 CONSTRAINT DF_stock_wing_updated DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        updated_by UNIQUEIDENTIFIER NULL,
        
        CONSTRAINT FK_stock_wing_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.item_masters(id) ON DELETE CASCADE,
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

IF OBJECT_ID('dbo.stock_personal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_personal (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        wing_id INT NOT NULL,
        
        -- Issuance Details
        issued_quantity INT NOT NULL,
        current_quantity INT NOT NULL,
        
        -- Issuance Info
        issued_date DATETIME2 NOT NULL,
        issued_by UNIQUEIDENTIFIER NULL,
        issuance_request_id UNIQUEIDENTIFIER NULL,
        
        -- Return Info
        is_returnable BIT NOT NULL CONSTRAINT DF_stock_personal_returnable DEFAULT 1,
        expected_return_date DATE NULL,
        return_status NVARCHAR(20) CONSTRAINT DF_stock_personal_return_status DEFAULT 'Not Returned' 
            CHECK (return_status IN ('Not Returned', 'Partially Returned', 'Fully Returned', 'Overdue')),
        actual_return_date DATETIME2 NULL,
        returned_quantity INT CONSTRAINT DF_stock_personal_returned DEFAULT 0,
        
        -- Purpose & Notes
        purpose NVARCHAR(MAX) NULL,
        issuance_notes NVARCHAR(MAX) NULL,
        condition_at_issue NVARCHAR(100) NULL,
        condition_at_return NVARCHAR(100) NULL,
        
        -- Pricing
        unit_price DECIMAL(15, 2) CONSTRAINT DF_stock_personal_price DEFAULT 0,
        total_value AS (CAST(current_quantity AS DECIMAL(15,2)) * unit_price) PERSISTED,
        
        -- Status
        item_status NVARCHAR(20) CONSTRAINT DF_stock_personal_status DEFAULT 'In Use' 
            CHECK (item_status IN ('In Use', 'Returned', 'Damaged', 'Lost', 'Under Maintenance')),
        
        -- Metadata
        created_at DATETIME2 CONSTRAINT DF_stock_personal_created DEFAULT GETDATE(),
        updated_at DATETIME2 CONSTRAINT DF_stock_personal_updated DEFAULT GETDATE(),
        
        CONSTRAINT FK_stock_personal_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.item_masters(id),
        CONSTRAINT FK_stock_personal_user FOREIGN KEY (user_id) 
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_stock_personal_issued_by FOREIGN KEY (issued_by) 
            REFERENCES dbo.AspNetUsers(Id)
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

IF OBJECT_ID('dbo.stock_transfer_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_transfer_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        transfer_number NVARCHAR(50) UNIQUE NOT NULL,
        transfer_date DATETIME2 NOT NULL CONSTRAINT DF_transfer_date DEFAULT GETDATE(),
        
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        quantity INT NOT NULL,
        
        -- Source & Destination
        from_store_type NVARCHAR(20) NOT NULL 
            CHECK (from_store_type IN ('Admin', 'Wing', 'Personal')),
        from_wing_id INT NULL,
        from_user_id UNIQUEIDENTIFIER NULL,
        
        to_store_type NVARCHAR(20) NOT NULL 
            CHECK (to_store_type IN ('Admin', 'Wing', 'Personal')),
        to_wing_id INT NULL,
        to_user_id UNIQUEIDENTIFIER NULL,
        
        -- Transfer Details
        transfer_type NVARCHAR(30) NOT NULL 
            CHECK (transfer_type IN ('Admin to Wing', 'Wing to Personal', 'Personal Return to Wing', 'Wing Return to Admin')),
        transfer_reason NVARCHAR(MAX) NULL,
        request_reference UNIQUEIDENTIFIER NULL,
        
        -- Approval
        approved_by UNIQUEIDENTIFIER NULL,
        approved_at DATETIME2 NULL,
        
        -- Status
        transfer_status NVARCHAR(20) CONSTRAINT DF_transfer_status DEFAULT 'Completed' 
            CHECK (transfer_status IN ('Pending', 'In Transit', 'Completed', 'Cancelled')),
        
        notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 CONSTRAINT DF_transfer_created DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        
        CONSTRAINT FK_transfer_item FOREIGN KEY (item_master_id) 
            REFERENCES dbo.item_masters(id),
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
-- HELPER VIEWS
-- =========================================

IF OBJECT_ID('dbo.vw_stock_all_levels', 'V') IS NOT NULL
    DROP VIEW dbo.vw_stock_all_levels;
GO

CREATE VIEW dbo.vw_stock_all_levels AS
SELECT 
    'Admin' AS store_level,
    NULL AS wing_id,
    NULL AS user_id,
    sa.item_master_id,
    im.nomenclature,
    sa.current_quantity,
    sa.available_quantity,
    sa.reserved_quantity,
    sa.stock_status,
    sa.storage_location,
    sa.unit_price,
    sa.total_value
FROM dbo.stock_admin sa
JOIN dbo.item_masters im ON sa.item_master_id = im.id

UNION ALL

SELECT 
    'Wing' AS store_level,
    sw.wing_id,
    NULL AS user_id,
    sw.item_master_id,
    im.nomenclature,
    sw.current_quantity,
    sw.available_quantity,
    sw.reserved_quantity,
    sw.stock_status,
    sw.storage_location,
    sw.unit_price,
    sw.total_value
FROM dbo.stock_wing sw
JOIN dbo.item_masters im ON sw.item_master_id = im.id

UNION ALL

SELECT 
    'Personal' AS store_level,
    sp.wing_id,
    sp.user_id,
    sp.item_master_id,
    im.nomenclature,
    sp.current_quantity,
    sp.current_quantity AS available_quantity,
    0 AS reserved_quantity,
    sp.item_status AS stock_status,
    NULL AS storage_location,
    sp.unit_price,
    sp.total_value
FROM dbo.stock_personal sp
JOIN dbo.item_masters im ON sp.item_master_id = im.id;
GO

PRINT '✅ Created vw_stock_all_levels view';
GO

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
PRINT '1. Run: populate-initial-stock.sql';
PRINT '2. Update approval workflow';
PRINT '3. Create approval APIs';
PRINT '========================================';
