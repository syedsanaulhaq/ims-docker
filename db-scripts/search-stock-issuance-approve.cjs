const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'stockIssuance.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /approve/gi;
let match;
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  }
