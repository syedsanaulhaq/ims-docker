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

async function checkFulfillmentView() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking vw_po_fulfillment_status for PO 14EF3FF0-7593-404D-87FA-BAF68C0CCC92...");
    const result = await pool.request()
      .input('poId', sql.UniqueIdentifier, '14EF3FF0-7593-404D-87FA-BAF68C0CCC92')
      .query(`SELECT * FROM vw_po_fulfillment_status WHERE po_id = @poId`);
    console.log("vw_po_fulfillment_status count:", result.recordset.length);
    console.log(result.recordset);

    console.log("\nChecking view definition for vw_po_fulfillment_status...");
    const viewDef = await pool.request()
      .query(`SELECT OBJECT_DEFINITION(OBJECT_ID('vw_po_fulfillment_status')) as definition`);
    console.log(viewDef.recordset[0].definition);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFulfillmentView();
