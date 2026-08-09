const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RequestDetailsPage.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /\/approve|\/forward/gi;
let match;
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  }
