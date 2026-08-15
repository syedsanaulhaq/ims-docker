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

    const approvalHistoryQuery = `
      SELECT 
        ra.id,
        ra.request_id,
        ra.request_type,
        ra.submitted_date,
        ra.current_status,
        ra.submitted_by,
        ra.current_approver_id,
        u_requester.FullName as requester_name,
        u_current_approver.FullName as current_approver_name,
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        COALESCE(
          (SELECT TOP 1 ah.action_type 
           FROM approval_history ah 
           WHERE ah.request_approval_id = ra.id 
           AND ah.action_by = @userId
           ORDER BY ah.action_date DESC), 
          CASE 
            WHEN EXISTS (SELECT 1 FROM approval_history ah 
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId 
                        AND ah.action_type = 'forwarded') THEN 'forwarded'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'pending' THEN 'pending'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'approved' THEN 'approved'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'rejected' THEN 'rejected'
            ELSE 'not_involved' 
          END
        ) as my_action,
        ra.updated_date as my_action_date,
        COALESCE(item_counts.item_count, 0) as total_items
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
      LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      LEFT JOIN (
        SELECT request_id, COUNT(*) as item_count
        FROM stock_issuance_items 
        GROUP BY request_id
      ) item_counts ON item_counts.request_id = ra.request_id
      WHERE (ra.current_approver_id = @userId 
             OR EXISTS (SELECT 1 FROM approval_history ah 
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId)
             OR EXISTS (SELECT 1 FROM approval_history ah
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId 
                        AND ah.action_type = 'forwarded'))
      ORDER BY ra.submitted_date DESC`;

    const historyResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(approvalHistoryQuery);

    if (historyResult.recordset.length > 0) {
      const first = historyResult.recordset[0];
      }

    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  }
})();
