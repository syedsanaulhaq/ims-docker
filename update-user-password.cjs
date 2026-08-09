const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB_TEST',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function updateUserPassword() {
  try {
    await sql.connect(config);
    const username = '3740560772543';
    const password = 'P@ssword@1';
    
    // Generate bcrypt hash
    const hashedPassword = await bcrypt.hash(password, 10);
    // Update both Password and PasswordHash fields
    await sql.query`
      UPDATE AspNetUsers
      SET 
        Password = ${hashedPassword},
        PasswordHash = ${hashedPassword}
      WHERE UserName = ${username}
    `;
    
    // Verify the update
    const result = await sql.query`
      SELECT 
        UserName,
        FullName,
        Password,
        PasswordHash
      FROM AspNetUsers
      WHERE UserName = ${username}
    `;
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      // Test password verification
      const isValid = await bcrypt.compare(password, user.Password);
      if (isValid) {
        }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

updateUserPassword();
