const { verifyPassword } = require('../server/utils/aspnetPasswordHasher.cjs');

const hash = 'AQAAAAEAACcQAAAAEAjZdlpEmaQKIWacnJkiay3FBXkH+O8wF7nH89Dw1M2l2L/yysB4Qv8jdfTVs2BepA==';
const passwords = [
  'P@ssword@1',
  'Password@1',
  'password@1',
  'P@ssw0rd@1',
  'Passw0rd@1',
  'admin123',
  '123456',
  '12345678',
  '12345'
];

for (const pwd of passwords) {
  try {
    const isValid = verifyPassword(pwd, hash);
    console.log(`Password: "${pwd}" -> ${isValid}`);
    if (isValid) {
      console.log(`Success! Password is: "${pwd}"`);
      break;
    }
  } catch(e) {
    console.error(`Error verifying "${pwd}":`, e);
  }
}
process.exit(0);
