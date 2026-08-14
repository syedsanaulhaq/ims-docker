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

async function checkSpecificPO() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking purchase_orders for ID 14EF3FF0-7593-404D-87FA-BAF68C0CCC92...");
    const poResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, '14EF3FF0-7593-404D-87FA-BAF68C0CCC92')
      .query(`SELECT * FROM purchase_orders WHERE id = @poId`);
    
    console.log(`Found POs:`, poResult.recordset);

    if (poResult.recordset.length > 0) {
      console.log("\nChecking purchase_order_items for this PO:");
      const itemsResult = await pool.request()
        .input('poId', sql.UniqueIdentifier, '14EF3FF0-7593-404D-87FA-BAF68C0CCC92')
        .query(`SELECT * FROM purchase_order_items WHERE po_id = @poId`);
      console.log(itemsResult.recordset);
    } else {
      console.log("\nChecking top 5 POs in database to see what IDs exist:");
      const topPOs = await pool.request().query("SELECT TOP 5 id, po_number FROM purchase_orders");
      console.log(topPOs.recordset);
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSpecificPO();
