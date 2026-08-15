const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const names = ['Muhammad Ehtesham Siddiqui', 'Asad ur Rehman', 'Haseeb Faryad', 'Aqsa Noreen'];
  
  const result = await pool.request()
    .query(`
      SELECT u.Id, u.FullName, u.UserName, r.role_name
      FROM AspNetUsers u
      LEFT JOIN ims_user_roles ur ON ur.user_id = u.Id AND ur.is_active = 1
      LEFT JOIN ims_roles r ON r.id = ur.role_id
      WHERE u.FullName IN ('Muhammad Ehtesham Siddiqui', 'Asad ur Rehman', 'Haseeb Faryad', 'Aqsa Noreen')
    `);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
