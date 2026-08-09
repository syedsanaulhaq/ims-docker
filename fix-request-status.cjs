const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  server: process.env.SQL_SERVER_HOST,
  pool: { max: 10 },
  options: { encrypt: false, trustServerCertificate: true }
};

async function fixRequestStatus() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';

    // Check current state
    const checkResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          ra.id, 
          ra.current_status,
          ra.current_approver_id,
          (SELECT COUNT(*) FROM approval_items WHERE request_approval_id = ra.id) as item_count,
          (SELECT COUNT(*) FROM approval_items WHERE request_approval_id = ra.id AND (decision_type IS NULL OR decision_type = '')) as pending_items
        FROM request_approvals ra
        WHERE ra.request_id = @requestId
      `);

    if (checkResult.recordset.length === 0) {
      return;
    }

    const approval = checkResult.recordset[0];
    // Update status to pending
    const updateResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        UPDATE request_approvals
        SET current_status = 'pending', updated_date = GETDATE()
        WHERE request_id = @requestId;
        SELECT @@ROWCOUNT as rows_updated;
      `);

    // Verify
    const verifyResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT current_status FROM request_approvals WHERE request_id = @requestId
      `);

    } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

fixRequestStatus();
