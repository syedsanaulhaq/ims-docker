#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Removes all test files, debug scripts, demo data, and development utilities
 * from the production environment to ensure a clean, professional codebase.
 */

const fs = require('fs');
const path = require('path');

class ProductionCleaner {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.removedFiles = [];
    this.removedDirectories = [];
    this.cleanedConsoles = [];
  }

  // Files and patterns to remove from production
  getFilesToRemove() {
    return [
      // Test files
      '**/test-*.js',
      '**/test-*.cjs', 
      '**/test-*.mjs',
      '**/test-*.sql',
      '**/test-*.html',
      '**/TEST-*.js',
      '**/TEST-*.sql',
      
      // Debug files
      '**/debug-*.js',
      '**/debug-*.cjs',
      '**/debug-*.sql',
      '**/DEBUG-*.sql',
      
      // Demo and sample files
      '**/demo-*.js',
      '**/create-test-*.js',
      '**/create-test-*.sql',
      '**/create-sample-*.sql',
      '**/create-real-*.sql',
      
      // Development utilities
      'analyze-*.js',
      'analyze-*.cjs',
      'check-*.js',
      'check-*.sql',
      'verify-*.js',
      'clean-*.js',
      'clear-*.sql',
      'cleanup-*.sql',
      'dev-performance.js',
      'quick-git.js',
      'git-watch.js',
      'git-auto.*',
      'start-optimal-system.js',
      'start-system.bat',
      
      // Migration and update scripts (keep in development only)
      'migrate-*.js',
      'update-erp-*.js',
      'run-*.js',
      'run-*.mjs',
      'setup-*.bat',
      
      // Backup and restore utilities
      'backup-*.js',
      'restore-*.js',
      'supabase-full-backup.js',
      
      // Documentation that's development-specific
      '*-PLAN.md',
      '*-PROGRESS-REPORT.md',
      '*-SUMMARY.md',
      '*-REFERENCE.md',
      'ERP-INTEGRATION-*.md',
      'MIGRATION-*.md',
      'PERFORMANCE-OPTIMIZATION.md',
      'GIT-AUTOMATION-README.md',
      
      // Fix and patch scripts
      'fix-*.sql',
      'FIX-*.sql',
      'revert-*.sql',
      'correct-*.sql',
      
      // Visual/presentation files for development
      '*.html',
      '*.png',
      
      // API response samples
      'api-response.json',
      
      // Upload test files
      'test-upload.html',
      
      // Specific development files
      'simplified-fetch-function.js',
      'insert-data-simple.js',
      'clear-ts-cache.js',
      'StockIssuanceProcessing-simplified.tsx'
    ];
  }

  // Directories to remove from production
  getDirectoriesToRemove() {
    return [
      'backup-*/',
      'database-backup/',
      'uploads/',
      'supabase/',
      'client/' // If it's a separate client build
    ];
  }

  // Files to keep but clean console logs from
  getFilesToCleanConsoles() {
    return [
      'src/**/*.ts',
      'src/**/*.tsx', 
      'src/**/*.js',
      'backend-server.cjs',
      'scripts/**/*.js'
    ];
  }

  async removeFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.removedFiles.push(filePath);
        return true;
      }
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error.message);
    }
    return false;
  }

  async removeDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        await fs.promises.rm(dirPath, { recursive: true, force: true });
        this.removedDirectories.push(dirPath);
        return true;
      }
    } catch (error) {
      console.error(`Error removing directory ${dirPath}:`, error.message);
    }
    return false;
  }

  globMatch(pattern, filePath) {
    // Simple glob matching
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');
    return new RegExp(regex).test(filePath);
  }

  async findMatchingFiles(patterns) {
    const matchingFiles = [];
    
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(this.rootDir, fullPath);
        
        if (fs.statSync(fullPath).isDirectory()) {
          // Skip node_modules and .git
          if (!['node_modules', '.git', 'dist'].includes(file)) {
            walkDir(fullPath);
          }
        } else {
          // Check if file matches any pattern
          for (const pattern of patterns) {
            if (this.globMatch(pattern, relativePath)) {
              matchingFiles.push(fullPath);
              break;
            }
          }
        }
      }
    };

    walkDir(this.rootDir);
    return matchingFiles;
  }

  async cleanConsoleLogsFromFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      
      // Remove console.log, console.error, console.warn, console.debug
      const cleanedContent = content
        .replace(/^\s*console\.(log|error|warn|debug|info)\([^;]*\);\s*$/gm, '')
        .replace(/console\.(log|error|warn|debug|info)\([^;]*\);\s*/g, '')
        // Remove empty lines that were left behind
        .replace(/\n\s*\n\s*\n/g, '\n\n');

      if (content !== cleanedContent) {
        await fs.promises.writeFile(filePath, cleanedContent, 'utf8');
        this.cleanedConsoles.push(filePath);
        return true;
      }
    } catch (error) {
      console.error(`Error cleaning console logs from ${filePath}:`, error.message);
    }
    return false;
  }

  async cleanProductionEnvironment() {
    // 1. Remove test and debug files
    const filesToRemove = await this.findMatchingFiles(this.getFilesToRemove());
    
    for (const file of filesToRemove) {
      await this.removeFile(file);
    }

    // 2. Remove development directories
    const dirsToRemove = this.getDirectoriesToRemove();
    
    for (const dirPattern of dirsToRemove) {
      const dirName = dirPattern.replace('*', '').replace('/', '');
      const entries = fs.readdirSync(this.rootDir);
      
      for (const entry of entries) {
        const fullPath = path.join(this.rootDir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          if (dirPattern.includes('*')) {
            if (entry.startsWith(dirName.replace('*', ''))) {
              await this.removeDirectory(fullPath);
            }
          } else if (entry === dirName) {
            await this.removeDirectory(fullPath);
          }
        }
      }
    }

    // 3. Clean console logs from production files
    const filesToClean = await this.findMatchingFiles(this.getFilesToCleanConsoles());
    
    for (const file of filesToClean) {
      await this.cleanConsoleLogsFromFile(file);
    }

    // 4. Create production environment file
    await this.createProductionConfig();

    // 5. Generate cleanup report
    this.generateCleanupReport();
  }

  async createProductionConfig() {
    const productionEnv = `# Production Environment Configuration
NODE_ENV=production
VITE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=InventoryManagementDB_PROD
DB_USER=your_username
DB_PASSWORD=your_password

# Server
PORT=3001
VITE_API_URL=http://localhost:3001

# Security
ENABLE_CORS=false
DISABLE_LOGS=true
PRODUCTION_MODE=true

# Performance
CACHE_ENABLED=true
COMPRESSION_ENABLED=true
`;

    const envPath = path.join(this.rootDir, '.env.production');
    if (!fs.existsSync(envPath)) {
      await fs.promises.writeFile(envPath, productionEnv, 'utf8');
      }
  }

  generateCleanupReport() {
    }
}

// Run the cleanup
if (require.main === module) {
  const cleaner = new ProductionCleaner();
  cleaner.cleanProductionEnvironment().catch(console.error);
}

module.exports = ProductionCleaner;
