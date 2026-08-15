const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.sqlserver' });

// Database configuration
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: 'master', // Connect to master to create database
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

async function setupDatabase() {
    try {
        const pool = await sql.connect(config);
        // Create database if it doesn't exist
        const dbName = process.env.DB_DATABASE || 'IMS_Database';
        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
            BEGIN
                CREATE DATABASE [${dbName}]
            END
        `);
        
        // Close connection and reconnect to the new database
        await pool.close();
        config.database = dbName;
        const dbPool = await sql.connect(config);

        // List of SQL files to execute in order
        const sqlFiles = [
            'create-complete-database-schema.sql',
            'create-realistic-sample-data.sql',
            'create-sample-item-masters.sql',
            'create-test-users.sql'
        ];

        for (const fileName of sqlFiles) {
            const filePath = path.join(__dirname, fileName);
            if (fs.existsSync(filePath)) {
                const sqlScript = fs.readFileSync(filePath, 'utf8');
                
                // Split by GO statements and execute separately
                const batches = sqlScript.split(/^\s*GO\s*$/gim);
                
                for (const batch of batches) {
                    const trimmedBatch = batch.trim();
                    if (trimmedBatch.length > 0) {
                        try {
                            await dbPool.request().query(trimmedBatch);
                        } catch (batchError) {
                            }
                    }
                }
                } else {
                }
        }

        await dbPool.close();

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

// Run the setup
setupDatabase();
