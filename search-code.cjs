const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /deriveParentLaneStatus/gi;
let match;
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  }
