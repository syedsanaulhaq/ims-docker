-- ============================================================================
-- MILESTONE-1: OPENING BALANCE STOCK TRACKING
-- ============================================================================
-- Quick implementation for tracking existing stock with tender sources
-- Supports: tender reference + received qty + already issued qty
-- Date range: Stock from 2020 onwards
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'MILESTONE-1: Opening Balance Stock Tracking Setup';
PRINT '====================================================================';

-- ============================================================================
-- STEP 1: Fix stock_acquisitions table for quantity tracking
-- ============================================================================
PRINT '';
PRINT 'STEP 1: Updating stock_acquisitions table for quantity tracking...';

-- Check if stock_acquisitions table exists, create if not
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_acquisitions')
BEGIN
    CREATE TABLE stock_acquisitions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        acquisition_number NVARCHAR(50) UNIQUE,
        po_id UNIQUEIDENTIFIER NULL,
        delivery_id UNIQUEIDENTIFIER NULL,
        item_master_id UNIQUEIDENTIFIER NULL,
        total_items INT NULL,
        total_quantity DECIMAL(15,2) NULL,
        total_value DECIMAL(15,2) NULL,
        quantity_received DECIMAL(15,2) DEFAULT 0,
        quantity_issued DECIMAL(15,2) DEFAULT 0,
        quantity_available AS (quantity_received - quantity_issued) PERSISTED,
        unit_cost DECIMAL(15,2) NULL,
        delivery_date DATE NULL,
        acquisition_date DATETIME2 DEFAULT GETDATE(),
        processed_by NVARCHAR(450) NULL,
        status VARCHAR(20) DEFAULT 'completed',
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '  ✓ Created stock_acquisitions table with all columns';
END
ELSE
BEGIN
    PRINT '  ℹ stock_acquisitions table exists, adding columns...';
    
    -- Add base columns first (no computed columns)
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'item_master_id')
    BEGIN
        ALTER TABLE stock_acquisitions ADD item_master_id UNIQUEIDENTIFIER NULL;
        PRINT '  ✓ Added item_master_id column';
    END
    ELSE
        PRINT '  ℹ item_master_id column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_received')
    BEGIN
        ALTER TABLE stock_acquisitions ADD quantity_received DECIMAL(15,2) NULL DEFAULT 0;
        PRINT '  ✓ Added quantity_received column';
    END
    ELSE
        PRINT '  ℹ quantity_received column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_issued')
    BEGIN
        ALTER TABLE stock_acquisitions ADD quantity_issued DECIMAL(15,2) NULL DEFAULT 0;
        PRINT '  ✓ Added quantity_issued column';
    END
    ELSE
        PRINT '  ℹ quantity_issued column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'delivery_date')
    BEGIN
        ALTER TABLE stock_acquisitions ADD delivery_date DATE NULL;
        PRINT '  ✓ Added delivery_date column';
    END
    ELSE
        PRINT '  ℹ delivery_date column already exists';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'unit_cost')
    BEGIN
        ALTER TABLE stock_acquisitions ADD unit_cost DECIMAL(15,2) NULL;
        PRINT '  ✓ Added unit_cost column';
    END
    ELSE
        PRINT '  ℹ unit_cost column already exists';

    -- Check and fix processed_by column data type
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'processed_by')
    BEGIN
        -- Check if it's the wrong type (UNIQUEIDENTIFIER)
        IF EXISTS (SELECT * FROM sys.columns 
                   WHERE object_id = OBJECT_ID('stock_acquisitions') 
                   AND name = 'processed_by' 
                   AND system_type_id = TYPE_ID('uniqueidentifier'))
        BEGIN
            -- Drop and recreate with correct type
            ALTER TABLE stock_acquisitions DROP COLUMN processed_by;
            ALTER TABLE stock_acquisitions ADD processed_by NVARCHAR(450) NULL;
            PRINT '  ✓ Fixed processed_by column data type (UNIQUEIDENTIFIER → NVARCHAR(450))';
        END
        ELSE
            PRINT '  ℹ processed_by column already correct type';
    END
    ELSE
    BEGIN
        ALTER TABLE stock_acquisitions ADD processed_by NVARCHAR(450) NULL;
        PRINT '  ✓ Added processed_by column';
    END
    
    -- Make sure ALL legacy columns allow NULL for opening balance entries
    -- (Opening balance entries don't have POs, deliveries, or aggregate totals)
    IF EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_acquisitions') 
               AND name = 'po_id' 
               AND is_nullable = 0)
    BEGIN
        ALTER TABLE stock_acquisitions ALTER COLUMN po_id UNIQUEIDENTIFIER NULL;
        PRINT '  ✓ Changed po_id to allow NULL';
    END
    
    IF EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_acquisitions') 
               AND name = 'delivery_id' 
               AND is_nullable = 0)
    BEGIN
        ALTER TABLE stock_acquisitions ALTER COLUMN delivery_id UNIQUEIDENTIFIER NULL;
        PRINT '  ✓ Changed delivery_id to allow NULL';
    END
    
    IF EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_acquisitions') 
               AND name = 'total_items' 
               AND is_nullable = 0)
    BEGIN
        ALTER TABLE stock_acquisitions ALTER COLUMN total_items INT NULL;
        PRINT '  ✓ Changed total_items to allow NULL';
    END
    
    IF EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_acquisitions') 
               AND name = 'total_quantity' 
               AND is_nullable = 0)
    BEGIN
        ALTER TABLE stock_acquisitions ALTER COLUMN total_quantity DECIMAL(15,2) NULL;
        PRINT '  ✓ Changed total_quantity to allow NULL';
    END
    
    IF EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_acquisitions') 
               AND name = 'total_value' 
               AND is_nullable = 0)
    BEGIN
        ALTER TABLE stock_acquisitions ALTER COLUMN total_value DECIMAL(15,2) NULL;
        PRINT '  ✓ Changed total_value to allow NULL';
    END
END

GO

-- Update existing rows with default values (separate batch after columns are committed)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_received')
BEGIN
    UPDATE stock_acquisitions SET quantity_received = 0 WHERE quantity_received IS NULL;
    PRINT '  ✓ Initialized quantity_received defaults';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_issued')
BEGIN
    UPDATE stock_acquisitions SET quantity_issued = 0 WHERE quantity_issued IS NULL;
    PRINT '  ✓ Initialized quantity_issued defaults';
END

GO

-- Add computed column (separate batch after base columns are committed)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_available')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_received')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_issued')
BEGIN
    ALTER TABLE stock_acquisitions ADD quantity_available AS (ISNULL(quantity_received, 0) - ISNULL(quantity_issued, 0)) PERSISTED;
    PRINT '  ✓ Added quantity_available computed column';
END
ELSE
    PRINT '  ℹ quantity_available column already exists or base columns missing';

GO

-- Add foreign key constraint (separate batch after item_master_id is committed)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StockAcq_ItemMaster')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'item_master_id')
    AND EXISTS (SELECT * FROM sys.tables WHERE name = 'item_masters')
BEGIN
    ALTER TABLE stock_acquisitions
    ADD CONSTRAINT FK_StockAcq_ItemMaster 
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id);
    PRINT '  ✓ Added foreign key constraint to item_masters';
END
ELSE
    PRINT '  ℹ Foreign key constraint already exists or prerequisites missing';

GO

-- Add indexes (separate batch after all columns are committed)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcq_ItemMaster_Date')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'item_master_id')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'delivery_date')
BEGIN
    CREATE INDEX IX_StockAcq_ItemMaster_Date 
    ON stock_acquisitions(item_master_id, delivery_date);
    PRINT '  ✓ Added index for FIFO queries';
END
ELSE
    PRINT '  ℹ Index already exists or columns not ready';

GO

PRINT '  ✅ stock_acquisitions table updated successfully';
PRINT '';

-- ============================================================================
-- STEP 2: Create opening_balance_entries table
-- ============================================================================
PRINT '';
PRINT 'STEP 2: Creating opening_balance_entries table...';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'opening_balance_entries')
BEGIN
    CREATE TABLE opening_balance_entries (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Tender/Source Information
        tender_id UNIQUEIDENTIFIER NULL,              -- Link to tender if exists
        tender_reference NVARCHAR(100),               -- Manual tender number/reference
        tender_title NVARCHAR(500),                   -- Description of source
        
        -- Item Information
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Quantity Tracking
        quantity_received INT NOT NULL,               -- Total originally purchased
        quantity_already_issued INT NOT NULL DEFAULT 0, -- Already given out before system
        quantity_available AS (quantity_received - quantity_already_issued) PERSISTED,
        
        -- Financial
        unit_cost DECIMAL(15,2),                      -- Cost per unit
        total_cost AS (quantity_received * unit_cost) PERSISTED,
        
        -- Source Details
        source_type NVARCHAR(50) DEFAULT 'TENDER',    -- 'TENDER', 'PURCHASE', 'DONATION', 'OTHER'
        acquisition_date DATE,                        -- Original purchase date (can be backdated to 2020)
        
        -- Audit Trail
        entry_date DATETIME2 DEFAULT GETDATE(),
        entered_by NVARCHAR(450) NOT NULL,             -- Changed to NVARCHAR to match AspNetUsers.Id
        remarks NVARCHAR(1000),
        
        -- Status
        status NVARCHAR(30) DEFAULT 'ACTIVE',         -- 'ACTIVE', 'DEPLETED', 'CANCELLED'
        processed_to_stock BIT DEFAULT 0,             -- Has this been added to stock_acquisitions?
        
        -- Indexes
        INDEX IX_OpeningBalance_Item (item_master_id),
        INDEX IX_OpeningBalance_Tender (tender_id),
        INDEX IX_OpeningBalance_Date (acquisition_date),
        INDEX IX_OpeningBalance_Status (status),
        
        -- Foreign Keys
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
        -- Note: entered_by FK constraint removed to allow flexibility with user IDs
        -- FOREIGN KEY (entered_by) REFERENCES AspNetUsers(Id)
    );
    
    PRINT '  ✓ Created opening_balance_entries table';
END
ELSE
BEGIN
    PRINT '  ℹ opening_balance_entries table already exists';
    
    -- Drop the FK constraint if it exists
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name LIKE 'FK__opening_b__enter%')
    BEGIN
        DECLARE @fkName NVARCHAR(200);
        SELECT @fkName = name FROM sys.foreign_keys WHERE name LIKE 'FK__opening_b__enter%';
        EXEC('ALTER TABLE opening_balance_entries DROP CONSTRAINT ' + @fkName);
        PRINT '  ✓ Removed entered_by foreign key constraint for flexibility';
    END
END

GO

-- ============================================================================
-- STEP 3: Create stored procedure to process opening balance to stock
-- ============================================================================
PRINT '';
PRINT 'STEP 3: Creating stored procedure sp_ProcessOpeningBalanceToStock...';
GO

IF OBJECT_ID('dbo.sp_ProcessOpeningBalanceToStock', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ProcessOpeningBalanceToStock;
GO

CREATE PROCEDURE dbo.sp_ProcessOpeningBalanceToStock
    @OpeningBalanceId UNIQUEIDENTIFIER,
    @ProcessedBy UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ItemMasterId UNIQUEIDENTIFIER;
    DECLARE @QuantityReceived INT;
    DECLARE @QuantityIssued INT;
    DECLARE @UnitCost DECIMAL(15,2);
    DECLARE @AcquisitionDate DATE;
    DECLARE @TenderReference NVARCHAR(100);
    DECLARE @AcquisitionNumber NVARCHAR(50);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Get opening balance details
        SELECT 
            @ItemMasterId = item_master_id,
            @QuantityReceived = quantity_received,
            @QuantityIssued = quantity_already_issued,
            @UnitCost = unit_cost,
            @AcquisitionDate = acquisition_date,
            @TenderReference = tender_reference
        FROM opening_balance_entries
        WHERE id = @OpeningBalanceId AND processed_to_stock = 0;
        
        IF @ItemMasterId IS NULL
        BEGIN
            THROW 50001, 'Opening balance entry not found or already processed', 1;
        END
        
        -- Generate acquisition number
        DECLARE @MaxAcqNum INT;
        SELECT @MaxAcqNum = ISNULL(MAX(CAST(RIGHT(acquisition_number, 6) AS INT)), 0)
        FROM stock_acquisitions
        WHERE acquisition_number LIKE 'OPB-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%';
        
        SET @AcquisitionNumber = 'OPB-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '-' + 
                                 RIGHT('000000' + CAST(@MaxAcqNum + 1 AS VARCHAR), 6);
        
        -- Create stock acquisition record
        INSERT INTO stock_acquisitions (
            id, acquisition_number, item_master_id,
            quantity_received, quantity_issued, 
            unit_cost, delivery_date,
            processed_by, status, notes
        )
        VALUES (
            NEWID(), @AcquisitionNumber, @ItemMasterId,
            @QuantityReceived, @QuantityIssued,
            @UnitCost, @AcquisitionDate,
            @ProcessedBy, 'completed', 
            'Opening Balance: ' + ISNULL(@TenderReference, 'No tender reference')
        );
        
        -- Mark opening balance as processed
        UPDATE opening_balance_entries
        SET processed_to_stock = 1
        WHERE id = @OpeningBalanceId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @AcquisitionNumber as AcquisitionNumber,
            'SUCCESS' as Status,
            'Opening balance processed to stock successfully' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50000, @ErrorMessage, 1;
    END CATCH
END
GO

PRINT '  ✅ Created sp_ProcessOpeningBalanceToStock procedure';

-- ============================================================================
-- STEP 4: Create view for opening balance summary
-- ============================================================================
PRINT '';
PRINT 'STEP 4: Creating view vw_opening_balance_summary...';
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_opening_balance_summary')
    DROP VIEW vw_opening_balance_summary;
GO

CREATE VIEW vw_opening_balance_summary AS
SELECT 
    obe.id,
    obe.tender_reference,
    obe.tender_title,
    obe.source_type,
    obe.acquisition_date,
    
    -- Item Details
    im.id as item_master_id,
    im.nomenclature,
    im.item_code,
    c.category_name,
    sc.sub_category_name,
    im.unit,
    
    -- Quantities
    obe.quantity_received,
    obe.quantity_already_issued,
    obe.quantity_available,
    
    -- Financial
    obe.unit_cost,
    obe.total_cost,
    
    -- Status
    obe.status,
    obe.processed_to_stock,
    
    -- Audit
    obe.entry_date,
    u.UserName as entered_by_name,
    obe.remarks
    
FROM opening_balance_entries obe
INNER JOIN item_masters im ON obe.item_master_id = im.id
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN AspNetUsers u ON obe.entered_by = u.Id;

GO

PRINT '  ✅ Created vw_opening_balance_summary view';

-- ============================================================================
-- STEP 5: Create view for stock breakdown (Opening Balance vs New Acquisitions)
-- ============================================================================
PRINT '';
PRINT 'STEP 5: Creating view vw_stock_quantity_breakdown...';
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_stock_quantity_breakdown')
    DROP VIEW vw_stock_quantity_breakdown;
GO

CREATE VIEW vw_stock_quantity_breakdown AS
SELECT 
    im.id as item_master_id,
    im.nomenclature,
    im.item_code,
    im.unit,
    im.specifications,
    c.id as category_id,
    c.category_name,
    sc.id as sub_category_id,
    sc.sub_category_name,
    
    -- Opening Balance (OPB entries from 2020+ historical stock)
    ISNULL(SUM(CASE 
        WHEN sa.acquisition_number LIKE 'OPB-%' 
        THEN sa.quantity_available 
        ELSE 0 
    END), 0) as opening_balance_quantity,
    
    -- New Acquisitions (regular deliveries after system started + legacy stock from current_inventory_stock)
    ISNULL(SUM(CASE 
        WHEN sa.acquisition_number NOT LIKE 'OPB-%' AND sa.acquisition_number IS NOT NULL
        THEN sa.quantity_available 
        ELSE 0 
    END), 0) + ISNULL(cis.current_quantity, 0) as new_acquisition_quantity,
    
    -- Total Stock = Opening Balance + New Acquisitions + Legacy Stock
    ISNULL(SUM(sa.quantity_available), 0) + ISNULL(cis.current_quantity, 0) as total_quantity,
    
    -- Additional metrics
    ISNULL(SUM(sa.quantity_received), 0) as total_received,
    ISNULL(SUM(sa.quantity_issued), 0) as total_issued,
    
    -- Stock status (use latest from either stock_acquisitions or current_inventory_stock)
    CASE 
        WHEN MAX(sa.updated_at) > cis.last_updated OR cis.last_updated IS NULL 
        THEN MAX(sa.updated_at)
        ELSE cis.last_updated
    END as last_transaction_date,
    
    -- Count of acquisition records
    COUNT(sa.id) as acquisition_count,
    COUNT(CASE WHEN sa.acquisition_number LIKE 'OPB-%' THEN 1 END) as opening_balance_count,
    COUNT(CASE WHEN sa.acquisition_number NOT LIKE 'OPB-%' THEN 1 END) as new_acquisition_count

FROM item_masters im
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN stock_acquisitions sa ON im.id = sa.item_master_id
LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id

GROUP BY 
    im.id,
    im.nomenclature,
    im.item_code,
    im.unit,
    im.specifications,
    c.id,
    c.category_name,
    sc.id,
    sc.sub_category_name,
    cis.current_quantity,
    cis.last_updated;

GO

PRINT '  ✅ Created vw_stock_quantity_breakdown view';

-- ============================================================================
-- COMPLETION
-- ============================================================================
PRINT '';
PRINT '====================================================================';
PRINT '✅ MILESTONE-1 COMPLETE: Opening Balance Stock Tracking';
PRINT '====================================================================';
PRINT '';
PRINT '📋 What was created:';
PRINT '   ✓ Updated stock_acquisitions table with quantity tracking';
PRINT '   ✓ Created opening_balance_entries table';
PRINT '   ✓ Created sp_ProcessOpeningBalanceToStock procedure';
PRINT '   ✓ Created vw_opening_balance_summary view';
PRINT '   ✓ Created vw_stock_quantity_breakdown view';
PRINT '';
PRINT '🎯 Next Steps:';
PRINT '   1. Create frontend Opening Balance Entry form';
PRINT '   2. Create API endpoint for opening balance entries';
PRINT '   3. Add to admin menu';
PRINT '   4. Start entering stock from 2020 onwards';
PRINT '';
PRINT '====================================================================';

GO
