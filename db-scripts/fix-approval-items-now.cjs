const { getPool, sql, initializePool } = require('./server/db/connection.cjs');

(async () => {
  try {
    await initializePool();
    const pool = getPool();
    
    const missing = await pool.request().query(`
      SELECT ra.id as approval_id, sii.id as item_id, sii.item_master_id, 
             sii.nomenclature, sii.custom_item_name, sii.requested_quantity, sir.request_number
      FROM request_approvals ra 
      INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id 
      INNER JOIN stock_issuance_items sii ON sii.request_id = ra.request_id 
      WHERE NOT EXISTS (SELECT 1 FROM approval_items ai WHERE ai.request_approval_id = ra.id) 
      AND sir.is_deleted = 0 AND sii.nomenclature IS NOT NULL
    `);
    
    for (const m of missing.recordset) {
      await pool.request()
        .input('iid', sql.UniqueIdentifier, m.item_id)
        .input('aid', sql.UniqueIdentifier, m.approval_id)
        .input('mid', sql.UniqueIdentifier, m.item_master_id)
        .input('n', sql.NVarChar(500), m.nomenclature)
        .input('cn', sql.NVarChar(500), m.custom_item_name)
        .input('q', sql.Int, m.requested_quantity)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM approval_items WHERE id = @iid) 
          INSERT INTO approval_items (id, request_approval_id, item_master_id, nomenclature, custom_item_name, requested_quantity, decision_type, created_at, updated_at) 
          VALUES (@iid, @aid, @mid, @n, @cn, @q, 'PENDING', GETDATE(), GETDATE())
        `);
      }
    
    // Verify Ehtesham's approvals
    const result = await pool.request()
      .input('uid', sql.NVarChar, '4dae06b7-17cd-480b-81eb-da9c76ad5728')
      .query(`
        SELECT sir.request_number, ra.current_status,
          (SELECT COUNT(*) FROM approval_items ai WHERE ai.request_approval_id = ra.id) as items,
          (SELECT COUNT(*) FROM approval_items ai WHERE ai.request_approval_id = ra.id AND ai.decision_type = 'PENDING') as pending_items
        FROM request_approvals ra
        INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        WHERE ra.current_approver_id = @uid AND sir.is_deleted = 0
        ORDER BY ra.submitted_date DESC
      `);
    for (const r of result.recordset) {
      }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
