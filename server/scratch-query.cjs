const { initializePool, getPool } = require('./db/connection.cjs');

async function main() {
  try {
    await initializePool();
    const pool = getPool();

    console.log('--- User query ---');
    const users = await pool.request().query(
      "SELECT Id, UserName, FullName, Email FROM AspNetUsers WHERE FullName LIKE '%Fazli%' OR UserName LIKE '%Fazli%'"
    );
    console.log(JSON.stringify(users.recordset, null, 2));

    console.log('--- Total Stock Issuance Requests ---');
    const count = await pool.request().query(
      "SELECT COUNT(*) as total FROM stock_issuance_requests"
    );
    console.log(count.recordset[0]);

    console.log('--- Count by Creator ---');
    const creators = await pool.request().query(
      "SELECT strCreatedByID, COUNT(*) as count FROM stock_issuance_requests GROUP BY strCreatedByID"
    );
    console.log(JSON.stringify(creators.recordset, null, 2));

    console.log('--- Request Approvals Status Counts ---');
    const approvals = await pool.request().query(
      "SELECT current_status, COUNT(*) as count FROM request_approvals GROUP BY current_status"
    );
    console.log(JSON.stringify(approvals.recordset, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
