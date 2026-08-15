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

async function testWingHistoryQuery() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Simulate the backend query with Muhammad's wing ID (19)
    const userWingId = 19;
    
    const wingRequestsQuery = `
      SELECT 
        COALESCE(ra.id, sir.id) as id,
        sir.id as request_id,
        sir.request_type,
        COALESCE(ra.submitted_date, sir.submitted_at) as submitted_date,
        COALESCE(ra.current_status, sir.request_status) as current_status,
        COALESCE(ra.submitted_by, sir.requester_user_id) as submitted_by,
        ra.current_approver_id,
        u_requester.FullName as requester_name,
        u_current_approver.FullName as current_approver_name,
        d_approver.strDesignation as current_approver_designation,
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        COALESCE(item_counts.item_count, 0) as total_items,
        w.Name as requester_wing_name
      FROM stock_issuance_requests sir
      LEFT JOIN request_approvals ra ON ra.request_id = sir.id
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = COALESCE(ra.submitted_by, sir.requester_user_id)
      LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
      LEFT JOIN tblUserDesignations d_approver ON u_current_approver.intDesignationID = d_approver.intDesignationID
      LEFT JOIN WingsInformation w ON u_requester.intWingID = w.Id
      LEFT JOIN (
        SELECT request_id, COUNT(*) as item_count
        FROM stock_issuance_items 
        GROUP BY request_id
      ) item_counts ON item_counts.request_id = sir.id
      WHERE u_requester.intWingID IS NOT NULL 
      AND u_requester.intWingID = @wingId
      AND sir.request_type = 'Organizational'
      ORDER BY COALESCE(ra.submitted_date, sir.submitted_at) DESC`;
    
    const result = await pool.request()
      .input('wingId', sql.Int, userWingId)
      .query(wingRequestsQuery);
    
    result.recordset.forEach((r, idx) => {
      });
    
    // Check if the specific request is in there
    const targetId = '74536345-1888-4524-B422-133B85FC6708';
    const found = result.recordset.find(r => r.request_id === targetId);
    
    if (found) {
      } else {
      // Check if it matches the filters
      const debugQuery = `
        SELECT 
          sir.id,
          sir.request_type,
          sir.requester_user_id,
          u_requester.FullName,
          u_requester.intWingID,
          CASE WHEN u_requester.intWingID IS NOT NULL THEN 'YES' ELSE 'NO' END as HasWing,
          CASE WHEN u_requester.intWingID = 19 THEN 'YES' ELSE 'NO' END as Wing19,
          CASE WHEN sir.request_type = 'Organizational' THEN 'YES' ELSE 'NO' END as IsOrg
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = sir.requester_user_id
        WHERE sir.id = '${targetId}'
      `;
      
      const debugResult = await pool.request().query(debugQuery);
      if (debugResult.recordset.length > 0) {
        const d = debugResult.recordset[0];
        }
    }
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  }
}

testWingHistoryQuery();
