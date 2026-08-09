const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ApprovalForwarding.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 0; i < Math.min(lines.length, 150); i++) {
  }
