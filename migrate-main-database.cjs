const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',  // Main database
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function addNomenclatureColumn() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // Check if column already exists
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory_verification_requests' 
      AND COLUMN_NAME = 'item_nomenclature'
    `);

    if (checkResult.recordset[0].count > 0) {
      } else {
      await pool.request().query(`
        ALTER TABLE inventory_verification_requests
        ADD item_nomenclature NVARCHAR(500) NULL;
      `);
      
      }

    // Now update the view
    // Drop existing view if it exists
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications')
      BEGIN
        DROP VIEW dbo.View_Pending_Inventory_Verifications;
      END
    `);

    // Recreate the view
    await pool.request().query(`
      CREATE VIEW dbo.View_Pending_Inventory_Verifications AS
      SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ISNULL(ivr.item_nomenclature, 'Unknown Item') AS item_nomenclature,
          ivr.requested_quantity,
          ivr.requested_by_name,
          ivr.requested_by_user_id,
          ivr.requested_at,
          ivr.verification_status,
          CASE 
              WHEN ivr.verification_status LIKE 'verified%' THEN 'verified'
              ELSE 'pending'
          END AS status,
          ivr.verified_by_user_id,
          ivr.verified_by_name,
          ivr.verified_at,
          ivr.physical_count,
          ivr.available_quantity,
          ivr.verification_notes,
          ivr.wing_id,
          ivr.wing_name,
          ivr.created_at,
          ivr.updated_at
      FROM dbo.inventory_verification_requests ivr;
    `);

    // Test the view
    const testResult = await pool.request().query(`
      SELECT TOP 5 
        id,
        item_nomenclature,
        requested_by_name,
        verification_status,
        created_at
      FROM View_Pending_Inventory_Verifications
      ORDER BY created_at DESC
    `);

    if (testResult.recordset.length > 0) {
      testResult.recordset.forEach((row, idx) => {
        });
    }

    await pool.close();
    } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

addNomenclatureColumn();
