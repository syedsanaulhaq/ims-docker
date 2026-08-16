const { initializePool, getPool } = require('../server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();

  const items = await pool.request().query(`
    SELECT id, item_code, nomenclature, category_id, group_number
    FROM item_masters 
    WHERE item_code IN ('GRP-03-002', 'GRP-03-003')
  `);
  console.log('Items:', items.recordset);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
