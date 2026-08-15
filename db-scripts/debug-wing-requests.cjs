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

async function debugWingRequests() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Query 1: All stock_issuance_requests
    const reqResult = await pool.request().query(`
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        sir.requester_wing_id,
        sir.justification,
        sir.submitted_at,
        sir.created_at,
        u.FullName,
        u.intWingID,
        w.Name as WingName
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      ORDER BY sir.created_at DESC
    `);
    
    reqResult.recordset.forEach(r => {
      });

    // Query 2: Check request_approvals
    const approvalResult = await pool.request().query(`
      SELECT 
        ra.id,
        ra.request_id,
        ra.request_type,
        ra.current_status,
        ra.submitted_date
      FROM request_approvals ra
      ORDER BY ra.submitted_date DESC
    `);
    
    approvalResult.recordset.forEach(a => {
      });

    // Query 3: Check stock_issuance_items
    const itemResult = await pool.request().query(`
      SELECT 
        sii.id,
        sii.request_id,
        sii.item_master_id,
        sii.requested_quantity
      FROM stock_issuance_items sii
      ORDER BY sii.created_at DESC
    `);
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

debugWingRequests();
