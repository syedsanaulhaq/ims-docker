const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const userId = 'fe516fe7-4ee0-4d52-a4d9-ced9c3beb6dc';
  
  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT r.role_name
      FROM ims_user_roles ur
      JOIN ims_roles r ON r.id = ur.role_id
      WHERE ur.user_id = @userId AND ur.is_active = 1
    `);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
