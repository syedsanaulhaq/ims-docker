// Test ASP.NET Identity password validation directly
// Run with: node test-aspnet-password.cjs

const aspnetIdentity = require('aspnet-identity-pw');

// The exact hash from database
const hash = 'AQAAAAEAACcQAAAAELIMrfMcvIr1nnDmLUCHwqLBIGBYant+Qo2sWWvwCN38eL0+0+3z0vFqGPJwT4TI/w==';
const password = 'P@ssword@1';

try {
  const result = aspnetIdentity.validatePassword(password, hash);
  if (result) {
    } else {
    }
} catch (error) {
  console.error('❌ Error during validation:', error.message);
  console.error('Stack:', error.stack);
}

const pkg = require('./package.json');
