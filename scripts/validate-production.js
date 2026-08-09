#!/usr/bin/env node

/**
 * Production Environment Validator
 * Verifies that the production environment is clean and ready for deployment
 */

const fs = require('fs');
const path = require('path');

class ProductionValidator {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  // Patterns that should NOT exist in production
  getForbiddenPatterns() {
    return [
      /test-.*\.(js|ts|sql|html)$/i,
      /debug-.*\.(js|ts|sql)$/i,
      /\.test\.(js|ts)$/i,
      /\.spec\.(js|ts)$/i,
      /console\.(log|debug|info)\(/g,
      /TODO:/gi,
      /FIXME:/gi,
      /XXX:/gi,
      /HACK:/gi
    ];
  }

  // Files that should exist in production
  getRequiredFiles() {
    return [
      'package.json',
      'backend-server.cjs',
      'src/App.tsx',
      'src/main.tsx',
      '.env.production',
      'README.md',
      'vite.config.ts'
    ];
  }

  async validateFileStructure() {
    const requiredFiles = this.getRequiredFiles();
    for (const file of requiredFiles) {
      const filePath = path.join(this.rootDir, file);
      if (fs.existsSync(filePath)) {
        this.passed.push(`✅ Required file exists: ${file}`);
      } else {
        this.issues.push(`❌ Missing required file: ${file}`);
      }
    }
  }

  async validateNoTestFiles() {
    const testPatterns = [
      /test-.*\.(js|ts|sql|html)$/i,
      /debug-.*\.(js|ts|sql)$/i,
      /\.test\.(js|ts)$/i,
      /\.spec\.(js|ts)$/i
    ];

    this.walkDirectory(this.rootDir, (filePath, relativePath) => {
      for (const pattern of testPatterns) {
        if (pattern.test(relativePath)) {
          this.issues.push(`❌ Test file found in production: ${relativePath}`);
          return;
        }
      }
    });

    if (this.issues.filter(i => i.includes('Test file')).length === 0) {
      this.passed.push('✅ No test files found in production');
    }
  }

  async validateNoConsoleLogs() {
    const sourceFiles = [];
    this.walkDirectory(path.join(this.rootDir, 'src'), (filePath, relativePath) => {
      if (/\.(ts|tsx|js|jsx)$/.test(relativePath)) {
        sourceFiles.push(filePath);
      }
    });

    // Also check backend
    sourceFiles.push(path.join(this.rootDir, 'backend-server.cjs'));

    let foundConsoleLogs = 0;
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const consoleMatches = content.match(/console\.(log|debug|info)\(/g);
        if (consoleMatches) {
          foundConsoleLogs += consoleMatches.length;
          this.warnings.push(`⚠️  Console logs found in: ${path.relative(this.rootDir, file)} (${consoleMatches.length} instances)`);
        }
      } catch (error) {
        // File might not exist or be readable
      }
    }

    if (foundConsoleLogs === 0) {
      this.passed.push('✅ No console logs found in production code');
    }
  }

  async validatePackageJson() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
      
      // Check for production scripts
      const requiredScripts = ['start', 'build', 'preview'];
      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.passed.push(`✅ Production script exists: ${script}`);
        } else {
          this.issues.push(`❌ Missing production script: ${script}`);
        }
      }

      // Check for development-only scripts that shouldn't be in production
      const devOnlyScripts = ['git:auto', 'git:watch', 'perf:check', 'demo:reset'];
      for (const script of devOnlyScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.warnings.push(`⚠️  Development script found in production: ${script}`);
        }
      }

      // Check NODE_ENV
      if (process.env.NODE_ENV === 'production') {
        this.passed.push('✅ NODE_ENV set to production');
      } else {
        this.warnings.push('⚠️  NODE_ENV not set to production');
      }

    } catch (error) {
      this.issues.push('❌ Could not validate package.json');
    }
  }

  async validateEnvironmentConfig() {
    const envFile = path.join(this.rootDir, '.env.production');
    if (fs.existsSync(envFile)) {
      this.passed.push('✅ Production environment file exists');
      
      try {
        const envContent = fs.readFileSync(envFile, 'utf8');
        
        const requiredVars = ['DB_HOST', 'DB_NAME', 'PORT', 'NODE_ENV'];
        for (const varName of requiredVars) {
          if (envContent.includes(varName)) {
            this.passed.push(`✅ Environment variable configured: ${varName}`);
          } else {
            this.warnings.push(`⚠️  Missing environment variable: ${varName}`);
          }
        }
      } catch (error) {
        this.warnings.push('⚠️  Could not read production environment file');
      }
    } else {
      this.issues.push('❌ Missing .env.production file');
    }
  }

  walkDirectory(dir, callback) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(this.rootDir, fullPath);
      
      if (fs.statSync(fullPath).isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(file)) {
          this.walkDirectory(fullPath, callback);
        }
      } else {
        callback(fullPath, relativePath);
      }
    }
  }

  async runValidation() {
    await this.validateFileStructure();
    await this.validateNoTestFiles();
    await this.validateNoConsoleLogs();
    await this.validatePackageJson();
    await this.validateEnvironmentConfig();

    this.generateReport();
  }

  generateReport() {
    return this.issues.length === 0;
  }
}

// Run validation
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.runValidation().then(isReady => {
    process.exit(isReady ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionValidator;
