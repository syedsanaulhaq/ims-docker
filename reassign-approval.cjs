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

async function reassignApproval() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';
    const supervisorId = '869dd81b-a782-494d-b8c2-695369b5ebb6'; // Your supervisor user

    // Update the approval to assign to supervisor
    const updateResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('supervisorId', sql.NVarChar(450), supervisorId)
      .query(`
        UPDATE request_approvals
        SET current_approver_id = @supervisorId,
            updated_date = GETDATE()
        WHERE request_id = @requestId;
        
        SELECT @@ROWCOUNT as rows_updated;
      `);

    const rowsUpdated = updateResult.recordset[0].rows_updated;
    
    if (rowsUpdated > 0) {
      } else {
      }

    } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

reassignApproval();
