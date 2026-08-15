const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.sqlserver' });

const JWT_SECRET = process.env.JWT_SECRET;

// Simulate DS generating a token
const testToken = jwt.sign(
  { 
    sub: "test-user-id-123", 
    unique_name: "testuser",
    full_name: "Test User",
    email: "test@example.com",
    role: "Admin"
  },
  JWT_SECRET,
  { 
    issuer: 'DigitalSystem', 
    audience: 'IMS', 
    expiresIn: '24h' 
  }
);

// Simulate IMS validating the token
try {
  const decoded = jwt.verify(testToken, JWT_SECRET, {
    issuer: 'DigitalSystem',
    audience: 'IMS'
  });
  
  } catch (error) {
  }
