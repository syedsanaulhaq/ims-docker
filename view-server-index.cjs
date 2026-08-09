const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 69; i < Math.min(lines.length, 110); i++) {
  }
