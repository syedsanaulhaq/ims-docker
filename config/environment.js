// Environment Configuration Manager
// This module handles switching between different environments

const path = require('path');
require('dotenv').config();

// Environment types
const ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development'
};

// Current environment (can be overridden by ENV_STAGE environment variable)
const currentEnv = process.env.ENV_STAGE || process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;

// Load environment-specific configuration
function loadEnvironmentConfig(env = currentEnv) {
  const envFile = `.env.${env}`;
  const envPath = path.join(process.cwd(), envFile);
  
  try {
    require('dotenv').config({ path: envPath });
    } catch (error) {
    require('dotenv').config();
  }
}

// Get configuration for current environment
function getConfig() {
  return {
    env: currentEnv,
    port: process.env.PORT || 3001,
    database: {
      server: process.env.SQL_SERVER_HOST || 'localhost',
      database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
      user: process.env.SQL_SERVER_USER || 'sa',
      password: process.env.SQL_SERVER_PASSWORD,
      port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
      options: {
        encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
        trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT !== 'false'
      }
    },
    frontend: {
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
      environment: process.env.REACT_APP_ENV || currentEnv
    }
  };
}

// Switch to specific environment
function switchEnvironment(env) {
  if (!Object.values(ENVIRONMENTS).includes(env)) {
    throw new Error(`Invalid environment: ${env}. Valid options: ${Object.values(ENVIRONMENTS).join(', ')}`);
  }
  
  process.env.ENV_STAGE = env;
  loadEnvironmentConfig(env);
  
  return getConfig();
}

// Initialize with current environment
loadEnvironmentConfig();

module.exports = {
  ENVIRONMENTS,
  currentEnv,
  getConfig,
  switchEnvironment,
  loadEnvironmentConfig
};
