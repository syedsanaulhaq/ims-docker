/**
 * COMPLETE CLEANUP: Remove ALL requests and approvals
 * Use with caution - deletes all data!
 */

const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

const pool = new sql.ConnectionPool(config);

async function cleanup() {
  try {
    await pool.connect();

    // Delete in correct order (foreign key dependencies)

    // Step 1: Delete approval_history
    const deleteHistory = await pool.request().query(`
      DELETE FROM approval_history
    `);
    // Step 2: Delete approval_items
    const deleteApprovalItems = await pool.request().query(`
      DELETE FROM approval_items
    `);
    // Step 3: Delete request_approvals
    const deleteApprovals = await pool.request().query(`
      DELETE FROM request_approvals
    `);
    // Step 4: Delete stock_issuance_items
    const deleteItems = await pool.request().query(`
      DELETE FROM stock_issuance_items
    `);
    // Step 5: Delete stock_issuance_requests
    const deleteRequests = await pool.request().query(`
      DELETE FROM stock_issuance_requests
    `);
    // Verify cleanup
    const counts = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM stock_issuance_requests) as requests,
        (SELECT COUNT(*) FROM stock_issuance_items) as items,
        (SELECT COUNT(*) FROM request_approvals) as approvals,
        (SELECT COUNT(*) FROM approval_items) as approval_items,
        (SELECT COUNT(*) FROM approval_history) as history
    `);

    const result = counts.recordset[0];
    if (result.requests === 0 && result.approvals === 0) {
      } else {
      }

    await pool.close();

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
