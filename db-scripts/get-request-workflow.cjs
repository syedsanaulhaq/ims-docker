const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const reqId = '52049EBE-CD64-45DB-A102-D80A27F1A6C7';
  
  const requestInfo = await pool.request()
    .input('reqId', reqId)
    .query(`
      SELECT id, request_number, approval_status, request_status
      FROM stock_issuance_requests
      WHERE id = @reqId
    `);
  const workflowState = await pool.request()
    .input('reqId', reqId)
    .query(`
      SELECT group_number, current_step_order, total_steps, status, current_approver_id
      FROM ims_request_workflow_state
      WHERE request_id = @reqId
    `);
  const requestApprovals = await pool.request()
    .input('reqId', reqId)
    .query(`
      SELECT id, request_type, workflow_id, current_status, current_approver_id
      FROM request_approvals
      WHERE request_id = @reqId
    `);
  const history = await pool.request()
    .input('reqId', reqId)
    .query(`
      SELECT h.id, h.step_number, h.action_type, h.action_date, u.FullName as action_by_name, h.comments, h.is_current_step
      FROM approval_history h
      LEFT JOIN AspNetUsers u ON u.Id = h.action_by
      WHERE h.request_approval_id IN (SELECT id FROM request_approvals WHERE request_id = @reqId)
      ORDER BY h.action_date DESC, h.step_number DESC
    `);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
