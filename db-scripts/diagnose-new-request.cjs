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

async function diagnosticCheck() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    const requestId = 'E0D6C366-AD5C-4403-B982-B983DE79FB3D';
    
    // Step 1: Check approval record
    const approvalCheck = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, request_id, current_approver_id, submitted_date
        FROM request_approvals
        WHERE request_id = @requestId
      `);

    if (approvalCheck.recordset.length === 0) {
      return;
    }

    const approval = approvalCheck.recordset[0];
    // Step 2: Check stock items
    const stockItems = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, nomenclature, requested_quantity, created_at
        FROM stock_issuance_items
        WHERE request_id = @requestId
        ORDER BY created_at
      `);

    stockItems.recordset.forEach((item, i) => {
      });

    // Step 3: Check approval items
    const approvalItems = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approval.id)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type, created_at
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY created_at
      `);

    if (approvalItems.recordset.length > 0) {
      approvalItems.recordset.forEach((item, i) => {
        });
    } else {
      }

    // Step 4: Compare counts
    if (stockItems.recordset.length > 0 && approvalItems.recordset.length === 0) {
      } else if (stockItems.recordset.length === approvalItems.recordset.length) {
      }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

diagnosticCheck();
