const sql = require("mssql");

const config = {
  server: "SYED-FAZLI-LAPT",
  database: "InventoryManagementDB",
  user: "inventorymanagementuser",
  password: "2016Wfp61@",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function testStoreKeeperQuery() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Store keeper ID
    const storeKeeperId = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
    
    // This is exactly what the backend endpoint does
    const result = await pool.request()
      .input('userId', sql.NVarChar, storeKeeperId)
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ivr.requested_by_user_id,
          ivr.requested_by_name,
          ivr.requested_at,
          ivr.requested_quantity,
          ivr.verification_status,
          ivr.item_nomenclature,
          ivr.forwarded_to_user_id,
          ivr.forwarded_to_name,
          ivr.forwarded_by_user_id,
          ivr.forwarded_by_name,
          ivr.forwarded_at,
          ivr.forward_notes,
          ivr.created_at,
          ivr.updated_at
        FROM inventory_verification_requests ivr
        WHERE ivr.forwarded_to_user_id = @userId
        ORDER BY ivr.forwarded_at DESC
      `);

    result.recordset.forEach((row, i) => {
      });

    if (result.recordset.length === 0) {
      }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

testStoreKeeperQuery();
