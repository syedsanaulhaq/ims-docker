const sql = require('mssql');
const config = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function diagnoseDashboard() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    // Ehtisham's ID
    const ehtishamId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';

    const approvals = await pool.request()
      .input('approverId', sql.NVarChar, ehtishamId)
      .query(`
        SELECT 
          ra.id as ApprovalId,
          ra.request_id as RequestId,
          ra.current_approver_id as AssignedApproverId,
          ra.current_status as ApprovalStatus,
          sir.requester_user_id,
          u.FullName as RequesterName,
          ra.submitted_by
        FROM request_approvals ra
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        WHERE ra.current_approver_id = @approverId
      `);

    approvals.recordset.forEach(row => {
      });

    // Now check if approval_items exist
    if (approvals.recordset.length > 0) {
      const firstApprovalId = approvals.recordset[0].ApprovalId;
      const items = await pool.request()
        .input('approvalId', sql.UniqueIdentifier, firstApprovalId)
        .query(`
          SELECT 
            id as ItemId,
            nomenclature,
            decision_type
          FROM approval_items
          WHERE request_approval_id = @approvalId
        `);

      items.recordset.forEach(item => {
        });

      if (items.recordset.length === 0) {
        }
    }

    // Check dashboard query logic
    const dashboardResult = await pool.request()
      .input('userId', sql.NVarChar, ehtishamId)
      .query(`
        SELECT
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type = 'PENDING') as pending_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')) as approved_count
      `);

    const counts = dashboardResult.recordset[0];
    if (counts.pending_count === 0) {
      }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

diagnoseDashboard();
