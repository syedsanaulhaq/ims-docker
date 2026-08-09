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

async function findTables() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    const tables = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
    `);

    tables.recordset
      .filter(t => t.TABLE_NAME.toLowerCase().includes('item') || t.TABLE_NAME.toLowerCase().includes('master'))
      .forEach(t => );

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTables();
