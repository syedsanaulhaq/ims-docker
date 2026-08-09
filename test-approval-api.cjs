#!/usr/bin/env node

require('dotenv').config({ path: '.env.sqlserver' });
const express = require('express');
const sql = require('mssql');

const app = express();
app.use(express.json());

const sqlConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
};

let pool;

async function initializePool() {
  try {
    pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Get pending approvals for a user
app.get('/api/approvals/my-approvals', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
    }

    // Get pending approvals for this user
    const approvalsResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('status', sql.NVarChar, 'pending')
      .query(`
        SELECT
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND ra.current_status = @status
        ORDER BY ra.submitted_date DESC
      `);

    const approvals = [];

    for (const approval of approvalsResult.recordset) {
      // Load items for each approval
      let items = [];
      try {
        const stockItemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, approval.request_id)
          .query(`
            SELECT
              si_items.item_master_id as item_id,
              CASE
                WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
                ELSE COALESCE(im.nomenclature, 'Unknown Item')
              END as item_name,
              si_items.requested_quantity,
              si_items.approved_quantity,
              COALESCE(im.unit, 'units') as unit,
              si_items.item_type
            FROM stock_issuance_items si_items
            LEFT JOIN item_masters im ON im.id = si_items.item_master_id
            WHERE si_items.request_id = @requestId
            ORDER BY
              CASE
                WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
                ELSE im.nomenclature
              END
          `);

        items = stockItemsResult.recordset || [];
      } catch (itemError) {
        items = [];
      }

      const processedApproval = {
        id: approval.id,
        request_id: approval.request_id,
        request_type: approval.request_type || 'stock_issuance',
        title: approval.title || 'Stock Issuance Request',
        description: approval.description || 'Request for inventory items',
        requested_date: approval.requested_date || approval.submitted_date,
        submitted_date: approval.submitted_date,
        requester_name: approval.requester_name || 'Unknown User',
        current_approver_name: approval.current_approver_name,
        current_status: approval.current_status || 'pending',
        items: items,
        total_items: approval.total_items || 0,
        priority: 'Medium'
      };

      approvals.push(processedApproval);
    }

    res.json({
      success: true,
      data: approvals,
      total: approvals.length,
      message: `Found ${approvals.length} pending approvals`
    });

  } catch (error) {
    console.error('❌ Error fetching my approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

async function start() {
  const connected = await initializePool();
  if (!connected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  const PORT = 3002; // Using different port
  app.listen(PORT, () => {
    });
}

start();
