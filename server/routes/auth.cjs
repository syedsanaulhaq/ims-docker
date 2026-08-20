// ============================================================================
// Authentication Routes
// ============================================================================
// All authentication and user management endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const aspnetHasher = require('../utils/aspnetPasswordHasher.cjs');

let employeeBranchViewColumnsCache = null;

async function getEmployeeBranchViewColumns(pool) {
  if (employeeBranchViewColumnsCache) {
    return employeeBranchViewColumnsCache;
  }

  const colsResult = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'vw_employee_branch'
  `);

  employeeBranchViewColumnsCache = new Set(
    (colsResult.recordset || []).map(r => String(r.COLUMN_NAME || '').toLowerCase())
  );

  return employeeBranchViewColumnsCache;
}

function pickExistingColumn(columnsSet, candidates) {
  for (const name of candidates) {
    if (columnsSet.has(name.toLowerCase())) {
      return name;
    }
  }
  return null;
}

async function resolveBranchDetailsFromEmployeeView(pool, { userId, userName, cnic, fallbackBranchId = null, fallbackBranchName = null, fallbackBranchAcron = null }) {
  try {
    const columns = await getEmployeeBranchViewColumns(pool);

    const branchIdColumn = pickExistingColumn(columns, ['DEC_ID', 'branch_id', 'BranchID', 'intBranchID']);
    if (!branchIdColumn) {
      return { branchId: fallbackBranchId, branchName: fallbackBranchName, branchAcron: fallbackBranchAcron };
    }

    const branchNameColumn = pickExistingColumn(columns, ['BranchName', 'branch_name', 'DECName', 'Name']);
    const branchAcronColumn = pickExistingColumn(columns, ['BranchAcron', 'branch_acron', 'BranchAcronym', 'branch_acronym']);
    const idColumn = pickExistingColumn(columns, ['Id', 'ID', 'user_id', 'UserId', 'aspnet_user_id', 'AspNetUserId']);
    const userNameColumn = pickExistingColumn(columns, ['UserName', 'user_name']);
    const cnicColumn = pickExistingColumn(columns, ['CNIC', 'cnic']);

    if (cnic && cnicColumn) {
      const cnicResult = await pool.request()
        .input('cnic', sql.NVarChar(30), String(cnic).trim())
        .query(`
          SELECT TOP 1
            [${branchIdColumn}] AS branch_id,
            ${branchNameColumn ? `[${branchNameColumn}]` : 'CAST(NULL AS NVARCHAR(200))'} AS branch_name,
            ${branchAcronColumn ? `[${branchAcronColumn}]` : 'CAST(NULL AS NVARCHAR(50))'} AS branch_acron
          FROM vw_employee_branch
          WHERE [${cnicColumn}] = @cnic
        `);

      if (cnicResult.recordset?.[0]?.branch_id) {
        return {
          branchId: cnicResult.recordset[0].branch_id,
          branchName: cnicResult.recordset[0].branch_name ?? fallbackBranchName,
          branchAcron: cnicResult.recordset[0].branch_acron ?? fallbackBranchAcron
        };
      }
    }

    const request = pool.request();
    const whereParts = [];

    if (userId && idColumn) {
      request.input('userId', sql.NVarChar(450), String(userId));
      whereParts.push(`CONVERT(NVARCHAR(450), [${idColumn}]) = @userId`);
    }

    if (userName && userNameColumn) {
      request.input('userName', sql.NVarChar(256), String(userName));
      whereParts.push(`[${userNameColumn}] = @userName`);
    }

    if (whereParts.length === 0) {
      return { branchId: fallbackBranchId, branchName: fallbackBranchName, branchAcron: fallbackBranchAcron };
    }

    const result = await request.query(`
      SELECT TOP 1
        [${branchIdColumn}] AS branch_id,
        ${branchNameColumn ? `[${branchNameColumn}]` : 'CAST(NULL AS NVARCHAR(200))'} AS branch_name,
        ${branchAcronColumn ? `[${branchAcronColumn}]` : 'CAST(NULL AS NVARCHAR(50))'} AS branch_acron
      FROM vw_employee_branch
      WHERE ${whereParts.join(' OR ')}
    `);

    const resolvedBranchId = result.recordset?.[0]?.branch_id;
    const resolvedBranchName = result.recordset?.[0]?.branch_name;
    const resolvedBranchAcron = result.recordset?.[0]?.branch_acron;
    return {
      branchId: resolvedBranchId ?? fallbackBranchId,
      branchName: resolvedBranchName ?? fallbackBranchName,
      branchAcron: resolvedBranchAcron ?? fallbackBranchAcron
    };
  } catch (error) {
    return { branchId: fallbackBranchId, branchName: fallbackBranchName, branchAcron: fallbackBranchAcron };
  }
}

async function resolveBranchFromEmployeeView(pool, options) {
  const branchDetails = await resolveBranchDetailsFromEmployeeView(pool, options);
  return branchDetails.branchId;
}

// Required helpers
async function getUserImsData(userId) {
  try {
    const pool = getPool();
    
    // Get IMS roles
    const rolesResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ir.id,
          ir.role_name,
          ir.display_name,
          ir.description
        FROM ims_user_roles iur
        JOIN ims_roles ir ON iur.role_id = ir.id
        WHERE iur.user_id = @userId AND iur.is_active = 1
      `);
    
    // Get IMS permissions
    const permsResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT DISTINCT
          permission_key,
          module_name,
          action_name
        FROM vw_ims_user_permissions
        WHERE user_id = @userId
      `);
    
    // Check if super admin by role
    const adminCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT COUNT(*) as is_admin
        FROM ims_user_roles iur
        JOIN ims_roles ir ON iur.role_id = ir.id
        WHERE iur.user_id = @userId 
          AND ir.role_name = 'IMS_SUPER_ADMIN'
          AND iur.is_active = 1
      `);
    
    return {
      roles: rolesResult.recordset || [],
      permissions: permsResult.recordset || [],
      is_super_admin: adminCheck.recordset?.length > 0 ? adminCheck.recordset[0].is_admin > 0 : false
    };
  } catch (error) {
    console.error('Error fetching user IMS data:', error);
    return { roles: [], permissions: [], is_super_admin: false };
  }
}

// ============================================================================
// ============================================================================
// Assign Default Role to New Users
// ============================================================================
// If a new SSO user has NO roles assigned in IMS, assign GENERAL_USER only
// NOTE: DS roles do NOT determine IMS roles
// IMS roles are pre-assigned by IMS Super Admin in the ims_user_roles table
// This function only assigns GENERAL_USER if user has no IMS roles
async function assignDefaultPermissionsToSSOUser(userId) {
  try {
    const pool = getPool();
    
    // Check if user already has any IMS roles assigned
    const roleCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT id FROM ims_user_roles WHERE user_id = @userId AND is_active = 1');
    
    if (roleCheck.recordset.length === 0) {
      // User has NO IMS roles - assign GENERAL_USER as default
      // IMS Super Admin can later assign other roles as needed
      const roleResult = await pool.request()
        .query("SELECT id FROM ims_roles WHERE role_name = 'GENERAL_USER' AND is_active = 1");
      
      if (roleResult.recordset.length > 0) {
        const roleId = roleResult.recordset[0].id;
        
        // Assign GENERAL_USER role to the user
        await pool.request()
          .input('userId', sql.NVarChar, userId)
          .input('roleId', sql.UniqueIdentifier, roleId)
          .query(`
            INSERT INTO ims_user_roles (id, user_id, role_id, scope_type, is_active, assigned_at)
            VALUES (NEWID(), @userId, @roleId, 'GLOBAL', 1, GETDATE())
          `);
        
      }
    } else {
    }
  } catch (error) {
    console.error('Error assigning default permissions:', error);
  }
}

// ============================================================================
// POST /api/auth/login - Login with username and password
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = getPool();


    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Query AspNetUsers table
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT 
          Id, FullName, UserName, CNIC, Email, Role, intOfficeID, intWingID, 
          intBranchID, intDesignationID, Password, PasswordHash, ISACT
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    let isPasswordValid = false;

    // Strategy 1: Check ASP.NET Identity hash (prefer hash over plain text)
    if (user.PasswordHash && (user.PasswordHash.startsWith('AQA') || user.PasswordHash.length > 60)) {
      try {
        isPasswordValid = aspnetHasher.verifyPassword(password, user.PasswordHash);
      } catch (error) {
        console.error('ASP.NET hash comparison error:', error.message);
      }
    }

    // Strategy 2: Try bcrypt
    if (!isPasswordValid && user.PasswordHash && user.PasswordHash.startsWith('$2')) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
      } catch (error) {
        console.error('Bcrypt comparison error:', error.message);
      }
    }

    // Strategy 3: Plain text in PasswordHash
    if (!isPasswordValid && user.PasswordHash === password) {
      isPasswordValid = true;
    }

    // Strategy 4: Plain text Password field (legacy fallback)
    if (!isPasswordValid && user.Password && user.Password === password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }


    const resolvedBranch = await resolveBranchDetailsFromEmployeeView(pool, {
      userId: user.Id,
      userName: user.UserName,
      cnic: user.CNIC,
      fallbackBranchId: user.intBranchID
    });

    // Store user in session
    req.session.userId = user.Id;
    req.session.user = {
      Id: user.Id,
      FullName: user.FullName,
      CNIC: user.CNIC,
      UserName: user.UserName,
      Email: user.Email,
      Role: user.Role,
      intOfficeID: user.intOfficeID,
      intWingID: user.intWingID,
      intBranchID: resolvedBranch.branchId,
      BranchName: resolvedBranch.branchName,
      BranchAcron: resolvedBranch.branchAcron,
      intDesignationID: user.intDesignationID
    };

    // Get IMS roles and permissions
    const imsData = await getUserImsData(user.Id);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }

    // Update last login
    await pool.request()
      .input('userId', sql.NVarChar, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query(`UPDATE AspNetUsers SET LastLoggedIn = @lastLogin WHERE Id = @userId`);

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
// POST /api/auth/logout - Destroy session
// ============================================================================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// ============================================================================
// GET /api/auth/me - Get current authenticated user
// ============================================================================
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    success: true,
    user: req.session.user
  });
});

// ============================================================================
// GET /api/auth/session - Get full session data with IMS info
// ============================================================================
router.get('/session', async (req, res) => {
  try {
    const pool = getPool();

    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }


    // Get IMS data
    const imsData = await getUserImsData(req.session.userId);

    const primaryRole = imsData?.roles?.length > 0 
      ? (imsData.roles[0].display_name || imsData.roles[0].role_name || 'User')
      : 'User';

    // Get designation
    let designation = null;
    if (req.session.user?.intDesignationID) {
      try {
        const designationResult = await pool.request()
          .input('userId', sql.NVarChar, req.session.userId)
          .query('SELECT strDesignation FROM vw_User_with_designation WHERE Id = @userId');
        
        if (designationResult.recordset?.length > 0) {
          designation = designationResult.recordset[0].strDesignation;
        }
      } catch (error) {
        console.error('Error fetching designation:', error);
      }
    }

    let sessionCnic = req.session.user?.CNIC || null;
    if (!sessionCnic) {
      const userResult = await pool.request()
        .input('userId', sql.NVarChar(450), req.session.userId)
        .query('SELECT TOP 1 CNIC FROM AspNetUsers WHERE Id = @userId');
      sessionCnic = userResult.recordset?.[0]?.CNIC || null;
    }

    const branchDetails = await resolveBranchDetailsFromEmployeeView(pool, {
      userId: req.session.userId,
      userName: req.session.user?.UserName,
      cnic: sessionCnic,
      fallbackBranchId: req.session.user?.intBranchID || null,
      fallbackBranchName: req.session.user?.BranchName || null,
      fallbackBranchAcron: req.session.user?.BranchAcron || null
    });

    req.session.user.CNIC = sessionCnic;
    req.session.user.intBranchID = branchDetails.branchId;
    req.session.user.BranchName = branchDetails.branchName;
    req.session.user.BranchAcron = branchDetails.branchAcron;

    const sessionUser = {
      user_id: req.session.userId,
      user_name: req.session.user?.FullName || req.session.user?.UserName || 'Unknown',
      email: req.session.user?.Email || '',
      role: primaryRole,
      designation: designation,
      office_id: req.session.user?.intOfficeID || 583,
      wing_id: req.session.user?.intWingID || 19,
      branch_id: branchDetails.branchId || null,
      branch_name: branchDetails.branchName || null,
      branch_acronym: branchDetails.branchAcron || null,
      ims_roles: imsData?.roles || [],
      ims_permissions: imsData?.permissions || [],
      is_super_admin: imsData?.is_super_admin || false
    };

    res.json({
      success: true,
      session: sessionUser
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ============================================================================
// GET /api/auth/designation/:userId - Get designation for any user
// ============================================================================
router.get('/designation/:userId', async (req, res) => {
  try {
    const pool = getPool();

    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { userId } = req.params;
    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT TOP 1
          COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') AS designation
        FROM AspNetUsers u
        LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), u.Id)
        LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
        WHERE CONVERT(NVARCHAR(450), u.Id) = @userId
      `);

    const designation = result.recordset?.[0]?.designation || '-';
    return res.json({ success: true, designation });
  } catch (error) {
    console.error('Error fetching designation by user ID:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch designation' });
  }
});

// ============================================================================
// POST /api/auth/ds-authenticate - Digital System SSO Authentication
// ============================================================================
// This endpoint is called by the .NET Digital System application for SSO
router.post('/ds-authenticate', async (req, res) => {
  
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. Ensure Content-Type is application/json'
      });
    }

    const { UserName, Password } = req.body;
    const pool = getPool();

    if (!UserName || !Password) {
      return res.status(400).json({
        success: false,
        message: 'Missing username or password'
      });
    }


    // Query user from AspNetUsers
    const userResult = await pool.request()
      .input('username', sql.NVarChar, UserName)
      .query(`
        SELECT 
          Id, FullName, CNIC, UserName, Email, PhoneNumber,
          Password, PasswordHash,
          intOfficeID, intWingID, intProvinceID, intDivisionID,
          intDistrictID, intBranchID, intDesignationID,
          Role, UID, ISACT, Gender, ProfilePhoto, LastLoggedIn
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = userResult.recordset[0];
    const resolvedBranch = await resolveBranchDetailsFromEmployeeView(pool, {
      userId: user.Id,
      userName: user.UserName,
      cnic: user.CNIC,
      fallbackBranchId: user.intBranchID
    });

    // Password verification with multiple strategies
    let isPasswordValid = false;
    const passwordToCheck = user.PasswordHash || user.Password;

    if (!passwordToCheck) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Strategy 1: Check plain text Password field
    if (user.Password && user.Password === Password) {
      isPasswordValid = true;
    }

    // Strategy 2: ASP.NET Identity hash
    if (!isPasswordValid && (passwordToCheck.startsWith('AQA') || passwordToCheck.length > 60)) {
      try {
        
        // Try custom ASP.NET Identity V3 hasher (supports both UTF-8 and UTF-16LE)
        isPasswordValid = aspnetHasher.verifyPassword(Password, passwordToCheck);
        
        // If library fails, try alternative: check if Password field matches
        if (!isPasswordValid && user.Password) {
          if (user.Password === Password) {
            isPasswordValid = true;
          }
        }
      } catch (err) {
        console.error(`❌ ASP.NET verification error: ${err.message}`);
        console.error(`   Error stack: ${err.stack}`);
      }
    }

    // Strategy 3: Bcrypt hash
    if (!isPasswordValid && passwordToCheck.startsWith('$2')) {
      try {
        isPasswordValid = await bcrypt.compare(Password, passwordToCheck);
      } catch (err) {
      }
    }

    // Strategy 4: Plain text in PasswordHash
    if (!isPasswordValid && passwordToCheck === Password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }


    // Update last login
    await pool.request()
      .input('userId', sql.NVarChar, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query('UPDATE AspNetUsers SET LastLoggedIn = @lastLogin WHERE Id = @userId');

    // Generate JWT token (legacy: secret only, no issuer/audience validation)
    const config = require('../config/env.cjs');
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
        branch_id: resolvedBranch.branchId,
        branch_name: resolvedBranch.branchName,
        branch_acronym: resolvedBranch.branchAcron,
        designation_id: user.intDesignationID,
        role: user.Role,
        uid: user.UID,
        is_active: user.ISACT,
        gender: user.Gender
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );


    // Return token (Capital 'T' matches .NET TokenResponse class)
    res.status(200).json({
      Token: token,
      success: true,
      message: 'Authentication successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ DS Authentication Error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   Error name:', error.name);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// GET /sso-login - SSO Login Handler (receives token from Digital System)
// ============================================================================
// This endpoint receives the JWT token from DS and creates an IMS session
router.get('/sso-login', async (req, res) => {
  try {
    const { token } = req.query;
    const pool = getPool();
    const config = require('../config/env.cjs');

    if (!token) {
      console.error('❌ SSO Login failed: No token provided');
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Extract user info from token
    const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
      || decoded.sub
      || decoded.userId
      || decoded.uid;
    const userName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
      || decoded.full_name
      || decoded.name
      || decoded.unique_name
      || decoded.user_name;
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
      || decoded.email;
    const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || decoded.role
      || 'User';

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Verify user in database (allow token-only if not found)
    let dbUser = null;
    try {
      const result = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT Id, FullName, UserName, CNIC, Email, Role, intBranchID, intOfficeID, intWingID, intDesignationID, ISACT FROM AspNetUsers WHERE Id = @userId');

      if (result.recordset.length > 0) {
        dbUser = result.recordset[0];
        if (!dbUser.ISACT) {
          console.error('❌ User account is inactive');
          return res.status(403).json({ error: 'Account inactive' });
        }
      } else if (userName) {
        const byNameResult = await pool.request()
          .input('username', sql.NVarChar, userName)
          .query('SELECT Id, FullName, UserName, CNIC, Email, Role, intBranchID, intOfficeID, intWingID, intDesignationID, ISACT FROM AspNetUsers WHERE UserName = @username');
        if (byNameResult.recordset.length > 0) {
          dbUser = byNameResult.recordset[0];
          if (!dbUser.ISACT) {
            console.error('❌ User account is inactive');
            return res.status(403).json({ error: 'Account inactive' });
          }
        }
      }
    } catch (dbError) {
      console.error('⚠️ Database verification error:', dbError.message);
    }
    
    // Create session
    req.session.userId = dbUser?.Id || userId;
    req.session.authenticated = true;
    req.session.user = {
      Id: dbUser?.Id || userId,
      FullName: dbUser?.FullName || userName || 'Unknown',
      CNIC: decoded.cnic || dbUser?.CNIC || null,
      UserName: userName || decoded.unique_name || decoded.user_name || 'Unknown',
      Email: dbUser?.Email || email || '',
      Role: dbUser?.Role || role,
      intOfficeID: decoded.office_id || dbUser?.intOfficeID || null,
      intWingID: decoded.wing_id || dbUser?.intWingID || null,
      intBranchID: null,
      intDesignationID: decoded.designation_id || dbUser?.intDesignationID || null
    };

    const resolvedBranch = await resolveBranchDetailsFromEmployeeView(pool, {
      userId: req.session.user.Id,
      userName: req.session.user.UserName,
      cnic: decoded.cnic || dbUser?.CNIC || null,
      fallbackBranchId: decoded.branch_id || dbUser?.intBranchID || null
    });
    req.session.user.intBranchID = resolvedBranch.branchId;
    req.session.user.BranchName = resolvedBranch.branchName;
    req.session.user.BranchAcron = resolvedBranch.branchAcron;

    // Assign default GENERAL_USER role if user has no IMS roles yet
    // (IMS Super Admin pre-assigns specific roles in ims_user_roles table)
    await assignDefaultPermissionsToSSOUser(userId);
    
    // Get IMS roles and permissions
    const imsData = await getUserImsData(userId);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }


    // Redirect to IMS dashboard (legacy behavior)
    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ SSO Login Error:', error);
    res.status(500).json({ error: 'SSO authentication failed', details: error.message });
  }
});

// ====================================================================
// POST /sso-validate - Validate SSO Token and Establish Session
// ====================================================================
router.post('/sso-validate', async (req, res) => {
  try {
    const { token } = req.body;
    const pool = getPool();
    const config = require('../config/env.cjs');

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Extract user info from token
    const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
      || decoded.sub
      || decoded.userId
      || decoded.uid;
    const userName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
      || decoded.full_name
      || decoded.name
      || decoded.unique_name
      || decoded.user_name;
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
      || decoded.email;
    const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || decoded.role
      || 'User';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID not found in token' });
    }

    // Verify user in database
    let dbUser = null;
    try {
      const result = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT Id, FullName, UserName, CNIC, Email, Role, intBranchID, intOfficeID, intWingID, intDesignationID, ISACT FROM AspNetUsers WHERE Id = @userId');

      if (result.recordset.length > 0) {
        dbUser = result.recordset[0];
        if (!dbUser.ISACT) {
          return res.status(403).json({ success: false, error: 'Account inactive' });
        }
      } else if (userName) {
        const byNameResult = await pool.request()
          .input('username', sql.NVarChar, userName)
          .query('SELECT Id, FullName, UserName, CNIC, Email, Role, intBranchID, intOfficeID, intWingID, intDesignationID, ISACT FROM AspNetUsers WHERE UserName = @username');
        if (byNameResult.recordset.length > 0) {
          dbUser = byNameResult.recordset[0];
          if (!dbUser.ISACT) {
            return res.status(403).json({ success: false, error: 'Account inactive' });
          }
        }
      }
    } catch (dbError) {
      console.error('⚠️ Database verification error:', dbError.message);
    }
    
    // Create session
    req.session.userId = dbUser?.Id || userId;
    req.session.authenticated = true;
    req.session.user = {
      Id: dbUser?.Id || userId,
      FullName: dbUser?.FullName || userName || 'Unknown',
      CNIC: decoded.cnic || dbUser?.CNIC || null,
      UserName: userName || decoded.unique_name || decoded.user_name || 'Unknown',
      Email: dbUser?.Email || email || '',
      Role: dbUser?.Role || role,
      intOfficeID: decoded.office_id || dbUser?.intOfficeID || null,
      intWingID: decoded.wing_id || dbUser?.intWingID || null,
      intBranchID: null,
      intDesignationID: decoded.designation_id || dbUser?.intDesignationID || null
    };

    const resolvedBranch = await resolveBranchDetailsFromEmployeeView(pool, {
      userId: req.session.user.Id,
      userName: req.session.user.UserName,
      cnic: decoded.cnic || dbUser?.CNIC || null,
      fallbackBranchId: decoded.branch_id || dbUser?.intBranchID || null
    });
    req.session.user.intBranchID = resolvedBranch.branchId;
    req.session.user.BranchName = resolvedBranch.branchName;
    req.session.user.BranchAcron = resolvedBranch.branchAcron;

    await assignDefaultPermissionsToSSOUser(userId);
    
    // Get IMS roles and permissions
    const imsData = await getUserImsData(userId);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }

    res.json({
      success: true,
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ SSO Validation Error:', error);
    res.status(500).json({ success: false, error: 'SSO validation failed', details: error.message });
  }
});


module.exports = router;