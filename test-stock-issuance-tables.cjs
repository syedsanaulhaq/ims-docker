const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Pakistan@786',
  server: '172.20.151.60\\MSSQLSERVER2',
  database: 'InventoryManagementDB',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function testStockIssuanceTables() {
  try {
    await sql.connect(config);
    // Test stock_issuance_requests table
    const requestsResult = await sql.query`SELECT COUNT(*) as count FROM stock_issuance_requests`;
    // Test stock_issuance_items table
    const itemsResult = await sql.query`SELECT COUNT(*) as count FROM stock_issuance_items`;
    // Test the full query from the endpoint
    const fullQuery = `
      SELECT TOP 1
        sir.id,
        sir.request_number,
        sir.request_status,
        COALESCE(o.strOfficeName, 'Unknown Office') as office_name,
        COALESCE(w.Name, 'Unknown Wing') as wing_name,
        COALESCE(u.FullName, 'Unknown User') as requester_full_name
      FROM stock_issuance_requests sir
      LEFT JOIN tblOffices o ON sir.requester_office_id = o.intOfficeID
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id  
      LEFT JOIN AspNetUsers u ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u.Id AS NVARCHAR(450))
    `;
    
    const fullResult = await sql.query(fullQuery);
    } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
  } finally {
    await sql.close();
  }
}

testStockIssuanceTables();
