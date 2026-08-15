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

async function cleanup() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Delete old verifications that don't have a forwarded_to_user_id
    const deleteResult = await pool.request().query(`
      DELETE FROM inventory_verification_requests
      WHERE forwarded_to_user_id IS NULL
    `);

    // Show remaining verifications
    const result = await pool.request().query(`
      SELECT TOP 10
        id,
        item_nomenclature,
        requested_by_name,
        forwarded_to_name,
        forwarded_at,
        verification_status,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    if (result.recordset.length > 0) {
      result.recordset.forEach((row, i) => {
        });
    } else {
      }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

cleanup();
