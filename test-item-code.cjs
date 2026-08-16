const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function testItemCode() {
  await initializePool();
  const pool = getPool();
  try {
    const res = await pool.request().query("SELECT id, item_code, nomenclature FROM item_masters WHERE nomenclature LIKE '%GRP%' OR item_code LIKE '%GRP%'");
    console.log(res.recordset);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
testItemCode();
