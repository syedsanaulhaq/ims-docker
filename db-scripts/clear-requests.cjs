const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'IMS_Database',
  authentication: {
    type: 'default'
  },
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

async function clearAllRequests() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    // Clear in order of foreign key dependencies
    await pool.request().query('DELETE FROM approval_history');
    await pool.request().query('DELETE FROM approval_items');
    await pool.request().query('DELETE FROM request_approvals');
    await pool.request().query('DELETE FROM stock_issuance_items');
    await pool.request().query('DELETE FROM stock_issuance_requests');
    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error clearing requests:', error.message);
    process.exit(1);
  }
}

clearAllRequests();
