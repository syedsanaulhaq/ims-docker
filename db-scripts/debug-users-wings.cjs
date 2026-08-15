const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  server: process.env.SQL_SERVER_HOST,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.SQL_SERVER_USER,
      password: process.env.SQL_SERVER_PASSWORD
    }
  },
  options: {
    database: process.env.SQL_SERVER_DATABASE,
    trustServerCertificate: true,
    encrypt: false,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function checkUsersAndWings() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check both users and their wings
    const userResult = await pool.request().query(`
      SELECT 
        u.Id,
        u.FullName,
        u.intWingID,
        w.Name as WingName
      FROM AspNetUsers u
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE u.FullName IN ('Asad ur Rehman', 'Muhammad Ehtesham Siddiqui')
    `);
    
    userResult.recordset.forEach(u => {
      });

    // Check if all organizational requests from wing 19 appear
    const reqResult = await pool.request().query(`
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        u.FullName,
        u.intWingID,
        w.Name as WingName,
        sir.submitted_at
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE u.intWingID = 19
      AND sir.request_type = 'Organizational'
      ORDER BY sir.submitted_at DESC
    `);
    
    reqResult.recordset.forEach(r => {
      });

    // Specifically check the request in question
    const specificResult = await pool.request().query(`
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        u.FullName,
        u.intWingID,
        w.Name as WingName
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE sir.id = '74536345-1888-4524-B422-133B85FC6708'
    `);
    
    if (specificResult.recordset.length > 0) {
      const r = specificResult.recordset[0];
      } else {
      }
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkUsersAndWings();
