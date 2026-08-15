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

async function cleanupAndTest() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    // ============================================================
    // STEP 1: CLEANUP OLD TEST DATA
    // ============================================================
    // Find and delete old test requests
    const oldRequests = await pool.request().query(`
      SELECT id FROM stock_issuance_requests
      WHERE created_at < DATEADD(day, -1, GETDATE())
      AND request_number LIKE 'TEST-%'
    `);
    
    for (const req of oldRequests.recordset) {
      await pool.request().query(`
        DELETE FROM approval_items WHERE request_approval_id IN (
          SELECT id FROM request_approvals WHERE request_id = '${req.id}'
        );
        DELETE FROM approval_history WHERE request_approval_id IN (
          SELECT id FROM request_approvals WHERE request_id = '${req.id}'
        );
        DELETE FROM request_approvals WHERE request_id = '${req.id}';
        DELETE FROM stock_issuance_items WHERE request_id = '${req.id}';
        DELETE FROM stock_issuance_requests WHERE id = '${req.id}';
      `);
    }
    // ============================================================
    // STEP 2: CREATE NEW TEST REQUEST
    // ============================================================
    // Get a test user
    const userResult = await pool.request().query(`
      SELECT TOP 1 Id, FullName FROM AspNetUsers 
      WHERE Id IS NOT NULL AND FullName IS NOT NULL
      ORDER BY NEWID()
    `);
    
    if (userResult.recordset.length === 0) {
      console.error('❌ No users found in database');
      return;
    }
    
    const testUserId = userResult.recordset[0].Id;
    const testUserName = userResult.recordset[0].FullName;
    // Create test request
    const requestResult = await pool.request()
      .input('requestNumber', sql.NVarChar, `TEST-${Date.now()}`)
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
    // ============================================================
    // STEP 3: ADD TEST ITEMS
    // ============================================================
    const testItems = [
      { nomenclature: 'Test Item 1 - Switches', quantity: 5 },
      { nomenclature: 'Test Item 2 - Cables', quantity: 10 },
      { nomenclature: 'Test Item 3 - Adapters', quantity: 3 }
    ];
    
    const itemIds = [];
    for (const item of testItems) {
      const itemResult = await pool.request()
        .input('requestId', sql.UniqueIdentifier, testRequestId)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('quantity', sql.Int, item.quantity)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, nomenclature, requested_quantity, created_at
          )
          OUTPUT INSERTED.id
          VALUES (NEWID(), @requestId, @nomenclature, @quantity, GETDATE())
        `);
      
      itemIds.push(itemResult.recordset[0].id);
      }
    // ============================================================
    // STEP 4: SUBMIT FOR APPROVAL
    // ============================================================
    // Get or create the stock issuance workflow
    let workflowId;
    const workflowResult = await pool.request().query(`
      SELECT TOP 1 id FROM approval_workflows 
      WHERE request_type = 'stock_issuance'
    `);
    
    if (workflowResult.recordset.length > 0) {
      workflowId = workflowResult.recordset[0].id;
    } else {
      const createWfResult = await pool.request()
        .input('name', sql.NVarChar, 'Stock Issuance Approval')
        .input('requestType', sql.NVarChar, 'stock_issuance')
        .query(`
          INSERT INTO approval_workflows (id, name, request_type, created_at)
          OUTPUT INSERTED.id
          VALUES (NEWID(), @name, @requestType, GETDATE())
        `);
      workflowId = createWfResult.recordset[0].id;
    }
    
    // Get or create first approver
    let firstApproverId;
    const approverResult = await pool.request()
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .query(`
        SELECT TOP 1 user_id FROM workflow_approvers 
        WHERE workflow_id = @workflowId AND can_approve = 1
      `);
    
    if (approverResult.recordset.length > 0) {
      firstApproverId = approverResult.recordset[0].user_id;
    } else {
      // Get a random user to be the approver
      const approverUserResult = await pool.request().query(`
        SELECT TOP 1 Id FROM AspNetUsers 
        WHERE Id IS NOT NULL AND FullName IS NOT NULL
        AND Id != @userId
      `.replace('@userId', `'${testUserId}'`));
      
      if (approverUserResult.recordset.length === 0) {
        console.error('❌ No approvers available');
        return;
      }
      
      firstApproverId = approverUserResult.recordset[0].Id;
      
      // Add as approver
      await pool.request()
        .input('workflowId', sql.UniqueIdentifier, workflowId)
        .input('userId', sql.NVarChar, firstApproverId)
        .query(`
          INSERT INTO workflow_approvers (workflow_id, user_id, can_approve, added_date)
          VALUES (@workflowId, @userId, 1, GETDATE())
        `);
    }
    
    // Create approval record
    const approvalResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, testRequestId)
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .input('approverId', sql.NVarChar, firstApproverId)
      .input('submittedBy', sql.UniqueIdentifier, testUserId)
      .query(`
        INSERT INTO request_approvals (
          request_id, request_type, workflow_id, current_approver_id, 
          current_status, submitted_by
        )
        OUTPUT INSERTED.id
        VALUES (
          @requestId, 'stock_issuance', @workflowId, @approverId,
          'pending', @submittedBy
        )
      `);
    
    const approvalId = approvalResult.recordset[0].id;
    // ============================================================
    // STEP 5: POPULATE APPROVAL_ITEMS (THIS IS THE FIX!)
    // ============================================================
    // Get items for this request
    const itemsToApproveResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, testRequestId)
      .query(`
        SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);
    
    for (const item of itemsToApproveResult.recordset) {
      try {
        await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id)
          .input('nomenclature', sql.NVarChar, item.nomenclature)
          .input('customItemName', sql.NVarChar, item.custom_item_name)
          .input('requestedQuantity', sql.Int, item.requested_quantity)
          .query(`
            INSERT INTO approval_items (
              request_approval_id, item_master_id, nomenclature,
              custom_item_name, requested_quantity
            )
            VALUES (
              @approvalId, @itemMasterId, @nomenclature,
              @customItemName, @requestedQuantity
            )
          `);
        } catch (err) {
        console.error(`   ❌ Failed to add ${item.nomenclature}:`, err.message);
      }
    }
    
    // ============================================================
    // STEP 6: VERIFY APPROVAL_ITEMS WERE CREATED
    // ============================================================
    const verifyResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type, rejection_reason
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);
    
    verifyResult.recordset.forEach((item, idx) => {
      });
    
    // ============================================================
    // STEP 7: SIMULATE SUPERVISOR APPROVAL (with mixed decisions)
    // ============================================================
    // Get the approval items again
    const itemsForDecision = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature FROM approval_items
        WHERE request_approval_id = @approvalId
      `);
    
    // Make different decisions for each item
    const decisions = [
      { itemId: itemsForDecision.recordset[0].id, decision: 'APPROVE_FROM_STOCK', quantity: 5 },
      { itemId: itemsForDecision.recordset[1].id, decision: 'RETURN', quantity: 0 },
      { itemId: itemsForDecision.recordset[2].id, decision: 'APPROVE_FROM_STOCK', quantity: 3 }
    ];
    
    for (const decision of decisions) {
      try {
        await pool.request()
          .input('itemId', sql.UniqueIdentifier, decision.itemId)
          .input('decisionType', sql.NVarChar, decision.decision)
          .input('allocatedQty', sql.Int, decision.quantity)
          .input('reason', sql.NVarChar, decision.decision === 'RETURN' ? 'Request returned to requester for editing' : null)
          .query(`
            UPDATE approval_items
            SET decision_type = @decisionType,
                allocated_quantity = @allocatedQty,
                rejection_reason = @reason,
                updated_at = GETDATE()
            WHERE id = @itemId
          `);
        } catch (err) {
        console.error(`   ❌ Failed to update:`, err.message);
      }
    }
    
    // ============================================================
    // STEP 8: VERIFY DECISIONS WERE SAVED
    // ============================================================
    const decisionsResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT nomenclature, decision_type, allocated_quantity, rejection_reason
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);
    
    decisionsResult.recordset.forEach((item, idx) => {
      const status = item.decision_type === 'RETURN' ? '↩ RETURNED' : '✅ APPROVED';
      if (item.decision_type === 'RETURN') {
        }
    });
    
    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await pool.close();
  }
}

cleanupAndTest();
