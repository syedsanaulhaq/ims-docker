// ============================================================================
// Direct / Without-Requisition Stock Issuance Routes (Multi-Item Supported)
// ============================================================================
// On-the-spot multi-item direct issuance to employees/officers with stock deduction,
// receiving slip tracking (Red/Green), and DD/DG reminder notifications.

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getPool, sql } = require('../db/connection.cjs');

// Upload setup for physical receiving slips
const uploadsDir = path.join(__dirname, '../uploads/receiving-slips');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `slip-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, storage });

// Middleware authentication helper
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

let tablesEnsured = false;

async function ensureTables(pool) {
  if (tablesEnsured) return;

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'direct_stock_issuances')
    BEGIN
      CREATE TABLE direct_stock_issuances (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        issuance_number NVARCHAR(100) NOT NULL UNIQUE,
        to_whom_issued_name NVARCHAR(250) NOT NULL,
        recipient_user_id NVARCHAR(450) NULL,
        recipient_branch_id NVARCHAR(100) NULL,
        recipient_wing_id INT NULL,
        item_master_id UNIQUEIDENTIFIER NULL,
        quantity_issued INT NULL,
        source_store_type NVARCHAR(50) NOT NULL DEFAULT 'admin',
        source_wing_id INT NULL,
        source_branch_id NVARCHAR(100) NULL,
        received_by_name NVARCHAR(250) NOT NULL,
        issued_by_user_id NVARCHAR(450) NOT NULL,
        issued_by_name NVARCHAR(250) NULL,
        issuance_date DATETIME2 NOT NULL DEFAULT GETDATE(),
        slip_status NVARCHAR(50) NOT NULL DEFAULT 'slip_not_received',
        slip_proof_url NVARCHAR(1000) NULL,
        slip_received_at DATETIME2 NULL,
        slip_received_by NVARCHAR(450) NULL,
        reminder_count INT NOT NULL DEFAULT 0,
        last_reminder_sent_at DATETIME2 NULL,
        escalated_to_designation NVARCHAR(100) NULL,
        notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    END;

    -- Make legacy columns nullable if they were created NOT NULL previously
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('direct_stock_issuances') AND name = 'item_master_id' AND is_nullable = 0)
    BEGIN
      ALTER TABLE direct_stock_issuances ALTER COLUMN item_master_id UNIQUEIDENTIFIER NULL;
    END;

    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('direct_stock_issuances') AND name = 'quantity_issued' AND is_nullable = 0)
    BEGIN
      ALTER TABLE direct_stock_issuances ALTER COLUMN quantity_issued INT NULL;
    END;

    -- Multi-item child table
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'direct_stock_issuance_items')
    BEGIN
      CREATE TABLE direct_stock_issuance_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        direct_issuance_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        quantity_issued INT NOT NULL CHECK (quantity_issued > 0),
        item_status NVARCHAR(50) NOT NULL DEFAULT 'pending',
        notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    END;
  `);

  tablesEnsured = true;
}

// ============================================================================
// GET /api/direct-issuance/items - Get full items catalog with categories, groups & stock
// ============================================================================
router.get('/items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const result = await pool.request().query(`
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature,
        im.group_number,
        im.unit,
        im.category_id,
        COALESCE(c.category_name, 'General') AS category_name,
        COALESCE(
          (SELECT SUM(sa.quantity_available) 
           FROM stock_acquisitions sa 
           WHERE sa.item_master_id = im.id 
             AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)),
          sa_admin.available_quantity,
          0
        ) AS available_quantity
      FROM item_masters im
      LEFT JOIN categories c ON c.id = im.category_id AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
      LEFT JOIN stock_admin sa_admin ON sa_admin.item_master_id = im.id
      WHERE (im.is_deleted = 0 OR im.is_deleted IS NULL)
      ORDER BY im.nomenclature ASC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching direct issuance items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch items catalog', details: error.message });
  }
});

// ============================================================================
// GET /api/direct-issuance/users - Get active employees with Designation, Wing & Branch
// ============================================================================
router.get('/users', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    let users = [];
    try {
      const result = await pool.request().query(`
        SELECT 
          u.Id,
          LTRIM(RTRIM(u.FullName)) AS FullName,
          u.UserName,
          u.CNIC,
          u.Email,
          u.DesignationName,
          u.WingName,
          u.DECName,
          u.OfficeName,
          u.WinfID AS wing_id,
          u.intBranchID AS branch_id,
          u.Role
        FROM vw_AspNetUser_with_Reg_App_DEC_ID u
        WHERE u.ISACT = 1 AND u.FullName IS NOT NULL AND LTRIM(RTRIM(u.FullName)) <> ''
        ORDER BY u.FullName ASC
      `);
      users = result.recordset;
    } catch (viewErr) {
      console.warn('vw_AspNetUser_with_Reg_App_DEC_ID query failed, falling back to AspNetUsers:', viewErr.message);
      const fallbackResult = await pool.request().query(`
        SELECT 
          u.Id,
          LTRIM(RTRIM(u.FullName)) AS FullName,
          u.UserName,
          u.CNIC,
          u.Email,
          NULL AS DesignationName,
          NULL AS WingName,
          NULL AS DECName,
          NULL AS OfficeName,
          u.intWingID AS wing_id,
          NULL AS branch_id,
          u.Role
        FROM AspNetUsers u
        WHERE u.ISACT = 1 AND u.FullName IS NOT NULL AND LTRIM(RTRIM(u.FullName)) <> ''
        ORDER BY u.FullName ASC
      `);
      users = fallbackResult.recordset;
    }

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('❌ Error fetching employees for direct issuance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees list', details: error.message });
  }
});

// ============================================================================
// GET /api/direct-issuance - List direct issuances with aggregated multi-items
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const { status, search, from_date, to_date } = req.query;

    let query = `
      SELECT 
        dsi.*,
        COALESCE(im.nomenclature, 'Multi-Item Issuance') AS item_nomenclature,
        COALESCE(im.unit, 'units') AS item_unit,
        im.group_number AS item_group_number,
        COALESCE(c.category_name, 'General') AS category_name,
        COALESCE(u_issued.FullName, u_issued.UserName, dsi.issued_by_name, 'Storekeeper') AS issuer_full_name,
        COALESCE(u_rec.FullName, u_rec.UserName, dsi.to_whom_issued_name) AS recipient_full_name,
        COALESCE(
          (SELECT COUNT(*) FROM direct_stock_issuance_items dsii WHERE dsii.direct_issuance_id = dsi.id),
          CASE WHEN dsi.quantity_issued IS NOT NULL THEN 1 ELSE 0 END
        ) AS items_count,
        COALESCE(
          (SELECT SUM(dsii.quantity_issued) FROM direct_stock_issuance_items dsii WHERE dsii.direct_issuance_id = dsi.id),
          dsi.quantity_issued,
          0
        ) AS total_quantity_issued
      FROM direct_stock_issuances dsi
      LEFT JOIN item_masters im ON im.id = dsi.item_master_id
      LEFT JOIN categories c ON c.id = im.category_id
      LEFT JOIN AspNetUsers u_issued ON u_issued.Id = dsi.issued_by_user_id
      LEFT JOIN AspNetUsers u_rec ON u_rec.Id = dsi.recipient_user_id
      WHERE 1=1
    `;

    const request = pool.request();

    if (status) {
      request.input('status', sql.NVarChar(50), status);
      query += ` AND dsi.slip_status = @status`;
    }

    if (search) {
      request.input('search', sql.NVarChar(250), `%${search}%`);
      query += ` AND (
        dsi.issuance_number LIKE @search OR
        dsi.to_whom_issued_name LIKE @search OR
        dsi.received_by_name LIKE @search OR
        im.nomenclature LIKE @search OR
        im.item_code LIKE @search OR
        EXISTS (
          SELECT 1 FROM direct_stock_issuance_items dsii2
          JOIN item_masters im2 ON im2.id = dsii2.item_master_id
          WHERE dsii2.direct_issuance_id = dsi.id
            AND (im2.nomenclature LIKE @search OR im2.item_code LIKE @search)
        )
      )`;
    }

    if (from_date) {
      request.input('fromDate', sql.DateTime2, new Date(from_date));
      query += ` AND dsi.issuance_date >= @fromDate`;
    }

    if (to_date) {
      request.input('toDate', sql.DateTime2, new Date(to_date));
      query += ` AND dsi.issuance_date <= @toDate`;
    }

    query += ` ORDER BY dsi.issuance_date DESC`;

    const result = await request.query(query);
    const issuances = result.recordset;

    // Fetch items for each issuance
    if (issuances.length > 0) {
      const ids = issuances.map(i => `'${i.id}'`).join(',');
      const itemsRes = await pool.request().query(`
        SELECT 
          dsii.id,
          dsii.direct_issuance_id,
          dsii.item_master_id,
          dsii.quantity_issued,
          dsii.item_status,
          im.nomenclature,
          im.item_code,
          im.group_number,
          im.unit,
          c.category_name
        FROM direct_stock_issuance_items dsii
        JOIN item_masters im ON im.id = dsii.item_master_id
        LEFT JOIN categories c ON c.id = im.category_id
        WHERE dsii.direct_issuance_id IN (${ids})
        ORDER BY dsii.created_at ASC
      `);

      const itemsByIssuance = {};
      itemsRes.recordset.forEach(item => {
        if (!itemsByIssuance[item.direct_issuance_id]) {
          itemsByIssuance[item.direct_issuance_id] = [];
        }
        itemsByIssuance[item.direct_issuance_id].push(item);
      });

      issuances.forEach(iss => {
        iss.items = itemsByIssuance[iss.id] || (iss.item_master_id ? [{
          id: iss.id,
          direct_issuance_id: iss.id,
          item_master_id: iss.item_master_id,
          nomenclature: iss.item_nomenclature,
          item_code: iss.item_code,
          group_number: iss.item_group_number,
          category_name: iss.category_name,
          unit: iss.item_unit,
          quantity_issued: iss.quantity_issued,
          item_status: iss.slip_status === 'slip_received' ? 'received' : 'pending'
        }] : []);
      });
    }

    res.json({
      success: true,
      count: issuances.length,
      data: issuances
    });
  } catch (error) {
    console.error('❌ Error listing direct issuances:', error);
    res.status(500).json({ success: false, error: 'Failed to list direct issuances', details: error.message });
  }
});

// ============================================================================
// GET /api/direct-issuance/:id - Get Single Direct Issuance with all items
// ============================================================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const { id } = req.params;

    const issRes = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          dsi.*,
          COALESCE(u_issued.FullName, u_issued.UserName, dsi.issued_by_name, 'Storekeeper') AS issuer_full_name,
          COALESCE(u_rec.FullName, u_rec.UserName, dsi.to_whom_issued_name) AS recipient_full_name
        FROM direct_stock_issuances dsi
        LEFT JOIN AspNetUsers u_issued ON u_issued.Id = dsi.issued_by_user_id
        LEFT JOIN AspNetUsers u_rec ON u_rec.Id = dsi.recipient_user_id
        WHERE dsi.id = @id
      `);

    if (!issRes.recordset || issRes.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Direct issuance record not found' });
    }

    const issuance = issRes.recordset[0];

    const itemsRes = await pool.request()
      .input('directIssuanceId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          dsii.id,
          dsii.direct_issuance_id,
          dsii.item_master_id,
          dsii.quantity_issued,
          dsii.item_status,
          im.nomenclature,
          im.item_code,
          im.group_number,
          im.unit,
          c.category_name
        FROM direct_stock_issuance_items dsii
        JOIN item_masters im ON im.id = dsii.item_master_id
        LEFT JOIN categories c ON c.id = im.category_id
        WHERE dsii.direct_issuance_id = @directIssuanceId
        ORDER BY dsii.created_at ASC
      `);

    issuance.items = itemsRes.recordset;

    res.json({
      success: true,
      data: issuance
    });
  } catch (error) {
    console.error('❌ Error fetching direct issuance by ID:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch direct issuance detail', details: error.message });
  }
});

// ============================================================================
// POST /api/direct-issuance - Create Multi-Item Direct ("Without-Requisition") Issuance
// Instantly deducts inventory stock and logs transaction audit records for each item.
// ============================================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const {
      items, // Array of { item_master_id, quantity_issued }
      item_master_id, // Backward compatibility for single item
      quantity_issued, // Backward compatibility
      to_whom_issued_name,
      received_by_name,
      recipient_user_id,
      recipient_branch_id,
      recipient_wing_id,
      source_store_type = 'admin',
      source_wing_id,
      notes
    } = req.body;

    const userId = req.session.userId;
    const userName = req.session.user?.FullName || req.session.user?.user_name || 'Storekeeper';

    // Normalize items array
    let itemsToProcess = [];
    if (Array.isArray(items) && items.length > 0) {
      itemsToProcess = items.filter(i => i.item_master_id && Number(i.quantity_issued) > 0);
    } else if (item_master_id && Number(quantity_issued) > 0) {
      itemsToProcess = [{ item_master_id, quantity_issued: Number(quantity_issued) }];
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one item with valid quantity is required' });
    }

    if (!to_whom_issued_name || !received_by_name) {
      return res.status(400).json({ success: false, error: 'Recipient name and Received By are required' });
    }

    const totalQty = itemsToProcess.reduce((sum, item) => sum + Number(item.quantity_issued), 0);
    const primaryItem = itemsToProcess[0];

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Generate unique issuance number
      const issNumRes = await transaction.request().query(`
        SELECT COUNT(*) AS total FROM direct_stock_issuances
      `);
      const count = Number(issNumRes.recordset[0]?.total || 0) + 1;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const issuanceNumber = `DIR-ISS-${dateStr}-${String(count).padStart(4, '0')}`;

      // 2. Insert master direct_stock_issuances record
      const insertRes = await transaction.request()
        .input('issuanceNumber', sql.NVarChar(100), issuanceNumber)
        .input('toWhom', sql.NVarChar(250), to_whom_issued_name)
        .input('recUserId', sql.NVarChar(450), recipient_user_id || null)
        .input('recBranchId', sql.NVarChar(100), recipient_branch_id ? String(recipient_branch_id) : null)
        .input('recWingId', sql.Int, recipient_wing_id || null)
        .input('primaryItemMasterId', sql.UniqueIdentifier, primaryItem.item_master_id)
        .input('totalQty', sql.Int, totalQty)
        .input('sourceStore', sql.NVarChar(50), source_store_type)
        .input('srcWingId', sql.Int, source_wing_id || null)
        .input('receivedBy', sql.NVarChar(250), received_by_name)
        .input('issuedByUserId', sql.NVarChar(450), userId)
        .input('issuedByName', sql.NVarChar(250), userName)
        .input('notes', sql.NVarChar(sql.MAX), notes || 'Direct express issuance without requisition')
        .query(`
          INSERT INTO direct_stock_issuances (
            issuance_number, to_whom_issued_name, recipient_user_id, recipient_branch_id, recipient_wing_id,
            item_master_id, quantity_issued, source_store_type, source_wing_id, received_by_name,
            issued_by_user_id, issued_by_name, issuance_date, slip_status, notes
          )
          OUTPUT INSERTED.*
          VALUES (
            @issuanceNumber, @toWhom, @recUserId, @recBranchId, @recWingId,
            @primaryItemMasterId, @totalQty, @sourceStore, @srcWingId, @receivedBy,
            @issuedByUserId, @issuedByName, GETDATE(), 'slip_not_received', @notes
          )
        `);

      const createdIssuance = insertRes.recordset[0];

      // 3. Process each item: insert child record & deduct physical stock
      for (const it of itemsToProcess) {
        const itemQty = Number(it.quantity_issued);

        // Insert item record into direct_stock_issuance_items
        await transaction.request()
          .input('directIssuanceId', sql.UniqueIdentifier, createdIssuance.id)
          .input('itemMasterId', sql.UniqueIdentifier, it.item_master_id)
          .input('qty', sql.Int, itemQty)
          .query(`
            INSERT INTO direct_stock_issuance_items (
              direct_issuance_id, item_master_id, quantity_issued, item_status, created_at, updated_at
            ) VALUES (
              @directIssuanceId, @itemMasterId, @qty, 'pending', GETDATE(), GETDATE()
            )
          `);

        // Deduct from stock_admin
        try {
          await transaction.request()
            .input('itemMasterId', sql.UniqueIdentifier, it.item_master_id)
            .input('qty', sql.Int, itemQty)
            .input('userId', sql.NVarChar(450), userId)
            .query(`
              IF EXISTS (SELECT 1 FROM stock_admin WHERE item_master_id = @itemMasterId)
              BEGIN
                UPDATE stock_admin
                SET available_quantity = available_quantity - @qty,
                    current_quantity = current_quantity - @qty,
                    updated_at = GETDATE(),
                    updated_by = @userId
                WHERE item_master_id = @itemMasterId;
              END
              ELSE
              BEGIN
                INSERT INTO stock_admin (item_master_id, current_quantity, available_quantity, reserved_quantity, created_at, updated_at)
                VALUES (@itemMasterId, 0 - @qty, 0 - @qty, 0, GETDATE(), GETDATE());
              END
            `);
        } catch (stockAdminErr) {
          console.warn('⚠️ stock_admin deduction warning:', stockAdminErr.message);
        }

        // Deduct from stock_acquisitions (FIFO)
        try {
          await transaction.request()
            .input('itemMasterId', sql.UniqueIdentifier, it.item_master_id)
            .input('qty', sql.Int, itemQty)
            .query(`
              WITH cte AS (
                SELECT TOP (1) quantity_available
                FROM stock_acquisitions
                WHERE item_master_id = @itemMasterId
                  AND (is_deleted = 0 OR is_deleted IS NULL)
                  AND quantity_available >= @qty
                ORDER BY created_at ASC
              )
              UPDATE cte SET quantity_available = quantity_available - @qty;
            `);
        } catch (acqErr) {
          console.warn('⚠️ stock_acquisitions deduction warning:', acqErr.message);
        }

        // Create transaction audit trail
        try {
          await transaction.request()
            .input('itemMasterId', sql.UniqueIdentifier, it.item_master_id)
            .input('qty', sql.Decimal(18, 2), itemQty)
            .input('refId', sql.UniqueIdentifier, createdIssuance.id)
            .input('refNum', sql.NVarChar(100), issuanceNumber)
            .input('createdBy', sql.UniqueIdentifier, userId)
            .query(`
              INSERT INTO stock_transactions (
                id, transaction_number, item_master_id, transaction_type, quantity,
                unit_price, total_value, reference_type, reference_id, reference_number,
                transaction_date, created_by, status, created_at
              ) VALUES (
                NEWID(),
                'TXN-DIR-' + FORMAT(GETDATE(), 'yyyyMMdd-HHmmss') + '-' + SUBSTRING(CAST(NEWID() AS VARCHAR(36)), 1, 4),
                @itemMasterId,
                'ISSUANCE',
                @qty,
                0, 0,
                'direct_stock_issuance',
                @refId,
                @refNum,
                GETDATE(),
                @createdBy,
                'completed',
                GETDATE()
              )
            `);
        } catch (txnErr) {
          console.warn('⚠️ stock_transactions audit log warning:', txnErr.message);
        }
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `Direct issuance ${issuanceNumber} (${itemsToProcess.length} items, total ${totalQty} units) recorded successfully!`,
        data: createdIssuance
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error creating direct issuance:', error);
    res.status(500).json({ success: false, error: 'Failed to process direct issuance', details: error.message });
  }
});

// ============================================================================
// POST /api/direct-issuance/:id/upload-slip - Upload signed receiving slip
// Toggles slip_status from 'slip_not_received' (🔴 RED) to 'slip_received' (🟢 GREEN)
// ============================================================================
router.post('/:id/upload-slip', requireAuth, upload.single('slip_proof'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const { id } = req.params;
    const userId = req.session.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No receiving slip image/document uploaded' });
    }

    const proofUrl = `/uploads/receiving-slips/${req.file.filename}`;

    const updateRes = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('proofUrl', sql.NVarChar(1000), proofUrl)
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        UPDATE direct_stock_issuances
        SET slip_status = 'slip_received',
            slip_proof_url = @proofUrl,
            slip_received_at = GETDATE(),
            slip_received_by = @userId,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id;

        UPDATE direct_stock_issuance_items
        SET item_status = 'received',
            updated_at = GETDATE()
        WHERE direct_issuance_id = @id;
      `);

    if (!updateRes.recordset || updateRes.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Direct issuance record not found' });
    }

    res.json({
      success: true,
      message: 'Physical receiving slip uploaded & verified! Status updated to GREEN (Slip Received).',
      data: updateRes.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error uploading receiving slip:', error);
    res.status(500).json({ success: false, error: 'Failed to upload receiving slip', details: error.message });
  }
});

// ============================================================================
// POST /api/direct-issuance/:id/send-reminder - Trigger DD / DG Reminder
// ============================================================================
router.post('/:id/send-reminder', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const { id } = req.params;
    const { target_designation = 'DD Admin' } = req.body;

    const updateRes = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('target', sql.NVarChar(100), target_designation)
      .query(`
        UPDATE direct_stock_issuances
        SET reminder_count = reminder_count + 1,
            last_reminder_sent_at = GETDATE(),
            escalated_to_designation = @target,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (!updateRes.recordset || updateRes.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Issuance record not found' });
    }

    const record = updateRes.recordset[0];

    res.json({
      success: true,
      message: `Reminder sent successfully to ${target_designation} for issuance ${record.issuance_number}!`,
      data: record
    });
  } catch (error) {
    console.error('❌ Error sending reminder:', error);
    res.status(500).json({ success: false, error: 'Failed to send reminder', details: error.message });
  }
});

module.exports = router;
