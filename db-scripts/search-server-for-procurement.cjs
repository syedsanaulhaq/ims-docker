const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath, query);
    } else if (file.endsWith('.cjs') || file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        }
    }
  }
}

searchDir(path.join(__dirname, 'server'), 'APPROVE_FOR_PROCUREMENT');
