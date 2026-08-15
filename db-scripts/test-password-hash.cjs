const bcrypt = require('bcryptjs');

async function testPasswords() {
  // Test admin password
  const adminHash = '$2a$10$8K1p/a0dLOZ4X4Y4XXMVHO6bVm7f8Cg4nQd9V5H5nLDQ3FmGm1QgS';
  const adminPassword = 'admin123';
  const adminValid = await bcrypt.compare(adminPassword, adminHash);
  // Test user password
  const userHash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ3xL9AQrE7t6LH3m1VEa7VhC2Y2u6T6';
  const userPassword = '123456';
  const userValid = await bcrypt.compare(userPassword, userHash);
  // Generate new correct hashes
  const newAdminHash = await bcrypt.hash('admin123', 10);
  const newUserHash = await bcrypt.hash('123456', 10);
  
  // Test the new hashes
  const newAdminValid = await bcrypt.compare('admin123', newAdminHash);
  const newUserValid = await bcrypt.compare('123456', newUserHash);
  
  }

testPasswords().catch(console.error);