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

async function removeAllRequests() {
  try {
    await sql.connect(config);

    // Start transaction for safe deletion
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // 1. Delete approval_history first (foreign key constraint)
      const historyDelete = await transaction.request()
        .query('DELETE FROM approval_history');

      // 2. Delete approval_items
      const itemsDelete = await transaction.request()
        .query('DELETE FROM approval_items');

      // 3. Delete request_approvals
      const approvalDelete = await transaction.request()
        .query('DELETE FROM request_approvals');

      // 4. Delete stock_issuance_items
      const stockItemsDelete = await transaction.request()
        .query('DELETE FROM stock_issuance_items');

      // 5. Delete stock_issuance_requests
      const requestDelete = await transaction.request()
        .query('DELETE FROM stock_issuance_requests');

      // Commit transaction
      await transaction.commit();

      } catch (error) {
      await transaction.rollback();
      console.error('❌ Transaction rolled back due to error:', error);
      throw error;
    }

  } catch (err) {
    console.error('❌ Error removing requests:', err);
  } finally {
    await sql.close();
  }
}

removeAllRequests();