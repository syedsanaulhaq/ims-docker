/**
 * Clear old test approvals and create fresh test data
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

async function clearAndCreate() {
  try {
    await pool.connect();

    // STEP 1: Delete old test approvals (keep last 2 days)
    const deleteApprovals = await pool.request().query(`
      DELETE FROM approval_items 
      WHERE request_approval_id IN (
        SELECT id FROM request_approvals 
        WHERE created_date < DATEADD(day, -2, GETDATE())
      )
    `);

    const deleteRequests = await pool.request().query(`
      DELETE FROM stock_issuance_items
      WHERE request_id IN (
        SELECT id FROM stock_issuance_requests
        WHERE created_at < DATEADD(day, -2, GETDATE())
      )
    `);

    const deleteRequestsMain = await pool.request().query(`
      DELETE FROM stock_issuance_requests
      WHERE created_at < DATEADD(day, -2, GETDATE())
    `);

    const deleteApprovalHistory = await pool.request().query(`
      DELETE FROM approval_history
      WHERE request_approval_id IN (
        SELECT id FROM request_approvals
        WHERE created_date < DATEADD(day, -2, GETDATE())
      )
    `);

    const deleteApprovalsMain = await pool.request().query(`
      DELETE FROM request_approvals
      WHERE created_date < DATEADD(day, -2, GETDATE())
    `);

    // STEP 2: Get test users
    const usersResult = await pool.request().query(`
      SELECT TOP 2 Id, FullName FROM AspNetUsers WHERE FullName IS NOT NULL ORDER BY Id
    `);

    const requester = usersResult.recordset[0];
    const approver = usersResult.recordset[1];

    // STEP 3: Create new request with 4 items
    const items = [
      { name: 'Dell Laptop', quantity: 2 },
      { name: 'Office Chair', quantity: 5 },
      { name: 'Monitor 24"', quantity: 3 },
      { name: 'Keyboard Mechanical', quantity: 10 }
    ];

    // Get a fresh UUID
    const requestIdResult = await pool.request().query(`SELECT NEWID() as newId`);
    const requestId = requestIdResult.recordset[0].newId;

    // Create request in stock_issuance_requests
    await pool.request()
      .input('id', sql.NVarChar, requestId)
      .input('requester_user_id', sql.NVarChar, requester.Id)
      .input('justification', sql.NVarChar, 'Test approval workflow - clear & fresh data')
      .query(`
        INSERT INTO stock_issuance_requests 
        (id, requester_user_id, justification, request_status, created_at, updated_at, is_returnable)
        VALUES (@id, @requester_user_id, @justification, 'PENDING', GETDATE(), GETDATE(), 1)
      `);

    // Add items to request
    for (const item of items) {
      const itemIdResult = await pool.request().query(`SELECT NEWID() as newId`);
      const itemId = itemIdResult.recordset[0].newId;
      
      await pool.request()
        .input('id', sql.NVarChar, itemId)
        .input('request_id', sql.NVarChar, requestId)
        .input('nomenclature', sql.NVarChar, item.name)
        .input('requested_quantity', sql.Int, item.quantity)
        .input('item_type', sql.NVarChar, 'standard')
        .query(`
          INSERT INTO stock_issuance_items 
          (id, request_id, nomenclature, requested_quantity, item_type)
          VALUES (@id, @request_id, @nomenclature, @requested_quantity, @item_type)
        `);
    }

    // STEP 4: Create approval record
    const approvalIdResult = await pool.request().query(`SELECT NEWID() as newId`);
    const approvalId = approvalIdResult.recordset[0].newId;
    
    const workflowIdResult = await pool.request().query(`SELECT NEWID() as newId`);
    const workflowId = workflowIdResult.recordset[0].newId;

    const insertApprovalResult = await pool.request()
      .input('id', sql.NVarChar(36), approvalId.toString())
      .input('request_id', sql.NVarChar(36), requestId.toString())
      .input('request_type', sql.NVarChar, 'STOCK_ISSUANCE')
      .input('current_approver_id', sql.NVarChar(450), approver.Id)
      .input('submitted_by', sql.NVarChar(450), requester.Id)
      .input('workflow_id', sql.NVarChar(36), workflowId.toString())
      .query(`
        INSERT INTO request_approvals 
        (id, request_id, request_type, current_approver_id, submitted_by, workflow_id, current_status, submitted_date, created_date, updated_date)
        VALUES (CAST(@id AS uniqueidentifier), CAST(@request_id AS uniqueidentifier), @request_type, @current_approver_id, @submitted_by, CAST(@workflow_id AS uniqueidentifier), 'pending', GETDATE(), GETDATE(), GETDATE())
      `);

    // STEP 5: Create approval_items
    for (const item of items) {
      await pool.request()
        .input('request_approval_id', sql.NVarChar, approvalId)
        .input('nomenclature', sql.NVarChar, item.name)
        .input('requested_quantity', sql.Int, item.quantity)
        .query(`
          INSERT INTO approval_items 
          (request_approval_id, nomenclature, requested_quantity)
          VALUES (@request_approval_id, @nomenclature, @requested_quantity)
        `);
    }

    // STEP 6: Summary
    for (const item of items) {
      }
    await pool.close();

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

clearAndCreate();
