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

async function testFrontendLogic() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    const storeKeeperId = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
    
    // This is what the frontend fetches
    const result = await pool.request()
      .input('userId', sql.NVarChar, storeKeeperId)
      .query(`
        SELECT 
          id,
          item_nomenclature,
          requested_by_name,
          requested_quantity,
          verification_status,
          forwarded_at
        FROM inventory_verification_requests
        WHERE forwarded_to_user_id = @userId
        ORDER BY forwarded_at DESC
      `);

    const verifications = result.recordset;
    
    // Frontend logic - getPendingCount
    const pendingCount = verifications.filter(r => {
      const status = (r.verification_status || '').toLowerCase();
      return status === 'pending';
    }).length;
    
    // Frontend logic - getFilteredVerifications when no filter is set
    const filtered = verifications.filter(r => {
      const status = (r.verification_status || '').toLowerCase();
      return status === 'pending';
    });
    
    if (filtered.length > 0) {
      filtered.forEach((v, i) => {
        });
      } else {
      }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

testFrontendLogic();
