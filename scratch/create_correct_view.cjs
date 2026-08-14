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

async function createCorrectView() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Dropping and recreating view vw_po_fulfillment_status with correct joins and columns...");
    
    // We will drop the view first
    await pool.request().query(`
      IF OBJECT_ID('vw_po_fulfillment_status', 'V') IS NOT NULL
          DROP VIEW vw_po_fulfillment_status;
    `);

    // Let's check how the columns look:
    // In purchase_orders, tender_id and vendor_id are stored as nvarchar.
    // In tenders and vendors tables, id is uniqueidentifier.
    // Let's create the view definition where:
    // 1. received_quantity is calculated by summing up delivery_qty from delivery_items where quality_status = 'good' or quality_status = 'partial' (actually, only count good ones? No, usually delivered quantity is the sum of delivery_qty).
    // Let's see:
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
              SUM(di.delivery_qty) AS received_quantity
          FROM delivery_items di
          INNER JOIN deliveries d ON di.delivery_id = d.id
          WHERE (di.is_deleted = 0 OR di.is_deleted IS NULL)
            AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
          GROUP BY di.po_item_id
      ) delivery_totals ON poi.id = delivery_totals.po_item_id;
    `;

    await pool.request().query(createViewSQL);
    console.log("Successfully created vw_po_fulfillment_status!");

    // Test querying the view for the PO
    const testResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, '14EF3FF0-7593-404D-87FA-BAF68C0CCC92')
      .query(`SELECT * FROM vw_po_fulfillment_status WHERE po_id = @poId`);
    console.log("Test query result count:", testResult.recordset.length);
    console.log(testResult.recordset);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

createCorrectView();
