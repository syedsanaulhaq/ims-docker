// ============================================================================
// Disposals and Utility Routes
// ============================================================================
// Disposals, locations, stores, and other miscellaneous endpoints

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/disposals - Get all disposals
// ============================================================================
router.get('/disposals', async (req, res) => {
  try {
    const pool = getPool();
    const { status } = req.query;

    let query = `
      SELECT 
        d.id,
        d.disposal_code,
        d.wing_id,
        d.status,
        d.submitted_at,
        d.approved_at,
        COUNT(di.id) as item_count,
        w.Name as wing_name
      FROM disposals d
      LEFT JOIN disposal_items di ON d.id = di.disposal_id
      LEFT JOIN WingsInformation w ON d.wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND d.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    query += ` GROUP BY d.id, d.disposal_code, d.wing_id, d.status, d.submitted_at, d.approved_at, w.Name
             ORDER BY d.submitted_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    // Return empty array if table doesn't exist (error 208)
    if (error.number === 208) {
      return res.json([]);
    }
    console.error('Error fetching disposals:', error);
    res.status(500).json({ error: 'Failed to fetch disposals' });
  }
});

// ============================================================================
// POST /api/disposals - Create disposal
// ============================================================================
router.post('/disposals', requireAuth, async (req, res) => {
  try {
    const { wing_id, items, reason } = req.body;
    const pool = getPool();

    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'wing_id and items are required' });
    }

    const disposalId = uuidv4();
    const disposalCode = `DISP-${Date.now()}`;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('id', sql.UniqueIdentifier, disposalId)
        .input('code', sql.NVarChar(50), disposalCode)
        .input('wingId', sql.Int, wing_id)
        .input('reason', sql.NVarChar(sql.MAX), reason)
        .input('createdBy', sql.NVarChar(450), req.session.userId)
        .query(`
          INSERT INTO disposals (id, disposal_code, wing_id, status, reason, created_by, submitted_at)
          VALUES (@id, @code, @wingId, 'Pending', @reason, @createdBy, GETDATE())
        `);

      for (const item of items) {
        await transaction.request()
          .input('disposalId', sql.UniqueIdentifier, disposalId)
          .input('itemId', sql.UniqueIdentifier, item.item_id)
          .input('qty', sql.Int, item.quantity)
          .input('reason', sql.NVarChar(500), item.reason)
          .query(`
            INSERT INTO disposal_items (disposal_id, item_master_id, quantity, reason)
            VALUES (@disposalId, @itemId, @qty, @reason)
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, disposal_id: disposalId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    // Return 501 Not Implemented if table doesn't exist (error 208)
    if (error.number === 208) {
      return res.status(501).json({ error: 'Disposals feature not yet implemented' });
    }
    console.error('Error creating disposal:', error);
    res.status(500).json({ error: 'Failed to create disposal' });
  }
});

// ============================================================================
// GET /api/stores - Get all stores/locations
// ============================================================================
router.get('/stores', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        id,
        store_name,
        location,
        wing_id,
        store_type,
        is_active,
        created_at,
        w.Name as wing_name
      FROM stores s
      LEFT JOIN WingsInformation w ON s.wing_id = w.Id
      WHERE is_active = 1
      ORDER BY store_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// ============================================================================
// POST /api/stores - Create store
// ============================================================================
router.post('/stores', requireAuth, async (req, res) => {
  try {
    const { store_name, location, wing_id, store_type } = req.body;
    const pool = getPool();

    if (!store_name || !location) {
      return res.status(400).json({ error: 'store_name and location are required' });
    }

    const storeId = uuidv4();

    await pool.request()
      .input('id', sql.UniqueIdentifier, storeId)
      .input('name', sql.NVarChar(255), store_name)
      .input('location', sql.NVarChar(500), location)
      .input('wingId', sql.Int, wing_id)
      .input('type', sql.NVarChar(50), store_type || 'General')
      .input('createdBy', sql.NVarChar(450), req.session.userId)
      .query(`
        INSERT INTO stores (id, store_name, location, wing_id, store_type, is_active, created_by, created_at)
        VALUES (@id, @name, @location, @wingId, @type, 1, @createdBy, GETDATE())
      `);

    res.status(201).json({ success: true, store_id: storeId });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// ============================================================================
// GET /api/offices - Get all offices
// ============================================================================
router.get('/offices', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        intOfficeID,
        strOfficeName,
        strOfficeDescription,
        intProvinceID,
        OfficeCode
      FROM tblOffices
      WHERE IS_ACT = 1
      ORDER BY strOfficeName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching offices:', error);
    res.status(500).json({ error: 'Failed to fetch offices' });
  }
});

// ============================================================================
// GET /api/wings - Get all wings
// ============================================================================
router.get('/wings', async (req, res) => {
  try {
    const pool = getPool();
    const { office_id } = req.query;

    let query = `
      SELECT 
        Id,
        Name,
        ShortName,
        OfficeID,
        IS_ACT,
        FocalPerson,
        ContactNo
      FROM WingsInformation
      WHERE IS_ACT = 1
    `;

    let request = pool.request();

    if (office_id) {
      query += ` AND OfficeID = @officeId`;
      request = request.input('officeId', sql.Int, office_id);
    }

    query += ` ORDER BY Name`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching wings:', error);
    res.status(500).json({ error: 'Failed to fetch wings' });
  }
});

// ============================================================================
// GET /api/designations - Get all designations
// ============================================================================
router.get('/designations', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        intDesignationID,
        strDesignation,
        intDepartmentID
      FROM tblUserDesignations
      ORDER BY strDesignation
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// ============================================================================
// GET /api/offices/:officeId/wings - Get wings for a specific office
// ============================================================================
router.get('/offices/:officeId/wings', async (req, res) => {
  try {
    const { officeId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('officeId', sql.Int, officeId)
      .query(`
        SELECT 
          Id,
          Name,
          ShortName,
          FocalPerson,
          ContactNo,
          Creator,
          CreateDate,
          Modifier,
          ModifyDate,
          OfficeID,
          IS_ACT,
          HODID,
          HODName,
          WingCode,
          CreatedAt,
          UpdatedAt
        FROM WingsInformation 
        WHERE OfficeID = @officeId AND IS_ACT = 1
        ORDER BY Name
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching wings for office:', error);
    res.status(500).json({ error: 'Failed to fetch wings', details: error.message });
  }
});

// ============================================================================
// GET /api/wings/:wingId/decs - Get DECs for a specific wing
// ============================================================================
router.get('/wings/:wingId/decs', async (req, res) => {
  try {
    const { wingId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT 
          intAutoID,
          WingID,
          DECName,
          DECAcronym,
          DECAddress,
          Location,
          IS_ACT,
          DateAdded,
          DECCode,
          HODID,
          HODName,
          CreatedAt,
          UpdatedAt,
          CreatedBy,
          UpdatedBy,
          Version
        FROM DEC_MST 
        WHERE WingID = @wingId AND IS_ACT = 1
        ORDER BY DECName
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching DECs for wing:', error);
    res.status(500).json({ error: 'Failed to fetch DECs', details: error.message });
  }
});

// ============================================================================
// GET /api/health - Health check
// ============================================================================
router.get('/health', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query('SELECT 1 as test');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ============================================================================
// GET /api/my-notifications - Get user notifications
// ============================================================================
router.get('/my-notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    const { unreadOnly = false, limit = 50 } = req.query;
    const pool = getPool();

    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }

    // Query that combines regular notifications with verification requests
    const result = await pool.request()
      .input('UserId', sql.NVarChar, userId)
      .input('UnreadOnly', sql.Bit, unreadOnly === 'true')
      .query(`
        SELECT TOP 50 * FROM (
          -- Regular notifications from Notifications table
          SELECT 
            CAST(Id AS NVARCHAR(450)) AS Id,
            UserId,
            Title,
            Message,
            Type,
            ActionUrl,
            ActionText,
            IsRead,
            CreatedAt,
            ReadAt,
            'notification' AS SourceType
          FROM Notifications
          WHERE UserId = @UserId 
            AND (@UnreadOnly = 0 OR IsRead = 0)
          UNION ALL
          -- Supervisor pending requests as notifications (for wing supervisors)
          SELECT
            CAST('VER-PEND-' + CAST(ivr.id AS NVARCHAR(450)) AS NVARCHAR(450)) AS Id,
            @UserId AS UserId,
            'Verification Request: ' + ISNULL(ivr.item_nomenclature, CAST(ivr.item_master_id AS NVARCHAR)) AS Title,
            ('Requested By: ' + ISNULL(ivr.requested_by_name, 'Unknown') + CHAR(13) + CHAR(10) +
             'Requested Qty: ' + CAST(ivr.requested_quantity AS NVARCHAR) + CHAR(13) + CHAR(10) +
             'Wing: ' + ISNULL(ivr.wing_name, 'Unknown')) AS Message,
            'info' AS Type,
            '/dashboard/pending-verifications' AS ActionUrl,
            'Open Pending' AS ActionText,
            0 AS IsRead,
            ivr.requested_at AS CreatedAt,
            NULL AS ReadAt,
            'supervisor-pending' AS SourceType
          FROM inventory_verification_requests ivr
          JOIN ims_user_roles ur ON ur.scope_wing_id = ivr.wing_id AND ur.user_id = @UserId
          JOIN ims_roles r ON r.id = ur.role_id
          WHERE r.role_name = 'WING_SUPERVISOR'
            AND ivr.verification_status = 'pending'
          UNION ALL
          -- Requester pending requests as notifications (for the requester)
          SELECT
            CAST('REQ-PEND-' + CAST(ivr.id AS NVARCHAR(450)) AS NVARCHAR(450)) AS Id,
            ivr.requested_by_user_id AS UserId,
            'Verification Requested: ' + ISNULL(ivr.item_nomenclature, CAST(ivr.item_master_id AS NVARCHAR)) AS Title,
            ('Requested Qty: ' + CAST(ivr.requested_quantity AS NVARCHAR) + CHAR(13) + CHAR(10) +
             'Wing: ' + ISNULL(ivr.wing_name, 'Unknown')) AS Message,
            'info' AS Type,
            '/dashboard/verification-history' AS ActionUrl,
            'View Request Details' AS ActionText,
            0 AS IsRead,
            ivr.requested_at AS CreatedAt,
            NULL AS ReadAt,
            'requester-pending' AS SourceType
          FROM inventory_verification_requests ivr
          WHERE ivr.requested_by_user_id = @UserId
            AND ivr.verification_status = 'pending'
          UNION ALL
          -- Verification requests as notifications (only show verified ones to requester)
          SELECT 
            CAST('VER-' + CAST(ivr.id AS NVARCHAR(450)) AS NVARCHAR(450)) AS Id,
            ivr.requested_by_user_id AS UserId,
            'Verification Complete: ' + ISNULL(ivr.item_nomenclature, CAST(ivr.item_master_id AS NVARCHAR)) AS Title,
            CASE 
              WHEN ivr.verification_status = 'verified_available' 
                THEN '✅ Available - Physical Count: ' + CAST(ISNULL(ivr.physical_count, ivr.available_quantity) AS NVARCHAR) + 
                     CHAR(13) + CHAR(10) + 'Verified By: ' + ISNULL(ivr.verified_by_name, 'Unknown') +
                     CASE WHEN ivr.verification_notes IS NOT NULL AND ivr.verification_notes != '' 
                       THEN CHAR(13) + CHAR(10) + 'Notes: ' + ivr.verification_notes 
                       ELSE '' 
                     END
              WHEN ivr.verification_status = 'verified_partial' 
                THEN '⚠️ Partially Available - Physical Count: ' + CAST(ISNULL(ivr.physical_count, ivr.available_quantity) AS NVARCHAR) + 
                     CHAR(13) + CHAR(10) + 'Verified By: ' + ISNULL(ivr.verified_by_name, 'Unknown') +
                     CASE WHEN ivr.verification_notes IS NOT NULL AND ivr.verification_notes != '' 
                       THEN CHAR(13) + CHAR(10) + 'Notes: ' + ivr.verification_notes 
                       ELSE '' 
                     END
              WHEN ivr.verification_status = 'verified_unavailable' 
                THEN '❌ Unavailable - Physical Count: ' + CAST(ISNULL(ivr.physical_count, 0) AS NVARCHAR) + 
                     CHAR(13) + CHAR(10) + 'Verified By: ' + ISNULL(ivr.verified_by_name, 'Unknown') +
                     CASE WHEN ivr.verification_notes IS NOT NULL AND ivr.verification_notes != '' 
                       THEN CHAR(13) + CHAR(10) + 'Notes: ' + ivr.verification_notes 
                       ELSE '' 
                     END
              ELSE ivr.verification_status
            END AS Message,
            CASE 
              WHEN ivr.verification_status = 'verified_available' THEN 'success'
              WHEN ivr.verification_status = 'verified_partial' THEN 'warning'
              WHEN ivr.verification_status = 'verified_unavailable' THEN 'error'
              ELSE 'info'
            END AS Type,
            '/dashboard/verification-history' AS ActionUrl,
            'View Details' AS ActionText,
            0 AS IsRead,
            ivr.verified_at AS CreatedAt,
            NULL AS ReadAt,
            'verification' AS SourceType
          FROM inventory_verification_requests ivr
          WHERE ivr.requested_by_user_id = @UserId 
            AND ivr.verification_status IN ('verified_available', 'verified_partial', 'verified_unavailable')
            AND ivr.verified_at IS NOT NULL
        ) AS CombinedNotifications
        ORDER BY CreatedAt DESC
      `);

    res.json({
      success: true,
      notifications: result.recordset
    });

    const verificationCount = result.recordset.filter(n => n.SourceType === 'verification').length;
    const supervisorPendingCount = result.recordset.filter(n => n.SourceType === 'supervisor-pending').length;
    const requesterPendingCount = result.recordset.filter(n => n.SourceType === 'requester-pending').length;
    const regularCount = result.recordset.filter(n => n.SourceType === 'notification').length;
    
  } catch (error) {
    console.error('❌ Error fetching my notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});


module.exports = router;