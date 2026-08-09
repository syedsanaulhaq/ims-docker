#!/usr/bin/env node

/**
 * VS Code Performance Cleanup Script
 * Run this to clean up files that might be slowing down VS Code
 */

const fs = require('fs');
const path = require('path');

// Directories to clean
const cleanupDirs = [
  'node_modules/.cache',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.nyc_output',
  'tmp',
  'temp'
];

// File patterns to clean
const cleanupPatterns = [
  '**/*.log',
  '**/*.tmp',
  '**/*.cache',
  '**/.DS_Store',
  '**/Thumbs.db'
];

// Clean directories
cleanupDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      } catch (error) {
      }
  }
});

// Check TypeScript cache
const tscache = path.join(process.cwd(), 'node_modules/.cache/typescript');
if (fs.existsSync(tscache)) {
  try {
    fs.rmSync(tscache, { recursive: true, force: true });
    } catch (error) {
    }
}

