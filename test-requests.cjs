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
    
    // Check requests count
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN final_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN final_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN final_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM request_approvals
    `);
    
    // Get approver info
    const approverResult = await pool.request().query(`
      SELECT TOP 1 id, user_name FROM AspNetUsers WHERE user_name LIKE '%Muhammad%'
    `);
    
    if (approverResult.recordset.length > 0) {
      const approverId = approverResult.recordset[0].id;
      const approverName = approverResult.recordset[0].user_name;
      // Get requests for this approver
      const approvalResult = await pool.request().query(`
        SELECT ra.id, ra.final_status, sr.title, sr.submitted_date
        FROM request_approvals ra
        JOIN stock_issuance_requests sr ON ra.request_id = sr.id
        WHERE ra.approver_id = '${approverId}'
        ORDER BY sr.submitted_date DESC
      `);
      
      approvalResult.recordset.forEach((req, i) => {
        });
    }
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
