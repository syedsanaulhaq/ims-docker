const sql = require("mssql");
const fs = require("fs");
const path = require("path");

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

async function runMigration() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Read the SQL migration script
    let sqlScript = fs.readFileSync(
      path.join(__dirname, 'add-verification-forwarding-columns.sql'),
      'utf8'
    );

    // Split by GO and execute each batch separately
    const batches = sqlScript
      .split(/GO\s*\n/gi)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (let i = 0; i < batches.length; i++) {
      try {
        await pool.request().batch(batches[i]);
      } catch (error) {
        // Some errors might be non-critical (like "already exists"), continue
        if (error.message.includes('already exists') || error.message.includes('not found')) {
          } else {
          throw error;
        }
      }
    }
    
    } catch (error) {
    console.error("❌ Error running migration:", error);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

runMigration();
