const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const aspnetIdentity = require('aspnet-identity-pw');
require('dotenv').config({ path: '.env.sqlserver' });
const app = express();
const PORT = process.env.PORT || 3001;
// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'inventory-management-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:4173', 'http://localhost', 'http://172.20.150.34', 'file://'],
  credentials: true
}));
app.use(express.json());
// ============================================================================
// JWT Configuration for SSO
// ============================================================================
// IMPORTANT: This secret key MUST match exactly with the one in DS (.NET Core)
const JWT_SECRET = process.env.JWT_SECRET || 'YourVerySecureSecretKeyAtLeast32CharactersLong123456';
const JWT_ISSUER = 'DigitalSystem';
const JWT_AUDIENCE = 'IMS';
// Global request logger to debug routing issues
app.use((req, res, next) => {
  console.log(`🌍 ALL REQUESTS: ${req.method} ${req.originalUrl}`);
  if (req.originalUrl.includes('/ims/check-permission')) {
    console.log('🔍 PERMISSION CHECK REQUEST DETECTED!');
  }
  if (req.originalUrl.includes('/finalize')) {
    console.log('🚨 FINALIZE REQUEST DETECTED!');
    console.log('🚨 Method:', req.method);
    console.log('🚨 URL:', req.originalUrl);
    console.log('🚨 Body:', req.body);
  }
  next();
});
// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'tender-files');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept common document and image formats
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'));
    }
  }
});
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// GET /api/items-master - Return all active items from ItemMaster (for procurement request page)
app.get('/api/items-master', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const categoryId = req.query.category_id;
    console.log(`🔄 /items-master called with category_id:`, categoryId, 'Type:', typeof categoryId);
    let request = pool.request();
    let query = `
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature,
        im.unit,
        im.specifications,
        im.category_id,
        im.sub_category_id,
        c.category_name,
        im.status,
        im.created_at
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE im.status = 'Active'
    `;
    if (categoryId) {
      console.log(`📌 Filtering by category_id: ${categoryId}`);
      // Handle both numeric and string/UUID format
      query += ` AND (im.category_id = @categoryId OR CAST(im.category_id AS VARCHAR(MAX)) = @categoryId)`;
      request = request.input('categoryId', sql.VarChar, categoryId);
    }
    query += ` ORDER BY im.nomenclature`;
    console.log('📋 Executing query:', query);
    const result = await request.query(query);
    const items = result.recordset;
    console.log(`✅ Found ${items.length} items${categoryId ? ` for category ${categoryId}` : ''}`);
    console.log(`📦 First item sample:`, items[0]);
    res.json({
      success: true,
      items: items,
      count: items.length
    });
  } catch (error) {
    console.error('❌ Error fetching items for /items-master:', error);
    res.status(500).json({ 
      error: 'Failed to fetch items',
      details: error.message 
    });
  }
});
// SQL Server configuration - Using environment variables from .env.sqlserver
const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  // Default to the main InventoryManagementDB (not the TEST DB)
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true' || true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};
let pool;
// Default session for development/testing
const DEFAULT_SESSION = {
  user_id: 'DEV-USER-001',
  user_name: 'Development User',
  email: 'dev.user@system.com',
  role: 'Admin',
  office_id: 583,
  wing_id: 19,
  created_at: new Date().toISOString()
};
// Session management
const sessions = new Map();
const DEFAULT_SESSION_ID = 'default-session';
// Initialize default session
sessions.set(DEFAULT_SESSION_ID, DEFAULT_SESSION);
// Initialize SQL Server connection
async function initializeDatabase() {
  try {
    console.log('🔗 Connecting to SQL Server...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to SQL Server successfully');
    // Test the connection
    const testResult = await pool.request().query('SELECT @@VERSION as version');
    console.log('📊 Database version:', testResult.recordset[0]?.version?.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Server will continue with mock data fallback');
    // Don't exit - allow server to run with mock data
  }
}
// API Routes
// ============================================================================
// IMS ROLE & PERMISSION MIDDLEWARE
// ============================================================================
// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};
// Permission checking middleware - checks IMS permissions
const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    // Handle async operations properly in Express middleware
    const checkPermission = async () => {
      try {
        if (!req.session || !req.session.userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        if (!pool) {
          console.error('❌ Permission check failed - no database connection');
          return res.status(503).json({ error: 'Database connection unavailable' });
        }
        // First check if user is super admin - they bypass all permission checks
        const superAdminResult = await pool.request()
          .input('userId', sql.NVarChar(450), req.session.userId)
          .query('SELECT dbo.fn_IsSuperAdmin(@userId) as isSuperAdmin');
        const isSuperAdmin = superAdminResult.recordset[0]?.isSuperAdmin === 1 || superAdminResult.recordset[0]?.isSuperAdmin === true;
        if (isSuperAdmin) {
          console.log(`✅ Super Admin bypassing permission check: ${permissionKey}`);
          return next();
        }
        // Check if user has the required permission
        console.log(`🔍 Checking permission: ${permissionKey} for user ${req.session.userId}`);
        const result = await pool.request()
          .input('userId', sql.NVarChar(450), req.session.userId)
          .input('permissionKey', sql.NVarChar(100), permissionKey)
          .query('SELECT dbo.fn_HasPermission(@userId, @permissionKey) as hasPermission');
        console.log(`🔍 Permission check result:`, result.recordset[0]);
        const hasPermission = result.recordset[0]?.hasPermission === 1 || result.recordset[0]?.hasPermission === true;
        if (hasPermission) {
          console.log(`✅ Permission granted: ${permissionKey} for user ${req.session.userId}`);
          next();
        } else {
          console.log(`❌ Permission denied: ${permissionKey} for user ${req.session.userId}`);
          res.status(403).json({
            error: 'Permission denied',
            required_permission: permissionKey,
            message: 'You do not have permission to perform this action'
          });
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Permission check failed' });
        }
      }
    };
    checkPermission();
  };
};
// Check if user is Super Admin
const requireSuperAdmin = (req, res, next) => {
  // Handle async operations properly in Express middleware
  const checkSuperAdmin = async () => {
    try {
      console.log('🔍 requireSuperAdmin - Checking session:', !!req.session, 'userId:', req.session?.userId);
      if (!req.session || !req.session.userId) {
        console.log('❌ No session or userId');
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (!pool) {
        console.warn('⚠️  Super admin check skipped - no database connection');
        return next(); // Allow in development mode
      }
      console.log('🔍 Checking super admin status for user:', req.session.userId);
      const result = await pool.request()
        .input('userId', sql.NVarChar(450), req.session.userId)
        .query('SELECT dbo.fn_IsSuperAdmin(@userId) as isSuperAdmin');
      console.log('🔍 SQL result:', result.recordset[0]);
      // SQL Server returns bit as boolean (true/false), not as 1/0
      const isSuperAdmin = result.recordset[0]?.isSuperAdmin === true || 
                           result.recordset[0]?.isSuperAdmin === 1;
      console.log('🔍 isSuperAdmin:', isSuperAdmin);
      if (isSuperAdmin) {
        console.log(`✅ Super Admin access granted for user ${req.session.userId}`);
        next();
      } else {
        console.log(`❌ Super Admin access denied for user ${req.session.userId}`);
        res.status(403).json({
          error: 'Super Admin access required',
          message: 'Only Super Administrators can perform this action'
        });
      }
    } catch (error) {
      console.error('❌ Error checking super admin status:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Authorization check failed' });
      }
    }
  };
  checkSuperAdmin();
};
// Assign default permissions to new SSO users
async function assignDefaultPermissionsToSSOUser(userId) {
  if (!pool) return;
  try {
    // Check if user already has permissions
    const checkResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT COUNT(*) as count
        FROM vw_ims_user_permissions
        WHERE user_id = @userId
      `);
    const hasPermissions = checkResult.recordset[0]?.count > 0;
    if (!hasPermissions) {
      console.log('📋 Assigning default permissions to SSO user:', userId);
      // Get or create a default "GENERAL_USER" role if it doesn't exist
      const roleResult = await pool.request()
        .query(`
          SELECT TOP 1 id FROM ims_roles 
          WHERE role_name = 'GENERAL_USER' AND is_active = 1
        `);
      let roleId;
      if (roleResult.recordset.length > 0) {
        roleId = roleResult.recordset[0].id;
        console.log('✅ Found existing General User role:', roleId);
      } else {
        // Create GENERAL_USER role if it doesn't exist
        console.log('📝 Creating GENERAL_USER role...');
        const createRoleResult = await pool.request()
          .query(`
            DECLARE @newId UNIQUEIDENTIFIER = NEWID();
            INSERT INTO ims_roles (id, role_name, display_name, description, is_active, scope_type, created_at)
            VALUES (@newId, 'GENERAL_USER', 'General User', 'Default role for general users', 1, 'GLOBAL', GETDATE());
            SELECT @newId as id;
          `);
        roleId = createRoleResult.recordset[0]?.id;
        console.log('✅ Created new General User role:', roleId);
      }
      if (roleId) {
        // Assign role to user in ims_user_roles table (not user_roles!)
        const assignResult = await pool.request()
          .input('userId', sql.NVarChar(450), userId)
          .input('roleId', sql.UniqueIdentifier, roleId)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM ims_user_roles WHERE user_id = @userId AND role_id = @roleId AND is_active = 1
            )
            BEGIN
              INSERT INTO ims_user_roles (user_id, role_id, scope_type, is_active, assigned_at)
              VALUES (@userId, @roleId, 'GLOBAL', 1, GETDATE());
              SELECT 1 as assigned;
            END
            ELSE
            BEGIN
              UPDATE ims_user_roles 
              SET is_active = 1, scope_type = 'GLOBAL'
              WHERE user_id = @userId AND role_id = @roleId;
              SELECT 0 as assigned;
            END
          `);
        const wasAssigned = assignResult.recordset[0]?.assigned === 1;
        console.log(`✅ SSO user role assignment - User: ${userId}, Role: ${roleId}, Assigned: ${wasAssigned}`);
      }
    } else {
      console.log('ℹ️ SSO user already has permissions:', userId);
    }
  } catch (error) {
    console.error('⚠️ Error assigning default permissions:', error.message);
    console.error('Stack:', error.stack);
    // Continue even if assignment fails
  }
}
// Get user's IMS roles and permissions
async function getUserImsData(userId) {
  if (!pool) return null;
  try {
    console.log(`\n🔍 ==== getUserImsData() DEBUG START for userId: ${userId} ====`);
    // Get roles
    const rolesResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query('SELECT * FROM dbo.fn_GetUserRoles(@userId)');
    console.log(`📋 Roles found: ${rolesResult.recordset.length}`);
    if (rolesResult.recordset.length > 0) {
      console.log('   Roles:', rolesResult.recordset.map(r => ({
        role_id: r.role_id,
        role_name: r.role_name,
        display_name: r.display_name,
        scope_type: r.scope_type
      })));
    }
    // Get permissions
    const permsResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT DISTINCT permission_key, module_name, action_name, description
        FROM vw_ims_user_permissions
        WHERE user_id = @userId
        ORDER BY module_name, action_name
      `);
    console.log(`🔐 Permissions found: ${permsResult.recordset.length}`);
    if (permsResult.recordset.length > 0) {
      console.log('   Permissions:', permsResult.recordset.map(p => ({
        permission_key: p.permission_key,
        module_name: p.module_name,
        action_name: p.action_name
      })));
    } else {
      console.log('   ⚠️ NO PERMISSIONS FOUND! Checking database...');
      // Debug: Check if user has roles in ims_user_roles
      const roleCheckResult = await pool.request()
        .input('userId', sql.NVarChar(450), userId)
        .query(`
          SELECT ur.user_id, ur.role_id, ur.is_active, r.role_name, r.is_active as role_is_active
          FROM ims_user_roles ur
          LEFT JOIN ims_roles r ON ur.role_id = r.id
          WHERE ur.user_id = @userId
        `);
      console.log(`   Checking ims_user_roles: ${roleCheckResult.recordset.length} records`);
      if (roleCheckResult.recordset.length > 0) {
        console.log('   ims_user_roles records:', roleCheckResult.recordset);
      }
      // Debug: Check if role has permissions
      if (rolesResult.recordset.length > 0) {
        const roleId = rolesResult.recordset[0].role_id;
        const permCheckResult = await pool.request()
          .input('roleId', sql.UniqueIdentifier, roleId)
          .query(`
            SELECT rp.role_id, rp.permission_id, p.permission_key, p.is_active
            FROM ims_role_permissions rp
            LEFT JOIN ims_permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = @roleId
          `);
        console.log(`   Checking ims_role_permissions for role ${roleId}: ${permCheckResult.recordset.length} records`);
        if (permCheckResult.recordset.length > 0) {
          console.log('   Role permissions:', permCheckResult.recordset.map(p => ({
            permission_key: p.permission_key,
            is_active: p.is_active
          })));
        } else {
          console.log('   ⚠️ ROLE HAS NO PERMISSIONS ASSIGNED!');
        }
      }
    }
    // Check if super admin
    const superAdminResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query('SELECT dbo.fn_IsSuperAdmin(@userId) as isSuperAdmin');
    // SQL Server returns bit as boolean (true/false), not as 1/0
    const isSuperAdmin = superAdminResult.recordset[0]?.isSuperAdmin === true || 
                         superAdminResult.recordset[0]?.isSuperAdmin === 1;
    return {
      roles: rolesResult.recordset,
      permissions: permsResult.recordset,
      is_super_admin: isSuperAdmin
    };
  } catch (error) {
    console.error('Error getting user IMS data:', error);
    return null;
  }
}
// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`\n📥 LOGIN REQUEST RECEIVED`);
    console.log(`   Username: ${username}`);
    console.log(`   Password length: ${password ? password.length : 0} chars`);
    if (!username || !password) {
      console.log(`❌ Missing credentials - username: ${!!username}, password: ${!!password}`);
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!pool) {
      console.log(`❌ Database pool unavailable`);
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
    // Query AspNetUsers table
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT 
          Id, FullName, UserName, Email, Role, intOfficeID, intWingID, 
          intBranchID, intDesignationID, Password, PasswordHash, ISACT
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);
    if (result.recordset.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.recordset[0];
    // Check password - multiple fallback strategies
    let isPasswordValid = false;
    console.log(`\n🔐 Checking password for user: ${username} (ID: ${user.Id})`);
    console.log(`📋 User Password field exists: ${!!user.Password}, length: ${user.Password ? user.Password.length : 0}`);
    console.log(`📋 User PasswordHash field exists: ${!!user.PasswordHash}, length: ${user.PasswordHash ? user.PasswordHash.length : 0}`);
    console.log(`📋 Provided password length: ${password.length}`);
    // Strategy 1: Check plain text Password field
    if (user.Password) {
      console.log(`   🔍 Strategy 1: Checking plain text Password field`);
      console.log(`      Stored password: "${user.Password}"`);
      console.log(`      Provided password: "${password}"`);
      console.log(`      Direct match: ${user.Password === password}`);
      if (user.Password === password) {
        console.log('✅ Password matched in plain text Password field');
        isPasswordValid = true;
      }
    }
    // Strategy 2: Check ASP.NET Identity hash in PasswordHash field
    if (!isPasswordValid && user.PasswordHash) {
      console.log(`   🔍 Strategy 2: Checking ASP.NET Identity hash in PasswordHash field`);
      try {
        // Try ASP.NET Identity password verification using validatePassword
        // PasswordHash format for ASP.NET Identity starts with AQA or has specific length
        if (user.PasswordHash.startsWith('AQA') || user.PasswordHash.length > 60) {
          isPasswordValid = aspnetIdentity.validatePassword(password, user.PasswordHash);
          console.log(`      ASP.NET Identity validatePassword result: ${isPasswordValid}`);
          if (isPasswordValid) {
            console.log('✅ Password matched with ASP.NET Identity hash in PasswordHash field');
          }
        }
      } catch (error) {
        console.error('❌ ASP.NET Identity hash comparison error:', error.message);
        isPasswordValid = false;
      }
    }
    // Strategy 3: Try bcrypt comparison as fallback
    if (!isPasswordValid && user.PasswordHash && user.PasswordHash.startsWith('$2')) {
      console.log(`   🔍 Strategy 3: Checking bcrypt hash in PasswordHash field`);
      try {
        isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        console.log(`      Bcrypt compare result: ${isPasswordValid}`);
        if (isPasswordValid) {
          console.log('✅ Password matched with bcrypt hash in PasswordHash field');
        }
      } catch (error) {
        console.error('❌ Bcrypt comparison error:', error.message);
        isPasswordValid = false;
      }
    }
    // Strategy 4: Check if plain password is in PasswordHash field (stored as plain text)
    if (!isPasswordValid && user.PasswordHash && user.PasswordHash === password) {
      console.log(`   🔍 Strategy 4: Checking if plain text password in PasswordHash field`);
      console.log('✅ Password matched as plain text in PasswordHash field');
      isPasswordValid = true;
    }
    if (!isPasswordValid) {
      console.log(`\n❌ LOGIN FAILED - Invalid credentials for user: ${username}`);
      console.log(`   All strategies failed`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log(`\n✅ PASSWORD VALIDATION SUCCESSFUL for user: ${username}`);
    // Store user in session
    req.session.userId = user.Id;
    req.session.user = {
      Id: user.Id,
      FullName: user.FullName,
      UserName: user.UserName,
      Email: user.Email,
      Role: user.Role,
      intOfficeID: user.intOfficeID,
      intWingID: user.intWingID,
      intBranchID: user.intBranchID,
      intDesignationID: user.intDesignationID
    };
    // Get IMS roles and permissions
    const imsData = await getUserImsData(user.Id);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }
    // Update last login time
    await pool.request()
      .input('userId', sql.NVarChar, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query(`
        UPDATE AspNetUsers 
        SET LastLoggedIn = @lastLogin 
        WHERE Id = @userId
      `);
    res.json({
      success: true,
      user: req.session.user,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ============================================================================
// SSO Login Endpoint - Receives JWT token from Digital System
// ============================================================================
app.get('/sso-login', async (req, res) => {
  try {
    const { token } = req.query;
    console.log('🔐 SSO Login attempt received');
    console.log('📝 Token:', token ? 'Present' : 'Missing');
    if (!token) {
      console.error('❌ SSO Login failed: No token provided');
      return res.status(400).send(`
        <html>
          <head><title>SSO Login Failed</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1 style="color: #dc2626;">❌ Login Failed</h1>
            <p>No authentication token provided.</p>
            <p><a href="http://172.20.150.34/Account/Login">Return to Digital System Login</a></p>
          </body>
        </html>
      `);
    }
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });
      console.log('✅ JWT token verified successfully');
      console.log('👤 User from token:', decoded.full_name, '(', decoded.unique_name, ')');
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).send(`
        <html>
          <head><title>SSO Login Failed</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1 style="color: #dc2626;">❌ Authentication Failed</h1>
            <p>Invalid or expired token.</p>
            <p>Error: ${jwtError.message}</p>
            <p><a href="http://172.20.150.34/Account/Login">Return to Digital System Login</a></p>
          </body>
        </html>
      `);
    }
    // Extract user information from JWT token
    const userId = decoded.sub; // User ID from token
    const userName = decoded.full_name;
    const email = decoded.email;
    const cnic = decoded.cnic || decoded.unique_name;
    const officeId = decoded.office_id;
    const wingId = decoded.wing_id;
    const branchId = decoded.branch_id;
    const designationId = decoded.designation_id;
    const role = decoded.role || 'User';
    // Optional: Verify user exists in database and is active
    if (pool) {
      try {
        const result = await pool.request()
          .input('userId', sql.NVarChar, userId)
          .query(`
            SELECT Id, FullName, Email, Role, ISACT 
            FROM AspNetUsers 
            WHERE Id = @userId
          `);
        if (result.recordset.length === 0) {
          console.warn('⚠️ User not found in IMS database, proceeding with token data');
        } else {
          const dbUser = result.recordset[0];
          if (!dbUser.ISACT) {
            console.error('❌ User account is inactive');
            return res.status(403).send(`
              <html>
                <head><title>Account Inactive</title></head>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                  <h1 style="color: #dc2626;">❌ Account Inactive</h1>
                  <p>Your account has been deactivated.</p>
                  <p>Please contact your administrator.</p>
                </body>
              </html>
            `);
          }
          console.log('✅ User verified in database:', dbUser.FullName);
        }
      } catch (dbError) {
        console.error('⚠️ Database verification error:', dbError.message);
        // Continue with token data even if DB check fails
      }
    }
    // Create session
    req.session.userId = userId;
    // Assign default permissions to new SSO users if they don't have any
    await assignDefaultPermissionsToSSOUser(userId);
    // Fetch IMS roles and permissions for SSO user
    const imsData = await getUserImsData(userId);
    console.log(`\n✅ SSO LOGIN COMPLETE - Session preparation:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   User Name: ${userName}`);
    console.log(`   Roles from IMS: ${imsData?.roles?.length || 0}`);
    console.log(`   Permissions from IMS: ${imsData?.permissions?.length || 0}`);
    console.log(`   Is Super Admin: ${imsData?.is_super_admin}`);
    req.session.user = {
      Id: userId,
      FullName: userName,
      UserName: cnic,
      Email: email,
      Role: role,
      intOfficeID: officeId,
      intWingID: wingId,
      intBranchID: branchId,
      intDesignationID: designationId,
      sso_login: true, // Mark this as SSO login
      ims_roles: imsData?.roles || [],
      ims_permissions: imsData?.permissions || [],
      is_super_admin: imsData?.is_super_admin || false
    };
    console.log(`\n📊 Session created for SSO user:`);
    console.log(`   Storing in session.user.ims_roles: ${req.session.user.ims_roles.length}`);
    console.log(`   Storing in session.user.ims_permissions: ${req.session.user.ims_permissions.length}`);
    console.log('🔑 Session ID:', req.sessionID);
    console.log('📋 IMS Roles loaded:', imsData?.roles?.length || 0);
    console.log('🔐 IMS Permissions loaded:', imsData?.permissions?.length || 0);
    // Redirect to IMS application with success
    const imsUrl = 'http://172.20.150.34'; // IMS frontend URL
    res.send(`
      <html>
        <head>
          <title>Logging in...</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            }
            .login-box {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #0d9488;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h1 { color: #0d9488; margin-bottom: 10px; }
            p { color: #666; }
          </style>
          <script>
            // Store session info in sessionStorage
            sessionStorage.setItem('sso_authenticated', 'true');
            sessionStorage.setItem('user_name', '${userName}');
            // Redirect after a brief delay
            setTimeout(function() {
              window.location.href = '${imsUrl}';
            }, 1500);
          </script>
        </head>
        <body>
          <div class="login-box">
            <h1>✅ Login Successful</h1>
            <p>Welcome, ${userName}!</p>
            <div class="spinner"></div>
            <p style="color: #0d9488; font-weight: bold;">Redirecting to IMS...</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ SSO Login error:', error);
    res.status(500).send(`
      <html>
        <head><title>SSO Login Error</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1 style="color: #dc2626;">❌ Login Error</h1>
          <p>An unexpected error occurred during login.</p>
          <p>Error: ${error.message}</p>
          <p><a href="http://172.20.150.34/Account/Login">Return to Digital System Login</a></p>
        </body>
      </html>
    `);
  }
});
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session.user
  });
});
// Session management endpoints
app.get('/api/session', async (req, res) => {
  try {
    // Check if we have a session user
    if (req.session && req.session.userId) {
      console.log('\n📊 /api/session request - Session found:', {
        userId: req.session.userId,
        userName: req.session.user?.FullName || req.session.user?.UserName,
        sessionID: req.sessionID,
        hasImsRoles: !!req.session.user?.ims_roles?.length,
        hasImsPerms: !!req.session.user?.ims_permissions?.length
      });
      // User is properly logged in via session - GET IMS DATA!
      const imsData = await getUserImsData(req.session.userId);
      console.log('🔐 IMS Data fetched from /api/session:', {
        rolesCount: imsData?.roles?.length || 0,
        permsCount: imsData?.permissions?.length || 0,
        isSuperAdmin: imsData?.is_super_admin,
        permissionKeys: imsData?.permissions?.map(p => p.permission_key) || []
      });
      // Get the primary IMS role display name (first role if multiple)
      const primaryRole = imsData?.roles?.length > 0 
        ? (imsData.roles[0].display_name || imsData.roles[0].role_name || 'User')
        : 'User';
      // Get designation name if available
      let designation = null;
      if (req.session.user?.intDesignationID) {
        try {
          const designationResult = await pool.request()
            .input('userId', sql.NVarChar(450), req.session.userId)
            .query('SELECT strDesignation FROM vw_User_with_designation WHERE Id = @userId');
          if (designationResult.recordset && designationResult.recordset.length > 0) {
            designation = designationResult.recordset[0].strDesignation;
          }
        } catch (error) {
          console.error('Error fetching designation:', error);
        }
      }
      const sessionUser = {
        user_id: req.session.userId,
        user_name: req.session.user?.FullName || req.session.user?.UserName || 'Unknown User',
        email: req.session.user?.Email || '',
        role: primaryRole,
        designation: designation,
        office_id: req.session.user?.intOfficeID || 583,
        wing_id: req.session.user?.intWingID || 19,
        branch_id: req.session.user?.intBranchID || null,
        created_at: new Date().toISOString(),
        // IMS Role System Data
        ims_roles: imsData?.roles || [],
        ims_permissions: imsData?.permissions || [],
        is_super_admin: imsData?.is_super_admin || false
      };
      console.log('✅ Session response prepared:', {
        userId: sessionUser.user_id,
        rolesCount: sessionUser.ims_roles?.length || 0,
        permsCount: sessionUser.ims_permissions?.length || 0,
        permissionKeys: sessionUser.ims_permissions?.map(p => p.permission_key) || []
      });
      return res.json({
        success: true,
        session: sessionUser,
        session_id: req.sessionID
      });
    }
    // No auto-login fallback - require proper authentication
    // Users must either:
    // 1. Come from DS with SSO token (handled by /api/sso-login)
    // 2. Use the login page (handled by /api/auth/login)
  } catch (error) {
    console.error('❌ Error getting session user:', error);
  }
  // No session found - return null to redirect to login
  console.log('⚠️  No active session - user needs to log in');
  res.json({
    success: false,
    session: null,
    message: 'No active session'
  });
});
app.get('/api/session/current-user', (req, res) => {
  // Return current user info
  res.json({
    success: true,
    user: DEFAULT_SESSION
  });
});
// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the relative path that can be used to access the file
    const filePath = `tender-files/${req.file.filename}`;
    res.json({ 
      success: true,
      filePath: filePath,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `http://localhost:3001/uploads/${filePath}`
    });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});
// ============================================================================
// IMS ROLE & PERMISSION API ENDPOINTS
// ============================================================================
// Check if user has a specific permission
app.get('/api/ims/check-permission', requireAuth, async (req, res) => {
  try {
    const { permission } = req.query;
    if (!permission) {
      return res.status(400).json({ error: 'Permission key is required' });
    }
    console.log('🔐 Permission check for:', permission, 'userId:', req.session.userId);
    console.log('🔐 Session exists:', !!req.session);
    if (!pool) {
      console.log('🔐 No pool, returning true for dev mode');
      return res.json({ hasPermission: true }); // Allow in dev mode
    }
    const result = await pool.request()
      .input('userId', sql.NVarChar(450), req.session.userId)
      .input('permissionKey', sql.NVarChar(100), permission)
      .query('SELECT dbo.fn_HasPermission(@userId, @permissionKey) as hasPermission');
    const rawValue = result.recordset[0]?.hasPermission;
    console.log('🔐 SQL result:', rawValue, 'type:', typeof rawValue);
    console.log('🔐 Comparison:', rawValue === 1, rawValue === true);
    const hasPermission = rawValue === 1 || rawValue === true;
    console.log('🔐 Final result:', hasPermission);
    res.json({ 
      hasPermission: hasPermission,
      permission: permission,
      debug: {
        userId: req.session.userId,
        rawValue: rawValue,
        rawValueType: typeof rawValue,
        comparison1: rawValue === 1,
        comparison2: rawValue === true
      }
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
});
// Get current user's IMS roles
app.get('/api/ims/my-roles', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.json({ roles: [], permissions: [], is_super_admin: false });
    }
    const imsData = await getUserImsData(req.session.userId);
    res.json({
      roles: imsData?.roles || [],
      permissions: imsData?.permissions || [],
      is_super_admin: imsData?.is_super_admin || false
    });
  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({ error: 'Failed to retrieve roles' });
  }
});
// Get all available IMS roles (requires auth)
app.get('/api/ims/roles', requireAuth, async (req, res) => {
  try {
    console.log('📋 Fetching IMS roles...');
    if (!pool) {
      console.log('⚠️  No database pool');
      return res.json([]);
    }
    const result = await pool.request().query(`
      SELECT 
        id as role_id,
        role_name,
        display_name,
        description,
        is_system_role,
        created_at,
        (SELECT COUNT(*) FROM ims_user_roles WHERE role_id = r.id) as user_count,
        (SELECT COUNT(*) FROM ims_role_permissions WHERE role_id = r.id) as permission_count
      FROM ims_roles r
      ORDER BY 
        CASE 
          WHEN role_name = 'IMS_SUPER_ADMIN' THEN 1
          WHEN role_name = 'IMS_ADMIN' THEN 2
          WHEN role_name = 'WING_SUPERVISOR' THEN 3
          WHEN role_name = 'GENERAL_USER' THEN 4
          ELSE 5
        END,
        display_name
    `);
    console.log(`✅ Found ${result.recordset.length} roles`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ error: 'Failed to retrieve roles' });
  }
});
// Create new custom role (requires roles.manage permission)
app.post('/api/ims/roles', requireAuth, requirePermission('roles.manage'), async (req, res) => {
  try {
    const { display_name, description, permission_keys } = req.body;
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    // Generate role name from display name (uppercase, spaces to underscores)
    const role_name = 'CUSTOM_' + display_name.toUpperCase().replace(/\s+/g, '_');
    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Check if role name already exists
      const existing = await transaction.request()
        .input('roleName', sql.NVarChar(100), role_name)
        .query('SELECT id FROM dbo.ims_roles WHERE role_name = @roleName');
      if (existing.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'A role with this name already exists' });
      }
      // Insert new role - generate GUID using NEWID() in SQL
      const insertResult = await transaction.request()
        .input('roleName', sql.NVarChar(100), role_name)
        .input('displayName', sql.NVarChar(255), display_name)
        .input('description', sql.NVarChar(500), description || null)
        .input('isSystemRole', sql.Bit, 0)
        .query(`
          INSERT INTO dbo.ims_roles (id, role_name, display_name, description, is_system_role, created_at)
          VALUES (NEWID(), @roleName, @displayName, @description, @isSystemRole, GETDATE());
          SELECT id FROM dbo.ims_roles WHERE role_name = @roleName
        `);
      const roleId = insertResult.recordset[0]?.id;
      if (!roleId) {
        await transaction.rollback();
        return res.status(500).json({ error: 'Failed to retrieve created role ID' });
      }
      // Add permissions if provided
      if (permission_keys && Array.isArray(permission_keys) && permission_keys.length > 0) {
        for (const permKey of permission_keys) {
          await transaction.request()
            .input('roleId', sql.UniqueIdentifier, roleId)
            .input('permKey', sql.NVarChar(100), permKey)
            .query(`
              INSERT INTO dbo.ims_role_permissions (role_id, permission_id)
              SELECT @roleId, id
              FROM dbo.ims_permissions
              WHERE permission_key = @permKey
            `);
        }
      }
      await transaction.commit();
      res.json({
        success: true,
        message: 'Role created successfully',
        role_id: roleId,
        role_name: role_name,
        display_name: display_name
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating role:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create role' });
  }
});
// Get role details with permissions (requires auth)
app.get('/api/ims/roles/:roleId', requireAuth, async (req, res) => {
  try {
    const { roleId } = req.params;
    if (!pool) {
      return res.json(null);
    }
    // Get role details
    const roleResult = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query(`
        SELECT 
          id as role_id,
          role_name,
          display_name,
          description,
          is_system_role,
          created_at,
          (SELECT COUNT(*) FROM ims_user_roles WHERE role_id = @roleId) as user_count
        FROM ims_roles
        WHERE id = @roleId
      `);
    if (roleResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    // Get role permissions
    const permsResult = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query(`
        SELECT 
          p.id as permission_id,
          p.permission_key,
          p.module_name,
          p.action_name,
          p.description
        FROM ims_role_permissions rp
        INNER JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = @roleId
        ORDER BY p.module_name, p.action_name
      `);
    // Get users with this role
    const usersResult = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query(`
        SELECT 
          u.Id as user_id,
          u.FullName as full_name,
          u.Email,
          u.CNIC,
          ur.scope_type,
          ur.assigned_at,
          ur.assigned_by,
          assignedBy.FullName as assigned_by_name
        FROM ims_user_roles ur
        INNER JOIN AspNetUsers u ON ur.user_id = u.Id
        LEFT JOIN AspNetUsers assignedBy ON ur.assigned_by = assignedBy.Id
        WHERE ur.role_id = @roleId AND ur.is_active = 1
        ORDER BY u.FullName
      `);
    res.json({
      ...roleResult.recordset[0],
      permissions: permsResult.recordset,
      users: usersResult.recordset
    });
  } catch (error) {
    console.error('Error getting role details:', error);
    res.status(500).json({ error: 'Failed to retrieve role details' });
  }
});
// Update role permissions (requires roles.manage permission)
app.put('/api/ims/roles/:roleId/permissions', requireAuth, requirePermission('roles.manage'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permission_keys } = req.body;
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    if (!permission_keys || !Array.isArray(permission_keys)) {
      return res.status(400).json({ error: 'permission_keys array is required' });
    }
    // Check if role is IMS_SUPER_ADMIN (protected)
    const roleCheck = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query('SELECT role_name FROM ims_roles WHERE id = @roleId');
    if (roleCheck.recordset[0]?.role_name === 'IMS_SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify IMS_SUPER_ADMIN role permissions' });
    }
    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Delete existing permissions
      await transaction.request()
        .input('roleId', sql.UniqueIdentifier, roleId)
        .query('DELETE FROM ims_role_permissions WHERE role_id = @roleId');
      // Insert new permissions
      for (const permKey of permission_keys) {
        await transaction.request()
          .input('roleId', sql.UniqueIdentifier, roleId)
          .input('permKey', sql.NVarChar(100), permKey)
          .query(`
            INSERT INTO ims_role_permissions (role_id, permission_id)
            SELECT @roleId, id
            FROM ims_permissions
            WHERE permission_key = @permKey
          `);
      }
      await transaction.commit();
      res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});
// Get all available permissions (Super Admin only)
app.get('/api/ims/permissions', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.json([]);
    }
    const result = await pool.request().query(`
      SELECT 
        id as permission_id,
        permission_key,
        module_name,
        action_name,
        description,
        created_at
      FROM ims_permissions
      ORDER BY module_name, action_name
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ error: 'Failed to retrieve permissions' });
  }
});
// Get users with their IMS roles
app.get('/api/ims/users', requireAuth, async (req, res) => {
  try {
    const { search, office_id, wing_id, role_name } = req.query;
    const userId = req.session.userId;
    console.log('🔍 BACKEND DEBUG: /api/ims/users called with params:', { search, office_id, wing_id, role_name });
    if (!pool) {
      console.log('❌ BACKEND DEBUG: No pool available');
      return res.json([]);
    }
    let query = `
      SELECT DISTINCT
        u.Id as user_id,
        u.FullName as full_name,
        u.Email,
        u.CNIC as cnic,
        u.intOfficeID as office_id,
        u.intWingID as wing_id,
        u.intDesignationID as designation_id,
        o.strOfficeName as office_name,
        w.Name as wing_name,
        COALESCE(d.strDesignation, 'Not Assigned') as designation_name,
        dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
      FROM AspNetUsers u
      LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
      LEFT JOIN WingsInformation w ON u.intWingID = w.Id
      LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
      WHERE u.ISACT = 1
    `;
    const request = pool.request();
    if (search) {
      query += ` AND (u.FullName LIKE @search OR u.Email LIKE @search OR u.CNIC LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (wing_id) {
      query += ` AND u.intWingID = @wingId AND u.intWingID > 0`;
      request.input('wingId', sql.Int, parseInt(wing_id));
    }
    // Always exclude users with unassigned wings (intWingID = 0)
    if (!wing_id) {
      query += ` AND (u.intWingID > 0 OR u.intWingID IS NULL)`;
    }
    if (role_name) {
      query += ` AND EXISTS (
        SELECT 1 FROM ims_user_roles ur
        INNER JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = u.Id AND r.role_name = @roleName AND ur.is_active = 1
      )`;
      request.input('roleName', sql.NVarChar, role_name);
    }
    query += ` ORDER BY u.FullName`;
    console.log('🔍 BACKEND DEBUG: Final SQL Query:', query);
    const result = await request.query(query);
    console.log('✅ BACKEND DEBUG: Query returned', result.recordset.length, 'users');
    // Fetch roles separately for each user (SQL Server 2012 compatible)
    const users = await Promise.all(result.recordset.map(async (user) => {
      const rolesResult = await pool.request()
        .input('userId', sql.NVarChar(450), user.user_id)
        .query(`
          SELECT 
            ur.id as user_role_id,
            r.role_name,
            r.display_name,
            ur.scope_type,
            ur.scope_wing_id
          FROM ims_user_roles ur
          INNER JOIN ims_roles r ON ur.role_id = r.id
          WHERE ur.user_id = @userId AND ur.is_active = 1
        `);
      return {
        ...user,
        roles: rolesResult.recordset
      };
    }));
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});
// Assign role to user (Super Admin or IMS Admin)
app.post('/api/ims/users/:userId/roles', requireAuth, requirePermission('users.manage'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id, scope_type, scope_wing_id, notes } = req.body;
    console.log('📝 Role assignment request:', {
      userId,
      role_id,
      scope_type,
      scope_wing_id,
      assigned_by: req.session.userId,
      session: req.session
    });
    if (!role_id) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    // Check if user exists
    const userCheck = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query('SELECT Id FROM AspNetUsers WHERE Id = @userId AND ISACT = 1');
    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check if role exists
    const roleCheck = await pool.request()
      .input('roleId', sql.UniqueIdentifier, role_id)
      .query('SELECT id, role_name FROM ims_roles WHERE id = @roleId');
    if (roleCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    // Check if user already has this role with same scope
    const existingCheck = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('roleId', sql.UniqueIdentifier, role_id)
      .input('scopeType', sql.NVarChar(50), scope_type || 'Global')
      .input('scopeWingId', sql.Int, scope_wing_id || null)
      .query(`
        SELECT id FROM ims_user_roles
        WHERE user_id = @userId 
        AND role_id = @roleId
        AND scope_type = @scopeType
        AND (scope_wing_id = @scopeWingId OR (scope_wing_id IS NULL AND @scopeWingId IS NULL))
      `);
    if (existingCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'User already has this role with the same scope' });
    }
    // Assign role
    await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('roleId', sql.UniqueIdentifier, role_id)
      .input('scopeType', sql.NVarChar(50), scope_type || 'Global')
      .input('scopeWingId', sql.Int, scope_wing_id || null)
      .input('assignedBy', sql.NVarChar(450), req.session.userId)
      .input('notes', sql.NVarChar(sql.MAX), notes || null)
      .query(`
        INSERT INTO ims_user_roles (user_id, role_id, scope_type, scope_wing_id, assigned_by, notes)
        VALUES (@userId, @roleId, @scopeType, @scopeWingId, @assignedBy, @notes)
      `);
    // Log to audit
    await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('roleId', sql.UniqueIdentifier, role_id)
      .input('action', sql.NVarChar(50), 'ASSIGNED')
      .input('performedBy', sql.NVarChar(450), req.session.userId)
      .input('notes', sql.NVarChar(sql.MAX), notes || 'Role assigned via API')
      .query(`
        INSERT INTO ims_role_audit_log (user_id, role_id, action, performed_by, notes)
        VALUES (@userId, @roleId, @action, @performedBy, @notes)
      `);
    res.json({ 
      success: true,
      message: 'Role assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state,
      procedure: error.procedure
    });
    res.status(500).json({ 
      error: error.message || 'Failed to assign role',
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
});
// Revoke role from user (Super Admin or IMS Admin)
app.delete('/api/ims/users/:userId/roles/:userRoleId', requireAuth, requirePermission('users.manage'), async (req, res) => {
  try {
    const { userId, userRoleId } = req.params;
    const { reason } = req.body || {}; // Handle undefined body for DELETE requests
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    // Get role details before deletion
    const roleDetails = await pool.request()
      .input('userRoleId', sql.UniqueIdentifier, userRoleId)
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT role_id, scope_type, scope_wing_id
        FROM ims_user_roles
        WHERE id = @userRoleId AND user_id = @userId
      `);
    if (roleDetails.recordset.length === 0) {
      return res.status(404).json({ error: 'Role assignment not found' });
    }
    const roleId = roleDetails.recordset[0].role_id;
    // Delete role assignment
    await pool.request()
      .input('userRoleId', sql.UniqueIdentifier, userRoleId)
      .query('DELETE FROM ims_user_roles WHERE id = @userRoleId');
    // Log to audit
    await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('roleId', sql.UniqueIdentifier, roleId)
      .input('action', sql.NVarChar(50), 'REVOKED')
      .input('performedBy', sql.NVarChar(450), req.session.userId)
      .input('notes', sql.NVarChar(sql.MAX), reason || 'Role revoked via API')
      .query(`
        INSERT INTO ims_role_audit_log (user_id, role_id, action, performed_by, notes)
        VALUES (@userId, @roleId, @action, @performedBy, @notes)
      `);
    res.json({ 
      success: true,
      message: 'Role revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking role:', error);
    res.status(500).json({ error: 'Failed to revoke role' });
  }
});
// Get role audit log (Super Admin only)
app.get('/api/ims/audit-log', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { user_id, role_id, limit } = req.query;
    if (!pool) {
      return res.json([]);
    }
    let query = `
      SELECT TOP ${limit || 100}
        al.log_id,
        al.user_id,
        u.FullName as user_name,
        u.Email as user_email,
        al.role_id,
        r.display_name as role_name,
        al.action,
        al.performed_by,
        pb.FullName as performed_by_name,
        al.performed_at,
        al.notes
      FROM ims_role_audit_log al
      INNER JOIN AspNetUsers u ON al.user_id = u.Id
      LEFT JOIN ims_roles r ON al.role_id = r.role_id
      LEFT JOIN AspNetUsers pb ON al.performed_by = pb.Id
      WHERE 1=1
    `;
    const request = pool.request();
    if (user_id) {
      query += ` AND al.user_id = @userId`;
      request.input('userId', sql.NVarChar(450), user_id);
    }
    if (role_id) {
      query += ` AND al.role_id = @roleId`;
      request.input('roleId', sql.UniqueIdentifier, role_id);
    }
    query += ` ORDER BY al.performed_at DESC`;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log' });
  }
});
// ============================================================================
// END IMS ROLE & PERMISSION API ENDPOINTS
// ============================================================================
// Get all active offices
app.get('/api/offices', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockOffices = [
        { intOfficeID: 1, strOfficeName: 'Head Office', strOfficeDescription: 'Main headquarters', strTelephoneNumber: '021-1234567', strEmail: 'head@company.com', OfficeCode: 'HO001' },
        { intOfficeID: 2, strOfficeName: 'Branch Office Karachi', strOfficeDescription: 'Karachi branch', strTelephoneNumber: '021-7654321', strEmail: 'karachi@company.com', OfficeCode: 'KHI001' },
        { intOfficeID: 3, strOfficeName: 'Branch Office Lahore', strOfficeDescription: 'Lahore branch', strTelephoneNumber: '042-1234567', strEmail: 'lahore@company.com', OfficeCode: 'LHR001' }
      ];
      return res.json(mockOffices);
    }
    const result = await pool.request().query(`
      SELECT 
        intOfficeID,
        strOfficeName,
        strOfficeDescription,
        strTelephoneNumber,
        strEmail,
        OfficeCode,
        IS_ACT,
        IS_DELETED,
        CreatedAt,
        UpdatedAt,
        CreatedBy,
        UpdatedBy,
        Version,
        CRT_BY,
        CRT_AT,
        LST_MOD_BY,
        LST_MOD_AT,
        DEL_BY,
        DEL_AT,
        DEL_IP,
        strFax,
        strGPSCoords,
        strPhotoPath,
        intProvinceID,
        intDivisionID,
        intDistrictID,
        intConstituencyID
      FROM tblOffices 
      WHERE IS_ACT = 1 AND (IS_DELETED = 0 OR IS_DELETED IS NULL)
      ORDER BY strOfficeName
    `);
    res.json(result.recordset);
  } catch (error) {
    // Fallback to mock data on any error
    const mockOffices = [
      { intOfficeID: 1, strOfficeName: 'Head Office', strOfficeDescription: 'Main headquarters', strTelephoneNumber: '021-1234567', strEmail: 'head@company.com', OfficeCode: 'HO001' },
      { intOfficeID: 2, strOfficeName: 'Branch Office Karachi', strOfficeDescription: 'Karachi branch', strTelephoneNumber: '021-7654321', strEmail: 'karachi@company.com', OfficeCode: 'KHI001' },
      { intOfficeID: 3, strOfficeName: 'Branch Office Lahore', strOfficeDescription: 'Lahore branch', strTelephoneNumber: '042-1234567', strEmail: 'lahore@company.com', OfficeCode: 'LHR001' }
    ];
    res.json(mockOffices);
  }
});
// Get all offices for filter dropdown
app.get('/api/offices', async (req, res) => {
  try {
    if (!pool) {
      // Return mock offices when SQL Server is not connected
      const mockOffices = [
        { intOfficeID: 583, strOfficeName: 'ECP Secretariat' },
        { intOfficeID: 584, strOfficeName: 'PEC Balochistan' },
        { intOfficeID: 585, strOfficeName: 'PEC Khyber Pakhtunkhwa' },
        { intOfficeID: 586, strOfficeName: 'PEC Punjab' },
        { intOfficeID: 587, strOfficeName: 'PEC Sindh' }
      ];
      return res.json(mockOffices);
    }
    const result = await pool.request().query(`
      SELECT 
        intOfficeID,
        strOfficeName
      FROM tblOffices
      ORDER BY strOfficeName
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching offices:', error);
    // Fallback to mock data on any error
    const mockOffices = [
      { intOfficeID: 583, strOfficeName: 'ECP Secretariat' },
      { intOfficeID: 584, strOfficeName: 'PEC Balochistan' },
      { intOfficeID: 585, strOfficeName: 'PEC Khyber Pakhtunkhwa' },
      { intOfficeID: 586, strOfficeName: 'PEC Punjab' },
      { intOfficeID: 587, strOfficeName: 'PEC Sindh' }
    ];
    res.json(mockOffices);
  }
});
// Get all active wings
app.get('/api/wings', async (req, res) => {
  try {
    const { office_id } = req.query;
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockWings = [
        { Id: 1, Name: 'Administration Wing', ShortName: 'Admin', FocalPerson: 'John Smith', ContactNo: '021-1111111', WingCode: 'ADM001', OfficeID: office_id || 583 },
        { Id: 2, Name: 'Finance Wing', ShortName: 'Finance', FocalPerson: 'Jane Doe', ContactNo: '021-2222222', WingCode: 'FIN001', OfficeID: office_id || 583 },
        { Id: 3, Name: 'Operations Wing', ShortName: 'Operations', FocalPerson: 'Mike Johnson', ContactNo: '021-3333333', WingCode: 'OPS001', OfficeID: office_id || 583 }
      ];
      return res.json(mockWings);
    }
    let query = `
      SELECT 
        Id,
        Name,
        ShortName,
        FocalPerson,
        ContactNo,
        Creator,
        CreateDate,
        Modifier,
        ModifyDate,
        OfficeID,
        IS_ACT,
        HODID,
        HODName,
        WingCode,
        CreatedAt,
        UpdatedAt
      FROM WingsInformation 
      WHERE IS_ACT = 1`;
    // If office_id is provided, filter by that office
    if (office_id) {
      query += ` AND OfficeID = ${parseInt(office_id)}`;
    }
    query += ` ORDER BY Name`;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching wings:', error);
    // Fallback to mock data on any error
    const mockWings = [
      { Id: 1, Name: 'Administration Wing', ShortName: 'Admin', FocalPerson: 'John Smith', ContactNo: '021-1111111', WingCode: 'ADM001' },
      { Id: 2, Name: 'Finance Wing', ShortName: 'Finance', FocalPerson: 'Jane Doe', ContactNo: '021-2222222', WingCode: 'FIN001' },
      { Id: 3, Name: 'Operations Wing', ShortName: 'Operations', FocalPerson: 'Mike Johnson', ContactNo: '021-3333333', WingCode: 'OPS001' }
    ];
    res.json(mockWings);
  }
});
// Get all active DECs
app.get('/api/decs', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockDecs = [
        { intAutoID: 1, WingID: 1, DECName: 'Human Resources DEC', DECAcronym: 'HR', DECAddress: 'Block A, Office Complex', Location: 'Islamabad', DECCode: 'HR001' },
        { intAutoID: 2, WingID: 2, DECName: 'Information Technology DEC', DECAcronym: 'IT', DECAddress: 'Block B, Office Complex', Location: 'Karachi', DECCode: 'IT001' },
        { intAutoID: 3, WingID: 3, DECName: 'Procurement DEC', DECAcronym: 'PROC', DECAddress: 'Block C, Office Complex', Location: 'Lahore', DECCode: 'PROC001' }
      ];
      return res.json(mockDecs);
    }
    const result = await pool.request().query(`
      SELECT DISTINCT
        DECID as intAutoID,
        WingID,
        DECName,
        DECID as DEC_ID
      FROM vw_Full_hirarcy_Office_to_Employee
      WHERE DECID IS NOT NULL
      ORDER BY DECName
    `);
    console.log(`✅ Loaded ${result.recordset.length} DECs from hierarchy view`);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching DECs from database:', error);
    // Fallback to mock data on any error
    const mockDecs = [
      { intAutoID: 1, WingID: 1, DECName: 'Human Resources DEC', DECAcronym: 'HR', DECAddress: 'Block A, Office Complex', Location: 'Islamabad', DECCode: 'HR001' },
      { intAutoID: 2, WingID: 2, DECName: 'Information Technology DEC', DECAcronym: 'IT', DECAddress: 'Block B, Office Complex', Location: 'Karachi', DECCode: 'IT001' },
      { intAutoID: 3, WingID: 3, DECName: 'Procurement DEC', DECAcronym: 'PROC', DECAddress: 'Block C, Office Complex', Location: 'Lahore', DECCode: 'PROC001' }
    ];
    res.json(mockDecs);
  }
});
// Get office names by IDs
app.get('/api/offices/names', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ names: [] });
    }
    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    if (idList.length === 0) {
      return res.json({ names: [] });
    }
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockNames = idList.map((id, index) => `Office ${id}`);
      return res.json({ names: mockNames });
    }
    const placeholders = idList.map((_, index) => `@id${index}`).join(',');
    const request = pool.request();
    idList.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });
    const result = await request.query(`
      SELECT strOfficeName 
      FROM Office_MST 
      WHERE intOfficeID IN (${placeholders}) AND IS_ACT = 1
      ORDER BY strOfficeName
    `);
    const names = result.recordset.map(row => row.strOfficeName);
    res.json({ names });
  } catch (error) {
    console.error('Error fetching office names:', error);
    res.json({ names: [] });
  }
});
// Get wing names by IDs
app.get('/api/wings/names', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ names: [] });
    }
    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    if (idList.length === 0) {
      return res.json({ names: [] });
    }
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockNames = idList.map((id, index) => `Wing ${id}`);
      return res.json({ names: mockNames });
    }
    const placeholders = idList.map((_, index) => `@id${index}`).join(',');
    const request = pool.request();
    idList.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });
    const result = await request.query(`
      SELECT WingName 
      FROM Wing_MST 
      WHERE intAutoID IN (${placeholders}) AND IS_ACT = 'true'
      ORDER BY WingName
    `);
    const names = result.recordset.map(row => row.WingName);
    res.json({ names });
  } catch (error) {
    console.error('Error fetching wing names:', error);
    res.json({ names: [] });
  }
});
// Get DEC names by IDs
app.get('/api/decs/names', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ names: [] });
    }
    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    if (idList.length === 0) {
      return res.json({ names: [] });
    }
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockNames = idList.map((id, index) => `DEC ${id}`);
      return res.json({ names: mockNames });
    }
    const placeholders = idList.map((_, index) => `@id${index}`).join(',');
    const request = pool.request();
    idList.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });
    const result = await request.query(`
      SELECT DECName 
      FROM DEC_MST 
      WHERE intAutoID IN (${placeholders}) AND IS_ACT = 'true'
      ORDER BY DECName
    `);
    const names = result.recordset.map(row => row.DECName);
    res.json({ names });
  } catch (error) {
    console.error('Error fetching DEC names:', error);
    res.json({ names: [] });
  }
});
// Get all active users from AspNetUsers
app.get('/api/users', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockUsers = [
        { Id: '1', FullName: 'John Doe', UserName: 'john.doe', Email: 'john.doe@company.com', Role: 'Admin', intOfficeID: 583, intWingID: 16, ISACT: true },
        { Id: '2', FullName: 'Jane Smith', UserName: 'jane.smith', Email: 'jane.smith@company.com', Role: 'User', intOfficeID: 584, intWingID: 17, ISACT: true },
        { Id: '3', FullName: 'Mike Johnson', UserName: 'mike.johnson', Email: 'mike.johnson@company.com', Role: 'Manager', intOfficeID: 585, intWingID: 18, ISACT: true }
      ];
      return res.json(mockUsers);
    }
    const result = await pool.request().query(`
      SELECT 
        Id,
        FullName,
        FatherOrHusbandName,
        CNIC,
        UserName,
        Email,
        PhoneNumber,
        Role,
        intOfficeID,
        intWingID,
        intBranchID,
        intDesignationID,
        ISACT,
        AddedOn,
        LastLoggedIn,
        Gender,
        ProfilePhoto,
        UID
      FROM AspNetUsers 
      WHERE ISACT = 1
      ORDER BY FullName
    `);
    res.json(result.recordset);
  } catch (error) {
    // Fallback to mock data on any error
    const mockUsers = [
      { Id: '1', FullName: 'John Doe', UserName: 'john.doe', Email: 'john.doe@company.com', Role: 'Admin', intOfficeID: 583, intWingID: 16, ISACT: true },
      { Id: '2', FullName: 'Jane Smith', UserName: 'jane.smith', Email: 'jane.smith@company.com', Role: 'User', intOfficeID: 584, intWingID: 17, ISACT: true },
      { Id: '3', FullName: 'Mike Johnson', UserName: 'mike.johnson', Email: 'mike.johnson@company.com', Role: 'Manager', intOfficeID: 585, intWingID: 18, ISACT: true }
    ];
    res.json(mockUsers);
  }
});
// Get users for approval forwarding (formatted for dropdown)
app.get('/api/users/approvers', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockUsers = [
        { 
          Id: '1', 
          FullName: 'John Doe', 
          UserName: 'john.doe', 
          Role: 'Admin', 
          displayName: 'John Doe (Admin)',
          designation: 'System Administrator'
        },
        { 
          Id: '2', 
          FullName: 'Jane Smith', 
          UserName: 'jane.smith', 
          Role: 'Manager', 
          displayName: 'Jane Smith (Manager)',
          designation: 'Department Manager'
        },
        { 
          Id: '3', 
          FullName: 'Mike Johnson', 
          UserName: 'mike.johnson', 
          Role: 'Approver', 
          displayName: 'Mike Johnson (Approver)',
          designation: 'Senior Officer'
        }
      ];
      return res.json(mockUsers);
    }
    const result = await pool.request().query(`
      SELECT 
        u.Id,
        u.FullName,
        u.UserName,
        u.Email,
        u.Role,
        u.intOfficeID,
        u.intWingID,
        u.intDesignationID,
        d.DesignationName as designation,
        o.strOfficeName as officeName,
        w.WingName as wingName,
        CONCAT(u.FullName, ' (', COALESCE(d.DesignationName, u.Role), ')') as displayName
      FROM AspNetUsers u
      LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
      LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
      LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
      WHERE u.ISACT = 1
      ORDER BY u.FullName
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching approvers:', error);
    // Fallback to mock data on any error
    const mockUsers = [
      { 
        Id: '1', 
        FullName: 'John Doe', 
        UserName: 'john.doe', 
        Role: 'Admin', 
        displayName: 'John Doe (Admin)',
        designation: 'System Administrator'
      },
      { 
        Id: '2', 
        FullName: 'Jane Smith', 
        UserName: 'jane.smith', 
        Role: 'Manager', 
        displayName: 'Jane Smith (Manager)',
        designation: 'Department Manager'
      }
    ];
    res.json(mockUsers);
  }
});
// Get single user details
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      // Return mock data
      const mockUser = {
        Id: id,
        FullName: 'John Doe',
        UserName: 'john.doe',
        Email: 'john.doe@company.com',
        Role: 'Admin',
        designation: 'System Administrator'
      };
      return res.json(mockUser);
    }
    const result = await pool.request()
      .input('userId', sql.NVarChar, id)
      .query(`
        SELECT 
          u.Id,
          u.FullName,
          u.FatherOrHusbandName,
          u.CNIC,
          u.UserName,
          u.Email,
          u.PhoneNumber,
          u.Role,
          u.intOfficeID,
          u.intWingID,
          u.intBranchID,
          u.intDesignationID,
          u.Gender,
          u.AddedOn,
          u.LastLoggedIn,
          d.DesignationName as designation,
          o.strOfficeName as officeName,
          w.WingName as wingName
        FROM AspNetUsers u
        LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
        LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
        LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
        WHERE u.Id = @userId AND u.ISACT = 1
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get wings by office
app.get('/api/offices/:officeId/wings', async (req, res) => {
  try {
    const { officeId } = req.params;
    const result = await pool.request()
      .input('officeId', sql.Int, officeId)
      .query(`
        SELECT 
          Id,
          Name,
          ShortName,
          FocalPerson,
          ContactNo,
          Creator,
          CreateDate,
          Modifier,
          ModifyDate,
          OfficeID,
          IS_ACT,
          HODID,
          HODName,
          WingCode,
          CreatedAt,
          UpdatedAt
        FROM WingsInformation 
        WHERE OfficeID = @officeId AND IS_ACT = 1
        ORDER BY Name
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wings by office', details: error.message });
  }
});
// Get DECs by wing
app.get('/api/wings/:wingId/decs', async (req, res) => {
  try {
    const { wingId } = req.params;
    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT 
          intAutoID,
          WingID,
          DECName,
          DECAcronym,
          DECAddress,
          Location,
          IS_ACT,
          DateAdded,
          DECCode,
          HODID,
          HODName,
          CreatedAt,
          UpdatedAt,
          CreatedBy,
          UpdatedBy,
          Version
        FROM DEC_MST 
        WHERE WingID = @wingId AND IS_ACT = 1
        ORDER BY DECName
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch DECs by wing', details: error.message });
  }
});
// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.request().query('SELECT 1 as test');
      res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'error', error: error.message });
  }
});
// Check if inventoryuser exists
app.get('/api/check-user', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    // Check if inventoryuser exists
    const userCheck = await pool.request().query(`
      SELECT 
        name,
        type_desc,
        create_date,
        modify_date,
        is_disabled
      FROM sys.server_principals 
      WHERE name = 'inventoryuser'
    `);
    // Check database users
    const dbUserCheck = await pool.request().query(`
      SELECT 
        name,
        type_desc,
        create_date,
        modify_date
      FROM sys.database_principals 
      WHERE name = 'inventoryuser'
    `);
    // Check current user
    const currentUser = await pool.request().query('SELECT SYSTEM_USER as current_user, USER_NAME() as database_user');
    res.json({
      serverLogin: userCheck.recordset,
      databaseUser: dbUserCheck.recordset,
      currentConnection: currentUser.recordset[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check user', details: error.message });
  }
});
// =============================================================================
// STOCK ISSUANCE API ENDPOINTS (REBUILT FROM SCRATCH)
// =============================================================================
// Submit stock issuance request
app.post('/api/stock-issuance/requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const {
      request_number,
      request_type,
      requester_office_id,
      requester_wing_id,
      requester_branch_id,
      requester_user_id,
      purpose,
      urgency_level,
      justification,
      expected_return_date,
      is_returnable,
      request_status = 'Submitted'
    } = req.body;
    // Insert stock issuance request
    const requestResult = await pool.request()
      .input('request_number', sql.NVarChar, request_number)
      .input('request_type', sql.NVarChar, request_type)
      .input('requester_office_id', sql.Int, requester_office_id)
      .input('requester_wing_id', sql.Int, requester_wing_id)
      .input('requester_branch_id', sql.NVarChar, requester_branch_id)
      .input('requester_user_id', sql.UniqueIdentifier, requester_user_id)
      .input('purpose', sql.NVarChar, purpose)
      .input('urgency_level', sql.NVarChar, urgency_level)
      .input('justification', sql.NVarChar, justification)
      .input('expected_return_date', sql.NVarChar, expected_return_date)
      .input('is_returnable', sql.Bit, is_returnable)
      .input('request_status', sql.NVarChar, request_status)
      .query(`
        INSERT INTO stock_issuance_requests (
          id, request_number, request_type, requester_office_id, requester_wing_id,
          requester_branch_id, requester_user_id, purpose, urgency_level, 
          justification, expected_return_date, is_returnable, request_status,
          submitted_at, created_at, updated_at
        ) 
        OUTPUT INSERTED.id, INSERTED.request_number
        VALUES (
          NEWID(), @request_number, @request_type, @requester_office_id, @requester_wing_id,
          @requester_branch_id, @requester_user_id, @purpose, @urgency_level,
          @justification, @expected_return_date, @is_returnable, @request_status,
          GETDATE(), GETDATE(), GETDATE()
        )
      `);
    // Automatically submit for approval
    const requestId = requestResult.recordset[0].id;
    const workflowId = 'D806EC95-FB78-4187-8FC2-87B897C124A4'; // Stock Issuance Approval workflow
    const userId = req.session?.userId || requester_user_id; // Use session user or requester
    try {
      let firstApproverId = null;
      // For Individual requests: Use hierarchy-based supervisor lookup
      // For Organizational requests: Use Wing HOD lookup
      if (request_type === 'Individual' && requester_user_id) {
        console.log('🔍 Individual request - Looking up supervisor for requester_user_id:', requester_user_id);
        const supervisorResult = await pool.request()
          .input('user_id', sql.NVarChar, requester_user_id)
          .query(`
            SELECT 
              boss_view.Id as BossAspNetUsersId, 
              boss_view.FullName as BossName,
              emp_view.FullName as EmployeeName,
              emp_view.EmployeeID as EmpEmployeeID,
              hierarchy.BossID as BossEmployeeID
            FROM vw_AspNetUser_with_Reg_App_DEC_ID emp_view
            INNER JOIN LEAVE_APPROVAL_HIERARCHY hierarchy ON emp_view.EmployeeID = hierarchy.EmployeeID
            INNER JOIN vw_AspNetUser_with_Reg_App_DEC_ID boss_view ON hierarchy.BossID = boss_view.EmployeeID
            WHERE emp_view.Id = @user_id
          `);
        console.log('🔍 Supervisor lookup result:', supervisorResult.recordset);
        if (supervisorResult.recordset.length > 0 && supervisorResult.recordset[0].BossAspNetUsersId) {
          // Found supervisor in hierarchy
          firstApproverId = supervisorResult.recordset[0].BossAspNetUsersId;
          console.log('👤 Auto-assigning to supervisor from hierarchy:', supervisorResult.recordset[0].BossName, '(', firstApproverId, ')');
        } else {
          console.log('⚠️ No supervisor found in hierarchy for Individual request, falling back to workflow approvers');
        }
      } else if (request_type === 'Organizational' && requester_wing_id) {
        console.log('🏢 Organizational request - Looking up Wing HOD for wing_id:', requester_wing_id);
        // For organizational requests, route to Wing HOD
        const wingResult = await pool.request()
          .input('wing_id', sql.Int, requester_wing_id)
          .query(`
            SELECT 
              u.Id as HODUserId,
              u.FullName as HODName,
              u.Email as HODEmail,
              w.Name as WingName
            FROM WingsInformation w
            LEFT JOIN AspNetUsers u ON u.FullName = w.HODName
            WHERE w.Id = @wing_id
          `);
        console.log('🔍 Wing HOD lookup result:', wingResult.recordset);
        if (wingResult.recordset.length > 0 && wingResult.recordset[0].HODUserId) {
          // Found Wing HOD
          firstApproverId = wingResult.recordset[0].HODUserId;
          console.log('👤 Auto-assigning to Wing HOD:', wingResult.recordset[0].HODName, '(', firstApproverId, ') for wing:', wingResult.recordset[0].WingName);
        } else {
          console.log('⚠️ No Wing HOD found for Organizational request, will use workflow approvers');
        }
      } else {
        console.log('🏢 Request type:', request_type, '- Using workflow approvers or hierarchy');
      }
      // If no approver found yet (Organizer/Department OR Individual without supervisor), use workflow_approvers
      if (!firstApproverId) {
        const workflowResult = await pool.request()
          .input('workflow_id', sql.UniqueIdentifier, workflowId)
          .query(`
            SELECT TOP 1 user_id 
            FROM workflow_approvers 
            WHERE workflow_id = @workflow_id AND can_approve = 1
            ORDER BY added_date
          `);
        if (workflowResult.recordset.length > 0) {
          firstApproverId = workflowResult.recordset[0].user_id;
          console.log('👤 Auto-assigning to workflow approver:', firstApproverId);
        }
      }
      if (firstApproverId) {
        // Create approval record
        const approvalResult = await pool.request()
          .input('request_id', sql.UniqueIdentifier, requestId)
          .input('request_type', sql.NVarChar, 'stock_issuance')
          .input('workflow_id', sql.UniqueIdentifier, workflowId)
          .input('current_approver_id', sql.NVarChar, firstApproverId)
          .input('current_status', sql.NVarChar, 'pending')
          .input('submitted_by', sql.NVarChar, userId)
          .query(`
            INSERT INTO request_approvals (request_id, request_type, workflow_id, current_approver_id, current_status, submitted_by)
            OUTPUT INSERTED.id
            VALUES (@request_id, @request_type, @workflow_id, @current_approver_id, @current_status, @submitted_by)
          `);
        const approvalId = approvalResult.recordset[0].id;
        console.log('✅ Approval record created with ID:', approvalId, 'for stock issuance request:', requestId);
        // Note: approval_items will be populated when items are submitted via /api/stock-issuance/items
        // Create notification for the assigned approver
        try {
          await createNotification(
            firstApproverId,
            '🔔 New Approval Request',
            `A new stock issuance request requires your approval. Request ID: ${requestId}`,
            'info',
            `/dashboard/approval-dashboard`,
            'View Request'
          );
        } catch (notificationError) {
          console.error('Failed to create notification for approver:', notificationError);
        }
      } else {
        console.warn('⚠️ No approvers found for stock issuance workflow');
      }
    } catch (approvalError) {
      console.error('❌ Failed to create approval record:', approvalError);
      // Don't fail the entire request, just log the error
    }
    res.json({
      success: true,
      data: requestResult.recordset[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create request', details: error.message });
  }
});
// Submit stock issuance items
app.post('/api/stock-issuance/items', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { request_id, items } = req.body;
    console.log('📝 Submitting items for request:', request_id);
    console.log('📝 Number of items:', items.length);
    // Insert multiple items
    const itemInserts = items.map(item => {
      return pool.request()
        .input('request_id', sql.UniqueIdentifier, request_id)
        .input('item_master_id', item.item_master_id ? sql.UniqueIdentifier : sql.UniqueIdentifier, item.item_master_id || null)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('requested_quantity', sql.Int, item.requested_quantity)
        .input('unit_price', sql.Decimal(10,2), item.unit_price || 0)
        .input('item_type', sql.NVarChar, item.item_type)
        .input('custom_item_name', sql.NVarChar, item.custom_item_name || null)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, item_master_id, nomenclature, requested_quantity,
            unit_price, item_type, custom_item_name, created_at, updated_at
          ) VALUES (
            NEWID(), @request_id, @item_master_id, @nomenclature, @requested_quantity,
            @unit_price, @item_type, @custom_item_name, GETDATE(), GETDATE()
          )
        `);
    });
    console.log('📝 Inserting', itemInserts.length, 'items into stock_issuance_items');
    await Promise.all(itemInserts);
    console.log('✅ Items inserted successfully');
    // Populate approval_items table for existing approval records
    try {
      console.log('📝 Looking for approval record for request:', request_id);
      // Check if there's an existing approval record for this request
      const approvalCheck = await pool.request()
        .input('requestId', sql.UniqueIdentifier, request_id)
        .query(`
          SELECT id FROM request_approvals 
          WHERE request_id = @requestId AND request_type = 'stock_issuance'
        `);
      console.log('📝 Approval records found:', approvalCheck.recordset.length);
      if (approvalCheck.recordset.length > 0) {
        const approvalId = approvalCheck.recordset[0].id;
        console.log('📋 Found existing approval record:', approvalId, 'for request:', request_id);
        // Get the newly inserted items
        const itemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request_id)
          .query(`
            SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity, unit_price
            FROM stock_issuance_items
            WHERE request_id = @requestId
          `);
        console.log('📝 Items found in stock_issuance_items:', itemsResult.recordset.length);
        if (itemsResult.recordset.length > 0) {
          // Insert into approval_items with decision_type = 'PENDING'
          const approvalItemInserts = itemsResult.recordset.map(item => {
            console.log('   → Adding to approval_items:', item.nomenclature);
            return pool.request()
              .input('approvalId', sql.UniqueIdentifier, approvalId)
              .input('itemId', sql.UniqueIdentifier, item.id)
              .input('itemMasterId', item.item_master_id ? sql.UniqueIdentifier : sql.UniqueIdentifier, item.item_master_id || null)
              .input('nomenclature', sql.NVarChar, item.nomenclature)
              .input('customItemName', sql.NVarChar, item.custom_item_name || null)
              .input('requestedQuantity', sql.Int, item.requested_quantity)
              .query(`
                INSERT INTO approval_items (
                  request_approval_id, id, item_master_id, nomenclature,
                  custom_item_name, requested_quantity, decision_type
                )
                VALUES (
                  @approvalId, @itemId, @itemMasterId, @nomenclature,
                  @customItemName, @requestedQuantity, 'PENDING'
                )
              `);
          });
          await Promise.all(approvalItemInserts);
          console.log('✅ Populated approval_items table with', itemsResult.recordset.length, 'items for approval ID:', approvalId);
        }
      } else {
        console.log('⚠️  No approval record found - items will not be added to approval_items');
      }
    } catch (approvalError) {
      console.error('❌ Failed to populate approval_items:', approvalError.message);
      // Don't fail the entire request, just log the error
    }
    res.json({ 
      success: true, 
      items_count: items.length,
      message: `Successfully created ${items.length} items`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create items', details: error.message });
  }
});
// Get stock issuance requests with proper JOINs
app.get('/api/stock-issuance/requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { status } = req.query;
    let whereClause = '';
    if (status) {
      whereClause = `WHERE sir.request_status = '${status}'`;
    }
    // Main query with proper field mappings
    const requestsQuery = `
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_office_id,
        sir.requester_wing_id,
        sir.requester_branch_id,
        sir.requester_user_id,
        sir.purpose,
        sir.urgency_level,
        sir.justification,
        sir.expected_return_date,
        sir.is_returnable,
        sir.request_status,
        sir.submitted_at,
        sir.created_at,
        sir.updated_at,
        -- Office information
        COALESCE(o.strOfficeName, 'Unknown Office') as office_name,
        COALESCE(CAST(o.OfficeCode AS NVARCHAR(50)), 'N/A') as office_code,
        -- Wing information  
        COALESCE(w.Name, 'Unknown Wing') as wing_name,
        COALESCE(w.ShortName, 'N/A') as wing_short_name,
        COALESCE(CAST(w.WingCode AS NVARCHAR(50)), 'N/A') as wing_code,
        -- User information
        COALESCE(u.FullName, 'Unknown User') as requester_full_name,
        COALESCE(u.Role, 'User') as requester_role,
        COALESCE(u.Email, 'N/A') as requester_email,
        COALESCE(u.UserName, 'N/A') as requester_username
      FROM stock_issuance_requests sir
      LEFT JOIN tblOffices o ON sir.requester_office_id = o.intOfficeID
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id  
      LEFT JOIN AspNetUsers u ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u.Id AS NVARCHAR(450))
      ${whereClause}
      ORDER BY sir.created_at DESC
    `;
    const result = await pool.request().query(requestsQuery);
    // Get items for each request
    const requestsWithItems = await Promise.all(
      result.recordset.map(async (request) => {
        try {
          const itemsResult = await pool.request()
            .input('request_id', sql.UniqueIdentifier, request.id)
            .query(`
              SELECT 
                sii.id,
                sii.item_master_id,
                sii.nomenclature,
                sii.requested_quantity,
                sii.unit_price,
                sii.item_type,
                sii.custom_item_name,
                sii.item_status,
                sii.created_at,
                sii.updated_at
              FROM stock_issuance_items sii
              WHERE sii.request_id = @request_id
              ORDER BY sii.created_at
            `);
          return {
            // Request data
            id: request.id,
            request_number: request.request_number,
            request_type: request.request_type,
            purpose: request.purpose,
            urgency_level: request.urgency_level,
            justification: request.justification,
            expected_return_date: request.expected_return_date,
            is_returnable: request.is_returnable,
            request_status: request.request_status,
            submitted_at: request.submitted_at,
            created_at: request.created_at,
            updated_at: request.updated_at,
            // Requester information
            requester: {
              user_id: request.requester_user_id,
              full_name: request.requester_full_name,
              role: request.requester_role,
              email: request.requester_email,
              username: request.requester_username
            },
            // Office information
            office: {
              office_id: request.requester_office_id,
              name: request.office_name,
              office_code: request.office_code
            },
            // Wing information
            wing: {
              wing_id: request.requester_wing_id,
              name: request.wing_name,
              short_name: request.wing_short_name,
              wing_code: request.wing_code
            },
            // Branch/DEC information (derived from wing)
            branch: {
              branch_id: request.requester_branch_id,
              dec_name: request.wing_name
            },
            // Items
            items: itemsResult.recordset || []
          };
        } catch (error) {
          return {
            ...request,
            requester: {
              user_id: request.requester_user_id,
              full_name: 'Unknown User',
              role: 'User',
              email: 'N/A',
              username: 'N/A'
            },
            office: {
              office_id: request.requester_office_id,
              name: 'Unknown Office',
              office_code: 'N/A'
            },
            wing: {
              wing_id: request.requester_wing_id,
              name: 'Unknown Wing',
              short_name: 'N/A',
              wing_code: 'N/A'
            },
            branch: {
              branch_id: request.requester_branch_id,
              dec_name: 'Unknown Wing'
            },
            items: []
          };
        }
      })
    );
    // Calculate dashboard counts
    const totalCount = requestsWithItems.length;
    const pendingCount = requestsWithItems.filter(r => 
      r.request_status === 'Submitted' || r.request_status === 'Pending'
    ).length;
    const approvedCount = requestsWithItems.filter(r => 
      r.request_status === 'Approved'
    ).length;
    const issuedCount = requestsWithItems.filter(r => 
      r.request_status === 'Issued'
    ).length;
    if (requestsWithItems.length > 0) {
    }
    res.json({
      success: true,
      data: requestsWithItems,
      summary: {
        totalCount,
        pendingCount,
        approvedCount,
        issuedCount
      },
      pagination: {
        totalPages: 1,
        currentPage: 1,
        pageSize: requestsWithItems.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests', 
      details: error.message 
    });
  }
});
// Get issued items for stock returns (returnable items with status 'Issued')
app.get('/api/stock-issuance/issued-items', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const result = await pool.request().query(`
      SELECT 
        sii.id,
        sii.request_id,
        sii.nomenclature,
        sii.requested_quantity,
        sir.request_number,
        sir.created_at,
        sir.expected_return_date,
        sir.is_returnable,
        u.FullName as requester_name
      FROM stock_issuance_items sii
      INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
      LEFT JOIN AspNetUsers u ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u.Id AS NVARCHAR(450))
      WHERE sir.is_returnable = 1 
        AND sii.item_status = 'Issued'
      ORDER BY sir.expected_return_date ASC
    `);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});
// Get single stock issuance request by ID
app.get('/api/stock-issuance/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { returned_approval_id } = req.query;
    console.log('📋 [UPDATED] Fetching stock issuance request:', id);
    console.log('📋 [UPDATED] Query params:', JSON.stringify(req.query));
    console.log('📋 [UPDATED] returned_approval_id:', returned_approval_id, 'type:', typeof returned_approval_id, 'length:', returned_approval_id?.length);
    const request = pool.request().input('id', sql.NVarChar, id);
    const result = await request.query(`
      SELECT 
        sir.*,
        u.FullName as requester_name,
        CAST(sir.requester_office_id AS NVARCHAR(50)) as office_name,
        w.Name as wing_name
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
      WHERE sir.id = @id
    `);
    console.log('📋 [UPDATED] Query executed successfully, found', result.recordset.length, 'records');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const requestData = result.recordset[0];
    // Get items for this request
    let itemsQuery;
    if (returned_approval_id) {
      // For returned requests, only show items that were actually returned
      // Accept either legacy REJECT with 'returned to requester' reason or new RETURN decision_type
      itemsQuery = `
        SELECT 
          sii.*,
          im.nomenclature as inventory_item_name,
          im.description as inventory_description,
          ai.rejection_reason as item_return_reason
        FROM approval_items ai
        INNER JOIN stock_issuance_items sii ON ai.item_master_id = sii.item_master_id 
          AND sii.request_id = @request_id
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE ai.request_approval_id = @returned_approval_id
          AND (
            (ai.decision_type = 'REJECT' AND LOWER(ai.rejection_reason) LIKE '%returned to requester%')
            OR ai.decision_type = 'RETURN'
          )
        ORDER BY sii.created_at
      `;
    } else {
      // For regular requests, show all items
      itemsQuery = `
        SELECT 
          sii.*,
          im.nomenclature as inventory_item_name,
          im.description as inventory_description,
          NULL as item_return_reason
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @request_id
        ORDER BY sii.created_at
      `;
    }
    const itemsResult = await pool.request()
      .input('request_id', sql.NVarChar, id)
      .input('returned_approval_id', sql.NVarChar, returned_approval_id || '')
      .query(itemsQuery);
    const requestWithItems = {
      ...requestData,
      items: itemsResult.recordset
    };
    res.json({ success: true, data: requestWithItems });
  } catch (error) {
    console.error('❌ Error fetching stock issuance request:', error);
    res.status(500).json({ error: 'Failed to fetch request', details: error.message });
  }
});
// Update stock issuance request (for returned requests that need editing)
app.put('/api/stock-issuance/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose, urgency_level, justification, expected_return_date, is_returnable, items } = req.body;
    console.log('📝 Updating stock issuance request:', id);
    // Update the main request
    const updateRequest = pool.request()
      .input('id', sql.NVarChar, id)
      .input('purpose', sql.NVarChar, purpose)
      .input('urgency_level', sql.NVarChar, urgency_level)
      .input('justification', sql.NVarChar, justification)
      .input('expected_return_date', sql.DateTime, expected_return_date)
      .input('is_returnable', sql.Bit, is_returnable);
    await updateRequest.query(`
      UPDATE stock_issuance_requests 
      SET purpose = @purpose,
          urgency_level = @urgency_level,
          justification = @justification,
          expected_return_date = @expected_return_date,
          is_returnable = @is_returnable,
          updated_at = GETDATE()
      WHERE id = @id
    `);
    // Delete existing items and re-insert updated ones
    if (items && items.length > 0) {
      // First delete existing items
      await pool.request()
        .input('request_id', sql.NVarChar, id)
        .query('DELETE FROM stock_issuance_items WHERE request_id = @request_id');
      // Then insert updated items
      for (const item of items) {
        const insertItem = pool.request()
          .input('request_id', sql.NVarChar, id)
          .input('item_master_id', sql.NVarChar, item.item_master_id)
          .input('nomenclature', sql.NVarChar, item.nomenclature)
          .input('requested_quantity', sql.Decimal(10, 2), item.requested_quantity)
          .input('unit_price', sql.Decimal(10, 2), item.unit_price || 0)
          .input('item_type', sql.NVarChar, item.item_type || 'inventory')
          .input('custom_item_name', sql.NVarChar, item.custom_item_name);
        await insertItem.query(`
          INSERT INTO stock_issuance_items
          (id, request_id, item_master_id, nomenclature, requested_quantity, unit_price, item_type, custom_item_name, created_at, updated_at)
          VALUES (NEWID(), @request_id, @item_master_id, @nomenclature, @requested_quantity, @unit_price, @item_type, @custom_item_name, GETDATE(), GETDATE())
        `);
      }
    }
    // Check if this is a resubmission from returned status
    const currentStatusResult = await pool.request()
      .input('request_id', sql.NVarChar, id)
      .query('SELECT current_status FROM request_approvals WHERE request_id = @request_id');
    const isResubmission = currentStatusResult.recordset[0]?.current_status === 'returned';
    if (isResubmission) {
      // Reset approval status to pending for resubmission
      await pool.request()
        .input('id', sql.NVarChar, id)
        .query(`
          UPDATE stock_issuance_requests 
          SET request_status = 'Submitted', 
              updated_at = GETDATE()
          WHERE id = @id
        `);
      // Get the wing supervisor for this request
      const wingResult = await pool.request()
        .input('request_id', sql.NVarChar, id)
        .query('SELECT requester_wing_id FROM stock_issuance_requests WHERE id = @request_id');
      const wingId = wingResult.recordset[0]?.requester_wing_id;
      let supervisorId = null;
      if (wingId) {
        // First, check if the current logged-in user is a supervisor for this wing
        const currentUserId = req.session?.userId;
        if (currentUserId) {
          const isCurrentUserSupervisorResult = await pool.request()
            .input('user_id', sql.NVarChar, currentUserId)
            .input('wing_id', sql.Int, wingId)
            .query('SELECT COUNT(*) as count FROM vw_wing_supervisors WHERE user_id = @user_id AND wing_id = @wing_id');
          if (isCurrentUserSupervisorResult.recordset[0].count > 0) {
            supervisorId = currentUserId;
            console.log('📝 Resubmission: Assigning to current logged-in user (supervisor):', currentUserId);
          }
        }
        // If current user is not a supervisor, try to assign to the supervisor who originally returned this request
        if (!supervisorId) {
          const returnHistoryResult = await pool.request()
            .input('request_id', sql.NVarChar, id)
            .query(`
              SELECT TOP 1 ah.action_by 
              FROM approval_history ah 
              INNER JOIN request_approvals ra ON ah.request_approval_id = ra.id 
              WHERE ra.request_id = @request_id AND ah.action_type = 'returned' 
              ORDER BY ah.action_date DESC
            `);
          const originalApproverId = returnHistoryResult.recordset[0]?.action_by;
          // Check if the original approver is still a supervisor for this wing
          if (originalApproverId) {
            const isStillSupervisorResult = await pool.request()
              .input('user_id', sql.NVarChar, originalApproverId)
              .input('wing_id', sql.Int, wingId)
              .query('SELECT COUNT(*) as count FROM vw_wing_supervisors WHERE user_id = @user_id AND wing_id = @wing_id');
            if (isStillSupervisorResult.recordset[0].count > 0) {
              supervisorId = originalApproverId;
            }
          }
        }
        // If no suitable supervisor found, assign to first available supervisor
        if (!supervisorId) {
          const supervisorResult = await pool.request()
            .input('wing_id', sql.Int, wingId)
            .query('SELECT TOP 1 user_id FROM vw_wing_supervisors WHERE wing_id = @wing_id ORDER BY supervisor_name');
          supervisorId = supervisorResult.recordset[0]?.user_id;
        }
      }
      // Update the corresponding request_approvals record to pending status with supervisor assigned
      await pool.request()
        .input('request_id', sql.NVarChar, id)
        .input('supervisor_id', sql.NVarChar, supervisorId)
        .query(`
          UPDATE request_approvals 
          SET current_status = 'pending', 
              current_approver_id = @supervisor_id,
              updated_date = GETDATE()
          WHERE request_id = @request_id
        `);
      // Mark approval_items as resubmitted (change all decision_types for this request)
      await pool.request()
        .input('request_id', sql.NVarChar, id)
        .query(`
          UPDATE approval_items 
          SET decision_type = 'RESUBMITTED',
              rejection_reason = 'Request resubmitted after revision',
              updated_at = GETDATE()
          WHERE request_approval_id IN (
            SELECT id FROM request_approvals WHERE request_id = @request_id
          )
        `);
    }
    console.log('✅ Request updated and resubmitted for approval');
    res.json({ success: true, message: 'Request updated and resubmitted for approval' });
  } catch (error) {
    console.error('❌ Error updating stock issuance request:', error);
    res.status(500).json({ error: 'Failed to update request', details: error.message });
  }
});
// =============================================================================
// STOCK ISSUANCE APPROVAL ENDPOINTS
// =============================================================================
// Approve stock issuance request
app.put('/api/stock-issuance/requests/:id/approve', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_approvals
    } = req.body;
    // Get the actual logged-in user from session - this should always be authenticated
    const userId = req.session?.userId;
    if (!userId) {
      console.log('⚠️ Stock Issuance Approve: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to perform approval actions.'
      });
    }
    // Get the user's actual name and designation from database
    let actualApproverName = approver_name;
    let actualApproverDesignation = approver_designation;
    if (userId) {
      try {
        const userInfoResult = await pool.request()
          .input('userId', sql.NVarChar, userId)
          .query(`
            SELECT FullName, 
                   COALESCE(tblUserDesignations.designation_name, 'Supervisor') as designation_name
            FROM AspNetUsers 
            LEFT JOIN tblUserDesignations ON AspNetUsers.intDesignationID = tblUserDesignations.intDesignationID
            WHERE Id = @userId
          `);
        if (userInfoResult.recordset.length > 0) {
          actualApproverName = userInfoResult.recordset[0].FullName;
          actualApproverDesignation = userInfoResult.recordset[0].designation_name;
          console.log('✅ Approve: Using actual user info:', actualApproverName, actualApproverDesignation);
        }
      } catch (error) {
        console.log('⚠️ Approve: Could not get user info, using request body values');
      }
    }
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Update request status to approved
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approver_name', sql.NVarChar, actualApproverName)
        .input('approver_designation', sql.NVarChar, actualApproverDesignation)
        .input('approval_comments', sql.NVarChar, approval_comments)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Approved',
            approved_at = GETDATE(),
            approved_by = @approver_name,
            review_comments = @approval_comments,
            updated_at = GETDATE()
          WHERE id = @id
        `);
      // Update individual items if item_approvals provided
      if (item_approvals && Array.isArray(item_approvals)) {
        for (const itemApproval of item_approvals) {
          await transaction.request()
            .input('item_id', sql.UniqueIdentifier, itemApproval.item_id)
            .input('approved_quantity', sql.Int, itemApproval.approved_quantity)
            .input('rejection_reason', sql.NVarChar, itemApproval.rejection_reason || null)
            .query(`
              UPDATE stock_issuance_items 
              SET 
                approved_quantity = @approved_quantity,
                item_status = CASE 
                  WHEN @approved_quantity > 0 THEN 'Approved'
                  ELSE 'Rejected'
                END,
                rejection_reason = @rejection_reason,
                updated_at = GETDATE()
              WHERE id = @item_id
            `);
        }
      } else {
        // If no specific item approvals, approve all items with requested quantities
        await transaction.request()
          .input('request_id', sql.UniqueIdentifier, id)
          .query(`
            UPDATE stock_issuance_items 
            SET 
              approved_quantity = requested_quantity,
              item_status = 'Approved',
              updated_at = GETDATE()
            WHERE request_id = @request_id
          `);
      }
      await transaction.commit();
      res.json({
        success: true,
        message: 'Request approved successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});
// Reject stock issuance request
app.put('/api/stock-issuance/requests/:id/reject', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments
    } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Update request status to rejected
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approver_name', sql.NVarChar, approver_name)
        .input('approver_designation', sql.NVarChar, approver_designation)
        .input('approval_comments', sql.NVarChar, approval_comments)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Rejected',
            reviewed_at = GETDATE(),
            reviewed_by = @approver_name,
            review_comments = @approval_comments,
            updated_at = GETDATE()
          WHERE id = @id
        `);
      // Mark all items as rejected
      await transaction.request()
        .input('request_id', sql.UniqueIdentifier, id)
        .input('rejection_reason', sql.NVarChar, approval_comments || 'Request rejected by approver')
        .query(`
          UPDATE stock_issuance_items 
          SET 
            approved_quantity = 0,
            item_status = 'Rejected',
            rejection_reason = @rejection_reason,
            updated_at = GETDATE()
          WHERE request_id = @request_id
        `);
      await transaction.commit();
      res.json({
        success: true,
        message: 'Request rejected successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});
// Get pending requests for approval (alias for submitted status)
app.get('/api/stock-issuance/pending-approvals', async (req, res) => {
  try {
    // Redirect to the main requests endpoint with submitted status
    req.query.status = 'Submitted';
    return app._router.handle({ ...req, url: '/api/stock-issuance/requests' }, res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});
// Get inventory matches for a specific request (for enhanced approval)
app.get('/api/stock-issuance/requests/:id/inventory-matches', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    // First, get the requested items
    const requestedItemsResult = await pool.request()
      .input('request_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sii.id as requested_item_id,
          sii.nomenclature,
          sii.requested_quantity,
          sii.custom_item_name,
          sii.item_type
        FROM stock_issuance_items sii
        WHERE sii.request_id = @request_id
        ORDER BY sii.created_at
      `);
    const requestedItems = requestedItemsResult.recordset;
    // For each requested item, find potential inventory matches
    const itemsWithMatches = await Promise.all(
      requestedItems.map(async (requestedItem) => {
        try {
          // Search for inventory items that match the requested nomenclature
          const searchTerm = requestedItem.nomenclature || requestedItem.custom_item_name || '';
          const searchWords = searchTerm.split(' ').filter(word => word.length > 2);
          let inventoryMatches = [];
          if (searchWords.length > 0) {
            // Create a dynamic WHERE clause for fuzzy matching
            const searchConditions = searchWords.map((_, index) => `
              (im.nomenclature LIKE '%' + @searchWord${index} + '%' OR 
               im.description LIKE '%' + @searchWord${index} + '%' OR
               im.specifications LIKE '%' + @searchWord${index} + '%')
            `).join(' OR ');
            const matchQuery = `
              SELECT 
                cis.id as inventory_id,
                cis.item_master_id,
                cis.current_quantity as current_stock,
                cis.reserved_quantity as reserved_stock,
                cis.available_quantity as available_stock,
                cis.reorder_point as reorder_level,
                cis.maximum_stock_level as max_stock_level,
                0 as unit_price, -- Add unit price from another source if available
                im.nomenclature,
                im.description,
                im.specifications,
                im.unit as unit_of_measurement,
                'General' as category, -- Get from category table if needed
                'General' as subcategory, -- Get from subcategory table if needed
                im.item_code,
                -- Calculate available quantity (current - reserved)
                (cis.current_quantity - ISNULL(cis.reserved_quantity, 0)) as available_quantity,
                -- Calculate match score based on search terms
                CASE 
                  WHEN im.nomenclature LIKE '%' + @exactMatch + '%' THEN 100
                  WHEN im.nomenclature LIKE '%' + @firstWord + '%' THEN 80
                  ELSE 60
                END as match_score
              FROM current_inventory_stock cis
              INNER JOIN item_masters im ON cis.item_master_id = im.id
              WHERE cis.current_quantity > 0 
                AND (cis.current_quantity - ISNULL(cis.reserved_quantity, 0)) > 0
                AND (${searchConditions})
              ORDER BY match_score DESC, (cis.current_quantity - ISNULL(cis.reserved_quantity, 0)) DESC
            `;
            const matchRequest = pool.request()
              .input('exactMatch', sql.NVarChar, searchTerm)
              .input('firstWord', sql.NVarChar, searchWords[0] || '');
            // Add search word parameters
            searchWords.forEach((word, index) => {
              matchRequest.input(`searchWord${index}`, sql.NVarChar, word);
            });
            const matchResult = await matchRequest.query(matchQuery);
            inventoryMatches = matchResult.recordset;
          }
          return {
            requested_item_id: requestedItem.requested_item_id,
            requested_nomenclature: requestedItem.requested_nomenclature,
            requested_quantity: requestedItem.requested_quantity,
            custom_item_name: requestedItem.custom_item_name,
            item_type: requestedItem.item_type,
            inventory_matches: inventoryMatches,
            match_count: inventoryMatches.length,
            can_fulfill: inventoryMatches.some(match => match.available_quantity >= requestedItem.requested_quantity),
            total_available: inventoryMatches.reduce((sum, match) => sum + match.available_quantity, 0)
          };
        } catch (error) {
          return {
            requested_item_id: requestedItem.requested_item_id,
            requested_nomenclature: requestedItem.requested_nomenclature,
            requested_quantity: requestedItem.requested_quantity,
            custom_item_name: requestedItem.custom_item_name,
            item_type: requestedItem.item_type,
            inventory_matches: [],
            match_count: 0,
            can_fulfill: false,
            total_available: 0,
            error: error.message
          };
        }
      })
    );
    // Calculate summary statistics
    const totalRequestedItems = requestedItems.length;
    const fullyFulfillableItems = itemsWithMatches.filter(item => item.can_fulfill).length;
    const partiallyFulfillableItems = itemsWithMatches.filter(item => 
      !item.can_fulfill && item.total_available > 0
    ).length;
    const notFulfillableItems = itemsWithMatches.filter(item => item.total_available === 0).length;
    res.json({
      success: true,
      request_id: id,
      items_with_matches: itemsWithMatches,
      summary: {
        total_requested_items: totalRequestedItems,
        fully_fulfillable: fullyFulfillableItems,
        partially_fulfillable: partiallyFulfillableItems,
        needs_procurement: notFulfillableItems,
        fulfillment_rate: totalRequestedItems > 0 ? 
          Math.round((fullyFulfillableItems / totalRequestedItems) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to find inventory matches', 
      details: error.message 
    });
  }
});
// Approve request with specific inventory allocations
app.post('/api/stock-issuance/requests/:id/approve-with-allocation', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_allocations // Array of { requested_item_id, inventory_item_id, allocated_quantity, decision_type }
    } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Update main request status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approver_name', sql.NVarChar, approver_name)
        .input('approval_comments', sql.NVarChar, approval_comments)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Approved',
            approved_at = GETDATE(),
            approved_by = @approver_name,
            review_comments = @approval_comments,
            updated_at = GETDATE()
          WHERE id = @id
        `);
      // Process each item allocation
      for (const allocation of item_allocations) {
        const {
          requested_item_id,
          inventory_item_id,
          allocated_quantity,
          decision_type, // 'APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT', 'REJECT'
          rejection_reason,
          procurement_required_quantity
        } = allocation;
        // Update the requested item with approval details
        await transaction.request()
          .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
          .input('approved_quantity', sql.Int, allocated_quantity || 0)
          .input('item_status', sql.NVarChar, decision_type === 'REJECT' ? 'Rejected' : 'Approved')
          .input('rejection_reason', sql.NVarChar, rejection_reason)
          .query(`
            UPDATE stock_issuance_items 
            SET 
              approved_quantity = @approved_quantity,
              item_status = @item_status,
              rejection_reason = @rejection_reason,
              updated_at = GETDATE()
            WHERE id = @requested_item_id
          `);
        // If approved from stock, create reservation
        if (decision_type === 'APPROVE_FROM_STOCK' && inventory_item_id && allocated_quantity > 0) {
          // Create stock reservation
          await transaction.request()
            .input('inventory_item_id', sql.UniqueIdentifier, inventory_item_id)
            .input('request_id', sql.UniqueIdentifier, id)
            .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
            .input('reserved_quantity', sql.Int, allocated_quantity)
            .input('reserved_by', sql.NVarChar, approver_name)
            .input('expires_at', sql.DateTime2, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from now
            .query(`
              INSERT INTO stock_reservations (
                inventory_item_id, request_id, requested_item_id, 
                reserved_quantity, reserved_by, expires_at
              ) VALUES (
                @inventory_item_id, @request_id, @requested_item_id,
                @reserved_quantity, @reserved_by, @expires_at
              )
            `);
          // Update inventory reserved stock
          await transaction.request()
            .input('inventory_item_id', sql.UniqueIdentifier, inventory_item_id)
            .input('reserved_quantity', sql.Int, allocated_quantity)
            .query(`
              UPDATE current_inventory_stock 
              SET 
                reserved_quantity = ISNULL(reserved_quantity, 0) + @reserved_quantity,
                available_quantity = current_quantity - (ISNULL(reserved_quantity, 0) + @reserved_quantity),
                last_updated = GETDATE()
              WHERE id = @inventory_item_id
            `);
        }
        // If procurement required, create procurement request
        if (decision_type === 'APPROVE_FOR_PROCUREMENT' && procurement_required_quantity > 0) {
          await transaction.request()
            .input('original_request_id', sql.UniqueIdentifier, id)
            .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
            .input('required_quantity', sql.Int, procurement_required_quantity)
            .input('created_by', sql.NVarChar, approver_name)
            .query(`
              INSERT INTO procurement_requests (
                original_request_id, requested_item_id, required_quantity, created_by
              ) VALUES (
                @original_request_id, @requested_item_id, @required_quantity, @created_by
              )
            `);
        }
        // Record the approval decision
        await transaction.request()
          .input('request_id', sql.UniqueIdentifier, id)
          .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
          .input('decision_type', sql.NVarChar, decision_type)
          .input('inventory_item_id', sql.UniqueIdentifier, inventory_item_id)
          .input('approved_quantity', sql.Int, allocated_quantity || 0)
          .input('procurement_required_quantity', sql.Int, procurement_required_quantity || 0)
          .input('rejection_reason', sql.NVarChar, rejection_reason)
          .input('approver_id', sql.NVarChar, approver_name)
          .query(`
            INSERT INTO stock_issuance_approval_decisions (
              request_id, requested_item_id, decision_type, inventory_item_id,
              approved_quantity, procurement_required_quantity, rejection_reason, approver_id
            ) VALUES (
              @request_id, @requested_item_id, @decision_type, @inventory_item_id,
              @approved_quantity, @procurement_required_quantity, @rejection_reason, @approver_id
            )
          `);
      }
      await transaction.commit();
      const approvedCount = item_allocations.filter(a => a.decision_type === 'APPROVE_FROM_STOCK').length;
      const procurementCount = item_allocations.filter(a => a.decision_type === 'APPROVE_FOR_PROCUREMENT').length;
      const rejectedCount = item_allocations.filter(a => a.decision_type === 'REJECT').length;
      res.json({
        success: true,
        message: 'Request approved with specific allocations',
        summary: {
          approved_from_stock: approvedCount,
          requires_procurement: procurementCount,
          rejected: rejectedCount
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request with allocations', details: error.message });
  }
});
// Finalize stock issuance request
app.put('/api/stock-issuance/requests/:id/finalize', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const { finalized_by } = req.body;
    const now = new Date();
    // First check if request exists and is not already finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT is_finalized, request_status FROM stock_issuance_requests WHERE id = @id');
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock issuance request not found' });
    }
    if (checkResult.recordset[0].is_finalized) {
      return res.status(400).json({ error: 'Stock issuance request is already finalized' });
    }
    // Only approved or issued requests can be finalized
    if (!['Approved', 'Issued'].includes(checkResult.recordset[0].request_status)) {
      return res.status(400).json({ error: 'Only approved or issued requests can be finalized. Please process the request first.' });
    }
    // Update request to finalized status
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('finalized_by', sql.NVarChar, finalized_by)
      .input('finalized_at', sql.DateTime, now)
      .query(`
        UPDATE stock_issuance_requests 
        SET 
          is_finalized = 1,
          finalized_by = @finalized_by,
          finalized_at = @finalized_at,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({
      success: true,
      message: 'Stock issuance request finalized successfully',
      finalized_at: now,
      finalized_by: finalized_by
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to finalize request', details: error.message });
  }
});
// =============================================================================
// STOCK ISSUANCE - ACTUAL ISSUANCE (NEW IMPLEMENTATION)
// =============================================================================
// Issue approved stock items (reduces inventory)
app.post('/api/stock-issuance/requests/:id/issue', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const { issued_by, issued_date, issuance_items } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Check if request exists and is approved
      const requestCheck = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT request_status, is_finalized 
          FROM stock_issuance_requests 
          WHERE id = @id
        `);
      if (requestCheck.recordset.length === 0) {
        throw new Error('Stock issuance request not found');
      }
      const request = requestCheck.recordset[0];
      if (request.request_status !== 'Approved') {
        throw new Error('Request must be approved before issuing items');
      }
      if (request.is_finalized) {
        throw new Error('Request is already finalized');
      }
      // Create main StockIssuances record
      const stockIssuanceId = uuidv4();
      await transaction.request()
        .input('id', sql.UniqueIdentifier, stockIssuanceId)
        .input('request_id', sql.UniqueIdentifier, id)
        .input('issued_by', sql.NVarChar, issued_by)
        .input('issued_date', sql.Date, issued_date || new Date())
        .query(`
          INSERT INTO StockIssuances (
            Id, RequestId, IssuedBy, IssuedDate, Status, CreatedDate
          ) VALUES (
            @id, @request_id, @issued_by, @issued_date, 'ISSUED', GETDATE()
          )
        `);
      // Process each item being issued
      for (const item of issuance_items) {
        const { item_master_id, issued_quantity, inventory_item_id, unit_price } = item;
        // Get current inventory stock
        const inventoryCheck = await transaction.request()
          .input('inventory_id', sql.UniqueIdentifier, inventory_item_id)
          .query(`
            SELECT current_quantity, reserved_quantity, available_quantity 
            FROM current_inventory_stock 
            WHERE id = @inventory_id
          `);
        if (inventoryCheck.recordset.length === 0) {
          throw new Error(`Inventory item not found: ${inventory_item_id}`);
        }
        const inventory = inventoryCheck.recordset[0];
        if (inventory.current_quantity < issued_quantity) {
          throw new Error(`Insufficient stock. Available: ${inventory.current_quantity}, Requested: ${issued_quantity}`);
        }
        // 1. UPDATE INVENTORY STOCK - Reduce current_quantity and reserved_quantity
        await transaction.request()
          .input('inventory_id', sql.UniqueIdentifier, inventory_item_id)
          .input('issued_quantity', sql.Int, issued_quantity)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = current_quantity - @issued_quantity,
              reserved_quantity = CASE 
                WHEN reserved_quantity >= @issued_quantity 
                THEN reserved_quantity - @issued_quantity 
                ELSE 0 
              END,
              available_quantity = (current_quantity - @issued_quantity) - CASE 
                WHEN reserved_quantity >= @issued_quantity 
                THEN (reserved_quantity - @issued_quantity) 
                ELSE 0 
              END,
              last_updated = GETDATE()
            WHERE id = @inventory_id
          `);
        // 2. CREATE STOCK MOVEMENT LOG ENTRY
        const movementId = uuidv4();
        await transaction.request()
          .input('movement_id', sql.UniqueIdentifier, movementId)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('quantity', sql.Int, issued_quantity)
          .input('unit_price', sql.Decimal(15, 2), unit_price || 0)
          .input('reference_id', sql.UniqueIdentifier, stockIssuanceId)
          .input('authorized_by', sql.NVarChar, issued_by)
          .query(`
            INSERT INTO stock_movement_log (
              id, item_master_id, movement_type, reference_type, reference_id,
              quantity, unit_price, total_value, movement_date, authorized_by, 
              movement_notes, created_at
            ) VALUES (
              @movement_id, @item_master_id, 'Issue', 'Issuance Request', @reference_id,
              @quantity, @unit_price, (@quantity * @unit_price), GETDATE(), @authorized_by,
              'Stock issued against request', GETDATE()
            )
          `);
        // 3. UPDATE STOCK ISSUANCE ITEMS with issued quantity
        await transaction.request()
          .input('request_id', sql.UniqueIdentifier, id)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('issued_quantity', sql.Int, issued_quantity)
          .query(`
            UPDATE stock_issuance_items 
            SET 
              issued_quantity = @issued_quantity,
              item_status = 'Issued',
              updated_at = GETDATE()
            WHERE request_id = @request_id AND item_master_id = @item_master_id
          `);
      }
      // 4. UPDATE REQUEST STATUS TO ISSUED
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('issued_by', sql.NVarChar, issued_by)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Issued',
            issued_at = GETDATE(),
            issued_by = @issued_by,
            updated_at = GETDATE()
          WHERE id = @id
        `);
      await transaction.commit();
      res.json({
        success: true,
        message: 'Items issued successfully and inventory updated',
        issuance_id: stockIssuanceId,
        items_issued: issuance_items.length
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error issuing stock items:', error);
    res.status(500).json({ 
      error: 'Failed to issue stock items', 
      details: error.message 
    });
  }
});
// =============================================================================
// STOCK RETURNS - COMPLETE IMPLEMENTATION
// =============================================================================
// Process stock return (increases inventory)
app.post('/api/stock-returns/:id/process', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const { processed_by, processing_notes, return_items } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Check if return exists and is not already processed
      const returnCheck = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT return_status, original_request_id 
          FROM stock_returns 
          WHERE id = @id
        `);
      if (returnCheck.recordset.length === 0) {
        throw new Error('Stock return not found');
      }
      const stockReturn = returnCheck.recordset[0];
      if (stockReturn.return_status === 'Accepted') {
        throw new Error('Return is already processed');
      }
      // Process each return item
      for (const item of return_items) {
        const { item_master_id, return_quantity, condition_on_return, inventory_item_id } = item;
        // Only add back to inventory if condition is Good or Fair
        if (['Good', 'Fair'].includes(condition_on_return)) {
          // 1. UPDATE INVENTORY STOCK - Increase current_quantity
          await transaction.request()
            .input('inventory_id', sql.UniqueIdentifier, inventory_item_id)
            .input('return_quantity', sql.Int, return_quantity)
            .query(`
              UPDATE current_inventory_stock 
              SET 
                current_quantity = current_quantity + @return_quantity,
                available_quantity = (current_quantity + @return_quantity) - ISNULL(reserved_quantity, 0),
                last_updated = GETDATE()
              WHERE id = @inventory_id
            `);
          // 2. CREATE STOCK MOVEMENT LOG ENTRY
          const movementId = uuidv4();
          await transaction.request()
            .input('movement_id', sql.UniqueIdentifier, movementId)
            .input('item_master_id', sql.UniqueIdentifier, item_master_id)
            .input('quantity', sql.Int, return_quantity)
            .input('reference_id', sql.UniqueIdentifier, id)
            .input('processed_by', sql.NVarChar, processed_by)
            .query(`
              INSERT INTO stock_movement_log (
                id, item_master_id, movement_type, reference_type, reference_id,
                quantity, movement_date, authorized_by, movement_notes, created_at
              ) VALUES (
                @movement_id, @item_master_id, 'Return', 'Stock Return', @reference_id,
                @quantity, GETDATE(), @processed_by, 'Item returned in ${condition_on_return} condition', GETDATE()
              )
            `);
        }
      }
      // 3. UPDATE RETURN STATUS
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('processed_by', sql.NVarChar, processed_by)
        .input('processing_notes', sql.NVarChar, processing_notes)
        .query(`
          UPDATE stock_returns 
          SET 
            return_status = 'Accepted',
            processed_by = @processed_by,
            processed_at = GETDATE(),
            processing_notes = @processing_notes
          WHERE id = @id
        `);
      await transaction.commit();
      res.json({
        success: true,
        message: 'Stock return processed successfully and inventory updated',
        items_returned: return_items.length
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error processing stock return:', error);
    res.status(500).json({ 
      error: 'Failed to process stock return', 
      details: error.message 
    });
  }
});
// =============================================================================
// INVENTORY REPORTING AND DASHBOARD ENDPOINTS
// =============================================================================
// Get inventory dashboard statistics
app.get('/api/inventory/dashboard-stats', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    // Get comprehensive inventory statistics from current_inventory_stock table
    const statsResult = await pool.request().query(`
      WITH InventoryStats AS (
        SELECT 
          COUNT(*) as total_items,
          SUM(cis.current_quantity) as total_quantity,
          SUM(cis.available_quantity) as available_quantity,
          SUM(cis.reserved_quantity) as reserved_quantity,
          COUNT(CASE WHEN cis.current_quantity <= cis.minimum_stock_level AND cis.minimum_stock_level > 0 THEN 1 END) as low_stock_items,
          COUNT(CASE WHEN cis.current_quantity = 0 THEN 1 END) as out_of_stock_items,
          COUNT(CASE WHEN cis.current_quantity > cis.maximum_stock_level AND cis.maximum_stock_level > 0 THEN 1 END) as overstock_items
        FROM current_inventory_stock cis
        INNER JOIN item_masters im ON cis.item_master_id = im.id
      ),
      CategoryStats AS (
        SELECT 
          COUNT(DISTINCT c.id) as total_categories
        FROM categories c
      )
      SELECT 
        inv.*,
        cat.*,
        0 as issues_last_month,
        0 as returns_last_month,
        0 as total_issued_last_month,
        0 as total_returned_last_month
      FROM InventoryStats inv
      CROSS JOIN CategoryStats cat
    `);
    const stats = statsResult.recordset[0];
    // Get top items by current stock
    const topItemsResult = await pool.request().query(`
      SELECT TOP 10
        im.nomenclature,
        cis.current_quantity,
        cis.available_quantity,
        c.category_name
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      ORDER BY cis.current_quantity DESC
    `);
    // Get low stock alerts
    const lowStockResult = await pool.request().query(`
      SELECT 
        im.nomenclature,
        im.unit,
        cis.current_quantity,
        cis.minimum_stock_level,
        cis.reorder_point,
        c.category_name
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE cis.current_quantity <= cis.minimum_stock_level 
        AND cis.minimum_stock_level > 0
      ORDER BY (cis.current_quantity - cis.minimum_stock_level) ASC
    `);
    res.json({
      success: true,
      stats: {
        inventory: {
          total_items: stats.total_items,
          total_quantity: stats.total_quantity,
          available_quantity: stats.available_quantity,
          reserved_quantity: stats.reserved_quantity,
          low_stock_items: stats.low_stock_items,
          out_of_stock_items: stats.out_of_stock_items,
          overstock_items: stats.overstock_items
        },
        movements: {
          issues_last_month: stats.issues_last_month,
          returns_last_month: stats.returns_last_month,
          total_issued_last_month: stats.total_issued_last_month,
          total_returned_last_month: stats.total_returned_last_month
        },
        categories: {
          total_categories: stats.total_categories,
          total_subcategories: 0
        }
      },
      top_moving_items: topItemsResult.recordset,
      low_stock_alerts: lowStockResult.recordset
    });
  } catch (error) {
    console.error('Error fetching inventory dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch inventory dashboard statistics', details: error.message });
  }
});
// Get stock movement history
app.get('/api/inventory/movements', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { page = 1, limit = 50, movement_type, date_from, date_to, item_master_id } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = '1 = 1';
    const request = pool.request();
    if (movement_type) {
      whereClause += ' AND sml.movement_type = @movement_type';
      request.input('movement_type', sql.NVarChar, movement_type);
    }
    if (date_from) {
      whereClause += ' AND sml.movement_date >= @date_from';
      request.input('date_from', sql.Date, date_from);
    }
    if (date_to) {
      whereClause += ' AND sml.movement_date <= @date_to';
      request.input('date_to', sql.Date, date_to);
    }
    if (item_master_id) {
      whereClause += ' AND sml.item_master_id = @item_master_id';
      request.input('item_master_id', sql.UniqueIdentifier, item_master_id);
    }
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parseInt(limit));
    const result = await request.query(`
      SELECT 
        sml.id,
        sml.movement_date,
        sml.movement_type,
        sml.reference_type,
        sml.quantity,
        sml.unit_price,
        sml.total_value,
        sml.movement_notes,
        sml.authorized_by,
        im.nomenclature,
        im.unit,
        c.category_name
      FROM stock_movement_log sml
      INNER JOIN item_masters im ON sml.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE ${whereClause}
      ORDER BY sml.movement_date DESC, sml.created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);
    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_records: result.recordset.length
      }
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock movements', 
      details: error.message 
    });
  }
});
// Get inventory valuation report
app.get('/api/inventory/valuation', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const result = await pool.request().query(`
      WITH LatestPrices AS (
        SELECT 
          sml.item_master_id,
          sml.unit_price,
          ROW_NUMBER() OVER (PARTITION BY sml.item_master_id ORDER BY sml.movement_date DESC) as rn
        FROM stock_movement_log sml
        WHERE sml.unit_price > 0
      )
      SELECT 
        im.nomenclature,
        im.unit,
        c.category_name,
        cis.current_quantity,
        cis.available_quantity,
        cis.reserved_quantity,
        ISNULL(lp.unit_price, 0) as latest_unit_price,
        (cis.current_quantity * ISNULL(lp.unit_price, 0)) as total_value,
        cis.minimum_stock_level,
        cis.maximum_stock_level
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN LatestPrices lp ON im.id = lp.item_master_id AND lp.rn = 1
      WHERE cis.current_quantity > 0
      ORDER BY (cis.current_quantity * ISNULL(lp.unit_price, 0)) DESC
    `);
    const totalValue = result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0);
    res.json({
      success: true,
      data: result.recordset,
      summary: {
        total_items: result.recordset.length,
        total_inventory_value: totalValue,
        average_item_value: result.recordset.length > 0 ? totalValue / result.recordset.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching inventory valuation:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory valuation', 
      details: error.message 
    });
  }
});
// Stock adjustment endpoint
app.put('/api/inventory/stock/:id', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const { 
      adjustment_quantity, 
      adjustment_type, // 'increase' or 'decrease'
      reason, 
      authorized_by 
    } = req.body;
    // Validation
    if (!adjustment_quantity || adjustment_quantity <= 0) {
      return res.status(400).json({ error: 'Adjustment quantity must be greater than 0' });
    }
    if (!['increase', 'decrease'].includes(adjustment_type)) {
      return res.status(400).json({ error: 'Adjustment type must be increase or decrease' });
    }
    if (!reason || !authorized_by) {
      return res.status(400).json({ error: 'Reason and authorized_by are required' });
    }
    await transaction.begin();
    // Get current stock record
    const stockResult = await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          cis.*,
          im.nomenclature,
          im.unit
        FROM current_inventory_stock cis
        INNER JOIN item_masters im ON cis.item_master_id = im.id
        WHERE cis.id = @id
      `);
    if (stockResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock record not found' });
    }
    const stockRecord = stockResult.recordset[0];
    const currentQuantity = stockRecord.current_quantity;
    const adjustmentValue = adjustment_type === 'increase' ? adjustment_quantity : -adjustment_quantity;
    const newQuantity = currentQuantity + adjustmentValue;
    // Prevent negative stock
    if (newQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Adjustment would result in negative stock',
        current_quantity: currentQuantity,
        adjustment: adjustmentValue
      });
    }
    // Update current inventory stock
    await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('newQuantity', sql.Decimal(10, 2), newQuantity)
      .query(`
        UPDATE current_inventory_stock 
        SET 
          current_quantity = @newQuantity,
          available_quantity = @newQuantity - reserved_quantity,
          last_updated = GETDATE()
        WHERE id = @id
      `);
    // Log the adjustment in stock movement log
    await transaction.request()
      .input('item_master_id', sql.UniqueIdentifier, stockRecord.item_master_id)
      .input('movement_type', sql.NVarChar, adjustment_type === 'increase' ? 'Adjustment (Increase)' : 'Adjustment (Decrease)')
      .input('reference_type', sql.NVarChar, 'Manual Adjustment')
      .input('quantity', sql.Decimal(10, 2), adjustment_quantity)
      .input('movement_notes', sql.Text, reason)
      .input('authorized_by', sql.NVarChar, authorized_by)
      .query(`
        INSERT INTO stock_movement_log (
          item_master_id, movement_type, reference_type, quantity,
          movement_date, movement_notes, authorized_by, created_at
        ) VALUES (
          @item_master_id, @movement_type, @reference_type, @quantity,
          GETDATE(), @movement_notes, @authorized_by, GETDATE()
        )
      `);
    await transaction.commit();
    res.json({
      success: true,
      message: 'Stock adjustment completed successfully',
      data: {
        previous_quantity: currentQuantity,
        adjustment_quantity: adjustment_quantity,
        adjustment_type: adjustment_type,
        new_quantity: newQuantity
      }
    });
  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error adjusting stock:', error);
    res.status(500).json({ 
      error: 'Failed to adjust stock', 
      details: error.message 
    });
  }
});
// Initial Inventory Setup Endpoint
app.post('/api/inventory/initial-setup', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { initialStocks, setupDate, setupBy } = req.body;
    // Validation
    if (!initialStocks || !Array.isArray(initialStocks) || initialStocks.length === 0) {
      return res.status(400).json({ error: 'Initial stocks array is required' });
    }
    if (!setupBy) {
      return res.status(400).json({ error: 'Setup by user is required' });
    }
    await transaction.begin();
    const insertedRecords = [];
    let totalQuantity = 0;
    for (const stock of initialStocks) {
      const { ItemMasterID, quantity, notes } = stock;
      if (!ItemMasterID || quantity <= 0) {
        continue; // Skip invalid entries
      }
      // Check if item master exists
      const itemMasterResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
        .query(`
          SELECT id, nomenclature, unit, category_id 
          FROM item_masters 
          WHERE id = @itemMasterId
        `);
      if (itemMasterResult.recordset.length === 0) {
        console.warn(`Item Master ID ${ItemMasterID} not found, skipping...`);
        continue;
      }
      const itemMaster = itemMasterResult.recordset[0];
      // Check if inventory record already exists for this item
      const existingStockResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
        .query(`
          SELECT id, current_quantity 
          FROM current_inventory_stock 
          WHERE item_master_id = @itemMasterId
        `);
      let currentQuantity = 0;
      let operationType = 'INSERT';
      if (existingStockResult.recordset.length > 0) {
        currentQuantity = existingStockResult.recordset[0].current_quantity;
        operationType = 'UPDATE';
        // Update existing record
        await transaction.request()
          .input('inventoryId', sql.UniqueIdentifier, existingStockResult.recordset[0].id)
          .input('newQuantity', sql.Int, quantity)
          .input('setupBy', sql.NVarChar, setupBy)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = @newQuantity,
              available_quantity = @newQuantity - ISNULL(reserved_quantity, 0),
              last_updated = GETDATE(),
              updated_by = @setupBy
            WHERE id = @inventoryId
          `);
      } else {
        // Insert new record
        const inventoryId = uuidv4();
        await transaction.request()
          .input('inventoryId', sql.UniqueIdentifier, inventoryId)
          .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
          .input('quantity', sql.Int, quantity)
          .input('setupBy', sql.NVarChar, setupBy)
          .query(`
            INSERT INTO current_inventory_stock (
              id, item_master_id, current_quantity, available_quantity, reserved_quantity,
              minimum_stock_level, maximum_stock_level, reorder_point,
              last_updated, created_at, updated_by
            ) VALUES (
              @inventoryId, @itemMasterId, @quantity, @quantity, 0,
              0, 0, 0,
              GETDATE(), GETDATE(), @setupBy
            )
          `);
      }
      // Create opening balance transaction record - simplified for now
      // TODO: Create proper transaction logging table
      console.log(`Initial stock setup: ${itemMaster.nomenclature} - Quantity: ${quantity} by ${setupBy}`);
      insertedRecords.push({
        ItemMasterID: ItemMasterID,
        ItemDescription: itemMaster.ItemDescription,
        Unit: itemMaster.Unit,
        PreviousQuantity: currentQuantity,
        NewQuantity: quantity,
        Operation: operationType
      });
      totalQuantity += quantity;
    }
    await transaction.commit();
    res.json({
      success: true,
      message: `Initial inventory setup completed successfully`,
      data: {
        itemsProcessed: insertedRecords.length,
        totalQuantity: totalQuantity,
        setupDate: setupDate,
        setupBy: setupBy,
        records: insertedRecords
      }
    });
  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error setting up initial inventory:', error);
    res.status(500).json({ 
      error: 'Failed to setup initial inventory', 
      details: error.message 
    });
  }
});
// =============================================================================
// FRESH INITIAL SETUP ENDPOINTS
// =============================================================================
// Get detailed current stock with item master information
app.get('/api/inventory/current-stock-detailed', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        cs.id,
        cs.item_master_id,
        im.nomenclature,
        im.item_code,
        c.category_name,
        im.unit,
        ISNULL(cs.current_quantity, 0) as current_quantity,
        ISNULL(im.minimum_stock_level, 0) as minimum_stock_level,
        ISNULL(im.maximum_stock_level, 0) as maximum_stock_level,
        im.specifications
      FROM CurrentStock cs
      INNER JOIN item_masters im ON cs.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE im.status = 'Active'
      ORDER BY im.nomenclature
    `);
    console.log(`📊 Fetched ${result.recordset.length} detailed current stock items`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching detailed current stock:', error);
    res.status(500).json({ 
      error: 'Failed to fetch detailed current stock', 
      details: error.message 
    });
  }
});
// Update stock quantities (for initial setup adjustments)
app.post('/api/inventory/update-stock-quantities', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { updates, updated_by, update_date } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }
    await transaction.begin();
    const updatedItems = [];
    for (const update of updates) {
      const { item_master_id, new_quantity, notes } = update;
      if (!item_master_id || new_quantity < 0) {
        continue; // Skip invalid entries
      }
      // Get current stock info
      const currentStockResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, item_master_id)
        .query(`
          SELECT cs.id, cs.current_quantity, im.nomenclature
          FROM CurrentStock cs
          INNER JOIN item_masters im ON cs.item_master_id = im.id
          WHERE cs.item_master_id = @itemMasterId
        `);
      if (currentStockResult.recordset.length === 0) {
        console.warn(`No current stock found for item ${item_master_id}, skipping...`);
        continue;
      }
      const currentStock = currentStockResult.recordset[0];
      const previousQuantity = currentStock.current_quantity;
      // Update the current stock quantity
      await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, item_master_id)
        .input('newQuantity', sql.Int, new_quantity)
        .input('updatedBy', sql.NVarChar(100), updated_by || 'System')
        .input('updateDate', sql.DateTime, new Date(update_date || new Date()))
        .query(`
          UPDATE CurrentStock 
          SET 
            current_quantity = @newQuantity,
            last_updated = @updateDate,
            updated_by = @updatedBy
          WHERE item_master_id = @itemMasterId
        `);
      // Log the stock movement (if you have a stock transactions table)
      try {
        await transaction.request()
          .input('itemMasterId', sql.UniqueIdentifier, item_master_id)
          .input('transactionType', sql.NVarChar(50), 'Initial Setup Adjustment')
          .input('quantityChange', sql.Int, new_quantity - previousQuantity)
          .input('previousQuantity', sql.Int, previousQuantity)
          .input('newQuantity', sql.Int, new_quantity)
          .input('notes', sql.NVarChar(500), notes || 'Initial setup quantity adjustment')
          .input('createdBy', sql.NVarChar(100), updated_by || 'System')
          .input('transactionDate', sql.DateTime, new Date())
          .query(`
            INSERT INTO stock_transactions (
              item_master_id, transaction_type, quantity_change, 
              previous_quantity, new_quantity, notes, created_by, transaction_date
            ) VALUES (
              @itemMasterId, @transactionType, @quantityChange,
              @previousQuantity, @newQuantity, @notes, @createdBy, @transactionDate
            )
          `);
      } catch (logError) {
        // If stock_transactions table doesn't exist, just log to console
        console.log(`Stock change logged: ${currentStock.nomenclature} - ${previousQuantity} → ${new_quantity}`);
      }
      updatedItems.push({
        item_master_id: item_master_id,
        nomenclature: currentStock.nomenclature,
        previous_quantity: previousQuantity,
        new_quantity: new_quantity,
        change: new_quantity - previousQuantity
      });
    }
    await transaction.commit();
    console.log(`✅ Updated ${updatedItems.length} stock quantities`);
    res.json({
      success: true,
      message: `Successfully updated ${updatedItems.length} stock quantities`,
      data: {
        updated_items: updatedItems,
        total_updated: updatedItems.length,
        updated_by: updated_by,
        update_date: update_date
      }
    });
  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error updating stock quantities:', error);
    res.status(500).json({ 
      error: 'Failed to update stock quantities', 
      details: error.message 
    });
  }
});
// =============================================================================
// CURRENT INVENTORY STOCK ENDPOINTS (FROM SCRATCH)
// =============================================================================
// Get all records from current_inventory_stock table
app.get('/api/inventory/current-inventory-stock', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    console.log('📊 Fetching data from View_Current_Inv_Stock view...');
    console.log('🔍 Using view with all item details and categories');
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        item_master_id,
        item_code,
        nomenclature,
        category_name,
        sub_category_name,
        current_quantity,
        reserved_quantity,
        available_quantity,
        minimum_stock_level,
        reorder_point,
        maximum_stock_level,
        last_updated,
        created_at,
        updated_by,
        category_id,
        sub_category_id
      FROM View_Current_Inv_Stock
      ORDER BY nomenclature
    `);
    console.log(`✅ Query executed. Found ${result.recordset.length} records from view`);
    console.log('📄 Sample record fields:', Object.keys(result.recordset[0] || {}));
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching current_inventory_stock:', error);
    res.status(500).json({ 
      error: 'Failed to fetch current_inventory_stock',
      details: error.message 
    });
  }
});
// Update single record in current_inventory_stock
app.put('/api/inventory/current-inventory-stock/:id', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const { current_quantity } = req.body;
    console.log(`🔄 Updating current_inventory_stock ID: ${id} with quantity: ${current_quantity}`);
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .input('current_quantity', sql.Int, current_quantity)
      .input('updated_by', sql.NVarChar, 'system')
      .query(`
        UPDATE current_inventory_stock 
        SET current_quantity = @current_quantity,
            available_quantity = @current_quantity - ISNULL(reserved_quantity, 0),
            last_updated = GETDATE(),
            updated_by = @updated_by
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    console.log(`✅ Updated current_inventory_stock ID: ${id}`);
    res.json({ 
      success: true, 
      message: 'Quantity updated successfully',
      id: id,
      new_quantity: current_quantity
    });
  } catch (error) {
    console.error('❌ Error updating current_inventory_stock:', error);
    res.status(500).json({ 
      error: 'Failed to update quantity',
      details: error.message 
    });
  }
});
// Bulk update records in current_inventory_stock
app.post('/api/inventory/current-inventory-stock/bulk-update', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { updates } = req.body;
    console.log('🚀 Bulk updating current_inventory_stock:', updates.length, 'records');
    await transaction.begin();
    for (const update of updates) {
      const request = new sql.Request(transaction);
      await request
        .input('item_master_id', sql.UniqueIdentifier, update.item_master_id)
        .input('current_quantity', sql.Int, update.current_quantity)
        .input('updated_by', sql.NVarChar, 'system')
        .query(`
          UPDATE current_inventory_stock 
          SET current_quantity = @current_quantity,
              available_quantity = @current_quantity - ISNULL(reserved_quantity, 0),
              last_updated = GETDATE(),
              updated_by = @updated_by
          WHERE item_master_id = @item_master_id
        `);
    }
    await transaction.commit();
    console.log('✅ Bulk update completed successfully');
    res.json({ 
      success: true, 
      message: 'Bulk update completed successfully',
      recordsUpdated: updates.length
    });
  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({ 
      error: 'Failed to bulk update quantities',
      details: error.message 
    });
  }
});
// =============================================================================
// STOCK RETURN MANAGEMENT ENDPOINTS
// =============================================================================
// Get stock return requests
app.get('/api/stock-returns/requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { status, request_date_from, request_date_to } = req.query;
    let whereClause = '1 = 1';
    const request = pool.request();
    if (status) {
      whereClause += ' AND srr.status = @status';
      request.input('status', sql.NVarChar, status);
    }
    if (request_date_from) {
      whereClause += ' AND srr.request_date >= @request_date_from';
      request.input('request_date_from', sql.Date, request_date_from);
    }
    if (request_date_to) {
      whereClause += ' AND srr.request_date <= @request_date_to';
      request.input('request_date_to', sql.Date, request_date_to);
    }
    const result = await request.query(`
      SELECT 
        srr.*,
        u.full_name as requester_name,
        o.office_name
      FROM stock_return_requests srr
      LEFT JOIN users u ON srr.requester_id = u.id
      LEFT JOIN offices o ON srr.returning_office_id = o.id
      WHERE ${whereClause}
      ORDER BY srr.request_date DESC
    `);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching stock return requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock return requests', 
      details: error.message 
    });
  }
});
// Process stock return
app.put('/api/stock-returns/requests/:id/process', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { id } = req.params;
    const { action, processed_by, processing_notes } = req.body; // action: 'approve' or 'reject'
    // Validation
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }
    if (!processed_by) {
      return res.status(400).json({ error: 'processed_by is required' });
    }
    await transaction.begin();
    // Get return request details
    const returnResult = await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT * FROM stock_return_requests WHERE id = @id
      `);
    if (returnResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock return request not found' });
    }
    const returnRequest = returnResult.recordset[0];
    if (returnRequest.status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only pending requests can be processed' });
    }
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    // Update return request status
    await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, newStatus)
      .input('processed_by', sql.UniqueIdentifier, processed_by)
      .input('processing_notes', sql.Text, processing_notes || null)
      .query(`
        UPDATE stock_return_requests 
        SET 
          status = @status,
          processed_by = @processed_by,
          processed_date = GETDATE(),
          processing_notes = @processing_notes
        WHERE id = @id
      `);
    // If approved, create stock return items and update inventory
    if (action === 'approve') {
      // Get return items
      const itemsResult = await transaction.request()
        .input('return_request_id', sql.UniqueIdentifier, id)
        .query(`
          SELECT * FROM stock_return_items WHERE return_request_id = @return_request_id
        `);
      for (const item of itemsResult.recordset) {
        // Add returned quantity back to inventory
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('returned_quantity', sql.Decimal(10, 2), item.returned_quantity)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = current_quantity + @returned_quantity,
              available_quantity = available_quantity + @returned_quantity,
              last_updated = GETDATE()
            WHERE item_master_id = @item_master_id;
            -- If record doesn't exist, create it
            IF @@ROWCOUNT = 0
            BEGIN
              INSERT INTO current_inventory_stock (
                item_master_id, current_quantity, available_quantity, 
                reserved_quantity, last_updated
              ) VALUES (
                @item_master_id, @returned_quantity, @returned_quantity, 
                0, GETDATE()
              )
            END
          `);
        // Log stock movement
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('movement_type', sql.NVarChar, 'Return')
          .input('reference_type', sql.NVarChar, 'Stock Return')
          .input('reference_id', sql.UniqueIdentifier, id)
          .input('quantity', sql.Decimal(10, 2), item.returned_quantity)
          .input('movement_notes', sql.Text, `Stock returned: ${returnRequest.return_reason}`)
          .input('authorized_by', sql.UniqueIdentifier, processed_by)
          .query(`
            INSERT INTO stock_movement_log (
              item_master_id, movement_type, reference_type, reference_id,
              quantity, movement_date, movement_notes, authorized_by, created_at
            ) VALUES (
              @item_master_id, @movement_type, @reference_type, @reference_id,
              @quantity, GETDATE(), @movement_notes, @authorized_by, GETDATE()
            )
          `);
      }
    }
    await transaction.commit();
    res.json({
      success: true,
      message: `Stock return request ${action}d successfully`,
      data: {
        request_id: id,
        action: action,
        new_status: newStatus
      }
    });
  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error processing stock return:', error);
    res.status(500).json({ 
      error: 'Failed to process stock return', 
      details: error.message 
    });
  }
});
// Create a stock return with return items
app.post('/api/stock-returns', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { 
      return_date,
      returned_by,
      verified_by,
      return_notes,
      return_status,
      return_items 
    } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Create stock return record
      const returnResult = await transaction.request()
        .input('return_date', return_date)
        .input('returned_by', returned_by)
        .input('verified_by', verified_by)
        .input('return_notes', return_notes)
        .input('return_status', return_status)
        .query(`
          INSERT INTO stock_returns (return_date, returned_by, verified_by, return_notes, return_status)
          OUTPUT INSERTED.id
          VALUES (@return_date, @returned_by, @verified_by, @return_notes, @return_status)
        `);
      const returnId = returnResult.recordset[0].id;
      // Process each return item
      for (const item of return_items) {
        // Create return item record
        await transaction.request()
          .input('return_id', returnId)
          .input('issued_item_id', item.issued_item_id)
          .input('nomenclature', item.nomenclature)
          .input('return_quantity', item.return_quantity)
          .input('condition_on_return', item.condition_on_return)
          .input('damage_description', item.damage_description)
          .query(`
            INSERT INTO stock_return_items 
            (return_id, issued_item_id, nomenclature, return_quantity, condition_on_return, damage_description)
            VALUES (@return_id, @issued_item_id, @nomenclature, @return_quantity, @condition_on_return, @damage_description)
          `);
        // Update the issuance item status
        await transaction.request()
          .input('issued_item_id', item.issued_item_id)
          .query(`
            UPDATE stock_issuance_items 
            SET status = 'Returned' 
            WHERE id = @issued_item_id
          `);
        // Add back to inventory (for good condition items)
        if (item.condition_on_return === 'Good') {
          await transaction.request()
            .input('date', return_date)
            .input('item', item.nomenclature)
            .input('quantity', item.return_quantity)
            .input('department', returned_by)
            .query(`
              INSERT INTO stock_transactions 
              (date, type, item, quantity, unit_price, total_value, vendor, department, tender_ref, remarks)
              VALUES (@date, 'IN', @item, @quantity, 0, 0, NULL, @department, NULL, 'Stock return - Good condition')
            `);
        }
      }
      await transaction.commit();
      res.json({ 
        success: true, 
        return_id: returnId,
        message: `Successfully processed return for ${return_items.length} items`
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock return', details: error.message });
  }
});
// Get all stock returns
app.get('/api/stock-returns', async (req, res) => {
  try {
    if (!pool) {
      await sql.connect(sqlConfig);
    }
    const result = await sql.query`
      SELECT 
        sr.id,
        sr.return_date,
        sr.returned_by,
        sr.verified_by,
        sr.return_notes,
        sr.return_status,
        sr.created_at,
        sr.updated_at
      FROM stock_returns sr
      ORDER BY sr.created_at DESC
    `;
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock returns', details: error.message });
  }
});
// =============================================================================
// TENDER ENDPOINTS (REBUILT FROM SCRATCH)
// =============================================================================
// POST /api/tenders - Create a new tender and its items
app.post('/api/tenders', upload.fields([
  { name: 'contract_file', maxCount: 1 },
  { name: 'loi_file', maxCount: 1 },
  { name: 'noting_file', maxCount: 1 },
  { name: 'po_file', maxCount: 1 },
  { name: 'rfp_file', maxCount: 1 }
]), async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();
    // Parse tender data from FormData
    let tenderData, items;
    if (req.body.tenderData) {
      // Data sent as FormData with JSON string
      const parsedData = JSON.parse(req.body.tenderData);
      items = parsedData.items;
      tenderData = { ...parsedData };
      delete tenderData.items;
    } else {
      // Data sent as regular JSON
      const { items: itemsFromBody, ...tenderDataFromBody } = req.body;
      items = itemsFromBody;
      tenderData = tenderDataFromBody;
    }
    console.log('✅ POST /api/tenders - Creating new tender');
    console.log('📊 Tender type:', tenderData.tender_type);
    console.log('📋 Total items to create:', items?.length || 0);
    if (items && items.length > 0) {
      console.log('📦 Items received:');
      items.forEach((item, idx) => {
        console.log(`  Item ${idx}: ${item.nomenclature}`);
        console.log(`    - vendor_ids (array):`, item.vendor_ids);
        console.log(`    - vendor_id (single):`, item.vendor_id);
      });
    }
    // Handle file uploads
    if (req.files) {
      if (req.files.contract_file) {
        tenderData.contract_file_path = req.files.contract_file[0].filename;
      }
      if (req.files.loi_file) {
        tenderData.loi_file_path = req.files.loi_file[0].filename;
      }
      if (req.files.noting_file) {
        tenderData.noting_file_path = req.files.noting_file[0].filename;
      }
      if (req.files.po_file) {
        tenderData.po_file_path = req.files.po_file[0].filename;
      }
      if (req.files.rfp_file) {
        tenderData.rfp_file_path = req.files.rfp_file[0].filename;
      }
    }
    // Insert into tenders table
    const tenderRequest = transaction.request();
    tenderRequest.input('id', sql.NVarChar, tenderId);
    // Map all fields from the schema
    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total'
    ];
    let insertQuery = 'INSERT INTO tenders (id, created_at, updated_at, is_finalized';
    let valuesQuery = 'VALUES (@id, @created_at, @updated_at, 0';
    tenderRequest.input('created_at', sql.DateTime, now);
    tenderRequest.input('updated_at', sql.DateTime, now);
    for (const field of tenderFields) {
      if (tenderData[field] !== undefined) {
        insertQuery += `, ${field}`;
        valuesQuery += `, @${field}`;
        let value = tenderData[field];
        let sqlType = sql.NVarChar; // Default to NVarChar
        // Adjust SQL type based on field name/schema
        if (field.endsWith('_date') || field.endsWith('_deadline')) {
          sqlType = sql.DateTime;
          value = value ? new Date(value) : null;
        } else if (field.endsWith('_value') || field.endsWith('_total') || field === 'quantity') {
          sqlType = sql.Decimal(15, 2);
          value = value ? parseFloat(value) : null;
        } else if (field.endsWith('_id')) {
          sqlType = sql.NVarChar;
        }
        tenderRequest.input(field, sqlType, value);
      }
    }
    insertQuery += ') ' + valuesQuery + ')';
    await tenderRequest.query(insertQuery);
    // Insert into tender_items table with vendor_id and pricing for all types
    if (items && Array.isArray(items) && items.length > 0) {
      // For CONTRACT/SPOT_PURCHASE: Single vendor for all items
      // For ANNUAL_TENDER: Different vendor per item
      const tender_type = tenderData.tender_type || 'contract';
      const awardedVendorId = tenderData.vendor_id || tenderData.awarded_vendor_id;
      console.log('📦 Processing items for tender type:', tender_type);
      console.log('📋 Total items:', items.length);
      for (const item of items) {
        console.log(`📝 Processing item: ${item.nomenclature}`);
        console.log(`   - vendor_ids (array):`, item.vendor_ids);
        console.log(`   - vendor_id (single):`, item.vendor_id);
        const itemRequest = transaction.request();
        itemRequest.input('id', sql.NVarChar, uuidv4());
        itemRequest.input('tender_id', sql.NVarChar, tenderId);
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);
        // ✅ OPTION A: Use ONLY vendor_id field (single vendor per item)
        let itemVendorId = null;
        if (tender_type === 'annual-tender') {
          // Annual tender: Each item has single vendor from request
          itemVendorId = item.vendor_id || null;
          console.log(`   ✅ Annual tender item vendor_id: ${itemVendorId}`);
        } else if (['contract', 'spot-purchase'].includes(tender_type)) {
          // Contract/Spot Purchase: All items from same vendor
          itemVendorId = awardedVendorId || item.vendor_id;
          console.log(`   ✅ Using vendor_id for ${tender_type}: ${itemVendorId}`);
        }
        console.log(`   💾 Saving: vendor_id=${itemVendorId}`);
        itemRequest.input('vendor_id', sql.UniqueIdentifier, itemVendorId || null);
        let itemInsertQuery = 'INSERT INTO tender_items (id, tender_id, created_at, updated_at, vendor_id';
        let itemValuesQuery = 'VALUES (@id, @tender_id, @created_at, @updated_at, @vendor_id';
        // ✅ MODIFIED: Always include vendor_id in the query
        const itemFields = [
          'item_master_id', 'nomenclature', 'quantity', 'quantity_received', 
          'estimated_unit_price', 'actual_unit_price', 'total_amount', 
          'specifications', 'remarks', 'status'
        ];
        for (const field of itemFields) {
          if (item[field] !== undefined) {
            itemInsertQuery += `, ${field}`;
            itemValuesQuery += `, @${field}`;
            let value = item[field];
            let sqlType = sql.NVarChar; // Default
            if (['quantity', 'quantity_received', 'estimated_unit_price', 'actual_unit_price', 'total_amount'].includes(field)) {
              if (field === 'quantity' || field === 'quantity_received') {
                sqlType = sql.Int;
                value = value ? parseInt(value, 10) : null;
              } else {
                sqlType = sql.Decimal(15, 2);
                value = value ? parseFloat(value) : null;
              }
            } else if (field === 'item_master_id') {
              sqlType = sql.NVarChar(50);
            }
            itemRequest.input(field, sqlType, value);
          }
        }
        itemInsertQuery += ') ' + itemValuesQuery + ')';
        console.log(`   📝 Final INSERT Query: ${itemInsertQuery}`);
        console.log(`   📊 Query Parameters:`, {
          id: uuidv4(),
          tender_id: tenderId,
          vendor_id: itemVendorId,
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price
        });
        await itemRequest.query(itemInsertQuery);
      }
    }
    await transaction.commit();
    res.status(201).json({ success: true, message: 'Tender created successfully', tenderId });
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to create tender:', error);
    res.status(500).json({ error: 'Failed to create tender', details: error.message });
  }
});
// GET /api/tenders - Get all tenders
app.get('/api/tenders', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        t.*, 
        v.vendor_name
      FROM tenders t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Failed to fetch tenders:', error);
    res.status(500).json({ error: 'Failed to fetch tenders', details: error.message });
  }
});
// GET /api/tender/:id/items - Get items for a tender (for Purchase Order creation)
app.get('/api/tender/:id/items', async (req, res) => {
  const { id } = req.params;
  console.log(`📥 GET /api/tender/${id}/items - Fetching items for tender`);
  try {
    // First get the tender to know the type and vendor info
    const tenderRequest = await pool.request()
      .input('tender_id', sql.NVarChar, id)
      .query(`SELECT id, tender_type, vendor_id FROM tenders WHERE id = @tender_id`);
    if (tenderRequest.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    const tender = tenderRequest.recordset[0];
    const isSingleVendorType = ['contract', 'spot-purchase'].includes(tender.tender_type?.toLowerCase());
    const tenderVendorId = tender.vendor_id; // For contract/spot-purchase
    // Query tender_items - vendor may or may not be in the table depending on tender type
    let itemsResult;
    if (isSingleVendorType) {
      // For contract/spot-purchase: vendor_id is NULL in items, get from tender
      itemsResult = await pool.request()
        .input('tender_id', sql.NVarChar, id)
        .query(`
          SELECT 
            ti.id,
            ti.item_master_id,
            ti.quantity,
            ti.nomenclature,
            ti.estimated_unit_price,
            im.category_id,
            cat.category_name,
            '${tenderVendorId}' as vendor_id
          FROM tender_items ti
          LEFT JOIN item_masters im ON ti.item_master_id = im.id
          LEFT JOIN categories cat ON im.category_id = cat.id
          WHERE ti.tender_id = @tender_id
          ORDER BY ti.id
        `);
    } else {
      // For annual-tender: vendor_id is in each item
      itemsResult = await pool.request()
        .input('tender_id', sql.NVarChar, id)
        .query(`
          SELECT 
            ti.id,
            ti.item_master_id,
            ti.quantity,
            ti.nomenclature,
            ti.estimated_unit_price,
            ti.vendor_id,
            im.category_id,
            cat.category_name
          FROM tender_items ti
          LEFT JOIN item_masters im ON ti.item_master_id = im.id
          LEFT JOIN categories cat ON im.category_id = cat.id
          WHERE ti.tender_id = @tender_id
          ORDER BY ti.id
        `);
    }
    console.log(`✅ Found ${itemsResult.recordset.length} items for tender ${id} (type: ${tender.tender_type})`);
    res.json(itemsResult.recordset);
  } catch (error) {
    console.error('❌ Failed to fetch tender items (main query):', error.message);
    // Fallback: return just the tender items with minimal data
    try {
      console.log('   Trying fallback query...');
      const fallbackResult = await pool.request()
        .input('tender_id', sql.NVarChar, id)
        .query(`SELECT id, item_master_id, quantity, nomenclature, estimated_unit_price FROM tender_items WHERE tender_id = @tender_id ORDER BY id`);
      console.log(`✅ Fallback found ${fallbackResult.recordset.length} items`);
      res.json(fallbackResult.recordset);
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      res.status(500).json({ error: 'Failed to fetch tender items', details: fallbackError.message });
    }
  }
});
// GET /api/tenders/:id - Get a single tender by ID
app.get('/api/tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenderResult = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT * FROM tenders WHERE id = @id');
    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    const tender = tenderResult.recordset[0];
    // Fetch tender items
    const itemsResult = await pool.request()
      .input('tender_id', sql.NVarChar, id)
      .query(`
        SELECT 
          ti.id,
          ti.tender_id,
          ti.item_master_id,
          ti.quantity,
          ti.nomenclature,
          ti.estimated_unit_price,
          ti.vendor_id,
          ti.vendor_ids,
          ti.specifications,
          ti.remarks,
          ti.created_at,
          ti.updated_at,
          im.nomenclature as item_nomenclature
        FROM tender_items ti
        LEFT JOIN item_masters im ON ti.item_master_id = im.id
        WHERE ti.tender_id = @tender_id
        ORDER BY ti.created_at
      `);
    // For each item, if vendor_ids is not null (annual tender), try to fetch vendor details
    const itemsWithVendors = await Promise.all(itemsResult.recordset.map(async (item) => {
      // Check vendor_ids first (for annual tender), then vendor_id (for contract/spot purchase)
      const vendorIdString = item.vendor_ids || item.vendor_id;
      if (vendorIdString) {
        // vendor_ids might be a single UUID or comma-separated UUIDs
        const vendorIds = vendorIdString.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
        if (vendorIds.length > 0) {
          try {
            // Fetch vendor details for the first vendor ID
            const vendorResult = await pool.request()
              .input('vendor_id', sql.NVarChar, vendorIds[0])
              .query('SELECT vendor_code, vendor_name, contact_person, email, phone FROM vendors WHERE id = @vendor_id');
            if (vendorResult.recordset.length > 0) {
              const vendor = vendorResult.recordset[0];
              return {
                ...item,
                vendor_code: vendor.vendor_code,
                vendor_name: vendor.vendor_name,
                contact_person: vendor.contact_person,
                email: vendor.email,
                phone: vendor.phone
              };
            }
          } catch (vendorErr) {
            // Silently fail if vendor lookup fails
            console.warn(`Warning: Could not fetch vendor details for ${vendorIds[0]}:`, vendorErr.message);
          }
        }
      }
      return item;
    }));
    tender.items = itemsWithVendors;
    res.json(tender);
  } catch (error) {
    console.error('Failed to fetch tender:', error);
    res.status(500).json({ error: 'Failed to fetch tender', details: error.message });
  }
});
// PUT /api/tenders/:id/finalize - Finalize a tender (MUST be before /api/tenders/:id)
app.put('/api/tenders/:id/finalize', async (req, res) => {
    console.log('🔥 FINALIZE ENDPOINT HIT! Route: PUT /api/tenders/:id/finalize');
    const { id } = req.params;
    const { finalized_by } = req.body;
    console.log('🎯 FINALIZE REQUEST:', { id, finalized_by });
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        console.log('✅ Transaction started');
        const now = new Date();
        // First, get all tender items
        console.log('📦 Getting tender items...');
        const tenderItemsResult = await transaction.request()
            .input('tender_id', sql.UniqueIdentifier, id)
            .query(`
                SELECT 
                    ti.item_master_id,
                    ti.estimated_unit_price,
                    ti.quantity,
                    im.nomenclature
                FROM tender_items ti
                INNER JOIN item_masters im ON ti.item_master_id = im.id
                WHERE ti.tender_id = @tender_id
            `);
        console.log('📦 Found tender items:', tenderItemsResult.recordset.length);
        // Add each tender item to stock_transactions_clean
        for (const item of tenderItemsResult.recordset) {
            console.log('📥 Adding item to stock_transactions_clean:', item.nomenclature);
            // Auto-populate actual_unit_price with estimated_unit_price by default
            const estimatedPrice = item.estimated_unit_price || 0;
            await transaction.request()
                .input('tender_id', sql.UniqueIdentifier, id)
                .input('item_master_id', sql.VarChar(50), item.item_master_id)
                .input('estimated_unit_price', sql.Decimal(18, 2), estimatedPrice)
                .input('actual_unit_price', sql.Decimal(18, 2), estimatedPrice) // Auto-populate with estimated price, can be updated later
                .input('total_quantity_received', sql.Int, item.quantity || 0)
                .input('pricing_confirmed', sql.Bit, true) // Auto-confirm pricing since actual = estimated
                .input('type', sql.VarChar(10), 'IN')
                .input('remarks', sql.Text, `Added from tender finalization - ${item.nomenclature}`)
                .query(`
                    INSERT INTO stock_transactions_clean (
                        id,
                        tender_id,
                        item_master_id,
                        estimated_unit_price,
                        actual_unit_price,
                        total_quantity_received,
                        pricing_confirmed,
                        type,
                        remarks,
                        is_deleted,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        NEWID(),
                        @tender_id,
                        @item_master_id,
                        @estimated_unit_price,
                        @actual_unit_price,
                        @total_quantity_received,
                        @pricing_confirmed,
                        @type,
                        @remarks,
                        0,
                        GETDATE(),
                        GETDATE()
                    )
                `);
        }
        // Update tender status to finalized
        console.log('📝 Updating tender status...');
        const updateResult = await transaction.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('finalized_by', sql.NVarChar, finalized_by)
            .input('finalized_at', sql.DateTime, now)
            .input('updated_at', sql.DateTime, now)
            .query(`
                UPDATE tenders 
                SET 
                    is_finalized = 1, 
                    finalized_by = @finalized_by, 
                    finalized_at = @finalized_at,
                    updated_at = @updated_at,
                    status = 'Finalized'
                WHERE id = @id AND is_finalized = 0
            `);
        console.log('📝 Tender update result:', updateResult.rowsAffected);
        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Tender not found or already finalized.' });
        }
        await transaction.commit();
        console.log('🎉 Tender finalized successfully with stock transactions!');
        res.json({ 
            success: true, 
            message: `Tender finalized successfully! Added ${tenderItemsResult.recordset.length} items to stock transactions.`,
            items_added: tenderItemsResult.recordset.length
        });
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Failed to finalize tender:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to finalize tender', details: error.message });
    }
});
// TEST endpoint - New finalize endpoint with different name
app.put('/api/tenders/:id/finalize-test', async (req, res) => {
    console.log('🧪 TEST FINALIZE ENDPOINT HIT!');
    res.json({ 
        success: true, 
        message: 'Test finalize endpoint is working!',
        id: req.params.id,
        body: req.body
    });
});
// PUT /api/tenders/:id - Update a tender and its items
app.put('/api/tenders/:id', async (req, res) => {
  const { id } = req.params;
  const { items, bidders, ...tenderData } = req.body;
  console.log('🔥🔥🔥 PUT /api/tenders/:id RECEIVED 🔥🔥🔥');
  console.log('Full request body:', JSON.stringify(req.body, null, 2));
  console.log('TenderData object:', JSON.stringify(tenderData, null, 2));
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    console.log(`🔄 Starting tender update for ID: ${id}`);
    console.log('📋 Received tender data:', {
      title: tenderData.title,
      publish_date: tenderData.publish_date,
      submission_deadline: tenderData.submission_deadline,
      opening_date: tenderData.opening_date
    });
    const now = new Date();
    // Step 1: Update tender basic information
    console.log('📝 Updating tender basic information...');
    const tenderUpdateRequest = transaction.request();
    tenderUpdateRequest.input('id', sql.NVarChar, id);
    tenderUpdateRequest.input('updated_at', sql.DateTime2, now);
    let updateQuery = 'UPDATE tenders SET updated_at = @updated_at';
    // Only update fields that exist in database schema
    const validFields = {
      reference_number: sql.NVarChar,
      title: sql.NVarChar,
      description: sql.NVarChar,
      status: sql.NVarChar,
      estimated_value: sql.Decimal(15, 2),
      publish_date: sql.Date,
      submission_deadline: sql.DateTime2,
      opening_date: sql.DateTime2,
      procurement_method: sql.NVarChar,
      publication_daily: sql.NVarChar,
      vendor_id: sql.NVarChar,
      office_ids: sql.NVarChar,
      wing_ids: sql.NVarChar,
      dec_ids: sql.NVarChar
    };
    for (const [field, sqlType] of Object.entries(validFields)) {
      if (tenderData[field] !== undefined) {
        updateQuery += `, ${field} = @${field}`;
        let value = tenderData[field];
        console.log(`📌 Processing field: ${field}, Original value: ${value}, Type: ${typeof value}`);
        // Handle special data types
        if (field === 'estimated_value') {
          value = value ? parseFloat(value) : null;
        } else if (field === 'publish_date') {
          value = value ? new Date(value) : null;
          console.log(`   ✅ Parsed publish_date: ${value}`);
        } else if (field === 'submission_deadline' || field === 'opening_date') {
          value = value ? new Date(value) : null;
          console.log(`   ✅ Parsed ${field}: ${value}`);
        }
        console.log(`   📝 Adding to request: ${field} = ${value}`);
        tenderUpdateRequest.input(field, sqlType, value);
        console.log(`   ✔️ Added successfully`);
      } else {
        console.log(`⏭️  Skipping field: ${field} (undefined in tenderData)`);
      }
    }
    updateQuery += ' WHERE id = @id';
    console.log('🔍 Executing update query:', updateQuery);
    console.log('📊 Request inputs:', tenderUpdateRequest);
    await tenderUpdateRequest.query(updateQuery);
    console.log('✅ Tender basic information updated');
    // Step 2: Handle tender items
    if (items && Array.isArray(items)) {
      console.log(`📋 Processing ${items.length} items...`);
      // First, get the tender_type to determine how to handle vendors
      const tenderCheckResult = await transaction.request()
        .input('id', sql.NVarChar, id)
        .query('SELECT tender_type FROM tenders WHERE id = @id');
      const tender_type = tenderCheckResult.recordset[0]?.tender_type || 'contract';
      console.log(`📦 Processing items for tender type: ${tender_type}`);
      // Delete all existing items
      console.log('🗑️ Removing existing items...');
      await transaction.request()
        .input('tender_id', sql.NVarChar, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');
      // Insert new items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`📝 Adding item ${i + 1}/${items.length}: ${item.nomenclature}`);
        const itemRequest = transaction.request();
        // Generate new UUID for item
        const itemId = uuidv4();
        itemRequest.input('id', sql.NVarChar, itemId);
        itemRequest.input('tender_id', sql.NVarChar, id);
        itemRequest.input('item_master_id', sql.NVarChar, item.item_master_id);
        itemRequest.input('nomenclature', sql.NVarChar, item.nomenclature || '');
        itemRequest.input('quantity', sql.Decimal(10, 2), parseFloat(item.quantity) || 0);
        itemRequest.input('estimated_unit_price', sql.Decimal(15, 2), parseFloat(item.estimated_unit_price) || 0);
        itemRequest.input('total_amount', sql.Decimal(15, 2), parseFloat(item.total_amount) || 0);
        itemRequest.input('specifications', sql.NVarChar, item.specifications || '');
        itemRequest.input('remarks', sql.NVarChar, item.remarks || '');
        itemRequest.input('status', sql.NVarChar, 'Active');
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);
        // Handle optional actual_unit_price
        if (item.actual_unit_price !== undefined) {
          itemRequest.input('actual_unit_price', sql.Decimal(15, 2), parseFloat(item.actual_unit_price) || 0);
        } else {
          itemRequest.input('actual_unit_price', sql.Decimal(15, 2), 0);
        }
        // ✅ NEW: Handle vendor_id and vendor_ids based on tender type
        let itemVendorId = null;
        if (tender_type === 'annual-tender') {
          // Annual tender: Each item can have multiple vendors (comma-separated)
          if (item.vendor_ids && Array.isArray(item.vendor_ids)) {
            // If vendor_ids is an array, join them as comma-separated string
          } else if (item.vendor_ids && typeof item.vendor_ids === 'string') {
            // Already a comma-separated string
          } else if (item.vendor_id) {
            // Single vendor or already comma-separated string
          } else {
            console.log(`   ⚠️ No vendor_ids found for this annual tender item!`);
          }
        } else {
          // Contract/Spot Purchase: Single vendor per item
          itemVendorId = item.vendor_id || null;
          console.log(`   ✅ Using vendor_id for ${tender_type}: ${itemVendorId}`);
        }
        itemRequest.input('vendor_id', sql.NVarChar, itemVendorId || null);
        const insertQuery = `
          INSERT INTO tender_items (
            id, tender_id, item_master_id, nomenclature, quantity,
            estimated_unit_price, actual_unit_price, total_amount,
            specifications, remarks, status, created_at, updated_at, vendor_id)
          VALUES (
            @id, @tender_id, @item_master_id, @nomenclature, @quantity,
            @estimated_unit_price, @actual_unit_price, @total_amount,
            @specifications, @remarks, @status, @created_at, @updated_at, @vendor_id)
        `;
        await itemRequest.query(insertQuery);
      }
      console.log('✅ All items processed successfully');
    } else {
      console.log('🗑️ No items provided, removing all existing items');
      await transaction.request()
        .input('tender_id', sql.NVarChar, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');
    }
    // Step 3: Handle vendor successful status changes
    if (bidders && Array.isArray(bidders)) {
      console.log(`📊 Processing ${bidders.length} bidders for successful status updates...`);
      console.log('🔍 Bidders data received:', JSON.stringify(bidders, null, 2));
      for (const bidder of bidders) {
        if (!bidder.vendor_id) continue;
        const currentStatus = bidder.is_successful ? 1 : 0;
        console.log(`   📌 Updating vendor ${bidder.vendor_id} (${bidder.vendor_name}) - is_successful: ${currentStatus} (boolean: ${bidder.is_successful})`);
        // Check if vendor needs to be removed from items (if marked as unsuccessful)
        if (!bidder.is_successful) {
          // Get all items for this tender that have this vendor
          const itemsResult = await transaction.request()
            .input('tender_id', sql.NVarChar, id)
            .query(`SELECT id, vendor_ids FROM tender_items WHERE tender_id = @tender_id`);
          console.log(`      Found ${itemsResult.recordset.length} items for this tender`);
          // Remove this vendor from their vendor_ids
          for (const item of itemsResult.recordset) {
            if (item.vendor_ids) {
              const vendorIds = item.vendor_ids.split(',').map(vid => vid.trim());
              const updatedVendorIds = vendorIds.filter(vid => vid !== bidder.vendor_id).join(',');
              console.log(`      🗑️ Removing vendor from item ${item.id}: "${item.vendor_ids}" → "${updatedVendorIds}"`);
              await transaction.request()
                .input('item_id', sql.NVarChar, item.id)
                .input('vendor_ids', sql.NVarChar, updatedVendorIds || null)
                .query(`UPDATE tender_items SET vendor_ids = @vendor_ids WHERE id = @item_id`);
            }
          }
        }
        // Update the vendor's successful status
        console.log(`      🔄 Updating tender_vendors: tender_id=${id}, vendor_id=${bidder.vendor_id}, is_successful=${currentStatus}`);
        const updateResult = await transaction.request()
          .input('tender_id', sql.NVarChar, id)
          .input('vendor_id', sql.NVarChar, bidder.vendor_id)
          .input('is_successful', sql.Bit, currentStatus)
          .query(`UPDATE tender_vendors SET is_successful = @is_successful, updated_at = GETDATE() WHERE tender_id = @tender_id AND vendor_id = @vendor_id`);
        console.log(`      ✅ Update completed for vendor ${bidder.vendor_id}`);
      }
      console.log('✅ Vendor successful status updates completed');
    } else {
      console.log('⚠️ No bidders data provided in request body');
    }
    await transaction.commit();
    console.log('✅ Tender update completed successfully');
    res.json({ 
      success: true, 
      message: 'Tender updated successfully',
      tender_id: id
    });
  } catch (error) {
    console.error('❌ Tender update failed:', error.message);
    try {
      await transaction.rollback();
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    res.status(500).json({ 
      error: 'Failed to update tender', 
      details: error.message 
    });
  }
});
// DELETE /api/tenders/:id - Delete a tender
app.delete('/api/tenders/:id', async (req, res) => {
  const { id } = req.params;
  const transaction = pool.transaction();
  try {
    console.log('🗑️ DELETE TENDER: Starting deletion for tender ID:', id);
    await transaction.begin();
    // First, check if tender exists
    const checkResult = await transaction.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT id, is_finalized FROM tenders WHERE id = @id');
    console.log('🔍 DELETE TENDER: Check result:', checkResult.recordset.length, 'records found');
    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('❌ DELETE TENDER: Tender not found');
      return res.status(404).json({ error: 'Tender not found' });
    }
    const tender = checkResult.recordset[0];
    if (tender.is_finalized) {
      await transaction.rollback();
      console.log('❌ DELETE TENDER: Cannot delete finalized tender');
      return res.status(400).json({ error: 'Cannot delete a finalized tender' });
    }
    // Delete tender_items first (if cascade is not working)
    console.log('🗑️ DELETE TENDER: Deleting tender items...');
    const itemsDeleteResult = await transaction.request()
      .input('tender_id', sql.NVarChar, id)
      .query('DELETE FROM tender_items WHERE tender_id = @tender_id');
    console.log('🗑️ DELETE TENDER: Deleted', itemsDeleteResult.rowsAffected[0], 'items');
    // Now delete the tender
    console.log('🗑️ DELETE TENDER: Deleting tender...');
    const tenderDeleteResult = await transaction.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM tenders WHERE id = @id');
    console.log('🗑️ DELETE TENDER: Deleted', tenderDeleteResult.rowsAffected[0], 'tender(s)');
    await transaction.commit();
    console.log('✅ DELETE TENDER: Successfully deleted tender and items');
    res.json({ success: true, message: 'Tender deleted successfully' });
  } catch (error) {
    console.error('❌ DELETE TENDER: Error deleting tender:', error);
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('❌ DELETE TENDER: Rollback error:', rollbackError);
    }
    res.status(500).json({ error: 'Failed to delete tender', details: error.message });
  }
});
// =============================================================================
// TENDER VENDORS ENDPOINTS - Multiple vendors per tender with proposals
// =============================================================================
// Configure multer for proposal document uploads
const proposalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenderId = req.params.tenderId;
    const vendorId = req.params.vendorId;
    const uploadPath = path.join(__dirname, 'uploads', 'tender-proposals', tenderId, vendorId);
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to prevent conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}_${timestamp}${ext}`);
  }
});
const proposalUpload = multer({
  storage: proposalStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only specific file types
    const allowedTypes = /pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, XLS, and XLSX files are allowed!'));
    }
  }
});
// POST - Add a vendor to a tender
app.post('/api/tenders/:tenderId/vendors', async (req, res) => {
  const { tenderId } = req.params;
  const { vendor_id, vendor_name, quoted_amount, remarks, is_selected, is_successful } = req.body;
  console.log('📦 Adding vendor to tender:', { tenderId, vendor_id, vendor_name, is_selected, is_successful });
  try {
    // Check if vendor already exists for this tender
    const checkResult = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendor_id)
      .query('SELECT id FROM tender_vendors WHERE tender_id = @tender_id AND vendor_id = @vendor_id');
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'This vendor is already added to this tender' });
    }
    // Insert new tender vendor
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendor_id)
      .input('vendor_name', sql.NVarChar(200), vendor_name)
      .input('quoted_amount', sql.Decimal(15, 2), quoted_amount || null)
      .input('remarks', sql.NVarChar(500), remarks || null)
      .input('is_selected', sql.Bit, is_selected ? 1 : 0)
      .input('is_successful', sql.Bit, is_successful ? 1 : 0)
      .input('created_by', sql.NVarChar(100), req.session?.user?.username || 'System')
      .query(`
        INSERT INTO tender_vendors (
          tender_id, vendor_id, vendor_name, quoted_amount, remarks, is_selected, is_successful, created_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @tender_id, @vendor_id, @vendor_name, @quoted_amount, @remarks, @is_selected, @is_successful, @created_by
        )
      `);
    console.log('✅ Vendor added successfully:', result.recordset[0]);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error adding vendor to tender:', error);
    res.status(500).json({ error: 'Failed to add vendor', details: error.message });
  }
});
// GET - Get all vendors for a tender
app.get('/api/tenders/:tenderId/vendors', async (req, res) => {
  const { tenderId } = req.params;
  try {
    console.log(`📥 Fetching vendors for tender ${tenderId}`);
    // Query tender_vendors table which stores all participating bidders
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          tv.id,
          tv.tender_id,
          tv.vendor_id,
          tv.vendor_name,
          tv.quoted_amount,
          tv.remarks,
          tv.is_selected,
          tv.is_successful,
          tv.is_awarded,
          tv.proposal_document_name,
          tv.proposal_document_path,
          tv.proposal_upload_date,
          tv.created_by,
          tv.created_at,
          tv.updated_at,
          v.vendor_code,
          v.contact_person,
          v.email,
          v.phone,
          v.address,
          v.city,
          v.country
        FROM tender_vendors tv
        LEFT JOIN vendors v ON tv.vendor_id = v.id
        WHERE tv.tender_id = @tender_id
        ORDER BY tv.created_at DESC
      `);
    console.log(`✅ Found ${result.recordset.length} participating bidders for tender`);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching tender vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors', details: error.message });
  }
});
// PUT - Update vendor information (quoted amount, remarks)
app.put('/api/tenders/:tenderId/vendors/:vendorId', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const { quoted_amount, remarks } = req.body;
  try {
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .input('quoted_amount', sql.Decimal(15, 2), quoted_amount || null)
      .input('remarks', sql.NVarChar(500), remarks || null)
      .query(`
        UPDATE tender_vendors 
        SET 
          quoted_amount = @quoted_amount,
          remarks = @remarks,
          updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor', details: error.message });
  }
});
// POST - Upload proposal document for a vendor
app.post('/api/tenders/:tenderId/vendors/:vendorId/proposal', 
  proposalUpload.single('proposal'), 
  async (req, res) => {
    const { tenderId, vendorId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('📄 Uploading proposal:', {
      tenderId,
      vendorId,
      filename: req.file.filename,
      size: req.file.size
    });
    try {
      // Update tender vendor with proposal information
      const result = await pool.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .input('vendor_id', sql.UniqueIdentifier, vendorId)
        .input('proposal_document_path', sql.NVarChar(500), req.file.path)
        .input('proposal_document_name', sql.NVarChar(200), req.file.originalname)
        .input('proposal_file_size', sql.BigInt, req.file.size)
        .query(`
          UPDATE tender_vendors 
          SET 
            proposal_document_path = @proposal_document_path,
            proposal_document_name = @proposal_document_name,
            proposal_upload_date = GETDATE(),
            proposal_file_size = @proposal_file_size,
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE tender_id = @tender_id AND vendor_id = @vendor_id
        `);
      if (result.recordset.length === 0) {
        // Delete uploaded file if vendor not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Vendor not found for this tender' });
      }
      console.log('✅ Proposal uploaded successfully');
      res.json({
        success: true,
        message: 'Proposal uploaded successfully',
        vendor: result.recordset[0]
      });
    } catch (error) {
      console.error('❌ Error uploading proposal:', error);
      // Delete uploaded file on error
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload proposal', details: error.message });
    }
});
// GET - Download proposal document
app.get('/api/tenders/:tenderId/vendors/:vendorId/proposal/download', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  try {
    // Get proposal document path
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        SELECT 
          proposal_document_path,
          proposal_document_name
        FROM tender_vendors 
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    if (result.recordset.length === 0 || !result.recordset[0].proposal_document_path) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const filePath = result.recordset[0].proposal_document_path;
    const fileName = result.recordset[0].proposal_document_name;
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Proposal file not found on server' });
    }
    // Send file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('❌ Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    console.error('❌ Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal', details: error.message });
  }
});
// PUT - Mark vendor as awarded
app.put('/api/tenders/:tenderId/vendors/:vendorId/award', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    // Unmark all vendors for this tender
    await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        UPDATE tender_vendors 
        SET is_awarded = 0, updated_at = GETDATE()
        WHERE tender_id = @tender_id
      `);
    // Mark the selected vendor as awarded
    const result = await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        UPDATE tender_vendors 
        SET is_awarded = 1, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    if (result.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    // Update tender table with awarded vendor
    await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('awarded_vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        UPDATE tenders 
        SET awarded_vendor_id = @awarded_vendor_id, 
            vendor_id = @awarded_vendor_id,
            updated_at = GETDATE()
        WHERE id = @tender_id
      `);
    await transaction.commit();
    console.log('✅ Vendor awarded successfully');
    res.json({
      success: true,
      message: 'Vendor awarded successfully',
      vendor: result.recordset[0]
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error awarding vendor:', error);
    res.status(500).json({ error: 'Failed to award vendor', details: error.message });
  }
});
// PUT - Mark vendor as successful bidder
app.put('/api/tenders/:tenderId/vendors/:vendorId/successful', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const { is_successful } = req.body;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    // Mark/unmark the selected vendor as successful (allow multiple successful bidders)
    const result = await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .input('is_successful', sql.Bit, is_successful ? 1 : 0)
      .query(`
        UPDATE tender_vendors 
        SET is_successful = @is_successful, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    if (result.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    // If unmarking vendor as successful, remove them from all items
    if (!is_successful) {
      console.log(`🗑️ Removing vendor ${vendorId} from all items since they're no longer successful`);
      // Get all items for this tender
      const itemsResult = await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .query(`SELECT id, vendor_ids FROM tender_items WHERE tender_id = @tender_id`);
      // Update each item to remove this vendor from their vendor_ids
      for (const item of itemsResult.recordset) {
        if (item.vendor_ids) {
          const vendorIds = item.vendor_ids.split(',').map(id => id.trim());
          const updatedVendorIds = vendorIds.filter(id => id !== vendorId).join(',');
          console.log(`   📝 Updating item ${item.id}: vendor_ids "${item.vendor_ids}" → "${updatedVendorIds}"`);
          await transaction.request()
            .input('item_id', sql.NVarChar, item.id)
            .input('vendor_ids', sql.NVarChar, updatedVendorIds || null)
            .query(`UPDATE tender_items SET vendor_ids = @vendor_ids WHERE id = @item_id`);
        }
      }
    }
    console.log(`📊 Vendor marked: is_successful = ${is_successful}, tender_id = ${tenderId}, vendor_id = ${vendorId}`);
    await transaction.commit();
    console.log(`✅ Vendor ${is_successful ? 'marked' : 'unmarked'} as successful`);
    res.json({
      success: true,
      message: `Vendor ${is_successful ? 'marked' : 'unmarked'} as successful (multiple successful bidders allowed)`,
      vendor: result.recordset[0]
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error marking vendor as successful:', error);
    res.status(500).json({ error: 'Failed to mark vendor as successful', details: error.message });
  }
});
// PUT - Mark vendor as selected (only one selected vendor per tender)
app.put('/api/tenders/:tenderId/vendors/:vendorId/selected', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const { is_selected } = req.body;
  try {
    if (is_selected) {
      // Unmark all vendors as selected for this tender
      await pool.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .query(`
          UPDATE tender_vendors 
          SET is_selected = 0, updated_at = GETDATE()
          WHERE tender_id = @tender_id
        `);
    }
    // Mark the selected vendor as selected (or unmark if is_selected is false)
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .input('is_selected', sql.Bit, is_selected ? 1 : 0)
      .query(`
        UPDATE tender_vendors 
        SET is_selected = @is_selected, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    console.log(`✅ Vendor ${is_selected ? 'marked' : 'unmarked'} as selected`);
    res.json({
      success: true,
      message: `Vendor ${is_selected ? 'marked' : 'unmarked'} as selected`,
      vendor: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error marking vendor as selected:', error);
    res.status(500).json({ error: 'Failed to mark vendor as selected', details: error.message });
  }
});
// DELETE - Remove vendor from tender
app.delete('/api/tenders/:tenderId/vendors/:vendorId', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  try {
    // Get proposal file path before deleting
    const fileResult = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        SELECT proposal_document_path 
        FROM tender_vendors 
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    // Delete from database
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        DELETE FROM tender_vendors 
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    // Delete proposal file if exists
    if (fileResult.recordset.length > 0 && fileResult.recordset[0].proposal_document_path) {
      const filePath = fileResult.recordset[0].proposal_document_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Deleted proposal file:', filePath);
      }
    }
    console.log('✅ Vendor removed from tender');
    res.json({ success: true, message: 'Vendor removed successfully' });
  } catch (error) {
    console.error('❌ Error removing vendor:', error);
    res.status(500).json({ error: 'Failed to remove vendor', details: error.message });
  }
});
// =============================================================================
// DELIVERY ENDPOINTS
// =============================================================================
// GET all deliveries
app.get('/api/deliveries', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        d.*,
        t.reference_number as tender_reference,
        t.title as tender_title,
        t.is_finalized as tender_is_finalized
      FROM deliveries d
      LEFT JOIN tenders t ON d.tender_id = t.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});
// GET single delivery by ID
app.get('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          d.*,
          t.reference_number as tender_reference,
          t.title as tender_title,
          t.is_finalized as tender_is_finalized
        FROM deliveries d
        LEFT JOIN tenders t ON d.tender_id = t.id
        WHERE d.id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery', details: error.message });
  }
});
// POST create new delivery
app.post('/api/deliveries', async (req, res) => {
  try {
    const {
      delivery_number,
      tender_id,
      delivery_personnel,
      delivery_date,
      delivery_notes,
      delivery_chalan,
      chalan_file_path
    } = req.body;
    const deliveryId = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, deliveryId)
      .input('delivery_number', sql.Int, delivery_number)
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('delivery_personnel', sql.NVarChar, delivery_personnel)
      .input('delivery_date', sql.NVarChar, delivery_date)
      .input('delivery_notes', sql.NVarChar, delivery_notes)
      .input('delivery_chalan', sql.NVarChar, delivery_chalan)
      .input('chalan_file_path', sql.NVarChar, chalan_file_path)
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO deliveries (
          id, delivery_number, tender_id, delivery_personnel, delivery_date,
          delivery_notes, delivery_chalan, chalan_file_path, created_at, updated_at
        ) VALUES (
          @id, @delivery_number, @tender_id, @delivery_personnel, @delivery_date,
          @delivery_notes, @delivery_chalan, @chalan_file_path, @created_at, @updated_at
        )
      `);
    res.json({ 
      success: true, 
      id: deliveryId, 
      delivery_number: delivery_number,
      message: 'Delivery created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create delivery', details: error.message });
  }
});
// PUT update delivery
app.put('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_number,
      tender_id,
      delivery_personnel,
      delivery_date,
      delivery_notes,
      delivery_chalan,
      chalan_file_path
    } = req.body;
    // Check if delivery is finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT d.is_finalized
        FROM deliveries d
        WHERE d.id = @id
      `);
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    const { is_finalized } = checkResult.recordset[0];
    if (is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot update delivery - delivery is finalized',
        reason: 'delivery_finalized'
      });
    }
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('delivery_number', sql.Int, delivery_number)
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('delivery_personnel', sql.NVarChar, delivery_personnel)
      .input('delivery_date', sql.NVarChar, delivery_date)
      .input('delivery_notes', sql.NVarChar, delivery_notes)
      .input('delivery_chalan', sql.NVarChar, delivery_chalan)
      .input('chalan_file_path', sql.NVarChar, chalan_file_path)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE deliveries SET
          delivery_number = @delivery_number,
          tender_id = @tender_id,
          delivery_personnel = @delivery_personnel,
          delivery_date = @delivery_date,
          delivery_notes = @delivery_notes,
          delivery_chalan = @delivery_chalan,
          chalan_file_path = @chalan_file_path,
          updated_at = @updated_at
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Delivery updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery', details: error.message });
  }
});
// DELETE delivery
app.delete('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if delivery is finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT d.is_finalized
        FROM deliveries d
        WHERE d.id = @id
      `);
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    const { is_finalized } = checkResult.recordset[0];
    if (is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot delete delivery - delivery is finalized',
        reason: 'delivery_finalized'
      });
    }
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM deliveries WHERE id = @id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ 
      success: true, 
      message: 'Delivery deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete delivery', details: error.message });
  }
});
// POST create delivery items
app.post('/api/delivery-items', async (req, res) => {
  try {
    const { delivery_id, items } = req.body;
    if (!delivery_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing delivery_id or items array' });
    }
    // First, delete existing delivery items for this delivery
    await pool.request()
      .input('delivery_id', sql.UniqueIdentifier, delivery_id)
      .query('DELETE FROM delivery_items WHERE delivery_id = @delivery_id');
    const now = new Date().toISOString();
    // Insert new delivery items
    for (const item of items) {
      const itemId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('delivery_id', sql.UniqueIdentifier, delivery_id)
        .input('item_master_id', sql.NVarChar, item.item_master_id)
        .input('item_name', sql.NVarChar, item.item_name)
        .input('delivery_qty', sql.Int, item.delivery_qty)
        .input('created_at', sql.DateTime2, now)
        .query(`
          INSERT INTO delivery_items (
            id, delivery_id, item_master_id, item_name, delivery_qty, created_at
          ) VALUES (
            @id, @delivery_id, @item_master_id, @item_name, @delivery_qty, @created_at
          )
        `);
    }
    res.json({ 
      success: true, 
      message: 'Delivery items saved successfully',
      items_count: items.length
    });
  } catch (error) {
    console.error('Error saving delivery items:', error);
    res.status(500).json({ error: 'Failed to save delivery items', details: error.message });
  }
});
// PUT update delivery items
app.put('/api/delivery-items/:delivery_id', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing items array' });
    }
    // First, delete existing delivery items for this delivery
    await pool.request()
      .input('delivery_id', sql.UniqueIdentifier, delivery_id)
      .query('DELETE FROM delivery_items WHERE delivery_id = @delivery_id');
    const now = new Date().toISOString();
    // Insert updated delivery items
    for (const item of items) {
      const itemId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('delivery_id', sql.UniqueIdentifier, delivery_id)
        .input('item_master_id', sql.NVarChar, item.item_master_id)
        .input('item_name', sql.NVarChar, item.item_name)
        .input('delivery_qty', sql.Int, item.delivery_qty)
        .input('created_at', sql.DateTime2, now)
        .query(`
          INSERT INTO delivery_items (
            id, delivery_id, item_master_id, item_name, delivery_qty, created_at
          ) VALUES (
            @id, @delivery_id, @item_master_id, @item_name, @delivery_qty, @created_at
          )
        `);
    }
    res.json({ 
      success: true, 
      message: 'Delivery items updated successfully',
      items_count: items.length
    });
  } catch (error) {
    console.error('Error updating delivery items:', error);
    res.status(500).json({ error: 'Failed to update delivery items', details: error.message });
  }
});
// PUT finalize delivery and add to inventory
app.put('/api/deliveries/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalized_by } = req.body;
    const now = new Date().toISOString();
    try {
      // Check if delivery exists and is not already finalized
      const checkResult = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT d.is_finalized
          FROM deliveries d
          WHERE d.id = @id
        `);
      if (checkResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }
      const { is_finalized } = checkResult.recordset[0];
      if (is_finalized) {
        return res.status(400).json({ error: 'Delivery is already finalized' });
      }
      // Update delivery to finalized status
      // Note: finalized_by is stored as NVARCHAR, so we don't need to convert it to GUID
      const updateQuery = `
        UPDATE deliveries SET
          is_finalized = 1,
          finalized_by = @finalized_by,
          finalized_at = @finalized_at,
          updated_at = @updated_at
        WHERE id = @id
      `;
      const request = pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('finalized_by', sql.NVarChar(450), finalized_by)
        .input('finalized_at', sql.DateTime2, now)
        .input('updated_at', sql.DateTime2, now);
      await request.query(updateQuery);
      res.json({ 
        success: true, 
        id: id,
        message: 'Delivery finalized successfully',
        finalized_at: now,
        finalized_by: finalized_by
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error finalizing delivery:', error);
    res.status(500).json({ 
      error: 'Failed to finalize delivery', 
      details: error.message 
    });
  }
});
// =============================================================================
// STOCK TRANSACTION / INVENTORY ENDPOINTS
// =============================================================================
// GET all current inventory stock
app.get('/api/inventory-stock', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        cis.id,
        cis.item_master_id,
        cis.current_quantity,
        cis.reserved_quantity,
        cis.available_quantity,
        cis.minimum_stock_level,
        cis.reorder_point,
        cis.maximum_stock_level,
        cis.last_updated,
        cis.created_at,
        cis.updated_by,
        im.nomenclature as item_name,
        im.item_code,
        im.unit,
        im.category_id,
        im.specifications,
        im.description
      FROM current_inventory_stock cis
      LEFT JOIN item_masters im ON cis.item_master_id = im.id
      ORDER BY cis.last_updated DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory stock', details: error.message });
  }
});
// GET single inventory stock by ID
app.get('/api/inventory-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          cis.*,
          im.nomenclature as item_name,
          im.item_code,
          im.unit,
          im.category_id,
          im.specifications
        FROM current_inventory_stock cis
        LEFT JOIN item_masters im ON cis.item_master_id = im.id
        WHERE cis.id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory stock', details: error.message });
  }
});
// POST create new inventory stock record
app.post('/api/inventory-stock', async (req, res) => {
  try {
    const {
      item_master_id,
      current_quantity,
      reserved_quantity,
      available_quantity,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      updated_by
    } = req.body;
    const stockId = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, stockId)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('current_quantity', sql.Int, current_quantity)
      .input('reserved_quantity', sql.Int, reserved_quantity || 0)
      .input('available_quantity', sql.Int, available_quantity || current_quantity)
      .input('minimum_stock_level', sql.Int, minimum_stock_level || 0)
      .input('reorder_point', sql.Int, reorder_point || 0)
      .input('maximum_stock_level', sql.Int, maximum_stock_level || 0)
      .input('updated_by', sql.NVarChar, updated_by)
      .input('last_updated', sql.DateTime2, now)
      .input('created_at', sql.DateTime2, now)
      .query(`
        INSERT INTO current_inventory_stock (
          id, item_master_id, current_quantity, reserved_quantity, available_quantity,
          minimum_stock_level, reorder_point, maximum_stock_level, updated_by,
          last_updated, created_at
        ) VALUES (
          @id, @item_master_id, @current_quantity, @reserved_quantity, @available_quantity,
          @minimum_stock_level, @reorder_point, @maximum_stock_level, @updated_by,
          @last_updated, @created_at
        )
      `);
    res.json({ 
      success: true, 
      id: stockId,
      item_master_id: item_master_id,
      message: 'Inventory stock record created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create inventory stock record', details: error.message });
  }
});
// PUT update inventory stock (stock transaction)
app.put('/api/inventory-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      current_quantity,
      reserved_quantity,
      available_quantity,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      updated_by
    } = req.body;
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('current_quantity', sql.Int, current_quantity)
      .input('reserved_quantity', sql.Int, reserved_quantity)
      .input('available_quantity', sql.Int, available_quantity)
      .input('minimum_stock_level', sql.Int, minimum_stock_level)
      .input('reorder_point', sql.Int, reorder_point)
      .input('maximum_stock_level', sql.Int, maximum_stock_level)
      .input('updated_by', sql.NVarChar, updated_by)
      .input('last_updated', sql.DateTime2, now)
      .query(`
        UPDATE current_inventory_stock SET
          current_quantity = @current_quantity,
          reserved_quantity = @reserved_quantity,
          available_quantity = @available_quantity,
          minimum_stock_level = @minimum_stock_level,
          reorder_point = @reorder_point,
          maximum_stock_level = @maximum_stock_level,
          updated_by = @updated_by,
          last_updated = @last_updated
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Inventory stock updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory stock', details: error.message });
  }
});
// DELETE inventory stock record
app.delete('/api/inventory-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM current_inventory_stock WHERE id = @id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    res.json({ 
      success: true, 
      message: 'Inventory stock record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory stock record', details: error.message });
  }
});
// POST stock transaction (adjust stock levels)
app.post('/api/inventory-stock/:id/transaction', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_type, // 'IN', 'OUT', 'ADJUST'
      quantity,
      reason,
      updated_by
    } = req.body;
    const now = new Date().toISOString();
    // Get current stock levels
    const currentStock = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM current_inventory_stock WHERE id = @id');
    if (currentStock.recordset.length === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    const stock = currentStock.recordset[0];
    let newCurrentQuantity = stock.current_quantity;
    let newAvailableQuantity = stock.available_quantity;
    // Calculate new quantities based on transaction type
    switch (transaction_type.toUpperCase()) {
      case 'IN':
        newCurrentQuantity += quantity;
        newAvailableQuantity += quantity;
        break;
      case 'OUT':
        newCurrentQuantity -= quantity;
        newAvailableQuantity -= quantity;
        break;
      case 'ADJUST':
        newCurrentQuantity = quantity;
        newAvailableQuantity = quantity - stock.reserved_quantity;
        break;
      default:
        return res.status(400).json({ error: 'Invalid transaction type. Use IN, OUT, or ADJUST' });
    }
    // Ensure quantities don't go negative
    if (newCurrentQuantity < 0) newCurrentQuantity = 0;
    if (newAvailableQuantity < 0) newAvailableQuantity = 0;
    // Update the stock record
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('current_quantity', sql.Int, newCurrentQuantity)
      .input('available_quantity', sql.Int, newAvailableQuantity)
      .input('updated_by', sql.NVarChar, updated_by)
      .input('last_updated', sql.DateTime2, now)
      .query(`
        UPDATE current_inventory_stock SET
          current_quantity = @current_quantity,
          available_quantity = @available_quantity,
          updated_by = @updated_by,
          last_updated = @last_updated
        WHERE id = @id
      `);
    res.json({ 
      success: true, 
      transaction_type: transaction_type,
      quantity: quantity,
      previous_quantity: stock.current_quantity,
      new_quantity: newCurrentQuantity,
      message: `Stock ${transaction_type.toLowerCase()} transaction completed successfully`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process stock transaction', details: error.message });
  }
});
// =============================================================================
// ITEM MASTER ENDPOINTS
// =============================================================================
// GET all item masters
app.get('/api/item-masters', async (req, res) => {
  try {
    console.log('🔍 Starting /api/item-masters request...');
    if (!pool) {
      console.log('⚠️ No database pool available, returning mock data');
      // Return mock data when SQL Server is not connected
      const mockItemMasters = [
        { 
          id: '1', 
          nomenclature: 'Desktop Computer', 
          item_code: 'IT001', 
          unit: 'Unit', 
          category_id: '1', 
          sub_category_id: '1',
          specifications: 'Intel i5, 8GB RAM, 500GB HDD',
          description: 'Standard desktop computer for office use',
          status: 'Active',
          minimum_stock_level: 5,
          maximum_stock_level: 50,
          reorder_point: 10,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          category_name: 'Information Technology',
          sub_category_name: 'Computers'
        },
        { 
          id: '2', 
          nomenclature: 'Office Chair', 
          item_code: 'FUR001', 
          unit: 'Unit', 
          category_id: '2', 
          sub_category_id: '2',
          specifications: 'Ergonomic design, adjustable height',
          description: 'Comfortable office chair with back support',
          status: 'Active',
          minimum_stock_level: 2,
          maximum_stock_level: 20,
          reorder_point: 5,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          category_name: 'Furniture',
          sub_category_name: 'Office Furniture'
        },
        { 
          id: '3', 
          nomenclature: 'A4 Paper', 
          item_code: 'STA001', 
          unit: 'Ream', 
          category_id: '3', 
          sub_category_id: '3',
          specifications: '80GSM, white, 500 sheets',
          description: 'Standard office paper for printing',
          status: 'Active',
          minimum_stock_level: 10,
          maximum_stock_level: 100,
          reorder_point: 20,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          category_name: 'Stationery',
          sub_category_name: 'Paper Products'
        }
      ];
      return res.json(mockItemMasters);
    }
    console.log('📊 Executing database query...');
    const result = await pool.request().query(`
      SELECT 
        id,
        item_code,
        nomenclature,
        category_id,
        sub_category_id,
        unit,
        specifications,
        description,
        status,
        minimum_stock_level,
        maximum_stock_level,
        reorder_point,
        created_at,
        updated_at,
        category_name,
        sub_category_name
      FROM vw_item_masters_with_categories
      ORDER BY nomenclature
    `);
    console.log('✅ Query executed successfully, rows returned:', result.recordset.length);
    if (result.recordset.length > 0) {
      console.log('📊 First item sample:', JSON.stringify(result.recordset[0], null, 2));
    }
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error in /api/item-masters:', error.message);
    console.error('📋 Full error:', error);
    // Fallback to mock data on any error
    const mockItemMasters = [
      { 
        id: '1', 
        nomenclature: 'Desktop Computer', 
        item_code: 'IT001', 
        unit: 'Unit', 
        category_id: '1', 
        sub_category_id: '1',
        specifications: 'Intel i5, 8GB RAM, 500GB HDD',
        description: 'Standard desktop computer for office use',
        status: 'Active',
        minimum_stock_level: 5,
        maximum_stock_level: 50,
        reorder_point: 10,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        category_name: 'Information Technology',
        sub_category_name: 'Computers'
      },
      { 
        id: '2', 
        nomenclature: 'Office Chair', 
        item_code: 'FUR001', 
        unit: 'Unit', 
        category_id: '2', 
        sub_category_id: '2',
        specifications: 'Ergonomic design, adjustable height',
        description: 'Comfortable office chair with back support',
        status: 'Active',
        minimum_stock_level: 2,
        maximum_stock_level: 20,
        reorder_point: 5,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        category_name: 'Furniture',
        sub_category_name: 'Office Furniture'
      },
      { 
        id: '3', 
        nomenclature: 'A4 Paper', 
        item_code: 'STA001', 
        unit: 'Ream', 
        category_id: '3', 
        sub_category_id: '3',
        specifications: '80GSM, white, 500 sheets',
        description: 'Standard office paper for printing',
        status: 'Active',
        minimum_stock_level: 10,
        maximum_stock_level: 100,
        reorder_point: 20,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        category_name: 'Stationery',
        sub_category_name: 'Paper Products'
      }
    ];
    res.json(mockItemMasters);
  }
});
// GET single item master by ID
app.get('/api/item-masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          nomenclature,
          item_code,
          unit,
          category_id,
          sub_category_id,
          specifications,
          description,
          minimum_stock_level,
          reorder_point,
          maximum_stock_level,
          status,
          created_at,
          updated_at
        FROM item_masters 
        WHERE id = @id AND status != 'Deleted'
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item master not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item master', details: error.message });
  }
});
// POST create new item master
app.post('/api/item-masters', async (req, res) => {
  try {
    const {
      nomenclature,
      item_code,
      unit,
      category_id,
      sub_category_id,
      specifications,
      description,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      status = 'Active'
    } = req.body;
    const itemId = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('item_code', sql.NVarChar, item_code)
      .input('unit', sql.NVarChar, unit || null)
      .input('category_id', sql.UniqueIdentifier, category_id)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id || null)
      .input('specifications', sql.NVarChar, specifications || null)
      .input('description', sql.NVarChar, description || null)
      .input('minimum_stock_level', sql.Int, minimum_stock_level || 0)
      .input('reorder_point', sql.Int, reorder_point || 0)
      .input('maximum_stock_level', sql.Int, maximum_stock_level || 0)
      .input('status', sql.NVarChar, status)
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO item_masters (
          id, nomenclature, item_code, unit, category_id, sub_category_id,
          specifications, description, minimum_stock_level, reorder_point,
          maximum_stock_level, status, created_at, updated_at
        ) VALUES (
          @id, @nomenclature, @item_code, @unit, @category_id, @sub_category_id,
          @specifications, @description, @minimum_stock_level, @reorder_point,
          @maximum_stock_level, @status, @created_at, @updated_at
        )
      `);
    res.json({ 
      id: itemId,
      nomenclature: nomenclature,
      item_code: item_code,
      category_id: category_id,
      status: status
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item master', details: error.message });
  }
});
// PUT update item master
app.put('/api/item-masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nomenclature,
      item_code,
      unit,
      category_id,
      sub_category_id,
      specifications,
      description,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      status
    } = req.body;
    console.log('🔄 PUT /api/item-masters/:id - Request received');
    console.log('📝 Item ID:', id);
    console.log('📊 Request body:', req.body);
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('item_code', sql.NVarChar, item_code)
      .input('unit', sql.NVarChar, unit)
      .input('category_id', sql.UniqueIdentifier, category_id)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id)
      .input('specifications', sql.NVarChar, specifications)
      .input('description', sql.NVarChar, description)
      .input('minimum_stock_level', sql.Int, minimum_stock_level)
      .input('reorder_point', sql.Int, reorder_point)
      .input('maximum_stock_level', sql.Int, maximum_stock_level)
      .input('status', sql.NVarChar, status)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE item_masters SET
          nomenclature = @nomenclature,
          item_code = @item_code,
          unit = @unit,
          category_id = @category_id,
          sub_category_id = @sub_category_id,
          specifications = @specifications,
          description = @description,
          minimum_stock_level = @minimum_stock_level,
          reorder_point = @reorder_point,
          maximum_stock_level = @maximum_stock_level,
          status = @status,
          updated_at = @updated_at
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Item master not found' });
    }
    console.log('✅ Item master updated successfully');
    res.json({ 
      success: true, 
      id: id,
      message: 'Item master updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating item master:', error);
    console.error('📋 Error details:', error.message);
    res.status(500).json({ error: 'Failed to update item master', details: error.message });
  }
});
// DELETE item master (soft delete)
app.delete('/api/item-masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE item_masters SET
          status = 'Deleted',
          updated_at = @updated_at
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Item master not found' });
    }
    res.json({ 
      success: true, 
      message: 'Item master deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item master', details: error.message });
  }
});
// =============================================================================
// CATEGORIES ENDPOINTS
// =============================================================================
// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    console.log('📋 /api/categories endpoint called');
    if (!pool) {
      console.log('⚠️ No pool connection, returning mock categories');
      // Return mock data when SQL Server is not connected
      const mockCategories = [
        { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active', item_type: 'Dispensable', item_count: 0 },
        { id: 2, category_name: 'Furniture', description: 'Office furniture and fixtures', status: 'Active', item_type: 'Indispensable', item_count: 0 },
        { id: 3, category_name: 'Stationery', description: 'Office supplies and stationery', status: 'Active', item_type: 'Dispensable', item_count: 0 },
        { id: 4, category_name: 'Vehicles', description: 'Government vehicles and transport', status: 'Active', item_type: 'Indispensable', item_count: 0 },
        { id: 5, category_name: 'Medical Equipment', description: 'Medical and healthcare equipment', status: 'Active', item_type: 'Dispensable', item_count: 0 }
      ];
      console.log('✅ Returning mock categories:', mockCategories.length);
      return res.json(mockCategories);
    }
    console.log('🔍 Fetching categories from database...');
    const result = await pool.request().query(`
      SELECT 
        c.id,
        c.category_name,
        c.description,
        c.status,
        c.item_type,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT im.id) as item_count
      FROM categories c
      LEFT JOIN item_masters im ON c.id = im.category_id
      WHERE c.status = 'Active'
      GROUP BY c.id, c.category_name, c.description, c.status, c.item_type, c.created_at, c.updated_at
      ORDER BY c.category_name
    `);
    console.log('✅ Categories fetched from database:', result.recordset.length);
    console.log('📋 First category:', result.recordset[0]);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});
// GET single category by ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      const mockCategory = { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active' };
      return res.json(mockCategory);
    }
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          id,
          category_name,
          description,
          status,
          created_at,
          updated_at
        FROM categories 
        WHERE id = @id AND status != 'Deleted'
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category', details: error.message });
  }
});
// GET items in a category
app.get('/api/categories/:categoryId/items', async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log(`📦 Fetching items for category ${categoryId}...`);
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockItems = [
        { id: '1', nomenclature: 'Desktop Computer', item_code: 'COMP-001' },
        { id: '2', nomenclature: 'Laptop', item_code: 'COMP-002' },
        { id: '3', nomenclature: 'Monitor', item_code: 'COMP-003' }
      ];
      return res.json(mockItems);
    }
    const result = await pool.request()
      .input('categoryId', sql.UniqueIdentifier, categoryId)
      .query(`
        SELECT 
          id,
          nomenclature,
          item_code,
          description
        FROM item_masters
        WHERE category_id = @categoryId
        AND is_deleted = 0
        ORDER BY nomenclature
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching category items:', error);
    res.status(500).json({ error: 'Failed to fetch category items', details: error.message });
  }
});
// =============================================================================
// SUB-CATEGORIES ENDPOINTS
// =============================================================================
// GET all sub-categories
app.get('/api/sub-categories', async (req, res) => {
  try {
    console.log('🔍 Fetching all sub-categories...');
    if (!pool) {
      const mockSubCategories = [
        { id: 1, sub_category_name: 'Computers', category_id: 1, description: 'Desktop and laptop computers', status: 'Active', item_count: 0 },
        { id: 2, sub_category_name: 'Printers', category_id: 1, description: 'All types of printers', status: 'Active', item_count: 0 },
        { id: 3, sub_category_name: 'Office Chairs', category_id: 2, description: 'Office seating furniture', status: 'Active', item_count: 0 },
        { id: 4, sub_category_name: 'Desks', category_id: 2, description: 'Office desks and tables', status: 'Active', item_count: 0 },
        { id: 5, sub_category_name: 'Paper Products', category_id: 3, description: 'All paper-based stationery', status: 'Active', item_count: 0 },
        { id: 6, sub_category_name: 'Writing Instruments', category_id: 3, description: 'Pens, pencils, markers', status: 'Active', item_count: 0 }
      ];
      return res.json(mockSubCategories);
    }
    const result = await pool.request().query(`
      SELECT 
        sc.id,
        sc.sub_category_name,
        sc.category_id,
        sc.description,
        sc.status,
        sc.created_at,
        sc.updated_at,
        COUNT(DISTINCT im.id) as item_count
      FROM sub_categories sc
      LEFT JOIN item_masters im ON sc.id = im.sub_category_id
      WHERE sc.status != 'Deleted'
      GROUP BY sc.id, sc.sub_category_name, sc.category_id, sc.description, sc.status, sc.created_at, sc.updated_at
      ORDER BY sc.sub_category_name
    `);
    console.log('✅ Sub-categories fetched:', result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching sub-categories:', error);
    // Fallback to mock data on any error
    const mockSubCategories = [
      { id: 1, sub_category_name: 'Computers', category_id: 1, description: 'Desktop and laptop computers', status: 'Active' },
      { id: 2, sub_category_name: 'Printers', category_id: 1, description: 'All types of printers', status: 'Active' },
      { id: 3, sub_category_name: 'Office Chairs', category_id: 2, description: 'Office seating furniture', status: 'Active' },
      { id: 4, sub_category_name: 'Desks', category_id: 2, description: 'Office desks and tables', status: 'Active' },
      { id: 5, sub_category_name: 'Paper Products', category_id: 3, description: 'All paper-based stationery', status: 'Active' },
      { id: 6, sub_category_name: 'Writing Instruments', category_id: 3, description: 'Pens, pencils, markers', status: 'Active' }
    ];
    res.json(mockSubCategories);
  }
});
// GET sub-categories by category ID
app.get('/api/sub-categories/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log('🔍 Fetching sub-categories for category:', categoryId);
    if (!pool) {
      const mockSubCategories = [
        { id: 1, sub_category_name: 'Computers', category_id: 1, description: 'Desktop and laptop computers', status: 'Active' },
        { id: 2, sub_category_name: 'Printers', category_id: 1, description: 'All types of printers', status: 'Active' }
      ].filter(sub => sub.category_id.toString() === categoryId);
      return res.json(mockSubCategories);
    }
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query(`
        SELECT 
          id,
          sub_category_name,
          category_id,
          description,
          status,
          created_at,
          updated_at
        FROM sub_categories 
        WHERE category_id = @categoryId AND status != 'Deleted'
        ORDER BY sub_category_name
      `);
    console.log('✅ Sub-categories fetched for category', categoryId, ':', result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching sub-categories by category:', error);
    res.status(500).json({ error: 'Failed to fetch sub-categories', details: error.message });
  }
});
// POST - Create new category
app.post('/api/categories', async (req, res) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const categoryId = uuidv4();
    const now = new Date().toISOString();
    console.log('🔧 Creating category with data:', { category_name, description, status: 'Active', item_type: 'Dispensable' });
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, categoryId)
      .input('category_name', sql.NVarChar, category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, 'Active')
      .input('item_type', sql.NVarChar, 'Dispensable')
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO categories (id, category_name, description, status, item_type, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@id, @category_name, @description, @status, @item_type, @created_at, @updated_at)
      `);
    console.log('✅ Category created:', result.recordset[0]);
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});
// PUT - Update category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description, item_type, status } = req.body;
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('category_name', sql.NVarChar, category_name)
      .input('description', sql.NVarChar, description || null)
      .input('item_type', sql.NVarChar, item_type || 'Dispensable')
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE categories
        SET category_name = @category_name,
            description = @description,
            item_type = @item_type,
            status = @status,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    console.log('✅ Category updated:', result.recordset[0]);
    res.json({ message: 'Category updated successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});
// DELETE - Delete category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if category has sub-categories
    const checkResult = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT COUNT(*) as count FROM sub_categories WHERE category_id = @id');
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing sub-categories',
        details: 'Please delete all sub-categories first'
      });
    }
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM categories OUTPUT DELETED.* WHERE id = @id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    console.log('✅ Category deleted:', result.recordset[0]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category', details: error.message });
  }
});
// POST - Create new sub-category
app.post('/api/sub-categories', async (req, res) => {
  try {
    const { category_id, sub_category_name, description, status } = req.body;
    if (!category_id || !sub_category_name) {
      return res.status(400).json({ error: 'Category ID and sub-category name are required' });
    }
    const result = await pool.request()
      .input('category_id', sql.NVarChar, category_id)
      .input('sub_category_name', sql.NVarChar, sub_category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO sub_categories (category_id, sub_category_name, description, status, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@category_id, @sub_category_name, @description, @status, GETDATE(), GETDATE())
      `);
    console.log('✅ Sub-category created:', result.recordset[0]);
    res.json({ message: 'Sub-category created successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error creating sub-category:', error);
    res.status(500).json({ error: 'Failed to create sub-category', details: error.message });
  }
});
// PUT - Update sub-category
app.put('/api/sub-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, sub_category_name, description, status } = req.body;
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('category_id', sql.NVarChar, category_id)
      .input('sub_category_name', sql.NVarChar, sub_category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE sub_categories
        SET category_id = @category_id,
            sub_category_name = @sub_category_name,
            description = @description,
            status = @status,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }
    console.log('✅ Sub-category updated:', result.recordset[0]);
    res.json({ message: 'Sub-category updated successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error updating sub-category:', error);
    res.status(500).json({ error: 'Failed to update sub-category', details: error.message });
  }
});
// DELETE - Delete sub-category
app.delete('/api/sub-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM sub_categories OUTPUT DELETED.* WHERE id = @id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }
    console.log('✅ Sub-category deleted:', result.recordset[0]);
    res.json({ message: 'Sub-category deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting sub-category:', error);
    res.status(500).json({ error: 'Failed to delete sub-category', details: error.message });
  }
});
// =============================================================================
// VENDOR ENDPOINTS
// =============================================================================
// GET all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    console.log('📋 /api/vendors endpoint called');
    if (!pool) {
      console.log('⚠️ No pool connection, returning mock vendors');
      // Return mock data when SQL Server is not connected
      const mockVendors = [
        { id: '1', vendor_code: 'VEN001', vendor_name: 'ABC Suppliers Ltd', contact_person: 'John Smith', email: 'john@abc.com', phone: '021-1234567', status: 'Active' },
        { id: '2', vendor_code: 'VEN002', vendor_name: 'XYZ Traders', contact_person: 'Jane Doe', email: 'jane@xyz.com', phone: '021-7654321', status: 'Active' },
        { id: '3', vendor_code: 'VEN003', vendor_name: 'Best Quality Co', contact_person: 'Mike Johnson', email: 'mike@bestquality.com', phone: '042-1111111', status: 'Active' }
      ];
      return res.json({ vendors: mockVendors });
    }
    const result = await pool.request().query(`
      SELECT 
        id,
        vendor_code,
        vendor_name,
        ISNULL(contact_person, 'Not Provided') as contact_person,
        ISNULL(email, 'Not Provided') as email,
        phone,
        address,
        city,
        country,
        tax_number,
        status,
        created_at,
        updated_at
      FROM vendors 
      WHERE status != 'Deleted'
      ORDER BY vendor_name
    `);
    console.log(`✅ Found ${result.recordset.length} vendors from database`);
    console.log('📋 First vendor sample:', result.recordset[0]);
    res.json({ vendors: result.recordset });
  } catch (error) {
    console.error('❌ Error in /api/vendors:', error.message);
    // Fallback to mock data on any error
    const mockVendors = [
      { id: '1', vendor_code: 'VEN001', vendor_name: 'ABC Suppliers Ltd', contact_person: 'John Smith', email: 'john@abc.com', phone: '021-1234567', status: 'Active' },
      { id: '2', vendor_code: 'VEN002', vendor_name: 'XYZ Traders', contact_person: 'Jane Doe', email: 'jane@xyz.com', phone: '021-7654321', status: 'Active' },
      { id: '3', vendor_code: 'VEN003', vendor_name: 'Best Quality Co', contact_person: 'Mike Johnson', email: 'mike@bestquality.com', phone: '042-1111111', status: 'Active' }
    ];
    res.json({ vendors: mockVendors });
  }
});
// GET single vendor by ID
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          vendor_code,
          vendor_name,
          contact_person,
          email,
          phone,
          address,
          city,
          country,
          tax_number,
          status,
          created_at,
          updated_at
        FROM vendors 
        WHERE id = @id AND status != 'Deleted'
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor', details: error.message });
  }
});
// POST create new vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const {
      vendor_code,
      vendor_name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_number,
      status = 'Active'
    } = req.body;
    const vendorId = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, vendorId)
      .input('vendor_code', sql.NVarChar, vendor_code)
      .input('vendor_name', sql.NVarChar, vendor_name)
      .input('contact_person', sql.NVarChar, contact_person)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('city', sql.NVarChar, city)
      .input('country', sql.NVarChar, country)
      .input('tax_number', sql.NVarChar, tax_number)
      .input('status', sql.NVarChar, status)
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO vendors (
          id, vendor_code, vendor_name, contact_person, email, phone,
          address, city, country, tax_number, status, created_at, updated_at
        ) VALUES (
          @id, @vendor_code, @vendor_name, @contact_person, @email, @phone,
          @address, @city, @country, @tax_number, @status, @created_at, @updated_at
        )
      `);
    res.json({ 
      success: true, 
      id: vendorId, 
      vendor_code: vendor_code,
      vendor_name: vendor_name,
      message: 'Vendor created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor', details: error.message });
  }
});
// PUT update vendor
app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_code,
      vendor_name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_number,
      status
    } = req.body;
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('vendor_code', sql.NVarChar, vendor_code)
      .input('vendor_name', sql.NVarChar, vendor_name)
      .input('contact_person', sql.NVarChar, contact_person)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('city', sql.NVarChar, city)
      .input('country', sql.NVarChar, country)
      .input('tax_number', sql.NVarChar, tax_number)
      .input('status', sql.NVarChar, status)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE vendors SET
          vendor_code = @vendor_code,
          vendor_name = @vendor_name,
          contact_person = @contact_person,
          email = @email,
          phone = @phone,
          address = @address,
          city = @city,
          country = @country,
          tax_number = @tax_number,
          status = @status,
          updated_at = @updated_at
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Vendor updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor', details: error.message });
  }
});
// DELETE vendor (soft delete)
app.delete('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE vendors SET
          status = 'Deleted',
          updated_at = @updated_at
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ 
      success: true, 
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor', details: error.message });
  }
});
// ==================== REORDER REQUESTS ENDPOINTS ====================
// Get all reorder requests or filter by status
app.get('/api/reorder-requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    let query = `
      SELECT 
        rr.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name
      FROM reorder_requests rr
      LEFT JOIN item_masters im ON rr.item_master_id = im.id
      LEFT JOIN Office o ON rr.office_id = o.intOfficeID
      WHERE rr.boolDeleted = 0
    `;
    const request = pool.request();
    // Add status filter if provided
    if (req.query.status) {
      query += ` AND rr.status = @status`;
      request.input('status', sql.VarChar, req.query.status);
    }
    query += ` ORDER BY rr.created_at DESC`;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reorder requests', details: error.message });
  }
});
// Get reorder request by ID
app.get('/api/reorder-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          rr.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name
        FROM reorder_requests rr
        LEFT JOIN item_masters im ON rr.item_master_id = im.id
        LEFT JOIN Office o ON rr.office_id = o.intOfficeID
        WHERE rr.id = @id AND rr.boolDeleted = 0
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reorder request', details: error.message });
  }
});
// Create new reorder request
app.post('/api/reorder-requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const {
      item_master_id,
      office_id,
      current_stock,
      minimum_level,
      reorder_level,
      suggested_quantity,
      actual_quantity,
      priority,
      requested_by,
      remarks
    } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('office_id', sql.Int, office_id)
      .input('current_stock', sql.Int, current_stock)
      .input('minimum_level', sql.Int, minimum_level)
      .input('reorder_level', sql.Int, reorder_level)
      .input('suggested_quantity', sql.Int, suggested_quantity)
      .input('actual_quantity', sql.Int, actual_quantity || null)
      .input('priority', sql.VarChar, priority || 'Medium')
      .input('status', sql.VarChar, 'Pending')
      .input('requested_by', sql.VarChar, requested_by)
      .input('requested_at', sql.DateTime, now)
      .input('remarks', sql.Text, remarks || null)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .input('boolActive', sql.Bit, true)
      .input('boolDeleted', sql.Bit, false)
      .query(`
        INSERT INTO reorder_requests (
          id, item_master_id, office_id, current_stock, minimum_level, 
          reorder_level, suggested_quantity, actual_quantity, priority, 
          status, requested_by, requested_at, remarks, created_at, 
          updated_at, boolActive, boolDeleted
        ) VALUES (
          @id, @item_master_id, @office_id, @current_stock, @minimum_level,
          @reorder_level, @suggested_quantity, @actual_quantity, @priority,
          @status, @requested_by, @requested_at, @remarks, @created_at,
          @updated_at, @boolActive, @boolDeleted
        );
        SELECT 
          rr.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name
        FROM reorder_requests rr
        LEFT JOIN item_masters im ON rr.item_master_id = im.id
        LEFT JOIN Office o ON rr.office_id = o.intOfficeID
        WHERE rr.id = @id;
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reorder request', details: error.message });
  }
});
// Update reorder request
app.put('/api/reorder-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const updateData = req.body;
    const now = new Date().toISOString();
    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        if (key.includes('_at') || key.includes('Date')) {
          request.input(key, sql.DateTime, updateData[key]);
        } else if (typeof updateData[key] === 'number') {
          request.input(key, sql.Int, updateData[key]);
        } else if (typeof updateData[key] === 'boolean') {
          request.input(key, sql.Bit, updateData[key]);
        } else {
          request.input(key, sql.VarChar, updateData[key]);
        }
      }
    });
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    fields.push('updated_at = @updated_at');
    request.input('updated_at', sql.DateTime, now);
    const result = await request.query(`
      UPDATE reorder_requests 
      SET ${fields.join(', ')}
      WHERE id = @id AND boolDeleted = 0;
      SELECT 
        rr.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name
      FROM reorder_requests rr
      LEFT JOIN item_masters im ON rr.item_master_id = im.id
      LEFT JOIN Office o ON rr.office_id = o.intOfficeID
      WHERE rr.id = @id;
    `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reorder request', details: error.message });
  }
});
// Delete reorder request
app.delete('/api/reorder-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE reorder_requests 
        SET boolDeleted = 1, updated_at = @updated_at
        WHERE id = @id AND boolDeleted = 0
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }
    res.json({ message: 'Reorder request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reorder request', details: error.message });
  }
});
// ==================== STOCK TRANSACTIONS ENDPOINTS ====================
// Get all stock transactions with filters
app.get('/api/stock-transactions', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    let query = `
      SELECT 
        st.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name,
        fo.strOfficeName as from_office_name,
        to_office.strOfficeName as to_office_name
      FROM stock_transactions st
      LEFT JOIN item_masters im ON st.item_master_id = im.id
      LEFT JOIN Office o ON st.office_id = o.intOfficeID
      LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
      LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
      WHERE st.boolDeleted = 0
    `;
    const request = pool.request();
    // Add filters
    if (req.query.officeId) {
      query += ` AND st.office_id = @officeId`;
      request.input('officeId', sql.Int, req.query.officeId);
    }
    if (req.query.itemMasterId) {
      query += ` AND st.item_master_id = @itemMasterId`;
      request.input('itemMasterId', sql.UniqueIdentifier, req.query.itemMasterId);
    }
    if (req.query.type) {
      query += ` AND st.transaction_type = @type`;
      request.input('type', sql.VarChar, req.query.type);
    }
    if (req.query.startDate) {
      query += ` AND st.transaction_date >= @startDate`;
      request.input('startDate', sql.DateTime, req.query.startDate);
    }
    if (req.query.endDate) {
      query += ` AND st.transaction_date <= @endDate`;
      request.input('endDate', sql.DateTime, req.query.endDate);
    }
    query += ` ORDER BY st.transaction_date DESC, st.created_at DESC`;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions', details: error.message });
  }
});
// Get stock transaction by ID
app.get('/api/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          st.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name,
          fo.strOfficeName as from_office_name,
          to_office.strOfficeName as to_office_name
        FROM stock_transactions st
        LEFT JOIN item_masters im ON st.item_master_id = im.id
        LEFT JOIN Office o ON st.office_id = o.intOfficeID
        LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
        LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
        WHERE st.id = @id AND st.boolDeleted = 0
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transaction', details: error.message });
  }
});
// Create new stock transaction
app.post('/api/stock-transactions', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const {
      item_master_id,
      office_id,
      transaction_type,
      quantity,
      unit_price,
      total_value,
      reference_type,
      reference_id,
      reference_number,
      from_office_id,
      to_office_id,
      remarks,
      transaction_date,
      created_by
    } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    const transactionDate = transaction_date || now;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('office_id', sql.Int, office_id)
      .input('transaction_type', sql.VarChar, transaction_type)
      .input('quantity', sql.Int, quantity)
      .input('unit_price', sql.Decimal(18, 2), unit_price || null)
      .input('total_value', sql.Decimal(18, 2), total_value || (unit_price && quantity ? unit_price * quantity : null))
      .input('reference_type', sql.VarChar, reference_type || null)
      .input('reference_id', sql.VarChar, reference_id || null)
      .input('reference_number', sql.VarChar, reference_number || null)
      .input('from_office_id', sql.Int, from_office_id || null)
      .input('to_office_id', sql.Int, to_office_id || null)
      .input('remarks', sql.Text, remarks || null)
      .input('transaction_date', sql.DateTime, transactionDate)
      .input('created_by', sql.VarChar, created_by)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .input('boolActive', sql.Bit, true)
      .input('boolDeleted', sql.Bit, false)
      .query(`
        INSERT INTO stock_transactions (
          id, item_master_id, office_id, transaction_type, quantity,
          unit_price, total_value, reference_type, reference_id, reference_number,
          from_office_id, to_office_id, remarks, transaction_date, created_by,
          created_at, updated_at, boolActive, boolDeleted
        ) VALUES (
          @id, @item_master_id, @office_id, @transaction_type, @quantity,
          @unit_price, @total_value, @reference_type, @reference_id, @reference_number,
          @from_office_id, @to_office_id, @remarks, @transaction_date, @created_by,
          @created_at, @updated_at, @boolActive, @boolDeleted
        );
        SELECT 
          st.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name,
          fo.strOfficeName as from_office_name,
          to_office.strOfficeName as to_office_name
        FROM stock_transactions st
        LEFT JOIN item_masters im ON st.item_master_id = im.id
        LEFT JOIN Office o ON st.office_id = o.intOfficeID
        LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
        LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
        WHERE st.id = @id;
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock transaction', details: error.message });
  }
});
// Update stock transaction
app.put('/api/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const updateData = req.body;
    const now = new Date().toISOString();
    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        if (key.includes('_at') || key.includes('Date') || key.includes('_date')) {
          request.input(key, sql.DateTime, updateData[key]);
        } else if (key.includes('price') || key.includes('value')) {
          request.input(key, sql.Decimal(18, 2), updateData[key]);
        } else if (typeof updateData[key] === 'number') {
          request.input(key, sql.Int, updateData[key]);
        } else if (typeof updateData[key] === 'boolean') {
          request.input(key, sql.Bit, updateData[key]);
        } else {
          request.input(key, sql.VarChar, updateData[key]);
        }
      }
    });
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    fields.push('updated_at = @updated_at');
    request.input('updated_at', sql.DateTime, now);
    const result = await request.query(`
      UPDATE stock_transactions 
      SET ${fields.join(', ')}
      WHERE id = @id AND boolDeleted = 0;
      SELECT 
        st.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name,
        fo.strOfficeName as from_office_name,
        to_office.strOfficeName as to_office_name
      FROM stock_transactions st
      LEFT JOIN item_masters im ON st.item_master_id = im.id
      LEFT JOIN Office o ON st.office_id = o.intOfficeID
      LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
      LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
      WHERE st.id = @id;
    `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock transaction', details: error.message });
  }
});
// Delete stock transaction
app.delete('/api/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE stock_transactions 
        SET boolDeleted = 1, updated_at = @updated_at
        WHERE id = @id AND boolDeleted = 0
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json({ message: 'Stock transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock transaction', details: error.message });
  }
});
// ==================== STORES ENDPOINTS ====================
// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const result = await pool.request().query(`
      SELECT 
        id,
        store_name,
        description,
        address,
        office_id,
        boolActive as active,
        created_at,
        updated_at
      FROM stores 
      WHERE boolDeleted = 0
      ORDER BY store_name
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stores', details: error.message });
  }
});
// Get store by ID
app.get('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          store_name,
          description,
          address,
          office_id,
          boolActive as active,
          created_at,
          updated_at
        FROM stores 
        WHERE id = @id AND boolDeleted = 0
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store', details: error.message });
  }
});
// Create new store
app.post('/api/stores', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { store_name, description, address, office_id } = req.body;
    if (!store_name) {
      return res.status(400).json({ error: 'Store name is required' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('store_name', sql.VarChar, store_name)
      .input('description', sql.Text, description || null)
      .input('address', sql.Text, address || null)
      .input('office_id', sql.Int, office_id || null)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .input('boolActive', sql.Bit, true)
      .input('boolDeleted', sql.Bit, false)
      .query(`
        INSERT INTO stores (
          id, store_name, description, address, office_id,
          created_at, updated_at, boolActive, boolDeleted
        ) VALUES (
          @id, @store_name, @description, @address, @office_id,
          @created_at, @updated_at, @boolActive, @boolDeleted
        );
        SELECT 
          id,
          store_name,
          description,
          address,
          office_id,
          boolActive as active,
          created_at,
          updated_at
        FROM stores 
        WHERE id = @id;
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create store', details: error.message });
  }
});
// Update store
app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const updateData = req.body;
    const now = new Date().toISOString();
    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        if (key.includes('_at') || key.includes('Date')) {
          request.input(key, sql.DateTime, updateData[key]);
        } else if (typeof updateData[key] === 'number') {
          request.input(key, sql.Int, updateData[key]);
        } else if (typeof updateData[key] === 'boolean') {
          request.input(key, sql.Bit, updateData[key]);
        } else {
          request.input(key, sql.VarChar, updateData[key]);
        }
      }
    });
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    fields.push('updated_at = @updated_at');
    request.input('updated_at', sql.DateTime, now);
    const result = await request.query(`
      UPDATE stores 
      SET ${fields.join(', ')}
      WHERE id = @id AND boolDeleted = 0;
      SELECT 
        id,
        store_name,
        description,
        address,
        office_id,
        boolActive as active,
        created_at,
        updated_at
      FROM stores 
      WHERE id = @id;
    `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store', details: error.message });
  }
});
// Delete store
app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE stores 
        SET boolDeleted = 1, updated_at = @updated_at
        WHERE id = @id AND boolDeleted = 0
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete store', details: error.message });
  }
});
// =====================================================================
// STOCK ISSUANCE WORKFLOW - API ENDPOINTS
// =====================================================================
// 1. CHECK STOCK AVAILABILITY (When creating request)
app.post('/api/stock/check-availability', async (req, res) => {
  try {
    const { item_master_id, requested_quantity } = req.body;
    if (!item_master_id || !requested_quantity) {
      return res.status(400).json({ error: 'Item ID and quantity are required' });
    }
    const result = await pool.request()
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('requested_quantity', sql.Int, requested_quantity)
      .query(`
        SELECT * FROM dbo.fn_CheckStockAvailability(@item_master_id, @requested_quantity)
      `);
    if (result.recordset.length === 0) {
      return res.json({
        available: false,
        message: 'Item not found in inventory',
        stock_status: 'Not Found'
      });
    }
    const stockInfo = result.recordset[0];
    res.json({
      available: stockInfo.availability_status === 'Available',
      stock_info: stockInfo,
      message: stockInfo.availability_status === 'Available' 
        ? `✅ ${stockInfo.available_quantity} units available` 
        : stockInfo.availability_status === 'Partial'
        ? `⚠️ Only ${stockInfo.available_quantity} units available (requested ${requested_quantity})`
        : '❌ Out of stock'
    });
  } catch (error) {
    console.error('❌ Error checking stock availability:', error);
    res.status(500).json({ error: 'Failed to check stock availability', details: error.message });
  }
});
// 2. BATCH CHECK AVAILABILITY (For multiple items in a request)
app.post('/api/stock/check-availability-batch', async (req, res) => {
  try {
    const { items } = req.body; // Array of { item_master_id, requested_quantity }
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    const availability = [];
    let allAvailable = true;
    for (const item of items) {
      const result = await pool.request()
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('requested_quantity', sql.Int, item.requested_quantity)
        .query(`
          SELECT * FROM dbo.fn_CheckStockAvailability(@item_master_id, @requested_quantity)
        `);
      if (result.recordset.length > 0) {
        const stockInfo = result.recordset[0];
        availability.push({
          item_master_id: item.item_master_id,
          nomenclature: stockInfo.nomenclature,
          requested_quantity: item.requested_quantity,
          available_quantity: stockInfo.available_quantity,
          availability_status: stockInfo.availability_status,
          can_fulfill: stockInfo.availability_status === 'Available'
        });
        if (stockInfo.availability_status !== 'Available') {
          allAvailable = false;
        }
      } else {
        availability.push({
          item_master_id: item.item_master_id,
          availability_status: 'Not Found',
          can_fulfill: false
        });
        allAvailable = false;
      }
    }
    res.json({
      all_available: allAvailable,
      items: availability,
      summary: {
        total_items: items.length,
        available: availability.filter(a => a.can_fulfill).length,
        unavailable: availability.filter(a => !a.can_fulfill).length
      }
    });
  } catch (error) {
    console.error('❌ Error checking batch availability:', error);
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
});
// 3. SEARCH ITEMS WITH STOCK AVAILABILITY
app.get('/api/stock/search-with-availability', async (req, res) => {
  try {
    const { search, category_id, sub_category_id, item_type } = req.query;
    let query = `
      SELECT 
        im.id as item_master_id,
        im.nomenclature,
        im.item_code,
        im.description,
        c.category_name,
        c.item_type,
        sc.sub_category_name,
        cis.current_quantity,
        cis.available_quantity,
        cis.reserved_quantity,
        cis.minimum_stock_level,
        CASE 
          WHEN cis.available_quantity = 0 THEN 'Out of Stock'
          WHEN cis.available_quantity <= cis.minimum_stock_level THEN 'Low Stock'
          ELSE 'Available'
        END as stock_status
      FROM item_masters im
      INNER JOIN categories c ON im.category_id = c.id
      LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE im.status = 'Active'
    `;
    const request = pool.request();
    if (search) {
      query += ` AND (im.nomenclature LIKE @search OR im.item_code LIKE @search OR im.description LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (category_id) {
      query += ` AND im.category_id = @category_id`;
      request.input('category_id', sql.NVarChar, category_id);
    }
    if (sub_category_id) {
      query += ` AND im.sub_category_id = @sub_category_id`;
      request.input('sub_category_id', sql.NVarChar, sub_category_id);
    }
    if (item_type) {
      query += ` AND c.item_type = @item_type`;
      request.input('item_type', sql.NVarChar, item_type);
    }
    query += ` ORDER BY im.nomenclature`;
    const result = await request.query(query);
    res.json({
      items: result.recordset,
      total: result.recordset.length,
      available_items: result.recordset.filter(i => i.stock_status === 'Available').length,
      low_stock_items: result.recordset.filter(i => i.stock_status === 'Low Stock').length,
      out_of_stock_items: result.recordset.filter(i => i.stock_status === 'Out of Stock').length
    });
  } catch (error) {
    console.error('❌ Error searching items with availability:', error);
    res.status(500).json({ error: 'Failed to search items', details: error.message });
  }
});
// 4. ISSUE STOCK ITEMS (After approval)
app.post('/api/stock-issuance/issue/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { issued_by, issued_by_name, issuance_notes } = req.body;
    if (!issued_by || !issued_by_name) {
      return res.status(400).json({ error: 'Issued by information is required' });
    }
    // Call the stored procedure
    await pool.request()
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('issued_by', sql.UniqueIdentifier, issued_by)
      .input('issued_by_name', sql.NVarChar, issued_by_name)
      .input('issuance_notes', sql.NVarChar, issuance_notes || null)
      .execute('sp_IssueStockItems');
    console.log(`✅ Stock issued successfully for request: ${requestId}`);
    res.json({
      success: true,
      message: 'Stock items issued successfully and inventory updated',
      request_id: requestId
    });
  } catch (error) {
    console.error('❌ Error issuing stock:', error);
    res.status(500).json({ 
      error: 'Failed to issue stock items', 
      details: error.message 
    });
  }
});
// 5. GET USER'S ISSUED ITEMS HISTORY
app.get('/api/issued-items/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, is_returnable, from_date, to_date } = req.query;
    let query = `
      SELECT * FROM vw_UserIssuedItemsHistory
      WHERE issued_to_user_id = @userId
    `;
    const request = pool.request().input('userId', sql.UniqueIdentifier, userId);
    if (status) {
      query += ` AND status = @status`;
      request.input('status', sql.NVarChar, status);
    }
    if (is_returnable !== undefined) {
      query += ` AND is_returnable = @is_returnable`;
      request.input('is_returnable', sql.Bit, is_returnable === 'true' ? 1 : 0);
    }
    if (from_date) {
      query += ` AND issued_at >= @from_date`;
      request.input('from_date', sql.Date, from_date);
    }
    if (to_date) {
      query += ` AND issued_at <= @to_date`;
      request.input('to_date', sql.Date, to_date);
    }
    query += ` ORDER BY issued_at DESC`;
    const result = await request.query(query);
    // Calculate summary statistics
    const summary = {
      total_items: result.recordset.length,
      total_value: result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0),
      returnable_items: result.recordset.filter(i => i.is_returnable).length,
      not_returned: result.recordset.filter(i => i.is_returnable && i.return_status === 'Not Returned').length,
      overdue: result.recordset.filter(i => i.current_return_status === 'Overdue').length
    };
    res.json({
      items: result.recordset,
      summary: summary
    });
  } catch (error) {
    console.error('❌ Error fetching user issued items:', error);
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});
// ============================================================================
// Personal Inventory API - IMS-Personal Page
// ============================================================================
app.get('/api/personal-inventory/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, is_returnable, from_date, to_date } = req.query;
    console.log('📦 Fetching personal inventory for user:', userId);
    let query = `
      SELECT * FROM vw_UserIssuedItemsHistory
      WHERE issued_to_user_id = @userId
    `;
    const request = pool.request().input('userId', sql.UniqueIdentifier, userId);
    if (status) {
      query += ` AND status = @status`;
      request.input('status', sql.NVarChar, status);
    }
    if (is_returnable !== undefined) {
      query += ` AND is_returnable = @is_returnable`;
      request.input('is_returnable', sql.Bit, is_returnable === 'true' ? 1 : 0);
    }
    if (from_date) {
      query += ` AND issued_at >= @from_date`;
      request.input('from_date', sql.Date, from_date);
    }
    if (to_date) {
      query += ` AND issued_at <= @to_date`;
      request.input('to_date', sql.Date, to_date);
    }
    query += ` ORDER BY issued_at DESC`;
    const result = await request.query(query);
    // Calculate summary statistics
    const summary = {
      total_items: result.recordset.length,
      total_value: result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0),
      returnable_items: result.recordset.filter(i => i.is_returnable).length,
      not_returned: result.recordset.filter(i => i.is_returnable && i.return_status === 'Not Returned').length,
      overdue: result.recordset.filter(i => i.current_return_status === 'Overdue').length
    };
    console.log('✅ Personal inventory fetched successfully:', {
      items: result.recordset.length,
      total_value: summary.total_value
    });
    res.json({
      items: result.recordset,
      summary: summary
    });
  } catch (error) {
    console.error('❌ Error fetching personal inventory:', error);
    res.status(500).json({ error: 'Failed to fetch personal inventory', details: error.message });
  }
});
// ============================================================================
// Wing Inventory API - IMS-Wing Page
// ============================================================================
app.get('/api/wing-inventory/:wingId', async (req, res) => {
  try {
    const { wingId } = req.params;
    const { status, is_returnable, from_date, to_date } = req.query;
    console.log('🏢 Fetching wing inventory for wing:', wingId);
    // Query to get all issued items for users in this wing
    let itemsQuery = `
      SELECT 
        l.*,
        u.FullName as issued_to_name,
        u.Id as issued_to_id
      FROM vw_UserIssuedItemsHistory l
      INNER JOIN AspNetUsers u ON l.issued_to_user_id = u.Id
      WHERE u.intWingID = @wingId
    `;
    const request = pool.request().input('wingId', sql.Int, wingId);
    if (status) {
      itemsQuery += ` AND l.status = @status`;
      request.input('status', sql.NVarChar, status);
    }
    if (is_returnable !== undefined) {
      itemsQuery += ` AND l.is_returnable = @is_returnable`;
      request.input('is_returnable', sql.Bit, is_returnable === 'true' ? 1 : 0);
    }
    if (from_date) {
      itemsQuery += ` AND l.issued_at >= @from_date`;
      request.input('from_date', sql.Date, from_date);
    }
    if (to_date) {
      itemsQuery += ` AND l.issued_at <= @to_date`;
      request.input('to_date', sql.Date, to_date);
    }
    itemsQuery += ` ORDER BY l.issued_at DESC`;
    const itemsResult = await request.query(itemsQuery);
    // Calculate summary statistics
    const summary = {
      total_items: itemsResult.recordset.length,
      total_value: itemsResult.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0),
      unique_users: new Set(itemsResult.recordset.map(i => i.issued_to_id)).size,
      returnable_items: itemsResult.recordset.filter(i => i.is_returnable).length,
      not_returned: itemsResult.recordset.filter(i => i.is_returnable && i.return_status === 'Not Returned').length,
      overdue: itemsResult.recordset.filter(i => i.current_return_status === 'Overdue').length
    };
    // Calculate user breakdown
    const userMap = new Map();
    itemsResult.recordset.forEach(item => {
      const userId = item.issued_to_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          user_name: item.issued_to_name,
          items_count: 0,
          total_value: 0,
          overdue_count: 0
        });
      }
      const userStats = userMap.get(userId);
      userStats.items_count++;
      userStats.total_value += item.total_value || 0;
      if (item.current_return_status === 'Overdue') {
        userStats.overdue_count++;
      }
    });
    const userBreakdown = Array.from(userMap.values()).sort((a, b) => b.total_value - a.total_value);
    console.log('✅ Wing inventory fetched successfully:', {
      items: itemsResult.recordset.length,
      total_value: summary.total_value,
      unique_users: summary.unique_users
    });
    res.json({
      items: itemsResult.recordset,
      summary: summary,
      userBreakdown: userBreakdown
    });
  } catch (error) {
    console.error('❌ Error fetching wing inventory:', error);
    res.status(500).json({ error: 'Failed to fetch wing inventory', details: error.message });
  }
});
// 6. GET ALL ISSUED ITEMS (With filters)
app.get('/api/issued-items', async (req, res) => {
  try {
    const { office_id, wing_id, item_master_id, status, return_status, from_date, to_date } = req.query;
    let query = `SELECT * FROM vw_UserIssuedItemsHistory WHERE 1=1`;
    const request = pool.request();
    if (office_id) {
      query += ` AND issued_to_office_id = @office_id`;
      request.input('office_id', sql.Int, parseInt(office_id));
    }
    if (wing_id) {
      query += ` AND issued_to_wing_id = @wing_id`;
      request.input('wing_id', sql.Int, parseInt(wing_id));
    }
    if (item_master_id) {
      query += ` AND item_master_id = @item_master_id`;
      request.input('item_master_id', sql.UniqueIdentifier, item_master_id);
    }
    if (status) {
      query += ` AND status = @status`;
      request.input('status', sql.NVarChar, status);
    }
    if (return_status) {
      query += ` AND return_status = @return_status`;
      request.input('return_status', sql.NVarChar, return_status);
    }
    if (from_date) {
      query += ` AND issued_at >= @from_date`;
      request.input('from_date', sql.Date, from_date);
    }
    if (to_date) {
      query += ` AND issued_at <= @to_date`;
      request.input('to_date', sql.Date, to_date);
    }
    query += ` ORDER BY issued_at DESC`;
    const result = await request.query(query);
    res.json({
      items: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('❌ Error fetching issued items:', error);
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});
// 7. RETURN ISSUED ITEMS
app.post('/api/issued-items/return/:ledgerId', async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { return_quantity, returned_by, return_notes, item_condition } = req.body;
    if (!returned_by) {
      return res.status(400).json({ error: 'Returned by information is required' });
    }
    await pool.request()
      .input('ledger_id', sql.UniqueIdentifier, ledgerId)
      .input('return_quantity', sql.Int, return_quantity)
      .input('returned_by', sql.NVarChar, returned_by)
      .input('return_notes', sql.NVarChar, return_notes || null)
      .input('item_condition', sql.NVarChar, item_condition || 'Good')
      .execute('sp_ReturnIssuedItems');
    console.log(`✅ Item returned successfully: ${ledgerId}`);
    res.json({
      success: true,
      message: 'Item returned successfully',
      ledger_id: ledgerId
    });
  } catch (error) {
    console.error('❌ Error returning item:', error);
    res.status(500).json({ error: 'Failed to return item', details: error.message });
  }
});
// 8. GET STOCK AVAILABILITY DASHBOARD
app.get('/api/stock/availability-dashboard', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        stock_status,
        COUNT(*) as count,
        SUM(available_stock_value) as total_value,
        item_classification
      FROM vw_StockAvailabilityDetails
      GROUP BY stock_status, item_classification
      ORDER BY stock_status
    `);
    // Get low stock items
    const lowStockResult = await pool.request().query(`
      SELECT TOP 10 * 
      FROM vw_StockAvailabilityDetails
      WHERE stock_status IN ('Low Stock', 'Reorder Required')
      ORDER BY available_quantity ASC
    `);
    // Get out of stock items
    const outOfStockResult = await pool.request().query(`
      SELECT * 
      FROM vw_StockAvailabilityDetails
      WHERE stock_status = 'Out of Stock'
      ORDER BY nomenclature
    `);
    res.json({
      summary: result.recordset,
      low_stock_items: lowStockResult.recordset,
      out_of_stock_items: outOfStockResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching availability dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard', details: error.message });
  }
});
// 9. GET PENDING RETURNS (Overdue items)
app.get('/api/issued-items/pending-returns', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT *
      FROM vw_UserIssuedItemsHistory
      WHERE is_returnable = 1
        AND return_status = 'Not Returned'
        AND expected_return_date < CAST(GETDATE() AS DATE)
      ORDER BY expected_return_date ASC
    `);
    res.json({
      overdue_items: result.recordset,
      total_overdue: result.recordset.length,
      total_value_at_risk: result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0)
    });
  } catch (error) {
    console.error('❌ Error fetching pending returns:', error);
    res.status(500).json({ error: 'Failed to fetch pending returns', details: error.message });
  }
});
console.log('✅ Stock Issuance Workflow API endpoints loaded');
// =====================================================================
// THREE-LEVEL APPROVAL WORKFLOW API ENDPOINTS
// =====================================================================
// Supervisor → Admin → Issuance workflow
// Implements: User → Supervisor → Admin approval chain
// Get pending requests for supervisor
app.get('/api/approvals/supervisor/pending', requireAuth, requirePermission('stock_request.view_wing'), async (req, res) => {
  try {
    const supervisorId = req.query.supervisor_id || req.session.userId;
    const wingId = req.query.wing_id;
    if (!wingId) {
      return res.status(400).json({ error: 'wing_id is required' });
    }
    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT * FROM vw_pending_supervisor_approvals
        WHERE requester_wing_id = @wingId
        ORDER BY is_urgent DESC, pending_hours DESC
      `);
    console.log(`📋 Found ${result.recordset.length} pending requests for wing ${wingId}`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching supervisor pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});
// Get pending requests for admin
app.get('/api/approvals/admin/pending', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT * FROM vw_pending_admin_approvals
        ORDER BY is_urgent DESC, pending_hours DESC
      `);
    console.log(`📋 Found ${result.recordset.length} pending requests for admin`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching admin pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});
// Get request details with items and availability
app.get('/api/approvals/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    // Get request details
    const requestResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT sir.*, u.FullName AS requester_name, u.Email AS requester_email
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        WHERE sir.id = @requestId
      `);
    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const request = requestResult.recordset[0];
    // Get request items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT sii.*, im.nomenclature, im.unit
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @requestId
      `);
    // Check wing stock availability for each item
    const itemsWithAvailability = await Promise.all(itemsResult.recordset.map(async (item) => {
      if (item.is_custom_item) {
        return { ...item, wing_stock_available: 'N/A - Custom Item', admin_stock_available: 'N/A' };
      }
      // Check wing stock
      const wingStock = await pool.request()
        .input('itemId', sql.UniqueIdentifier, item.item_master_id)
        .input('wingId', sql.Int, request.requester_wing_id)
        .query(`
          SELECT available_quantity FROM stock_wing 
          WHERE item_master_id = @itemId AND wing_id = @wingId
        `);
      // Check admin stock
      const adminStock = await pool.request()
        .input('itemId', sql.UniqueIdentifier, item.item_master_id)
        .query(`
          SELECT available_quantity FROM stock_admin 
          WHERE item_master_id = @itemId
        `);
      return {
        ...item,
        wing_stock_available: wingStock.recordset.length > 0 ? wingStock.recordset[0].available_quantity : 0,
        admin_stock_available: adminStock.recordset.length > 0 ? adminStock.recordset[0].available_quantity : 0,
        can_fulfill_from_wing: wingStock.recordset.length > 0 && wingStock.recordset[0].available_quantity >= item.requested_quantity,
        can_fulfill_from_admin: adminStock.recordset.length > 0 && adminStock.recordset[0].available_quantity >= item.requested_quantity
      };
    }));
    // Get approval history
    const historyResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT * FROM stock_issuance_approval_history
        WHERE request_id = @requestId
        ORDER BY action_date DESC
      `);
    res.json({
      request,
      items: itemsWithAvailability,
      history: historyResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details', details: error.message });
  }
});
// Supervisor: Approve request (issue from wing stock)
app.post('/api/approvals/supervisor/approve', requireAuth, requirePermission('stock_request.approve_supervisor'), async (req, res) => {
  try {
    const { requestId, supervisorId, comments, itemApprovals } = req.body;
    if (!requestId || !supervisorId) {
      return res.status(400).json({ error: 'requestId and supervisorId are required' });
    }
    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Approved by Supervisor',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Approved',
              source_store_type = 'Wing'
          WHERE id = @requestId
        `);
      // Update item statuses if provided
      if (itemApprovals && Array.isArray(itemApprovals)) {
        for (const item of itemApprovals) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.itemId)
            .input('approvedQty', sql.Int, item.approvedQuantity)
            .input('status', sql.NVarChar(20), item.status)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty,
                  item_status = @status,
                  source_store_type = 'Wing'
              WHERE id = @itemId
            `);
        }
      }
      // Log approval history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Approved')
        .input('newStatus', sql.NVarChar(30), 'Approved by Supervisor')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);
      await transaction.commit();
      console.log(`✅ Supervisor approved request ${requestId}`);
      res.json({ success: true, message: 'Request approved successfully', action: 'approved' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});
// Supervisor: Forward request to admin
app.post('/api/approvals/supervisor/forward', requireAuth, requirePermission('stock_request.forward_to_admin'), async (req, res) => {
  try {
    const { requestId, supervisorId, forwardingReason, comments } = req.body;
    if (!requestId || !supervisorId || !forwardingReason) {
      return res.status(400).json({ error: 'requestId, supervisorId, and forwardingReason are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('forwardingReason', sql.NVarChar(sql.MAX), forwardingReason)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Forwarded to Admin',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Forwarded',
              forwarding_reason = @forwardingReason
          WHERE id = @requestId
        `);
      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Forwarded')
        .input('newStatus', sql.NVarChar(30), 'Forwarded to Admin')
        .input('reason', sql.NVarChar(sql.MAX), forwardingReason)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, forwarding_reason)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @reason
          FROM AspNetUsers WHERE Id = @actorId
        `);
      await transaction.commit();
      console.log(`✅ Supervisor forwarded request ${requestId} to admin`);
      res.json({ success: true, message: 'Request forwarded to admin successfully', action: 'forwarded' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error forwarding request:', error);
    res.status(500).json({ error: 'Failed to forward request', details: error.message });
  }
});
// Supervisor: Reject request
app.post('/api/approvals/supervisor/reject', requireAuth, requirePermission('stock_request.reject_supervisor'), async (req, res) => {
  try {
    const { requestId, supervisorId, comments } = req.body;
    if (!requestId || !supervisorId || !comments) {
      return res.status(400).json({ error: 'requestId, supervisorId, and comments are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Rejected by Supervisor',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Rejected'
          WHERE id = @requestId
        `);
      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Rejected')
        .input('newStatus', sql.NVarChar(30), 'Rejected by Supervisor')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);
      await transaction.commit();
      console.log(`✅ Supervisor rejected request ${requestId}`);
      res.json({ success: true, message: 'Request rejected', action: 'rejected' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});
// Admin: Approve request (issue from admin stock)
app.post('/api/approvals/admin/approve', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const { requestId, adminId, comments, itemApprovals } = req.body;
    if (!requestId || !adminId) {
      return res.status(400).json({ error: 'requestId and adminId are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('adminId', sql.NVarChar(450), adminId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Approved by Admin',
              admin_id = @adminId,
              admin_reviewed_at = GETDATE(),
              admin_comments = @comments,
              admin_action = 'Approved',
              source_store_type = 'Admin'
          WHERE id = @requestId
        `);
      // Update item statuses if provided
      if (itemApprovals && Array.isArray(itemApprovals)) {
        for (const item of itemApprovals) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.itemId)
            .input('approvedQty', sql.Int, item.approvedQuantity)
            .input('status', sql.NVarChar(20), item.status)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty,
                  item_status = @status,
                  source_store_type = 'Admin'
              WHERE id = @itemId
            `);
        }
      }
      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), adminId)
        .input('action', sql.NVarChar(30), 'Approved')
        .input('newStatus', sql.NVarChar(30), 'Approved by Admin')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);
      await transaction.commit();
      console.log(`✅ Admin approved request ${requestId}`);
      res.json({ success: true, message: 'Request approved successfully', action: 'approved' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});
// Admin: Reject request
app.post('/api/approvals/admin/reject', requireAuth, requirePermission('stock_request.reject_admin'), async (req, res) => {
  try {
    const { requestId, adminId, comments } = req.body;
    if (!requestId || !adminId || !comments) {
      return res.status(400).json({ error: 'requestId, adminId, and comments are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('adminId', sql.NVarChar(450), adminId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Rejected by Admin',
              admin_id = @adminId,
              admin_reviewed_at = GETDATE(),
              admin_comments = @comments,
              admin_action = 'Rejected'
          WHERE id = @requestId
        `);
      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), adminId)
        .input('action', sql.NVarChar(30), 'Rejected')
        .input('newStatus', sql.NVarChar(30), 'Rejected by Admin')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);
      await transaction.commit();
      console.log(`✅ Admin rejected request ${requestId}`);
      res.json({ success: true, message: 'Request rejected', action: 'rejected' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});
// Get user's requests
app.get('/api/approvals/my-requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT * FROM vw_my_issuance_requests
        WHERE requester_user_id = @userId
        ORDER BY submitted_at DESC
      `);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});
console.log('✅ Three-Level Approval Workflow API endpoints loaded');
// =====================================================================
// END OF STOCK ISSUANCE WORKFLOW ENDPOINTS
// =====================================================================
// ============================================================================
// SSO AUTHENTICATION ENDPOINTS
// ============================================================================
// Validate SSO token from Digital System (DS)
app.post('/api/auth/sso-validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    console.log('🔐 Validating SSO token from Digital System...');
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    // Extract user information from token
    const userId = decoded.sub;
    const userName = decoded.unique_name;
    const email = decoded.email;
    console.log(`🔍 Token decoded successfully for user: ${userName} (${userId})`);
    // Query IMS database for user (you'll sync this from DS periodically)
    console.log(`🔍 Querying IMS database for user information...`);
    const userResult = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query(`
        SELECT 
          Id,
          FullName,
          CNIC,
          UserName,
          Email,
          PhoneNumber,
          Role,
          ProfilePhoto,
          UID,
          intProvinceID,
          intDivisionID,
          intDistrictID,
          intOfficeID,
          intWingID,
          intBranchID,
          intDesignationID,
          Gender,
          ISACT
        FROM AspNetUsers
        WHERE Id = @user_id AND ISACT = 1
      `);
    if (userResult.recordset.length === 0) {
      console.log(`❌ User ${userId} not found or inactive in IMS database`);
      return res.status(404).json({ 
        error: 'User not found or inactive in system',
        details: 'User may need to be synced from Digital System or account is inactive'
      });
    }
    const user = userResult.recordset[0];
    console.log(`✅ SSO login successful for user: ${user.UserName} (${user.FullName || 'N/A'})`);
    // Return user session data
    res.json({
      success: true,
      user: {
        id: user.Id,
        username: user.UserName,
        full_name: user.FullName,
        cnic: user.CNIC,
        email: user.Email,
        phone_number: user.PhoneNumber,
        role: user.Role,
        profile_photo: user.ProfilePhoto,
        uid: user.UID,
        province_id: user.intProvinceID,
        division_id: user.intDivisionID,
        district_id: user.intDistrictID,
        office_id: user.intOfficeID,
        wing_id: user.intWingID,
        branch_id: user.intBranchID,
        designation_id: user.intDesignationID,
        gender: user.Gender,
        is_active: user.ISACT
      },
      token: token // Return token for subsequent requests
    });
  } catch (error) {
    console.error('❌ SSO validation error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login to Digital System again.' });
    }
    res.status(500).json({ error: 'SSO validation failed', details: error.message });
  }
});
console.log('✅ SSO Authentication endpoints loaded');
// ============================================================================
// DS-Style Token Authentication (Compatible with DS's EMCC Pattern)
// ============================================================================
app.post('/api/auth/ds-authenticate', async (req, res) => {
  console.log('🔐 DS Authentication Request Received');
  try {
    const { UserName, Password } = req.body;
    if (!UserName || !Password) {
      console.log('❌ Missing UserName or Password');
      return res.status(400).json({
        success: false,
        message: 'Missing username or password'
      });
    }
    console.log(`🔍 Authenticating user with UserName: ${UserName}`);
    // Query user from AspNetUsers by UserName
    const userResult = await pool.request()
      .input('username', sql.NVarChar, UserName)
      .query(`
        SELECT 
          Id,
          FullName,
          CNIC,
          FatherOrHusbandName,
          UserName,
          Email,
          PhoneNumber,
          Password,
          PasswordHash,
          intOfficeID,
          intWingID,
          intProvinceID,
          intDivisionID,
          intDistrictID,
          intBranchID,
          intDesignationID,
          Role,
          UID,
          ISACT,
          Gender,
          ProfilePhoto,
          LastLoggedIn
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);
    if (userResult.recordset.length === 0) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    const user = userResult.recordset[0];
    console.log(`✅ User found: ${user.FullName} (${user.UserName})`);
    console.log(`   Password field: ${user.Password ? 'EXISTS (length: ' + user.Password.length + ')' : 'NULL'}`);
    console.log(`   PasswordHash field: ${user.PasswordHash ? 'EXISTS (length: ' + user.PasswordHash.length + ')' : 'NULL'}`);
    // Verify password - support BOTH bcrypt and ASP.NET Identity formats
    const passwordToCheck = user.PasswordHash || user.Password;
    if (!passwordToCheck) {
      console.log('❌ No password hash found');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    console.log(`🔑 Checking password against: ${user.PasswordHash ? 'PasswordHash field' : 'Password field'}`);
    console.log(`   Hash starts with: ${passwordToCheck.substring(0, 10)}...`);
    let isPasswordValid = false;
    // Check if it's bcrypt format (starts with $2a$, $2b$, $2x$, $2y$)
    if (passwordToCheck.startsWith('$2')) {
      console.log('   Format: bcrypt');
      isPasswordValid = await bcrypt.compare(Password, passwordToCheck);
      console.log(`   Bcrypt verification: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    } 
    // Check if it's ASP.NET Identity format (starts with AQA or has specific length)
    else if (passwordToCheck.startsWith('AQA') || passwordToCheck.length > 60) {
      console.log('   Format: ASP.NET Core Identity');
      try {
        // Use aspnet-identity-pw library to verify ASP.NET Core Identity V3 password
        isPasswordValid = aspnetIdentity.validatePassword(Password, passwordToCheck);
        console.log(`   ASP.NET Identity verification: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
      } catch (err) {
        console.log(`   ⚠️ ASP.NET Identity verification error: ${err.message}`);
        isPasswordValid = false;
      }
    }
    else {
      console.log('   ⚠️ Unknown password format');
      isPasswordValid = false;
    }
    if (!isPasswordValid) {
      console.log('❌ Invalid password - verification failed');
      console.log(`   Received password length: ${Password.length}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    console.log('✅ Password verified successfully');
    // Update last login time
    await pool.request()
      .input('user_id', sql.NVarChar(450), user.Id)
      .input('last_login', sql.DateTime2, new Date())
      .query(`
        UPDATE AspNetUsers 
        SET LastLoggedIn = @last_login 
        WHERE Id = @user_id
      `);
    // Generate JWT token (same format as before)
    const token = jwt.sign(
      {
        sub: user.Id,
        unique_name: user.UserName,
        email: user.Email,
        full_name: user.FullName,
        cnic: user.CNIC,
        office_id: user.intOfficeID,
        wing_id: user.intWingID,
        province_id: user.intProvinceID,
        division_id: user.intDivisionID,
        district_id: user.intDistrictID,
        branch_id: user.intBranchID,
        designation_id: user.intDesignationID,
        role: user.Role,
        uid: user.UID,
        is_active: user.ISACT,
        gender: user.Gender
      },
      JWT_SECRET,
      {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: '24h'
      }
    );
    console.log('✅ Token generated successfully');
    // Store user in session for IMS
    req.session.userId = user.Id;
    req.session.user = {
      Id: user.Id,
      FullName: user.FullName,
      UserName: user.UserName,
      Email: user.Email,
      Role: user.Role,
      intOfficeID: user.intOfficeID,
      intWingID: user.intWingID,
      intBranchID: user.intBranchID,
      intDesignationID: user.intDesignationID
    };
    console.log('✅ Session created for user:', user.FullName);
    // Return token (same format as EMCC API)
    res.status(200).json({
      Token: token, // Capital 'T' to match DS's TokenResponse class
      success: true,
      message: 'Authentication successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ DS Authentication Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});
console.log('✅ DS-Style Authentication endpoint loaded: POST /api/auth/ds-authenticate');
// =====================================================================
// END OF SSO AUTHENTICATION ENDPOINTS
// =====================================================================
// Start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database connection initialized');
    // Serve HTML files from root directory (for session setter page) - MUST be after all API routes
    app.use(express.static(__dirname));
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database: ${sqlConfig.database} on ${sqlConfig.server}`);
      console.log(`📁 Upload directory: ${uploadsDir}`);
      console.log('🚀 Tender form with complete field mapping ready!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}
// ===== ITEM SERIAL NUMBERS ENDPOINTS =====
// GET all serial numbers by tender item ID
app.get('/api/item-serial-numbers/tender-item/:tenderItemId', async (req, res) => {
  try {
    const { tenderItemId } = req.params;
    const result = await pool.request()
      .input('tender_item_id', sql.UniqueIdentifier, tenderItemId)
      .query(`
        SELECT 
          id,
          tender_item_id,
          serial_number,
          status,
          remarks,
          created_at
        FROM item_serial_numbers 
        WHERE tender_item_id = @tender_item_id
        ORDER BY created_at DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch serial numbers', details: error.message });
  }
});
// POST create single serial number
app.post('/api/item-serial-numbers', async (req, res) => {
  try {
    const {
      tender_item_id,
      serial_number,
      status,
      remarks
    } = req.body;
    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('tender_item_id', sql.UniqueIdentifier, tender_item_id)
      .input('serial_number', sql.NVarChar, serial_number)
      .input('status', sql.NVarChar, status || null)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('created_at', sql.DateTime2, now)
      .query(`
        INSERT INTO item_serial_numbers (
          id, tender_item_id, serial_number, status, remarks, created_at
        ) VALUES (
          @id, @tender_item_id, @serial_number, @status, @remarks, @created_at
        )
      `);
    res.json({ 
      success: true, 
      id: id,
      message: 'Serial number created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create serial number', details: error.message });
  }
});
// POST create multiple serial numbers
app.post('/api/item-serial-numbers/bulk', async (req, res) => {
  try {
    const { serials } = req.body;
    if (!Array.isArray(serials) || serials.length === 0) {
      return res.status(400).json({ error: 'Serials array is required and cannot be empty' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const insertedIds = [];
      for (const serial of serials) {
        const id = require('crypto').randomUUID();
        const now = new Date().toISOString();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('tender_item_id', sql.UniqueIdentifier, serial.tender_item_id)
          .input('serial_number', sql.NVarChar, serial.serial_number)
          .input('status', sql.NVarChar, serial.status || null)
          .input('remarks', sql.NVarChar, serial.remarks || null)
          .input('created_at', sql.DateTime2, now)
          .query(`
            INSERT INTO item_serial_numbers (
              id, tender_item_id, serial_number, status, remarks, created_at
            ) VALUES (
              @id, @tender_item_id, @serial_number, @status, @remarks, @created_at
            )
          `);
        insertedIds.push(id);
      }
      await transaction.commit();
      res.json({ 
        success: true, 
        ids: insertedIds,
        count: serials.length,
        message: 'Serial numbers created successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create serial numbers', details: error.message });
  }
});
// PUT update serial number
app.put('/api/item-serial-numbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serial_number,
      status,
      remarks
    } = req.body;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('serial_number', sql.NVarChar, serial_number)
      .input('status', sql.NVarChar, status)
      .input('remarks', sql.NVarChar, remarks)
      .query(`
        UPDATE item_serial_numbers SET
          serial_number = @serial_number,
          status = @status,
          remarks = @remarks
        WHERE id = @id
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Serial number not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Serial number updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update serial number', details: error.message });
  }
});
// POST create delivery item serial numbers
app.post('/api/delivery-item-serial-numbers', async (req, res) => {
  try {
    const { delivery_item_id, delivery_id, item_master_id, serial_numbers } = req.body;
    if (!delivery_item_id || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
      return res.status(400).json({ error: 'delivery_item_id and serial_numbers array are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const insertedIds = [];
      const now = new Date().toISOString();
      for (const serialNumber of serial_numbers) {
        const id = require('crypto').randomUUID();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('delivery_id', sql.UniqueIdentifier, delivery_id)
          .input('delivery_item_id', sql.UniqueIdentifier, delivery_item_id)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('serial_number', sql.NVarChar, serialNumber)
          .input('notes', sql.NVarChar, null)
          .input('created_at', sql.DateTime2, now)
          .input('updated_at', sql.DateTime2, now)
          .query(`
            INSERT INTO delivery_item_serial_numbers (
              id, delivery_id, delivery_item_id, item_master_id, serial_number, notes, created_at, updated_at
            ) VALUES (
              @id, @delivery_id, @delivery_item_id, @item_master_id, @serial_number, @notes, @created_at, @updated_at
            )
          `);
        insertedIds.push(id);
      }
      await transaction.commit();
      res.json({ 
        success: true, 
        ids: insertedIds,
        count: serial_numbers.length,
        message: `${serial_numbers.length} serial number(s) added successfully`
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create delivery item serial numbers', details: error.message });
  }
});
// DELETE serial number by ID
app.delete('/api/item-serial-numbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM item_serial_numbers WHERE id = @id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Serial number not found' });
    }
    res.json({ 
      success: true, 
      message: 'Serial number deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete serial number', details: error.message });
  }
});
// DELETE all serial numbers by tender item ID
app.delete('/api/item-serial-numbers/tender-item/:tenderItemId', async (req, res) => {
  try {
    const { tenderItemId } = req.params;
    const result = await pool.request()
      .input('tender_item_id', sql.UniqueIdentifier, tenderItemId)
      .query('DELETE FROM item_serial_numbers WHERE tender_item_id = @tender_item_id');
    res.json({ 
      success: true, 
      deletedCount: result.rowsAffected[0],
      message: 'Serial numbers deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete serial numbers', details: error.message });
  }
});
// Get stock transaction dashboard statistics
app.get('/api/stock-transaction-dashboard-stats', async (req, res) => {
  try {
    // Get ALL tenders from tenders table with stock transaction status using View_stock_transactions_clean
    const allTendersQuery = `
      SELECT 
        t.id,
        t.reference_number as tenderNumber,
        t.title,
        t.description,
        t.is_finalized,
        t.status,
        t.tender_spot_type,
        t.created_at,
        t.updated_at,
        COALESCE(stockCounts.itemCount, 0) as itemCount,
        COALESCE(stockCounts.totalQuantity, 0) as totalQuantity,
        COALESCE(stockCounts.confirmedItems, 0) as confirmedItems,
        CASE 
          WHEN stockCounts.itemCount > 0 THEN 1 
          ELSE 0 
        END as hasStockTransactions
      FROM tenders t
      LEFT JOIN (
        SELECT 
          tender_id,
          COUNT(item_master_id) as itemCount,
          SUM(total_quantity_received) as totalQuantity,
          COUNT(CASE WHEN pricing_confirmed = 1 THEN 1 END) as confirmedItems
        FROM View_stock_transactions_clean 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        GROUP BY tender_id
      ) stockCounts ON t.id = stockCounts.tender_id
      ORDER BY 
        CASE WHEN stockCounts.itemCount > 0 THEN 0 ELSE 1 END, -- Show tenders with stock transactions first
        t.updated_at DESC
    `;
    const allTendersResult = await pool.request().query(allTendersQuery);
    const allTenders = allTendersResult.recordset;
    // Separate tenders with and without stock transactions
    const tendersWithStockTransactions = allTenders.filter(t => t.hasStockTransactions === 1);
    const tendersWithoutStockTransactions = allTenders.filter(t => t.hasStockTransactions === 0);
    // Calculate stats from tenders WITH stock transactions
    const totalTendersWithStock = tendersWithStockTransactions.length;
    const totalItems = tendersWithStockTransactions.reduce((sum, t) => sum + (parseInt(t.itemCount) || 0), 0);
    const totalQuantity = tendersWithStockTransactions.reduce((sum, t) => sum + (parseInt(t.totalQuantity) || 0), 0);
    // Calculate active vs finalized based on stock transaction status
    const activeTenders = tendersWithStockTransactions.filter(t => !t.is_finalized || t.confirmedItems < t.itemCount).length;
    const finalizedTenders = tendersWithStockTransactions.filter(t => t.is_finalized && t.confirmedItems === t.itemCount).length;
    // Get acquisition type breakdown from ALL tenders
    const acquisitionStats = allTenders.reduce((acc, tender) => {
      const type = tender.tender_spot_type || 'Contract/Tender';
      if (!acc[type]) {
        acc[type] = { count: 0, items: 0, quantity: 0 };
      }
      acc[type].count++;
      if (tender.hasStockTransactions === 1) {
        acc[type].items += parseInt(tender.itemCount) || 0;
        acc[type].quantity += parseInt(tender.totalQuantity) || 0;
      }
      return acc;
    }, {});
    // Combine tenders for display: active with stock transactions first, then those without
    const recentTenders = [
      ...tendersWithStockTransactions.slice(0, 5), // First 5 with stock transactions
      ...tendersWithoutStockTransactions.slice(0, 5) // Then up to 5 without stock transactions
    ];
    const stats = {
      totalTenders: allTenders.length, // All tenders count
      tendersWithStockTransactions: totalTendersWithStock,
      tendersWithoutStockTransactions: tendersWithoutStockTransactions.length,
      activeTenders: activeTenders,
      finalizedTenders: finalizedTenders,
      totalItems: totalItems,
      totalQuantity: totalQuantity,
      acquisitionStats: {
        'Contract/Tender': acquisitionStats['Contract/Tender'] || { count: 0, items: 0, quantity: 0 },
        'Spot Purchase': acquisitionStats['Spot Purchase'] || { count: 0, items: 0, quantity: 0 }
      },
      // Separate arrays for the two different tables
      tendersWithStock: tendersWithStockTransactions.map(tender => ({
        id: tender.id,
        title: tender.title || `Tender ${tender.tenderNumber}`,
        tenderNumber: tender.tenderNumber,
        acquisitionType: tender.tender_spot_type || 'Contract/Tender',
        is_finalized: tender.is_finalized && tender.confirmedItems === tender.itemCount,
        createdAt: tender.created_at,
        itemCount: tender.itemCount,
        totalQuantity: tender.totalQuantity,
        hasStockTransactions: true,
        status: tender.status
      })),
      tendersAwaitingStock: tendersWithoutStockTransactions.map(tender => ({
        id: tender.id,
        title: tender.title || `Tender ${tender.tenderNumber}`,
        tenderNumber: tender.tenderNumber,
        acquisitionType: tender.tender_spot_type || 'Contract/Tender',
        is_finalized: tender.is_finalized,
        createdAt: tender.created_at,
        itemCount: 0,
        totalQuantity: 0,
        hasStockTransactions: false,
        status: tender.status
      })),
      // Keep backwards compatibility
      recentTenders: recentTenders.map(tender => ({
        id: tender.id,
        title: tender.title || `Tender ${tender.tenderNumber}`,
        tenderNumber: tender.tenderNumber,
        acquisitionType: tender.tender_spot_type || 'Contract/Tender',
        is_finalized: tender.is_finalized && tender.confirmedItems === tender.itemCount,
        createdAt: tender.created_at,
        itemCount: tender.itemCount,
        totalQuantity: tender.totalQuantity,
        hasStockTransactions: tender.hasStockTransactions === 1,
        status: tender.status
      }))
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics', 
      details: error.message,
      totalTenders: 0,
      activeTenders: 0,
      finalizedTenders: 0,
      totalItems: 0,
      totalQuantity: 0,
      recentTenders: []
    });
  }
});
// Get stock transactions by tender_id from stock_transactions_clean
app.get('/api/stock-transactions-clean', async (req, res) => {
  try {
    const { tender_id } = req.query;
    let query = `
      SELECT 
        stc.id,
        stc.tender_id,
        stc.item_master_id,
        stc.estimated_unit_price,
        stc.actual_unit_price,
        stc.total_quantity_received,
        stc.type,
        stc.remarks,
        stc.pricing_confirmed,
        stc.created_at,
        stc.updated_at,
        stc.is_deleted,
        stc.deleted_at,
        stc.deleted_by,
        COALESCE(im.nomenclature, 'Unknown Item') as nomenclature,
        COALESCE(im.specifications, '') as specifications,
        COALESCE(im.unit, '') as unit
      FROM stock_transactions_clean stc
      LEFT JOIN item_masters im ON stc.item_master_id = CAST(im.id AS VARCHAR(50))
      WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
    `;
    const request = pool.request();
    if (tender_id) {
      query += ` AND stc.tender_id = @tender_id`;
      request.input('tender_id', sql.UniqueIdentifier, tender_id);
    }
    query += ` ORDER BY stc.created_at DESC`;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions', details: error.message });
  }
});
// Create new stock transaction in stock_transactions_clean
app.post('/api/stock-transactions-clean', async (req, res) => {
  try {
    const {
      tender_id,
      item_master_id,
      estimated_unit_price = 0,
      actual_unit_price = 0,
      total_quantity_received = 0,
      pricing_confirmed = false,
      type = 'IN',
      remarks
    } = req.body;
    const query = `
      INSERT INTO stock_transactions_clean (
        id,
        tender_id,
        item_master_id,
        estimated_unit_price,
        actual_unit_price,
        total_quantity_received,
        pricing_confirmed,
        type,
        remarks,
        is_deleted,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(),
        @tender_id,
        @item_master_id,
        @estimated_unit_price,
        @actual_unit_price,
        @total_quantity_received,
        @pricing_confirmed,
        @type,
        @remarks,
        0,
        GETDATE(),
        GETDATE()
      )
    `;
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .input('estimated_unit_price', sql.Decimal(18, 2), estimated_unit_price)
      .input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price)
      .input('total_quantity_received', sql.Int, total_quantity_received)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .input('type', sql.VarChar(10), type)
      .input('remarks', sql.Text, remarks)
      .query(query);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock transaction', details: error.message });
  }
});
// Update stock transaction in stock_transactions_clean
app.put('/api/stock-transactions-clean/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estimated_unit_price,
      actual_unit_price,
      total_quantity_received,
      pricing_confirmed,
      type,
      remarks
    } = req.body;
    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    if (estimated_unit_price !== undefined) {
      fields.push('estimated_unit_price = @estimated_unit_price');
      request.input('estimated_unit_price', sql.Decimal(18, 2), estimated_unit_price);
    }
    if (actual_unit_price !== undefined) {
      fields.push('actual_unit_price = @actual_unit_price');
      request.input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price);
    }
    if (total_quantity_received !== undefined) {
      fields.push('total_quantity_received = @total_quantity_received');
      request.input('total_quantity_received', sql.Int, total_quantity_received);
    }
    if (pricing_confirmed !== undefined) {
      fields.push('pricing_confirmed = @pricing_confirmed');
      request.input('pricing_confirmed', sql.Bit, pricing_confirmed);
    }
    if (type !== undefined) {
      fields.push('type = @type');
      request.input('type', sql.VarChar(10), type);
    }
    if (remarks !== undefined) {
      fields.push('remarks = @remarks');
      request.input('remarks', sql.Text, remarks);
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    fields.push('updated_at = GETDATE()');
    const query = `
      UPDATE stock_transactions_clean 
      SET ${fields.join(', ')}
      WHERE id = @id
    `;
    await request.query(query);
    res.json({ success: true, message: 'Stock transaction updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock transaction', details: error.message });
  }
});
// Soft delete stock transaction in stock_transactions_clean
app.delete('/api/stock-transactions-clean/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleted_by } = req.body;
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deleted_by', sql.NVarChar, deleted_by || 'System')
      .query(`
        UPDATE stock_transactions_clean 
        SET 
          is_deleted = 1,
          deleted_at = GETDATE(),
          deleted_by = @deleted_by,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Stock transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock transaction', details: error.message });
  }
});
// =============================================================================
// ENHANCED STOCK ACQUISITION WITH DELIVERY ENDPOINTS
// =============================================================================
// Get delivery by tender ID
app.get('/api/deliveries/by-tender/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    console.log('🔍 Getting deliveries for tender:', tenderId);
    // First, let's check the table structure
    console.log('🔍 Checking deliveries table structure...');
    const structureResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deliveries'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('📊 Deliveries table columns:', structureResult.recordset);
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          d.*
        FROM deliveries d
        WHERE d.tender_id = @tender_id
        ORDER BY d.created_at DESC
      `);
    console.log('📦 Found deliveries:', result.recordset.length);
    if (result.recordset.length === 0) {
      console.log('❌ No deliveries found for tender:', tenderId);
      return res.status(404).json({ error: 'No deliveries found for this tender' });
    }
    // Get delivery items for each delivery
    const deliveries = [];
    for (const delivery of result.recordset) {
      const itemsResult = await pool.request()
        .input('delivery_id', sql.UniqueIdentifier, delivery.id)
        .query(`
          SELECT * FROM delivery_items WHERE delivery_id = @delivery_id
        `);
      // Get serial numbers for each item
      const items = [];
      for (const item of itemsResult.recordset) {
        const serialsResult = await pool.request()
          .input('delivery_item_id', sql.UniqueIdentifier, item.id)
          .query(`
            SELECT * FROM delivery_item_serial_numbers WHERE delivery_item_id = @delivery_item_id
          `);
        items.push({
          ...item,
          serial_numbers: serialsResult.recordset
        });
      }
      deliveries.push({
        ...delivery,
        items: items
      });
    }
    console.log('✅ Returning deliveries with items:', deliveries.length);
    res.json(deliveries);
  } catch (error) {
    console.error('❌ Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});
// Update multiple stock transaction prices
app.put('/api/stock-acquisition/update-multiple-prices', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array is required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      for (const update of updates) {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, update.id)
          .input('actual_unit_price', sql.Decimal(18, 2), update.actual_unit_price)
          .input('remarks', sql.Text, update.remarks || null)
          .input('pricing_confirmed', sql.Bit, update.pricing_confirmed)
          .query(`
            UPDATE stock_transactions_clean 
            SET 
              actual_unit_price = @actual_unit_price,
              remarks = @remarks,
              pricing_confirmed = @pricing_confirmed,
              updated_at = GETDATE()
            WHERE id = @id
          `);
      }
      await transaction.commit();
      res.json({ success: true, message: `Updated ${updates.length} items successfully` });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update multiple prices', details: error.message });
  }
});
// Get stock acquisition dashboard statistics
app.get('/api/stock-acquisition/dashboard-stats', async (req, res) => {
  try {
    console.log('📊 GET /api/stock-acquisition/dashboard-stats - Fetching stock acquisition stats');
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM tenders WHERE is_finalized = 1) as total_tenders,
        (SELECT COUNT(DISTINCT item_master_id) FROM tender_items ti JOIN tenders t ON ti.tender_id = t.id WHERE t.is_finalized = 1) as total_items,
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as confirmed_pricing_items,
        (SELECT COUNT(DISTINCT item_master_id) FROM tender_items ti JOIN tenders t ON ti.tender_id = t.id WHERE t.is_finalized = 1) - 
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as pending_pricing_items,
        (SELECT SUM(estimated_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE (is_deleted = 0 OR is_deleted IS NULL)) as total_estimated_value,
        (SELECT SUM(actual_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE (is_deleted = 0 OR is_deleted IS NULL)) as total_actual_value,
        (SELECT AVG(CASE 
          WHEN estimated_unit_price > 0 
          THEN ((actual_unit_price - estimated_unit_price) / estimated_unit_price) * 100 
          ELSE 0 
        END) FROM stock_transactions_clean WHERE (is_deleted = 0 OR is_deleted IS NULL)) as average_price_variance,
        (SELECT COUNT(*) FROM deliveries) as total_deliveries,
        (SELECT COUNT(*) FROM deliveries WHERE is_finalized = 0 OR is_finalized IS NULL) as pending_deliveries
    `;
    const result = await pool.request().query(statsQuery);
    const stats = result.recordset[0];
    res.json({
      total_tenders: stats.total_tenders || 0,
      total_items: stats.total_items || 0,
      confirmed_pricing_items: stats.confirmed_pricing_items || 0,
      pending_pricing_items: stats.pending_pricing_items || 0,
      total_estimated_value: stats.total_estimated_value || 0,
      total_actual_value: stats.total_actual_value || 0,
      average_price_variance: stats.average_price_variance || 0,
      total_deliveries: stats.total_deliveries || 0,
      pending_deliveries: stats.pending_deliveries || 0
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats', 
      details: error.message,
      // Return default values on error
      total_tenders: 0,
      total_items: 0,
      confirmed_pricing_items: 0,
      pending_pricing_items: 0,
      total_estimated_value: 0,
      total_actual_value: 0,
      average_price_variance: 0,
      total_deliveries: 0,
      pending_deliveries: 0
    });
  }
});
// Get tender summaries from stock transactions
app.get('/api/stock-acquisition/tender-summaries', async (req, res) => {
  try {
    console.log('📋 GET /api/stock-acquisition/tender-summaries - Fetching tender summaries');
    const query = `
      SELECT 
        t.id as tender_id,
        t.title as tender_title,
        t.reference_number as tender_number,
        (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id) as total_items,
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE tender_id = t.id AND pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as confirmed_items,
        (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id) - 
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE tender_id = t.id AND pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as pending_items,
        (SELECT SUM(estimated_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE tender_id = t.id AND (is_deleted = 0 OR is_deleted IS NULL)) as total_estimated_value,
        (SELECT SUM(actual_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE tender_id = t.id AND (is_deleted = 0 OR is_deleted IS NULL)) as total_actual_value,
        CASE 
          WHEN (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id) > 0 
          THEN (CAST((SELECT COUNT(*) FROM stock_transactions_clean WHERE tender_id = t.id AND pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) AS FLOAT) / 
                (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id)) * 100 
          ELSE 0 
        END as pricing_completion_rate,
        CASE 
          WHEN NOT EXISTS(SELECT 1 FROM deliveries WHERE tender_id = t.id) THEN 0
          WHEN EXISTS(SELECT 1 FROM deliveries WHERE tender_id = t.id AND is_finalized = 0) THEN 1
          WHEN NOT EXISTS(SELECT 1 FROM deliveries WHERE tender_id = t.id AND is_finalized = 0) THEN 2
          ELSE 0
        END as has_deliveries,
        t.created_at
      FROM tenders t
      WHERE t.is_finalized = 1
      ORDER BY t.created_at DESC
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tender summaries', details: error.message });
  }
});
// Get stock acquisition items by tender ID
app.get('/api/stock-acquisition/items/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          stc.*,
          COALESCE(im.nomenclature, 'Unknown Item') as item_name
        FROM stock_transactions_clean stc
        LEFT JOIN item_masters im ON stc.item_master_id = CAST(im.id AS VARCHAR(50))
        WHERE stc.tender_id = @tender_id 
          AND (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
        ORDER BY stc.created_at
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock acquisition items', details: error.message });
  }
});
// Update single item price in stock acquisition
app.put('/api/stock-acquisition/update-price/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { actual_unit_price, pricing_confirmed } = req.body;
    await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .query(`
        UPDATE stock_transactions_clean 
        SET 
          actual_unit_price = @actual_unit_price,
          pricing_confirmed = @pricing_confirmed,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Item price updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item price', details: error.message });
  }
});
// Restore soft deleted stock transaction in stock_transactions_clean
app.put('/api/stock-transactions-clean/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE stock_transactions_clean 
        SET 
          is_deleted = 0,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Stock transaction restored successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore stock transaction', details: error.message });
  }
});
// Bulk create stock transactions for tender finalization
app.post('/api/stock-transactions-clean/bulk-create', async (req, res) => {
  try {
    const { tender_id, items } = req.body;
    if (!tender_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'tender_id and items array are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const createdItems = [];
      for (const item of items) {
        const result = await transaction.request()
          .input('tender_id', sql.UniqueIdentifier, tender_id)
          .input('item_master_id', sql.VarChar(50), item.item_master_id)
          .input('estimated_unit_price', sql.Decimal(18, 2), item.estimated_unit_price || 0)
          .input('actual_unit_price', sql.Decimal(18, 2), item.actual_unit_price || 0)
          .input('total_quantity_received', sql.Int, item.total_quantity_received || 0)
          .input('pricing_confirmed', sql.Bit, item.pricing_confirmed || false)
          .input('type', sql.VarChar(10), item.type || 'IN')
          .input('remarks', sql.Text, item.remarks || null)
          .query(`
            INSERT INTO stock_transactions_clean (
              id,
              tender_id,
              item_master_id,
              estimated_unit_price,
              actual_unit_price,
              total_quantity_received,
              pricing_confirmed,
              type,
              remarks,
              is_deleted,
              created_at,
              updated_at
            )
            OUTPUT INSERTED.*
            VALUES (
              NEWID(),
              @tender_id,
              @item_master_id,
              @estimated_unit_price,
              @actual_unit_price,
              @total_quantity_received,
              @pricing_confirmed,
              @type,
              @remarks,
              0,
              GETDATE(),
              GETDATE()
            )
          `);
        createdItems.push(result.recordset[0]);
      }
      await transaction.commit();
      res.json({ 
        success: true, 
        message: `Created ${createdItems.length} stock transactions successfully`,
        items: createdItems
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bulk stock transactions', details: error.message });
  }
});
// Get tenders from stock_transactions_clean
app.get('/api/stock-acquisition/tenders', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        stc.tender_id,
        t.title as tender_title,
        t.reference_number as tender_number,
        t.tender_spot_type as acquisition_type,
        t.status as tender_status,
        COUNT(stc.id) as item_count,
        SUM(stc.total_quantity_received) as total_quantity,
        MAX(stc.created_at) as latest_transaction
      FROM stock_transactions_clean stc
      LEFT JOIN tenders t ON stc.tender_id = t.id
      WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
      GROUP BY stc.tender_id, t.title, t.reference_number, t.tender_spot_type, t.status
      ORDER BY latest_transaction DESC
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenders', details: error.message });
  }
});
// Get stock transaction statistics by tender
app.get('/api/stock-acquisition/tender-stats/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN pricing_confirmed = 1 THEN 1 END) as confirmed_items,
        COUNT(CASE WHEN pricing_confirmed = 0 THEN 1 END) as pending_items,
        SUM(estimated_unit_price * total_quantity_received) as estimated_value,
        SUM(actual_unit_price * total_quantity_received) as actual_value,
        SUM(total_quantity_received) as total_quantity
      FROM stock_transactions_clean
      WHERE tender_id = @tender_id 
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(query);
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tender statistics', details: error.message });
  }
});
// Search items in stock transactions
app.get('/api/stock-acquisition/search', async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const result = await pool.request()
      .input('searchQuery', sql.NVarChar, `%${searchQuery}%`)
      .query(`
        SELECT 
          stc.*,
          COALESCE(im.nomenclature, 'Unknown Item') as item_name,
          t.title as tender_title,
          t.reference_number as tender_number
        FROM stock_transactions_clean stc
        LEFT JOIN item_masters im ON stc.item_master_id = CAST(im.id AS VARCHAR(50))
        LEFT JOIN tenders t ON stc.tender_id = t.id
        WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
          AND (
            im.nomenclature LIKE @searchQuery 
            OR t.title LIKE @searchQuery 
            OR t.reference_number LIKE @searchQuery
            OR stc.remarks LIKE @searchQuery
          )
        ORDER BY stc.created_at DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search stock transactions', details: error.message });
  }
});
// New endpoint for the SQL Server view: View_stock_transactions_clean
app.get('/api/stock-transactions-clean/view', async (req, res) => {
  try {
    const { tender_id } = req.query;
    let query = `
      SELECT * FROM View_stock_transactions_clean
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const request = pool.request();
    if (tender_id) {
      query += ` AND tender_id = @tender_id`;
      request.input('tender_id', sql.UniqueIdentifier, tender_id);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions from view', details: error.message });
  }
});
// Create new stock transaction in stock_transactions_clean
app.post('/api/stock-transactions-clean', async (req, res) => {
  try {
    const {
      tender_id,
      item_master_id,
      estimated_unit_price = 0,
      actual_unit_price = 0,
      total_quantity_received = 0,
      pricing_confirmed = false,
      type = 'IN',
      remarks
    } = req.body;
    const query = `
      INSERT INTO stock_transactions_clean (
        id,
        tender_id,
        item_master_id,
        estimated_unit_price,
        actual_unit_price,
        total_quantity_received,
        pricing_confirmed,
        type,
        remarks,
        is_deleted,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(),
        @tender_id,
        @item_master_id,
        @estimated_unit_price,
        @actual_unit_price,
        @total_quantity_received,
        @pricing_confirmed,
        @type,
        @remarks,
        0,
        GETDATE(),
        GETDATE()
      )
    `;
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .input('estimated_unit_price', sql.Decimal(18, 2), estimated_unit_price)
      .input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price)
      .input('total_quantity_received', sql.Int, total_quantity_received)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .input('type', sql.VarChar(10), type)
      .input('remarks', sql.Text, remarks)
      .query(query);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock transaction', details: error.message });
  }
});
// Update stock transaction in stock_transactions_clean
app.put('/api/stock-transactions-clean/:tender_id/:item_master_id', async (req, res) => {
  try {
    const { tender_id, item_master_id } = req.params;
    const updates = req.body;
    // Build dynamic update query
    const setClause = [];
    const request = pool.request();
    request.input('tender_id', sql.UniqueIdentifier, tender_id);
    request.input('item_master_id', sql.VarChar(50), item_master_id);
    if (updates.estimated_unit_price !== undefined) {
      setClause.push('estimated_unit_price = @estimated_unit_price');
      request.input('estimated_unit_price', sql.Decimal(18, 2), updates.estimated_unit_price);
    }
    if (updates.actual_unit_price !== undefined) {
      setClause.push('actual_unit_price = @actual_unit_price');
      request.input('actual_unit_price', sql.Decimal(18, 2), updates.actual_unit_price);
    }
    if (updates.total_quantity_received !== undefined) {
      setClause.push('total_quantity_received = @total_quantity_received');
      request.input('total_quantity_received', sql.Int, updates.total_quantity_received);
    }
    if (updates.pricing_confirmed !== undefined) {
      setClause.push('pricing_confirmed = @pricing_confirmed');
      request.input('pricing_confirmed', sql.Bit, updates.pricing_confirmed);
    }
    if (updates.remarks !== undefined) {
      setClause.push('remarks = @remarks');
      request.input('remarks', sql.Text, updates.remarks);
    }
    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    setClause.push('updated_at = GETDATE()');
    const query = `
      UPDATE stock_transactions_clean 
      SET ${setClause.join(', ')}
      OUTPUT INSERTED.*
      WHERE tender_id = @tender_id 
        AND item_master_id = @item_master_id
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const result = await request.query(query);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock transaction', details: error.message });
  }
});
// Soft delete stock transaction in stock_transactions_clean
app.delete('/api/stock-transactions-clean/:tender_id/:item_master_id', async (req, res) => {
  try {
    const { tender_id, item_master_id } = req.params;
    const { deleted_by = 'user' } = req.body;
    const query = `
      UPDATE stock_transactions_clean 
      SET 
        is_deleted = 1,
        deleted_at = GETDATE(),
        deleted_by = @deleted_by,
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE tender_id = @tender_id 
        AND item_master_id = @item_master_id
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .input('deleted_by', sql.VarChar(50), deleted_by)
      .query(query);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json({ success: true, message: 'Stock transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock transaction', details: error.message });
  }
});
// Restore soft deleted stock transaction in stock_transactions_clean
app.post('/api/stock-transactions-clean/:tender_id/:item_master_id/restore', async (req, res) => {
  try {
    const { tender_id, item_master_id } = req.params;
    const query = `
      UPDATE stock_transactions_clean 
      SET 
        is_deleted = 0,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE tender_id = @tender_id 
        AND item_master_id = @item_master_id
        AND is_deleted = 1
    `;
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .query(query);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted stock transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore stock transaction', details: error.message });
  }
});
// Add tender items to stock acquisition (create stock_transaction_clean entries)
app.post('/api/tenders/:id/add-to-stock-acquisition', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const { id: tenderId } = req.params;
    // First, get the tender and its items
    const tenderResult = await transaction.request()
      .input('tender_id', sql.NVarChar, tenderId)
      .query(`
        SELECT t.*, ti.id as item_id, ti.item_master_id, ti.nomenclature, 
               ti.quantity, ti.estimated_unit_price, ti.total_amount, 
               ti.specifications, ti.remarks
        FROM tenders t
        LEFT JOIN tender_items ti ON t.id = ti.tender_id
        WHERE t.id = @tender_id
      `);
    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    const tender = tenderResult.recordset[0];
    const tenderItems = tenderResult.recordset.filter(row => row.item_id);
    if (tenderItems.length === 0) {
      return res.status(400).json({ error: 'No items found in this tender' });
    }
    // Check if stock transactions already exist for this tender
    const existingResult = await transaction.request()
      .input('tender_id', sql.NVarChar, tenderId)
      .query(`
        SELECT COUNT(*) as count 
        FROM stock_transactions_clean 
        WHERE tender_id = @tender_id AND (is_deleted = 0 OR is_deleted IS NULL)
      `);
    if (existingResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'Stock transactions already exist for this tender',
        message: 'This tender has already been added to stock acquisition'
      });
    }
    // Create stock_transaction_clean entries for each tender item
    let addedItems = 0;
    for (const item of tenderItems) {
      const stockTransactionResult = await transaction.request()
        .input('id', sql.NVarChar, uuidv4())
        .input('tender_id', sql.NVarChar, tenderId)
        .input('item_master_id', sql.NVarChar, item.item_master_id)
        .input('estimated_unit_price', sql.Decimal(15, 2), item.estimated_unit_price || 0)
        .input('actual_unit_price', sql.Decimal(15, 2), item.estimated_unit_price || 0)
        .input('total_quantity_received', sql.Decimal(10, 2), 0) // Will be updated from deliveries
        .input('pricing_confirmed', sql.Bit, false)
        .input('type', sql.NVarChar(10), 'IN')
        .input('remarks', sql.NVarChar(500), `Manually added from tender: ${tender.title}`)
        .query(`
          INSERT INTO stock_transactions_clean (
            id, tender_id, item_master_id, estimated_unit_price, 
            actual_unit_price, total_quantity_received, pricing_confirmed, 
            type, remarks, is_deleted, created_at, updated_at
          )
          VALUES (
            @id, @tender_id, @item_master_id, @estimated_unit_price,
            @actual_unit_price, @total_quantity_received, @pricing_confirmed,
            @type, @remarks, 0, GETDATE(), GETDATE()
          )
        `);
      addedItems++;
    }
    await transaction.commit();
    res.json({ 
      success: true, 
      message: 'Tender items successfully added to stock acquisition',
      addedItems,
      tenderId,
      tenderTitle: tender.title
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to add tender to stock acquisition:', error);
    res.status(500).json({ 
      error: 'Failed to add tender to stock acquisition', 
      details: error.message 
    });
  }
});
// Add missing API endpoints for dashboard
// Get tenders from stock_transactions_clean
app.get('/api/tenders', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        tender_id as id,
        'Tender ' + LEFT(CAST(tender_id AS VARCHAR(50)), 8) + '...' as title,
        'TND-' + LEFT(CAST(tender_id AS VARCHAR(50)), 8) as tender_number,
        CASE WHEN AVG(CAST(pricing_confirmed AS INT)) > 0.5 THEN 1 ELSE 0 END as is_finalized,
        MIN(created_at) as created_at,
        MAX(updated_at) as updated_at,
        COUNT(*) as item_count,
        SUM(estimated_unit_price) as estimated_value,
        SUM(actual_unit_price) as actual_value
      FROM stock_transactions_clean 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      GROUP BY tender_id
      ORDER BY MAX(updated_at) DESC
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenders', details: error.message });
  }
});
// Get stock transactions by tender ID (for TransactionManager)
app.get('/api/stock-transactions', async (req, res) => {
  try {
    const { tender_id } = req.query;
    if (tender_id) {
      const query = `
        SELECT 
          id,
          tender_id,
          item_master_id,
          estimated_unit_price,
          actual_unit_price,
          total_quantity_received as quantity,
          pricing_confirmed,
          is_deleted,
          created_at,
          updated_at,
          -- Add fields that TransactionManager expects
          'Unknown Item' as nomenclature,
          '' as specifications
        FROM stock_transactions_clean
        WHERE tender_id = @tender_id
        AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY created_at DESC
      `;
      const result = await pool.request()
        .input('tender_id', require('mssql').UniqueIdentifier, tender_id)
        .query(query);
      res.json(result.recordset);
    } else {
      // Return all stock transactions if no tender_id filter
      const query = `
        SELECT 
          id,
          tender_id,
          item_master_id,
          estimated_unit_price,
          actual_unit_price,
          total_quantity_received as quantity,
          pricing_confirmed,
          is_deleted,
          created_at,
          updated_at
        FROM stock_transactions_clean
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY created_at DESC
      `;
      const result = await pool.request().query(query);
      res.json(result.recordset);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions', details: error.message });
  }
});
// Get deliveries (dummy data for now since we don't have delivery table)
app.get('/api/deliveries', async (req, res) => {
  try {
    // Return dummy delivery data based on stock transactions
    const query = `
      SELECT 
        NEWID() as id,
        tender_id,
        'Delivery for Tender ' + LEFT(CAST(tender_id AS VARCHAR(50)), 8) + '...' as delivery_note,
        CASE WHEN pricing_confirmed = 1 THEN 'delivered' ELSE 'pending' END as status,
        updated_at as delivery_date,
        actual_unit_price as value
      FROM stock_transactions_clean 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      AND actual_unit_price > 0
      ORDER BY updated_at DESC
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});
// Get inventory stock (dummy data for now)
app.get('/api/inventory-stock', async (req, res) => {
  try {
    // Return summary data based on stock transactions
    const query = `
      SELECT 
        item_master_id as id,
        'Item ' + LEFT(CAST(item_master_id AS VARCHAR(50)), 8) + '...' as item_name,
        SUM(total_quantity_received) as current_stock,
        SUM(actual_unit_price) as total_value,
        AVG(actual_unit_price) as unit_price,
        MAX(updated_at) as last_updated
      FROM stock_transactions_clean 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      GROUP BY item_master_id
      HAVING SUM(total_quantity_received) > 0
      ORDER BY MAX(updated_at) DESC
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory stock', details: error.message });
  }
});
// Get specific tender by ID
// New endpoint for the SQL Server view: View_stock_transactions_clean
app.get('/api/view-stock-transactions-clean', async (req, res) => {
  try {
    const { tender_id } = req.query;
    let query = `
      SELECT 
        id,
        tender_id,
        reference_number,
        title,
        publish_date,
        publication_date,
        submission_date,
        submission_deadline,
        opening_date,
        item_master_id,
        nomenclature,
        sub_category_name,
        category_id,
        sub_category_id,
        actual_unit_price,
        total_quantity_received,
        type,
        pricing_confirmed,
        is_deleted
      FROM View_stock_transactions_clean
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const request = pool.request();
    if (tender_id) {
      query += ` AND tender_id = @tender_id`;
      request.input('tender_id', sql.UniqueIdentifier, tender_id);
    }
    query += ` ORDER BY title, nomenclature`;
    const result = await request.query(query);
    console.log(`✅ Retrieved ${result.recordset.length} records from View_stock_transactions_clean`);
    if (tender_id) {
      console.log(`📊 Filtered by tender_id: ${tender_id}`);
    }
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching from view:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from View_stock_transactions_clean', 
      details: error.message 
    });
  }
});
// =============================================================================
// APPROVAL FORWARDING APIs
// =============================================================================
// Get all approval forwards for a user (pending on them)
app.get('/api/approvals/pending/:userId', async (req, res) => {
  try {
    let { userId } = req.params;
    // Require session authentication - userId parameter should match session user
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) {
      console.log('⚠️ Pending Approvals: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to view approvals.'
      });
    }
    // Use session user if parameter doesn't match or is not provided
    if (!userId || userId === 'undefined' || userId === 'null' || userId !== sessionUserId) {
      userId = sessionUserId;
      console.log('📋 Pending Approvals: Using session user:', userId);
    }
    console.log('📋 Pending Approvals: Fetching for user:', userId);
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockPendingApprovals = [
        {
          IssuanceId: 1,
          IssuanceNumber: 'ISS-2024-001',
          RequestedByName: 'John Doe',
          ForwardedFromName: 'Manager Smith',
          ForwardReason: 'Please review and approve this stock issuance request',
          ForwardDate: new Date().toISOString(),
          Priority: 'High',
          DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          Level: 2
        }
      ];
      return res.json(mockPendingApprovals);
    }
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ra.request_id as IssuanceId,
          sir.request_number as IssuanceNumber,
          submitter.FullName as RequestedByName,
          submitter.Email as RequestedByEmail,
          approver.FullName as ForwardedFromName,
          approver.Email as ForwardedFromEmail,
          'Pending approval' as ForwardReason,
          ra.submitted_date as ForwardDate,
          'Normal' as Priority,
          DATEADD(day, 7, ra.submitted_date) as DueDate,
          1 as Level,
          ra.submitted_date as RequestDate,
          ra.current_status as ApprovalStatus
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id AND ra.request_type = 'stock_issuance'
        WHERE ra.current_approver_id = @userId 
          AND ra.current_status = 'pending'
        ORDER BY ra.submitted_date DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending approvals', 
      details: error.message 
    });
  }
});
// Get approval history for an issuance (supports numeric issuanceId for legacy StockIssuances and GUID request IDs for request-based history)
app.get('/api/approvals/history/:issuanceId', async (req, res) => {
  try {
    const { issuanceId } = req.params;
    console.log('Fetching approval history for:', issuanceId);
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockHistory = [
        {
          ActionType: 'SUBMITTED',
          ActionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          UserName: 'John Doe',
          Comments: 'Initial submission',
          Level: 1
        },
        {
          ActionType: 'FORWARDED',
          ActionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          UserName: 'Manager Smith',
          Comments: 'Forwarding to senior management for approval',
          ForwardedToName: 'Director Johnson',
          Level: 2
        }
      ];
      return res.json(mockHistory);
    }
    // Detect if issuanceId looks numeric (legacy StockIssuances with INT id)
    const numericId = /^\d+$/.test(issuanceId);
    if (numericId) {
      // Legacy path: IssuanceApprovalHistory expects an INT issuanceId
      try {
        const result = await pool.request()
          .input('issuanceId', sql.Int, parseInt(issuanceId, 10))
          .query(`
            SELECT 
              ah.ActionType,
              ah.ActionDate,
              ah.Comments,
              ah.Level,
              ah.IsFinalApproval,
              u.FullName as UserName,
              u.Email as UserEmail,
              ft.FullName as ForwardedToName,
              ft.Email as ForwardedToEmail,
              ah.ForwardReason
            FROM IssuanceApprovalHistory ah
            INNER JOIN AspNetUsers u ON ah.UserId = u.Id
            LEFT JOIN AspNetUsers ft ON ah.ForwardedToUserId = ft.Id
            WHERE ah.IssuanceId = @issuanceId
            ORDER BY ah.ActionDate ASC
          `);
        return res.json(result.recordset);
      } catch (numErr) {
        console.warn('Numeric issuanceId query failed, falling back to request-based history. Error:', numErr && numErr.message ? numErr.message : numErr);
        // fallthrough to GUID/request-based path below
      }
    }
    // If not numeric, treat as a GUID request id and query the request-based approval history
    try {
      // approval_history links to request_approvals via request_approval_id; join to filter by request_id
      const reqHistory = await pool.request()
        .input('requestId', sql.NVarChar(450), issuanceId)
        .query(`
          SELECT 
            ah.action_type as ActionType,
            ah.action_date as ActionDate,
            ah.comments as Comments,
            ah.step_number as StepNumber,
            ah.is_current_step as IsCurrentStep,
            ah.forwarded_from as ForwardedFromUserId,
            ah.forwarded_to as ForwardedToUserId,
            u.FullName as ActionByName,
            fu.FullName as ForwardedFromName,
            tu.FullName as ForwardedToName
          FROM approval_history ah
          LEFT JOIN request_approvals ra ON ah.request_approval_id = ra.id
          LEFT JOIN AspNetUsers u ON ah.action_by = u.Id
          LEFT JOIN AspNetUsers fu ON ah.forwarded_from = fu.Id
          LEFT JOIN AspNetUsers tu ON ah.forwarded_to = tu.Id
          WHERE ra.request_id = @requestId
          ORDER BY ah.action_date ASC
        `);
      console.log(`Found ${reqHistory.recordset.length} approval history entries for request ${issuanceId}`);
      return res.json(reqHistory.recordset || []);
    } catch (err) {
      console.error('❌ Error fetching guid-based approval history:', err);
      return res.status(500).json({ error: 'Failed to fetch approval history for request id', details: err.message });
    }
  } catch (error) {
    console.error('❌ Error fetching approval history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch approval history', 
      details: error.message 
    });
  }
});
// Forward an approval to another user
app.post('/api/approvals/forward', async (req, res) => {
  try {
    const { 
      issuanceId, 
      forwardedToUserId, 
      forwardReason, 
      priority = 'Normal',
      dueDate,
      currentUserId 
    } = req.body;
    if (!issuanceId || !forwardedToUserId || !currentUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: issuanceId, forwardedToUserId, currentUserId' 
      });
    }
    if (!pool) {
      // Return mock success when SQL Server is not connected
      return res.json({ 
        success: true, 
        message: 'Approval forwarded successfully (mock)',
        forwardId: Math.floor(Math.random() * 1000)
      });
    }
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Get current approval level
      const currentForward = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          SELECT Level FROM IssuanceApprovalForwards 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);
      const currentLevel = currentForward.recordset[0]?.Level || 1;
      const nextLevel = currentLevel + 1;
      // Deactivate current forward
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          UPDATE IssuanceApprovalForwards 
          SET IsActive = 0 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);
      // Create new forward
      const forwardResult = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('forwardedFromUserId', sql.NVarChar, currentUserId)
        .input('forwardedToUserId', sql.NVarChar, forwardedToUserId)
        .input('forwardReason', sql.NText, forwardReason)
        .input('level', sql.Int, nextLevel)
        .input('priority', sql.NVarChar, priority)
        .input('dueDate', sql.DateTime2, dueDate || null)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalForwards 
          (IssuanceId, ForwardedFromUserId, ForwardedToUserId, ForwardReason, Level, Priority, DueDate, CreatedBy)
          OUTPUT INSERTED.Id
          VALUES (@issuanceId, @forwardedFromUserId, @forwardedToUserId, @forwardReason, @level, @priority, @dueDate, @createdBy)
        `);
      // Add to approval history
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('userId', sql.NVarChar, currentUserId)
        .input('actionType', sql.NVarChar, 'FORWARDED')
        .input('comments', sql.NText, `Forwarded with reason: ${forwardReason}`)
        .input('forwardedToUserId', sql.NVarChar, forwardedToUserId)
        .input('forwardReason', sql.NText, forwardReason)
        .input('level', sql.Int, currentLevel)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalHistory 
          (IssuanceId, UserId, ActionType, Comments, ForwardedToUserId, ForwardReason, Level, CreatedBy)
          VALUES (@issuanceId, @userId, @actionType, @comments, @forwardedToUserId, @forwardReason, @level, @createdBy)
        `);
      // Update stock issuance current approver
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentApproverId', sql.NVarChar, forwardedToUserId)
        .input('approvalLevel', sql.Int, nextLevel)
        .query(`
          UPDATE StockIssuances 
          SET CurrentApproverId = @currentApproverId, ApprovalLevel = @approvalLevel
          WHERE Id = @issuanceId
        `);
      await transaction.commit();
      // Create notification for the forwarded user
      try {
        await createNotification(
          forwardedToUserId,
          'New Approval Request',
          `You have been assigned a new approval request for issuance #${issuanceId}. ${forwardReason ? `Reason: ${forwardReason}` : ''}`,
          'warning',
          '/approval-manager',
          'Review Now'
        );
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the request if notification fails
      }
      res.json({ 
        success: true, 
        message: 'Approval forwarded successfully',
        forwardId: forwardResult.recordset[0].Id
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error forwarding approval:', error);
    res.status(500).json({ 
      error: 'Failed to forward approval', 
      details: error.message 
    });
  }
});
// Approve an issuance
app.post('/api/approvals/approve', async (req, res) => {
  try {
    const { 
      issuanceId, 
      comments, 
      isFinalApproval = false,
      currentUserId 
    } = req.body;
    if (!issuanceId || !currentUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: issuanceId, currentUserId' 
      });
    }
    if (!pool) {
      // Return mock success when SQL Server is not connected
      return res.json({ 
        success: true, 
        message: 'Approval completed successfully (mock)'
      });
    }
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Get current approval level
      const currentForward = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          SELECT Level FROM IssuanceApprovalForwards 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);
      const currentLevel = currentForward.recordset[0]?.Level || 1;
      // Deactivate current forward
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          UPDATE IssuanceApprovalForwards 
          SET IsActive = 0 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);
      // Add to approval history
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('userId', sql.NVarChar, currentUserId)
        .input('actionType', sql.NVarChar, 'APPROVED')
        .input('comments', sql.NText, comments)
        .input('level', sql.Int, currentLevel)
        .input('isFinalApproval', sql.Bit, isFinalApproval)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalHistory 
          (IssuanceId, UserId, ActionType, Comments, Level, IsFinalApproval, CreatedBy)
          VALUES (@issuanceId, @userId, @actionType, @comments, @level, @isFinalApproval, @createdBy)
        `);
      // Update stock issuance status
      const newStatus = isFinalApproval ? 'APPROVED' : 'PENDING';
      const updateQuery = isFinalApproval 
        ? `UPDATE StockIssuances 
           SET ApprovalStatus = @newStatus, 
               FinalApprovedBy = @currentUserId, 
               FinalApprovalDate = GETDATE(),
               CurrentApproverId = NULL
           WHERE Id = @issuanceId`
        : `UPDATE StockIssuances 
           SET ApprovalStatus = @newStatus,
               CurrentApproverId = NULL
           WHERE Id = @issuanceId`;
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('newStatus', sql.NVarChar, newStatus)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(updateQuery);
      await transaction.commit();
      res.json({ 
        success: true, 
        message: isFinalApproval ? 'Final approval completed successfully' : 'Approval completed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error approving issuance:', error);
    res.status(500).json({ 
      error: 'Failed to approve issuance', 
      details: error.message 
    });
  }
});
// Reject an issuance
app.post('/api/approvals/reject', async (req, res) => {
  try {
    const { 
      issuanceId, 
      comments, 
      currentUserId 
    } = req.body;
    if (!issuanceId || !currentUserId || !comments) {
      return res.status(400).json({ 
        error: 'Missing required fields: issuanceId, currentUserId, comments' 
      });
    }
    if (!pool) {
      // Return mock success when SQL Server is not connected
      return res.json({ 
        success: true, 
        message: 'Issuance rejected successfully (mock)'
      });
    }
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Get current approval level
      const currentForward = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          SELECT Level FROM IssuanceApprovalForwards 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);
      const currentLevel = currentForward.recordset[0]?.Level || 1;
      // Deactivate all active forwards for this issuance
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .query(`
          UPDATE IssuanceApprovalForwards 
          SET IsActive = 0 
          WHERE IssuanceId = @issuanceId 
            AND IsActive = 1
        `);
      // Add to approval history
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('userId', sql.NVarChar, currentUserId)
        .input('actionType', sql.NVarChar, 'REJECTED')
        .input('comments', sql.NText, comments)
        .input('level', sql.Int, currentLevel)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalHistory 
          (IssuanceId, UserId, ActionType, Comments, Level, CreatedBy)
          VALUES (@issuanceId, @userId, @actionType, @comments, @level, @createdBy)
        `);
      // Update stock issuance status
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .query(`
          UPDATE StockIssuances 
          SET ApprovalStatus = 'REJECTED',
              CurrentApproverId = NULL
          WHERE Id = @issuanceId
        `);
      await transaction.commit();
      res.json({ 
        success: true, 
        message: 'Issuance rejected successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error rejecting issuance:', error);
    res.status(500).json({ 
      error: 'Failed to reject issuance', 
      details: error.message 
    });
  }
});
// Get approval status overview
app.get('/api/approvals/status/:issuanceId', async (req, res) => {
  try {
    const { issuanceId } = req.params;
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockStatus = {
        IssuanceId: parseInt(issuanceId),
        IssuanceNumber: 'ISS-2024-001',
        RequestedByName: 'John Doe',
        ApprovalStatus: 'PENDING',
        CurrentApproverName: 'Manager Smith',
        ApprovalLevel: 2,
        RequestDate: new Date().toISOString(),
        LatestAction: 'FORWARDED',
        LatestActionDate: new Date().toISOString()
      };
      return res.json(mockStatus);
    }
    const result = await pool.request()
      .input('issuanceId', sql.Int, issuanceId)
      .query(`
        SELECT * FROM View_IssuanceApprovalStatus 
        WHERE IssuanceId = @issuanceId
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Issuance not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error fetching approval status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch approval status', 
      details: error.message 
    });
  }
});
// ============================================================================
// INVENTORY VERIFICATION ENDPOINTS
// ============================================================================
// Check wing inventory availability for an item
app.post('/api/inventory/check-availability', async (req, res) => {
  try {
    const { itemMasterId, wingId, requestedQuantity } = req.body;
    console.log('📦 Inventory Check Request:', { itemMasterId, wingId, requestedQuantity });
    if (!itemMasterId || !requestedQuantity) {
      return res.status(400).json({ 
        error: 'Missing required fields: itemMasterId, requestedQuantity' 
      });
    }
    if (!pool) {
      // Mock data for testing
      return res.json({
        success: true,
        data: {
          item_master_id: itemMasterId,
          item_name: 'HP ENVY 6',
          unit: 'PCS',
          requested_quantity: requestedQuantity,
          available_quantity: 3,
          is_available: true,
          availability_status: 'Sufficient Stock'
        }
      });
    }
    // Query the current inventory to check availability
    const result = await pool.request()
      .input('ItemMasterId', sql.NVarChar, itemMasterId)
      .input('RequestedQuantity', sql.Int, requestedQuantity)
      .query(`
        SELECT 
          CAST(cis.item_master_id AS NVARCHAR(450)) as item_master_id,
          ISNULL(im.nomenclature, 'Unknown Item') as item_name,
          ISNULL(im.unit, 'PCS') as unit,
          @RequestedQuantity as requested_quantity,
          ISNULL(cis.available_quantity, 0) as available_quantity,
          CASE 
            WHEN ISNULL(cis.available_quantity, 0) >= @RequestedQuantity THEN 1
            ELSE 0
          END as is_available,
          CASE 
            WHEN ISNULL(cis.available_quantity, 0) >= @RequestedQuantity THEN 'Sufficient Stock'
            ELSE 'Insufficient Stock (' + CAST(ISNULL(cis.available_quantity, 0) AS NVARCHAR(10)) + ' available)'
          END as availability_status
        FROM current_inventory_stock cis
        LEFT JOIN item_masters im ON CAST(im.id AS NVARCHAR(450)) = CAST(cis.item_master_id AS NVARCHAR(450))
        WHERE CAST(cis.item_master_id AS NVARCHAR(450)) = @ItemMasterId
      `);
    console.log('📦 Inventory Query Result:', result.recordset);
    if (result.recordset.length === 0) {
      console.warn('⚠️ No inventory found for item:', itemMasterId);
      return res.json({
        success: true,
        data: {
          item_master_id: itemMasterId,
          item_name: 'Unknown Item',
          unit: 'PCS',
          requested_quantity: requestedQuantity,
          available_quantity: 0,
          is_available: false,
          availability_status: 'Item not found in inventory'
        }
      });
    }
    console.log('✅ Inventory check successful for item:', itemMasterId);
    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error checking inventory availability:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check inventory availability', 
      details: error.message 
    });
  }
});
// Request inventory verification from inventory supervisor
app.post('/api/inventory/request-verification', async (req, res) => {
  try {
    const { 
      stockIssuanceId,
      itemMasterId,
      itemNomenclature,
      requestedQuantity,
      requestedByUserId,
      requestedByName,
      wingId,
      wingName,
      forwardToStoreKeeperId  // Optional: specific store keeper to forward to
    } = req.body;
    console.log('📦 Verification request received:', { stockIssuanceId, itemMasterId, itemNomenclature, requestedByUserId, wingId });
    if (!stockIssuanceId || !itemMasterId || !requestedByUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { stockIssuanceId, itemMasterId, requestedByUserId }
      });
    }
    if (!pool) {
      console.log('⚠️  No database pool, returning mock response');
      return res.json({
        success: true,
        message: 'Verification request created (mock)',
        verificationId: 'mock-' + Date.now()
      });
    }
    try {
      // First, if forwarding to a specific store keeper, get their name
      let storeKeeperUserId = forwardToStoreKeeperId;
      let storeKeeperName = null;
      console.log('🔍 Auto-forwarding logic:');
      console.log('   wingId received:', wingId);
      console.log('   forwardToStoreKeeperId:', forwardToStoreKeeperId);
      if (storeKeeperUserId) {
        // Get store keeper's name
        const skResult = await pool.request()
          .input('userId', sql.NVarChar, storeKeeperUserId)
          .query(`
            SELECT u.UserName, u.Id FROM AspNetUsers u 
            WHERE u.Id = @userId
          `);
        if (skResult.recordset.length > 0) {
          storeKeeperName = skResult.recordset[0].UserName;
          console.log('👤 Store keeper found:', { storeKeeperUserId, storeKeeperName });
        }
      } else if (wingId) {
        // Auto-forward to any store keeper in this wing with CUSTOM_WING_STORE_KEEPER role
        console.log('🔍 Finding store keepers for wing:', wingId);
        try {
          const skSearchResult = await pool.request()
            .input('wingId', sql.Int, wingId)
            .query(`
              SELECT TOP 1 u.Id, u.UserName
              FROM AspNetUsers u
              INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
              INNER JOIN ims_roles ir ON ur.role_id = ir.id
              WHERE u.intWingID = @wingId
                AND ir.is_active = 1
                AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
              ORDER BY u.UserName
            `);
          if (skSearchResult.recordset.length > 0) {
            // Forward to the first store keeper found
            storeKeeperUserId = skSearchResult.recordset[0].Id;
            storeKeeperName = skSearchResult.recordset[0].UserName;
            console.log('✅ Store keeper auto-assigned:', { storeKeeperUserId, storeKeeperName });
          } else {
            console.log('⚠️  No store keepers found for wing:', wingId);
            console.log('    Query may have failed silently or no store keepers have that role in that wing');
          }
        } catch (queryError) {
          console.error('❌ Error querying for store keepers:', queryError.message);
          console.log('    Stack:', queryError.stack);
        }
      }
      // Create verification request with forwarding information
      // Get wing name if not provided
      let finalWingName = wingName || 'Unknown';
      if (wingId && !wingName) {
        try {
          const wingQuery = await pool.request()
            .input('wingId', sql.Int, wingId)
            .query(`
              SELECT TOP 1
                CASE 
                  WHEN intWingID = 1 THEN 'Wing 1 - Admin'
                  WHEN intWingID = 2 THEN 'Wing 2 - Stores'
                  WHEN intWingID = 3 THEN 'Wing 3 - Finance'
                  WHEN intWingID = 19 THEN 'Wing 19'
                  ELSE 'Wing ' + CAST(intWingID AS NVARCHAR(10))
                END AS wing_name
              FROM AspNetUsers
              WHERE intWingID = @wingId
            `);
          if (wingQuery.recordset.length > 0) {
            finalWingName = wingQuery.recordset[0].wing_name;
            console.log('✅ Wing name found:', finalWingName);
          }
        } catch (wingError) {
          console.warn('⚠️  Could not lookup wing name, using default:', wingError.message);
        }
      }
      const result = await pool.request()
        .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
        .input('itemMasterId', sql.NVarChar, itemMasterId)
        .input('itemNomenclature', sql.NVarChar, itemNomenclature || 'Unknown Item')
        .input('requestedByUserId', sql.NVarChar, requestedByUserId)
        .input('requestedByName', sql.NVarChar, requestedByName || 'System')
        .input('requestedQuantity', sql.Int, requestedQuantity || 0)
        .input('wingId', sql.Int, wingId || 0)
        .input('wingName', sql.NVarChar, finalWingName)
        .input('forwardedToUserId', sql.NVarChar, storeKeeperUserId || null)
        .input('forwardedToName', sql.NVarChar, storeKeeperName || null)
        .input('forwardedByUserId', sql.NVarChar, requestedByUserId)
        .input('forwardedByName', sql.NVarChar, requestedByName)
        .query(`
          INSERT INTO inventory_verification_requests 
          (stock_issuance_id, item_master_id, item_nomenclature, requested_by_user_id, requested_by_name, 
           requested_quantity, verification_status, wing_id, wing_name, created_at, updated_at,
           forwarded_to_user_id, forwarded_to_name, forwarded_by_user_id, forwarded_by_name, forwarded_at)
          OUTPUT INSERTED.id
          VALUES (@stockIssuanceId, @itemMasterId, @itemNomenclature, @requestedByUserId, @requestedByName,
                  @requestedQuantity, 'pending', @wingId, @wingName, GETDATE(), GETDATE(),
                  @forwardedToUserId, @forwardedToName, @forwardedByUserId, @forwardedByName, GETDATE())
        `);
      const verificationId = result.recordset[0]?.id;
      console.log('✅ Verification request created:', verificationId);
      res.json({
        success: true,
        message: 'Verification request created successfully',
        verificationId: verificationId
      });
    } catch (error) {
      console.error('❌ Error in verification request:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error requesting verification:', error);
    res.status(500).json({ 
      error: 'Failed to request verification', 
      details: error.message 
    });
  }
});
// Forward verification request to store keeper
app.post('/api/inventory/forward-verification-to-store-keeper', async (req, res) => {
  try {
    const {
      verificationId,
      storeKeeperUserId,
      storeKeeperName,
      forwardedByUserId,
      forwardedByName,
      forwardNotes
    } = req.body;
    if (!verificationId || !storeKeeperUserId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['verificationId', 'storeKeeperUserId']
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        message: 'Forwarded to store keeper (mock)',
        verificationId
      });
    }
    // Update verification request with forwarding info
    const result = await pool.request()
      .input('verificationId', sql.Int, verificationId)
      .input('storeKeeperUserId', sql.NVarChar, storeKeeperUserId)
      .input('storeKeeperName', sql.NVarChar, storeKeeperName || 'Store Keeper')
      .input('forwardedByUserId', sql.NVarChar, forwardedByUserId || 'System')
      .input('forwardedByName', sql.NVarChar, forwardedByName || 'System')
      .input('forwardNotes', sql.NVarChar, forwardNotes || null)
      .query(`
        UPDATE inventory_verification_requests
        SET 
          forwarded_to_user_id = @storeKeeperUserId,
          forwarded_to_name = @storeKeeperName,
          forwarded_by_user_id = @forwardedByUserId,
          forwarded_by_name = @forwardedByName,
          forwarded_at = GETDATE(),
          forward_notes = @forwardNotes,
          updated_at = GETDATE()
        WHERE id = @verificationId
      `);
    console.log('✅ Verification forwarded to store keeper:', { verificationId, storeKeeperUserId });
    res.json({
      success: true,
      message: 'Verification forwarded to store keeper successfully',
      verificationId
    });
  } catch (error) {
    console.error('❌ Error forwarding verification:', error);
    res.status(500).json({
      error: 'Failed to forward verification',
      details: error.message
    });
  }
});
// Get pending verification requests for inventory supervisor
app.get('/api/inventory/pending-verifications', async (req, res) => {
  try {
    const { userId, wingId } = req.query;
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        data: []
      });
    }
    console.log('📋 Pending Verifications API - userId:', userId, 'wingId:', wingId);
    // If wingId is provided, filter by that wing. Otherwise return empty (user must be a supervisor)
    let whereClause = '';
    if (wingId) {
      whereClause = `WHERE sir.requester_wing_id = ${parseInt(wingId)}`;
      console.log(`🏢 Filtering pending verifications for wing: ${wingId}`);
    } else {
      // No wing specified - return empty
      return res.json({
        success: true,
        data: []
      });
    }
    // Get pending stock issuance requests for the wing
    const query = `
      SELECT 
        sir.id as request_id,
        sir.request_number,
        sir.request_type,
        sir.requester_wing_id,
        u.FullName as requester_name,
        sir.purpose,
        sir.request_status as status,
        sir.submitted_at as requested_at,
        sir.created_at,
        sir.updated_at,
        COUNT(DISTINCT sii.id) as total_items
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN stock_issuance_items sii ON sir.id = sii.request_id
      ${whereClause}
      GROUP BY sir.id, sir.request_number, sir.request_type, sir.requester_wing_id, u.FullName, 
               sir.purpose, sir.request_status, sir.submitted_at, sir.created_at, sir.updated_at
      ORDER BY sir.submitted_at DESC
    `;
    console.log('🔍 Query:', query.substring(0, 100) + '...');
    const result = await pool.request().query(query);
    console.log(`✅ Fetched ${result.recordset.length} pending stock issuance requests for wing ${wingId}`);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching pending verifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending verifications', 
      details: error.message 
    });
  }
});
// Get verification requests made by the current user (wing supervisor/requester)
app.get('/api/inventory/my-verification-requests', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        data: []
      });
    }
    console.log('📋 My Verification Requests - userId:', userId);
    // Query inventory_verification_requests made by this user
    // Returns both pending (waiting for store keeper) and verified (store keeper replied) requests
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id as request_id,
          ivr.item_master_id,
          ivr.requested_by_user_id,
          ivr.requested_by_name,
          ivr.requested_at,
          ivr.requested_quantity,
          ivr.verification_status as status,
          ivr.verified_by_user_id,
          ivr.verified_by_name,
          ivr.verified_at,
          ivr.physical_count,
          ivr.available_quantity,
          ivr.verification_notes,
          ivr.wing_id,
          ivr.wing_name,
          ivr.item_nomenclature,
          ivr.forwarded_to_user_id,
          ivr.forwarded_to_name,
          ivr.forwarded_at,
          ivr.created_at,
          ivr.updated_at
        FROM inventory_verification_requests ivr
        WHERE ivr.requested_by_user_id = @userId
        ORDER BY ivr.requested_at DESC
      `);
    console.log('✅ Found', result.recordset.length, 'verification requests for user', userId);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching my verification requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verification requests', 
      details: error.message 
    });
  }
});
// Get forwarded verifications for Store Keeper
app.get('/api/inventory/my-forwarded-verifications', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        data: []
      });
    }
    console.log('📋 My Forwarded Verifications - userId:', userId);
    // Query inventory_verification_requests forwarded to this store keeper
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ivr.requested_by_user_id,
          ivr.requested_by_name,
          ivr.requested_at,
          ivr.requested_quantity,
          ivr.verification_status,
          ivr.verified_by_user_id,
          ivr.verified_by_name,
          ivr.verified_at,
          ivr.physical_count,
          ivr.available_quantity,
          ivr.verification_notes,
          ivr.wing_id,
          ivr.item_nomenclature,
          ivr.forwarded_to_user_id,
          ivr.forwarded_to_name,
          ivr.forwarded_by_user_id,
          ivr.forwarded_by_name,
          ivr.forwarded_at,
          ivr.forward_notes,
          ivr.created_at,
          ivr.updated_at,
          vud.strDesignation AS requester_designation
        FROM inventory_verification_requests ivr
        LEFT JOIN vw_User_with_designation vud ON ivr.requested_by_user_id = vud.Id
        WHERE ivr.forwarded_to_user_id = @userId
        ORDER BY ivr.forwarded_at DESC
      `);
    console.log('✅ Found', result.recordset.length, 'forwarded verifications for store keeper', userId);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching forwarded verifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch forwarded verifications', 
      details: error.message 
    });
  }
});
// Update verification status (by inventory supervisor)
app.post('/api/inventory/update-verification', async (req, res) => {
  try {
    const {
      verificationId,
      verificationStatus,
      action,
      physicalCount,
      availableQuantity,
      verificationNotes,
      verifiedByUserId,
      verifiedByName,
      forwardToUserId,
      forwardToName
    } = req.body;
    if (!verificationId || !verificationStatus || !verifiedByUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        message: 'Verification updated (mock)'
      });
    }
    try {
      console.log('📦 Updating verification:', { verificationId, verificationStatus });
      // Get verification request details before updating
      const verificationDetailsResult = await pool.request()
        .input('verificationId', sql.Int, verificationId)
        .query(`
          SELECT 
            id,
            stock_issuance_id,
            item_master_id,
            item_nomenclature,
            requested_quantity,
            requested_by_user_id,
            requested_by_name,
            wing_id,
            wing_name
          FROM inventory_verification_requests
          WHERE id = @verificationId
        `);
      const verificationDetails = verificationDetailsResult.recordset[0];
      // Decide action
      const actionType = action || 'verify'; // verify | approve | reject | forward
      let finalStatus = verificationStatus;
      if (actionType === 'approve') {
        finalStatus = 'approved';
      } else if (actionType === 'reject') {
        finalStatus = 'rejected';
      } else if (actionType === 'forward') {
        finalStatus = 'forwarded';
      }
      // Update based on action
      const requestBuilder = pool.request()
        .input('verificationId', sql.Int, verificationId)
        .input('verificationStatus', sql.NVarChar, finalStatus)
        .input('physicalCount', sql.Int, physicalCount || 0)
        .input('availableQuantity', sql.Int, availableQuantity || 0)
        .input('verificationNotes', sql.NVarChar, verificationNotes || 'No notes')
        .input('verifiedByUserId', sql.NVarChar, verifiedByUserId)
        .input('verifiedByName', sql.NVarChar, verifiedByName)
        .input('forwardToUserId', sql.NVarChar, forwardToUserId || null)
        .input('forwardToName', sql.NVarChar, forwardToName || null);
      if (actionType === 'forward') {
        await requestBuilder.query(`
          UPDATE inventory_verification_requests
          SET verification_status = @verificationStatus,
              verification_notes = @verificationNotes,
              forwarded_to_user_id = @forwardToUserId,
              forwarded_to_name = @forwardToName,
              forward_notes = @verificationNotes,
              forwarded_by_user_id = @verifiedByUserId,
              forwarded_by_name = @verifiedByName,
              forwarded_at = GETDATE(),
              verified_by_user_id = NULL,
              verified_by_name = NULL,
              verified_at = NULL,
              updated_at = GETDATE()
          WHERE id = @verificationId
        `);
      } else {
        await requestBuilder.query(`
          UPDATE inventory_verification_requests
          SET verification_status = @verificationStatus,
              physical_count = @physicalCount,
              available_quantity = @availableQuantity,
              verification_notes = @verificationNotes,
              verified_by_user_id = @verifiedByUserId,
              verified_by_name = @verifiedByName,
              verified_at = GETDATE(),
              updated_at = GETDATE()
          WHERE id = @verificationId
        `);
      }
      console.log('✅ Verification updated successfully');
      console.log('📧 Verification notification will be automatically available via /api/my-notifications');
      console.log('   (Fetched directly from inventory_verification_requests table)');
      res.json({
        success: true,
        message: 'Verification updated successfully',
        verificationId: verificationId
      });
    } catch (error) {
      console.error('❌ Error in verification update:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error updating verification:', error);
    res.status(500).json({ 
      error: 'Failed to update verification', 
      details: error.message 
    });
  }
});
// Forward verification request to Store Keeper (by Supervisor)
app.post('/api/inventory/forward-verification-to-storekeeper', async (req, res) => {
  try {
    const {
      verificationId,
      forwardedToUserId,
      forwardedToName,
      forwardedByUserId,
      forwardedByName,
      forwardNotes
    } = req.body;
    if (!verificationId || !forwardedToUserId || !forwardedByUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: verificationId, forwardedToUserId, forwardedByUserId' 
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        message: 'Verification forwarded to store keeper (mock)'
      });
    }
    try {
      console.log('📤 Forwarding verification to store keeper:', { verificationId, forwardedToName });
      // Update the verification request to forward it to store keeper
      const result = await pool.request()
        .input('verificationId', sql.Int, verificationId)
        .input('forwardedToUserId', sql.NVarChar, forwardedToUserId)
        .input('forwardedToName', sql.NVarChar, forwardedToName || 'Store Keeper')
        .input('forwardedByUserId', sql.NVarChar, forwardedByUserId)
        .input('forwardedByName', sql.NVarChar, forwardedByName || 'Supervisor')
        .input('forwardNotes', sql.NVarChar, forwardNotes || 'Please verify item availability')
        .query(`
          UPDATE inventory_verification_requests
          SET verification_status = 'forwarded',
              forwarded_to_user_id = @forwardedToUserId,
              forwarded_to_name = @forwardedToName,
              forwarded_by_user_id = @forwardedByUserId,
              forwarded_by_name = @forwardedByName,
              forward_notes = @forwardNotes,
              forwarded_at = GETDATE(),
              updated_at = GETDATE()
          WHERE id = @verificationId
          SELECT 
            id,
            stock_issuance_id,
            item_nomenclature,
            requested_quantity,
            verification_status,
            forwarded_to_name,
            forwarded_at
          FROM inventory_verification_requests
          WHERE id = @verificationId
        `);
      if (result.recordset.length === 0) {
        return res.status(404).json({ 
          error: 'Verification request not found' 
        });
      }
      const updatedVerification = result.recordset[0];
      console.log('✅ Verification forwarded successfully to:', updatedVerification.forwarded_to_name);
      res.json({
        success: true,
        message: 'Verification request forwarded to store keeper',
        data: updatedVerification
      });
    } catch (error) {
      console.error('❌ Database error in forwarding:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error forwarding verification:', error);
    res.status(500).json({ 
      error: 'Failed to forward verification request', 
      details: error.message 
    });
  }
});
// Get verification history for a specific user (requester)
app.get('/api/inventory/verification-history', async (req, res) => {
  try {
    const { userId, view } = req.query;
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }
    if (!pool) {
      return res.json({
        success: true,
        data: []
      });
    }
    const request = pool.request().input('userId', sql.NVarChar, userId);
    let query = `
      SELECT 
        id,
        item_nomenclature,
        requested_quantity,
        verification_status as status,
        physical_count,
        available_quantity,
        verification_notes,
        requested_by_user_id,
        requested_by_name,
        verified_by_user_id,
        verified_by_name,
        wing_id,
        wing_name,
        requested_at,
        verified_at
      FROM inventory_verification_requests
    `;
    if (view === 'verifier') {
      query += `
        WHERE verified_by_user_id = @userId
          AND verification_status IN ('verified_available','verified_partial','verified_unavailable')
          AND verified_at IS NOT NULL
        ORDER BY verified_at DESC
      `;
    } else {
      query += `
        WHERE requested_by_user_id = @userId
        ORDER BY requested_at DESC
      `;
    }
    const result = await request.query(query);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching verification history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verification history', 
      details: error.message 
    });
  }
});
// Get verification history for a stock issuance
app.get('/api/inventory/verification-history/:stockIssuanceId', async (req, res) => {
  try {
    const { stockIssuanceId } = req.params;
    if (!pool) {
      return res.json({
        success: true,
        data: []
      });
    }
    const result = await pool.request()
      .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
      .query(`
        SELECT 
          ivr.*,
          im.nomenclature as item_name,
          im.item_code
        FROM inventory_verification_requests ivr
        LEFT JOIN item_master im ON ivr.item_master_id = im.id
        WHERE ivr.stock_issuance_id = @stockIssuanceId
        ORDER BY ivr.created_at DESC
      `);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching verification history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verification history', 
      details: error.message 
    });
  }
});
// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================
// Helper function to create system notifications
async function createNotification(userId, title, message, type = 'info', actionUrl = null, actionText = null) {
  try {
    if (!pool) {
      console.warn('⚠️ Database not available, skipping notification creation');
      return null;
    }
    // Save notification to database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('title', sql.NVarChar, title)
      .input('message', sql.NVarChar, message)
      .input('type', sql.NVarChar, type)
      .input('actionUrl', sql.NVarChar, actionUrl)
      .input('actionText', sql.NVarChar, actionText)
      .execute('CreateNotification');
    const notification = result.recordset[0];
    console.log(`📧 Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
}
// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly = false, limit = 50 } = req.query;
    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }
    // Fetch notifications from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('unreadOnly', sql.Bit, unreadOnly === 'true')
      .input('limit', sql.Int, parseInt(limit))
      .execute('GetUserNotifications');
    res.json({
      success: true,
      notifications: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});
// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }
    await pool.request()
      .input('notificationId', sql.UniqueIdentifier, notificationId)
      .input('userId', sql.NVarChar, userId)
      .execute('MarkNotificationRead');
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});
// Get current user's notifications (uses session)
app.get('/api/my-notifications', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    console.log(`📬 Fetching notifications for user: ${userId}`);
    const { unreadOnly = false, limit = 50 } = req.query;
    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }
    // Query that combines regular notifications with verification requests
    const result = await pool.request()
      .input('UserId', sql.NVarChar, userId)
      .input('UnreadOnly', sql.Bit, unreadOnly === 'true')
      .query(`
        SELECT TOP 50 * FROM (
          -- Regular notifications from Notifications table
          SELECT 
            CAST(Id AS NVARCHAR(450)) AS Id,
            UserId,
            Title,
            Message,
            Type,
            ActionUrl,
            ActionText,
            IsRead,
            CreatedAt,
            ReadAt,
            'notification' AS SourceType
          FROM Notifications
          WHERE UserId = @UserId 
            AND (@UnreadOnly = 0 OR IsRead = 0)
          UNION ALL
          -- Supervisor pending requests as notifications (for wing supervisors)
          SELECT
            CAST('VER-PEND-' + CAST(ivr.id AS NVARCHAR(450)) AS NVARCHAR(450)) AS Id,
            @UserId AS UserId,
            'Verification Request: ' + ISNULL(ivr.item_nomenclature, CAST(ivr.item_master_id AS NVARCHAR)) AS Title,
            ('Requested By: ' + ISNULL(ivr.requested_by_name, 'Unknown') + CHAR(13) + CHAR(10) +
             'Requested Qty: ' + CAST(ivr.requested_quantity AS NVARCHAR) + CHAR(13) + CHAR(10) +
             'Wing: ' + ISNULL(ivr.wing_name, 'Unknown')) AS Message,
            'info' AS Type,
            '/dashboard/pending-verifications' AS ActionUrl,
            'Open Pending' AS ActionText,
            0 AS IsRead,
            ivr.requested_at AS CreatedAt,
            NULL AS ReadAt,
            'supervisor-pending' AS SourceType
          FROM inventory_verification_requests ivr
          JOIN ims_user_roles ur ON ur.scope_wing_id = ivr.wing_id AND ur.user_id = @UserId
          JOIN ims_roles r ON r.id = ur.role_id
          WHERE r.role_name = 'WING_SUPERVISOR'
            AND ivr.verification_status = 'pending'
          UNION ALL
          -- Requester pending requests as notifications (for the requester)
          SELECT
            CAST('REQ-PEND-' + CAST(ivr.id AS NVARCHAR(450)) AS NVARCHAR(450)) AS Id,
            ivr.requested_by_user_id AS UserId,
            'Verification Requested: ' + ISNULL(ivr.item_nomenclature, CAST(ivr.item_master_id AS NVARCHAR)) AS Title,
            ('Requested Qty: ' + CAST(ivr.requested_quantity AS NVARCHAR) + CHAR(13) + CHAR(10) +
             'Wing: ' + ISNULL(ivr.wing_name, 'Unknown')) AS Message,
            'info' AS Type,
            '/dashboard/verification-history' AS ActionUrl,
            'View Request Details' AS ActionText,
            0 AS IsRead,
            ivr.requested_at AS CreatedAt,
            NULL AS ReadAt,
            'requester-pending' AS SourceType
          FROM inventory_verification_requests ivr
          WHERE ivr.requested_by_user_id = @UserId
            AND ivr.verification_status = 'pending'
          UNION ALL
          -- Verification requests as notifications (only show verified ones to requester)
          SELECT 
            CAST('VER-' + CAST(ivr.id AS NVARCHAR(450)) AS NVARCHAR(450)) AS Id,
            ivr.requested_by_user_id AS UserId,
            'Verification Complete: ' + ISNULL(ivr.item_nomenclature, CAST(ivr.item_master_id AS NVARCHAR)) AS Title,
            CASE 
              WHEN ivr.verification_status = 'verified_available' 
                THEN '✅ Available - Physical Count: ' + CAST(ISNULL(ivr.physical_count, ivr.available_quantity) AS NVARCHAR) + 
                     CHAR(13) + CHAR(10) + 'Verified By: ' + ISNULL(ivr.verified_by_name, 'Unknown') +
                     CASE WHEN ivr.verification_notes IS NOT NULL AND ivr.verification_notes != '' 
                       THEN CHAR(13) + CHAR(10) + 'Notes: ' + ivr.verification_notes 
                       ELSE '' 
                     END
              WHEN ivr.verification_status = 'verified_partial' 
                THEN '⚠️ Partially Available - Physical Count: ' + CAST(ISNULL(ivr.physical_count, ivr.available_quantity) AS NVARCHAR) + 
                     CHAR(13) + CHAR(10) + 'Verified By: ' + ISNULL(ivr.verified_by_name, 'Unknown') +
                     CASE WHEN ivr.verification_notes IS NOT NULL AND ivr.verification_notes != '' 
                       THEN CHAR(13) + CHAR(10) + 'Notes: ' + ivr.verification_notes 
                       ELSE '' 
                     END
              WHEN ivr.verification_status = 'verified_unavailable' 
                THEN '❌ Unavailable - Physical Count: ' + CAST(ISNULL(ivr.physical_count, 0) AS NVARCHAR) + 
                     CHAR(13) + CHAR(10) + 'Verified By: ' + ISNULL(ivr.verified_by_name, 'Unknown') +
                     CASE WHEN ivr.verification_notes IS NOT NULL AND ivr.verification_notes != '' 
                       THEN CHAR(13) + CHAR(10) + 'Notes: ' + ivr.verification_notes 
                       ELSE '' 
                     END
              ELSE ivr.verification_status
            END AS Message,
            CASE 
              WHEN ivr.verification_status = 'verified_available' THEN 'success'
              WHEN ivr.verification_status = 'verified_partial' THEN 'warning'
              WHEN ivr.verification_status = 'verified_unavailable' THEN 'error'
              ELSE 'info'
            END AS Type,
            '/dashboard/verification-history' AS ActionUrl,
            'View Details' AS ActionText,
            0 AS IsRead,
            ivr.verified_at AS CreatedAt,
            NULL AS ReadAt,
            'verification' AS SourceType
          FROM inventory_verification_requests ivr
          WHERE ivr.requested_by_user_id = @UserId 
            AND ivr.verification_status IN ('verified_available', 'verified_partial', 'verified_unavailable')
            AND ivr.verified_at IS NOT NULL
        ) AS CombinedNotifications
        ORDER BY CreatedAt DESC
      `);
    res.json({
      success: true,
      notifications: result.recordset
    });
    const verificationCount = result.recordset.filter(n => n.SourceType === 'verification').length;
    const supervisorPendingCount = result.recordset.filter(n => n.SourceType === 'supervisor-pending').length;
    const requesterPendingCount = result.recordset.filter(n => n.SourceType === 'requester-pending').length;
    const regularCount = result.recordset.filter(n => n.SourceType === 'notification').length;
    console.log(`✅ Returned ${result.recordset.length} total notifications for user ${userId}`);
    console.log(`   - ${regularCount} regular notifications`);
    console.log(`   - ${verificationCount} verification notifications`);
    console.log(`   - ${supervisorPendingCount} supervisor pending notifications`);
    console.log(`   - ${requesterPendingCount} requester pending notifications`);
  } catch (error) {
    console.error('❌ Error fetching my notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});
// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    // TODO: In production, update database
    // await pool.request()
    //   .input('notificationId', sql.NVarChar, notificationId)
    //   .query(`
    //     UPDATE Notifications 
    //     SET IsRead = 1, ReadAt = GETDATE()
    //     WHERE Id = @notificationId
    //   `);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read', 
      details: error.message 
    });
  }
});
// Delete notification
app.delete('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    // TODO: In production, delete from database
    // await pool.request()
    //   .input('notificationId', sql.NVarChar, notificationId)
    //   .query(`DELETE FROM Notifications WHERE Id = @notificationId`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification', 
      details: error.message 
    });
  }
});
// ============================================================================
// END NOTIFICATION SYSTEM
// ============================================================================
// ============================================================================
// PROCUREMENT WORKFLOW ENDPOINTS
// Wings request stock from Admin, Admin approves and delivers
// ============================================================================
// ============================================================================
// Wing User Endpoints - Create and View Procurement Requests
// ============================================================================
// Create new procurement request
app.post('/api/procurement/requests', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { wing_id, wing_name, items, priority, justification } = req.body;
    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Wing ID and items are required' });
    }
    console.log(`📝 Creating procurement request for wing ${wing_id} by user ${userId}`);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Get user details
      const userResult = await transaction.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT FullName FROM AspNetUsers WHERE Id = @userId');
      const userName = userResult.recordset[0]?.FullName || 'Unknown User';
      // Create procurement request
      const requestId = uuidv4();
      await transaction.request()
        .input('id', sql.UniqueIdentifier, requestId)
        .input('wing_id', sql.Int, wing_id)
        .input('wing_name', sql.NVarChar, wing_name)
        .input('requested_by_user_id', sql.NVarChar, userId)
        .input('requested_by_name', sql.NVarChar, userName)
        .input('status', sql.NVarChar, 'pending')
        .input('priority', sql.NVarChar, priority || 'normal')
        .input('justification', sql.NVarChar, justification)
        .query(`
          INSERT INTO procurement_requests 
          (id, wing_id, wing_name, requested_by_user_id, requested_by_name, status, priority, justification)
          VALUES (@id, @wing_id, @wing_name, @requested_by_user_id, @requested_by_name, @status, @priority, @justification)
        `);
      // Insert request items
      for (const item of items) {
        const itemId = uuidv4();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, itemId)
          .input('procurement_request_id', sql.UniqueIdentifier, requestId)
          .input('item_master_id', sql.Int, item.item_master_id)
          .input('item_nomenclature', sql.NVarChar, item.item_nomenclature)
          .input('item_code', sql.NVarChar, item.item_code)
          .input('category_name', sql.NVarChar, item.category_name)
          .input('subcategory_name', sql.NVarChar, item.subcategory_name)
          .input('requested_quantity', sql.Decimal(18, 2), item.requested_quantity)
          .input('unit_of_measurement', sql.NVarChar, item.unit_of_measurement)
          .input('estimated_unit_price', sql.Decimal(18, 2), item.estimated_unit_price || null)
          .input('notes', sql.NVarChar, item.notes || null)
          .query(`
            INSERT INTO procurement_request_items 
            (id, procurement_request_id, item_master_id, item_nomenclature, item_code, 
             category_name, subcategory_name, requested_quantity, unit_of_measurement, 
             estimated_unit_price, notes)
            VALUES (@id, @procurement_request_id, @item_master_id, @item_nomenclature, @item_code,
                    @category_name, @subcategory_name, @requested_quantity, @unit_of_measurement,
                    @estimated_unit_price, @notes)
          `);
      }
      await transaction.commit();
      // Get the created request with generated number
      const result = await pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT pr.*, 
                 (SELECT COUNT(*) FROM procurement_request_items WHERE procurement_request_id = pr.id) as item_count
          FROM procurement_requests pr
          WHERE pr.id = @requestId
        `);
      console.log(`✅ Procurement request created: ${result.recordset[0].request_number}`);
      res.json({ success: true, request: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating procurement request:', error);
    res.status(500).json({ error: 'Failed to create procurement request', details: error.message });
  }
});
// Get user's procurement requests
app.get('/api/procurement/requests/my-requests', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { status } = req.query;
    let statusFilter = '';
    if (status && status !== 'all') {
      statusFilter = 'AND pr.status = @status';
    }
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('status', sql.NVarChar, status)
      .query(`
        SELECT 
          pr.*,
          (SELECT COUNT(*) FROM procurement_request_items WHERE procurement_request_id = pr.id) as item_count,
          (SELECT SUM(requested_quantity) FROM procurement_request_items WHERE procurement_request_id = pr.id) as total_items
        FROM procurement_requests pr
        WHERE pr.requested_by_user_id = @userId
        ${statusFilter}
        ORDER BY pr.requested_at DESC
      `);
    res.json({ success: true, requests: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching user procurement requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});
// Get single procurement request details
app.get('/api/procurement/requests/:id', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    // Get request details
    const requestResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM procurement_requests WHERE id = @id');
    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    // Get request items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, id)
      .query(`
        SELECT pri.*,
               im.vItemNomenclature as item_full_name,
               im.vItemCode as item_full_code
        FROM procurement_request_items pri
        LEFT JOIN ItemMaster im ON pri.item_master_id = im.id
        WHERE pri.procurement_request_id = @requestId
        ORDER BY pri.created_at
      `);
    // Get deliveries if any
    const deliveriesResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, id)
      .query('SELECT * FROM procurement_deliveries WHERE procurement_request_id = @requestId ORDER BY created_at DESC');
    res.json({
      success: true,
      request: requestResult.recordset[0],
      items: itemsResult.recordset,
      deliveries: deliveriesResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching procurement request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details', details: error.message });
  }
});
// Cancel procurement request (only if pending)
app.put('/api/procurement/requests/:id/cancel', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    // Verify request belongs to user and is pending
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.NVarChar, userId)
      .query('SELECT status FROM procurement_requests WHERE id = @id AND requested_by_user_id = @userId');
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found or access denied' });
    }
    if (checkResult.recordset[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }
    // Update status to cancelled
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`UPDATE procurement_requests SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id`);
    console.log(`✅ Procurement request ${id} cancelled by user ${userId}`);
    res.json({ success: true, message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('❌ Error cancelling procurement request:', error);
    res.status(500).json({ error: 'Failed to cancel request', details: error.message });
  }
});
// ============================================================================
// Admin Endpoints - Review and Approve Procurement Requests
// ============================================================================
// Get all pending procurement requests (Admin)
app.get('/api/procurement/requests/pending', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // TODO: Add permission check for procurement.approve
    const result = await pool.request()
      .query(`
        SELECT 
          pr.*,
          (SELECT COUNT(*) FROM procurement_request_items WHERE procurement_request_id = pr.id) as item_count,
          (SELECT SUM(requested_quantity) FROM procurement_request_items WHERE procurement_request_id = pr.id) as total_items
        FROM procurement_requests pr
        WHERE pr.status = 'pending'
        ORDER BY 
          CASE pr.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            WHEN 'low' THEN 4 
          END,
          pr.requested_at
      `);
    res.json({ success: true, requests: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching pending procurement requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});
// Get all procurement requests with filters (Admin)
app.get('/api/procurement/requests', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { status, wing_id, priority, from_date, to_date } = req.query;
    let filters = [];
    const request = pool.request();
    if (status && status !== 'all') {
      filters.push('pr.status = @status');
      request.input('status', sql.NVarChar, status);
    }
    if (wing_id) {
      filters.push('pr.wing_id = @wing_id');
      request.input('wing_id', sql.Int, parseInt(wing_id));
    }
    if (priority && priority !== 'all') {
      filters.push('pr.priority = @priority');
      request.input('priority', sql.NVarChar, priority);
    }
    if (from_date) {
      filters.push('pr.requested_at >= @from_date');
      request.input('from_date', sql.DateTime2, from_date);
    }
    if (to_date) {
      filters.push('pr.requested_at <= @to_date');
      request.input('to_date', sql.DateTime2, to_date);
    }
    const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
    const result = await request.query(`
      SELECT 
        pr.*,
        (SELECT COUNT(*) FROM procurement_request_items WHERE procurement_request_id = pr.id) as item_count,
        (SELECT SUM(requested_quantity) FROM procurement_request_items WHERE procurement_request_id = pr.id) as total_items
      FROM procurement_requests pr
      ${whereClause}
      ORDER BY pr.requested_at DESC
    `);
    res.json({ success: true, requests: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching procurement requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});
// Approve procurement request (Admin)
app.put('/api/procurement/requests/:id/approve', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    const { approved_items, review_notes } = req.body;
    // Get user details
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT FullName FROM AspNetUsers WHERE Id = @userId');
    const userName = userResult.recordset[0]?.FullName || 'Unknown Admin';
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update approved quantities for each item
      let allFullyApproved = true;
      for (const item of approved_items) {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, item.id)
          .input('approved_quantity', sql.Decimal(18, 2), item.approved_quantity)
          .query(`
            UPDATE procurement_request_items 
            SET approved_quantity = @approved_quantity, updated_at = GETDATE()
            WHERE id = @id
          `);
        if (item.approved_quantity < item.requested_quantity) {
          allFullyApproved = false;
        }
      }
      // Update request status
      const newStatus = allFullyApproved ? 'approved' : 'partially_approved';
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar, newStatus)
        .input('reviewed_by_user_id', sql.NVarChar, userId)
        .input('reviewed_by_name', sql.NVarChar, userName)
        .input('review_notes', sql.NVarChar, review_notes || null)
        .query(`
          UPDATE procurement_requests 
          SET status = @status,
              reviewed_by_user_id = @reviewed_by_user_id,
              reviewed_by_name = @reviewed_by_name,
              reviewed_at = GETDATE(),
              review_notes = @review_notes,
              updated_at = GETDATE()
          WHERE id = @id
        `);
      await transaction.commit();
      console.log(`✅ Procurement request ${id} ${newStatus} by admin ${userId}`);
      res.json({ success: true, status: newStatus, message: 'Request approved successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error approving procurement request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});
// Reject procurement request (Admin)
app.put('/api/procurement/requests/:id/reject', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    const { review_notes } = req.body;
    if (!review_notes) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    // Get user details
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT FullName FROM AspNetUsers WHERE Id = @userId');
    const userName = userResult.recordset[0]?.FullName || 'Unknown Admin';
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('reviewed_by_user_id', sql.NVarChar, userId)
      .input('reviewed_by_name', sql.NVarChar, userName)
      .input('review_notes', sql.NVarChar, review_notes)
      .query(`
        UPDATE procurement_requests 
        SET status = 'rejected',
            reviewed_by_user_id = @reviewed_by_user_id,
            reviewed_by_name = @reviewed_by_name,
            reviewed_at = GETDATE(),
            review_notes = @review_notes,
            updated_at = GETDATE()
        WHERE id = @id
      `);
    console.log(`✅ Procurement request ${id} rejected by admin ${userId}`);
    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (error) {
    console.error('❌ Error rejecting procurement request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});
// ============================================================================
// Delivery Management Endpoints (Admin)
// ============================================================================
// Create delivery from approved request
app.post('/api/procurement/deliveries', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { 
      procurement_request_id, 
      delivery_items, 
      notes,
      vehicle_number,
      driver_name,
      driver_contact
    } = req.body;
    if (!procurement_request_id || !delivery_items || delivery_items.length === 0) {
      return res.status(400).json({ error: 'Request ID and delivery items are required' });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Get request details
      const requestResult = await transaction.request()
        .input('requestId', sql.UniqueIdentifier, procurement_request_id)
        .query('SELECT * FROM procurement_requests WHERE id = @requestId');
      if (requestResult.recordset.length === 0) {
        throw new Error('Procurement request not found');
      }
      const request = requestResult.recordset[0];
      // Get user details
      const userResult = await transaction.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT FullName FROM AspNetUsers WHERE Id = @userId');
      const userName = userResult.recordset[0]?.FullName || 'Unknown User';
      // Create delivery
      const deliveryId = uuidv4();
      await transaction.request()
        .input('id', sql.UniqueIdentifier, deliveryId)
        .input('procurement_request_id', sql.UniqueIdentifier, procurement_request_id)
        .input('wing_id', sql.Int, request.wing_id)
        .input('wing_name', sql.NVarChar, request.wing_name)
        .input('status', sql.NVarChar, 'prepared')
        .input('delivered_by_user_id', sql.NVarChar, userId)
        .input('delivered_by_name', sql.NVarChar, userName)
        .input('vehicle_number', sql.NVarChar, vehicle_number || null)
        .input('driver_name', sql.NVarChar, driver_name || null)
        .input('driver_contact', sql.NVarChar, driver_contact || null)
        .input('notes', sql.NVarChar, notes || null)
        .query(`
          INSERT INTO procurement_deliveries 
          (id, procurement_request_id, wing_id, wing_name, status, 
           delivered_by_user_id, delivered_by_name, vehicle_number, 
           driver_name, driver_contact, notes)
          VALUES (@id, @procurement_request_id, @wing_id, @wing_name, @status,
                  @delivered_by_user_id, @delivered_by_name, @vehicle_number,
                  @driver_name, @driver_contact, @notes)
        `);
      // Insert delivery items
      for (const item of delivery_items) {
        const deliveryItemId = uuidv4();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, deliveryItemId)
          .input('procurement_delivery_id', sql.UniqueIdentifier, deliveryId)
          .input('procurement_request_item_id', sql.UniqueIdentifier, item.procurement_request_item_id)
          .input('item_master_id', sql.Int, item.item_master_id)
          .input('item_nomenclature', sql.NVarChar, item.item_nomenclature)
          .input('delivered_quantity', sql.Decimal(18, 2), item.delivered_quantity)
          .input('unit_of_measurement', sql.NVarChar, item.unit_of_measurement)
          .input('batch_number', sql.NVarChar, item.batch_number || null)
          .input('expiry_date', sql.Date, item.expiry_date || null)
          .input('notes', sql.NVarChar, item.notes || null)
          .query(`
            INSERT INTO procurement_delivery_items 
            (id, procurement_delivery_id, procurement_request_item_id, item_master_id, 
             item_nomenclature, delivered_quantity, unit_of_measurement, batch_number, 
             expiry_date, notes)
            VALUES (@id, @procurement_delivery_id, @procurement_request_item_id, @item_master_id,
                    @item_nomenclature, @delivered_quantity, @unit_of_measurement, @batch_number,
                    @expiry_date, @notes)
          `);
        // Update delivered quantity in request item
        await transaction.request()
          .input('id', sql.UniqueIdentifier, item.procurement_request_item_id)
          .input('quantity', sql.Decimal(18, 2), item.delivered_quantity)
          .query(`
            UPDATE procurement_request_items 
            SET delivered_quantity = ISNULL(delivered_quantity, 0) + @quantity,
                updated_at = GETDATE()
            WHERE id = @id
          `);
      }
      // Update request status to allocated
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, procurement_request_id)
        .query(`
          UPDATE procurement_requests 
          SET status = 'allocated', 
              allocated_at = GETDATE(),
              updated_at = GETDATE()
          WHERE id = @requestId
        `);
      await transaction.commit();
      // Get created delivery
      const deliveryResult = await pool.request()
        .input('deliveryId', sql.UniqueIdentifier, deliveryId)
        .query('SELECT * FROM procurement_deliveries WHERE id = @deliveryId');
      console.log(`✅ Delivery created: ${deliveryResult.recordset[0].delivery_number}`);
      res.json({ success: true, delivery: deliveryResult.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating delivery:', error);
    res.status(500).json({ error: 'Failed to create delivery', details: error.message });
  }
});
// Mark delivery as in-transit
app.put('/api/procurement/deliveries/:id/dispatch', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE procurement_deliveries 
        SET status = 'in_transit',
            delivery_date = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @id
      `);
    // Update request status
    await pool.request()
      .input('deliveryId', sql.UniqueIdentifier, id)
      .query(`
        UPDATE procurement_requests
        SET status = 'in_transit', updated_at = GETDATE()
        WHERE id = (SELECT procurement_request_id FROM procurement_deliveries WHERE id = @deliveryId)
      `);
    console.log(`✅ Delivery ${id} dispatched`);
    res.json({ success: true, message: 'Delivery dispatched successfully' });
  } catch (error) {
    console.error('❌ Error dispatching delivery:', error);
    res.status(500).json({ error: 'Failed to dispatch delivery', details: error.message });
  }
});
// ============================================================================
// Wing Supervisor Endpoints - Receive Deliveries
// ============================================================================
// Confirm delivery receipt
app.put('/api/procurement/deliveries/:id/receive', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    const { received_items, notes } = req.body;
    if (!received_items || received_items.length === 0) {
      return res.status(400).json({ error: 'Received items are required' });
    }
    // Get user details
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT FullName FROM AspNetUsers WHERE Id = @userId');
    const userName = userResult.recordset[0]?.FullName || 'Unknown User';
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Update delivery items with received quantities
      for (const item of received_items) {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, item.id)
          .input('received_quantity', sql.Decimal(18, 2), item.received_quantity)
          .input('condition_on_receipt', sql.NVarChar, item.condition_on_receipt || 'good')
          .input('discrepancy_notes', sql.NVarChar, item.discrepancy_notes || null)
          .query(`
            UPDATE procurement_delivery_items 
            SET received_quantity = @received_quantity,
                condition_on_receipt = @condition_on_receipt,
                discrepancy_notes = @discrepancy_notes,
                updated_at = GETDATE()
            WHERE id = @id
          `);
        // Add to wing inventory stock
        const itemDetailsResult = await transaction.request()
          .input('itemId', sql.UniqueIdentifier, item.id)
          .query(`
            SELECT pdi.*, pd.wing_id 
            FROM procurement_delivery_items pdi
            JOIN procurement_deliveries pd ON pdi.procurement_delivery_id = pd.id
            WHERE pdi.id = @itemId
          `);
        const itemDetails = itemDetailsResult.recordset[0];
        // Check if item already exists in wing inventory
        const existingStockResult = await transaction.request()
          .input('itemMasterId', sql.Int, itemDetails.item_master_id)
          .input('wingId', sql.Int, itemDetails.wing_id)
          .query(`
            SELECT id, quantity_on_hand 
            FROM inventory_stock 
            WHERE item_master_id = @itemMasterId AND wing_id = @wingId
          `);
        if (existingStockResult.recordset.length > 0) {
          // Update existing stock
          await transaction.request()
            .input('id', sql.UniqueIdentifier, existingStockResult.recordset[0].id)
            .input('quantity', sql.Decimal(18, 2), item.received_quantity)
            .input('userId', sql.NVarChar, userId)
            .query(`
              UPDATE inventory_stock 
              SET quantity_on_hand = quantity_on_hand + @quantity,
                  last_updated = GETDATE(),
                  updated_by_user_id = @userId
              WHERE id = @id
            `);
        } else {
          // Create new stock entry
          await transaction.request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('itemMasterId', sql.Int, itemDetails.item_master_id)
            .input('wingId', sql.Int, itemDetails.wing_id)
            .input('quantity', sql.Decimal(18, 2), item.received_quantity)
            .input('userId', sql.NVarChar, userId)
            .query(`
              INSERT INTO inventory_stock 
              (id, item_master_id, wing_id, quantity_on_hand, last_updated, updated_by_user_id)
              VALUES (@id, @itemMasterId, @wingId, @quantity, GETDATE(), @userId)
            `);
        }
      }
      // Update delivery status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('received_by_user_id', sql.NVarChar, userId)
        .input('received_by_name', sql.NVarChar, userName)
        .input('notes', sql.NVarChar, notes || null)
        .query(`
          UPDATE procurement_deliveries 
          SET status = 'delivered',
              received_by_user_id = @received_by_user_id,
              received_by_name = @received_by_name,
              received_at = GETDATE(),
              notes = ISNULL(notes, '') + CHAR(13) + CHAR(10) + 'Receipt: ' + ISNULL(@notes, ''),
              updated_at = GETDATE()
          WHERE id = @id
        `);
      // Update request status to delivered
      await transaction.request()
        .input('deliveryId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE procurement_requests
          SET status = 'delivered',
              delivered_at = GETDATE(),
              updated_at = GETDATE()
          WHERE id = (SELECT procurement_request_id FROM procurement_deliveries WHERE id = @deliveryId)
        `);
      await transaction.commit();
      console.log(`✅ Delivery ${id} received and stock updated for wing`);
      res.json({ success: true, message: 'Delivery received successfully and inventory updated' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error receiving delivery:', error);
    res.status(500).json({ error: 'Failed to receive delivery', details: error.message });
  }
});
// Get wing's deliveries
app.get('/api/procurement/deliveries/wing/:wingId', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { wingId } = req.params;
    const { status } = req.query;
    let statusFilter = '';
    if (status && status !== 'all') {
      statusFilter = 'AND pd.status = @status';
    }
    const result = await pool.request()
      .input('wingId', sql.Int, parseInt(wingId))
      .input('status', sql.NVarChar, status)
      .query(`
        SELECT 
          pd.*,
          pr.request_number,
          pr.priority,
          (SELECT COUNT(*) FROM procurement_delivery_items WHERE procurement_delivery_id = pd.id) as item_count
        FROM procurement_deliveries pd
        JOIN procurement_requests pr ON pd.procurement_request_id = pr.id
        WHERE pd.wing_id = @wingId
        ${statusFilter}
        ORDER BY pd.created_at DESC
      `);
    res.json({ success: true, deliveries: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching wing deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});
// Get all deliveries (Admin)
app.get('/api/procurement/deliveries', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { status, wing_id } = req.query;
    let filters = [];
    const request = pool.request();
    if (status && status !== 'all') {
      filters.push('pd.status = @status');
      request.input('status', sql.NVarChar, status);
    }
    if (wing_id) {
      filters.push('pd.wing_id = @wing_id');
      request.input('wing_id', sql.Int, parseInt(wing_id));
    }
    const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
    const result = await request.query(`
      SELECT 
        pd.*,
        pr.request_number,
        pr.priority,
        pr.requested_by_name,
        (SELECT COUNT(*) FROM procurement_delivery_items WHERE procurement_delivery_id = pd.id) as item_count
      FROM procurement_deliveries pd
      JOIN procurement_requests pr ON pd.procurement_request_id = pr.id
      ${whereClause}
      ORDER BY pd.created_at DESC
    `);
    res.json({ success: true, deliveries: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});
// Get delivery details
app.get('/api/procurement/deliveries/:id', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { id } = req.params;
    // Get delivery details
    const deliveryResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT pd.*, pr.request_number, pr.priority, pr.requested_by_name
        FROM procurement_deliveries pd
        JOIN procurement_requests pr ON pd.procurement_request_id = pr.id
        WHERE pd.id = @id
      `);
    if (deliveryResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    // Get delivery items
    const itemsResult = await pool.request()
      .input('deliveryId', sql.UniqueIdentifier, id)
      .query(`
        SELECT pdi.*,
               pri.requested_quantity,
               pri.approved_quantity,
               im.vItemNomenclature as item_full_name,
               im.vItemCode as item_full_code
        FROM procurement_delivery_items pdi
        JOIN procurement_request_items pri ON pdi.procurement_request_item_id = pri.id
        LEFT JOIN ItemMaster im ON pdi.item_master_id = im.id
        WHERE pdi.procurement_delivery_id = @deliveryId
        ORDER BY pdi.created_at
      `);
    res.json({
      success: true,
      delivery: deliveryResult.recordset[0],
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching delivery details:', error);
    res.status(500).json({ error: 'Failed to fetch delivery details', details: error.message });
  }
});
// ============================================================================
// END PROCUREMENT WORKFLOW ENDPOINTS
// ============================================================================
// Graceful shutdown
// =============================================================================
// NEW STOCK ACQUISITION DASHBOARD ENDPOINTS
// =============================================================================
// Get acquisition dashboard overview stats
app.get('/api/acquisition/dashboard-stats', async (req, res) => {
  try {
    console.log('📊 GET /api/acquisition/dashboard-stats - Fetching acquisition stats');
    if (!pool) {
      console.error('❌ Database connection not available');
      return res.status(500).json({ error: 'Database connection not available' });
    }
    // Get comprehensive acquisition statistics
    const statsQuery = `
      WITH TenderStats AS (
        SELECT 
          COUNT(*) as totalTenders,
          COUNT(CASE WHEN is_finalized = 0 THEN 1 END) as activeTenders,
          COUNT(CASE WHEN is_finalized = 1 THEN 1 END) as completedTenders,
          SUM(CASE WHEN estimated_value IS NOT NULL THEN estimated_value ELSE 0 END) as totalValue,
          COUNT(CASE WHEN created_at >= DATEADD(month, -1, GETDATE()) THEN 1 END) as monthlyAcquisitions
        FROM tenders
      ),
      DeliveryStats AS (
        SELECT 
          COUNT(DISTINCT d.id) as pendingDeliveries,
          COUNT(DISTINCT di.item_master_id) as totalItems,
          SUM(di.delivery_qty) as totalQuantity
        FROM deliveries d
        INNER JOIN delivery_items di ON d.id = di.delivery_id
        WHERE d.is_finalized = 0 OR d.is_finalized IS NULL
      )
      SELECT 
        ts.*,
        COALESCE(ds.pendingDeliveries, 0) as pendingDeliveries,
        COALESCE(ds.totalItems, 0) as totalItems,
        COALESCE(ds.totalQuantity, 0) as totalQuantity
      FROM TenderStats ts
      CROSS JOIN DeliveryStats ds
    `;
    const result = await pool.request().query(statsQuery);
    console.log('✅ Query executed, rows returned:', result.recordset.length);
    if (result.recordset.length > 0) {
      console.log('📈 Stats data:', result.recordset[0]);
      res.json(result.recordset[0]);
    } else {
      console.log('⚠️ No data found, returning zeros');
      res.json({
        totalTenders: 0,
        activeTenders: 0,
        completedTenders: 0,
        pendingDeliveries: 0,
        totalValue: 0,
        totalItems: 0,
        totalQuantity: 0,
        monthlyAcquisitions: 0
      });
    }
  } catch (error) {
    console.error('Error fetching acquisition dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch acquisition dashboard stats' });
  }
});
// Get active tenders for acquisition dashboard
app.get('/api/acquisition/active-tenders', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const tendersQuery = `
      SELECT 
        t.id,
        t.title,
        t.reference_number as tenderNumber,
        t.tender_spot_type as acquisitionType,
        t.status,
        t.is_finalized as isFinalized,
        t.created_at as createdAt,
        COALESCE(t.estimated_total_cost, 0) as totalValue,
        COALESCE(itemStats.itemCount, 0) as itemCount,
        CASE WHEN deliveryStats.deliveryCount > 0 THEN 1 ELSE 0 END as hasDeliveries
      FROM tenders t
      LEFT JOIN (
        SELECT 
          tender_id,
          COUNT(*) as itemCount
        FROM tender_items
        GROUP BY tender_id
      ) itemStats ON t.id = itemStats.tender_id
      LEFT JOIN (
        SELECT 
          tender_id,
          COUNT(*) as deliveryCount
        FROM deliveries
        GROUP BY tender_id
      ) deliveryStats ON t.id = deliveryStats.tender_id
      WHERE t.is_finalized = 0 OR t.is_finalized IS NULL
      ORDER BY t.updated_at DESC
    `;
    const result = await pool.request().query(tendersQuery);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching active tenders:', error);
    res.status(500).json({ error: 'Failed to fetch active tenders' });
  }
});
// Get recent deliveries for acquisition dashboard
app.get('/api/acquisition/recent-deliveries', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const deliveriesQuery = `
      SELECT TOP 10
        di.id,
        t.title as tenderTitle,
        im.nomenclature as itemName,
        di.quantity_delivered as quantityReceived,
        d.delivery_date as deliveryDate,
        CASE WHEN d.finalized = 1 THEN 'Delivered' ELSE 'Pending' END as status
      FROM delivery_items di
      INNER JOIN deliveries d ON di.delivery_id = d.id
      INNER JOIN tenders t ON d.tender_id = t.id
      INNER JOIN item_masters im ON di.item_master_id = im.id
      ORDER BY d.delivery_date DESC, d.created_at DESC
    `;
    const result = await pool.request().query(deliveriesQuery);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching recent deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch recent deliveries' });
  }
});
// =====================================================
// ENHANCED STOCK ACQUISITION API ENDPOINTS
// =====================================================
// GET /api/stock-acquisition/dashboard-stats - Get stock acquisition dashboard statistics
// DUPLICATE ROUTE REMOVED - Using the updated version at line ~6940
// app.get('/api/stock-acquisition/dashboard-stats', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         COUNT(DISTINCT tender_id) as total_tenders,
//         COUNT(*) as total_items,
//         SUM(CASE WHEN pricing_confirmed = 1 THEN 1 ELSE 0 END) as confirmed_pricing_items,
//         SUM(CASE WHEN pricing_confirmed = 0 OR pricing_confirmed IS NULL THEN 1 ELSE 0 END) as pending_pricing_items,
//         SUM(estimated_unit_price) as total_estimated_value,
//         SUM(actual_unit_price) as total_actual_value,
//         CASE 
//           WHEN SUM(estimated_unit_price) > 0 
//           THEN ((SUM(actual_unit_price) - SUM(estimated_unit_price)) / SUM(estimated_unit_price)) * 100
//           ELSE 0 
//         END as average_price_variance
//       FROM stock_transactions_clean 
//       WHERE (is_deleted = 0 OR is_deleted IS NULL)
//     `;
//
//     const result = await pool.request().query(query);
//     res.json(result.recordset[0] || {
//       total_tenders: 0,
//       total_items: 0,
//       confirmed_pricing_items: 0,
//       pending_pricing_items: 0,
//       total_estimated_value: 0,
//       total_actual_value: 0,
//       average_price_variance: 0
//     });
//   } catch (error) {
//     console.error('Failed to fetch stock acquisition stats:', error);
//     res.status(500).json({ error: 'Failed to fetch dashboard statistics', details: error.message });
//   }
// });
// GET /api/stock-acquisition/tender-summaries - Get tender summaries from stock transactions
// DUPLICATE ROUTE REMOVED - Using the updated version at line ~6994
// app.get('/api/stock-acquisition/tender-summaries', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         stc.tender_id,
//         t.title as tender_title,
//         t.reference_number as tender_number,
//         COUNT(*) as total_items,
//         SUM(CASE WHEN stc.pricing_confirmed = 1 THEN 1 ELSE 0 END) as confirmed_items,
//         SUM(CASE WHEN stc.pricing_confirmed = 0 OR stc.pricing_confirmed IS NULL THEN 1 ELSE 0 END) as pending_items,
//         SUM(stc.estimated_unit_price) as total_estimated_value,
//         SUM(stc.actual_unit_price) as total_actual_value,
//         CASE 
//           WHEN COUNT(*) > 0 
//           THEN (CAST(SUM(CASE WHEN stc.pricing_confirmed = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100
//           ELSE 0 
//         END as pricing_completion_rate,
//         CASE WHEN d.tender_id IS NOT NULL THEN 1 ELSE 0 END as has_deliveries,
//         MIN(stc.created_at) as created_at
//       FROM stock_transactions_clean stc
//       LEFT JOIN tenders t ON stc.tender_id = t.id
//       LEFT JOIN (SELECT DISTINCT tender_id FROM deliveries) d ON stc.tender_id = d.tender_id
//       WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
//       GROUP BY stc.tender_id, t.title, t.reference_number, d.tender_id
//       ORDER BY MIN(stc.created_at) DESC
//     `;
//
//     const result = await pool.request().query(query);
//     res.json(result.recordset);
//   } catch (error) {
//     console.error('Failed to fetch tender summaries:', error);
//     res.status(500).json({ error: 'Failed to fetch tender summaries', details: error.message });
//   }
// });
// GET /api/stock-acquisition/items/:tenderId - Get stock transaction items for a specific tender
app.get('/api/stock-acquisition/items/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const query = `
      SELECT 
        stc.*,
        im.nomenclature as item_name
      FROM stock_transactions_clean stc
      LEFT JOIN item_masters im ON stc.item_master_id = im.id
      WHERE stc.tender_id = @tender_id 
      AND (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
      ORDER BY stc.created_at ASC
    `;
    const result = await pool.request()
      .input('tender_id', sql.NVarChar, tenderId)
      .query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Failed to fetch tender items:', error);
    res.status(500).json({ error: 'Failed to fetch tender items', details: error.message });
  }
});
// PUT /api/stock-acquisition/update-price/:itemId - Update actual price for a stock transaction item
app.put('/api/stock-acquisition/update-price/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { actual_unit_price, pricing_confirmed } = req.body;
    const query = `
      UPDATE stock_transactions_clean 
      SET 
        actual_unit_price = @actual_unit_price,
        pricing_confirmed = @pricing_confirmed,
        updated_at = GETDATE()
      WHERE id = @item_id
      AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const result = await pool.request()
      .input('item_id', sql.NVarChar, itemId)
      .input('actual_unit_price', sql.Decimal(15, 2), actual_unit_price)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Stock transaction item not found' });
    }
    res.json({ 
      success: true, 
      message: 'Price updated successfully',
      updated_price: actual_unit_price,
      pricing_confirmed 
    });
  } catch (error) {
    console.error('Failed to update price:', error);
    res.status(500).json({ error: 'Failed to update price', details: error.message });
  }
});
// GET /api/stock-acquisition/price-history/:itemId - Get price change history for an item
app.get('/api/stock-acquisition/price-history/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    // This would require an audit table for price changes
    // For now, return the current item data
    const query = `
      SELECT 
        stc.*,
        im.nomenclature as item_name,
        t.title as tender_title
      FROM stock_transactions_clean stc
      LEFT JOIN item_masters im ON stc.item_master_id = im.id
      LEFT JOIN tenders t ON stc.tender_id = t.id
      WHERE stc.id = @item_id
      AND (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
    `;
    const result = await pool.request()
      .input('item_id', sql.NVarChar, itemId)
      .query(query);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history', details: error.message });
  }
});
// ==============================================
// APPROVAL FORWARDING SYSTEM ENDPOINTS
// ==============================================
// Get all approval workflows
app.get('/api/approval-workflows', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT id, workflow_name, request_type, office_id, description, is_active, created_date
      FROM approval_workflows 
      WHERE is_active = 1
      ORDER BY workflow_name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching approval workflows:', error);
    res.status(500).json({ error: 'Failed to fetch approval workflows', details: error.message });
  }
});
// Create new approval workflow
app.post('/api/approval-workflows', async (req, res) => {
  try {
    const { workflow_name, request_type, office_id, description } = req.body;
    const request = pool.request();
    const result = await request
      .input('workflow_name', sql.NVarChar, workflow_name)
      .input('request_type', sql.NVarChar, request_type)
      .input('office_id', sql.UniqueIdentifier, office_id)
      .input('description', sql.NVarChar, description)
      .query(`
        INSERT INTO approval_workflows (workflow_name, request_type, office_id, description, is_active)
        OUTPUT INSERTED.*
        VALUES (@workflow_name, @request_type, @office_id, @description, 1)
      `);
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error creating approval workflow:', error);
    res.status(500).json({ error: 'Failed to create approval workflow', details: error.message });
  }
});
// Get workflow approvers
app.get('/api/approval-workflows/:workflowId/approvers', async (req, res) => {
  try {
    const { workflowId } = req.params;
    console.log('🔍 Backend: Fetching approvers for workflow:', workflowId);
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID format' });
    }
    const request = pool.request();
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId.toLowerCase())
      .query(`
        SELECT 
          wa.id,
          wa.workflow_id,
          wa.user_id,
          u.FullName as user_name,
          u.Role as user_role,
          u.intDesignationID as user_designation,
          wa.can_approve,
          wa.can_forward,
          wa.can_finalize,
          wa.approver_role,
          wa.added_date
        FROM workflow_approvers wa
        JOIN AspNetUsers u ON wa.user_id = u.Id
        WHERE wa.workflow_id = @workflowId
        ORDER BY wa.added_date
      `);
    console.log('📋 Backend: Found approvers:', result.recordset.length, 'records');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Backend: Error fetching workflow approvers:', error);
    res.status(500).json({ error: 'Failed to fetch workflow approvers', details: error.message });
  }
});
// Add workflow approver
app.post('/api/approval-workflows/:workflowId/approvers', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { user_id, can_approve, can_forward, can_finalize, approver_role } = req.body;
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID format' });
    }
    console.log('🔄 Backend: Adding approver to workflow:', {
      workflowId,
      user_id,
      can_approve,
      can_forward,
      can_finalize,
      approver_role
    });
    const request = pool.request();
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId.toLowerCase())
      .input('user_id', sql.NVarChar, user_id)
      .input('can_approve', sql.Bit, can_approve)
      .input('can_forward', sql.Bit, can_forward)
      .input('can_finalize', sql.Bit, can_finalize)
      .input('approver_role', sql.NVarChar, approver_role)
      .query(`
        INSERT INTO workflow_approvers (workflow_id, user_id, can_approve, can_forward, can_finalize, approver_role)
        OUTPUT INSERTED.*
        VALUES (@workflowId, @user_id, @can_approve, @can_forward, @can_finalize, @approver_role)
      `);
    console.log('✅ Backend: Approver added successfully:', result.recordset[0]);
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Backend: Error adding workflow approver:', error);
    res.status(500).json({ error: 'Failed to add workflow approver', details: error.message });
  }
});
// Delete workflow approver
app.delete('/api/approval-workflows/:workflowId/approvers/:approverId', async (req, res) => {
  try {
    const { workflowId, approverId } = req.params;
    // Validate GUID formats
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(workflowId) || !guidRegex.test(approverId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    console.log('🗑️ Backend: Deleting approver:', { workflowId, approverId });
    const request = pool.request();
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId.toLowerCase())
      .input('approverId', sql.UniqueIdentifier, approverId.toLowerCase())
      .query(`
        DELETE FROM workflow_approvers 
        WHERE workflow_id = @workflowId AND id = @approverId
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Approver not found' });
    }
    console.log('✅ Backend: Approver deleted successfully');
    res.json({ success: true, message: 'Approver deleted successfully' });
  } catch (error) {
    console.error('❌ Backend: Error deleting workflow approver:', error);
    res.status(500).json({ error: 'Failed to delete workflow approver', details: error.message });
  }
});
// Get active AspNetUsers for approver selection
app.get('/api/aspnet-users/active', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT Id, FullName, Role, intDesignationID, DesignationID, DesignationName, 
             OfficeID AS intOfficeID, WinfID AS intWingID, intBranchID, DEC_ID, 
             CNIC, Email, PhoneNumber, ISACT
      FROM vw_AspNetUser_with_Reg_App_DEC_ID
      WHERE ISACT = 1
      ORDER BY FullName
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching active AspNetUsers:', error);
    res.status(500).json({ error: 'Failed to fetch active users', details: error.message });
  }
});
// Get filtered users by office, wing, and branch from view
app.get('/api/aspnet-users/filtered', async (req, res) => {
  try {
    const { officeId, wingId, branchId } = req.query;
    if (!officeId || !wingId) {
      return res.status(400).json({ error: 'officeId and wingId are required' });
    }
    const request = pool.request();
    let query = `
      SELECT 
        UserID as Id,
        EmployeeName as FullName,
        CNIC,
        DesignationID,
        DesignationName,
        OfficeID as intOfficeID,
        WingID as intWingID,
        DECID as intBranchID
      FROM vw_Full_hirarcy_Office_to_Employee
      WHERE OfficeID = @officeId 
        AND WingID = @wingId
    `;
    request.input('officeId', sql.Int, parseInt(officeId));
    request.input('wingId', sql.Int, parseInt(wingId));
    // Add branch filter if provided
    if (branchId && branchId !== 'ALL_BRANCHES') {
      query += ' AND DECID = @branchId';
      request.input('branchId', sql.Int, parseInt(branchId));
    }
    query += ' ORDER BY EmployeeName';
    const result = await request.query(query);
    console.log(`✅ Filtered users: Office=${officeId}, Wing=${wingId}, Branch=${branchId || 'ALL'} - Found ${result.recordset.length} users`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching filtered AspNetUsers:', error);
    res.status(500).json({ error: 'Failed to fetch filtered users', details: error.message });
  }
});
// Submit request for approval
app.post('/api/approvals/submit', async (req, res) => {
  try {
    const { request_id, request_type, workflow_id } = req.body;
    const userId = req.session?.userId;
    if (!userId) {
      console.log('⚠️ Submit: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to submit requests.'
      });
    }
    console.log('🔄 Backend: Submitting approval request:', { request_id, request_type, workflow_id, userId });
    const request = pool.request();
    // Get first approver from workflow
    const workflowResult = await request
      .input('workflow_id', sql.UniqueIdentifier, workflow_id)
      .query(`
        SELECT TOP 1 user_id 
        FROM workflow_approvers 
        WHERE workflow_id = @workflow_id AND can_approve = 1
        ORDER BY added_date
      `);
    if (workflowResult.recordset.length === 0) {
      console.error('❌ No approvers found for workflow:', workflow_id);
      return res.status(400).json({ error: 'No approvers found for this workflow' });
    }
    const firstApproverId = workflowResult.recordset[0].user_id;
    console.log('👤 First approver assigned:', firstApproverId);
    // Create approval record with proper data types
    const approvalResult = await request
      .input('request_id', sql.UniqueIdentifier, request_id)
      .input('request_type', sql.NVarChar, request_type)
      .input('workflow_id', sql.UniqueIdentifier, workflow_id)
      .input('current_approver_id', sql.NVarChar, firstApproverId)
      .input('current_status', sql.NVarChar, 'pending')
      .input('submitted_by', sql.NVarChar, userId)
      .query(`
        INSERT INTO request_approvals (request_id, request_type, workflow_id, current_approver_id, current_status, submitted_by)
        OUTPUT INSERTED.*
        VALUES (@request_id, @request_type, @workflow_id, @current_approver_id, @current_status, @submitted_by)
      `);
    const approvalId = approvalResult.recordset[0].id;
    console.log('✅ Approval record created with ID:', approvalId);
    // Populate approval_items table if this is a stock issuance request
    if (request_type === 'stock_issuance') {
      try {
        const itemsResult = await request
          .input('requestId', sql.UniqueIdentifier, request_id)
          .query(`
            SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity
            FROM stock_issuance_items
            WHERE request_id = @requestId
          `);
        if (itemsResult.recordset.length > 0) {
          for (const item of itemsResult.recordset) {
            await pool.request()
              .input('approvalId', sql.UniqueIdentifier, approvalId)
              .input('itemId', sql.UniqueIdentifier, item.id)
              .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id)
              .input('nomenclature', sql.NVarChar, item.nomenclature)
              .input('customItemName', sql.NVarChar, item.custom_item_name)
              .input('requestedQuantity', sql.Int, item.requested_quantity)
              .query(`
                INSERT INTO approval_items (
                  request_approval_id, id, item_master_id, nomenclature,
                  custom_item_name, requested_quantity, decision_type
                )
                VALUES (
                  @approvalId, @itemId, @itemMasterId, @nomenclature,
                  @customItemName, @requestedQuantity, 'PENDING'
                )
              `);
          }
          console.log('✅ Populated approval_items table with', itemsResult.recordset.length, 'items');
        }
      } catch (itemsError) {
        console.error('❌ Failed to populate approval_items:', itemsError);
      }
    }
    // Create history entry
    await request
      .input('approval_id', sql.UniqueIdentifier, approvalId)
      .input('action_by', sql.NVarChar, userId)
      .query(`
        INSERT INTO approval_history (request_approval_id, action_type, action_by, step_number, is_current_step)
        VALUES (@approval_id, 'submitted', @action_by, 1, 1)
      `);
    res.json({ success: true, data: approvalResult.recordset[0] });
  } catch (error) {
    console.error('Error submitting for approval:', error);
    res.status(500).json({ error: 'Failed to submit for approval', details: error.message });
  }
});
// Get my pending approvals
app.get('/api/approvals/my-pending', async (req, res) => {
  try {
    // Get userId from session - must be authenticated
    const userId = req.session?.userId;
    if (!userId) {
      console.log('⚠️ My Pending: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to view your approvals.'
      });
    }
    console.log('🔍 Backend: Fetching pending approvals for user:', userId);
    const request = pool.request();
    const result = await request
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.current_status,
          ra.submitted_date,
          submitter.FullName as submitted_by_name,
          wf.workflow_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        WHERE ra.current_approver_id = @userId 
        AND ra.current_status = 'pending'
        ORDER BY ra.submitted_date DESC
      `);
    console.log('📋 Backend: Found', result.recordset.length, 'pending approvals for user:', userId);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Backend: Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});
// Get approvals for all users in a specific wing
app.get('/api/approvals/wing-approvals', async (req, res) => {
  try {
    // Get wingId and status from query parameters
    const wingId = req.query.wingId;
    const status = req.query.status || 'pending'; // default to pending
    if (!wingId) {
      return res.status(400).json({ error: 'wingId is required' });
    }
    console.log('🔍 Backend: Fetching', status, 'approvals for wing:', wingId);
    // Build query to get approvals where current approver is in the specified wing
    let query = `
      SELECT DISTINCT
        ra.id,
        ra.request_id,
        ra.request_type,
        ra.current_status,
        ra.submitted_date,
        ra.current_approver_id,
        submitter.FullName as submitted_by_name,
        wf.workflow_name,
        approver.FullName as current_approver_name,
        d.designation_name as current_approver_designation
      FROM request_approvals ra
      LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
      LEFT JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id
      LEFT JOIN tblUserDesignations d ON approver.intDesignationID = d.intDesignationID
      LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
      LEFT JOIN approval_history ah ON ah.request_approval_id = ra.id
      WHERE approver.intWingID = @wingId
    `;
    // Add WHERE clause based on status
    if (status === 'pending') {
      // Pending: Only show requests where current approver is in the wing and status is pending
      query += ` AND ra.current_status = 'pending'`;
    } else if (status === 'forwarded') {
      // Forwarded: Show requests where someone in the wing has forwarded them
      query += ` AND EXISTS (
        SELECT 1 FROM approval_history ah3
        INNER JOIN AspNetUsers u3 ON ah3.action_by = u3.Id
        WHERE ah3.request_approval_id = ra.id
        AND u3.intWingID = @wingId
        AND ah3.action_type = 'forwarded'
      )`;
    } else {
      // Approved/Rejected: Show requests where someone in the wing is related (submitted OR acted)
      query += ` AND ra.current_status = @status AND ra.id IN (
        SELECT DISTINCT ra2.id
        FROM request_approvals ra2
        LEFT JOIN approval_history ah2 ON ah2.request_approval_id = ra2.id
        LEFT JOIN AspNetUsers u_submitter ON ra2.submitted_by = u_submitter.Id
        LEFT JOIN AspNetUsers u_actor ON ah2.action_by = u_actor.Id
        WHERE u_submitter.intWingID = @wingId OR u_actor.intWingID = @wingId
      )`;
    }
    query += ` ORDER BY ra.submitted_date DESC`;
    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .input('status', sql.NVarChar, status)
      .query(query);
    console.log('📋 Backend: Found', result.recordset.length, status, 'approvals for wing:', wingId);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Backend: Error fetching wing approvals:', error);
    res.status(500).json({ error: 'Failed to fetch wing approvals', details: error.message });
  }
});
// Get stock issuance items for approval
app.get('/api/approval-items/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    console.log('📋 Backend: Fetching items for approval:', approvalId);
    const request = pool.request();
    // Get the request ID from the approval ID first
    const approvalResult = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`SELECT request_id FROM request_approvals WHERE id = @approvalId`);
    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    const requestId = approvalResult.recordset[0].request_id;
    // Get items with proper custom item handling
    const result = await pool.request()
      .input('requestId', sql.NVarChar, requestId)
      .query(`
        SELECT 
          si_items.id as item_id,
          CAST(si_items.item_master_id AS NVARCHAR(450)) as item_master_id,
          CASE 
            WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
            ELSE ISNULL(im.nomenclature, 'Unknown Item')
          END as nomenclature,
          si_items.requested_quantity as requested_quantity,
          NULL as approved_quantity,
          0 as issued_quantity,
          'pending' as item_status,
          CASE 
            WHEN si_items.item_type = 'custom' THEN 'CUSTOM'
            ELSE ISNULL(im.item_code, '')
          END as item_code,
          CASE 
            WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
            ELSE ISNULL(im.specifications, 'No specifications')
          END as item_description,
          CASE 
            WHEN si_items.item_type = 'custom' THEN 'pcs'
            ELSE ISNULL(im.unit, 'pcs')
          END as unit,
          sir.purpose as request_purpose,
          sir.expected_return_date,
          sir.is_returnable
        FROM stock_issuance_items si_items
        LEFT JOIN item_masters im ON im.id = si_items.item_master_id 
          AND si_items.item_type != 'custom'
        INNER JOIN stock_issuance_requests sir ON sir.id = si_items.request_id
        WHERE si_items.request_id = @requestId
        ORDER BY 
          CASE 
            WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
            ELSE ISNULL(im.nomenclature, 'Unknown Item')
          END
      `);
    console.log('📋 Backend: Found', result.recordset.length, 'items for approval');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Backend: Error fetching approval items:', error);
    res.status(500).json({ error: 'Failed to fetch approval items', details: error.message });
  }
});
// Test endpoint for approval items
app.get('/api/test-items/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    console.log('🧪 Test: Fetching items for approval:', approvalId);
    // Direct SQL query without using pool.request() to avoid conflicts
    const result = await pool.request()
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        SELECT 
          item_id,
          nomenclature,
          requested_quantity,
          item_status
        FROM vw_approval_requests_with_items 
        WHERE approval_id = @approvalId
        AND item_id IS NOT NULL
        ORDER BY nomenclature
      `);
    console.log('🧪 Test: Found', result.recordset.length, 'items');
    res.json({ 
      success: true, 
      data: result.recordset,
      approvalId: approvalId 
    });
  } catch (error) {
    console.error('🧪 Test: Error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});
// Get returned requests for the current user (requester view)
app.get('/api/approvals/my-returned-requests', async (req, res) => {
  console.log('📋 Returned Requests: Endpoint called');
  console.log('📋 Returned Requests: req.session:', req.session ? 'exists' : 'null');
  console.log('📋 Returned Requests: req.session.userId:', req.session?.userId || 'not set');
  console.log('📋 Returned Requests: req.query.userId:', req.query.userId || 'not provided');
  try {
    // Get userId - same logic as notifications endpoint
    const userId = req.session?.userId;
    if (!userId) {
      console.log('📋 Returned Requests: No user session found');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    console.log('📋 Returned Requests: Fetching returned requests for user:', userId);
    const request = pool.request();
    // Get approval requests that have been returned to this user
    const result = await request
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.current_status,
          ra.submitted_date,
          ra.approver_name as current_approver_name,
          ra.approver_designation,
          ra.approval_comments,
          ra.submitted_by,
          submitter.FullName as submitted_by_name,
          wf.workflow_name,
          ai.updated_at as returned_date,
          ai.rejection_reason as return_reason
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
        WHERE ra.submitted_by = @userId
        AND (
          (ai.decision_type = 'REJECT' AND LOWER(ai.rejection_reason) LIKE '%returned to requester%')
          OR ai.decision_type = 'RETURN'
        )
        AND ra.current_status != 'pending'
        ORDER BY ra.submitted_date DESC
      `);
    console.log('📋 Returned Requests: Found', result.recordset.length, 'returned requests for user:', userId);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Returned Requests: Error fetching returned requests:', error);
    res.status(500).json({ error: 'Failed to fetch returned requests', details: error.message });
  }
});
// Get wing approval dashboard data
app.get('/api/approvals/wing-dashboard', async (req, res) => {
  try {
    // Get wingId from query parameter
    const wingId = req.query.wingId;
    if (!wingId) {
      return res.status(400).json({ error: 'wingId is required' });
    }
    console.log('📊 Wing Dashboard: Fetching dashboard data for wing:', wingId);
    const request = pool.request();
    // Get counts with wing-specific logic:
    // - pending: Count where current approver is in the wing
    // - approved/rejected: Count where someone in the wing submitted OR acted
    // - forwarded: Count where someone in the wing has action_type='forwarded'
    const countsResult = await request
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id
           WHERE ra.current_status = 'pending' AND approver.intWingID = @wingId) as pending_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           LEFT JOIN approval_history ah ON ah.request_approval_id = ra.id
           LEFT JOIN AspNetUsers u_submitter ON ra.submitted_by = u_submitter.Id
           LEFT JOIN AspNetUsers u_actor ON ah.action_by = u_actor.Id
           WHERE ra.current_status = 'approved'
           AND (u_submitter.intWingID = @wingId OR u_actor.intWingID = @wingId)) as approved_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           LEFT JOIN approval_history ah ON ah.request_approval_id = ra.id
           LEFT JOIN AspNetUsers u_submitter ON ra.submitted_by = u_submitter.Id
           LEFT JOIN AspNetUsers u_actor ON ah.action_by = u_actor.Id
           WHERE ra.current_status = 'rejected'
           AND (u_submitter.intWingID = @wingId OR u_actor.intWingID = @wingId)) as rejected_count,
          (SELECT COUNT(DISTINCT ah.request_approval_id)
           FROM approval_history ah
           INNER JOIN AspNetUsers u_forwarder ON ah.action_by = u_forwarder.Id
           WHERE u_forwarder.intWingID = @wingId
           AND ah.action_type = 'forwarded') as forwarded_count
      `);
    // Get pending approvals for the wing
    const pendingResult = await request
      .query(`
        SELECT TOP 5
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.submitted_date,
          submitter.FullName as submitted_by_name,
          approver.FullName as current_approver_name,
          d.designation_name as current_approver_designation
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id
        LEFT JOIN tblUserDesignations d ON approver.intDesignationID = d.intDesignationID
        WHERE ra.current_status = 'pending'
        AND approver.intWingID = @wingId
        ORDER BY ra.submitted_date DESC
      `);
    // Get recent actions for the wing
    const actionsResult = await request
      .query(`
        SELECT TOP 10
          ah.action_type,
          ah.action_date,
          ah.comments,
          action_user.FullName as action_by_name,
          ra.request_type,
          ra.request_id
        FROM approval_history ah
        JOIN request_approvals ra ON ah.request_approval_id = ra.id
        LEFT JOIN AspNetUsers action_user ON ah.action_by = action_user.Id
        WHERE action_user.intWingID = @wingId
        ORDER BY ah.action_date DESC
      `);
    const dashboard = {
      ...countsResult.recordset[0],
      my_pending: pendingResult.recordset,
      recent_actions: actionsResult.recordset
    };
    console.log('📊 Wing Dashboard: Returning dashboard data:', dashboard);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('❌ Wing Dashboard: Error fetching wing approval dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch wing approval dashboard', details: error.message });
  }
});
// Get stock issuance items for an approval request (DUPLICATE REMOVED - using the enhanced version above)
// Get approval details
app.get('/api/approvals/:approvalId', async (req, res, next) => {
  try {
    const { approvalId } = req.params;
    // Only treat this route as an approval detail lookup when the param is a GUID.
    // This prevents collisions with static endpoints like `/api/approvals/my-approvals`.
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!guidRegex.test(approvalId)) {
      console.log('🔀 /api/approvals/:approvalId - skipping non-GUID param:', approvalId);
      return next();
    }
    const request = pool.request();
    // Get approval details with scope information from stock_issuance_requests
    const approvalResult = await request
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT 
          ra.*,
          submitter.FullName as submitted_by_name,
          current_approver.FullName as current_approver_name,
          wf.workflow_name,
          sir.request_type as scope_type
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers current_approver ON ra.current_approver_id = current_approver.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id
        WHERE ra.id = @approvalId
      `);
    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    const approval = approvalResult.recordset[0];
    // Get approval items - use a new request object
    const itemRequest = pool.request();
    const itemsResult = await itemRequest
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT 
          ai.*,
          im.item_code,
          im.description as item_description
        FROM approval_items ai
        LEFT JOIN item_masters im ON ai.item_master_id = im.id
        WHERE ai.request_approval_id = @approvalId
        ORDER BY ai.created_at
      `);
    // Combine data
    const approvalData = {
      ...approval,
      items: itemsResult.recordset,
      approval_items: itemsResult.recordset, // For backward compatibility
      request_items: itemsResult.recordset,  // For backward compatibility
      inventory_items: itemsResult.recordset  // For backward compatibility
    };
    res.json({ success: true, data: approvalData });
  } catch (error) {
    console.error('Error fetching approval details:', error);
    res.status(500).json({ error: 'Failed to fetch approval details', details: error.message });
  }
});
// Get approval history
app.get('/api/approvals/:approvalId/history', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const request = pool.request();
    const result = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        SELECT 
          ah.*,
          COALESCE(action_user.FullName, 
            CASE 
              WHEN ah.action_by = 'demo-user' THEN 'Demo User (System)'
              ELSE ah.action_by 
            END
          ) as action_by_name,
          COALESCE(action_user.Role, 'System User') as action_by_designation,
          COALESCE(from_user.FullName, ah.forwarded_from) as forwarded_from_name,
          COALESCE(to_user.FullName, ah.forwarded_to) as forwarded_to_name
        FROM approval_history ah
        LEFT JOIN AspNetUsers action_user ON ah.action_by = action_user.Id
        LEFT JOIN AspNetUsers from_user ON ah.forwarded_from = from_user.Id
        LEFT JOIN AspNetUsers to_user ON ah.forwarded_to = to_user.Id
        WHERE ah.request_approval_id = @approvalId
        ORDER BY ah.action_date DESC, ah.step_number DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({ error: 'Failed to fetch approval history', details: error.message });
  }
});
// Get available forwarders
app.get('/api/approvals/:approvalId/available-forwarders', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const request = pool.request();
    // Get workflow and current approver from approval
    const approvalResult = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query('SELECT workflow_id, current_approver_id FROM request_approvals WHERE id = @approvalId');
    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    const workflowId = approvalResult.recordset[0].workflow_id;
    const currentApproverId = approvalResult.recordset[0].current_approver_id;
    // Get available forwarders from workflow_approvers
    const workflowResult = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .query(`
        SELECT 
          wa.id,
          wa.user_id,
          u.FullName as user_name,
          u.Role as user_designation,
          wa.can_approve,
          wa.can_forward,
          wa.can_finalize,
          wa.approver_role
        FROM workflow_approvers wa
        JOIN AspNetUsers u ON wa.user_id = u.Id
        WHERE wa.workflow_id = @workflowId 
        AND (wa.can_approve = 1 OR wa.can_forward = 1)
        ORDER BY u.FullName
      `);
    let forwarders = workflowResult.recordset;
    // If current approver is not in workflow_approvers (hierarchy-based approval), add them with full permissions
    const currentApproverInList = forwarders.find(f => f.user_id === currentApproverId);
    if (!currentApproverInList && currentApproverId) {
      const currentApproverResult = await pool.request()
        .input('userId', sql.NVarChar, currentApproverId)
        .query(`
          SELECT 
            Id as user_id,
            FullName as user_name,
            Role as user_designation
          FROM AspNetUsers
          WHERE Id = @userId
        `);
      if (currentApproverResult.recordset.length > 0) {
        const currentApprover = currentApproverResult.recordset[0];
        forwarders.unshift({
          id: 'hierarchy-approver',
          user_id: currentApprover.user_id,
          user_name: currentApprover.user_name,
          user_designation: currentApprover.user_designation,
          can_approve: true,
          can_forward: true,
          can_finalize: false,
          approver_role: 'Supervisor (Hierarchy)'
        });
        console.log('✅ Added hierarchy-based current approver to forwarders list:', currentApprover.user_name);
      }
    }
    res.json({ success: true, data: forwarders });
  } catch (error) {
    console.error('Error fetching available forwarders:', error);
    res.status(500).json({ error: 'Failed to fetch available forwarders', details: error.message });
  }
});
// Request wing stock confirmation from supervisor
app.post('/api/approvals/:approvalId/request-wing-stock-confirmation', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { item_id, item_name, requested_quantity, approval_id, request_type } = req.body;
    console.log('📬 Wing stock confirmation request received:', {
      approvalId,
      item_id,
      item_name,
      requested_quantity,
      approval_id,
      request_type
    });
    if (!approvalId || !item_id) {
      console.error('❌ Missing required params:', { approvalId, item_id });
      return res.status(400).json({ error: 'approvalId and item_id are required' });
    }
    const confirmationId = require('uuid').v4();
    let dbCreated = false;
    try {
      // Try to create confirmation record in database
      const result = await pool.request()
        .input('confirmationId', sql.UniqueIdentifier, confirmationId)
        .input('approvalId', sql.NVarChar, approvalId)
        .input('itemId', sql.UniqueIdentifier, item_id)
        .input('itemName', sql.NVarChar, (item_name || 'Unknown Item').substring(0, 500))
        .input('requestedQuantity', sql.Int, parseInt(requested_quantity) || 0)
        .input('requestType', sql.NVarChar, request_type || 'wing_stock_confirmation')
        .query(`
          INSERT INTO wing_stock_confirmations (
            id,
            approval_id,
            item_id,
            item_name,
            requested_quantity,
            request_type,
            status,
            created_at,
            requested_by
          )
          VALUES (
            @confirmationId,
            @approvalId,
            @itemId,
            @itemName,
            @requestedQuantity,
            @requestType,
            'pending',
            GETDATE(),
            CURRENT_USER
          );
        `);
      console.log('✓ Wing stock confirmation record created:', confirmationId);
      dbCreated = true;
    } catch (dbError) {
      // If table doesn't exist, continue with in-memory tracking
      console.log('⚠ Database table error (continuing):', dbError.message);
    }
    // Try to notify wing stock supervisor
    let notifCreated = false;
    try {
      await pool.request()
        .input('userId', sql.NVarChar, 'wing-supervisor')
        .input('title', sql.NVarChar, '📬 Stock Verification Request')
        .input('message', sql.NVarChar, `Please verify wing stock availability for: ${item_name} (${requested_quantity} units)`)
        .input('link', sql.NVarChar, `/wing-stock/pending/${confirmationId}`)
        .query(`
          INSERT INTO notifications (user_id, title, message, link, created_at, is_read)
          VALUES (@userId, @title, @message, @link, GETDATE(), 0)
        `);
      console.log('✓ Notification created');
      notifCreated = true;
    } catch (notifError) {
      console.log('⚠ Notification error (continuing):', notifError.message);
    }
    console.log('✅ Wing stock confirmation request processed successfully');
    res.json({ 
      success: true, 
      confirmationId: confirmationId,
      message: 'Confirmation request sent to Wing Stock Supervisor',
      dbCreated,
      notifCreated
    });
  } catch (error) {
    console.error('❌ Error requesting wing stock confirmation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send confirmation request', 
      details: error.message 
    });
  }
});
// Forward request
app.post('/api/approvals/:approvalId/forward', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { forwarded_to, comments, forwarding_type } = req.body;
    // Get userId from session - must be authenticated
    const userId = req.session?.userId;
    if (!userId) {
      console.log('⚠️ Forward: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to forward requests.'
      });
    }
    const forwardingTypeLabel = forwarding_type === 'action' ? 'Action (Admin)' : 'Approval (Supervisor)';
    console.log('🔄 Forward: Processing forward request by user:', userId, '| Type:', forwardingTypeLabel);
    const request = pool.request();
    // Update approval record
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('forwarded_to', sql.NVarChar, forwarded_to)
      .query(`
        UPDATE request_approvals 
        SET current_approver_id = @forwarded_to, updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    console.log('✅ Forward: Request forwarded successfully from', userId, 'to', forwarded_to);
    // Now add history tracking (schema is fixed!)
    try {
      const historyComments = `${comments || 'Forwarded'} [${forwardingTypeLabel}]`;
      await request
        .input('userId', sql.NVarChar, userId)
        .input('comments', sql.NVarChar, historyComments)
        .query(`
          INSERT INTO approval_history 
          (request_approval_id, action_type, action_by, forwarded_from, forwarded_to, comments, step_number, is_current_step, action_date)
          VALUES (@approvalId, 'forwarded', @userId, @userId, @forwarded_to, @comments, 1, 1, GETDATE())
        `);
      console.log('📝 Forward: History recorded successfully with type:', forwardingTypeLabel);
    } catch (historyError) {
      console.warn('⚠️ Forward: Could not record history:', historyError.message);
      // Don't fail the main operation if history fails
    }
    res.json({ success: true, message: `Request forwarded successfully for ${forwardingTypeLabel}` });
  } catch (error) {
    console.error('Error forwarding request:', error);
    res.status(500).json({ error: 'Failed to forward request', details: error.message });
  }
});
// Get requester's supervisor for approval forwarding
app.get('/api/requests/:requestId/requester-supervisor', async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('🔍 Getting supervisor for request:', requestId);
    const request = pool.request();
    // Get the requester's user ID from stock_issuance_requests
    const requestResult = await request
      .input('requestId', sql.NVarChar, requestId)
      .query(`
        SELECT requester_user_id 
        FROM stock_issuance_requests 
        WHERE id = @requestId
      `);
    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const requesterUserId = requestResult.recordset[0].requester_user_id;
    console.log('👤 Requester user ID:', requesterUserId);
    // Look up supervisor using the same hierarchy logic as request creation
    // AspNetUsers.Id → EmployeeID → BossID → Boss's AspNetUsers.Id
    const supervisorResult = await pool.request()
      .input('requesterUserId', sql.NVarChar, requesterUserId)
      .query(`
        SELECT 
          boss_user.Id as supervisor_id,
          boss_user.FullName as supervisor_name,
          boss_user.Email as supervisor_email
        FROM vw_AspNetUser_with_Reg_App_DEC_ID emp_user
        INNER JOIN LEAVE_APPROVAL_HIERARCHY h ON emp_user.EmployeeID = h.EmployeeID
        INNER JOIN vw_AspNetUser_with_Reg_App_DEC_ID boss_user ON h.BossID = boss_user.EmployeeID
        WHERE emp_user.Id = @requesterUserId
      `);
    if (supervisorResult.recordset.length === 0) {
      console.warn('⚠️ No supervisor found in hierarchy for requester:', requesterUserId);
      return res.json({ 
        success: false, 
        message: 'No supervisor found for this requester' 
      });
    }
    const supervisor = supervisorResult.recordset[0];
    console.log('✅ Found supervisor:', supervisor.supervisor_name, '(', supervisor.supervisor_id, ')');
    res.json({ 
      success: true, 
      supervisor_id: supervisor.supervisor_id,
      supervisor_name: supervisor.supervisor_name,
      supervisor_email: supervisor.supervisor_email
    });
  } catch (error) {
    console.error('❌ Error getting requester supervisor:', error);
    res.status(500).json({ error: 'Failed to get supervisor', details: error.message });
  }
});
// Get logged-in user's supervisor for approval forwarding
app.get('/api/user/:userId/supervisor', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Getting supervisor for logged-in user:', userId);
    // Look up supervisor using hierarchy
    // AspNetUsers.Id → EmployeeID → BossID → Boss's AspNetUsers.Id
    const supervisorResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          boss_user.Id as supervisor_id,
          boss_user.FullName as supervisor_name,
          boss_user.Email as supervisor_email,
          emp_user.FullName as employee_name
        FROM vw_AspNetUser_with_Reg_App_DEC_ID emp_user
        INNER JOIN LEAVE_APPROVAL_HIERARCHY h ON emp_user.EmployeeID = h.EmployeeID
        INNER JOIN vw_AspNetUser_with_Reg_App_DEC_ID boss_user ON h.BossID = boss_user.EmployeeID
        WHERE emp_user.Id = @userId
      `);
    if (supervisorResult.recordset.length === 0) {
      console.warn('⚠️ No supervisor found in hierarchy for user:', userId);
      return res.json({ 
        success: false, 
        message: 'No supervisor found for this user' 
      });
    }
    const supervisor = supervisorResult.recordset[0];
    console.log('✅ Found supervisor for', supervisor.employee_name, ':', supervisor.supervisor_name, '(', supervisor.supervisor_id, ')');
    res.json({ 
      success: true, 
      supervisor_id: supervisor.supervisor_id,
      supervisor_name: supervisor.supervisor_name,
      supervisor_email: supervisor.supervisor_email
    });
  } catch (error) {
    console.error('❌ Error getting user supervisor:', error);
    res.status(500).json({ error: 'Failed to get supervisor', details: error.message });
  }
});
// Get all workflows
app.get('/api/workflows', async (req, res) => {
  try {
    console.log('📋 Getting all workflows');
    const result = await pool.request().query(`
      SELECT 
        id,
        workflow_name,
        request_type,
        office_id,
        description,
        is_active,
        created_date
      FROM approval_workflows
      WHERE is_active = 1
      ORDER BY workflow_name
    `);
    console.log('✅ Found', result.recordset.length, 'active workflows');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Error getting workflows:', error);
    res.status(500).json({ error: 'Failed to get workflows', details: error.message });
  }
});
// Get workflow approvers
app.get('/api/workflows/:workflowId/approvers', async (req, res) => {
  try {
    const { workflowId } = req.params;
    console.log('👥 Getting approvers for workflow:', workflowId);
    const result = await pool.request()
      .input('workflowId', sql.NVarChar, workflowId)
      .query(`
        SELECT 
          wa.id,
          wa.user_id,
          u.FullName as user_name,
          u.Email as user_email,
          d.DesignationName as user_designation,
          wa.step_number,
          wa.can_approve,
          wa.can_forward,
          wa.can_finalize,
          wa.is_required
        FROM workflow_approvers wa
        INNER JOIN AspNetUsers u ON wa.user_id = u.Id
        LEFT JOIN vw_AspNetUser_with_Reg_App_DEC_ID v ON u.Id = v.Id
        LEFT JOIN Designations d ON v.DesignationId = d.id
        WHERE wa.workflow_id = @workflowId
        ORDER BY wa.step_number, u.FullName
      `);
    console.log('✅ Found', result.recordset.length, 'approvers for workflow');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Error getting workflow approvers:', error);
    res.status(500).json({ error: 'Failed to get workflow approvers', details: error.message });
  }
});
// Approve request
app.post('/api/approvals/:approvalId/approve', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_allocations
    } = req.body;
    // Get userId from session - this should always be the authenticated user
    const userId = req.session?.userId;
    if (!userId) {
      console.log('⚠️ Approve: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to perform approval actions.'
      });
    }
    // Log which method was used to get userId
    if (req.session?.userId) {
      console.log('✅ Approve: Using userId from session:', userId);
    } else if (req.query.userId) {
      console.log('⚠️ Approve: Using userId from query parameter:', userId);
    } else if (req.body.userId) {
      console.log('⚠️ Approve: Using userId from request body:', userId);
    }
    // Get the user's actual name and designation from database for the approval record
    let actualApproverName = approver_name || 'System';
    let actualApproverDesignation = approver_designation || 'Approver';
    if (userId) {
      try {
        const userInfoResult = await pool.request()
          .input('userId', sql.NVarChar, userId)
          .query(`
            SELECT FullName, 
                   COALESCE(tblUserDesignations.designation_name, 'Supervisor') as designation_name
            FROM AspNetUsers 
            LEFT JOIN tblUserDesignations ON AspNetUsers.intDesignationID = tblUserDesignations.intDesignationID
            WHERE Id = @userId
          `);
        if (userInfoResult.recordset.length > 0) {
          actualApproverName = userInfoResult.recordset[0].FullName;
          actualApproverDesignation = userInfoResult.recordset[0].designation_name;
          console.log('✅ Approve: Using actual user info for approval record:', actualApproverName, actualApproverDesignation);
        }
      } catch (error) {
        console.log('⚠️ Approve: Could not get user info, using request body values');
      }
    }
    console.log('✅ Approve: Processing per-item approval by user:', userId);
    console.log('📋 Item allocations:', item_allocations);
    const request = pool.request();
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Check if this is a return action (an item marked as RETURN or a REJECT with returned reason)
      const hasReturnActions = item_allocations?.some(allocation =>
        allocation.decision_type === 'RETURN' ||
        (allocation.decision_type === 'REJECT' && allocation.rejection_reason?.toLowerCase().includes('returned to requester'))
      );
      // Determine overall approval status
      // Request can ONLY be marked as 'approved' when ALL items have final decisions
      // Final decisions: APPROVE_FROM_STOCK, APPROVE_FOR_PROCUREMENT, or REJECT
      // If ANY item is returned, entire approval is marked 'returned'
      // If ANY item is forwarded (FORWARD_TO_SUPERVISOR), request stays 'pending'
      let overallStatus = 'pending'; // Default to pending
      if (hasReturnActions) {
        overallStatus = 'returned'; // Items returned to requester - mark as 'returned' status
      } else if (item_allocations?.every(allocation => allocation.decision_type === 'REJECT')) {
        overallStatus = 'rejected'; // All items rejected
      } else if (item_allocations?.every(allocation =>
        allocation.decision_type === 'APPROVE_FROM_STOCK' ||
        allocation.decision_type === 'APPROVE_FOR_PROCUREMENT' ||
        allocation.decision_type === 'REJECT'
      )) {
        // ALL items have final decisions (approved or rejected) - no forwarding/pending items
        overallStatus = 'approved';
      }
      // If any items are FORWARD_TO_SUPERVISOR or other non-final statuses, stays pending
      // Update approval record
      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .input('status', sql.NVarChar, overallStatus)
        .input('approver_name', sql.NVarChar, actualApproverName)
        .input('approver_designation', sql.NVarChar, actualApproverDesignation)
        .input('approval_comments', sql.NVarChar, approval_comments || '')
        .query(`
          UPDATE request_approvals
          SET current_status = @status,
              updated_date = GETDATE(),
              approver_name = @approver_name,
              approver_designation = @approver_designation,
              approval_comments = @approval_comments
          WHERE id = @approvalId
        `);
      // Process item allocations if provided
      if (item_allocations && Array.isArray(item_allocations)) {
        for (const allocation of item_allocations) {
          const {
            requested_item_id,
            allocated_quantity,
            decision_type,
            rejection_reason,
            forwarding_reason
          } = allocation;
          // Update item-level decision
          await transaction.request()
            .input('itemId', sql.NVarChar, requested_item_id)
            .input('allocated_quantity', sql.Int, allocated_quantity || 0)
            .input('decision_type', sql.NVarChar, decision_type)
            .input('rejection_reason', sql.NVarChar, rejection_reason || '')
            .input('forwarding_reason', sql.NVarChar, forwarding_reason || '')
            .query(`
              UPDATE approval_items
              SET allocated_quantity = @allocated_quantity,
                  decision_type = @decision_type,
                  rejection_reason = @rejection_reason,
                  forwarding_reason = @forwarding_reason,
                  updated_at = GETDATE()
              WHERE id = @itemId
            `);
        }
      }
      // If this is a return action, we might need to update the original request status
      // to allow editing. This depends on your business logic.
      // Get next step number
      const stepResult = await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
          FROM approval_history
          WHERE request_approval_id = @approvalId
        `);
      const nextStep = stepResult.recordset[0].next_step;
      // Update current step
      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          UPDATE approval_history
          SET is_current_step = 0
          WHERE request_approval_id = @approvalId
        `);
      // Add history entry
      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .input('action_by', sql.NVarChar, userId)
        .input('comments', sql.NVarChar, approval_comments || 'Per-item approval completed')
        .input('step_number', sql.Int, nextStep)
        .input('action_type', sql.NVarChar, hasReturnActions ? 'returned' : overallStatus)
        .query(`
          INSERT INTO approval_history
          (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
          VALUES (@approvalId, @action_type, @action_by, @comments, @step_number, 1)
        `);
      await transaction.commit();
      // Create notification for requester if items were returned
      if (hasReturnActions) {
        try {
          // Get the requester's user ID from the approval record
          const requesterResult = await pool.request()
            .input('approvalId', sql.NVarChar, approvalId)
            .query(`
              SELECT ra.submitted_by, u.FullName as requester_name
              FROM request_approvals ra
              LEFT JOIN AspNetUsers u ON ra.submitted_by = u.Id
              WHERE ra.id = @approvalId
            `);
          if (requesterResult.recordset.length > 0) {
            const requesterId = requesterResult.recordset[0].submitted_by;
            const requesterName = requesterResult.recordset[0].requester_name;
            await createNotification(
              requesterId,
              'Request Returned for Revision',
              `Your request has been returned for revision. Please check the approval details and resubmit.`,
              'warning',
              `/approvals/${approvalId}`,
              'View Request'
            );
            console.log(`📧 Notification sent to requester ${requesterName} (${requesterId}) for returned request ${approvalId}`);
          }
        } catch (notificationError) {
          console.error('Failed to create notification for requester:', notificationError);
          // Don't fail the request if notification fails
        }
      }
      res.json({
        success: true,
        message: hasReturnActions
          ? 'Request returned to requester for editing'
          : 'Per-item approval decisions processed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error processing per-item approval:', error);
    res.status(500).json({ error: 'Failed to process approval', details: error.message });
  }
});
// Reject request
app.post('/api/approvals/:approvalId/reject', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    // Get userId from session - this should always be the authenticated user
    const userId = req.session?.userId;
    if (!userId) {
      console.log('⚠️ Reject: No authenticated user in session');
      return res.status(401).json({
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to perform approval actions.'
      });
    }
    console.log('❌ Reject: Processing rejection by user:', userId);
    if (!comments || !comments.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    const request = pool.request();
    // Update approval record
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('rejected_by', sql.NVarChar, userId)
      .input('rejection_reason', sql.NVarChar, comments)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'rejected', 
            rejected_by = @rejected_by,
            rejected_date = GETDATE(),
            rejection_reason = @rejection_reason,
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    // Get next step number
    const stepResult = await request
      .query(`
        SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
        FROM approval_history 
        WHERE request_approval_id = @approvalId
      `);
    const nextStep = stepResult.recordset[0].next_step;
    // Update current step
    await request
      .query(`
        UPDATE approval_history 
        SET is_current_step = 0 
        WHERE request_approval_id = @approvalId
      `);
    // Add history entry
    await request
      .input('action_by', sql.NVarChar, userId)
      .input('comments', sql.NVarChar, comments)
      .input('step_number', sql.Int, nextStep)
      .query(`
        INSERT INTO approval_history 
        (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
        VALUES (@approvalId, 'rejected', @action_by, @comments, @step_number, 1)
      `);
    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});
// Finalize request
app.post('/api/approvals/:approvalId/finalize', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    const userId = req.session?.userId || 'demo-user';
    const request = pool.request();
    // Check if user can finalize
    const authResult = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT wa.can_finalize
        FROM request_approvals ra
        JOIN workflow_approvers wa ON ra.workflow_id = wa.workflow_id
        WHERE ra.id = @approvalId AND wa.user_id = @userId
      `);
    if (authResult.recordset.length === 0 || !authResult.recordset[0].can_finalize) {
      return res.status(403).json({ error: 'You do not have permission to finalize this request' });
    }
    // Update approval record
    await request
      .input('finalized_by', sql.NVarChar, userId)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'finalized',
            finalized_by = @finalized_by,
            finalized_date = GETDATE(),
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    // Get next step number
    const stepResult = await request
      .query(`
        SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
        FROM approval_history 
        WHERE request_approval_id = @approvalId
      `);
    const nextStep = stepResult.recordset[0].next_step;
    // Update current step
    await request
      .query(`
        UPDATE approval_history 
        SET is_current_step = 0 
        WHERE request_approval_id = @approvalId
      `);
    // Add history entry
    await request
      .input('action_by', sql.NVarChar, userId)
      .input('comments', sql.NVarChar, comments)
      .input('step_number', sql.Int, nextStep)
      .query(`
        INSERT INTO approval_history 
        (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
        VALUES (@approvalId, 'finalized', @action_by, @comments, @step_number, 1)
      `);
    res.json({ success: true, message: 'Request finalized successfully' });
  } catch (error) {
    console.error('Error finalizing request:', error);
    res.status(500).json({ error: 'Failed to finalize request', details: error.message });
  }
});
// Get request approval status
app.get('/api/approvals/status', async (req, res) => {
  try {
    const { request_id, request_type } = req.query;
    const request = pool.request();
    const result = await request
      .input('request_id', sql.UniqueIdentifier, request_id)
      .input('request_type', sql.NVarChar, request_type)
      .query(`
        SELECT 
          ra.*,
          submitter.FullName as submitted_by_name,
          current_approver.FullName as current_approver_name,
          wf.workflow_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers current_approver ON ra.current_approver_id = current_approver.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        WHERE ra.request_id = @request_id AND ra.request_type = @request_type
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No approval process found for this request' });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching request status:', error);
    res.status(500).json({ error: 'Failed to fetch request status', details: error.message });
  }
});
process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});
// SIMPLIFIED APPROVAL ACTIONS (bypassing schema issues)
// Simple forward endpoint
app.post('/api/approvals/simple-forward', async (req, res) => {
  try {
    const { approvalId, forwarded_to, comments } = req.body;
    console.log('🔄 Simple Forward: Processing approval:', approvalId);
    console.log('🔄 Simple Forward: Forwarding to:', forwarded_to);
    const request = pool.request();
    // Simple update - just change the current approver
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('forwarded_to', sql.NVarChar, forwarded_to)
      .query(`
        UPDATE request_approvals 
        SET current_approver_id = @forwarded_to, 
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    console.log('✅ Simple Forward: Success');
    res.json({ 
      success: true, 
      message: 'Request forwarded successfully',
      data: { current_approver_id: forwarded_to }
    });
  } catch (error) {
    console.error('❌ Simple Forward: Error:', error);
    res.status(500).json({ 
      error: 'Failed to forward request', 
      details: error.message 
    });
  }
});
// Simple approve endpoint
app.post('/api/approvals/simple-approve', async (req, res) => {
  try {
    const { approvalId, comments } = req.body;
    console.log('✅ Simple Approve: Processing approval:', approvalId);
    const request = pool.request();
    // Simple update - just change status to approved
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'approved', 
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    console.log('✅ Simple Approve: Success');
    res.json({ 
      success: true, 
      message: 'Request approved successfully',
      data: { current_status: 'approved' }
    });
  } catch (error) {
    console.error('❌ Simple Approve: Error:', error);
    res.status(500).json({ 
      error: 'Failed to approve request', 
      details: error.message 
    });
  }
});
// Simple reject endpoint
app.post('/api/approvals/simple-reject', async (req, res) => {
  try {
    const { approvalId, comments } = req.body;
    console.log('❌ Simple Reject: Processing approval:', approvalId);
    const request = pool.request();
    // Simple update - just change status to rejected
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('comments', sql.NVarChar, comments || 'Rejected')
      .query(`
        UPDATE request_approvals 
        SET current_status = 'rejected', 
            rejection_reason = @comments,
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    console.log('❌ Simple Reject: Success');
    res.json({ 
      success: true, 
      message: 'Request rejected successfully',
      data: { current_status: 'rejected' }
    });
  } catch (error) {
    console.error('❌ Simple Reject: Error:', error);
    res.status(500).json({ 
      error: 'Failed to reject request', 
      details: error.message 
    });
  }
});
// Temporary endpoint to set session for specific user (development only)
app.post('/api/dev/set-session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Get user details from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT Id, FullName, UserName, Email, Role, intOfficeID, intWingID
        FROM AspNetUsers 
        WHERE Id = @userId
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.recordset[0];
    // Set session
    req.session.userId = user.Id;
    req.session.user = user;
    res.json({ 
      success: true, 
      message: 'Session set successfully',
      user: user
    });
  } catch (error) {
    console.error('Error setting session:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});
// GET version for browser compatibility
app.get('/api/dev/set-session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Get user details from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT Id, FullName, UserName, Email, Role, intOfficeID, intWingID
        FROM AspNetUsers 
        WHERE Id = @userId
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.recordset[0];
    // Set session
    req.session.userId = user.Id;
    req.session.user = user;
    res.json({ 
      success: true, 
      message: 'Session set successfully via GET',
      user: user,
      instructions: 'Now refresh your approval page - you should be logged in as ' + user.FullName
    });
  } catch (error) {
    console.error('Error setting session:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});
// Debug endpoint to check user roles and permissions
app.get('/api/dev/debug-user-permissions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 DEBUG: Checking permissions for user:', userId);
    // Get user from database
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT Id, FullName, UserName, Email
        FROM AspNetUsers 
        WHERE Id = @userId
      `);
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found', userId });
    }
    const user = userResult.recordset[0];
    // Get roles using the function
    const rolesResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT * FROM dbo.fn_GetUserRoles(@userId)');
    // Get permissions using the view
    const permsResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT DISTINCT permission_key, module_name, action_name, description
        FROM vw_ims_user_permissions
        WHERE user_id = @userId
        ORDER BY module_name, action_name
      `);
    // Check if super admin
    const superAdminResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT dbo.fn_IsSuperAdmin(@userId) as isSuperAdmin');
    const isSuperAdmin = superAdminResult.recordset[0]?.isSuperAdmin === true || 
                         superAdminResult.recordset[0]?.isSuperAdmin === 1;
    res.json({
      success: true,
      user: {
        id: user.Id,
        fullName: user.FullName,
        userName: user.UserName,
        email: user.Email
      },
      roles: {
        count: rolesResult.recordset.length,
        data: rolesResult.recordset
      },
      permissions: {
        count: permsResult.recordset.length,
        data: permsResult.recordset
      },
      isSuperAdmin: isSuperAdmin,
      summary: {
        hasRoles: rolesResult.recordset.length > 0,
        hasPermissions: permsResult.recordset.length > 0,
        rolesCount: rolesResult.recordset.length,
        permsCount: permsResult.recordset.length
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: 'Debug check failed',
      message: error.message 
    });
  }
});
// API to get user's submitted requests with tracking information
app.get('/api/my-requests', async (req, res) => {
  try {
    console.log('Fetching user requests...');
    console.log('Session:', req.session);
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    const userId = req.session.userId;
    console.log('Loading requests for user:', userId);
    // Get all requests REQUESTED by the current user (filter by requester_user_id, not approvals)
    const requestsQuery = `
      SELECT 
        sir.id as request_id,
        sir.request_type,
        sir.submitted_at as submitted_date,
        sir.requester_user_id as submitted_by,
        sir.request_status as current_status,
        sir.created_at as created_date,
        -- Get requester info
        u_requester.FullName as requester_name,
        u_requester.FullName as current_approver_name,
        -- Use stock issuance data for titles and descriptions
        sir.justification as title,
        sir.purpose as description,
        sir.created_at as requested_date,
        sir.request_status
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u_requester ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u_requester.Id AS NVARCHAR(450))
      WHERE CAST(sir.requester_user_id AS NVARCHAR(450)) = @userId
      ORDER BY sir.created_at DESC;
    `;
    const requestsResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(requestsQuery);
    const requests = [];
    for (const request of requestsResult.recordset) {
      // Get items for each request from stock issuance items
      let items = [];
      try {
        const stockItemsQuery = `
          SELECT 
            si_items.id,
            si_items.item_master_id as item_id,
            si_items.nomenclature as item_name,
            si_items.requested_quantity,
            si_items.approved_quantity,
            'units' as unit,
            si_items.item_type,
            si_items.custom_item_name
          FROM stock_issuance_items si_items
          WHERE si_items.request_id = @requestId
          ORDER BY si_items.nomenclature;
        `;
        const stockItemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request.request_id)
          .query(stockItemsQuery);
        items = stockItemsResult.recordset || [];
        // Debug log - show what we got
        console.log(`✓ Loaded ${items.length} items for request ${request.request_id.toString().substring(0, 8)}:`, JSON.stringify(items.map(i => ({ name: i.item_name, qty: i.requested_quantity }))));
      } catch (itemError) {
        console.log('Could not load stock issuance items for request', request.request_id, ':', itemError.message);
        items = [];
      }
      const processedRequest = {
        id: request.request_id,
        request_type: request.request_type || 'stock_issuance',
        title: request.title || 'Stock Issuance Request',
        description: request.description || 'Request for inventory items',
        requested_date: request.requested_date || request.created_date,
        submitted_date: request.submitted_date || request.created_date,
        current_status: request.current_status || 'pending',
        request_status: request.request_status || request.current_status || 'pending',
        current_approver_name: request.current_approver_name,
        priority: 'Medium', // Default priority since not in current schema
        items: items,
        total_items: items.length
      };
      requests.push(processedRequest);
    }
    console.log(`Found ${requests.length} requests for user`);
    res.json({
      success: true,
      requests: requests,
      total: requests.length
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch requests: ' + error.message 
    });
  }
});
// API to get detailed information about a specific request
app.get('/api/request-details/:requestId', async (req, res) => {
  try {
    console.log('Fetching request details...');
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    const { requestId } = req.params;
    let userId = req.session.userId;
    console.log('Loading details for request:', requestId, 'by user:', userId);
    // Check if user has permission to view request details
    // Allow if user is super admin, has general permissions, or is involved in the request
    let hasAccess = false;
    try {
      if (pool) {
        const superAdminResult = await pool.request()
          .input('userId', sql.NVarChar(450), userId)
          .query('SELECT dbo.fn_IsSuperAdmin(@userId) as isSuperAdmin');
        hasAccess = superAdminResult.recordset[0]?.isSuperAdmin === true ||
                   superAdminResult.recordset[0]?.isSuperAdmin === 1;
        if (!hasAccess) {
          // Check for general request viewing permissions
          const permResult = await pool.request()
            .input('userId', sql.NVarChar(450), userId)
            .query(`
              SELECT COUNT(*) as permCount FROM vw_ims_user_permissions
              WHERE user_id = @userId AND permission_key IN (
                'requests.view', 'approvals.view', 'stock_issuance.view'
              )
            `);
          hasAccess = permResult.recordset[0]?.permCount > 0;
        }
        if (!hasAccess) {
          // Check if user is directly involved in this specific request
          const involvementResult = await pool.request()
            .input('userId', sql.NVarChar(450), userId)
            .input('requestId', sql.NVarChar, requestId)
            .query(`
              SELECT COUNT(*) as involvementCount FROM request_approvals
              WHERE request_id = @requestId
              AND (submitted_by = @userId OR current_approver_id = @userId)
            `);
          hasAccess = involvementResult.recordset[0]?.involvementCount > 0;
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      hasAccess = false;
    }
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to view this request.'
      });
    }
    // Get request details - verify it belongs to the current user
    const requestQuery = `
      SELECT 
        ra.request_id,
        ra.request_type,
        ra.submitted_date,
        ra.current_status,
        ra.submitted_by,
        -- Get approver name
        u_approver.FullName as current_approver_name,
        -- Get requester info
        u_requester.FullName as requester_name,
        -- Use stock issuance data for details
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        -- Office and wing info disabled due to data type mismatch
        CAST(NULL AS NVARCHAR(100)) as office_name,
        CAST(NULL AS NVARCHAR(100)) as wing_name
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_approver ON u_approver.Id = ra.current_approver_id
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      WHERE ra.request_id = @requestId
    `;
    const requestResult = await pool.request()
      .input('requestId', sql.NVarChar, requestId)
      .query(requestQuery);
    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Request not found or access denied' 
      });
    }
    const request = requestResult.recordset[0];
    // Get items for the request from stock issuance items
    let items = [];
    try {
      const stockItemsQuery = `
        SELECT 
          si_items.item_master_id as item_id,
          COALESCE(im.nomenclature, 'Unknown Item') as item_name,
          si_items.requested_quantity,
          si_items.approved_quantity,
          COALESCE(im.unit, 'units') as unit,
          '' as specifications
        FROM stock_issuance_items si_items
        LEFT JOIN item_masters im ON im.id = si_items.item_master_id
        WHERE si_items.request_id = @requestId
        ORDER BY im.nomenclature;
      `;
      const stockItemsResult = await pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(stockItemsQuery);
      items = stockItemsResult.recordset || [];
    } catch (itemError) {
      console.log('Could not load stock issuance items:', itemError.message);
      items = [];
    }
    // Get approval history
    const historyQuery = `
      SELECT 
        ah.id,
        ah.action_type as action,
        ah.action_date,
        ah.comments,
        ah.step_number as level,
        u.FullName as approver_name
      FROM approval_history ah
      LEFT JOIN AspNetUsers u ON u.Id = ah.action_by
      WHERE ah.request_approval_id IN (
        SELECT id FROM request_approvals WHERE request_id = @requestId
      )
      ORDER BY ah.action_date DESC;
    `;
    let approvalHistory = [];
    try {
      const historyResult = await pool.request()
        .input('requestId', sql.NVarChar, requestId)
        .query(historyQuery);
      approvalHistory = (historyResult.recordset || []).map(h => ({
        ...h,
        approver_name: h.approver_name && h.approver_name.trim() ? h.approver_name : 'System',
        forwarded_to_name: h.forwarded_to_name && h.forwarded_to_name.trim ? h.forwarded_to_name : (h.ForwardedToName || h.ForwardedToUserId || null)
      }));
    } catch (historyError) {
      console.log('Could not load approval history:', historyError.message);
      approvalHistory = [];
    }
    const response = {
      id: request.request_id,
      request_type: request.request_type || 'stock_issuance',
      title: request.title || 'Stock Issuance Request',
      description: request.description || 'Request for inventory items',
      requested_date: request.requested_date,
      submitted_date: request.submitted_date,
      current_status: request.current_status,
      priority: request.priority || 'Medium',
      office_name: request.office_name,
      wing_name: request.wing_name,
      requester_name: request.requester_name,
      items: items,
      approval_history: approvalHistory
    };
    console.log(`Found request details with ${items.length} items and ${approvalHistory.length} history entries`);
    res.json({
      success: true,
      request: response
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch request details: ' + error.message 
    });
  }
});
// API to get requests that came to the current user for approval (approval history)
app.get('/api/my-approval-history', async (req, res) => {
  try {
    console.log('🔍 API CALLED: /api/my-approval-history');
    console.log('Fetching approval history...');
    console.log('Session:', req.session);
    // Get user ID from session
    let userId = req.session?.userId;
    console.log('Session userId:', userId);
    if (!userId) {
      console.log('⚠️  No userId in session, attempting to fetch from authenticated user...');
      // Try to get from auth header or return error
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated',
        requests: []
      });
    }
    console.log('Using user ID from session:', userId);
    console.log('Loading approval history for user:', userId);
    // Test with absolute minimal query first
    const approvalHistoryQuery = `
      SELECT 
        ra.id,
        ra.request_id,
        ra.request_type,
        ra.submitted_date,
        ra.current_status,
        ra.submitted_by,
        ra.current_approver_id,
        u_requester.FullName as requester_name,
        u_current_approver.FullName as current_approver_name,
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        COALESCE(
          (SELECT TOP 1 ah.action_type 
           FROM approval_history ah 
           WHERE ah.request_approval_id = ra.id 
           AND ah.action_by = @userId
           ORDER BY ah.action_date DESC), 
          CASE 
            -- Check if I forwarded this request (I'm not current approver but I have forward history)
            WHEN EXISTS (SELECT 1 FROM approval_history ah 
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId 
                        AND ah.action_type = 'forwarded') THEN 'forwarded'
            -- I'm still the current approver - check current status
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'pending' THEN 'pending'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'approved' THEN 'approved'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'rejected' THEN 'rejected'
            ELSE 'not_involved' 
          END
        ) as my_action,
        ra.updated_date as my_action_date,
        COALESCE(item_counts.item_count, 0) as total_items
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
      LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      LEFT JOIN (
        SELECT request_id, COUNT(*) as item_count
        FROM stock_issuance_items 
        GROUP BY request_id
      ) item_counts ON item_counts.request_id = ra.request_id
      WHERE (ra.current_approver_id = @userId 
             OR EXISTS (SELECT 1 FROM approval_history ah 
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId)
             OR EXISTS (SELECT 1 FROM approval_history ah
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId 
                        AND ah.action_type = 'forwarded'))
      ORDER BY ra.submitted_date DESC`;
    console.log('�🚀🚀 NEW SIMPLIFIED CODE IS RUNNING - USING COUNT QUERY 🚀🚀🚀');
    console.log('📊 QUERY:', approvalHistoryQuery);
    const historyResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(approvalHistoryQuery);
    console.log('✅ Query executed successfully. Records:', historyResult.recordset.length);
    console.log('🔍 Sample record:', historyResult.recordset[0]);
    const requests = [];
    for (const request of historyResult.recordset) {
      // Load items for each request
      let items = [];
      try {
        console.log('Loading items for request:', request.request_id);
        const stockItemsQuery = `
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
          WHERE si_items.request_id = @requestId
          ORDER BY 
            CASE 
              WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
              ELSE im.nomenclature
            END;
        `;
        const stockItemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request.request_id)
          .query(stockItemsQuery);
        console.log('Items found for', request.request_id, ':', stockItemsResult.recordset.length);
        items = stockItemsResult.recordset || [];
      } catch (itemError) {
        console.log('ERROR loading items for request', request.request_id, ':', itemError.message);
        console.log('Items error details:', itemError);
        items = [];
      }
      const processedRequest = {
        id: request.id,
        request_id: request.request_id,
        request_type: request.request_type || 'stock_issuance',
        title: request.title || 'Stock Issuance Request',
        description: request.description || 'Request for inventory items',
        requested_date: request.requested_date || request.submitted_date,
        submitted_date: request.submitted_date,
        requester_name: request.requester_name || 'Unknown User',
        requester_office: null,
        requester_wing: null,
        my_action: request.my_action || 'pending',
        my_action_date: request.my_action_date,
        my_comments: null,
        forwarded_to: null,
        current_status: request.current_status || 'pending',
        final_status: request.current_status || 'pending',
        items: items,
        total_items: request.total_items || 0,
        priority: 'Medium'
      };
      requests.push(processedRequest);
    }
    console.log(`✅ Found ${requests.length} approval history entries for user ${userId}`);
    console.log('📋 Requests:', requests.map(r => ({ id: r.id, title: r.title, action: r.my_action })));
    // Add item counts using simple SQL for each request
    for (let i = 0; i < requests.length; i++) {
      try {
        const itemCountResult = await pool.request()
          .input('requestId', sql.NVarChar, requests[i].request_id)
          .query('SELECT COUNT(*) as item_count FROM stock_issuance_items WHERE request_id = @requestId');
        requests[i].total_items = itemCountResult.recordset[0].item_count || 0;
        console.log('✅ Item count for', requests[i].request_id, ':', requests[i].total_items);
      } catch (error) {
        console.log('❌ Error getting item count for', requests[i].request_id, ':', error.message);
        requests[i].total_items = 0;
      }
    }
    res.json({
      success: true,
      requests: requests,
      total: requests.length,
      debug_request_ids: requests.map(r => ({ 
        approval_id: r.id, 
        request_id: r.request_id,
        view_details_url: `/dashboard/request-details/${r.request_id}`,
        item_count: r.total_items
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching approval history:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch approval history: ' + error.message,
      details: error.stack
    });
  }
});
// =============================================================================
// WING REQUEST HISTORY API ENDPOINT
// =============================================================================
app.get('/api/wing-request-history', async (req, res) => {
  try {
    console.log('🔍 API CALLED: /api/wing-request-history');
    console.log('Fetching wing request history...');
    console.log('Session:', req.session);
    // Check authentication and get user info
    let userId = req.session.userId;
    console.log('Session userId:', userId);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    // Get user's wing ID
    const userWingQuery = `
      SELECT u.intWingID as wing_id, u.FullName, w.Name as wing_name
      FROM AspNetUsers u
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE u.Id = @userId
    `;
    const userWingResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(userWingQuery);
    console.log('🔍 User query result:', userWingResult.recordset);
    if (!userWingResult.recordset[0]?.wing_id) {
      console.error('❌ No wing ID found for user:', userId);
      return res.status(400).json({ success: false, error: 'User wing information not found' });
    }
    const userWingId = userWingResult.recordset[0].wing_id;
    const userName = userWingResult.recordset[0].FullName;
    const userWingName = userWingResult.recordset[0].wing_name;
    console.log('✅ Found user:', userName, 'with wing ID:', userWingId, 'Wing:', userWingName);
    // Get all requests from users in the same wing
    // This includes both requests with approvals AND direct requests from stock_issuance_requests
    const wingRequestsQuery = `
      SELECT 
        COALESCE(ra.id, sir.id) as id,
        sir.id as request_id,
        sir.request_type,
        COALESCE(ra.submitted_date, sir.submitted_at) as submitted_date,
        COALESCE(ra.current_status, sir.request_status) as current_status,
        COALESCE(ra.submitted_by, sir.requester_user_id) as submitted_by,
        ra.current_approver_id,
        u_requester.FullName as requester_name,
        u_current_approver.FullName as current_approver_name,
        d_approver.strDesignation as current_approver_designation,
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        COALESCE(item_counts.item_count, 0) as total_items,
        w.Name as requester_wing_name
      FROM stock_issuance_requests sir
      LEFT JOIN request_approvals ra ON ra.request_id = sir.id
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = COALESCE(ra.submitted_by, sir.requester_user_id)
      LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
      LEFT JOIN tblUserDesignations d_approver ON u_current_approver.intDesignationID = d_approver.intDesignationID
      LEFT JOIN WingsInformation w ON u_requester.intWingID = w.Id
      LEFT JOIN (
        SELECT request_id, COUNT(*) as item_count
        FROM stock_issuance_items 
        GROUP BY request_id
      ) item_counts ON item_counts.request_id = sir.id
      WHERE u_requester.intWingID IS NOT NULL 
      AND u_requester.intWingID = @wingId
      AND sir.request_type = 'Organizational'
      ORDER BY COALESCE(ra.submitted_date, sir.submitted_at) DESC`;
    console.log('📊 WING REQUESTS QUERY:', wingRequestsQuery);
    console.log('🔢 Wing ID parameter:', userWingId, 'Type:', typeof userWingId);
    const requestsResult = await pool.request()
      .input('wingId', sql.Int, parseInt(userWingId))
      .query(wingRequestsQuery);
    console.log('✅ Query executed successfully. Records:', requestsResult.recordset.length);
    const requests = [];
    for (const request of requestsResult.recordset) {
      // Load items for each request
      let items = [];
      try {
        console.log('Loading items for request:', request.request_id);
        const stockItemsQuery = `
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
          WHERE si_items.request_id = @requestId
          ORDER BY 
            CASE 
              WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
              ELSE im.nomenclature
            END;
        `;
        const stockItemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request.request_id)
          .query(stockItemsQuery);
        console.log('Items found for', request.request_id, ':', stockItemsResult.recordset.length);
        items = stockItemsResult.recordset || [];
      } catch (itemError) {
        console.log('ERROR loading items for request', request.request_id, ':', itemError.message);
        console.log('Items error details:', itemError);
        items = [];
      }
      const processedRequest = {
        id: request.id,
        request_id: request.request_id,
        request_type: request.request_type || 'stock_issuance',
        title: request.title || 'Stock Issuance Request',
        description: request.description || 'Request for inventory items',
        requested_date: request.requested_date || request.submitted_date,
        submitted_date: request.submitted_date,
        requester_name: request.requester_name || 'Unknown User',
        requester_office: null,
        requester_wing: request.requester_wing_name || 'Unknown Wing',
        current_approver_name: request.current_approver_name,
        current_approver_designation: request.current_approver_designation,
        my_action: 'viewing', // Since this is wing history, not personal approval history
        my_action_date: null,
        my_comments: null,
        forwarded_to: null,
        current_status: request.current_status || 'pending',
        final_status: request.current_status || 'pending',
        items: items,
        total_items: request.total_items || 0,
        priority: 'Medium'
      };
      requests.push(processedRequest);
    }
    console.log(`✅ Found ${requests.length} wing request history entries for wing ${userWingId}`);
    console.log('📋 Wing Requests:', requests.map(r => ({ id: r.id, title: r.title, requester: r.requester_name })));
    res.json({
      success: true,
      requests: requests,
      total: requests.length,
      wing_name: userWingName || 'Your Wing',
      debug_request_ids: requests.map(r => ({ 
        approval_id: r.id, 
        request_id: r.request_id,
        view_details_url: `/dashboard/request-details/${r.request_id}`,
        item_count: r.total_items
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching wing request history:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch wing request history: ' + error.message,
      details: error.stack
    });
  }
});
// =============================================================================
// ISSUANCE WORKFLOW API ENDPOINTS (NEW)
// =============================================================================
// Determine issuance source - checks wing/admin inventory availability
app.post('/api/issuance/determine-source', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { stock_issuance_item_id, item_master_id, required_quantity, wing_id } = req.body;
    if (!item_master_id || !required_quantity || !wing_id) {
      return res.status(400).json({ error: 'item_master_id, required_quantity, and wing_id are required' });
    }
    // Call the stored procedure
    const result = await pool.request()
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('required_quantity', sql.Int, required_quantity)
      .input('wing_id', sql.Int, wing_id)
      .execute('sp_DetermineIssuanceSource');
    if (result.recordset.length === 0) {
      return res.json({
        success: true,
        issuance_source: 'procurement',
        wing_available: 0,
        admin_available: 0,
        message: 'Item not available in stock - procurement required'
      });
    }
    const sourceData = result.recordset[0];
    res.json({
      success: true,
      issuance_source: sourceData.issuance_source,
      wing_available: sourceData.wing_available_quantity || 0,
      admin_available: sourceData.admin_available_quantity || 0,
      total_available: (sourceData.wing_available_quantity || 0) + (sourceData.admin_available_quantity || 0),
      message: `Item can be issued from ${sourceData.issuance_source}`,
      details: sourceData
    });
  } catch (error) {
    console.error('Error determining issuance source:', error);
    res.status(500).json({ 
      error: 'Failed to determine issuance source', 
      details: error.message 
    });
  }
});
// Issue item from wing store
app.post('/api/issuance/issue-from-wing', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { stock_issuance_item_id, stock_issuance_request_id, item_master_id, quantity, wing_id, issued_by } = req.body;
    if (!stock_issuance_item_id || !quantity || !issued_by) {
      return res.status(400).json({ error: 'Required fields: stock_issuance_item_id, quantity, issued_by' });
    }
    // Call stored procedure
    const result = await pool.request()
      .input('stock_issuance_item_id', sql.UniqueIdentifier, stock_issuance_item_id)
      .input('stock_issuance_request_id', sql.UniqueIdentifier, stock_issuance_request_id)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('quantity', sql.Int, quantity)
      .input('wing_id', sql.Int, wing_id)
      .input('issued_by', sql.NVarChar, issued_by)
      .execute('sp_IssueFromWingStore');
    const transactionResult = result.recordset[0] || {};
    res.json({
      success: true,
      message: 'Item issued from wing store successfully',
      transaction_id: transactionResult.transaction_id,
      quantity_issued: transactionResult.quantity_issued,
      remaining_wing_stock: transactionResult.remaining_wing_stock,
      issued_at: transactionResult.issued_at
    });
  } catch (error) {
    console.error('Error issuing from wing store:', error);
    res.status(500).json({ 
      error: 'Failed to issue from wing store', 
      details: error.message 
    });
  }
});
// Issue item from admin store
app.post('/api/issuance/issue-from-admin', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { stock_issuance_item_id, stock_issuance_request_id, item_master_id, quantity, issued_by } = req.body;
    if (!stock_issuance_item_id || !quantity || !issued_by) {
      return res.status(400).json({ error: 'Required fields: stock_issuance_item_id, quantity, issued_by' });
    }
    // Call stored procedure
    const result = await pool.request()
      .input('stock_issuance_item_id', sql.UniqueIdentifier, stock_issuance_item_id)
      .input('stock_issuance_request_id', sql.UniqueIdentifier, stock_issuance_request_id)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('quantity', sql.Int, quantity)
      .input('issued_by', sql.NVarChar, issued_by)
      .execute('sp_IssueFromAdminStore');
    const transactionResult = result.recordset[0] || {};
    res.json({
      success: true,
      message: 'Item issued from admin store successfully',
      transaction_id: transactionResult.transaction_id,
      quantity_issued: transactionResult.quantity_issued,
      remaining_admin_stock: transactionResult.remaining_admin_stock,
      issued_at: transactionResult.issued_at
    });
  } catch (error) {
    console.error('Error issuing from admin store:', error);
    res.status(500).json({ 
      error: 'Failed to issue from admin store', 
      details: error.message 
    });
  }
});
// Handle verification result - update item status based on inventory check
app.post('/api/issuance/handle-verification-result', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { 
      stock_issuance_item_id, 
      verification_result, // 'available', 'partial', 'unavailable'
      available_quantity,
      verification_notes,
      verified_by 
    } = req.body;
    if (!stock_issuance_item_id || !verification_result) {
      return res.status(400).json({ error: 'stock_issuance_item_id and verification_result are required' });
    }
    // Call stored procedure
    const result = await pool.request()
      .input('stock_issuance_item_id', sql.UniqueIdentifier, stock_issuance_item_id)
      .input('verification_result', sql.NVarChar, verification_result)
      .input('available_quantity', sql.Int, available_quantity || 0)
      .input('verification_notes', sql.NVarChar, verification_notes || null)
      .input('verified_by', sql.NVarChar, verified_by)
      .execute('sp_HandleVerificationResult');
    const verificationResult = result.recordset[0] || {};
    res.json({
      success: true,
      message: `Item verification recorded - ${verification_result}`,
      item_status: verificationResult.new_status,
      available_quantity: verificationResult.available_quantity,
      verified_at: verificationResult.verified_at
    });
  } catch (error) {
    console.error('Error handling verification result:', error);
    res.status(500).json({ 
      error: 'Failed to handle verification result', 
      details: error.message 
    });
  }
});
// Finalize issuance - mark request as finalized after all items issued
app.post('/api/issuance/finalize', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { stock_issuance_request_id, finalized_by } = req.body;
    if (!stock_issuance_request_id || !finalized_by) {
      return res.status(400).json({ error: 'stock_issuance_request_id and finalized_by are required' });
    }
    // Call stored procedure
    const result = await pool.request()
      .input('stock_issuance_request_id', sql.UniqueIdentifier, stock_issuance_request_id)
      .input('finalized_by', sql.NVarChar, finalized_by)
      .execute('sp_FinalizeIssuance');
    const finalizeResult = result.recordset[0] || {};
    res.json({
      success: true,
      message: 'Issuance finalized successfully',
      request_status: finalizeResult.request_status,
      total_items: finalizeResult.total_items,
      issued_items: finalizeResult.issued_items,
      rejected_items: finalizeResult.rejected_items,
      finalized_at: finalizeResult.finalized_at
    });
  } catch (error) {
    console.error('Error finalizing issuance:', error);
    res.status(500).json({ 
      error: 'Failed to finalize issuance', 
      details: error.message 
    });
  }
});
// Get issuance status for a request - shows what items are issued, pending, rejected
app.get('/api/issuance/status/:stock_issuance_request_id', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const { stock_issuance_request_id } = req.params;
    // Get issuance status from view
    const result = await pool.request()
      .input('request_id', sql.UniqueIdentifier, stock_issuance_request_id)
      .query(`
        SELECT 
          request_id,
          total_items,
          issued_items,
          rejected_items,
          pending_items,
          issuance_rate,
          last_updated,
          finalized_at
        FROM View_Issuance_Status
        WHERE request_id = @request_id
      `);
    if (result.recordset.length === 0) {
      return res.json({
        success: true,
        request_id: stock_issuance_request_id,
        total_items: 0,
        issued_items: 0,
        rejected_items: 0,
        pending_items: 0,
        issuance_rate: 0,
        message: 'No issuance data found for this request'
      });
    }
    const statusData = result.recordset[0];
    res.json({
      success: true,
      ...statusData,
      completion_percentage: statusData.issuance_rate || 0,
      is_complete: (statusData.pending_items || 0) === 0
    });
  } catch (error) {
    console.error('Error fetching issuance status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch issuance status', 
      details: error.message 
    });
  }
});
// =============================================================================
// APPROVAL WORKFLOW API ENDPOINTS
// =============================================================================
// Get approval items for a specific request
app.get('/api/approvals/request/:requestId/items', async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          ai.id,
          ai.nomenclature,
          ai.decision_type,
          ai.requested_quantity
        FROM approval_items ai
        INNER JOIN request_approvals ra ON ra.id = ai.request_approval_id
        WHERE ra.request_id = @requestId
        ORDER BY ai.nomenclature
      `);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching approval items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approval items'
    });
  }
});
// Get item tracking history
app.get('/api/approvals/item/:itemId/tracking', async (req, res) => {
  try {
    const { itemId } = req.params;
    // Get current item status
    const itemResult = await pool.request()
      .input('itemId', sql.UniqueIdentifier, itemId)
      .query(`
        SELECT 
          ai.id,
          ai.nomenclature,
          ai.decision_type,
          ai.request_approval_id
        FROM approval_items ai
        WHERE ai.id = @itemId
      `);
    if (itemResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    const item = itemResult.recordset[0];
    // Get history from approval_history table for this request_approval
    const historyResult = await pool.request()
      .input('requestApprovalId', sql.UniqueIdentifier, item.request_approval_id)
      .query(`
        SELECT 
          ah.action_type as action,
          ah.action_date as timestamp,
          au.FullName as actor_name,
          ah.comments
        FROM approval_history ah
        LEFT JOIN AspNetUsers au ON au.Id = ah.action_by
        WHERE ah.request_approval_id = @requestApprovalId
        ORDER BY ah.action_date DESC
      `);
    res.json({
      success: true,
      data: {
        id: item.id,
        nomenclature: item.nomenclature,
        decision_type: item.decision_type,
        history: historyResult.recordset || []
      }
    });
  } catch (error) {
    console.error('Error fetching item tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item tracking: ' + error.message
    });
  }
});
// Get pending approvals for the current user
app.get('/api/approvals/my-approvals', async (req, res) => {
  try {
    console.log('🔍 API CALLED: /api/approvals/my-approvals');
    console.log('Query params:', req.query);
    console.log('Fetching my pending approvals...');
    // Allow userId from query params or session
    let userId = req.query.userId || req.session?.userId;
    console.log('UserId from query:', req.query.userId);
    console.log('UserId from session:', req.session?.userId);
    console.log('Final userId:', userId);
    // TEMPORARY: Allow testing without session authentication when userId is provided
    const hasSession = !!req.session?.userId;
    const hasQueryUserId = !!req.query.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to view your approvals.'
      });
    }
    // Allow access if user has session OR if testing with query userId
    if (!hasSession && !hasQueryUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in first.',
        details: 'No user session found. You must be logged in to view your approvals.'
      });
    }
    const status = req.query.status || 'pending';
    console.log('User ID:', userId, 'Status filter:', status);
    // Build WHERE clause based on status and items with specific decision types
    let approvalsQuery = '';
    if (status === 'pending') {
      approvalsQuery = `
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT ra2.request_id FROM request_approvals ra2
          INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
          WHERE ai.decision_type = 'PENDING'
        )
        ORDER BY ra.submitted_date DESC`;
    } else if (status === 'approved') {
      approvalsQuery = `
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT ra2.request_id FROM request_approvals ra2
          INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
          WHERE ai.decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')
        )
        ORDER BY ra.submitted_date DESC`;
    } else if (status === 'rejected') {
      approvalsQuery = `
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT ra2.request_id FROM request_approvals ra2
          INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
          WHERE ai.decision_type = 'REJECT'
        )
        ORDER BY ra.submitted_date DESC`;
    } else if (status === 'returned') {
      approvalsQuery = `
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT ra2.request_id FROM request_approvals ra2
          INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
          WHERE ai.decision_type = 'RETURN'
        )
        ORDER BY ra.submitted_date DESC`;
    } else if (status === 'forwarded') {
      approvalsQuery = `
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT ra2.request_id FROM request_approvals ra2
          INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
          WHERE ai.decision_type IN ('FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN')
        )
        ORDER BY ra.submitted_date DESC`;
    }
    const approvalsResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(approvalsQuery);
    console.log('✅ Found', approvalsResult.recordset.length, 'pending approvals for user', userId);
    const approvals = [];
    for (const approval of approvalsResult.recordset) {
      // Load items for each approval from approval_items table
      let items = [];
      try {
        const approvalItemsQuery = `
          SELECT
            ai.id as item_id,
            ai.nomenclature as item_name,
            ai.custom_item_name,
            ai.requested_quantity,
            ai.allocated_quantity as approved_quantity,
            COALESCE(ai.unit, 'units') as unit,
            ai.decision_type,
            ai.rejection_reason
          FROM approval_items ai
          WHERE ai.request_approval_id = @approvalId
          ORDER BY ai.nomenclature;
        `;
        const approvalItemsResult = await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approval.id)
          .query(approvalItemsQuery);
        items = approvalItemsResult.recordset || [];
      } catch (itemError) {
        console.log('Could not load items for approval', approval.id, ':', itemError.message);
        items = [];
      }
      const processedApproval = {
        id: approval.id,
        request_id: approval.request_id,
        request_type: approval.request_type || 'stock_issuance',
        scope_type: approval.scope_type || 'Individual',
        title: approval.title || 'Stock Issuance Request',
        description: approval.description || 'Request for inventory items',
        requested_date: approval.requested_date || approval.submitted_date,
        submitted_date: approval.submitted_date,
        requester_name: approval.requester_name || 'Unknown User',
        submitted_by_name: approval.requester_name || 'Unknown User',  // ← Add this field for frontend
        current_approver_name: approval.current_approver_name,
        current_status: approval.current_status || 'pending',
        items: items,
        total_items: approval.total_items || 0,
        priority: 'Medium'
      };
      approvals.push(processedApproval);
    }
    res.json({
      success: true,
      data: approvals,
      total: approvals.length,
      message: `Found ${approvals.length} ${status} approvals`
    });
  } catch (error) {
    console.error('❌ Error fetching my approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals: ' + error.message
    });
  }
});
// Get approval dashboard stats for the current user
app.get('/api/approvals/dashboard', async (req, res) => {
  try {
    console.log('🔍 API CALLED: /api/approvals/dashboard');
    console.log('Fetching approval dashboard stats...');
    // Get userId from query parameter or session
    let userId = req.query.userId || req.session?.userId;
    if (!userId) {
      console.log('❌ No user ID provided');
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    console.log('User ID:', userId);
    // Get dashboard statistics - count by items with specific decision types
    const statsQuery = `
      SELECT
        (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
         INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
         WHERE ra.current_approver_id = @userId
         AND ai.decision_type = 'PENDING') as pending_count,
        (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
         INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
         WHERE ra.current_approver_id = @userId
         AND ai.decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')) as approved_count,
        (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
         INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
         WHERE ra.current_approver_id = @userId
         AND ai.decision_type = 'REJECT') as rejected_count,
        (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
         INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
         WHERE ra.current_approver_id = @userId
         AND ai.decision_type IN ('FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN')) as forwarded_count,
        (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
         INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
         WHERE ra.current_approver_id = @userId
         AND ai.decision_type = 'RETURN') as returned_count`;
    const statsResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(statsQuery);
    const stats = statsResult.recordset[0] || {
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      forwarded_count: 0,
      returned_count: 0
    };
    res.json({
      success: true,
      pending_count: stats.pending_count || 0,
      approved_count: stats.approved_count || 0,
      rejected_count: stats.rejected_count || 0,
      forwarded_count: stats.forwarded_count || 0,
      returned_count: stats.returned_count || 0
    });
  } catch (error) {
    console.error('❌ Error fetching approval dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data: ' + error.message
    });
  }
});
// =====================================================================
// ANNUAL TENDER SYSTEM APIS
// =====================================================================
// 1. GET ALL ANNUAL TENDERS
app.get('/api/annual-tenders', async (req, res) => {
  try {
    const status = req.query.status || null;
    let query = `
      SELECT 
        id,
        tender_number,
        title,
        description,
        start_date,
        end_date,
        status,
        total_budget,
        remarks,
        created_by,
        created_at,
        updated_at
      FROM annual_tenders
      WHERE 1=1
    `;
    if (status) {
      query += ` AND status = @status`;
    }
    query += ` ORDER BY created_at DESC`;
    const request = pool.request();
    if (status) {
      request.input('status', sql.NVarChar(50), status);
    }
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching annual tenders:', error);
    res.status(500).json({ error: 'Failed to fetch annual tenders', details: error.message });
  }
});
// 2. GET SINGLE ANNUAL TENDER WITH DETAILS
app.get('/api/annual-tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Get tender
    const tenderResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM annual_tenders WHERE id = @id`);
    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Annual tender not found' });
    }
    const tender = tenderResult.recordset[0];
    // Get groups in this tender
    const groupsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          atg.id,
          atg.group_id,
          ig.group_code,
          ig.group_name,
          ig.description
        FROM annual_tender_groups atg
        INNER JOIN item_groups ig ON atg.group_id = ig.id
        WHERE atg.annual_tender_id = @tenderId
        ORDER BY ig.group_name
      `);
    // Get vendors assigned to this tender
    const vendorsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT DISTINCT
          atv.id,
          atv.vendor_id,
          atv.group_id,
          ig.group_name,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          atv.status
        FROM annual_tender_vendors atv
        INNER JOIN item_groups ig ON atv.group_id = ig.id
        INNER JOIN vendors v ON atv.vendor_id = v.id
        WHERE atv.annual_tender_id = @tenderId AND atv.status = 'Active'
        ORDER BY ig.group_name, v.vendor_name
      `);
    res.json({
      ...tender,
      groups: groupsResult.recordset,
      vendors: vendorsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching annual tender:', error);
    res.status(500).json({ error: 'Failed to fetch annual tender', details: error.message });
  }
});
// 3. CREATE ANNUAL TENDER
app.post('/api/annual-tenders', async (req, res) => {
  try {
    const { tender_number, title, description, start_date, end_date, total_budget, remarks, created_by, groupIds } = req.body;
    if (!tender_number || !title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    // Insert tender
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('tender_number', sql.NVarChar(100), tender_number)
      .input('title', sql.NVarChar(255), title)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('status', sql.NVarChar(50), 'Active')
      .input('total_budget', sql.Decimal(15, 2), total_budget || null)
      .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
      .input('created_by', sql.NVarChar(450), created_by)
      .query(`
        INSERT INTO annual_tenders (id, tender_number, title, description, start_date, end_date, status, total_budget, remarks, created_by, created_at, updated_at)
        VALUES (@id, @tender_number, @title, @description, @start_date, @end_date, @status, @total_budget, @remarks, @created_by, GETDATE(), GETDATE())
      `);
    // Assign groups if provided
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      for (const groupId of groupIds) {
        const groupAssignId = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, groupAssignId)
          .input('tenderId', sql.UniqueIdentifier, id)
          .input('groupId', sql.UniqueIdentifier, groupId)
          .query(`
            INSERT INTO annual_tender_groups (id, annual_tender_id, group_id, created_at)
            VALUES (@id, @tenderId, @groupId, GETDATE())
          `);
      }
    }
    res.json({ success: true, id, message: 'Annual tender created successfully' });
  } catch (error) {
    console.error('❌ Error creating annual tender:', error);
    res.status(500).json({ error: 'Failed to create annual tender', details: error.message });
  }
});
// 4. GET ALL ITEM GROUPS
app.get('/api/item-groups', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        ig.id, 
        ig.group_code, 
        ig.group_name, 
        ig.description, 
        ig.is_active, 
        ig.created_at,
        COUNT(gi.id) as item_count
      FROM item_groups ig
      LEFT JOIN group_items gi ON ig.id = gi.group_id
      WHERE ig.is_active = 1
      GROUP BY ig.id, ig.group_code, ig.group_name, ig.description, ig.is_active, ig.created_at
      ORDER BY ig.group_name
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching item groups:', error);
    res.status(500).json({ error: 'Failed to fetch item groups' });
  }
});
// 5. CREATE ITEM GROUP
app.post('/api/item-groups', async (req, res) => {
  try {
    const { group_code, group_name, description, itemIds, created_by } = req.body;
    console.log('📥 Item Group Creation Request:', {
      group_code,
      group_name,
      description,
      itemIds,
      itemIdsLength: itemIds ? itemIds.length : 0,
      created_by
    });
    if (!group_code || !group_name) {
      return res.status(400).json({ error: 'Group code and name are required' });
    }
    const id = uuidv4();
    // Create group
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('group_code', sql.NVarChar(50), group_code)
      .input('group_name', sql.NVarChar(255), group_name)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('created_by', sql.NVarChar(450), created_by)
      .query(`
        INSERT INTO item_groups (id, group_code, group_name, description, is_active, created_by, created_at, updated_at)
        VALUES (@id, @group_code, @group_name, @description, 1, @created_by, GETDATE(), GETDATE())
      `);
    // Add items if provided
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      console.log(`✅ Adding ${itemIds.length} items to group ${id}`);
      for (const itemId of itemIds) {
        const groupItemId = uuidv4();
        console.log(`  - Adding item ${itemId}`);
        await pool.request()
          .input('id', sql.UniqueIdentifier, groupItemId)
          .input('groupId', sql.UniqueIdentifier, id)
          .input('itemId', sql.UniqueIdentifier, itemId)
          .query(`
            INSERT INTO group_items (id, group_id, item_master_id, created_at)
            VALUES (@id, @groupId, @itemId, GETDATE())
          `);
      }
    } else {
      console.log('⚠️ No items provided for this group');
    }
    res.json({ success: true, id, message: 'Item group created successfully' });
  } catch (error) {
    console.error('❌ Error creating item group:', error);
    res.status(500).json({ error: 'Failed to create item group', details: error.message });
  }
});
// 6. GET ITEMS IN A GROUP
app.get('/api/item-groups/:groupId/items', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log(`📥 Fetching items for group: ${groupId}`);
    // First check if group exists
    const groupCheck = await pool.request()
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`SELECT id, group_code, group_name FROM item_groups WHERE id = @groupId`);
    console.log(`Group found:`, groupCheck.recordset.length > 0 ? groupCheck.recordset[0] : 'NOT FOUND');
    // Check group_items records
    const groupItemsCheck = await pool.request()
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`SELECT id, group_id, item_master_id FROM group_items WHERE group_id = @groupId`);
    console.log(`Group items records found: ${groupItemsCheck.recordset.length}`);
    if (groupItemsCheck.recordset.length > 0) {
      console.log('Sample group_items:', groupItemsCheck.recordset[0]);
    }
    const result = await pool.request()
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT 
          gi.id,
          gi.item_master_id,
          im.id as item_id,
          im.nomenclature,
          im.item_code,
          im.unit,
          gi.created_at
        FROM group_items gi
        INNER JOIN item_masters im ON gi.item_master_id = im.id
        WHERE gi.group_id = @groupId
        ORDER BY im.nomenclature
      `);
    console.log(`✅ Found ${result.recordset.length} items for group ${groupId}`);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching group items:', error);
    res.status(500).json({ error: 'Failed to fetch group items' });
  }
});
// 8. DELETE ITEM GROUP
app.delete('/api/item-groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log(`🗑️ Deleting item group: ${groupId}`);
    const result = await pool.request()
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        DELETE FROM item_groups
        WHERE id = @groupId
      `);
    console.log(`✅ Item group deleted successfully`);
    res.json({ success: true, message: 'Item group deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting item group:', error);
    res.status(500).json({ error: 'Failed to delete item group', details: error.message });
  }
});
// 9. ASSIGN VENDORS TO GROUPS IN TENDER
app.post('/api/annual-tenders/:tenderId/assign-vendors', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { assignments, created_by } = req.body;
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments must be an array' });
    }
    // Delete existing assignments
    await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`DELETE FROM annual_tender_vendors WHERE annual_tender_id = @tenderId`);
    // Add new assignments
    for (const assignment of assignments) {
      const { groupId, vendorIds } = assignment;
      for (const vendorId of vendorIds) {
        const id = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('tenderId', sql.UniqueIdentifier, tenderId)
          .input('groupId', sql.UniqueIdentifier, groupId)
          .input('vendorId', sql.UniqueIdentifier, vendorId)
          .input('created_by', sql.NVarChar(450), created_by)
          .query(`
            INSERT INTO annual_tender_vendors (id, annual_tender_id, group_id, vendor_id, assignment_date, status, created_by, created_at)
            VALUES (@id, @tenderId, @groupId, @vendorId, GETDATE(), 'Active', @created_by, GETDATE())
          `);
      }
    }
    res.json({ success: true, message: 'Vendors assigned successfully' });
  } catch (error) {
    console.error('❌ Error assigning vendors:', error);
    res.status(500).json({ error: 'Failed to assign vendors', details: error.message });
  }
});
// 8. GET VENDORS FOR A GROUP IN TENDER
app.get('/api/annual-tenders/:tenderId/groups/:groupId/vendors', async (req, res) => {
  try {
    const { tenderId, groupId } = req.params;
    const result = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT 
          atv.id,
          atv.vendor_id,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          v.email,
          v.phone,
          atv.status
        FROM annual_tender_vendors atv
        INNER JOIN vendors v ON atv.vendor_id = v.id
        WHERE atv.annual_tender_id = @tenderId 
          AND atv.group_id = @groupId
          AND atv.status = 'Active'
        ORDER BY v.vendor_name
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching group vendors:', error);
    res.status(500).json({ error: 'Failed to fetch group vendors' });
  }
});
// GET vendors for a specific category in a tender
app.get('/api/annual-tenders/:tenderId/categories/:categoryId/vendors', async (req, res) => {
  try {
    const { tenderId, categoryId } = req.params;
    const result = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('categoryId', sql.UniqueIdentifier, categoryId)
      .query(`
        SELECT 
          atv.id,
          atv.vendor_id,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          v.email,
          v.phone,
          atv.status
        FROM annual_tender_vendors atv
        INNER JOIN vendors v ON atv.vendor_id = v.id
        WHERE atv.annual_tender_id = @tenderId 
          AND atv.category_id = @categoryId
          AND atv.status = 'Active'
        ORDER BY v.vendor_name
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching category vendors:', error);
    res.status(500).json({ error: 'Failed to fetch category vendors' });
  }
});
// 9. CREATE/UPDATE VENDOR PROPOSAL
app.post('/api/vendor-proposals', async (req, res) => {
  try {
    const { annual_tender_id, group_id, vendor_id, item_master_id, proposed_unit_price, created_by } = req.body;
    if (!annual_tender_id || !group_id || !vendor_id || !item_master_id || proposed_unit_price === null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if proposal exists
    const existingResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, annual_tender_id)
      .input('vendorId', sql.UniqueIdentifier, vendor_id)
      .input('itemId', sql.UniqueIdentifier, item_master_id)
      .query(`
        SELECT id FROM vendor_proposals 
        WHERE annual_tender_id = @tenderId 
          AND vendor_id = @vendorId 
          AND item_master_id = @itemId
      `);
    if (existingResult.recordset.length > 0) {
      // Update existing
      await pool.request()
        .input('tenderId', sql.UniqueIdentifier, annual_tender_id)
        .input('vendorId', sql.UniqueIdentifier, vendor_id)
        .input('itemId', sql.UniqueIdentifier, item_master_id)
        .input('price', sql.Decimal(15, 2), proposed_unit_price)
        .input('updated_by', sql.NVarChar(450), created_by)
        .query(`
          UPDATE vendor_proposals
          SET proposed_unit_price = @price, updated_by = @updated_by, updated_at = GETDATE()
          WHERE annual_tender_id = @tenderId 
            AND vendor_id = @vendorId 
            AND item_master_id = @itemId
        `);
    } else {
      // Create new
      const id = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('tenderId', sql.UniqueIdentifier, annual_tender_id)
        .input('groupId', sql.UniqueIdentifier, group_id)
        .input('vendorId', sql.UniqueIdentifier, vendor_id)
        .input('itemId', sql.UniqueIdentifier, item_master_id)
        .input('price', sql.Decimal(15, 2), proposed_unit_price)
        .input('created_by', sql.NVarChar(450), created_by)
        .query(`
          INSERT INTO vendor_proposals (id, annual_tender_id, group_id, vendor_id, item_master_id, proposed_unit_price, created_by, created_at, updated_at)
          VALUES (@id, @tenderId, @groupId, @vendorId, @itemId, @price, @created_by, GETDATE(), GETDATE())
        `);
    }
    res.json({ success: true, message: 'Proposal updated successfully' });
  } catch (error) {
    console.error('❌ Error saving proposal:', error);
    res.status(500).json({ error: 'Failed to save proposal', details: error.message });
  }
});
// 10. GET ALL VENDOR PROPOSALS FOR A TENDER
app.get('/api/annual-tenders/:tenderId/vendor-proposals', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const result = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          vp.id,
          vp.vendor_id,
          vp.group_id,
          vp.item_master_id,
          vp.proposed_unit_price,
          ig.group_name,
          v.vendor_name,
          im.nomenclature,
          im.unit
        FROM vendor_proposals vp
        INNER JOIN item_groups ig ON vp.group_id = ig.id
        INNER JOIN vendors v ON vp.vendor_id = v.id
        INNER JOIN item_masters im ON vp.item_master_id = im.id
        WHERE vp.annual_tender_id = @tenderId
        ORDER BY ig.group_name, v.vendor_name, im.nomenclature
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});
console.log('✅ Annual Tender System APIs loaded');
// ============================================================================
// PURCHASE ORDERS APIs
// ============================================================================
// GET /api/purchase-orders - Get all POs with filters
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const { tenderId, vendorId, status, startDate, endDate } = req.query;
    // Debug: Log incoming parameters
    console.log('🔍 GET /api/purchase-orders params:', { tenderId, vendorId, status, startDate, endDate });
    // Validate UUID format
    const isValidUUID = (uuid) => {
      if (!uuid || typeof uuid !== 'string') return false;
      const trimmed = String(uuid).trim();
      if (!trimmed) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(trimmed);
    };
    let query = `
      SELECT 
        po.id,
        po.po_number,
        po.tender_id,
        po.vendor_id,
        po.po_date,
        po.total_amount,
        po.status,
        po.remarks,
        po.created_at,
        t.title as tender_title,
        t.tender_type,
        v.vendor_name,
        (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) as item_count
      FROM purchase_orders po
      LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
      LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
      WHERE 1=1
    `;
    const request = pool.request();
    if (tenderId && isValidUUID(tenderId)) {
      query += ' AND po.tender_id = @tenderId';
      request.input('tenderId', sql.UniqueIdentifier, tenderId.trim());
    }
    if (vendorId && isValidUUID(vendorId)) {
      query += ' AND po.vendor_id = @vendorId';
      request.input('vendorId', sql.UniqueIdentifier, vendorId.trim());
    }
    if (status && typeof status === 'string' && status.trim() && status.trim() !== 'undefined') {
      query += ' AND po.status = @status';
      request.input('status', sql.NVarChar, status.trim());
    }
    if (startDate && typeof startDate === 'string' && startDate.trim() && startDate.trim() !== 'undefined') {
      try {
        const parsedDate = new Date(startDate.trim());
        if (!isNaN(parsedDate.getTime())) {
          query += ' AND po.po_date >= @startDate';
          request.input('startDate', sql.DateTime, parsedDate);
        }
      } catch (e) {
        console.warn('⚠️ Invalid startDate format:', startDate);
      }
    }
    if (endDate && typeof endDate === 'string' && endDate.trim() && endDate.trim() !== 'undefined') {
      try {
        const parsedDate = new Date(endDate.trim());
        if (!isNaN(parsedDate.getTime())) {
          query += ' AND po.po_date <= @endDate';
          request.input('endDate', sql.DateTime, parsedDate);
        }
      } catch (e) {
        console.warn('⚠️ Invalid endDate format:', endDate);
      }
    }
    query += ' ORDER BY po.created_at DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching POs:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      state: error.state
    });
    // If table doesn't exist or there's a schema issue, return empty array
    if (error.message && (error.message.includes('Invalid object name') || error.message.includes('purchase_orders'))) {
      console.warn('⚠️ Purchase orders table may not exist or has schema issues. Returning empty array.');
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to fetch purchase orders', details: error.message });
    }
  }
});
// GET /api/purchase-orders/:id - Get specific PO with items
app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Get PO details
    const poResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          po.id,
          po.po_number,
          po.tender_id,
          po.vendor_id,
          po.po_date,
          po.total_amount,
          po.status,
          po.remarks,
          po.created_at,
          po.updated_at,
          t.title as tender_title,
          t.tender_type,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          v.phone,
          v.email
        FROM purchase_orders po
        LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
        LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
        WHERE po.id = @id
      `);
    if (poResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    const po = poResult.recordset[0];
    // Get PO items
    const itemsResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          poi.id,
          poi.po_id,
          poi.item_master_id,
          poi.quantity,
          poi.unit_price,
          poi.total_price,
          poi.specifications,
          im.nomenclature,
          im.unit,
          im.category_id,
          c.category_name
        FROM purchase_order_items poi
        INNER JOIN item_masters im ON poi.item_master_id = im.id
        LEFT JOIN categories c ON im.category_id = c.id
        WHERE poi.po_id = @poId
        ORDER BY im.nomenclature
      `);
    res.json({
      ...po,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching PO details:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order details' });
  }
});
// POST /api/purchase-orders - Create POs from tender items
// ✅ ENHANCED: Handles multiple vendors in annual tenders
app.post('/api/purchase-orders', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const { tenderId, selectedItems, poDate, itemVendors, itemPrices, itemQuantities } = req.body;
    console.log('📦 PO CREATION REQUEST RECEIVED:');
    console.log('   - tenderId:', tenderId);
    console.log('   - selectedItems count:', selectedItems?.length);
    console.log('   - poDate:', poDate);
    if (!tenderId || !selectedItems || selectedItems.length === 0 || !poDate) {
      return res.status(400).json({ error: 'Missing required fields: tenderId, selectedItems, poDate' });
    }
    // First, get tender info to know its type
    const tenderRequest = await transaction.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`SELECT tender_type, vendor_id FROM tenders WHERE id = @tenderId`);
    if (tenderRequest.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Tender not found' });
    }
    const tender = tenderRequest.recordset[0];
    const isSingleVendorType = ['contract', 'spot-purchase']
      .includes(tender.tender_type?.toLowerCase());
    // Get the latest PO number to generate new ones
    const lastPoRequest = transaction.request();
    const lastPoResult = await lastPoRequest.query(`
      SELECT MAX(CAST(SUBSTRING(po_number, PATINDEX('%[0-9]%', po_number), LEN(po_number)) AS INT)) as max_number
      FROM purchase_orders
      WHERE po_number LIKE 'PO%'
    `);
    const lastNumber = lastPoResult.recordset[0]?.max_number || 0;
    let poCounter = lastNumber + 1;
    // Get all items from tender_items
    const allItems = [];
    const itemPricesMap = itemPrices || {};
    const itemVendorsMap = itemVendors || {};
    const itemQuantitiesMap = itemQuantities || {};
    for (const itemId of selectedItems) {
      // ✅ NEW: Fetch tender_items with all details
      const itemResult = await transaction.request()
        .input('itemId', sql.UniqueIdentifier, itemId)
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .query(`
          SELECT 
            ti.id,
            ti.item_master_id,
            ti.quantity,
            ti.nomenclature,
            ti.vendor_id,
            ti.estimated_unit_price,
            im.id as item_master_id_lookup
          FROM tender_items ti
          LEFT JOIN item_masters im ON ti.item_master_id = im.id
          WHERE ti.id = @itemId AND ti.tender_id = @tenderId
        `);
      if (itemResult.recordset.length > 0) {
        const item = itemResult.recordset[0];
        const unitPrice = itemPricesMap[itemId] || item.estimated_unit_price || 0;
        const quantity = itemQuantitiesMap[itemId] || item.quantity || 1;
        // ✅ OPTION A: Use ONLY vendor_id from tender_items (single vendor per item)
        let itemVendorId;
        if (isSingleVendorType) {
          // For contract/spot: use tender's vendor
          itemVendorId = tender.vendor_id;
        } else {
          // For annual-tender: use vendor_id from tender_items (populated during item creation)
          itemVendorId = item.vendor_id || itemVendorsMap[itemId];
        }
        if (!itemVendorId) {
          console.warn(`⚠️ No vendor_id found for item ${itemId}`);
          await transaction.rollback();
          return res.status(400).json({ error: `No vendor selected for item ${itemId}` });
        }
        allItems.push({
          ...item,
          unit_price: unitPrice,
          quantity: quantity,
          vendor_id: itemVendorId
        });
      }
    }
    if (allItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No valid items found for the selected tender' });
    }
    // ✅ GROUP ITEMS BY VENDOR_ID
    const itemsByVendor = {};
    for (const item of allItems) {
      const vendorId = item.vendor_id;
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }
      itemsByVendor[vendorId].push(item);
    }
    // ✅ CREATE SEPARATE PO FOR EACH VENDOR
    const createdPos = [];
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;
      for (const item of vendorItems) {
        vendorTotal += (item.unit_price || 0) * (item.quantity || 1);
      }
      const poNumber = `PO${String(poCounter).padStart(6, '0')}`;
      poCounter++;
      // Insert PO
      const poInsert = transaction.request()
        .input('po_number', sql.NVarChar, poNumber)
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .input('vendor_id', sql.UniqueIdentifier, vendorId) // ✅ vendor_id is UNIQUEIDENTIFIER
        .input('po_date', sql.DateTime, new Date(poDate))
        .input('total_amount', sql.Decimal(15, 2), vendorTotal)
        .input('status', sql.NVarChar, 'draft')
        .input('created_at', sql.DateTime, new Date());
      const poResult = await poInsert.query(`
        INSERT INTO purchase_orders (po_number, tender_id, vendor_id, po_date, total_amount, status, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@po_number, @tender_id, @vendor_id, @po_date, @total_amount, @status, @created_at, GETDATE())
      `);
      const poId = poResult.recordset[0].id;
      // Insert PO items for this vendor
      for (const item of vendorItems) {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
        await transaction.request()
          .input('po_id', sql.UniqueIdentifier, poId)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id_lookup || item.item_master_id) // ✅ Changed to UNIQUEIDENTIFIER
          .input('quantity', sql.Decimal(10, 2), item.quantity || 1)
          .input('unit_price', sql.Decimal(15, 2), item.unit_price || 0)
          .input('total_price', sql.Decimal(15, 2), itemTotal)
          .input('specifications', sql.NVarChar, item.specifications || null)
          .input('created_at', sql.DateTime, new Date())
          .query(`
            INSERT INTO purchase_order_items (po_id, item_master_id, quantity, unit_price, total_price, specifications, created_at)
            VALUES (@po_id, @item_master_id, @quantity, @unit_price, @total_price, @specifications, @created_at)
          `);
      }
      createdPos.push({
        id: poId,
        po_number: poNumber,
        vendor_id: vendorId,
        item_count: vendorItems.length,
        total_amount: vendorTotal
      });
      console.log(`✅ Created PO ${poNumber} for vendor ${vendorId} with ${vendorItems.length} items`);
    }
    await transaction.commit();
    res.json({
      message: `✅ ${createdPos.length} Purchase Order(s) created successfully${createdPos.length > 1 ? ' (grouped by vendor)' : ''}`,
      pos: createdPos
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating POs:', error);
    res.status(500).json({ error: 'Failed to create purchase orders', details: error.message });
  }
});
// PUT /api/purchase-orders/:id - Update PO status
app.put('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE purchase_orders
        SET status = @status,
            remarks = @remarks,
            updated_at = @updated_at
        WHERE id = @id
      `);
    res.json({ message: '✅ Purchase order updated successfully' });
  } catch (error) {
    console.error('❌ Error updating PO:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});
// PUT /api/purchase-orders/:id/finalize - Finalize PO (change status from draft to finalized)
app.put('/api/purchase-orders/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if PO exists and is draft
    const poCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT status FROM purchase_orders WHERE id = @id');
    
    if (poCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (poCheck.recordset[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only finalize draft purchase orders' });
    }
    
    // Update status to finalized
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE purchase_orders 
        SET status = 'finalized', updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log(`✅ Purchase order ${id} finalized`);
    res.json({ message: '✅ Purchase order finalized successfully', status: 'finalized' });
  } catch (error) {
    console.error('❌ Error finalizing PO:', error);
    res.status(500).json({ error: 'Failed to finalize purchase order' });
  }
});

// DELETE /api/purchase-orders/:id - Delete PO (only if draft)
app.delete('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if PO is draft
    const poCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT status FROM purchase_orders WHERE id = @id');
    if (poCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    if (poCheck.recordset[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft purchase orders' });
    }
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM purchase_orders WHERE id = @id');
    res.json({ message: '✅ Purchase order deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting PO:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});
console.log('✅ Purchase Orders APIs loaded');
startServer().catch(err => process.exit(1));
