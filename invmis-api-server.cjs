const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config(); // Use default .env file

const app = express();
const PORT = process.env.PORT || 5000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'invmis-erp-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json());

// SQL Server configuration
const config = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Check authentication type
if (process.env.SQL_SERVER_USER && process.env.SQL_SERVER_PASSWORD) {
  // SQL Server Authentication
  config.user = process.env.SQL_SERVER_USER;
  config.password = process.env.SQL_SERVER_PASSWORD;
  config.authentication = {
    type: 'default'
  };
} else {
  // Windows Authentication
  config.authentication = {
    type: 'ntlm',
    options: {
      domain: process.env.SQL_SERVER_DOMAIN || '',
      userName: process.env.SQL_SERVER_WINDOWS_USER || process.env.USERNAME || '',
      password: process.env.SQL_SERVER_WINDOWS_PASSWORD || ''
    }
  };
}

let pool;

// Initialize database connection
async function initializeDatabase() {
  try {
    pool = await sql.connect(config);
    // Test query
    const result = await pool.request().query('SELECT COUNT(*) as userCount FROM AspNetUsers');
    } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    pool = null;
  }
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected',
    service: 'InvMIS API',
    version: '1.0.0'
  });
});

// Session endpoint - Get current session
app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      success: true,
      session: {
        user_id: req.session.userId,
        user_name: req.session.userName,
        email: req.session.email,
        role: req.session.role,
        office_id: req.session.officeId,
        wing_id: req.session.wingId,
        full_name: req.session.fullName
      },
      session_id: req.sessionID
    });
  } else {
    // No active session - return fallback for development
    return res.json({
      success: true,
      session: {
        user_id: '1',
        user_name: 'admin',
        email: 'admin@ecp.gov.pk',
        role: 'Admin',
        office_id: 1,
        wing_id: 1,
        full_name: 'System Administrator'
      },
      session_id: 'dev-session'
    });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Query AspNetUsers table for the user
    const userResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT TOP 1 
          u.Id,
          u.UserName,
          u.Email,
          u.PasswordHash,
          u.Role,
          u.FullName,
          u.intOfficeID,
          u.intWingID,
          u.ISACT,
          o.strOfficeName AS OfficeName,
          w.Name AS WingName
        FROM AspNetUsers u
        LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
        LEFT JOIN WingsInformation w ON u.intWingID = w.Id
        WHERE u.UserName = @username AND u.ISACT = 1
      `);

    if (userResult.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult.recordset[0];

    // Password validation logic
    let isValidPassword = false;
    
    if (user.PasswordHash) {
      try {
        // Try bcrypt comparison for hashed passwords
        isValidPassword = await bcrypt.compare(password, user.PasswordHash);
      } catch (err) {
        isValidPassword = false;
      }
    }
    
    // For development - allow common passwords if bcrypt fails
    if (!isValidPassword) {
      const devPasswords = ['admin123', '123456', 'password', user.UserName, 'admin'];
      isValidPassword = devPasswords.includes(password);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create session
    const userSession = {
      Id: user.Id,
      UserName: user.UserName,
      FullName: user.FullName,
      Email: user.Email,
      Role: user.Role,
      intOfficeID: user.intOfficeID,
      intWingID: user.intWingID,
      OfficeName: user.OfficeName,
      WingName: user.WingName
    };

    req.session.userId = user.Id;
    req.session.user = userSession;

    res.json({
      success: true,
      user: userSession,
      message: 'Login successful'
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// Users endpoints
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request().query(`
      SELECT 
        u.Id,
        u.UserName,
        u.Email,
        u.FullName,
        u.Role,
        u.intOfficeID,
        u.intWingID,
        u.ISACT,
        u.CreatedDate,
        o.strOfficeName AS OfficeName,
        w.Name AS WingName
      FROM AspNetUsers u
      LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID  
      LEFT JOIN WingsInformation w ON u.intWingID = w.Id
      ORDER BY u.FullName
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Dashboard endpoints
app.get('/api/dashboard/summary', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get basic counts from the database
    const results = await Promise.all([
      pool.request().query('SELECT COUNT(*) as totalUsers FROM AspNetUsers WHERE ISACT = 1'),
      pool.request().query('SELECT COUNT(*) as totalOffices FROM tblOffices WHERE IsActive = 1'),
      pool.request().query('SELECT COUNT(*) as totalWings FROM WingsInformation WHERE IsActive = 1'),
      pool.request().query('SELECT COUNT(*) as totalRoles FROM AspNetUsers WHERE Role IS NOT NULL GROUP BY Role')
    ]);

    const summary = {
      totalUsers: results[0].recordset[0].totalUsers,
      totalOffices: results[1].recordset[0].totalOffices, 
      totalWings: results[2].recordset[0].totalWings,
      totalRoles: results[3].recordset.length,
      lastUpdated: new Date().toISOString(),
      systemStatus: 'operational'
    };

    res.json(summary);
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Offices endpoints
app.get('/api/offices', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request().query(`
      SELECT 
        intOfficeID,
        strOfficeName AS OfficeName,
        OfficeCode,
        IsActive,
        CreatedDate
      FROM tblOffices 
      WHERE IsActive = 1
      ORDER BY strOfficeName
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Offices fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch offices' });
  }
});

// Wings endpoints  
app.get('/api/wings', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request().query(`
      SELECT 
        Id AS intWingID,
        Name AS WingName,
        Code AS WingCode,
        IsActive,
        CreatedDate
      FROM WingsInformation 
      WHERE IsActive = 1
      ORDER BY Name
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Wings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wings' });
  }
});

// Tenders endpoints
app.get('/api/tenders', requireAuth, async (req, res) => {
  try {
    // Mock tender data for now
    const mockTenders = [
      {
        id: '1',
        tender_number: 'TND-2025-001',
        title: 'IT Equipment Procurement',
        description: 'Procurement of laptops and printers for office use',
        category: 'IT Equipment',
        department: 'IT Department',
        tender_type: 'open',
        status: 'active',
        estimated_value: 4700000,
        currency: 'PKR',
        publication_date: new Date().toISOString(),
        submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: req.session.user.UserName,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        documents_count: 2,
        bids_count: 2,
        contact_person: req.session.user.FullName,
        contact_email: req.session.user.Email
      }
    ];

    res.json(mockTenders);
  } catch (err) {
    console.error('Tenders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

// Inventory endpoints - All Items
app.get('/api/inventory/all-items', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature as item_name,
        c.category_name,
        im.unit,
        im.specifications,
        im.description,
        im.status,
        cis.current_quantity,
        cis.available_quantity,
        cis.reserved_quantity,
        cis.minimum_stock_level,
        cis.reorder_point,
        cis.maximum_stock_level,
        cis.last_updated,
        im.created_at,
        im.updated_at
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE im.status = 'active'
      ORDER BY im.item_code
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Inventory all items fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory items', details: err.message });
  }
});

// Inventory endpoints - Stock Quantities
app.get('/api/inventory/stock-quantities', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature as item_name,
        c.category_name,
        im.unit,
        ISNULL(cis.current_quantity, 0) as current_quantity,
        ISNULL(cis.available_quantity, 0) as available_quantity,
        ISNULL(cis.reserved_quantity, 0) as reserved_quantity,
        ISNULL(cis.minimum_stock_level, 0) as minimum_stock_level,
        ISNULL(cis.reorder_point, 0) as reorder_point,
        ISNULL(cis.maximum_stock_level, 0) as maximum_stock_level,
        CASE 
          WHEN ISNULL(cis.current_quantity, 0) = 0 THEN 'Out of Stock'
          WHEN ISNULL(cis.current_quantity, 0) <= ISNULL(cis.reorder_point, 0) THEN 'Low Stock'
          WHEN ISNULL(cis.current_quantity, 0) >= ISNULL(cis.maximum_stock_level, 999999) THEN 'Overstock'
          ELSE 'In Stock'
        END as stock_status,
        cis.last_updated
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE im.status = 'active'
      ORDER BY 
        CASE 
          WHEN ISNULL(cis.current_quantity, 0) = 0 THEN 1
          WHEN ISNULL(cis.current_quantity, 0) <= ISNULL(cis.reorder_point, 0) THEN 2
          ELSE 3
        END,
        im.item_code
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Inventory stock quantities fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch stock quantities', details: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;