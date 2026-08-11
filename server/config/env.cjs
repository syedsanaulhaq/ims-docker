// Environment configuration
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Resolve the runtime mode from process-level variables first.
// File-loaded values should not silently change which env file we load.
const runtimeEnv = process.env.NODE_ENV || process.env.ENVIRONMENT || 'development';

const loadEnvFile = (envFile, override) => {
  if (!envFile) return;
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override });
  }
};

// 1) Load base defaults (only in development).
if (runtimeEnv !== 'production') {
  loadEnvFile('.env', false);
}

// 2) Allow explicit file override when provided.
if (process.env.ENV_FILE) {
  loadEnvFile(process.env.ENV_FILE, false);
} else {
  // 3) Load environment-specific file.
  loadEnvFile(`.env-${runtimeEnv}`, false);
}

// 4) Load SQL Server overrides last (only in development).
if (runtimeEnv !== 'production') {
  loadEnvFile('.env.sqlserver', false);
}

const config = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: runtimeEnv,
  
  // Database
  DB_HOST: process.env.SQL_SERVER_HOST || process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.SQL_SERVER_PORT || process.env.DB_PORT || '1433', 10),
  DB_USER: process.env.SQL_SERVER_USER || process.env.DB_USER || 'sa',
  DB_PASSWORD: process.env.SQL_SERVER_PASSWORD || process.env.DB_PASSWORD || 'Syed@2020',
  DB_NAME: process.env.SQL_SERVER_DATABASE || process.env.DB_NAME || 'InventoryManagementSystem',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'YourVerySecureSecretKeyAtLeast32CharactersLong123456',
  JWT_ISSUER: 'DigitalSystem',
  JWT_AUDIENCE: 'IMS',
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'inventory-management-secret-key-2025',
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  
  // File uploads
  UPLOAD_DIR: 'uploads/tender-files',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/i,
  
  // CORS
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:9080',
    'http://localhost:4173',
    'http://localhost',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:9080',
    'http://127.0.0.1:4173',
    'http://127.0.0.1',
    'http://172.20.150.34',
    'file://'
  ]
};

module.exports = config;
