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

async function findAndReassign() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();

    // Find the supervisor by name
    const userResult = await pool.request()
      .input('name', sql.NVarChar, '%Muhammad Ehtesham Siddiqui%')
      .query(`
        SELECT Id, FullName, Email FROM AspNetUsers
        WHERE FullName LIKE @name
      `);

    if (userResult.recordset.length === 0) {
      const similarResult = await pool.request()
        .query(`
          SELECT Id, FullName, Email FROM AspNetUsers
          WHERE FullName LIKE '%Muhammad%' OR FullName LIKE '%Ehtesham%'
          ORDER BY FullName
        `);
      
      similarResult.recordset.forEach((u, i) => {
        });
      return;
    }

    const supervisor = userResult.recordset[0];
    // Reassign the request to this supervisor
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';
    const updateResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('supervisorId', sql.NVarChar(450), supervisor.Id)
      .query(`
        UPDATE request_approvals
        SET current_approver_id = @supervisorId
        WHERE request_id = @requestId;
        SELECT @@ROWCOUNT as rows_updated;
      `);

    const rowsUpdated = updateResult.recordset[0].rows_updated;
    
    } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

findAndReassign();
