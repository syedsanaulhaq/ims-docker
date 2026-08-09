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

async function findDesignationTables() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Find all tables with 'designation' in name
    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%designation%' OR TABLE_NAME LIKE '%Designation%'
      ORDER BY TABLE_NAME
    `);

    if (result.recordset.length === 0) {
      } else {
      result.recordset.forEach(row => {
        });
    }

    // Get designation data for the user
    const userResult = await pool.request().query(`
      SELECT TOP 5
        u.Id,
        u.UserName,
        u.FullName,
        u.intDesignationID
      FROM AspNetUsers u
      WHERE u.FullName LIKE '%Muhammad%'
    `);

    userResult.recordset.forEach(row => {
      });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

findDesignationTables();
