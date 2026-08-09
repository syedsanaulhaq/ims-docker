-- ============================================================================
-- Fix: Update stored procedure to explicitly provide ID for current_inventory_stock
-- ============================================================================

-- Drop existing procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateStockTransactionFromDelivery')
    DROP PROCEDURE sp_CreateStockTransactionFromDelivery;
GO

SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Create the fixed stored procedure
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
            
            -- Update inventory levels (FIXED: explicitly provide NEWID() for id column)
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

PRINT '✅ Fixed stored procedure - now explicitly provides NEWID() for current_inventory_stock.id';
