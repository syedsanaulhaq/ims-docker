// Database connection pool
const sql = require('mssql');
const config = require('../config/env.cjs');

// Database connection configuration
let dbServer = config.DB_HOST;
let instanceName = undefined;

if (dbServer && dbServer.includes('\\')) {
  const parts = dbServer.split('\\');
  dbServer = parts[0];
  instanceName = parts[1];
}

const dbConfig = {
  server: dbServer,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 100,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

if (instanceName) {
  dbConfig.options.instanceName = instanceName;
}

// Create connection pool
let pool = null;

async function initializePool() {
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    return pool;
  } catch (err) {
    console.error('❌ Database connection error:', err);
    throw err;
  }
}

// Get the pool (will be initialized on server start)
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool first.');
  }
  return pool;
}

// Close the pool
async function closePool() {
  if (pool) {
    await pool.close();
    }
}

module.exports = {
  sql,
  initializePool,
  getPool,
  closePool,
  dbConfig
};
