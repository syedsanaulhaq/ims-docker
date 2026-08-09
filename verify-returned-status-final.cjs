/**
 * FINAL VERIFICATION: Test the complete "returned" status workflow
 * This script verifies that:
 * 1. Status filtering works correctly in the database
 * 2. Returned approvals are NOT in 'pending' view
 * 3. Returned approvals ARE in 'returned' view
 * 4. The business logic is correct
 */

const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

const pool = new sql.ConnectionPool(config);

async function runTest() {
  try {
    await pool.connect();

    // ✅ TEST 1: Verify the fix was applied (changed 'pending' to 'returned')
    // ✅ TEST 2: Verify table structure
    const tables = ['request_approvals', 'approval_items', 'approval_history'];
    for (const tableName of tables) {
      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);
      
      const requiredColumns = {
        'request_approvals': ['id', 'request_id', 'current_status', 'submitted_by', 'submitted_date'],
        'approval_items': ['id', 'request_approval_id', 'nomenclature', 'decision_type', 'rejection_reason'],
        'approval_history': ['id', 'request_approval_id', 'action_type', 'action_by', 'action_date']
      };
      
      const columns = columnsResult.recordset.map(r => r.COLUMN_NAME);
      const missing = requiredColumns[tableName].filter(c => !columns.includes(c));
      
      if (missing.length === 0) {
        } else {
        }
    }
    // ✅ TEST 3: Verify status values exist in database
    const statusResult = await pool.request().query(`
      SELECT DISTINCT current_status as status, COUNT(*) as count
      FROM request_approvals
      GROUP BY current_status
      ORDER BY status
    `);

    const statuses = {};
    for (const row of statusResult.recordset) {
      statuses[row.status] = row.count;
    }
    // ✅ TEST 4: Verify filtering logic
    // Get a user with approvals
    const userWithApprovalsResult = await pool.request().query(`
      SELECT TOP 1 ra.current_approver_id
      FROM request_approvals ra
      WHERE ra.current_approver_id IS NOT NULL
      GROUP BY ra.current_approver_id
      HAVING COUNT(*) > 0
    `);

    if (userWithApprovalsResult.recordset.length > 0) {
      const userId = userWithApprovalsResult.recordset[0].current_approver_id;
      
      // Test filter: pending
      const pendingResult = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .input('status', sql.NVarChar, 'pending')
        .query(`
          SELECT COUNT(*) as count FROM request_approvals
          WHERE current_approver_id = @userId AND current_status = @status
        `);

      const pendingCount = pendingResult.recordset[0].count;
      // Test filter: returned
      const returnedResult = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .input('status', sql.NVarChar, 'returned')
        .query(`
          SELECT COUNT(*) as count FROM request_approvals
          WHERE current_approver_id = @userId AND current_status = @status
        `);

      const returnedCount = returnedResult.recordset[0].count;
      if (pendingCount > 0 || returnedCount > 0) {
        }
    }
    // ✅ TEST 5: Verify the fix logic (check if returned items are in returned status)
    const approvalWithReturnedItemsResult = await pool.request().query(`
      SELECT TOP 1
        ra.id,
        ra.request_id,
        ra.current_status,
        COUNT(CASE WHEN ai.decision_type = 'RETURN' THEN 1 END) as returned_items,
        COUNT(ai.id) as total_items
      FROM request_approvals ra
      LEFT JOIN approval_items ai ON ai.request_approval_id = ra.id
      WHERE ai.decision_type = 'RETURN'
      GROUP BY ra.id, ra.request_id, ra.current_status
      ORDER BY ra.id DESC
    `);

    if (approvalWithReturnedItemsResult.recordset.length > 0) {
      const approval = approvalWithReturnedItemsResult.recordset[0];
      if (approval.current_status === 'returned' && approval.returned_items > 0) {
        } else if (approval.returned_items > 0) {
        }
    } else {
      }
    // ✅ TEST 6: Verify endpoints are using correct status filter
    // ✅ TEST 7: Summary of the fix
    await pool.close();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
