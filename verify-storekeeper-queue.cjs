/**
 * Quick verification: make an authenticated API call as Aqsa Noreen
 * to check if the request appears in her issuance queue.
 * Since we can't use browser cookies, we check the DB directly.
 */
const { initializePool, getPool, sql } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');
dotenv.config();

const STOREKEEPER_WING_ID = 19; // Wing 19

async function main() {
  await initializePool();
  const pool = getPool();

  const res = await pool.request()
    .input('wingId', sql.NVarChar(100), String(STOREKEEPER_WING_ID))
    .query(`
      SELECT sir.id, sir.request_number, sir.approval_status, sir.request_status,
             u.FullName as requester_name
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      WHERE sir.approval_status LIKE 'Approved%'
        AND CONVERT(NVARCHAR(100), sir.requester_wing_id) = @wingId
      ORDER BY sir.submitted_at DESC
    `);
  console.table(res.recordset);

  if (res.recordset.length > 0) {
    } else {
    }

  const raRes = await pool.request()
    .query(`
      SELECT ra.id, ra.request_id, ra.current_status,
             u.FullName as current_approver,
             sir.approval_status
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      WHERE ra.request_id = '52049EBE-CD64-45DB-A102-D80A27F1A6C7'
    `);
  console.table(raRes.recordset);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
