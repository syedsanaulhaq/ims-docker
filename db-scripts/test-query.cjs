const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: { type: 'default' },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    const userId = '4dae06b7-17cd-480b-81eb-da9c76ad5728'; // Muhammad Ehtesham Siddiqui

    // Check what's in request_approvals
    const approvalsResult = await pool.request().query(`
      SELECT id, request_id, current_approver_id, current_status, submitted_by
      FROM request_approvals
      ORDER BY submitted_date DESC
    `);

    approvalsResult.recordset.forEach((ra, i) => {
      });

    // Check what the query returns for Muhammad Ehtesham Siddiqui
    const queryResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT 
          ra.id,
          ra.request_id,
          ra.current_status,
          ra.current_approver_id,
          sir.justification as title
        FROM request_approvals ra
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        WHERE (ra.current_approver_id = @userId 
               OR EXISTS (SELECT 1 FROM approval_history ah 
                          WHERE ah.request_approval_id = ra.id 
                          AND ah.action_by = @userId))
        ORDER BY ra.submitted_date DESC
      `);

    queryResult.recordset.forEach((req, i) => {
      });

    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
