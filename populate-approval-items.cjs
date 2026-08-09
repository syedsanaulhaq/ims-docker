const sql = require('mssql');

const config = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function fixApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = '0DC79EAB-02F8-41AA-BF10-F1944567070A';

    // Get the approval record
    const approvalCheck = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`SELECT id FROM request_approvals WHERE request_id = @requestId`);

    if (approvalCheck.recordset.length === 0) {
      return;
    }

    const approvalId = approvalCheck.recordset[0].id;
    // Get items
    const items = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity, unit_price FROM stock_issuance_items WHERE request_id = @requestId`);

    for (const item of items.recordset) {
      await pool.request()
        .input('approvalId', sql.UniqueIdentifier, approvalId)
        .input('itemId', sql.UniqueIdentifier, item.id)
        .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('customItemName', sql.NVarChar, item.custom_item_name || '')
        .input('requestedQuantity', sql.Int, item.requested_quantity)
        .query(`
          INSERT INTO approval_items (request_approval_id, id, item_master_id, nomenclature, custom_item_name, requested_quantity, decision_type)
          VALUES (@approvalId, @itemId, @itemMasterId, @nomenclature, @customItemName, @requestedQuantity, 'PENDING')
        `);

      }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

fixApprovalItems();
