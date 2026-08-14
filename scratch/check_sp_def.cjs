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

async function checkSPDefinition() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log("Checking definition of sp_CreateStockTransactionFromDelivery...");
    const spDef = await pool.request()
      .query(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_CreateStockTransactionFromDelivery')) as definition`);
    console.log(spDef.recordset[0].definition);

    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSPDefinition();
