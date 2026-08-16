const { initializePool, getPool } = require('../server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT u.FullName, r.role_name, r.display_name 
    FROM AspNetUsers u 
    JOIN ims_user_roles ur ON u.Id = ur.user_id 
    JOIN ims_roles r ON ur.role_id = r.id 
    WHERE u.FullName LIKE '%Ehtesham%'
  `);
  console.log('Ehtesham Roles:', result.recordset);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
