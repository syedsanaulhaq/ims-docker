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

async function checkPOs() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking purchase_orders for tender B23AF418-F0D2-4550-ADF1-AE0117BF80F3...");
    const poResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, 'B23AF418-F0D2-4550-ADF1-AE0117BF80F3')
      .query(`SELECT id, po_number, tender_id, vendor_id, status, is_deleted FROM purchase_orders WHERE tender_id = @tenderId`);
    
    console.log(`Found ${poResult.recordset.length} POs for tender:`);
    console.log(poResult.recordset);

    console.log("\nChecking tenders with ID B23AF418-F0D2-4550-ADF1-AE0117BF80F3:");
    const tenderResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, 'B23AF418-F0D2-4550-ADF1-AE0117BF80F3')
      .query(`SELECT id, title, tender_type, status, vendor_id FROM tenders WHERE id = @tenderId`);
    console.log(tenderResult.recordset);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPOs();
