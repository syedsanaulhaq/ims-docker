const sql = require('mssql');

async function addOrganizationalColumns() {
  try {
    const pool = await sql.connect({
      server: 'DESKTOP-9AOS93U\\SQLEXPRESS',
      database: 'InventoryManagementSystem',
      options: { 
        encrypt: false, 
        trustServerCertificate: true,
        enableArithAbort: true 
      },
      authentication: {
        type: 'ntlm',
        options: {
          domain: '',
          userName: 'SYED FAROOQ ALI',
          password: ''
        }
      }
    });
    
    // Check if columns exist and add them if they don't
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tenders' 
      AND COLUMN_NAME IN ('office_ids', 'wing_ids', 'dec_ids')
    `);
    
    const existingColumns = checkColumns.recordset.map(row => row.COLUMN_NAME);
    // Add office_ids if it doesn't exist
    if (!existingColumns.includes('office_ids')) {
      await pool.request().query('ALTER TABLE tenders ADD office_ids NVARCHAR(500) NULL');
      } else {
      }
    
    // Add wing_ids if it doesn't exist  
    if (!existingColumns.includes('wing_ids')) {
      await pool.request().query('ALTER TABLE tenders ADD wing_ids NVARCHAR(500) NULL');
      } else {
      }
    
    // Add dec_ids if it doesn't exist
    if (!existingColumns.includes('dec_ids')) {
      await pool.request().query('ALTER TABLE tenders ADD dec_ids NVARCHAR(500) NULL');
      } else {
      }
    
    // Migrate existing data
    await pool.request().query(`
      UPDATE tenders 
      SET 
        office_ids = CASE WHEN office_id IS NOT NULL AND office_id != '' THEN office_id ELSE NULL END,
        wing_ids = CASE WHEN wing_id IS NOT NULL AND wing_id != '' THEN wing_id ELSE NULL END,
        dec_ids = CASE WHEN dec_id IS NOT NULL AND dec_id != '' THEN dec_id ELSE NULL END
      WHERE office_ids IS NULL OR wing_ids IS NULL OR dec_ids IS NULL
    `);
    
    // Show final column structure
    const finalCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tenders' 
      AND (COLUMN_NAME LIKE '%office%' OR COLUMN_NAME LIKE '%wing%' OR COLUMN_NAME LIKE '%dec%') 
      ORDER BY COLUMN_NAME
    `);
    
    console.table(finalCheck.recordset);
    
    await pool.close();
    } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addOrganizationalColumns();
