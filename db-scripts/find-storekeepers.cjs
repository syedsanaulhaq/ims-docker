const { initializePool } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  try {
    const pool = await initializePool();

    // Query storekeepers
    const storekeepers = await pool.request()
      .query(`
        SELECT ur.user_id, u.FullName, u.UserName, u.intWingID, r.role_name
        FROM ims_user_roles ur
        INNER JOIN AspNetUsers u ON ur.user_id = u.Id
        INNER JOIN ims_roles r ON ur.role_id = r.id
        WHERE r.role_name LIKE '%STORE%'
      `);
    console.table(storekeepers.recordset);

    await pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
