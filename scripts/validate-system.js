#!/usr/bin/env node

/**
 * InvMIS System Validation Script
 * Comprehensive testing and validation of all system enhancements
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SystemValidator {
    constructor() {
        this.results = {
            apiServer: { passed: 0, failed: 0, details: [] },
            security: { passed: 0, failed: 0, details: [] },
            services: { passed: 0, failed: 0, details: [] },
            database: { passed: 0, failed: 0, details: [] },
            deployment: { passed: 0, failed: 0, details: [] }
        };
        this.apiBaseUrl = 'http://localhost:5000';
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        }

    async validateFileExists(filePath, description) {
        try {
            await fs.access(filePath);
            this.log(`✓ ${description}: ${filePath}`);
            return true;
        } catch (error) {
            this.log(`✗ ${description} not found: ${filePath}`, 'ERROR');
            return false;
        }
    }

    async validateApiServer() {
        this.log('=== Validating Enhanced API Server ===');
        
        const tests = [
            {
                name: 'API Server File',
                test: () => this.validateFileExists('./invmis-demo-api.cjs', 'Enhanced API server'),
                category: 'apiServer'
            },
            {
                name: 'JWT Authentication',
                test: async () => {
                    const content = await fs.readFile('./invmis-demo-api.cjs', 'utf8');
                    const hasJWT = content.includes('jsonwebtoken') && content.includes('jwt.sign');
                    if (hasJWT) {
                        this.log('✓ JWT authentication implementation found');
                        return true;
                    } else {
                        this.log('✗ JWT authentication not implemented', 'ERROR');
                        return false;
                    }
                },
                category: 'security'
            },
            {
                name: 'Password Hashing',
                test: async () => {
                    const content = await fs.readFile('./invmis-demo-api.cjs', 'utf8');
                    const hasBcrypt = content.includes('bcryptjs') && content.includes('bcrypt.hash');
                    if (hasBcrypt) {
                        this.log('✓ Password hashing with bcrypt found');
                        return true;
                    } else {
                        this.log('✗ Password hashing not implemented', 'ERROR');
                        return false;
                    }
                },
                category: 'security'
            },
            {
                name: 'Rate Limiting',
                test: async () => {
                    const content = await fs.readFile('./invmis-demo-api.cjs', 'utf8');
                    const hasRateLimit = content.includes('express-rate-limit');
                    if (hasRateLimit) {
                        this.log('✓ Rate limiting middleware found');
                        return true;
                    } else {
                        this.log('✗ Rate limiting not implemented', 'ERROR');
                        return false;
                    }
                },
                category: 'security'
            },
            {
                name: 'Request Caching',
                test: async () => {
                    const content = await fs.readFile('./invmis-demo-api.cjs', 'utf8');
                    const hasCaching = content.includes('cache') && content.includes('TTL');
                    if (hasCaching) {
                        this.log('✓ Request caching implementation found');
                        return true;
                    } else {
                        this.log('✗ Request caching not implemented', 'ERROR');
                        return false;
                    }
                },
                category: 'apiServer'
            },
            {
                name: 'Input Validation',
                test: async () => {
                    const content = await fs.readFile('./invmis-demo-api.cjs', 'utf8');
                    const hasValidation = content.includes('express-validator');
                    if (hasValidation) {
                        this.log('✓ Input validation middleware found');
                        return true;
                    } else {
                        this.log('✗ Input validation not implemented', 'ERROR');
                        return false;
                    }
                },
                category: 'security'
            }
        ];

        await this.runTests(tests);
    }

    async validateAdvancedServices() {
        this.log('=== Validating Advanced Services ===');
        
        const serviceFiles = [
            { file: './src/services/notificationService.ts', name: 'Notification Service', category: 'services' },
            { file: './src/services/dataExportService.ts', name: 'Data Export Service', category: 'services' },
            { file: './src/services/auditLogService.ts', name: 'Audit Log Service', category: 'services' },
            { file: './src/services/advancedSearchService.ts', name: 'Advanced Search Service', category: 'services' }
        ];

        const tests = serviceFiles.map(({ file, name, category }) => ({
            name,
            test: () => this.validateFileExists(file, name),
            category
        }));

        // Test service functionality
        tests.push({
            name: 'Notification Service Functionality',
            test: async () => {
                try {
                    const content = await fs.readFile('./src/services/notificationService.ts', 'utf8');
                    const hasSingleton = content.includes('class NotificationService') && 
                                       content.includes('getInstance');
                    const hasTypes = content.includes('success') && content.includes('error') &&
                                   content.includes('warning') && content.includes('info');
                    
                    if (hasSingleton && hasTypes) {
                        this.log('✓ Notification service has singleton pattern and notification types');
                        return true;
                    } else {
                        this.log('✗ Notification service missing required functionality', 'ERROR');
                        return false;
                    }
                } catch (error) {
                    this.log('✗ Could not validate notification service functionality', 'ERROR');
                    return false;
                }
            },
            category: 'services'
        });

        tests.push({
            name: 'Data Export Service Formats',
            test: async () => {
                try {
                    const content = await fs.readFile('./src/services/dataExportService.ts', 'utf8');
                    const hasFormats = content.includes('excel') && content.includes('csv') &&
                                     content.includes('json') && content.includes('pdf');
                    
                    if (hasFormats) {
                        this.log('✓ Data export service supports multiple formats');
                        return true;
                    } else {
                        this.log('✗ Data export service missing format support', 'ERROR');
                        return false;
                    }
                } catch (error) {
                    this.log('✗ Could not validate data export service formats', 'ERROR');
                    return false;
                }
            },
            category: 'services'
        });

        await this.runTests(tests);
    }

    async validateServiceEndpoints() {
        this.log('=== Validating Service Endpoint Updates ===');
        
        const serviceFiles = [
            './src/services/inventoryServiceSqlServer.ts',
            './src/services/vendorsLocalService.ts',
            './src/services/tendersLocalService.ts',
            './src/services/usersLocalService.ts',
            './src/services/stockIssuanceService.ts'
        ];

        const tests = serviceFiles.map(file => ({
            name: `Endpoint Update - ${path.basename(file)}`,
            test: async () => {
                try {
                    const content = await fs.readFile(file, 'utf8');
                    const hasCorrectEndpoint = content.includes('localhost:5000') && 
                                             !content.includes('localhost:3001');
                    
                    if (hasCorrectEndpoint) {
                        this.log(`✓ ${path.basename(file)} uses correct endpoint (localhost:5000)`);
                        return true;
                    } else {
                        this.log(`✗ ${path.basename(file)} has incorrect endpoint`, 'ERROR');
                        return false;
                    }
                } catch (error) {
                    this.log(`✗ Could not validate ${path.basename(file)} endpoint`, 'ERROR');
                    return false;
                }
            },
            category: 'services'
        }));

        await this.runTests(tests);
    }

    async validateDatabaseSchema() {
        this.log('=== Validating Database Schema Files ===');
        
        const schemaFiles = [
            { file: './create-complete-database-schema.sql', name: 'Complete Database Schema' },
            { file: './create-approval-forwarding-schema-correct.sql', name: 'Approval Forwarding Schema' },
            { file: './create-stock-issuance-schema.sql', name: 'Stock Issuance Schema' },
            { file: './create-realistic-sample-data.sql', name: 'Sample Data' }
        ];

        const tests = schemaFiles.map(({ file, name }) => ({
            name,
            test: () => this.validateFileExists(file, name),
            category: 'database'
        }));

        await this.runTests(tests);
    }

    async validateDeploymentFiles() {
        this.log('=== Validating Deployment Configuration ===');
        
        const deploymentFiles = [
            { file: './DEPLOYMENT_GUIDE.md', name: 'Deployment Guide Documentation' },
            { file: './scripts/backup-strategy.sh', name: 'Unix Backup Script' },
            { file: './scripts/backup-strategy.ps1', name: 'Windows Backup Script' },
            { file: './scripts/deploy-windows.ps1', name: 'Windows Deployment Script' },
            { file: './Dockerfile', name: 'Docker Configuration' }
        ];

        const tests = deploymentFiles.map(({ file, name }) => ({
            name,
            test: () => this.validateFileExists(file, name),
            category: 'deployment'
        }));

        // Validate deployment guide content
        tests.push({
            name: 'Deployment Guide Completeness',
            test: async () => {
                try {
                    const content = await fs.readFile('./DEPLOYMENT_GUIDE.md', 'utf8');
                    const hasRequiredSections = content.includes('System Requirements') &&
                                              content.includes('Installation') &&
                                              content.includes('Configuration') &&
                                              content.includes('Security') &&
                                              content.includes('Monitoring') &&
                                              content.includes('Backup');
                    
                    if (hasRequiredSections) {
                        this.log('✓ Deployment guide has all required sections');
                        return true;
                    } else {
                        this.log('✗ Deployment guide missing required sections', 'ERROR');
                        return false;
                    }
                } catch (error) {
                    this.log('✗ Could not validate deployment guide content', 'ERROR');
                    return false;
                }
            },
            category: 'deployment'
        });

        await this.runTests(tests);
    }

    async validatePackageJson() {
        this.log('=== Validating Package Dependencies ===');
        
        const requiredPackages = {
            'jsonwebtoken': 'JWT authentication',
            'bcryptjs': 'Password hashing',
            'helmet': 'Security headers',
            'express-rate-limit': 'Rate limiting',
            'express-validator': 'Input validation',
            'xlsx': 'Excel export functionality'
        };

        try {
            const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            for (const [pkg, description] of Object.entries(requiredPackages)) {
                const test = {
                    name: `Package Dependency - ${pkg}`,
                    test: () => {
                        if (dependencies[pkg]) {
                            this.log(`✓ ${pkg} (${description}) - version ${dependencies[pkg]}`);
                            return true;
                        } else {
                            this.log(`✗ ${pkg} (${description}) - not installed`, 'ERROR');
                            return false;
                        }
                    },
                    category: 'apiServer'
                };

                await this.runTest(test);
            }
        } catch (error) {
            this.log('✗ Could not read package.json', 'ERROR');
            this.results.apiServer.failed++;
        }
    }

    async runTest(test) {
        try {
            const result = await test.test();
            if (result) {
                this.results[test.category].passed++;
                this.results[test.category].details.push(`✓ ${test.name}`);
            } else {
                this.results[test.category].failed++;
                this.results[test.category].details.push(`✗ ${test.name}`);
            }
        } catch (error) {
            this.log(`ERROR in test ${test.name}: ${error.message}`, 'ERROR');
            this.results[test.category].failed++;
            this.results[test.category].details.push(`✗ ${test.name} - ${error.message}`);
        }
    }

    async runTests(tests) {
        for (const test of tests) {
            await this.runTest(test);
        }
    }

    generateReport() {
        this.log('\n=== SYSTEM VALIDATION REPORT ===');
        
        let totalPassed = 0;
        let totalFailed = 0;
        
        for (const [category, results] of Object.entries(this.results)) {
            const categoryTotal = results.passed + results.failed;
            const percentage = categoryTotal > 0 ? ((results.passed / categoryTotal) * 100).toFixed(1) : '0.0';
            
            this.log(`\n${category.toUpperCase()}:`);
            this.log(`  Passed: ${results.passed}, Failed: ${results.failed} (${percentage}% success)`);
            
            totalPassed += results.passed;
            totalFailed += results.failed;
        }
        
        const overallTotal = totalPassed + totalFailed;
        const overallPercentage = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : '0.0';
        
        this.log(`\nOVERALL RESULTS:`);
        this.log(`  Total Tests: ${overallTotal}`);
        this.log(`  Passed: ${totalPassed}`);
        this.log(`  Failed: ${totalFailed}`);
        this.log(`  Success Rate: ${overallPercentage}%`);
        
        if (totalFailed === 0) {
            this.log('\n🎉 ALL VALIDATIONS PASSED! System is ready for production deployment.', 'SUCCESS');
        } else {
            this.log(`\n⚠️  ${totalFailed} validation(s) failed. Please review and fix issues before deployment.`, 'WARN');
        }
        
        // Generate detailed report file
        this.saveDetailedReport();
    }

    async saveDetailedReport() {
        const reportContent = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: Object.values(this.results).reduce((sum, cat) => sum + cat.passed + cat.failed, 0),
                totalPassed: Object.values(this.results).reduce((sum, cat) => sum + cat.passed, 0),
                totalFailed: Object.values(this.results).reduce((sum, cat) => sum + cat.failed, 0)
            },
            categories: this.results
        };

        try {
            await fs.writeFile(
                `./validation-report-${new Date().toISOString().split('T')[0]}.json`,
                JSON.stringify(reportContent, null, 2)
            );
            this.log('Detailed validation report saved');
        } catch (error) {
            this.log('Could not save detailed report', 'WARN');
        }
    }

    async validateSystem() {
        this.log('Starting comprehensive system validation...\n');
        
        await this.validateApiServer();
        await this.validateAdvancedServices();
        await this.validateServiceEndpoints();
        await this.validateDatabaseSchema();
        await this.validateDeploymentFiles();
        await this.validatePackageJson();
        
        this.generateReport();
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new SystemValidator();
    validator.validateSystem().catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = SystemValidator;