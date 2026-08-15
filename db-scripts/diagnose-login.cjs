const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: { type: 'default' },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    // Check test users
    const testUsers = [
      '4dae06b7-17cd-480b-81eb-da9c76ad5728', // Muhammad Ehtesham Siddiqui
      '9a4d3aca-7a4f-4342-a431-267da1171244'  // Asad ur Rehman
    ];

    for (const userId of testUsers) {
      const result = await pool.request()
        .input('userId', sql.NVarChar(450), userId)
        .query(`
          SELECT 
            Id,
            FullName,
            Email,
            UserName,
            intWingID,
            EmailConfirmed
          FROM AspNetUsers
          WHERE Id = @userId
        `);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        } else {
        }
    }

    // Check AspNetUsers table
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM AspNetUsers
    `);
    // Check authentication tables
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('AspNetUsers', 'AspNetUserLogins', 'AspNetRoles', 'AspNetUserRoles')
    `;
    const tableResult = await pool.request().query(tablesQuery);
    pool.close();
    
    } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
