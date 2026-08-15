const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  server: process.env.SQL_SERVER_HOST,
  pool: { max: 10 },
  options: { encrypt: false, trustServerCertificate: true }
};

async function revertChanges() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    const approvalId = '2107FA18-C511-483D-A1D8-7F7B030C7AC3';

    // Revert approval status from 'pending' back to 'returned'
    await pool.request()
      .input('approvalId', sql.VarChar, approvalId)
      .query(`
        UPDATE request_approvals
        SET current_status = 'returned'
        WHERE id = @approvalId;
      `);
    // Revert approval_items decision_type to original values
    // Get the items first to show what we're reverting
    const items = await pool.request()
      .input('approvalId', sql.VarChar, approvalId)
      .query(`
        SELECT id, nomenclature, decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature;
      `);

    items.recordset.forEach((item, idx) => {
      });

    // Revert to original: A4 Paper = RETURN, HP ENVY 6 = APPROVE_FROM_STOCK, UPS = REJECT
    await pool.request()
      .input('approvalId', sql.VarChar, approvalId)
      .query(`
        UPDATE approval_items
        SET decision_type = CASE 
          WHEN nomenclature = 'A4 Paper' THEN 'RETURN'
          WHEN nomenclature = 'HP ENVY 6' THEN 'APPROVE_FROM_STOCK'
          WHEN nomenclature = 'UPS' THEN 'REJECT'
        END
        WHERE request_approval_id = @approvalId;
      `);
    // Show final state
    const finalItems = await pool.request()
      .input('approvalId', sql.VarChar, approvalId)
      .query(`
        SELECT id, nomenclature, decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature;
      `);

    finalItems.recordset.forEach((item, idx) => {
      });

    const approvalStatus = await pool.request()
      .input('approvalId', sql.VarChar, approvalId)
      .query(`SELECT current_status FROM request_approvals WHERE id = @approvalId;`);

    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.close();
    process.exit(1);
  }
}

revertChanges();
