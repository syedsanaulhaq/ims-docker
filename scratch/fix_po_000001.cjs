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

async function fixPO000001() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking PO status and items detail for PO000001:");
    const poResult = await pool.request()
      .query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = 'PO000001'`);
    console.log("PO Status:", poResult.recordset);

    if (poResult.recordset.length > 0) {
      const poId = poResult.recordset[0].id;

      // Update PO000001 status directly to partial
      await pool.request()
        .input('poId', sql.UniqueIdentifier, poId)
        .query(`
          UPDATE dbo.purchase_orders
          SET status = 'partial', updated_at = GETDATE()
          WHERE id = @poId
        `);

      const updatedPo = await pool.request()
        .query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = 'PO000001'`);
      console.log("Updated PO Status:", updatedPo.recordset);
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixPO000001();
