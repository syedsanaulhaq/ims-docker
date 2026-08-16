const { sql, getPool, initializePool } = require('../server/db/connection.cjs');

async function addSupervisorMenuPermission() {
  await initializePool();
  const pool = getPool();
  try {
    const checkResult = await pool.request()
      .query(`SELECT id FROM ims_permissions WHERE permission_key = 'supervisor.menu.view'`);
      
    if (checkResult.recordset.length === 0) {
      await pool.request().query(`
        INSERT INTO ims_permissions (id, module_name, action_name, permission_key, description, is_active)
        VALUES (
          NEWID(), 
          'Supervisor', 
          'View Supervisor Menu', 
          'supervisor.menu.view', 
          'Allows the user to see the Supervisor menu (Supervisor Dashboard, Requisition Report) in the sidebar.', 
          1
        )
      `);
      console.log('Added supervisor.menu.view permission.');
    } else {
      console.log('Permission already exists.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
addSupervisorMenuPermission();
