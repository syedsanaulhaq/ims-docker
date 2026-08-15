const { initializePool, getPool, closePool } = require('./server/db/connection.cjs');

async function run() {
  try {
    const pool = await initializePool();
    console.log('Connected to database!');
    
    const result = await pool.request().query(`
      SELECT TOP 5 sir.id, u.FullName 
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
    `);
    
    console.log('Join with TRY_CONVERT works! Results count:', result.recordset.length);
    result.recordset.forEach(row => {
      console.log(`Request ID: ${row.id} | Requester Name: ${row.FullName}`);
    });

    await closePool();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
