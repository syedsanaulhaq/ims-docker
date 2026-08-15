const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function listPermissions() {
  await initializePool();
  const pool = getPool();
  try {
    const result = await pool.request().query('SELECT module_name, action_name, permission_key FROM ims_permissions ORDER BY module_name');
    console.table(result.recordset);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
listPermissions();
