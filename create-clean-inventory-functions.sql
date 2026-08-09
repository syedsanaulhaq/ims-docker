-- =====================================================
-- SUPPORTING FUNCTIONS AND VIEWS FOR CLEAN INVENTORY DB
-- =====================================================

USE InventoryManagementDB;
GO

-- =====================================================
-- 1. FUNCTION TO CALCULATE CURRENT STOCK FROM TRANSACTIONS
-- =====================================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'fn_GetCurrentStock' AND type = 'FN')
    DROP FUNCTION fn_GetCurrentStock;
GO

CREATE FUNCTION fn_GetCurrentStock(@ItemMasterID UNIQUEIDENTIFIER)
RETURNS INT
AS
BEGIN
    DECLARE @CurrentStock INT;
    
    SELECT @CurrentStock = ISNULL(SUM(quantity), 0)
    FROM stock_transactions 
    WHERE item_master_id = @ItemMasterID 
      AND status = 'ACTIVE' 
      AND is_deleted = 0;
    
    RETURN @CurrentStock;
END;
GO
PRINT 'Created fn_GetCurrentStock function';

-- =====================================================
-- 2. FUNCTION TO GET NEXT TRANSACTION NUMBER
-- =====================================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'fn_GetNextTransactionNumber' AND type = 'FN')
    DROP FUNCTION fn_GetNextTransactionNumber;
GO

CREATE FUNCTION fn_GetNextTransactionNumber()
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @NextNumber NVARCHAR(50);
    DECLARE @Year NVARCHAR(4) = CAST(YEAR(GETDATE()) AS NVARCHAR(4));
    DECLARE @Sequence INT;
    
    -- Get next sequence number for current year
    SELECT @Sequence = ISNULL(MAX(CAST(RIGHT(transaction_number, 4) AS INT)), 0) + 1
    FROM stock_transactions
    WHERE LEFT(transaction_number, 8) = 'TXN-' + @Year;
    
    SET @NextNumber = 'TXN-' + @Year + '-' + RIGHT('0000' + CAST(@Sequence AS NVARCHAR(4)), 4);
    
    RETURN @NextNumber;
END;
GO
PRINT 'Created fn_GetNextTransactionNumber function';

-- =====================================================
-- 3. STORED PROCEDURE TO UPDATE CURRENT STOCK LEVELS
-- =====================================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_UpdateCurrentStockLevels' AND type = 'P')
    DROP PROCEDURE sp_UpdateCurrentStockLevels;
GO

CREATE PROCEDURE sp_UpdateCurrentStockLevels
    @ItemMasterID UNIQUEIDENTIFIER = NULL -- NULL means update all items
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Update specific item or all items
        IF @ItemMasterID IS NOT NULL
        BEGIN
            -- Update single item
            MERGE current_stock_levels AS target
            USING (
                SELECT 
                    @ItemMasterID as item_master_id,
                    dbo.fn_GetCurrentStock(@ItemMasterID) as calculated_quantity,
                    im.minimum_stock_level,
                    im.maximum_stock_level,
                    im.reorder_point,
                    (SELECT MAX(transaction_date) FROM stock_transactions WHERE item_master_id = @ItemMasterID AND status = 'ACTIVE') as last_transaction_date,
                    (SELECT TOP 1 transaction_type FROM stock_transactions WHERE item_master_id = @ItemMasterID AND status = 'ACTIVE' ORDER BY transaction_date DESC) as last_transaction_type
                FROM item_masters im
                WHERE im.id = @ItemMasterID
            ) AS source ON target.item_master_id = source.item_master_id
            WHEN MATCHED THEN
                UPDATE SET 
                    current_quantity = source.calculated_quantity,
                    minimum_stock_level = source.minimum_stock_level,
                    maximum_stock_level = source.maximum_stock_level,
                    reorder_point = source.reorder_point,
                    last_transaction_date = source.last_transaction_date,
                    last_transaction_type = source.last_transaction_type,
                    last_updated = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (item_master_id, current_quantity, minimum_stock_level, maximum_stock_level, reorder_point, last_transaction_date, last_transaction_type)
                VALUES (source.item_master_id, source.calculated_quantity, source.minimum_stock_level, source.maximum_stock_level, source.reorder_point, source.last_transaction_date, source.last_transaction_type);
        END
        ELSE
        BEGIN
            -- Update all items
            MERGE current_stock_levels AS target
            USING (
                SELECT 
                    im.id as item_master_id,
                    ISNULL(st_summary.calculated_quantity, 0) as calculated_quantity,
                    im.minimum_stock_level,
                    im.maximum_stock_level,
                    im.reorder_point,
                    st_summary.last_transaction_date,
                    st_summary.last_transaction_type
                FROM item_masters im
                LEFT JOIN (
                    SELECT 
                        item_master_id,
                        SUM(quantity) as calculated_quantity,
                        MAX(transaction_date) as last_transaction_date,
                        (SELECT TOP 1 transaction_type FROM stock_transactions st2 
                         WHERE st2.item_master_id = st1.item_master_id 
                           AND st2.status = 'ACTIVE' AND st2.is_deleted = 0
                         ORDER BY st2.transaction_date DESC) as last_transaction_type
                    FROM stock_transactions st1
                    WHERE status = 'ACTIVE' AND is_deleted = 0
                    GROUP BY item_master_id
                ) st_summary ON im.id = st_summary.item_master_id
                WHERE im.status = 'ACTIVE'
            ) AS source ON target.item_master_id = source.item_master_id
            WHEN MATCHED THEN
                UPDATE SET 
                    current_quantity = source.calculated_quantity,
                    minimum_stock_level = source.minimum_stock_level,
                    maximum_stock_level = source.maximum_stock_level,
                    reorder_point = source.reorder_point,
                    last_transaction_date = source.last_transaction_date,
                    last_transaction_type = source.last_transaction_type,
                    last_updated = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (item_master_id, current_quantity, minimum_stock_level, maximum_stock_level, reorder_point, last_transaction_date, last_transaction_type)
                VALUES (source.item_master_id, source.calculated_quantity, source.minimum_stock_level, source.maximum_stock_level, source.reorder_point, source.last_transaction_date, source.last_transaction_type);
        END
        
        COMMIT TRANSACTION;
        PRINT 'Current stock levels updated successfully';
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
PRINT 'Created sp_UpdateCurrentStockLevels procedure';

-- =====================================================
-- 4. STORED PROCEDURE TO CREATE STOCK TRANSACTION
-- =====================================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_CreateStockTransaction' AND type = 'P')
    DROP PROCEDURE sp_CreateStockTransaction;
GO

CREATE PROCEDURE sp_CreateStockTransaction
    @ItemMasterID UNIQUEIDENTIFIER,
    @TransactionType NVARCHAR(20), -- 'INITIAL', 'RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTMENT'
    @Quantity INT,
    @UnitPrice DECIMAL(15,4) = NULL,
    @ReferenceType NVARCHAR(20) = NULL,
    @ReferenceID UNIQUEIDENTIFIER = NULL,
    @ReferenceNumber NVARCHAR(50) = NULL,
    @DecID UNIQUEIDENTIFIER = NULL,
    @VendorID UNIQUEIDENTIFIER = NULL,
    @OfficeID UNIQUEIDENTIFIER = NULL,
    @Remarks NVARCHAR(500) = NULL,
    @CreatedBy UNIQUEIDENTIFIER,
    @TransactionID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate transaction type
        IF @TransactionType NOT IN ('INITIAL', 'RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTMENT')
        BEGIN
            RAISERROR('Invalid transaction type. Must be INITIAL, RECEIVED, ISSUED, RETURNED, or ADJUSTMENT.', 16, 1);
            RETURN;
        END
        
        -- For ISSUED transactions, make quantity negative
        IF @TransactionType = 'ISSUED' AND @Quantity > 0
            SET @Quantity = @Quantity * -1;
        
        -- For RETURNED transactions, make quantity positive
        IF @TransactionType = 'RETURNED' AND @Quantity < 0
            SET @Quantity = ABS(@Quantity);
        
        -- Generate new transaction ID and number
        SET @TransactionID = NEWID();
        DECLARE @TransactionNumber NVARCHAR(50) = dbo.fn_GetNextTransactionNumber();
        
        -- Insert transaction
        INSERT INTO stock_transactions (
            id, transaction_number, item_master_id, transaction_type, quantity,
            unit_price, total_value, reference_type, reference_id, reference_number,
            dec_id, vendor_id, office_id, transaction_date, remarks,
            created_by, created_at, status
        )
        VALUES (
            @TransactionID, @TransactionNumber, @ItemMasterID, @TransactionType, @Quantity,
            @UnitPrice, (@Quantity * ISNULL(@UnitPrice, 0)), @ReferenceType, @ReferenceID, @ReferenceNumber,
            @DecID, @VendorID, @OfficeID, GETDATE(), @Remarks,
            @CreatedBy, GETDATE(), 'ACTIVE'
        );
        
        -- Update current stock levels
        EXEC sp_UpdateCurrentStockLevels @ItemMasterID;
        
        COMMIT TRANSACTION;
        
        PRINT 'Stock transaction created successfully: ' + @TransactionNumber;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
PRINT 'Created sp_CreateStockTransaction procedure';

-- =====================================================
-- 5. VIEW FOR INVENTORY DASHBOARD
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_InventoryDashboard')
    DROP VIEW vw_InventoryDashboard;
GO

CREATE VIEW vw_InventoryDashboard
AS
SELECT 
    im.id as item_master_id,
    im.item_code,
    im.nomenclature as item_name,
    im.unit,
    c.category_name,
    sc.sub_category_name,
    
    -- Stock Information
    csl.current_quantity,
    csl.reserved_quantity,
    csl.available_quantity,
    csl.minimum_stock_level,
    csl.maximum_stock_level,
    csl.reorder_point,
    csl.stock_status,
    
    -- Last Transaction Info
    csl.last_transaction_date,
    csl.last_transaction_type,
    
    -- Calculated Fields
    CASE 
        WHEN csl.current_quantity <= 0 THEN 'Critical'
        WHEN csl.current_quantity <= csl.reorder_point THEN 'Low'
        WHEN csl.current_quantity >= csl.maximum_stock_level THEN 'Overstock'
        ELSE 'Normal'
    END as stock_alert_level,
    
    -- Value Information (latest unit price)
    (SELECT TOP 1 unit_price 
     FROM stock_transactions 
     WHERE item_master_id = im.id AND unit_price > 0 
     ORDER BY transaction_date DESC) as latest_unit_price,
     
    -- Transaction Counts (last 30 days)
    (SELECT COUNT(*) 
     FROM stock_transactions 
     WHERE item_master_id = im.id 
       AND transaction_date >= DATEADD(day, -30, GETDATE())
       AND status = 'ACTIVE') as transactions_last_30_days

FROM item_masters im
INNER JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN current_stock_levels csl ON im.id = csl.item_master_id
WHERE im.status = 'ACTIVE';
GO
PRINT 'Created vw_InventoryDashboard view';

-- =====================================================
-- 6. VIEW FOR STOCK MOVEMENTS
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_StockMovements')
    DROP VIEW vw_StockMovements;
GO

CREATE VIEW vw_StockMovements
AS
SELECT 
    st.id,
    st.transaction_number,
    st.transaction_date,
    st.transaction_type,
    
    -- Item Information
    im.item_code,
    im.nomenclature as item_name,
    im.unit,
    c.category_name,
    
    -- Transaction Details
    st.quantity,
    st.unit_price,
    st.total_value,
    st.reference_type,
    st.reference_number,
    
    -- Organizational Information
    d.DEC_Name as dec_name,
    v.vendor_name,
    
    -- Personnel
    u_created.UserName as created_by_name,
    u_approved.UserName as approved_by_name,
    
    -- Status and Notes
    st.status,
    st.remarks,
    st.created_at,
    st.approved_at

FROM stock_transactions st
INNER JOIN item_masters im ON st.item_master_id = im.id
INNER JOIN categories c ON im.category_id = c.id
LEFT JOIN DEC_MST d ON st.dec_id = d.id
LEFT JOIN vendors v ON st.vendor_id = v.id
LEFT JOIN AspNetUsers u_created ON st.created_by = u_created.Id
LEFT JOIN AspNetUsers u_approved ON st.approved_by = u_approved.Id
WHERE st.is_deleted = 0;
GO
PRINT 'Created vw_StockMovements view';

-- =====================================================
-- 7. TRIGGER TO AUTO-UPDATE STOCK LEVELS
-- =====================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_StockTransaction_UpdateLevels')
    DROP TRIGGER tr_StockTransaction_UpdateLevels;
GO

CREATE TRIGGER tr_StockTransaction_UpdateLevels
ON stock_transactions
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get affected item master IDs
    DECLARE @AffectedItems TABLE (item_master_id UNIQUEIDENTIFIER);
    
    -- From inserted records
    INSERT INTO @AffectedItems (item_master_id)
    SELECT DISTINCT item_master_id FROM inserted;
    
    -- From deleted records
    INSERT INTO @AffectedItems (item_master_id)
    SELECT DISTINCT item_master_id FROM deleted
    WHERE item_master_id NOT IN (SELECT item_master_id FROM @AffectedItems);
    
    -- Update stock levels for affected items
    DECLARE @ItemID UNIQUEIDENTIFIER;
    DECLARE item_cursor CURSOR FOR SELECT item_master_id FROM @AffectedItems;
    
    OPEN item_cursor;
    FETCH NEXT FROM item_cursor INTO @ItemID;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_UpdateCurrentStockLevels @ItemID;
        FETCH NEXT FROM item_cursor INTO @ItemID;
    END
    
    CLOSE item_cursor;
    DEALLOCATE item_cursor;
END;
GO
PRINT 'Created tr_StockTransaction_UpdateLevels trigger';

-- =====================================================
-- 8. INITIALIZE CURRENT STOCK LEVELS
-- =====================================================
PRINT 'Initializing current stock levels...';
EXEC sp_UpdateCurrentStockLevels; -- Update all items

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
PRINT '===============================================';
PRINT 'CLEAN INVENTORY DATABASE FUNCTIONS & VIEWS CREATED!';
PRINT '===============================================';
PRINT 'Functions: fn_GetCurrentStock, fn_GetNextTransactionNumber';
PRINT 'Procedures: sp_UpdateCurrentStockLevels, sp_CreateStockTransaction';
PRINT 'Views: vw_InventoryDashboard, vw_StockMovements';
PRINT 'Triggers: tr_StockTransaction_UpdateLevels (auto-update stock levels)';
PRINT 'Current stock levels have been initialized.';
PRINT '===============================================';
