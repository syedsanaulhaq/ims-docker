const bcrypt = require('bcryptjs');

async function generatePasswordHashes() {
  const passwords = [
    { name: 'admin123', value: 'admin123' },
    { name: 'manager123', value: 'manager123' },
    { name: 'user123', value: 'user123' },
    { name: 'approver123', value: 'approver123' },
    { name: '123456', value: '123456' }
  ];
  
  for (const pwd of passwords) {
    const hash = await bcrypt.hash(pwd.value, 10);
    }
  
  const testHash = await bcrypt.hash('admin123', 10);
  const isValid = await bcrypt.compare('admin123', testHash);
  }

generatePasswordHashes();
