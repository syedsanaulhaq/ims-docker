const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 1636; i < lines.length; i++) {
  if (lines[i].includes('item_allocations')) {
    }
}
