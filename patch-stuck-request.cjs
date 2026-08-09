/**
 * One-time data repair: updates the approval_status of the stuck request
 * from 'Forwarded to Admin' to 'Approved by Workflow' since all 3 lanes
 * are already at step 3 (Storekeeper) in ims_request_workflow_state.
 */
const { initializePool, getPool, sql } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');
dotenv.config();

const REQ_ID = '52049EBE-CD64-45DB-A102-D80A27F1A6C7';

async function main() {
  await initializePool();
  const pool = getPool();

  // Verify all lanes are at step 3 (Storekeeper) before patching
  const stateRes = await pool.request()
    .input('reqId', sql.UniqueIdentifier, REQ_ID)
    .query(`
      SELECT group_number, current_step_order, status, current_approver_id
      FROM ims_request_workflow_state
      WHERE request_id = @reqId
    `);

  console.table(stateRes.recordset);

  const allAtStep3 = stateRes.recordset.every(r => r.current_step_order === 3);
  const allPending = stateRes.recordset.every(r => r.status === 'pending');

  if (!allAtStep3 || !allPending) {
    console.error('❌ Not all lanes are at step 3/pending — cannot patch safely. Aborting.');
    process.exit(1);
  }

  // Patch the request
  await pool.request()
    .input('reqId', sql.UniqueIdentifier, REQ_ID)
    .query(`
      UPDATE stock_issuance_requests
      SET approval_status = 'Approved by Admin',
          updated_at = GETDATE()
      WHERE id = @reqId
    `);

  // Also update the request_approvals to reflect the storekeeper as current approver
  // (ims_request_workflow_state already has Aqsa Noreen, but request_approvals may still show Haseeb Faryad)
  const storekeeperRes = await pool.request()
    .query(`
      SELECT TOP 1 ur.user_id, u.FullName
      FROM ims_user_roles ur
      INNER JOIN ims_roles r ON r.id = ur.role_id
      INNER JOIN AspNetUsers u ON u.Id = ur.user_id
      WHERE r.role_name = 'Storekeeper' AND ur.is_active = 1 AND r.is_active = 1
    `);

  if (storekeeperRes.recordset.length > 0) {
    const sk = storekeeperRes.recordset[0];
    await pool.request()
      .input('reqId', sql.UniqueIdentifier, REQ_ID)
      .input('skId', sql.NVarChar(450), sk.user_id)
      .query(`
        UPDATE request_approvals
        SET current_approver_id = @skId,
            current_status = 'pending',
            updated_date = GETDATE()
        WHERE request_id = @reqId
      `);
    }

  // Verify patch
  const afterRes = await pool.request()
    .input('reqId', sql.UniqueIdentifier, REQ_ID)
    .query(`SELECT approval_status, request_status FROM stock_issuance_requests WHERE id = @reqId`);

  console.table(afterRes.recordset);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
