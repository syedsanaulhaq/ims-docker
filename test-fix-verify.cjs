/**
 * Verification script: tests the fix by checking the current state and
 * simulating what the approval endpoint does when Haseeb Faryad approves Group 1.
 */
const { initializePool, getPool, sql } = require('./server/db/connection.cjs');
const { advanceWorkflow, getUserWorkflowRoles } = require('./server/utils/workflowEngine.cjs');
const dotenv = require('dotenv');
dotenv.config();

const REQ_ID    = '52049EBE-CD64-45DB-A102-D80A27F1A6C7';
const ACTOR_ID  = 'fe516fe7-4ee0-4d52-a4d9-ced9c3beb6dc'; // Haseeb Faryad (AD Admin-I)
const APPROVAL_ID = 'B172C94E-3CD3-4B18-9935-3201004553BA';

async function main() {
  await initializePool();
  const pool = getPool();

  const stateRes = await pool.request()
    .input('reqId', sql.UniqueIdentifier, REQ_ID)
    .query(`
      SELECT rws.group_number, rws.current_step_order, rws.status,
             u.FullName as current_approver
      FROM ims_request_workflow_state rws
      LEFT JOIN AspNetUsers u ON u.Id = rws.current_approver_id
      WHERE rws.request_id = @reqId
      ORDER BY rws.group_number
    `);
  console.table(stateRes.recordset);

  const itemsRes = await pool.request()
    .input('approvalId', sql.UniqueIdentifier, APPROVAL_ID)
    .query(`
      SELECT ai.id, ai.nomenclature, ai.requested_quantity, ai.decision_type, im.group_number
      FROM approval_items ai
      LEFT JOIN item_masters im ON im.id = ai.item_master_id
      WHERE ai.request_approval_id = @approvalId
    `);
  console.table(itemsRes.recordset);

  const transaction = pool.transaction();
  await transaction.begin();
  try {
    const result = await advanceWorkflow(transaction, REQ_ID, ACTOR_ID, {});
    // Determine what sirApprovalStatus would be set to
    let sirApprovalStatus = 'Pending Supervisor Review';
    const isDynamicStepTransition = result?.ok && !result?.completed;
    const newApproverId = result?.approverId;

    if (isDynamicStepTransition && newApproverId) {
      const nextRoles = await getUserWorkflowRoles(pool, newApproverId);
      if (nextRoles.includes('Storekeeper')) {
        sirApprovalStatus = 'Approved by Workflow';
        } else {
        sirApprovalStatus = 'Forwarded to Admin';
        }
    } else if (result?.completed) {
      sirApprovalStatus = 'Approved by Workflow';
      }
    await transaction.rollback(); // Don't actually advance — just testing
  } catch (err) {
    await transaction.rollback();
    console.error('Error in advanceWorkflow:', err.message);
  }

  const reqRes = await pool.request()
    .input('reqId', sql.UniqueIdentifier, REQ_ID)
    .query(`SELECT approval_status, request_status FROM stock_issuance_requests WHERE id = @reqId`);
  console.table(reqRes.recordset);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
