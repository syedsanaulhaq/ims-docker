// Test the manual ASP.NET Identity implementation
const { verifyPassword } = require('./server/utils/aspnetPasswordHasher.cjs');

const hash = 'AQAAAAEAACcQAAAAELIMrfMcvIr1nnDmLUCHwqLBIGBYant+Qo2sWWvwCN38eL0+0+3z0vFqGPJwT4TI/w==';
const password = 'Password@1';  // Changed from P@ssword@1

const result = verifyPassword(password, hash);

