const sql = require('mssql');

const config = {
  server: '192.168.70.6',
  database: 'InventoryManagementDB',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'syed@123'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function testAutomaticApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check a recent request to verify automatic approval_items population
    const recentRequest = await pool.request()
      .query(`
        SELECT TOP 1 
          sir.id as request_id,
          sir.created_at,
          ra.id as approval_id,
          ra.current_approver_id,
          u.username as approver_name
        FROM stock_issuance_requests sir
        LEFT JOIN request_approvals ra ON sir.id = ra.request_id
        LEFT JOIN users u ON ra.current_approver_id = u.id
        WHERE ra.id IS NOT NULL
        ORDER BY sir.created_at DESC
      `);

    if (recentRequest.recordset.length === 0) {
      return;
    }

    const request = recentRequest.recordset[0];
    // Check items in stock_issuance_items
    const stockItems = await pool.request()
      .input('requestId', sql.UniqueIdentifier, request.request_id)
      .query(`
        SELECT id, nomenclature, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    stockItems.recordset.forEach((item, i) => {
      });

    // Check items in approval_items
    const approvalItems = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, request.approval_id)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);

    if (approvalItems.recordset.length === 0) {
      return;
    }

    approvalItems.recordset.forEach((item, i) => {
      });

    } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

testAutomaticApprovalItems();
