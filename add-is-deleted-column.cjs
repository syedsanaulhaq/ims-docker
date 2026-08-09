const sql = require('mssql');

const config = {
  server: process.env.SQL_SERVER_HOST || 'SYED-FAZLI-LAPT',
  database: process.env.SQL_SERVER_DATABASE || 'InvMISDB',
  authentication: {
    type: 'ntlm',
    options: {
      domain: '',
      userName: '',
      password: ''
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

async function addIsDeletedColumn() {
  try {
    const pool = await sql.connect(config);
    
    // Check if column already exists
    const checkResult = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'is_deleted'
    `);
    
    if (checkResult.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE ItemMaster 
        ADD is_deleted BIT NOT NULL DEFAULT 0
      `);
      } else {
      }
    
    // Verify the column exists
    const verifyResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'is_deleted'
    `);
    
    if (verifyResult.recordset.length > 0) {
      }
    
    await pool.close();
    } catch (err) {
    console.error('❌ Error updating database schema:', err);
    process.exit(1);
  }
}

addIsDeletedColumn();