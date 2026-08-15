const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function listTables() {
  await initializePool();
  const pool = getPool();
  try {
    const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.table(tables.recordset);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
listTables();
