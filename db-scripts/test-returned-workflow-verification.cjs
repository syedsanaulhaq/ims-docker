/**
 * Test the returned status workflow using the existing API endpoints
 * This is more realistic since it goes through the actual API layer
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3001/api';

async function makeRequest(method, path, data = null, sessionId = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionId ? `sid=${sessionId}` : ''
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest() {
  try {
    // STEP 1: Login as supervisor
    const dashboardResponse = await makeRequest('GET', '/approvals/my-pending');
    
    if (dashboardResponse.status !== 200) {
      }

    // STEP 2: Check if we have any approvals with items to verify the structure
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
    await pool.connect();

    // Check approval table schema
    const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'request_approvals'
      ORDER BY ORDINAL_POSITION
    `);

    for (const col of schemaResult.recordset) {
      }
    // STEP 3: Check for existing approvals with different statuses
    const statusCounts = await pool.request().query(`
      SELECT current_status, COUNT(*) as count
      FROM request_approvals
      GROUP BY current_status
      ORDER BY current_status
    `);

    for (const row of statusCounts.recordset) {
      }
    // STEP 4: Check an approval with 'returned' status
    const returnedApprovals = await pool.request().query(`
      SELECT TOP 1
        ra.id,
        ra.request_id,
        ra.current_status,
        ra.submitted_date,
        ra.current_approver_id,
        COUNT(ai.id) as item_count
      FROM request_approvals ra
      LEFT JOIN approval_items ai ON ai.request_approval_id = ra.id
      WHERE ra.current_status = 'returned'
      GROUP BY ra.id, ra.request_id, ra.current_status, ra.submitted_date, ra.current_approver_id
      ORDER BY ra.submitted_date DESC
    `);

    if (returnedApprovals.recordset.length > 0) {
      const approval = returnedApprovals.recordset[0];
      // Get details of items in this approval
      const itemsResult = await pool.request()
        .input('approvalId', sql.NVarChar, approval.id)
        .query(`
          SELECT nomenclature, decision_type, rejection_reason
          FROM approval_items
          WHERE request_approval_id = @approvalId
          ORDER BY nomenclature
        `);

      for (const item of itemsResult.recordset) {
        const status = item.decision_type || 'Pending';
        const reason = item.rejection_reason ? ` - ${item.rejection_reason}` : '';
        }
      // Verify the logic: if ANY item is returned, entire approval is 'returned'
      const hasReturnedItems = itemsResult.recordset.some(
        i => i.decision_type === 'RETURN' || 
             (i.decision_type === 'REJECT' && i.rejection_reason?.includes('returned'))
      );

      } else {
      }

    // STEP 6: Test the filtering logic
    // Get a user who is an approver
    const approverResult = await pool.request().query(`
      SELECT TOP 1 Id FROM AspNetUsers WHERE FullName IS NOT NULL ORDER BY Id
    `);

    if (approverResult.recordset.length > 0) {
      const approverId = approverResult.recordset[0].Id;

      // Count approvals by status for this user
      const filterTest = await pool.request()
        .input('userId', sql.NVarChar, approverId)
        .query(`
          SELECT current_status, COUNT(*) as count
          FROM request_approvals
          WHERE current_approver_id = @userId
          GROUP BY current_status
        `);

      for (const row of filterTest.recordset) {
        }
      // Test the WHERE clause filter
      const pendingCount = await pool.request()
        .input('userId', sql.NVarChar, approverId)
        .query(`
          SELECT COUNT(*) as count FROM request_approvals
          WHERE current_approver_id = @userId AND current_status = 'pending'
        `);
      const returnedCount = await pool.request()
        .input('userId', sql.NVarChar, approverId)
        .query(`
          SELECT COUNT(*) as count FROM request_approvals
          WHERE current_approver_id = @userId AND current_status = 'returned'
        `);
      }

    await pool.close();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
