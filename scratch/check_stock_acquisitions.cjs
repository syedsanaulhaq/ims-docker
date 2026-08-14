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

async function checkStockAcquisitions() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking current_inventory_stock count and list:");
    const cisResult = await pool.request().query("SELECT COUNT(*) as count FROM current_inventory_stock");
    console.log("current_inventory_stock count:", cisResult.recordset[0].count);

    console.log("\nChecking DISTINCT items in stock_acquisitions:");
    const saResult = await pool.request().query("SELECT COUNT(DISTINCT item_master_id) as count FROM stock_acquisitions WHERE (is_deleted = 0 OR is_deleted IS NULL)");
    console.log("stock_acquisitions unique items count:", saResult.recordset[0].count);

    console.log("\nChecking total available quantity in stock_acquisitions:");
    const qtyResult = await pool.request().query("SELECT SUM(quantity_available) as total_qty FROM stock_acquisitions WHERE (is_deleted = 0 OR is_deleted IS NULL)");
    console.log("stock_acquisitions total quantity:", qtyResult.recordset[0].total_qty);

    console.log("\nChecking top 10 unique item master IDs in stock_acquisitions:");
    const itemsResult = await pool.request().query("SELECT DISTINCT TOP 10 item_master_id FROM stock_acquisitions WHERE (is_deleted = 0 OR is_deleted IS NULL)");
    console.log(itemsResult.recordset);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStockAcquisitions();
