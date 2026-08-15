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
    // Get records with NULL nomenclature and their stock issuance nomenclature
    const nullRecords = await pool
      .request()
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          sii.nomenclature
        FROM inventory_verification_requests ivr
        LEFT JOIN stock_issuance_items sii ON ivr.stock_issuance_id = sii.request_id
        WHERE ivr.item_nomenclature IS NULL
        ORDER BY ivr.id
      `);

    let updated = 0;
    let failed = 0;

    // Update each record
    for (const record of nullRecords.recordset) {
      if (record.nomenclature) {
        try {
          await pool
            .request()
            .input("id", sql.Int, record.id)
            .input("nomenclature", sql.NVarChar(500), record.nomenclature)
            .query(
              `UPDATE inventory_verification_requests 
               SET item_nomenclature = @nomenclature
               WHERE id = @id`
            );
          updated++;
        } catch (error) {
          failed++;
        }
      } else {
        failed++;
      }
    }

    // Verify final state
    const finalResult = await pool
      .request()
      .query(
        `SELECT id, item_master_id, item_nomenclature, verification_status 
         FROM inventory_verification_requests 
         ORDER BY id`
      );

    finalResult.recordset.forEach((row) => {
      });

    } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
