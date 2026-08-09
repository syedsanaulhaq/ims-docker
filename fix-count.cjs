const { getPool, sql, initializePool } = require('./server/db/connection.cjs');
(async () => {
  await initializePool();
  const pool = getPool();
  await pool.request().query(`UPDATE stock_issuance_requests SET is_deleted = 1, deleted_at = GETDATE() WHERE request_number IN ('ISS-20260309-1665', 'ISS-20260309-2849')`);
  const r = await pool.request().input('uid', sql.NVarChar, '4dae06b7-17cd-480b-81eb-da9c76ad5728').query(`SELECT COUNT(*) as cnt FROM request_approvals ra INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id WHERE ra.current_approver_id = @uid AND sir.is_deleted = 0`);
  process.exit();
})();
