const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  server: process.env.SQL_SERVER_HOST,
  pool: { max: 10 },
  options: { encrypt: false, trustServerCertificate: true }
};

const approverUserId = '869dd81b-a782-494d-b8c2-695369b5ebb6'; // Syed Sana ul Haq Fazli
const requesterUserId = 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p'; // Test requester

async function runTest() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    // 1. Create a stock issuance request
    const { recordset: requestRecordset } = await pool.request()
      .input('requester_user_id', sql.NVarChar(450), requesterUserId)
      .query(`
        DECLARE @requestId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO stock_issuance_requests (id, requester_user_id, request_type, justification, purpose, created_at, submitted_at)
        VALUES (@requestId, @requester_user_id, 'stock_issuance', 'Testing multi-decision approval', 'Test request with 3 items - 1 approve, 1 reject, 1 return', GETDATE(), GETDATE());
        SELECT @requestId as request_id;
      `);

    const requestId = requestRecordset[0].request_id;
    // 2. Get first 3 items from item_masters
    const { recordset: itemsRecordset } = await pool.request()
      .query(`SELECT TOP 3 id, nomenclature FROM item_masters ORDER BY nomenclature`);

    if (itemsRecordset.length < 3) {
      console.error('❌ Need at least 3 items in item_masters');
      return;
    }

    // 3. Create stock issuance items
    const itemIds = [];
    for (let i = 0; i < 3; i++) {
      const itemMasterId = itemsRecordset[i].id;
      const itemName = itemsRecordset[i].nomenclature;

      const { recordset: itemResultset } = await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .input('item_master_id', sql.UniqueIdentifier, itemMasterId)
        .input('requested_quantity', sql.Int, 10)
        .input('approved_quantity', sql.Int, 10)
        .input('nomenclature', sql.NVarChar, itemName)
        .query(`
          DECLARE @siItemId UNIQUEIDENTIFIER = NEWID();
          INSERT INTO stock_issuance_items 
          (id, request_id, item_master_id, requested_quantity, approved_quantity, nomenclature, item_type)
          VALUES (@siItemId, @request_id, @item_master_id, @requested_quantity, @approved_quantity, @nomenclature, 'standard');
          SELECT @siItemId as item_id;
        `);

      const siItemId = itemResultset[0].item_id;
      itemIds.push({ id: siItemId, name: itemName, masterId: itemMasterId });
      }

    // 4. Create approval record
    const { recordset: approvalRecordset } = await pool.request()
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('submitted_by', sql.NVarChar(450), requesterUserId)
      .input('current_approver_id', sql.NVarChar(450), approverUserId)
      .query(`
        DECLARE @approvalId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO request_approvals 
        (id, request_id, request_type, submitted_by, current_approver_id, current_status, submitted_date, updated_date)
        VALUES (@approvalId, @request_id, 'stock_issuance', @submitted_by, @current_approver_id, 'returned', GETDATE(), GETDATE());
        SELECT @approvalId as approval_id;
      `);

    const approvalId = approvalRecordset[0].approval_id;
    // 5. Mark items with different decisions
    const decisions = [
      { itemId: itemIds[0].id, decision: 'APPROVE_FROM_STOCK', name: itemIds[0].name },
      { itemId: itemIds[1].id, decision: 'REJECT', name: itemIds[1].name },
      { itemId: itemIds[2].id, decision: 'RETURN', name: itemIds[2].name }
    ];

    for (const decision of decisions) {
      await pool.request()
        .input('item_id', sql.UniqueIdentifier, decision.itemId)
        .input('decision_type', sql.NVarChar, decision.decision)
        .query(`
          UPDATE stock_issuance_items 
          SET decision_type = @decision_type 
          WHERE id = @item_id
        `);
      }

    // 6. Create approval_items records with item details
    for (let i = 0; i < itemIds.length; i++) {
      const decision = decisions[i];

      const { recordset: itemRecordset } = await pool.request()
        .input('request_approval_id', sql.UniqueIdentifier, approvalId)
        .input('stock_issuance_item_id', sql.UniqueIdentifier, decision.itemId)
        .input('item_name', sql.NVarChar, decision.name)
        .input('decision_type', sql.NVarChar, decision.decision)
        .query(`
          DECLARE @id UNIQUEIDENTIFIER = NEWID();
          INSERT INTO approval_items 
          (id, request_approval_id, stock_issuance_item_id, item_name, decision_type)
          VALUES (@id, @request_approval_id, @stock_issuance_item_id, @item_name, @decision_type);
          SELECT @id as approval_item_id;
        `);
      const approvalItemId = itemRecordset[0].approval_item_id;
      }

    } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await pool.close();
  }
}

runTest();
