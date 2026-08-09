-- ============================================================================
-- Stored Procedure: sp_CreateStockTransactionFromDelivery
-- Purpose: Process delivery receipt, create stock transactions, update inventory
-- Run this script on your database to create the stored procedure
-- ============================================================================

-- First, ensure required tables exist
-- Check for stock_transactions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_transactions')
BEGIN
    CREATE TABLE stock_transactions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        transaction_number NVARCHAR(50) NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        transaction_type NVARCHAR(50) NOT NULL,
        quantity DECIMAL(15,2) NOT NULL,
        unit_price DECIMAL(15,2),
        total_value DECIMAL(15,2),
        reference_type NVARCHAR(50),
        reference_id UNIQUEIDENTIFIER,
        reference_number NVARCHAR(50),
        transaction_date DATETIME2 DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER,
        status NVARCHAR(20) DEFAULT 'ACTIVE',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ Created stock_transactions table';
END

-- Check for stock_acquisitions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_acquisitions')
BEGIN
    CREATE TABLE stock_acquisitions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        acquisition_number NVARCHAR(50) NOT NULL,
        po_id UNIQUEIDENTIFIER,
        delivery_id UNIQUEIDENTIFIER,
        total_items INT,
        total_quantity DECIMAL(15,2),
        total_value DECIMAL(15,2),
        acquisition_date DATETIME2 DEFAULT GETDATE(),
        processed_by UNIQUEIDENTIFIER,
        status NVARCHAR(20) DEFAULT 'pending',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ Created stock_acquisitions table';
END

-- Check for current_inventory_stock table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'current_inventory_stock')
BEGIN
    CREATE TABLE current_inventory_stock (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        current_quantity DECIMAL(15,2) DEFAULT 0,
        last_transaction_date DATETIME2,
        last_transaction_type NVARCHAR(50),
        last_updated DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ Created current_inventory_stock table';
END

-- Add received_quantity column to purchase_order_items if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'received_quantity')
BEGIN
    ALTER TABLE purchase_order_items ADD received_quantity DECIMAL(15,2) DEFAULT 0;
    PRINT '✅ Added received_quantity to purchase_order_items';
END

-- Add delivery_status column to purchase_order_items if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'delivery_status')
BEGIN
    ALTER TABLE purchase_order_items ADD delivery_status NVARCHAR(20) DEFAULT 'pending';
    PRINT '✅ Added delivery_status to purchase_order_items';
END
GO

-- Drop existing procedure if exists
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateStockTransactionFromDelivery')
    DROP PROCEDURE sp_CreateStockTransactionFromDelivery;
GO

SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Create the stored procedure
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
            ISNULL(di.quality_status, 'good') as quality_status,
            di.po_item_id
        FROM delivery_items di
        INNER JOIN purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good';
        
        OPEN item_cursor;
        FETCH NEXT FROM item_cursor INTO @ItemMasterId, @Quantity, @UnitPrice, @QualityStatus, @POItemId;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Create stock transaction (only for good quality items)
            DECLARE @TransactionId UNIQUEIDENTIFIER = NEWID();
            DECLARE @TransactionNumber NVARCHAR(50);
            
            -- Generate transaction number
            DECLARE @MaxTxnNum INT;
            SELECT @MaxTxnNum = ISNULL(MAX(CAST(RIGHT(transaction_number, 6) AS INT)), 0)
            FROM stock_transactions
            WHERE transaction_number LIKE 'TXN-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%';
            
            SET @TransactionNumber = 'TXN-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '-' + 
                                     RIGHT('000000' + CAST(@MaxTxnNum + 1 AS VARCHAR), 6);
            
            -- Insert stock transaction
            INSERT INTO stock_transactions (
                id, transaction_number, item_master_id, transaction_type,
                quantity, unit_price, total_value,
                reference_type, reference_id, reference_number,
                transaction_date, created_by, status
            )
            VALUES (
                @TransactionId, @TransactionNumber, @ItemMasterId, 'RECEIVED',
                @Quantity, @UnitPrice, (@Quantity * @UnitPrice),
                'PURCHASE_ORDER', @POId, @PONumber,
                GETDATE(), @ReceivedBy, 'ACTIVE'
            );
            
            -- Update inventory levels
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
                    item_master_id, current_quantity, last_transaction_date,
                    last_transaction_type, last_updated
                )
                VALUES (
                    @ItemMasterId, @Quantity, GETDATE(), 'RECEIVED', GETDATE()
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
            WHERE po_id = @POId AND ISNULL(delivery_status, 'pending') != 'completed'
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

PRINT '✅ Stored procedure sp_CreateStockTransactionFromDelivery created successfully';
PRINT '';
PRINT 'This stored procedure will:';
PRINT '  1. Create stock acquisition record (ACQ-xxxx-xxxxxx)';
PRINT '  2. Create stock transactions for each item (TXN-xxxx-xxxxxx)';
PRINT '  3. Update current_inventory_stock';
PRINT '  4. Update purchase_order_items received_quantity and delivery_status';
PRINT '  5. Update PO status to completed/partial';
PRINT '  6. Update delivery status to completed';
