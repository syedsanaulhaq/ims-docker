const { initializePool } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  try {
    const pool = await initializePool();

    // Query workflow steps
    const steps = await pool.request()
      .query(`
        SELECT id, group_number, step_order, designation_value, match_mode, is_active
        FROM ims_dynamic_workflow_steps
        ORDER BY group_number ASC, step_order ASC
      `);
    console.table(steps.recordset);

    await pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
