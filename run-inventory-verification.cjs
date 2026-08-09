// ============================================================================
// Inventory Verification Script
// Purpose: Run diagnostic queries to verify inventory updates
// Usage: node run-inventory-verification.cjs
// ============================================================================

const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const dbConfig = {
  server: process.env.SQL_SERVER_HOST,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true',
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function runVerification() {
  let pool;
  
  try {
    // Connect to database
    pool = await sql.connect(dbConfig);
    // Query 1: Current Inventory Stock Overview
    const inventoryResult = await pool.request().query(`
      SELECT TOP 20
          cis.id,
          cis.item_master_id,
          im.nomenclature,
          im.item_code,
          c.category_name,
          cis.current_quantity,
          cis.last_transaction_date,
          cis.last_transaction_type,
          cis.last_updated
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      ORDER BY cis.last_transaction_date DESC
    `);
    
    if (inventoryResult.recordset.length === 0) {
      } else {
      inventoryResult.recordset.forEach((row, idx) => {
        });
    }
    
    // Query 2: Stock Acquisitions Audit Trail
    const acquisitionsResult = await pool.request().query(`
      SELECT TOP 10
          sa.id,
          sa.acquisition_number,
          sa.po_id,
          po.po_number,
          sa.delivery_id,
          d.delivery_number,
          sa.total_items,
          sa.total_quantity,
          sa.total_value,
          sa.acquisition_date,
          sa.processed_by,
          sa.status
      FROM stock_acquisitions sa
      INNER JOIN purchase_orders po ON sa.po_id = po.id
      INNER JOIN deliveries d ON sa.delivery_id = d.id
      ORDER BY sa.acquisition_date DESC
    `);
    
    if (acquisitionsResult.recordset.length === 0) {
      } else {
      acquisitionsResult.recordset.forEach((row, idx) => {
        });
    }
    
    // Query 3: Delivery to Inventory Trace
    const deliveryTraceResult = await pool.request().query(`
      SELECT TOP 20
          d.delivery_number,
          d.delivery_date,
          d.delivery_personnel,
          d.delivery_chalan,
          d.receiving_date,
          po.po_number,
          t.tender_number,
          t.tender_type,
          im.nomenclature,
          im.item_code,
          di.delivery_qty,
          di.quality_status,
          CASE 
              WHEN di.quality_status = 'good' THEN 'Added to Inventory'
              WHEN di.quality_status = 'damaged' THEN 'Not Added (Damaged)'
              WHEN di.quality_status = 'rejected' THEN 'Not Added (Rejected)'
              WHEN di.quality_status = 'partial' THEN 'Partially Added'
              ELSE 'Unknown Status'
          END AS inventory_status,
          sa.acquisition_number
      FROM deliveries d
      INNER JOIN delivery_items di ON d.id = di.delivery_id
      INNER JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN tenders t ON po.tender_id = t.id
      INNER JOIN item_masters im ON di.item_master_id = im.id
      LEFT JOIN stock_acquisitions sa ON sa.delivery_id = d.id
      WHERE d.delivery_status = 'completed'
      ORDER BY d.receiving_date DESC, d.delivery_number, im.nomenclature
    `);
    
    if (deliveryTraceResult.recordset.length === 0) {
      } else {
      let currentDelivery = '';
      deliveryTraceResult.recordset.forEach((row) => {
        if (currentDelivery !== row.delivery_number) {
          currentDelivery = row.delivery_number;
          }
        });
      }
    
    // Query 4: Summary Statistics
    const statsResult = await pool.request().query(`
      SELECT 
          (SELECT COUNT(*) FROM current_inventory_stock) as total_inventory_items,
          (SELECT ISNULL(SUM(current_quantity), 0) FROM current_inventory_stock) as total_inventory_quantity,
          (SELECT COUNT(*) FROM stock_acquisitions) as total_acquisitions,
          (SELECT COUNT(*) FROM deliveries WHERE delivery_status = 'completed') as completed_deliveries,
          (SELECT COUNT(*) FROM deliveries WHERE delivery_status = 'pending') as pending_deliveries,
          (SELECT COUNT(DISTINCT po_id) FROM deliveries) as pos_with_deliveries
    `);
    
    const stats = statsResult.recordset[0];
    // Query 5: Check for issues (items that should be in inventory but aren't)
    const issuesResult = await pool.request().query(`
      SELECT 
          im.nomenclature,
          im.item_code,
          po.po_number,
          d.delivery_number,
          di.delivery_qty,
          di.quality_status,
          d.receiving_date,
          CASE 
              WHEN cis.id IS NULL THEN 'Not in Inventory Table'
              WHEN cis.current_quantity = 0 THEN 'In Table but Zero Quantity'
              ELSE 'In Inventory'
          END as inventory_presence
      FROM delivery_items di
      INNER JOIN deliveries d ON di.delivery_id = d.id
      INNER JOIN purchase_orders po ON d.po_id = po.id
      INNER JOIN item_masters im ON di.item_master_id = im.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE d.delivery_status = 'completed'
        AND di.quality_status = 'good'
        AND (cis.id IS NULL OR cis.current_quantity = 0)
      ORDER BY d.receiving_date DESC
    `);
    
    if (issuesResult.recordset.length === 0) {
      } else {
      issuesResult.recordset.forEach((row, idx) => {
        });
    }
    
    } catch (err) {
    console.error('\n❌ Error running verification:', err.message);
    console.error(err);
  } finally {
    if (pool) {
      await pool.close();
      }
  }
}

// Run the verification
runVerification();
