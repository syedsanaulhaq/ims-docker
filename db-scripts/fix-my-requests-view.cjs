const { sql, getPool, initializePool } = require('../server/db/connection.cjs');

async function fixView() {
  await initializePool();
  const pool = getPool();
  
  const viewDef = `
CREATE OR ALTER VIEW [dbo].[vw_my_issuance_requests] AS
SELECT
    sir.id,
    sir.request_number,
    sir.request_type,
    sir.purpose,
    sir.urgency_level,
    sir.is_urgent,
    sir.approval_status,
    sir.requester_user_id,
    sir.submitted_at,
    sir.supervisor_id,
    sup.FullName as supervisor_name,
    dbo.fn_GetUserPrimaryRole(sup.Id) as supervisor_role,
    sir.supervisor_reviewed_at,
    sir.supervisor_action,
    sir.supervisor_comments,
    sir.admin_id,
    adm.FullName as admin_name,
    dbo.fn_GetUserPrimaryRole(adm.Id) as admin_role,
    sir.admin_reviewed_at,
    sir.admin_action,
    sir.admin_comments,
    sir.forwarding_reason,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id AND is_deleted = 0) as total_items,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id AND is_deleted = 0 AND UPPER(ISNULL(item_status, '')) = 'APPROVED') as approved_items,
    ISNULL((SELECT SUM(requested_quantity) FROM stock_issuance_items WHERE request_id = sir.id AND is_deleted = 0), 0) as requested_quantity
FROM stock_issuance_requests sir
LEFT JOIN AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN AspNetUsers adm ON sir.admin_id = adm.Id;
  `;

  try {
    await pool.request().query(viewDef);
    console.log('Successfully updated vw_my_issuance_requests');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
fixView();
