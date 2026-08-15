const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function testApprovalFix() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    // ============================================================
    // STEP 1: CREATE TEST REQUEST WITH ITEMS
    // ============================================================
    // Get a test user
    const userResult = await pool.request().query(`
      SELECT TOP 1 Id, FullName FROM AspNetUsers 
      WHERE Id IS NOT NULL AND FullName IS NOT NULL
      ORDER BY NEWID()
    `);
    
    const testUserId = userResult.recordset[0].Id;
    const testUserName = userResult.recordset[0].FullName;
    // Create test request
    const requestResult = await pool.request()
      .input('requestNumber', sql.NVarChar, `TEST-APPROVAL-FIX-${Date.now()}`)
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`
        INSERT INTO stock_issuance_requests (
          id, request_number, requester_user_id, approval_status, request_status, created_at
        )
        OUTPUT INSERTED.id, INSERTED.request_number
        VALUES (NEWID(), @requestNumber, @userId, 'Pending Supervisor Review', 'Pending', GETDATE())
      `);
    
    const testRequestId = requestResult.recordset[0].id;
    const testRequestNumber = requestResult.recordset[0].request_number;
    // Create test items
    const testItems = [
      { name: 'Network Switches', qty: 5 },
      { name: 'Ethernet Cables', qty: 10 },
      { name: 'Power Adapters', qty: 3 }
    ];
    
    for (const item of testItems) {
      await pool.request()
        .input('requestId', sql.UniqueIdentifier, testRequestId)
        .input('nomenclature', sql.NVarChar, item.name)
        .input('quantity', sql.Int, item.qty)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, nomenclature, requested_quantity, created_at
          )
          VALUES (NEWID(), @requestId, @nomenclature, @quantity, GETDATE())
        `);
      }
    
    // ============================================================
    // STEP 3: CREATE APPROVAL RECORD
    // ============================================================
    // Get another user to be the approver
    const approverResult = await pool.request().query(`
      SELECT TOP 1 Id, FullName FROM AspNetUsers 
      WHERE Id IS NOT NULL AND FullName IS NOT NULL
      AND Id != @userId
    `.replace('@userId', `'${testUserId}'`));
    
    const approverId = approverResult.recordset[0].Id;
    const approverName = approverResult.recordset[0].FullName;
    
    const approvalResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, testRequestId)
      .input('approverId', sql.NVarChar, approverId)
      .input('submittedBy', sql.UniqueIdentifier, testUserId)
      .query(`
        INSERT INTO request_approvals (
          id, request_id, request_type, current_approver_id, 
          current_status, submitted_by, created_date
        )
        OUTPUT INSERTED.id
        VALUES (
          NEWID(), @requestId, 'stock_issuance', @approverId,
          'pending', @submittedBy, GETDATE()
        )
      `);
    
    const approvalId = approvalResult.recordset[0].id;
    // ============================================================
    // STEP 4: TEST THE FIX - POPULATE APPROVAL_ITEMS
    // ============================================================
    // Get items for this request
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, testRequestId)
      .query(`
        SELECT id, nomenclature, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);
    
    let successCount = 0;
    for (const item of itemsResult.recordset) {
      try {
        await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .input('nomenclature', sql.NVarChar, item.nomenclature)
          .input('requestedQuantity', sql.Int, item.requested_quantity)
          .query(`
            INSERT INTO approval_items (
              id, request_approval_id, nomenclature, requested_quantity
            )
            VALUES (NEWID(), @approvalId, @nomenclature, @requestedQuantity)
          `);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Failed to link ${item.nomenclature}:`, err.message);
      }
    }
    
    if (successCount === itemsResult.recordset.length) {
      }
    
    // ============================================================
    // STEP 5: VERIFY APPROVAL_ITEMS
    // ============================================================
    const verifyResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type, rejection_reason
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);
    
    if (verifyResult.recordset.length > 0) {
      verifyResult.recordset.forEach((item, idx) => {
        });
    }
    
    // ============================================================
    // STEP 6: SIMULATE SUPERVISOR DECISIONS
    // ============================================================
    const approvalItemsResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature FROM approval_items
        WHERE request_approval_id = @approvalId
      `);
    
    const decisions = [
      { itemName: 'Network Switches', decision: 'APPROVE_FROM_STOCK', qty: 5 },
      { itemName: 'Ethernet Cables', decision: 'RETURN', qty: 0 },
      { itemName: 'Power Adapters', decision: 'APPROVE_FROM_STOCK', qty: 3 }
    ];
    
    for (let i = 0; i < approvalItemsResult.recordset.length && i < decisions.length; i++) {
      const item = approvalItemsResult.recordset[i];
      const decision = decisions[i];
      
      await pool.request()
        .input('itemId', sql.UniqueIdentifier, item.id)
        .input('decisionType', sql.NVarChar, decision.decision)
        .input('allocatedQty', sql.Int, decision.qty)
        .input('reason', sql.NVarChar, decision.decision === 'RETURN' ? 'Request returned to requester for editing' : null)
        .query(`
          UPDATE approval_items
          SET decision_type = @decisionType,
              allocated_quantity = @allocatedQty,
              rejection_reason = @reason,
              updated_at = GETDATE()
          WHERE id = @itemId
        `);
      
      const badge = decision.decision === 'RETURN' ? '↩ RETURNED' : '✅ APPROVED';
      }
    
    // ============================================================
    // FINAL VERIFICATION
    // ============================================================
    const finalResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT nomenclature, decision_type, allocated_quantity, rejection_reason
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);
    
    finalResult.recordset.forEach((item, idx) => {
      const status = item.decision_type === 'RETURN' ? '↩' : '✅';
      });
    
    // ============================================================
    // SUCCESS SUMMARY
    // ============================================================
    } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\nFull error:', err);
  } finally {
    await pool.close();
  }
}

testApprovalFix();
