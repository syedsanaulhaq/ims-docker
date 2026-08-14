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

async function fixDeliveryQuantities() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Dropping and recreating view vw_po_fulfillment_status to ONLY count 'good' quality status as received...");
    await pool.request().query(`
      IF OBJECT_ID('vw_po_fulfillment_status', 'V') IS NOT NULL
          DROP VIEW vw_po_fulfillment_status;
    `);

    const createViewSQL = `
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
          ISNULL(delivery_totals.received_quantity, 0) AS received_quantity,
          (poi.quantity - ISNULL(delivery_totals.received_quantity, 0)) AS pending_quantity,
          poi.unit_price,
          (poi.quantity * poi.unit_price) AS ordered_value,
          (ISNULL(delivery_totals.received_quantity, 0) * poi.unit_price) AS received_value,
          CASE 
              WHEN ISNULL(delivery_totals.received_quantity, 0) = 0 THEN 'pending'
              WHEN ISNULL(delivery_totals.received_quantity, 0) >= poi.quantity THEN 'completed'
              ELSE 'partial'
          END AS delivery_status,
          CASE 
              WHEN ISNULL(delivery_totals.received_quantity, 0) = 0 THEN 0
              ELSE CAST((ISNULL(delivery_totals.received_quantity, 0) * 100.0 / poi.quantity) AS DECIMAL(5,2))
          END AS fulfillment_percentage,
          po.created_at AS po_created_at
      FROM purchase_orders po
      INNER JOIN purchase_order_items poi ON po.id = poi.po_id
      LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
      LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
      LEFT JOIN item_masters im ON TRY_CAST(poi.item_master_id AS UNIQUEIDENTIFIER) = im.id
      LEFT JOIN (
          SELECT 
              di.po_item_id,
              SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END) AS received_quantity
          FROM delivery_items di
          INNER JOIN deliveries d ON di.delivery_id = d.id
          WHERE (di.is_deleted = 0 OR di.is_deleted IS NULL)
            AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
          GROUP BY di.po_item_id
      ) delivery_totals ON poi.id = delivery_totals.po_item_id;
    `;
    await pool.request().query(createViewSQL);
    console.log("Successfully updated vw_po_fulfillment_status!");

    console.log("\nDropping and recreating sp_CreateStockTransactionFromDelivery procedure to calculate received quantities based ONLY on 'good' items...");
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateStockTransactionFromDelivery')
          DROP PROCEDURE sp_CreateStockTransactionFromDelivery;
    `);

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

        -- Insert stock transactions ONLY for good items
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

        -- Update current_inventory_stock ONLY for good items
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

        -- Update purchase_orders status: check if all items in this PO are fully received based ONLY on 'good' items
        DECLARE @IsFullyReceived BIT = 1;
        
        IF EXISTS (
            SELECT 1
            FROM dbo.purchase_order_items poi
            LEFT JOIN (
                SELECT di.po_item_id, SUM(di.delivery_qty) AS received_qty
                FROM dbo.delivery_items di
                INNER JOIN dbo.deliveries d ON di.delivery_id = d.id
                WHERE d.po_id = @POId 
                  AND di.quality_status = 'good'
                  AND (di.is_deleted = 0 OR di.is_deleted IS NULL) 
                  AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
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
    console.log("Successfully updated sp_CreateStockTransactionFromDelivery stored procedure!");

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixDeliveryQuantities();
