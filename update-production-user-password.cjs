const sql = require('mssql');
const bcrypt = require('bcryptjs');

// PRODUCTION DATABASE CONFIGURATION
// CORRECT CREDENTIALS - DO NOT CHANGE
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

async function updateProductionPassword() {
  try {
    await sql.connect(config);
    const username = '1730115698727';
    const newPassword = 'P@ssword@1';
    
    // Generate bcrypt hash (10 rounds)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Update BOTH Password and PasswordHash fields with bcrypt hash
    const result = await sql.query`
      UPDATE AspNetUsers
      SET 
        Password = ${hashedPassword},
        PasswordHash = ${hashedPassword}
      WHERE UserName = ${username}
    `;
    
    if (result.rowsAffected[0] === 0) {
      return;
    }
    
    // Verify the update
    const verifyResult = await sql.query`
      SELECT 
        UserName,
        FullName,
        Password,
        PasswordHash,
        ISACT
      FROM AspNetUsers
      WHERE UserName = ${username}
    `;
    
    if (verifyResult.recordset.length === 0) {
      return;
    }
    
    const user = verifyResult.recordset[0];
    // Test password verification
    const passwordToCheck = user.PasswordHash || user.Password;
    
    if (!passwordToCheck) {
      return;
    }
    
    const isValid = await bcrypt.compare(newPassword, passwordToCheck);
    if (isValid) {
      } else {
      }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('Login failed')) {
      }
  } finally {
    await sql.close();
  }
}

updateProductionPassword();
