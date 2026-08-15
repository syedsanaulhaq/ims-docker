const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const result = await pool.request()
    .query(`
      SELECT id, group_number, step_order, designation_value, match_mode, is_active
      FROM ims_dynamic_workflow_steps
      WHERE group_number IN (1, 3, 5) AND is_active = 1
      ORDER BY group_number, step_order
    `);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
