const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.cjs'];

function shouldProcess(filePath) {
  const ext = path.extname(filePath);
  if (!EXTENSIONS.includes(ext)) return false;
  if (filePath.includes('node_modules')) return false;
  if (filePath.includes('dist')) return false;
  if (filePath.includes('.vite')) return false;
  return true;
}

function removeConsoleLogs(content) {
  // Keep console.error for error handling; remove debug-level logging
  const methods = ['log', 'warn', 'debug', 'info', 'trace'];
  const methodPattern = methods.join('|');
  const regex = new RegExp(`console\\.(${methodPattern})\\(`, 'g');

  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    let i = match.index + match[0].length;
    let depth = 1;
    let inString = null;
    let inTemplate = false;
    let escapeNext = false;
    let inLineComment = false;
    let inBlockComment = false;

    while (i < content.length && depth > 0) {
      const ch = content[i];
      const next = content[i + 1];

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        i++;
        continue;
      }

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (inString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (ch === '\\') {
          escapeNext = true;
        } else if (ch === inString) {
          inString = null;
        }
        i++;
        continue;
      }

      if (inTemplate) {
        if (escapeNext) {
          escapeNext = false;
        } else if (ch === '\\') {
          escapeNext = true;
        } else if (ch === '`') {
          inTemplate = false;
        } else if (ch === '$' && next === '{') {
          // Template literal expression - we need to skip balanced braces
          let braceDepth = 1;
          i += 2;
          while (i < content.length && braceDepth > 0) {
            if (content[i] === '{') braceDepth++;
            else if (content[i] === '}') braceDepth--;
            i++;
          }
          continue;
        }
        i++;
        continue;
      }

      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }

      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = ch;
        i++;
        continue;
      }

      if (ch === '`') {
        inTemplate = true;
        i++;
        continue;
      }

      if (ch === '(') depth++;
      else if (ch === ')') depth--;

      i++;
    }

    // Now skip optional semicolon and whitespace/newlines after the call
    let end = i;
    while (end < content.length && /[\s;]/.test(content[end])) {
      end++;
    }

    result += content.slice(lastIndex, start);
    lastIndex = end;
  }

  result += content.slice(lastIndex);
  return result;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.vite') continue;
      walk(fullPath);
    } else if (shouldProcess(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const cleaned = removeConsoleLogs(content);
      if (cleaned !== content) {
        fs.writeFileSync(fullPath, cleaned, 'utf8');
        }
    }
  }
}

walk(ROOT);
