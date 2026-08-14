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
    
    console.log("Checking columns for purchase_order_items table:");
    const poiResult = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_items'`
    );
    console.log(poiResult.recordset);

    console.log("\nChecking columns for purchase_orders table:");
    const poResult = await pool.request().query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_orders'`
    );
    console.log(poResult.recordset);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumns();
