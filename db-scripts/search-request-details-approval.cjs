const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RequestDetailsPage.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /approval/gi;
let match;
const seenLines = new Set();
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  if (!seenLines.has(lineNum)) {
    seenLines.add(lineNum);
    }
}
