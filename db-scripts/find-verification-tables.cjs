const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB_TEST',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function findData() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // Check all tables that might contain verification data
    const tables = [
      'inventory_verification_requests',
      'inventory_verifications',
      'stock_verifications',
      'verification_requests',
      'inventory_checks'
    ];

    for (const table of tables) {
      try {
        const result = await pool.request().query(`
          SELECT COUNT(*) as count FROM ${table}
        `);
        const count = result.recordset[0]?.count || 0;
        if (count > 0) {
          const sampleResult = await pool.request().query(`
            SELECT TOP 1 * FROM ${table}
          `);
          }
      } catch (err) {
        }
    }

    await pool.close();
    } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

findData();
