const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RequestDetailsPage.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 400; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('button') || line.includes('click') || line.includes('handle') || line.includes('submit') || line.includes('approve') || line.includes('reject') || line.includes('forward')) {
    }
}
