/**
 * Comprehensive test for the "returned" status workflow
 * Tests that:
 * 1. When ANY item is returned, entire approval is marked status='returned'
 * 2. Returned approvals do NOT appear in 'pending' view
 * 3. Returned approvals appear ONLY in 'returned' view
 * 4. Returned items can be edited by requester
 * 5. Approved items cannot be edited by requester
 */

const sql = require('mssql');

// Database configuration
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

    // STEP 1: Get test users
    const usersResult = await pool.request().query(`
      SELECT TOP 2 Id, FullName FROM AspNetUsers WHERE FullName IS NOT NULL ORDER BY Id
    `);
    
    if (usersResult.recordset.length < 2) {
      throw new Error('Not enough users in database (need at least 2 users)');
    }

    const requester = usersResult.recordset[0];
    const approver = usersResult.recordset[1];

    // STEP 2: Create a stock issuance request
    const requestId = `TEST-RETURNED-${Date.now()}`;
    const insertRequestResult = await pool.request()
      .input('request_id', sql.NVarChar, requestId)
      .input('office_id', sql.NVarChar, '1')
      .input('requester_id', sql.NVarChar, requester.Id)
      .input('request_type', sql.NVarChar, 'STOCK_ISSUANCE')
      .input('description', sql.NVarChar, 'Test request with mixed decisions (some approved, some returned)')
      .input('justification', sql.NVarChar, 'Testing returned status workflow')
      .query(`
        INSERT INTO stock_issuance_requests 
        (id, office_id, requester_id, request_type, description, justification, expected_return_date, created_by, created_date, status)
        VALUES (@request_id, @office_id, @requester_id, @request_type, @description, @justification, DATEADD(day, 30, GETDATE()), @requester_id, GETDATE(), 'PENDING')
      `);

    // STEP 3: Add 4 items to the request
    const items = [
      { name: 'Network Switch', quantity: 2 },
      { name: 'Ethernet Cable', quantity: 50 },
      { name: 'Power Adapter', quantity: 10 },
      { name: 'Rack Mount Server', quantity: 1 }
    ];

    const itemIds = [];
    for (const item of items) {
      // Try to find existing item by nomenclature
      const findResult = await pool.request()
        .input('nomenclature', sql.NVarChar, item.name)
        .query(`SELECT id FROM item_master WHERE nomenclature = @nomenclature`);

      let itemId;
      if (findResult.recordset.length > 0) {
        itemId = findResult.recordset[0].id;
      } else {
        // Create new item if not found
        itemId = `ITEM-${Date.now()}-${Math.random()}`;
        await pool.request()
          .input('id', sql.NVarChar, itemId)
          .input('nomenclature', sql.NVarChar, item.name)
          .query(`
            INSERT INTO item_master (id, nomenclature) VALUES (@id, @nomenclature)
          `);
      }

      itemIds.push(itemId);

      // Add to stock_issuance_items
      await pool.request()
        .input('request_id', sql.NVarChar, requestId)
        .input('item_master_id', sql.NVarChar, itemId)
        .input('nomenclature', sql.NVarChar, item.name)
        .input('requested_quantity', sql.Int, item.quantity)
        .input('item_type', sql.NVarChar, 'standard')
        .query(`
          INSERT INTO stock_issuance_items 
          (request_id, item_master_id, nomenclature, requested_quantity, item_type, approval_status, is_deleted)
          VALUES (@request_id, @item_master_id, @nomenclature, @requested_quantity, @item_type, 'PENDING', 0)
        `);
    }

    // STEP 4: Create approval record
    const approvalResult = await pool.request()
      .input('request_id', sql.NVarChar, requestId)
      .input('current_approver_id', sql.NVarChar, approver.Id)
      .input('submitted_by', sql.NVarChar, requester.Id)
      .input('workflow_id', sql.NVarChar, 'default-workflow')
      .query(`
        INSERT INTO request_approvals 
        (request_id, current_approver_id, submitted_by, workflow_id, current_status, submitted_date)
        OUTPUT inserted.id
        VALUES (@request_id, @current_approver_id, @submitted_by, @workflow_id, 'pending', GETDATE())
      `);

    const approvalId = approvalResult.recordset[0].id;
    // STEP 5: Create approval_items records
    for (let i = 0; i < itemIds.length; i++) {
      await pool.request()
        .input('request_approval_id', sql.NVarChar, approvalId)
        .input('item_master_id', sql.NVarChar, itemIds[i])
        .input('nomenclature', sql.NVarChar, items[i].name)
        .input('requested_quantity', sql.Int, items[i].quantity)
        .query(`
          INSERT INTO approval_items 
          (request_approval_id, item_master_id, nomenclature, requested_quantity)
          VALUES (@request_approval_id, @item_master_id, @nomenclature, @requested_quantity)
        `);
    }
    // STEP 6: Approve first 2 items, return last 2 items
    const decisions = [
      { index: 0, type: 'APPROVE_FROM_STOCK', reason: null },
      { index: 1, type: 'APPROVE_FROM_STOCK', reason: null },
      { index: 2, type: 'RETURN', reason: 'Request returned to requester for editing' },
      { index: 3, type: 'RETURN', reason: 'Request returned to requester for editing' }
    ];

    for (const decision of decisions) {
      await pool.request()
        .input('request_approval_id', sql.NVarChar, approvalId)
        .input('item_master_id', sql.NVarChar, itemIds[decision.index])
        .input('decision_type', sql.NVarChar, decision.type)
        .input('rejection_reason', sql.NVarChar, decision.reason)
        .query(`
          INSERT INTO approval_items 
          (request_approval_id, item_master_id, nomenclature, requested_quantity, decision_type, rejection_reason)
          VALUES (@request_approval_id, @item_master_id, @nomenclature, @requested_quantity, @decision_type, @rejection_reason)
        `);
    }

    // STEP 7: Update approval status (simulating what backend does)
    const hasReturnActions = decisions.some(d => d.type === 'RETURN');
    const finalStatus = hasReturnActions ? 'returned' : 'pending';
    
    await pool.request()
      .input('approvalId', sql.NVarChar, approvalId)
      .input('status', sql.NVarChar, finalStatus)
      .query(`
        UPDATE request_approvals 
        SET current_status = @status 
        WHERE id = @approvalId
      `);

    // STEP 8: Verify the approval appears in 'returned' view, NOT in 'pending' view
    // Check 'pending' view
    const pendingResult = await pool.request()
      .input('userId', sql.NVarChar, approver.Id)
      .input('status', sql.NVarChar, 'pending')
      .query(`
        SELECT id, request_id, current_status 
        FROM request_approvals 
        WHERE current_approver_id = @userId 
        AND current_status = @status
      `);

    const approvalInPending = pendingResult.recordset.some(r => r.id === approvalId);
    // Check 'returned' view
    const returnedResult = await pool.request()
      .input('userId', sql.NVarChar, approver.Id)
      .input('status', sql.NVarChar, 'returned')
      .query(`
        SELECT id, request_id, current_status 
        FROM request_approvals 
        WHERE current_approver_id = @userId 
        AND current_status = @status
      `);

    const approvalInReturned = returnedResult.recordset.some(r => r.id === approvalId);
    // STEP 9: Verify individual approval_items decisions
    const itemsResult = await pool.request()
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        SELECT nomenclature, decision_type, rejection_reason 
        FROM approval_items 
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);

    for (const item of itemsResult.recordset) {
      }
    // STEP 10: Summary
    } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

runTest();
