const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'StockIssuanceProcessing.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 49; i < Math.min(lines.length, 180); i++) {
  }
