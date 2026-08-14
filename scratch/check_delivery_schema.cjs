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

async function checkColumns() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    // We will drop and recreate vw_po_fulfillment_status using the correct schema
    console.log("Dropping and recreating view vw_po_fulfillment_status...");
    
    await pool.request().query(`
      IF OBJECT_ID('vw_po_fulfillment_status', 'V') IS NOT NULL
          DROP VIEW vw_po_fulfillment_status;
    `);

    // Let's check how the columns look:
    // in purchase_order_items: quantity, unit_price, is_deleted exist.
    // DOES NOT contain: received_quantity, delivery_status.
    // Wait, let's see if we should calculate received_quantity from delivery_items!
    // Yes! Let's check the delivery_items and deliveries table schema.
    console.log("Checking columns of delivery_items:");
    const diCols = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'delivery_items'`
    );
    console.log(diCols.recordset);

    console.log("\nChecking columns of deliveries:");
    const dCols = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries'`
    );
    console.log(dCols.recordset);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumns();
