#!/usr/bin/env node

/**
 * Vendor Selection System Verification
 * This script verifies all components are ready for vendor selection testing
 */

const { ConnectionPool, config: sqlConfig } = require('mssql');
const fs = require('fs');

async function verify() {
  // Check 1: Frontend build exists
  if (fs.existsSync('./dist/index.html')) {
    } else {
    }

  // Check 2: EditTender.tsx has vendor_ids initialization
  const editTenderPath = './src/pages/EditTender.tsx';
  const editTenderContent = fs.readFileSync(editTenderPath, 'utf8');
  
  if (editTenderContent.includes('vendor_ids: []')) {
    } else {
    }

  if (editTenderContent.includes('Vendor checkbox clicked')) {
    } else {
    }

  // Check 3: Backend POST endpoint
  const backendPath = './backend-server.cjs';
  const backendContent = fs.readFileSync(backendPath, 'utf8');

  if (backendContent.includes('vendor_ids array')) {
    } else {
    }

  if (backendContent.includes('Converted vendor_ids array to string')) {
    } else {
    }

  // Check 4: Database schema
  try {
    const pool = new ConnectionPool({
      server: 'SYED-FAZLI-LAPT',
      database: 'InventoryManagementDB',
      authentication: {
        type: 'default'
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        instancename: 'SQLEXPRESS'
      }
    });

    await pool.connect();
    
    // Check vendor_ids column
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tender_items' 
      AND COLUMN_NAME IN ('vendor_id', 'vendor_ids')
    `);

    if (result.recordset.length === 2) {
      result.recordset.forEach(row => {
        });
    } else {
      }

    // Check if any annual tenders exist
    const vendorCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM vendors
    `);

    await pool.close();
  } catch (err) {
    }

  }

verify().catch(console.error);
