const sql = require('mssql');
const bcrypt = require('bcryptjs');

// PRODUCTION DATABASE CONFIGURATION
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

async function updateAllUsersPasswords() {
  try {
    await sql.connect(config);
    // Default password for all users
    const defaultPassword = 'P@ssword@1';
    
    // Get all active users
    const usersResult = await sql.query`
      SELECT 
        Id,
        UserName,
        FullName,
        Password,
        PasswordHash,
        ISACT
      FROM AspNetUsers
      WHERE ISACT = 1
      ORDER BY UserName
    `;
    
    const users = usersResult.recordset;
    if (users.length === 0) {
      return;
    }

    // Generate bcrypt hash once (same for all users)
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${users.length}]`;
      
      try {
        // Check if password is already in bcrypt format
        const currentHash = user.PasswordHash || user.Password;
        if (currentHash && currentHash.startsWith('$2b$')) {
          skipCount++;
          continue;
        }
        
        // Update both Password and PasswordHash fields
        const updateResult = await sql.query`
          UPDATE AspNetUsers
          SET 
            Password = ${hashedPassword},
            PasswordHash = ${hashedPassword}
          WHERE Id = ${user.Id}
        `;
        
        if (updateResult.rowsAffected[0] > 0) {
          successCount++;
        } else {
          errorCount++;
        }
        
      } catch (err) {
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      // Verify a few random users
      const sampleSize = Math.min(3, successCount);
      const updatedUsers = users.filter(u => {
        const hash = u.PasswordHash || u.Password;
        return !hash || !hash.startsWith('$2b$');
      }).slice(0, sampleSize);
      
      for (const user of updatedUsers) {
        const verifyResult = await sql.query`
          SELECT PasswordHash 
          FROM AspNetUsers 
          WHERE Id = ${user.Id}
        `;
        
        if (verifyResult.recordset.length > 0) {
          const newHash = verifyResult.recordset[0].PasswordHash;
          const isValid = await bcrypt.compare(defaultPassword, newHash);
          }
      }
    }
    
    } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('Login failed')) {
      }
  } finally {
    await sql.close();
  }
}

updateAllUsersPasswords();
