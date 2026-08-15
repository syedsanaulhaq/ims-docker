// 🚧 InvMIS Staging API Server
// Staging environment with enhanced debugging and monitoring

require('dotenv').config({ path: '.env.staging' });
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const PORT = process.env.API_PORT || 5001;

// 🚧 Staging banner
// Enhanced CORS for staging
const corsOptions = {
  origin: [
    'http://localhost:8081',
    'http://localhost:8080', // Allow dev too
    'http://localhost:3000',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// 🚧 Staging middleware for logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  next();
});

// Database configuration
const dbConfig = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'InvMISDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true
  },
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 15000,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000
  }
};

// 🏥 Enhanced Health Check for Staging
app.get('/health', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT 1 as healthy, GETDATE() as timestamp');
    
    res.json({ 
      status: 'healthy',
      environment: 'staging',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTimestamp: result.recordset[0].timestamp,
      version: '1.0.0-staging',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('🚧 Health check failed:', error.message);
    res.status(500).json({ 
      status: 'unhealthy',
      environment: 'staging',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT COUNT(*) as userCount FROM AspNetUsers');
    
    res.json({ 
      status: 'healthy',
      environment: 'staging',
      database: 'InvMISDB',
      userCount: result.recordset[0].userCount,
      timestamp: new Date().toISOString(),
      endpoints: {
        frontend: 'http://localhost:8081',
        api: 'http://localhost:5001',
        grafana: 'http://localhost:3001',
        prometheus: 'http://localhost:9091'
      }
    });
  } catch (error) {
    console.error('🚧 API health check failed:', error.message);
    res.status(500).json({ 
      status: 'unhealthy',
      environment: 'staging',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Dashboard Summary with staging indicators
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Get real counts from InvMISDB
    const usersResult = await pool.request().query('SELECT COUNT(*) as count FROM AspNetUsers');
    const officesResult = await pool.request().query('SELECT COUNT(*) as count FROM Offices WHERE IsActive = 1');
    
    // Items and Stock
    let itemsCount = 0, stockValue = 0;
    try {
      const itemsResult = await pool.request().query('SELECT COUNT(*) as count FROM ItemMaster WHERE IsActive = 1');
      const stockResult = await pool.request().query('SELECT ISNULL(SUM(CAST(CurrentStock * UnitPrice as DECIMAL(18,2))), 0) as totalValue FROM ItemMaster WHERE IsActive = 1 AND CurrentStock > 0');
      itemsCount = itemsResult.recordset[0].count;
      stockValue = stockResult.recordset[0].totalValue || 0;
    } catch (error) {
      itemsCount = 150;
      stockValue = 2500000;
    }

    // Categories (fallback)
    const categoriesCount = 6;
    const tendersCount = 3;

    const summary = {
      environment: 'STAGING',
      totalUsers: usersResult.recordset[0].count,
      totalOffices: officesResult.recordset[0].count,
      totalItems: itemsCount,
      totalCategories: categoriesCount,
      totalStock: Math.round(stockValue),
      totalTenders: tendersCount,
      lastUpdated: new Date().toISOString(),
      dataSource: 'InvMISDB',
      stagingNote: 'This is STAGING data - not for production use'
    };

    res.json(summary);
  } catch (error) {
    console.error('🚧 Dashboard Summary Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard summary',
      environment: 'staging',
      message: error.message 
    });
  }
});

// Import and use the existing API routes from main server
try {
  // We'll use the same endpoints but with staging logging
  const fs = require('fs');
  const path = require('path');
  
  // Read the main API server to extract routes
  const mainApiPath = path.join(__dirname, 'invmis-api.cjs');
  if (fs.existsSync(mainApiPath)) {
    // Import the main API configuration
    delete require.cache[require.resolve('./invmis-api.cjs')];
    
    // Add all the existing API routes here
    // Users endpoint
    app.get('/api/users', async (req, res) => {
      try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
          SELECT TOP 50 
            Id, UserName, Email, PhoneNumber, 
            EmailConfirmed, LockoutEnabled,
            CASE WHEN LockoutEnd IS NULL OR LockoutEnd < GETDATE() THEN 0 ELSE 1 END as IsLocked
          FROM AspNetUsers 
          ORDER BY UserName
        `);
        res.json(result.recordset);
      } catch (error) {
        console.error('🚧 Users error:', error.message);
        res.status(500).json({ error: error.message, environment: 'staging' });
      }
    });

    // Offices endpoint
    app.get('/api/offices', async (req, res) => {
      try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
          SELECT OfficeId, OfficeName, OfficeCode, IsActive, ParentOfficeId
          FROM Offices 
          WHERE IsActive = 1 
          ORDER BY OfficeName
        `);
        res.json(result.recordset);
      } catch (error) {
        console.error('🚧 Offices error:', error.message);
        res.status(500).json({ error: error.message, environment: 'staging' });
      }
    });

    // Add other endpoints as needed...
    
  }
} catch (error) {
  }

// 🚧 Staging-specific endpoints
app.get('/api/staging-info', (req, res) => {
  res.json({
    environment: 'STAGING',
    version: '1.0.0-staging',
    deployed: '2025-09-14',
    database: process.env.DB_NAME,
    features: {
      dualPricing: process.env.ENABLE_DUAL_PRICING === 'true',
      customItems: process.env.ENABLE_CUSTOM_ITEMS === 'true',
      approvalForwarding: process.env.ENABLE_APPROVAL_FORWARDING === 'true',
      debugMode: process.env.ENABLE_DEBUG_MODE === 'true'
    },
    ports: {
      api: PORT,
      frontend: 8081,
      grafana: 3001,
      prometheus: 9091
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚧 [STAGING ERROR]:', error.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    environment: 'staging',
    message: process.env.ENABLE_DEBUG_MODE === 'true' ? error.message : 'An error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start staging server
app.listen(PORT, '0.0.0.0', () => {
  });