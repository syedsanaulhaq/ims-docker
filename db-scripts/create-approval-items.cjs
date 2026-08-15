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

async function createApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';
    const approvalId = '2107FA18-C511-483D-A1D8-7F7B030C7AC3';

    // Get all stock issuance items for this request
    const stockItemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, nomenclature, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    if (stockItemsResult.recordset.length === 0) {
      return;
    }

    // Create approval_items for each stock item
    let createdCount = 0;
    for (const item of stockItemsResult.recordset) {
      await pool.request()
        .input('approvalId', sql.UniqueIdentifier, approvalId)
        .input('itemMasterId', sql.UniqueIdentifier, item.id)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('quantity', sql.Int, item.requested_quantity)
        .query(`
          DECLARE @id UNIQUEIDENTIFIER = NEWID();
          INSERT INTO approval_items 
          (id, request_approval_id, item_master_id, nomenclature, requested_quantity, decision_type)
          VALUES (@id, @approvalId, @itemMasterId, @nomenclature, @quantity, NULL);
        `);
      
      createdCount++;
      }

    } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

createApprovalItems();
