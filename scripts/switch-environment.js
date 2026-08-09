#!/usr/bin/env node

// Environment Switcher Script
// Usage: node scripts/switch-environment.js [production|staging|development]

const { switchEnvironment, ENVIRONMENTS, getConfig } = require('../config/environment');

const args = process.argv.slice(2);
const targetEnv = args[0];

if (!targetEnv) {
  Object.values(ENVIRONMENTS).forEach(env => {
    });
  process.exit(1);
}

try {
  const config = switchEnvironment(targetEnv);
  
  } catch (error) {
  console.error('❌ Error switching environment:', error.message);
  process.exit(1);
}
