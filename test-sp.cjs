const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function testSp() {
  await initializePool();
  const pool = getPool();
  try {
    const res = await pool.request().execute('sp_GetRequestableInventoryItems');
    console.log(res.recordset.slice(0, 1));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
testSp();
