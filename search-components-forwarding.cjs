const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ApprovalForwarding.tsx');
if (!fs.existsSync(filePath)) {
  process.exit(1);
}
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 200; i < 255; i++) {
  }
