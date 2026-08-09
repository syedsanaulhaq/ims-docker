// Test multiple password variations
const { verifyPassword } = require('./server/utils/aspnetPasswordHasher.cjs');

const hash = 'AQAAAAEAACcQAAAAELIMrfMcvIr1nnDmLUCHwqLBIGBYant+Qo2sWWvwCN38eL0+0+3z0vFqGPJwT4TI/w==';

const passwords = [
  'P@ssword@1',
  'Password@1',
  'password@1',
  'P@ssw0rd@1',
  'Passw0rd@1'
];

for (const pwd of passwords) {
  const result = verifyPassword(pwd, hash);
  if (result) {
    break;
  }
}
