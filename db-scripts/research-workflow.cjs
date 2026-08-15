const { sql, getPool, initializePool } = require('./server/db/connection.cjs');

async function researchWorkflow() {
  await initializePool();
  const pool = getPool();
  try {
    console.log('--- ROLES ---');
    const roles = await pool.request().query('SELECT role_name, display_name FROM ims_roles');
    console.table(roles.recordset);

    console.log('\n--- WORKFLOW STEPS ---');
    const steps = await pool.request().query(`
      SELECT 
        s.step_name, 
        s.step_order, 
        s.group_id, 
        g.group_name 
      FROM ims_workflow_steps s
      LEFT JOIN ims_approval_groups g ON s.group_id = g.id
      ORDER BY s.step_order
    `);
    console.table(steps.recordset);
    
    console.log('\n--- APPROVAL GROUPS ---');
    const groups = await pool.request().query('SELECT id, group_name, description FROM ims_approval_groups');
    console.table(groups.recordset);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
researchWorkflow();
