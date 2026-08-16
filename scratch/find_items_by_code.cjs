const { initializePool, getPool } = require('../server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();

  const items = await pool.request().query(`
    SELECT id, item_code, nomenclature, category_id, group_number
    FROM item_masters 
    WHERE item_code LIKE '%GRP-03%' OR nomenclature LIKE '%GRP-03%' OR group_number LIKE '%GRP-03%'
  `);
  console.log('Matching items count:', items.recordset.length);
  console.log('Matching items:', items.recordset);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
