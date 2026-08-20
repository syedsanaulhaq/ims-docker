const { initializePool, getPool } = require('./db/connection.cjs');

async function main() {
  try {
    await initializePool();
    const pool = getPool();

    const tablesResult = await pool.request().query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
    );
    
    console.log('=== TABLE RECORD COUNTS ===');
    for (const row of tablesResult.recordset) {
      const tableName = row.TABLE_NAME;
      try {
        const countResult = await pool.request().query(`SELECT COUNT(*) as cnt FROM [${tableName}]`);
        const count = countResult.recordset[0].cnt;
        if (count > 0) {
          console.log(`${tableName}: ${count} rows`);
        }
      } catch (err) {
        console.error(`Error counting ${tableName}:`, err.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
