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

async function checkPOStatus() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking PO status and items detail for PO000002:");
    const poResult = await pool.request()
      .query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = 'PO000002'`);
    console.log("PO Status:", poResult.recordset);

    if (poResult.recordset.length > 0) {
      const poId = poResult.recordset[0].id;

      console.log("\nChecking purchase_order_items for PO000002:");
      const items = await pool.request()
        .input('poId', sql.UniqueIdentifier, poId)
        .query(`SELECT id, item_master_id, quantity FROM purchase_order_items WHERE po_id = @poId`);
      console.log(items.recordset);

      console.log("\nChecking delivery_items for PO000002:");
      const deliveryItems = await pool.request()
        .input('poId', sql.UniqueIdentifier, poId)
        .query(`
          SELECT di.id, di.delivery_id, di.item_name, di.delivery_qty, di.quality_status, d.delivery_status as d_status
          FROM delivery_items di
          INNER JOIN deliveries d ON di.delivery_id = d.id
          WHERE d.po_id = @poId AND (di.is_deleted = 0 OR di.is_deleted IS NULL) AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
        `);
      console.log(deliveryItems.recordset);

      console.log("\nChecking the merge/status query result manually for PO000002:");
      const testStatus = await pool.request()
        .input('poId', sql.UniqueIdentifier, poId)
        .query(`
          SELECT 
              poi.id,
              poi.quantity,
              del.received_qty
          FROM dbo.purchase_order_items poi
          LEFT JOIN (
              SELECT di.po_item_id, SUM(di.delivery_qty) AS received_qty
              FROM dbo.delivery_items di
              INNER JOIN dbo.deliveries d ON di.delivery_id = d.id
              WHERE d.po_id = @poId 
                AND di.quality_status = 'good'
                AND (di.is_deleted = 0 OR di.is_deleted IS NULL) 
                AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
              GROUP BY di.po_item_id
          ) del ON poi.id = del.po_item_id
          WHERE poi.po_id = @poId
        `);
      console.log(testStatus.recordset);
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPOStatus();
