-- ============================================================================
-- Fix PO Migration - Step 2: Add constraints, table, views, and procedures
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT 'Step 2: Adding constraints, indexes, and creating objects...';
PRINT '';

-- ============================================================================
-- Add CHECK constraints
-- ============================================================================
PRINT 'Adding CHECK constraints...';

-- purchase_order_items constraints
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_POItem_DeliveryStatus')
BEGIN
    ALTER TABLE purchase_order_items 
    ADD CONSTRAINT CK_POItem_DeliveryStatus 
    CHECK (delivery_status IN ('pending', 'partial', 'completed'));
    PRINT '  ✓ Added delivery_status check constraint to purchase_order_items';
END

-- deliveries constraints
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Delivery_Status')
BEGIN
    ALTER TABLE deliveries 
    ADD CONSTRAINT CK_Delivery_Status 
    CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'completed'));
    PRINT '  ✓ Added delivery_status check constraint to deliveries';
END

-- delivery_items constraints
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_DeliveryItem_QualityStatus')
BEGIN
    ALTER TABLE delivery_items 
    ADD CONSTRAINT CK_DeliveryItem_QualityStatus 
    CHECK (quality_status IN ('good', 'damaged', 'rejected', 'partial'));
    PRINT '  ✓ Added quality_status check constraint to delivery_items';
END

GO

-- ============================================================================
-- Add Foreign Keys
-- ============================================================================
PRINT '';
PRINT 'Adding foreign key constraints...';

-- deliveries to purchase_orders
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Delivery_PurchaseOrder')
BEGIN
    ALTER TABLE deliveries 
    ADD CONSTRAINT FK_Delivery_PurchaseOrder 
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id);
    PRINT '  ✓ Added FK: deliveries -> purchase_orders';
END

-- delivery_items to purchase_order_items
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DeliveryItem_POItem')
BEGIN
    ALTER TABLE delivery_items 
    ADD CONSTRAINT FK_DeliveryItem_POItem 
    FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id);
    PRINT '  ✓ Added FK: delivery_items -> purchase_order_items';
END

GO

-- ============================================================================
-- Add Indexes
-- ============================================================================
PRINT '';
PRINT 'Adding indexes...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Delivery_POId')
BEGIN
    CREATE INDEX IX_Delivery_POId ON deliveries(po_id);
    PRINT '  ✓ Added index on deliveries.po_id';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DeliveryItem_POItemId')
BEGIN
    CREATE INDEX IX_DeliveryItem_POItemId ON delivery_items(po_item_id);
    PRINT '  ✓ Added index on delivery_items.po_item_id';
END

GO

-- ============================================================================
-- Create stock_acquisitions table
-- ============================================================================
PRINT '';
PRINT 'Creating stock_acquisitions table...';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_acquisitions')
BEGIN
    CREATE TABLE stock_acquisitions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        acquisition_number NVARCHAR(50) UNIQUE NOT NULL,
        po_id UNIQUEIDENTIFIER NOT NULL,
        delivery_id UNIQUEIDENTIFIER NOT NULL,
        total_items INT NOT NULL,
        total_quantity DECIMAL(15,2) NOT NULL,
        total_value DECIMAL(15,2) NOT NULL,
        acquisition_date DATETIME2 DEFAULT GETDATE(),
        processed_by UNIQUEIDENTIFIER NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign Keys
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
        FOREIGN KEY (processed_by) REFERENCES AspNetUsers(Id)
    );
    
    -- Add Indexes
    CREATE INDEX IX_StockAcq_POId ON stock_acquisitions(po_id);
    CREATE INDEX IX_StockAcq_DeliveryId ON stock_acquisitions(delivery_id);
    CREATE INDEX IX_StockAcq_Date ON stock_acquisitions(acquisition_date);
    CREATE INDEX IX_StockAcq_Status ON stock_acquisitions(status);
    
    PRINT '  ✓ Created stock_acquisitions table with indexes';
END
ELSE
    PRINT '  ℹ stock_acquisitions table already exists';

GO

-- ============================================================================
-- Create Views
-- ============================================================================
PRINT '';
PRINT 'Creating views...';

-- View: PO Fulfillment Status
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_po_fulfillment_status')
    DROP VIEW vw_po_fulfillment_status;
GO

CREATE VIEW vw_po_fulfillment_status AS
SELECT 
    po.id AS po_id,
    po.po_number,
    po.po_date,
    po.status AS po_status,
    t.title AS tender_title,
    v.vendor_name,
    poi.id AS po_item_id,
    poi.item_master_id,
    im.nomenclature AS item_name,
    poi.quantity AS ordered_quantity,
    ISNULL(poi.received_quantity, 0) AS received_quantity,
    (poi.quantity - ISNULL(poi.received_quantity, 0)) AS pending_quantity,
    poi.unit_price,
    (poi.quantity * poi.unit_price) AS ordered_value,
    (ISNULL(poi.received_quantity, 0) * poi.unit_price) AS received_value,
    poi.delivery_status,
    CASE 
        WHEN ISNULL(poi.received_quantity, 0) = 0 THEN 0
        ELSE CAST((ISNULL(poi.received_quantity, 0) * 100.0 / poi.quantity) AS DECIMAL(5,2))
    END AS fulfillment_percentage,
    po.created_at AS po_created_at
FROM purchase_orders po
INNER JOIN purchase_order_items poi ON po.id = poi.po_id
LEFT JOIN tenders t ON po.tender_id = t.id
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN item_masters im ON poi.item_master_id = im.id;
GO

PRINT '  ✓ Created vw_po_fulfillment_status view';

-- View: Delivery Summary
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_delivery_summary')
    DROP VIEW vw_delivery_summary;
GO

CREATE VIEW vw_delivery_summary AS
SELECT 
    d.id AS delivery_id,
    d.delivery_number,
    d.delivery_date,
    d.delivery_personnel,
    d.delivery_chalan,
    d.po_id,
    d.po_number,
    d.delivery_status,
    po.po_number AS po_ref,
    v.vendor_name,
    COUNT(di.id) AS total_items,
    SUM(di.delivery_qty) AS total_quantity,
    SUM(di.delivery_qty * poi.unit_price) AS total_value,
    SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END) AS good_quantity,
    SUM(CASE WHEN di.quality_status = 'damaged' THEN di.delivery_qty ELSE 0 END) AS damaged_quantity,
    SUM(CASE WHEN di.quality_status = 'rejected' THEN di.delivery_qty ELSE 0 END) AS rejected_quantity,
    d.received_by,
    d.receiving_date,
    d.created_at
FROM deliveries d
LEFT JOIN purchase_orders po ON d.po_id = po.id
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN delivery_items di ON d.id = di.delivery_id
LEFT JOIN purchase_order_items poi ON di.po_item_id = poi.id
GROUP BY 
    d.id, d.delivery_number, d.delivery_date, d.delivery_personnel, 
    d.delivery_chalan, d.po_id, d.po_number, d.delivery_status, 
    po.po_number, v.vendor_name, d.received_by, d.receiving_date, d.created_at;
GO

PRINT '  ✓ Created vw_delivery_summary view';

-- ============================================================================
-- Create Stored Procedures
-- ============================================================================
PRINT '';
PRINT 'Creating stored procedures...';

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateStockTransactionFromDelivery')
    DROP PROCEDURE sp_CreateStockTransactionFromDelivery;
GO

SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

CREATE PROCEDURE sp_CreateStockTransactionFromDelivery
    @DeliveryId UNIQUEIDENTIFIER,
    @ReceivedBy UNIQUEIDENTIFIER,
    @AcquisitionId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @POId UNIQUEIDENTIFIER;
        DECLARE @PONumber NVARCHAR(50);
        DECLARE @DeliveryNumber NVARCHAR(50);
        DECLARE @AcquisitionNumber NVARCHAR(50);
        DECLARE @TotalItems INT = 0;
        DECLARE @TotalQuantity DECIMAL(15,2) = 0;
        DECLARE @TotalValue DECIMAL(15,2) = 0;
        
        -- Get delivery and PO details
        SELECT 
            @POId = po_id,
            @PONumber = po_number,
            @DeliveryNumber = delivery_number
        FROM deliveries 
        WHERE id = @DeliveryId;
        
        IF @POId IS NULL
        BEGIN
            RAISERROR('Delivery not linked to a Purchase Order', 16, 1);
            RETURN;
        END
        
        -- Generate acquisition number
        DECLARE @MaxAcqNum INT;
        SELECT @MaxAcqNum = ISNULL(MAX(CAST(RIGHT(acquisition_number, 6) AS INT)), 0)
        FROM stock_acquisitions
        WHERE acquisition_number LIKE 'ACQ-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%';
        
        SET @AcquisitionNumber = 'ACQ-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '-' + 
                                 RIGHT('000000' + CAST(@MaxAcqNum + 1 AS VARCHAR), 6);
        
        -- Create stock acquisition record
        SET @AcquisitionId = NEWID();
        
        -- Process each delivery item
        DECLARE @ItemMasterId UNIQUEIDENTIFIER;
        DECLARE @Quantity DECIMAL(10,2);
        DECLARE @UnitPrice DECIMAL(15,2);
        DECLARE @QualityStatus VARCHAR(20);
        DECLARE @POItemId UNIQUEIDENTIFIER;
        
        DECLARE item_cursor CURSOR FOR
        SELECT 
            di.item_master_id,
            di.delivery_qty,
            poi.unit_price,
            di.quality_status,
            di.po_item_id
        FROM delivery_items di
        INNER JOIN purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND di.quality_status = 'good';
        
        OPEN item_cursor;
        FETCH NEXT FROM item_cursor INTO @ItemMasterId, @Quantity, @UnitPrice, @QualityStatus, @POItemId;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Update inventory levels (only for good quality items)
            IF EXISTS (SELECT 1 FROM current_inventory_stock WHERE item_master_id = @ItemMasterId)
            BEGIN
                UPDATE current_inventory_stock
                SET 
                    current_quantity = current_quantity + @Quantity,
                    last_transaction_date = GETDATE(),
                    last_transaction_type = 'RECEIVED',
                    last_updated = GETDATE()
                WHERE item_master_id = @ItemMasterId;
            END
            ELSE
            BEGIN
                INSERT INTO current_inventory_stock (
                    id, item_master_id, current_quantity, last_transaction_date,
                    last_transaction_type, last_updated
                )
                VALUES (
                    NEWID(), @ItemMasterId, @Quantity, GETDATE(), 'RECEIVED', GETDATE()
                );
            END
            
            -- Update PO item received quantity
            UPDATE purchase_order_items
            SET 
                received_quantity = ISNULL(received_quantity, 0) + @Quantity,
                delivery_status = CASE 
                    WHEN (ISNULL(received_quantity, 0) + @Quantity) >= quantity THEN 'completed'
                    WHEN (ISNULL(received_quantity, 0) + @Quantity) > 0 THEN 'partial'
                    ELSE 'pending'
                END
            WHERE id = @POItemId;
            
            -- Update totals
            SET @TotalItems = @TotalItems + 1;
            SET @TotalQuantity = @TotalQuantity + @Quantity;
            SET @TotalValue = @TotalValue + (@Quantity * @UnitPrice);
            
            FETCH NEXT FROM item_cursor INTO @ItemMasterId, @Quantity, @UnitPrice, @QualityStatus, @POItemId;
        END
        
        CLOSE item_cursor;
        DEALLOCATE item_cursor;
        
        -- Create stock acquisition record
        INSERT INTO stock_acquisitions (
            id, acquisition_number, po_id, delivery_id,
            total_items, total_quantity, total_value,
            acquisition_date, processed_by, status
        )
        VALUES (
            @AcquisitionId, @AcquisitionNumber, @POId, @DeliveryId,
            @TotalItems, @TotalQuantity, @TotalValue,
            GETDATE(), @ReceivedBy, 'completed'
        );
        
        -- Update delivery status
        UPDATE deliveries
        SET 
            delivery_status = 'completed',
            received_by = @ReceivedBy,
            receiving_date = GETDATE()
        WHERE id = @DeliveryId;
        
        -- Update PO status if all items completed
        IF NOT EXISTS (
            SELECT 1 FROM purchase_order_items 
            WHERE po_id = @POId AND delivery_status != 'completed'
        )
        BEGIN
            UPDATE purchase_orders
            SET status = 'completed'
            WHERE id = @POId;
        END
        ELSE
        BEGIN
            UPDATE purchase_orders
            SET status = 'partial'
            WHERE id = @POId;
        END
        
        COMMIT TRANSACTION;
        
        SELECT 
            @AcquisitionId AS acquisition_id,
            @AcquisitionNumber AS acquisition_number,
            @TotalItems AS total_items,
            @TotalQuantity AS total_quantity,
            @TotalValue AS total_value,
            'Stock acquisition completed successfully' AS message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

PRINT '  ✓ Created sp_CreateStockTransactionFromDelivery procedure';

-- ============================================================================
-- Summary
-- ============================================================================
PRINT '';
PRINT '====================================================================';
PRINT 'Step 2 Complete: All constraints, table, views, and procedures created!';
PRINT '====================================================================';
PRINT '';
