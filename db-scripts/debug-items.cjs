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

async function checkItems() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check if items exist for our request
    const requestId = '74536345-1888-4524-B422-133B85FC6708';
    
    const itemsResult = await pool.request().query(`
      SELECT 
        id,
        request_id,
        item_master_id,
        custom_item_name,
        requested_quantity,
        approved_quantity,
        item_type,
        created_at
      FROM stock_issuance_items
      WHERE request_id = '${requestId}'
    `);
    
    itemsResult.recordset.forEach(item => {
      });

    // Check item_masters table structure and data
    const columnResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'item_masters'
      ORDER BY ORDINAL_POSITION
    `);
    
    columnResult.recordset.forEach(col => {
      });

    // Check if the item_master_id references exist
    if (itemsResult.recordset.length > 0) {
      const itemMasterIds = itemsResult.recordset
        .map(i => i.item_master_id)
        .filter(id => id != null);
      
      if (itemMasterIds.length > 0) {
        const masterResult = await pool.request().query(`
          SELECT 
            id,
            nomenclature,
            item_code,
            unit
          FROM item_masters
          WHERE id IN (${itemMasterIds.map(id => `'${id}'`).join(',')})
        `);
        
        masterResult.recordset.forEach(im => {
          });
      }
    }

    // Test the actual backend query
    const backendQueryResult = await pool.request().query(`
      SELECT 
        si_items.item_master_id as item_id,
        CASE 
          WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
          ELSE COALESCE(im.nomenclature, 'Unknown Item')
        END as item_name,
        si_items.requested_quantity,
        si_items.approved_quantity,
        COALESCE(im.unit, 'units') as unit,
        si_items.item_type
      FROM stock_issuance_items si_items
      LEFT JOIN item_masters im ON im.id = si_items.item_master_id
      WHERE si_items.request_id = '${requestId}'
      ORDER BY 
        CASE 
          WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
          ELSE im.nomenclature
        END
    `);
    
    backendQueryResult.recordset.forEach(item => {
      });
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  }
}

checkItems();
