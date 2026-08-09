const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'stockIssuance.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 199; i < Math.min(lines.length, 270); i++) {
  }
