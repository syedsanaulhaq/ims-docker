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

async function fixPO000002() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Fixing status for PO000002...");
    const poId = 'E84DBEC1-991B-4136-AB35-5C1AA4A359E9';

    // Update PO000002 status directly
    await pool.request()
      .input('poId', sql.UniqueIdentifier, poId)
      .query(`
        UPDATE dbo.purchase_orders
        SET status = 'partial', updated_at = GETDATE()
        WHERE id = @poId
      `);

    const poResult = await pool.request()
      .query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = 'PO000002'`);
    console.log("New PO Status:", poResult.recordset);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixPO000002();
