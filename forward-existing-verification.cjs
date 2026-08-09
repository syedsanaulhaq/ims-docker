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

async function forwardExistingVerification() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // The store keeper in wing 19
    const storeKeeperId = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
    const storeKeeperName = '3740506012171';

    // Update the existing verification to forward it to the store keeper
    const result = await pool.request()
      .input('storeKeeperId', sql.NVarChar, storeKeeperId)
      .input('storeKeeperName', sql.NVarChar, storeKeeperName)
      .query(`
        UPDATE inventory_verification_requests
        SET 
          forwarded_to_user_id = @storeKeeperId,
          forwarded_to_name = @storeKeeperName,
          forwarded_at = GETDATE(),
          updated_at = GETDATE()
        WHERE item_nomenclature = 'SAN Switches'
      `);

    // Show the updated verification
    const checkResult = await pool.request().query(`
      SELECT TOP 1
        item_nomenclature,
        forwarded_to_user_id,
        forwarded_to_name,
        forwarded_at,
        verification_status
      FROM inventory_verification_requests
      WHERE item_nomenclature = 'SAN Switches'
      ORDER BY created_at DESC
    `);

    if (checkResult.recordset.length > 0) {
      const ver = checkResult.recordset[0];
      }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

forwardExistingVerification();
