const { getPool, sql, initializePool } = require('./server/db/connection.cjs');
(async () => {
  await initializePool();
  const pool = getPool();
  
  // Fix approval_status for already-forwarded requests
  const result = await pool.request().query(`
    UPDATE sir
    SET sir.approval_status = 
      CASE 
        WHEN ra.current_status = 'forwarded_to_admin' THEN 'Forwarded to Admin'
        WHEN ra.current_status = 'forwarded_to_supervisor' THEN 'Forwarded to Supervisor'
        WHEN ra.current_status = 'approved' THEN 'Approved by Admin'
        WHEN ra.current_status = 'completed' THEN 'Issued'
        WHEN ra.current_status = 'rejected' THEN 'Rejected'
        WHEN ra.current_status = 'returned' THEN 'Returned for Revision'
        ELSE sir.approval_status
      END
    FROM stock_issuance_requests sir
    INNER JOIN request_approvals ra ON ra.request_id = sir.id
    WHERE sir.approval_status = 'Pending Supervisor Review'
    AND ra.current_status NOT IN ('pending')
  `);
  
  process.exit();
})();
