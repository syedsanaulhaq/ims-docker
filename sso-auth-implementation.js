// SSO Authentication Implementation for IMS
// This handles authentication tokens from the .NET Core Digital System

const jwt = require('jsonwebtoken');

// IMPORTANT: This secret must match the one in your .NET Core DS
const JWT_SECRET = 'YOUR_SHARED_SECRET_KEY'; // Same as in .NET Core

/**
 * SSO Login Endpoint
 * Accepts JWT token from Digital System and creates IMS session
 */
app.get('/api/sso-login', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify and decode the JWT token from DS
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('❌ Invalid token:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Extract user info from token
    const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decoded.sub || decoded.userId;
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || decoded.email;
    const userName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || decoded.name;
    const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Query the AspNetUsers table to get full user details
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          u.Id as user_id,
          u.UserName as user_name,
          u.Email as email,
          u.OfficeId as office_id,
          u.WingId as wing_id,
          u.Role as role,
          u.Status as status,
          o.OfficeName as office_name,
          w.WingName as wing_name
        FROM AspNetUsers u
        LEFT JOIN Offices o ON u.OfficeId = o.OfficeId
        LEFT JOIN Wings w ON u.WingId = w.WingId
        WHERE u.Id = @userId AND u.Status = 'Active'
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    const user = userResult.recordset[0];

    // Create IMS session
    const sessionData = {
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      role: user.role,
      office_id: user.office_id,
      office_name: user.office_name,
      wing_id: user.wing_id,
      wing_name: user.wing_name,
      login_time: new Date().toISOString(),
      source: 'SSO' // Mark as SSO login
    };

    // Store session in your session storage (modify based on your session mechanism)
    // If using express-session:
    req.session.user = sessionData;
    req.session.authenticated = true;

    // Redirect to IMS dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('❌ SSO login error:', error);
    res.status(500).json({ error: 'SSO authentication failed', details: error.message });
  }
});

/**
 * Middleware to validate JWT token from DS
 */
function validateDSToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * API endpoint to validate token and return user info
 */
app.post('/api/sso-validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decoded.sub;

    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          u.Id as user_id,
          u.UserName as user_name,
          u.Email as email,
          u.OfficeId as office_id,
          u.WingId as wing_id,
          u.Role as role,
          u.Status as status
        FROM AspNetUsers u
        WHERE u.Id = @userId AND u.Status = 'Active'
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: userResult.recordset[0]
    });

  } catch (error) {
    console.error('❌ Token validation error:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

module.exports = { validateDSToken };
