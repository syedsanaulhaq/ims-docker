const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function fixSP() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Dropping and recreating sp_CreateStockTransactionFromDelivery...");
    
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateStockTransactionFromDelivery')
          DROP PROCEDURE sp_CreateStockTransactionFromDelivery;
    `);

    // Let's create the correct SP:
    // 1. In purchase_order_items: 
    //    - received_quantity does not exist. (We calculate it dynamically or don't use it, wait, we don't have it in purchase_order_items table since we saw in the column check it doesn't exist).
    //    - Wait! We don't have: received_quantity, status, updated_at on purchase_order_items!
    //    Let's check what fields exist in purchase_order_items: 
    //    { COLUMN_NAME: 'id', DATA_TYPE: 'uniqueidentifier' },
    //    { COLUMN_NAME: 'po_id', DATA_TYPE: 'uniqueidentifier' },
    //    { COLUMN_NAME: 'item_master_id', DATA_TYPE: 'nvarchar' },
    //    { COLUMN_NAME: 'quantity', DATA_TYPE: 'decimal' },
    //    { COLUMN_NAME: 'unit_price', DATA_TYPE: 'decimal' },
    //    { COLUMN_NAME: 'total_price', DATA_TYPE: 'decimal' },
    //    { COLUMN_NAME: 'specifications', DATA_TYPE: 'nvarchar' },
    //    { COLUMN_NAME: 'created_at', DATA_TYPE: 'datetime' },
    //    { COLUMN_NAME: 'is_deleted', DATA_TYPE: 'bit' }
    // 2. In purchase_orders: 
    //    - We saw in check_poi_columns that the columns of purchase_orders are:
    //      id, po_number, tender_id, vendor_id, po_date, total_amount, status, remarks, created_at, updated_at, ...
    //      But the SP does: UPDATE dbo.purchase_orders SET status = ... WHERE purchase_order_id = @POId (invalid column 'purchase_order_id' or 'updated_at'?)
    //      Let's look at line 102 of the SP output:
    //      (SELECT 1 FROM dbo.purchase_order_items WHERE purchase_order_id = @POId AND status <> 'completed')
    //      Ah! purchase_order_items table does NOT have purchase_order_id, it has po_id!
    //      Also, purchase_order_items table does NOT have status, nor updated_at!
    //      Let's look at the error log from the user's request:
    //      - Invalid column name 'updated_at' (on purchase_order_items at line 59: updated_at = GETDATE())
    //      - Invalid column name 'status' (on purchase_order_items at line 58: status = ...)
    //      - Invalid column name 'received_quantity' (on purchase_order_items at line 57: received_quantity = ...)
    //      - Invalid column name 'purchase_order_id' (on purchase_order_items at line 102: WHERE purchase_order_id = @POId)
    // 3. Since purchase_order_items doesn't have columns: status, received_quantity, updated_at,
    //    we should omit updating purchase_order_items table directly because those columns don't exist!
    //    Wait, how do we determine if all items in a purchase order are fully received?
    //    We can check if the total sum of received items in delivery_items matching this PO matches the sum of ordered quantities in purchase_order_items!
    //    Let's draft a clean UPDATE statement for purchase_orders status:
    //    We can check if (ordered quantity) > (delivered quantity) for any item in this PO.
    //    If yes, status is 'partial' (or 'draft'/'finalized' if 0 received, but since we are receiving a delivery, it's at least 'partial').
    //    If all items are fully received, status is 'completed'.

    const createSPSQL = `
CREATE PROCEDURE dbo.sp_CreateStockTransactionFromDelivery
    @DeliveryId UNIQUEIDENTIFIER,
    @ReceivedBy UNIQUEIDENTIFIER,
    @AcquisitionId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @POId UNIQUEIDENTIFIER;
        DECLARE @PONumber NVARCHAR(50);
        DECLARE @DeliveryNumber NVARCHAR(50);
        DECLARE @AcquisitionNumber NVARCHAR(50);
        DECLARE @TotalItems INT;
        DECLARE @TotalQuantity DECIMAL(15, 2);
        DECLARE @TotalValue DECIMAL(15, 2);

        SELECT @POId = po_id, @PONumber = po_number, @DeliveryNumber = delivery_number
        FROM dbo.deliveries
        WHERE id = @DeliveryId;

        IF @POId IS NULL
            THROW 50003, 'Delivery not linked to a purchase order.', 1;

        SELECT
            @TotalItems = COUNT(*),
            @TotalQuantity = COALESCE(SUM(di.delivery_qty), 0),
            @TotalValue = COALESCE(SUM(di.delivery_qty * poi.unit_price), 0)
        FROM dbo.delivery_items di
        INNER JOIN dbo.purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good';

        DECLARE @Sequence INT;
        SELECT @Sequence = ISNULL(MAX(TRY_CONVERT(INT, RIGHT(acquisition_number, 6))), 0) + 1
        FROM dbo.stock_acquisitions
        WHERE acquisition_number LIKE 'ACQ-' + CONVERT(VARCHAR(4), YEAR(GETDATE())) + '-%';

        SET @AcquisitionNumber = CONCAT('ACQ-', YEAR(GETDATE()), '-', RIGHT('000000' + CONVERT(VARCHAR(6), @Sequence), 6));
        SET @AcquisitionId = NEWID();

        INSERT dbo.stock_transactions
            (id, transaction_number, item_master_id, transaction_type, quantity, unit_price, total_value,
             reference_type, reference_id, reference_number, transaction_date, created_by, status)
        SELECT NEWID(), CONCAT('TXN-', YEAR(GETDATE()), '-', RIGHT(CONVERT(VARCHAR(36), NEWID()), 6)),
               TRY_CAST(di.item_master_id AS UNIQUEIDENTIFIER), 'RECEIVED', di.delivery_qty, poi.unit_price,
               di.delivery_qty * poi.unit_price, 'PURCHASE_ORDER', @POId, @PONumber,
               GETDATE(), CONVERT(NVARCHAR(450), @ReceivedBy), 'ACTIVE'
        FROM dbo.delivery_items di
        INNER JOIN dbo.purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good';

        -- Update current_inventory_stock
        MERGE dbo.current_inventory_stock AS target
        USING
        (
            SELECT di.item_master_id, SUM(di.delivery_qty) AS quantity
            FROM dbo.delivery_items di
            WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good'
            GROUP BY di.item_master_id
        ) AS source
        ON target.item_master_id = source.item_master_id
        WHEN MATCHED THEN UPDATE SET
            current_quantity = target.current_quantity + source.quantity,
            last_transaction_date = GETDATE(), last_transaction_type = 'RECEIVED', last_updated = GETDATE()
        WHEN NOT MATCHED THEN INSERT
            (id, item_master_id, current_quantity, last_transaction_date, last_transaction_type, last_updated)
            VALUES (NEWID(), source.item_master_id, source.quantity, GETDATE(), 'RECEIVED', GETDATE());

        INSERT dbo.stock_acquisitions
            (id, acquisition_number, po_id, delivery_id, total_items, total_quantity, total_value, acquisition_date, processed_by, status)
        VALUES
            (@AcquisitionId, @AcquisitionNumber, @POId, @DeliveryId, @TotalItems, @TotalQuantity, @TotalValue,
             GETDATE(), CONVERT(NVARCHAR(450), @ReceivedBy), 'completed');

        UPDATE dbo.deliveries
        SET delivery_status = 'completed', received_by = @ReceivedBy, receiving_date = GETDATE(), updated_at = GETDATE()
        WHERE id = @DeliveryId;

        -- Update purchase_orders status: check if all items in this PO are fully received
        DECLARE @IsFullyReceived BIT = 1;
        
        IF EXISTS (
            SELECT 1
            FROM dbo.purchase_order_items poi
            LEFT JOIN (
                SELECT di.po_item_id, SUM(di.delivery_qty) AS received_qty
                FROM dbo.delivery_items di
                INNER JOIN dbo.deliveries d ON di.delivery_id = d.id
                WHERE d.po_id = @POId AND (di.is_deleted = 0 OR di.is_deleted IS NULL) AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
                GROUP BY di.po_item_id
            ) del ON poi.id = del.po_item_id
            WHERE poi.po_id = @POId AND poi.quantity > ISNULL(del.received_qty, 0)
        )
        BEGIN
            SET @IsFullyReceived = 0;
        END

        UPDATE dbo.purchase_orders
        SET status = CASE WHEN @IsFullyReceived = 1 THEN 'completed' ELSE 'partial' END,
            updated_at = GETDATE()
        WHERE id = @POId;

        COMMIT TRANSACTION;

        SELECT @AcquisitionId AS acquisition_id, @AcquisitionNumber AS acquisition_number,
               @TotalItems AS total_items, @TotalQuantity AS total_quantity, @TotalValue AS total_value,
               'Stock acquisition completed successfully' AS message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
    `;

    await pool.request().query(createSPSQL);
    console.log("Successfully recreated sp_CreateStockTransactionFromDelivery!");

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixSP();
