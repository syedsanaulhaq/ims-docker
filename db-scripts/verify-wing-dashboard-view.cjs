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

async function main() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Query the view that wing-dashboard uses
    const viewResult = await pool
      .request()
      .query(`SELECT * FROM View_Pending_Inventory_Verifications`);

    if (viewResult.recordset.length === 0) {
      } else {
      viewResult.recordset.forEach((row) => {
        });
    }

    } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
