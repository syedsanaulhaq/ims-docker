const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: {
    type: 'default',
    options: {
      userName: 'inventorymanagementuser',
      password: '2016Wfp61@'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function cleanupAllRequests() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Delete approval_history entries
    await pool.request()
      .query(`
        DELETE FROM approval_history
        WHERE request_approval_id IN (
          SELECT id FROM request_approvals 
          WHERE request_id IN (SELECT id FROM stock_issuance_requests)
        )
      `);
    // Delete approval_items
    await pool.request()
      .query(`
        DELETE FROM approval_items
        WHERE request_approval_id IN (
          SELECT id FROM request_approvals 
          WHERE request_id IN (SELECT id FROM stock_issuance_requests)
        )
      `);
    // Delete request_approvals
    await pool.request()
      .query(`
        DELETE FROM request_approvals
        WHERE request_id IN (SELECT id FROM stock_issuance_requests)
      `);
    // Delete stock_issuance_items
    await pool.request()
      .query(`
        DELETE FROM stock_issuance_items
      `);
    // Delete stock_issuance_requests
    await pool.request()
      .query(`
        DELETE FROM stock_issuance_requests
      `);
    // Verify all deleted
    const requestsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM stock_issuance_requests');
    const itemsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM stock_issuance_items');
    const approvalsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM request_approvals');
    const approvalItemsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM approval_items');
    const historyCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM approval_history');
    } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

cleanupAllRequests();
