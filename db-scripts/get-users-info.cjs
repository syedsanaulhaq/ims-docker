const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT Id, UserName, FullName, Email
    FROM AspNetUsers
    WHERE FullName LIKE '%Haseeb%' OR FullName LIKE '%Aqsa%' OR FullName LIKE '%Asad%' OR FullName LIKE '%Ehtesham%'
  `);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
