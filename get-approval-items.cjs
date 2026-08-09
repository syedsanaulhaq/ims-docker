const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const approvalId = 'B172C94E-3CD3-4B18-9935-3201004553BA';
  
  const result = await pool.request()
    .input('approvalId', approvalId)
    .query(`
      SELECT ai.id, ai.nomenclature, ai.item_master_id, im.group_number, ai.requested_quantity, ai.allocated_quantity, ai.decision_type
      FROM approval_items ai
      LEFT JOIN item_masters im ON im.id = ai.item_master_id
      WHERE ai.request_approval_id = @approvalId
    `);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
