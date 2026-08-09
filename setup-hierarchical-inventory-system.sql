-- =============================================
-- HIERARCHICAL INVENTORY MANAGEMENT SYSTEM
-- Wing Inventory + Admin Inventory + Deduction Logic
-- =============================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '========================================';
PRINT '🚀 SETTING UP HIERARCHICAL INVENTORY SYSTEM';
PRINT '========================================';
PRINT '';

-- =========================================
-- TABLE 1: INVENTORY_LOCATIONS
-- Define where inventory is stored (Wing vs Admin)
-- =========================================

PRINT '📋 PHASE 1: CREATING inventory_locations TABLE...';
GO

IF OBJECT_ID('dbo.inventory_locations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventory_locations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Location type and hierarchy
        location_type NVARCHAR(50) NOT NULL -- 'ADMIN_INVENTORY', 'WING_INVENTORY'
            CHECK (location_type IN ('ADMIN_INVENTORY', 'WING_INVENTORY')),
        
        location_name NVARCHAR(255) NOT NULL,
        location_code NVARCHAR(50),
        
        -- Wing reference (NULL for admin)
        wing_id INT NULL,
        wing_name NVARCHAR(255) NULL,
        
        -- Status
        is_active BIT DEFAULT 1,
        
        -- Description
        description NVARCHAR(MAX) NULL,
        
        -- Audit
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign key
        CONSTRAINT fk_il_wing FOREIGN KEY (wing_id) REFERENCES dbo.WingsInformation(Id)
    );
    
    PRINT '   ✅ Created inventory_locations table';
    
    -- Create indexes
    CREATE INDEX idx_il_type ON dbo.inventory_locations(location_type);
    CREATE INDEX idx_il_wing ON dbo.inventory_locations(wing_id);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  inventory_locations table already exists';
END
GO

-- =========================================
-- TABLE 2: INVENTORY_STOCK
-- Track quantity at each location
-- =========================================

PRINT '';
PRINT '📋 PHASE 2: CREATING inventory_stock TABLE...';
GO

IF OBJECT_ID('dbo.inventory_stock', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventory_stock (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Item and location
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        location_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Quantities
        quantity INT NOT NULL DEFAULT 0,
        reserved_quantity INT DEFAULT 0, -- Reserved for pending requests
        available_quantity INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
        
        -- Tracking
        last_received_at DATETIME2 NULL,
        last_issued_at DATETIME2 NULL,
        
        -- Audit
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_is_item FOREIGN KEY (item_master_id) REFERENCES dbo.item_masters(id),
        CONSTRAINT fk_is_location FOREIGN KEY (location_id) REFERENCES dbo.inventory_locations(id),
        
        -- Unique: One item per location
        CONSTRAINT uk_is_item_location UNIQUE (item_master_id, location_id)
    );
    
    PRINT '   ✅ Created inventory_stock table';
    
    -- Create indexes
    CREATE INDEX idx_is_item ON dbo.inventory_stock(item_master_id);
    CREATE INDEX idx_is_location ON dbo.inventory_stock(location_id);
    CREATE INDEX idx_is_available ON dbo.inventory_stock(available_quantity);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  inventory_stock table already exists';
END
GO

-- =========================================
-- TABLE 3: REQUEST_INVENTORY_SOURCE
-- Track which inventory should be deducted for each request
-- =========================================

PRINT '';
PRINT '📋 PHASE 3: CREATING request_inventory_source TABLE...';
GO

IF OBJECT_ID('dbo.request_inventory_source', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.request_inventory_source (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Request details
        request_id UNIQUEIDENTIFIER NOT NULL,
        wing_id INT NULL, -- Which wing made the request
        wing_name NVARCHAR(255) NULL,
        
        -- Inventory source
        source_location_id UNIQUEIDENTIFIER NOT NULL, -- Where to deduct from
        source_location_type NVARCHAR(50) NOT NULL, -- 'WING_INVENTORY' or 'ADMIN_INVENTORY'
        source_wing_id INT NULL,
        source_wing_name NVARCHAR(255) NULL,
        
        -- Request type
        request_type NVARCHAR(50) NOT NULL -- 'WING_REQUEST', 'ADMIN_REQUEST', 'FORWARDED_REQUEST'
            CHECK (request_type IN ('WING_REQUEST', 'ADMIN_REQUEST', 'FORWARDED_REQUEST')),
        
        -- Status
        fulfillment_status NVARCHAR(30) NOT NULL DEFAULT 'pending'
            CHECK (fulfillment_status IN ('pending', 'wing_approved', 'forwarded_to_admin', 'admin_approved', 'fulfilled', 'partially_fulfilled')),
        
        -- Forwarding details
        forwarded_at DATETIME2 NULL,
        forwarded_by_user_id NVARCHAR(450) NULL,
        forwarded_by_name NVARCHAR(255) NULL,
        forward_reason NVARCHAR(MAX) NULL, -- Why forwarded (insufficient stock in wing)
        
        -- Approval chain
        wing_approved_at DATETIME2 NULL,
        wing_approved_by_user_id NVARCHAR(450) NULL,
        wing_approved_by_name NVARCHAR(255) NULL,
        
        admin_approved_at DATETIME2 NULL,
        admin_approved_by_user_id NVARCHAR(450) NULL,
        admin_approved_by_name NVARCHAR(255) NULL,
        
        -- Audit
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_ris_request FOREIGN KEY (request_id) REFERENCES dbo.stock_issuance_requests(id),
        CONSTRAINT fk_ris_source_location FOREIGN KEY (source_location_id) REFERENCES dbo.inventory_locations(id),
        CONSTRAINT fk_ris_wing FOREIGN KEY (wing_id) REFERENCES dbo.WingsInformation(Id)
    );
    
    PRINT '   ✅ Created request_inventory_source table';
    
    -- Create indexes
    CREATE INDEX idx_ris_request ON dbo.request_inventory_source(request_id);
    CREATE INDEX idx_ris_wing ON dbo.request_inventory_source(wing_id);
    CREATE INDEX idx_ris_source ON dbo.request_inventory_source(source_location_id);
    CREATE INDEX idx_ris_status ON dbo.request_inventory_source(fulfillment_status);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  request_inventory_source table already exists';
END
GO

-- =========================================
-- TABLE 4: STOCK_TRANSFER_LOG
-- Track all inventory movements between locations
-- =========================================

PRINT '';
PRINT '📋 PHASE 4: CREATING stock_transfer_log TABLE...';
GO

IF OBJECT_ID('dbo.stock_transfer_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_transfer_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Item being moved
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        item_code NVARCHAR(100),
        item_name NVARCHAR(500),
        
        -- Locations involved
        from_location_id UNIQUEIDENTIFIER NULL, -- NULL if initial receipt
        from_location_name NVARCHAR(255) NULL,
        to_location_id UNIQUEIDENTIFIER NOT NULL,
        to_location_name NVARCHAR(255) NOT NULL,
        
        -- Transfer details
        transfer_type NVARCHAR(50) NOT NULL -- 'INITIAL_RECEIPT', 'ISSUANCE', 'RETURN', 'TRANSFER'
            CHECK (transfer_type IN ('INITIAL_RECEIPT', 'ISSUANCE', 'RETURN', 'TRANSFER')),
        
        quantity_transferred INT NOT NULL,
        
        -- Reference
        reference_type NVARCHAR(50), -- 'REQUEST', 'RETURN', 'ADJUSTMENT', 'FORWARD'
        reference_id UNIQUEIDENTIFIER,
        
        -- User involved
        user_id NVARCHAR(450),
        user_name NVARCHAR(255),
        
        -- Reason/notes
        reason NVARCHAR(MAX),
        
        -- Timestamp (immutable)
        transferred_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_stl_item FOREIGN KEY (item_master_id) REFERENCES dbo.item_masters(id),
        CONSTRAINT fk_stl_from_location FOREIGN KEY (from_location_id) REFERENCES dbo.inventory_locations(id),
        CONSTRAINT fk_stl_to_location FOREIGN KEY (to_location_id) REFERENCES dbo.inventory_locations(id)
    );
    
    PRINT '   ✅ Created stock_transfer_log table';
    
    -- Create indexes
    CREATE INDEX idx_stl_item ON dbo.stock_transfer_log(item_master_id);
    CREATE INDEX idx_stl_from ON dbo.stock_transfer_log(from_location_id);
    CREATE INDEX idx_stl_to ON dbo.stock_transfer_log(to_location_id);
    CREATE INDEX idx_stl_type ON dbo.stock_transfer_log(transfer_type);
    CREATE INDEX idx_stl_date ON dbo.stock_transfer_log(transferred_at);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  stock_transfer_log table already exists';
END
GO

-- =========================================
-- STORED PROCEDURE: INITIALIZE INVENTORY LOCATIONS
-- =========================================

PRINT '';
PRINT '📋 PHASE 5: CREATING sp_InitializeInventoryLocations PROCEDURE...';
GO

IF OBJECT_ID('dbo.sp_InitializeInventoryLocations', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_InitializeInventoryLocations;
GO

CREATE PROCEDURE dbo.sp_InitializeInventoryLocations
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AdminLocationId UNIQUEIDENTIFIER;
    DECLARE @WingLocationId UNIQUEIDENTIFIER;
    DECLARE @WingId INT;
    DECLARE @WingName NVARCHAR(255);
    
    BEGIN TRY
        -- Create main ADMIN inventory location if not exists
        IF NOT EXISTS (SELECT 1 FROM inventory_locations WHERE location_type = 'ADMIN_INVENTORY' AND wing_id IS NULL)
        BEGIN
            SET @AdminLocationId = NEWID();
            INSERT INTO inventory_locations (id, location_type, location_name, location_code, is_active)
            VALUES (@AdminLocationId, 'ADMIN_INVENTORY', 'Main Admin Inventory', 'ADMIN_INV', 1);
            PRINT '✅ Created ADMIN_INVENTORY location';
        END
        
        -- Create WING inventory locations for each active wing
        DECLARE wing_cursor CURSOR FOR
        SELECT Id, Name FROM WingsInformation WHERE ISACT = 1;
        
        OPEN wing_cursor;
        FETCH NEXT FROM wing_cursor INTO @WingId, @WingName;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM inventory_locations 
                          WHERE location_type = 'WING_INVENTORY' AND wing_id = @WingId)
            BEGIN
                SET @WingLocationId = NEWID();
                INSERT INTO inventory_locations (id, location_type, location_name, location_code, wing_id, wing_name, is_active)
                VALUES (@WingLocationId, 'WING_INVENTORY', CONCAT('Wing - ', @WingName), CONCAT('WING_', @WingId), @WingId, @WingName, 1);
                PRINT CONCAT('✅ Created WING_INVENTORY location for ', @WingName);
            END
            
            FETCH NEXT FROM wing_cursor INTO @WingId, @WingName;
        END
        
        CLOSE wing_cursor;
        DEALLOCATE wing_cursor;
        
    END TRY
    BEGIN CATCH
        PRINT CONCAT('❌ Error initializing locations: ', ERROR_MESSAGE());
        THROW;
    END CATCH
END
GO

PRINT '   ✅ Created sp_InitializeInventoryLocations procedure';

-- Execute initialization
EXEC sp_InitializeInventoryLocations;

PRINT '';

-- =========================================
-- STORED PROCEDURE: DEDUCT WITH HIERARCHY
-- =========================================

PRINT '📋 PHASE 6: CREATING sp_DeductWithHierarchy PROCEDURE...';
GO

IF OBJECT_ID('dbo.sp_DeductWithHierarchy', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_DeductWithHierarchy;
GO

CREATE PROCEDURE dbo.sp_DeductWithHierarchy
    @RequestId UNIQUEIDENTIFIER,
    @ItemMasterId UNIQUEIDENTIFIER,
    @QuantityToDeduct INT,
    @WingId INT = NULL, -- NULL means Admin request
    @DeductedBy NVARCHAR(450),
    @DeductedByName NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @SourceLocationId UNIQUEIDENTIFIER;
    DECLARE @SourceLocationType NVARCHAR(50);
    DECLARE @CurrentQuantity INT;
    DECLARE @NewQuantity INT;
    DECLARE @ItemCode NVARCHAR(100);
    DECLARE @ItemName NVARCHAR(500);
    DECLARE @SourceLocationName NVARCHAR(255);
    DECLARE @IsForwarded BIT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        PRINT CONCAT('🔄 Deducting ', @QuantityToDeduct, ' units with hierarchy...');
        
        -- Determine source location based on wing
        IF @WingId IS NOT NULL
        BEGIN
            -- Wing request - deduct from wing inventory
            SELECT @SourceLocationId = id, @SourceLocationType = location_type, @SourceLocationName = location_name
            FROM inventory_locations
            WHERE location_type = 'WING_INVENTORY' AND wing_id = @WingId AND is_active = 1;
            
            IF @SourceLocationId IS NULL
            BEGIN
                THROW 50001, CONCAT('Wing inventory location not found for Wing ID: ', @WingId), 1;
            END
            
            PRINT CONCAT('   Source: WING INVENTORY (', @SourceLocationName, ')');
        END
        ELSE
        BEGIN
            -- Admin request - deduct from admin inventory
            SELECT @SourceLocationId = id, @SourceLocationType = location_type, @SourceLocationName = location_name
            FROM inventory_locations
            WHERE location_type = 'ADMIN_INVENTORY' AND wing_id IS NULL AND is_active = 1;
            
            IF @SourceLocationId IS NULL
            BEGIN
                THROW 50002, 'Admin inventory location not found', 1;
            END
            
            PRINT CONCAT('   Source: ADMIN INVENTORY (', @SourceLocationName, ')');
        END
        
        -- Get current stock at location
        SELECT @CurrentQuantity = ISNULL(quantity, 0), @ItemCode = im.item_code, @ItemName = im.nomenclature
        FROM inventory_stock ist
        JOIN item_masters im ON ist.item_master_id = im.id
        WHERE ist.item_master_id = @ItemMasterId AND ist.location_id = @SourceLocationId;
        
        IF @CurrentQuantity IS NULL
        BEGIN
            -- Stock record doesn't exist, create it
            INSERT INTO inventory_stock (item_master_id, location_id, quantity)
            VALUES (@ItemMasterId, @SourceLocationId, 0);
            SET @CurrentQuantity = 0;
        END
        
        -- Validate sufficient quantity
        IF @CurrentQuantity < @QuantityToDeduct
        BEGIN
            THROW 50003, CONCAT('Insufficient inventory at ', @SourceLocationName, '. Available: ', @CurrentQuantity, ', Requested: ', @QuantityToDeduct), 1;
        END
        
        SET @NewQuantity = @CurrentQuantity - @QuantityToDeduct;
        
        -- Deduct from inventory_stock
        UPDATE inventory_stock
        SET quantity = @NewQuantity,
            last_issued_at = GETDATE(),
            updated_at = GETDATE()
        WHERE item_master_id = @ItemMasterId AND location_id = @SourceLocationId;
        
        PRINT CONCAT('   ✅ Deducted ', @QuantityToDeduct, ' units. New quantity: ', @NewQuantity);
        
        -- Log the transfer
        INSERT INTO stock_transfer_log (
            item_master_id, item_code, item_name,
            to_location_id, to_location_name,
            transfer_type, quantity_transferred,
            reference_type, reference_id,
            user_id, user_name, reason,
            transferred_at
        ) VALUES (
            @ItemMasterId, @ItemCode, @ItemName,
            @SourceLocationId, @SourceLocationName,
            'ISSUANCE', @QuantityToDeduct,
            'REQUEST', @RequestId,
            @DeductedBy, @DeductedByName, 
            CONCAT('Deducted for approved request from ', @SourceLocationName),
            GETDATE()
        );
        
        PRINT '   ✅ Logged stock transfer';
        
        COMMIT TRANSACTION;
        
        SELECT 1 as success, @NewQuantity as new_quantity, @SourceLocationName as source_location;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        PRINT CONCAT('❌ Error deducting with hierarchy: ', ERROR_MESSAGE());
        THROW;
    END CATCH
END
GO

PRINT '   ✅ Created sp_DeductWithHierarchy procedure';
PRINT '';

-- =========================================
-- SUMMARY
-- =========================================

PRINT '';
PRINT '========================================';
PRINT '✅ HIERARCHICAL INVENTORY SYSTEM READY!';
PRINT '========================================';
PRINT '';
PRINT 'Tables created:';
PRINT '   1. inventory_locations - Where inventory is stored (Admin vs Wings)';
PRINT '   2. inventory_stock - Quantity at each location';
PRINT '   3. request_inventory_source - Track which location to deduct from';
PRINT '   4. stock_transfer_log - Immutable log of all transfers';
PRINT '';
PRINT 'Procedures created:';
PRINT '   1. sp_InitializeInventoryLocations - Setup locations';
PRINT '   2. sp_DeductWithHierarchy - Deduct from correct location';
PRINT '';
PRINT 'Workflow:';
PRINT '   1. Wing request → Approve → Deduct from WING inventory';
PRINT '   2. Admin request → Approve → Deduct from ADMIN inventory';
PRINT '   3. Forwarded request → Admin approves → Deduct from ADMIN inventory';
PRINT '';
PRINT 'Location structure:';
PRINT '   - Admin Inventory (1 location for all items)';
PRINT '   - Wing Inventories (1 per wing)';
PRINT '';
