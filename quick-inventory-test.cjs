// ============================================================================
// Quick Inventory Test Script
// Usage: node quick-inventory-test.cjs
// ============================================================================

const BASE_URL = 'http://localhost:3001/api';

// Test credentials (update with your actual test user)
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

let authToken = '';
let testPOId = '';
let testDeliveryId = '';

async function login() {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    authToken = data.token;
    return data.user.id;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function getCurrentInventory() {
  try {
    const sql = require('mssql');
    require('dotenv').config({ path: '.env.sqlserver' });

    const pool = await sql.connect({
      server: process.env.SQL_SERVER_HOST,
      database: process.env.SQL_SERVER_DATABASE,
      user: process.env.SQL_SERVER_USER,
      password: process.env.SQL_SERVER_PASSWORD,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });

    const result = await pool.request().query(`
      SELECT 
        im.nomenclature,
        im.item_code,
        cis.current_quantity
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      ORDER BY im.nomenclature
    `);

    await pool.close();
    return result.recordset;
  } catch (error) {
    console.error('❌ Failed to fetch inventory:', error.message);
    return [];
  }
}

async function testExistingPO() {
  try {
    // Step 1: Get list of finalized POs
    const posResponse = await fetch(`${BASE_URL}/purchase-orders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!posResponse.ok) throw new Error('Failed to fetch POs');
    const posData = await posResponse.json();

    const finalizedPOs = posData.purchaseOrders.filter(
      po => po.status === 'finalized' && po.delivery_status !== 'completed'
    );

    if (finalizedPOs.length === 0) {
      return;
    }

    const testPO = finalizedPOs[0];
    // Step 2: Get PO items
    const itemsResponse = await fetch(`${BASE_URL}/purchase-orders/${testPO.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!itemsResponse.ok) throw new Error('Failed to fetch PO items');
    const itemsData = await itemsResponse.json();

    const items = itemsData.items;
    items.forEach((item, idx) => {
      });
fetch(
      `${BASE_URL}/purchase-orders/${testPO.id}/delivery-status`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (deliveriesResponse.ok) {
      const deliveriesData = await deliveriesResponse.json();
      
      if (deliveriesData.deliveries && deliveriesData.deliveries.length > 0) {
        deliveriesD
    if (deliveriesResponse.data.deliveries && deliveriesResponse.data.deliveries.length > 0) {
      } deliveriesResponse.data.deliveries.forEach(delivery => {
        });
    }

    } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function showInventorySummary() {
  const inventory = await getCurrentInventory();

  if (inventory.length === 0) {
    } else {
    inventory.forEach((item, idx) => {
      });
  }

  }

async function main() {
  try {
    // Show current inventory
    await showInventorySummary();

    // Login
    const userId = await login();

    // Test existing PO workflow
    await testExistingPO();

    } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
