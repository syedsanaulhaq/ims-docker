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

async function checkRequest() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';
    const approverId = '869dd81b-a782-494d-b8c2-695369b5ebb6';

    // 1. Check if request and approval exists
    const reqResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT sir.id, sir.request_type, sir.purpose,
               ra.id as approval_id, ra.current_approver_id, ra.current_status
        FROM stock_issuance_requests sir
        LEFT JOIN request_approvals ra ON ra.request_id = sir.id
        WHERE sir.id = @requestId
      `);

    if (reqResult.recordset.length === 0) {
      return;
    }

    const request = reqResult.recordset[0];
    if (request.current_approver_id !== approverId) {
      return;
    }

    // 2. Check approval items
    const itemsResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, request.approval_id)
      .query(`
        SELECT id, nomenclature, decision_type FROM approval_items
        WHERE request_approval_id = @approvalId
      `);

    if (itemsResult.recordset.length === 0) {
      } else {
      itemsResult.recordset.forEach((item, i) => {
        });
    }

    // 3. Test the fixed API query
    const apiTestResult = await pool.request()
      .input('userId', sql.NVarChar(450), approverId)
      .query(`
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.current_status
        FROM request_approvals ra
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT ra2.request_id FROM request_approvals ra2
          INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
          WHERE (ai.decision_type IS NULL OR ai.decision_type = '')
        )
      `);

    const foundRequest = apiTestResult.recordset.find(a => a.request_id === requestId);
    
    if (foundRequest) {
      } else {
      }

    } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkRequest();
