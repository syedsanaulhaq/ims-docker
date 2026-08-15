const express = require('express');
const sql = require('mssql');

const app = express();

// SQL Server configuration
const sqlConfig = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventoryuser',
  password: '1978Jupiter87@#',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

let pool;

// Initialize database connection
sql.connect(sqlConfig).then(poolConnection => {
  pool = poolConnection;
  }).catch(err => {
  console.error('❌ Database connection failed:', err);
});

// Test endpoint
app.get('/api/stock-transaction-dashboard-stats', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Basic endpoint test successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Endpoint error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message
    });
  }
});

app.listen(3003, () => {
  });
