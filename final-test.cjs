// Final comprehensive test of all 3 roles with correct user IDs
const BASE = 'http://localhost:3001/api/approvals';

async function fetchJSON(url) {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
}

async function testRole(name, userId) {
  const statuses = ['pending', 'approved', 'rejected', 'forwarded', 'returned'];
  
  for (const status of statuses) {
    const data = await fetchJSON(`${BASE}/my-approvals?userId=${userId}&status=${status}`);
    const items = data.data || [];
    for (const item of items) {
      }
  }
}

async function testRequester() {
  const { getPool, sql, initializePool } = require('./server/db/connection.cjs');
  await initializePool();
  const pool = getPool();

  const requests = await pool.request().query(`
    SELECT sir.id, sir.request_number, sir.request_status, sir.approval_status,
           ra.current_status as ra_status, u.FullName as current_approver_name
    FROM stock_issuance_requests sir
    LEFT JOIN request_approvals ra ON ra.request_id = sir.id
    LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
    WHERE sir.requester_user_id = '869DD81B-A782-494D-B8C2-695369B5EBB6'
    AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
    ORDER BY sir.created_at DESC
  `);

  for (const r of requests.recordset) {
    // Also test the status endpoint
    const statusResp = await fetchJSON(`${BASE}/request/${r.id}/status`);
    }
}

(async () => {
  // Correct IDs from DB
  const maqsoodId = '3ff04743-1c84-4502-8a8c-4f1064300d05';  // Admin
  const ehteshamId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';  // Supervisor

  await testRole('ADMIN (Maqsood)', maqsoodId);
  await testRole('SUPERVISOR (Ehtesham)', ehteshamId);
  await testRequester();
  
  process.exit();
})();
