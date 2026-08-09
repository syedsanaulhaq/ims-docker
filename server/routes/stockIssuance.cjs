// ============================================================================
// Stock Issuance Routes
// ============================================================================
// Stock request and issuance management

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');
const { initializeWorkflowForRequest, bindRequestApprovalId, getUserWorkflowRoles } = require('../utils/workflowEngine.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const isBranchSupervisorRole = (roleName) => {
  const normalized = String(roleName || '').trim().toUpperCase().replace(/\s+/g, '_');
  return normalized === 'BRANCH_SUPERVISOR' || normalized === 'CUSTOM_BRANCH_SUPERVISOR';
};

const isBranchStorekeeperRole = (roleName) => {
  const normalized = String(roleName || '').trim().toUpperCase().replace(/\s+/g, '_');
  return normalized === 'BRANCH_STORE_KEEPER'
    || normalized === 'CUSTOM_BRANCH_STORE_KEEPER'
    || normalized === 'BRANCH_STOREKEEPER';
};

const findBranchRoleUser = async (pool, branchId, roleNames, excludedUserId = null) => {
  const request = pool.request()
    .input('branchId', sql.Int, branchId)
    .input('excludedUserId', sql.NVarChar(450), String(excludedUserId || ''));

  roleNames.forEach((role, index) => {
    request.input(`role${index}`, sql.NVarChar(100), role);
  });

  const rolePlaceholders = roleNames.map((_, index) => `@role${index}`).join(', ');
  const result = await request.query(`
    SELECT TOP 1 u.Id as user_id, u.FullName, r.role_name
    FROM ims_user_roles ur
    INNER JOIN ims_roles r ON ur.role_id = r.id
    INNER JOIN AspNetUsers u ON u.Id = ur.user_id
    WHERE ur.is_active = 1
      AND r.is_active = 1
      AND u.ISACT = 1
      AND (@excludedUserId = '' OR u.Id <> @excludedUserId)
      AND r.role_name IN (${rolePlaceholders})
      AND (
        ur.scope_branch_id = @branchId
        OR u.intBranchID = @branchId
      )
    ORDER BY
      CASE WHEN ur.scope_branch_id = @branchId THEN 1 ELSE 2 END,
      u.FullName ASC
  `);

  return result.recordset[0] || null;
};

const findFirstAdminChainApprover = async (pool, excludedUserId) => {
  const result = await pool.request()
    .input('excludedUserId', sql.NVarChar(450), String(excludedUserId || ''))
    .query(`
      SELECT TOP 1 ur.user_id,
        CASE
          WHEN r.role_name = 'DD Admin' THEN 1
          WHEN r.role_name = 'AD Admin-I' THEN 2
          WHEN r.role_name = 'AD Admin-II' THEN 3
          WHEN r.role_name = 'Storekeeper' THEN 4
          ELSE 99
        END AS role_priority
      FROM ims_user_roles ur
      INNER JOIN ims_roles r ON r.id = ur.role_id
      INNER JOIN AspNetUsers u ON u.Id = ur.user_id
      WHERE ur.is_active = 1
        AND r.is_active = 1
        AND u.ISACT = 1
        AND ur.user_id <> @excludedUserId
        AND r.role_name IN ('DD Admin', 'AD Admin-I', 'AD Admin-II', 'Storekeeper')
      ORDER BY role_priority ASC, u.FullName ASC
    `);

  return result.recordset[0]?.user_id || null;
};

let branchDemandTablesEnsured = false;
const ensureBranchDemandTables = async (pool) => {
  if (branchDemandTablesEnsured) return;

  await pool.request().query(`
    IF OBJECT_ID('branch_staff_demands', 'U') IS NULL
    BEGIN
      CREATE TABLE branch_staff_demands (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        branch_id INT NOT NULL,
        staff_user_id NVARCHAR(450) NOT NULL,
        item_master_id UNIQUEIDENTIFIER NULL,
        item_nomenclature NVARCHAR(MAX) NOT NULL,
        requested_quantity INT NOT NULL,
        unit_label NVARCHAR(20) NOT NULL DEFAULT 'No(s)',
        justification NVARCHAR(MAX) NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
        included_in_request_id UNIQUEIDENTIFIER NULL,
        included_by NVARCHAR(450) NULL,
        included_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        is_deleted BIT NOT NULL DEFAULT 0
      );
    END
  `);

  branchDemandTablesEnsured = true;
};

// ============================================================================
// GET /api/stock-issuance - Get all stock issuance requests
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { status, wing_id, requester_id } = req.query;

    let query = `
      SELECT 
        sir.*,
        u.FullName as requester_name,
        w.Name as wing_name
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND sir.approval_status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (wing_id) {
      query += ` AND sir.requester_wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (requester_id) {
      query += ` AND sir.requester_user_id = @requesterId`;
      request = request.input('requesterId', sql.NVarChar(450), requester_id);
    }

    query += ` ORDER BY sir.submitted_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stock issuance requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/requests - Get all stock issuance requests (frontend endpoint)
// ============================================================================
// This endpoint provides the response format expected by the frontend
// When status=Approved, auto-filters by the logged-in store keeper's wing
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { status, wing_id, requester_id, includeDeleted, request_type } = req.query;
    const userId = req.session?.userId;

    // Production can lag behind schema updates. Detect optional columns dynamically
    // so this endpoint still returns data instead of failing with "Invalid column name".
    const schemaResult = await pool.request().query(`
      SELECT
        MAX(CASE WHEN name = 'requester_branch_id' THEN 1 ELSE 0 END) AS has_requester_branch_id,
        MAX(CASE WHEN name = 'is_returnable' THEN 1 ELSE 0 END) AS has_is_returnable,
        MAX(CASE WHEN name = 'expected_return_date' THEN 1 ELSE 0 END) AS has_expected_return_date,
        MAX(CASE WHEN name = 'is_deleted' THEN 1 ELSE 0 END) AS has_is_deleted,
        MAX(CASE WHEN name = 'deleted_at' THEN 1 ELSE 0 END) AS has_deleted_at,
        MAX(CASE WHEN name = 'deleted_by' THEN 1 ELSE 0 END) AS has_deleted_by,
        MAX(CASE WHEN name = 'submitted_at' THEN 1 ELSE 0 END) AS has_submitted_at,
        MAX(CASE WHEN name = 'created_at' THEN 1 ELSE 0 END) AS has_created_at,
        MAX(CASE WHEN name = 'updated_at' THEN 1 ELSE 0 END) AS has_updated_at
      FROM sys.columns
      WHERE object_id = OBJECT_ID('stock_issuance_requests')
    `);

    const schemaFlags = schemaResult.recordset[0] || {};

    const requesterBranchExpr = schemaFlags.has_requester_branch_id
      ? 'sir.requester_branch_id'
      : 'NULL';
    const isReturnableExpr = schemaFlags.has_is_returnable
      ? 'sir.is_returnable'
      : 'CAST(0 AS BIT)';
    const expectedReturnDateExpr = schemaFlags.has_expected_return_date
      ? 'sir.expected_return_date'
      : 'NULL';
    const isDeletedExpr = schemaFlags.has_is_deleted
      ? 'sir.is_deleted'
      : 'CAST(0 AS BIT)';
    const deletedAtExpr = schemaFlags.has_deleted_at
      ? 'sir.deleted_at'
      : 'NULL';
    const deletedByExpr = schemaFlags.has_deleted_by
      ? 'sir.deleted_by'
      : 'NULL';
    const submittedAtExpr = schemaFlags.has_submitted_at
      ? 'sir.submitted_at'
      : (schemaFlags.has_created_at ? 'sir.created_at' : 'GETDATE()');
    const createdAtExpr = schemaFlags.has_created_at
      ? 'sir.created_at'
      : (schemaFlags.has_submitted_at ? 'sir.submitted_at' : 'GETDATE()');
    const updatedAtExpr = schemaFlags.has_updated_at
      ? 'sir.updated_at'
      : createdAtExpr;

    let query = `
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        sir.requester_wing_id,
        sir.requester_office_id,
        ${requesterBranchExpr} as requester_branch_id,
        sir.purpose,
        sir.urgency_level,
        sir.justification,
        ${isReturnableExpr} as is_returnable,
        ${expectedReturnDateExpr} as expected_return_date,
        ISNULL(sir.approval_status, sir.request_status) as approval_status,
        ISNULL(sir.request_status, sir.approval_status) as request_status,
        ISNULL(${submittedAtExpr}, ${createdAtExpr}) as submitted_at,
        ISNULL(${createdAtExpr}, ${submittedAtExpr}) as created_at,
        ${updatedAtExpr} as updated_at,
        ${isDeletedExpr} as is_deleted,
        ${deletedAtExpr} as deleted_at,
        ${deletedByExpr} as deleted_by,
        u.Id as 'requester.user_id',
        u.FullName as 'requester.full_name',
        u.UserName as 'requester.user_name',
        u.Role as 'requester.role_name',
        u.Role as requester_role_name,
        COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') as 'requester.designation_name',
        COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') as requester_designation_name,
        w.Id as 'wing.wing_id',
        w.Name as 'wing.name',
        o.intOfficeID as 'office.office_id',
        o.strOfficeName as 'office.office_name'
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sir.requester_user_id) = CONVERT(NVARCHAR(450), u.Id)
      LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), sir.requester_user_id)
      LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
      LEFT JOIN WingsInformation w ON CONVERT(NVARCHAR(100), sir.requester_wing_id) = CONVERT(NVARCHAR(100), w.Id)
      LEFT JOIN tblOffices o ON CONVERT(NVARCHAR(100), sir.requester_office_id) = CONVERT(NVARCHAR(100), o.intOfficeID)
    `;

    // Build WHERE clause
    const conditions = [];
    let request = pool.request();

    if (includeDeleted !== 'true' && schemaFlags.has_is_deleted) {
      conditions.push('(sir.is_deleted = 0 OR sir.is_deleted IS NULL)');
    }

    if (status) {
      // Support partial matching for status groups (e.g., "Approved" matches "Approved by Admin", "Approved by Supervisor")
      if (status === 'Approved') {
        conditions.push("(sir.approval_status LIKE 'Approved%')");
      } else {
        conditions.push('sir.approval_status = @status');
        request = request.input('status', sql.NVarChar(50), status);
      }
    }

    // Auto-filter by store keeper's wing when fetching approved requests for issuance
    // The store keeper should only see requests from their own wing
    if (status === 'Approved' && userId && !wing_id) {
      const userWingResult = await pool.request()
        .input('userId', sql.NVarChar(450), userId)
        .query(`SELECT u.intWingID as WingId FROM AspNetUsers u WHERE u.Id = @userId`);
      
      if (userWingResult.recordset.length > 0 && userWingResult.recordset[0].WingId) {
        const userWingId = userWingResult.recordset[0].WingId;
        
        // Check if this user is a wing store keeper
        const skCheck = await pool.request()
          .input('userId', sql.NVarChar(450), userId)
          .query(`
            SELECT ir.role_name
            FROM ims_user_roles ur
            INNER JOIN ims_roles ir ON ur.role_id = ir.id
            WHERE ur.user_id = @userId
              AND ir.is_active = 1
              AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
          `);
        
        if (skCheck.recordset.length > 0) {
          conditions.push('CONVERT(NVARCHAR(100), sir.requester_wing_id) = @autoWingId');
          request = request.input('autoWingId', sql.NVarChar(100), String(userWingId));
        }
      }
    }

    if (wing_id) {
      conditions.push('CONVERT(NVARCHAR(100), sir.requester_wing_id) = @wingId');
      request = request.input('wingId', sql.NVarChar(100), String(wing_id));
    }

    if (requester_id) {
      conditions.push('CONVERT(NVARCHAR(450), sir.requester_user_id) = @requesterId');
      request = request.input('requesterId', sql.NVarChar(450), requester_id);
    }

    if (request_type) {
      const rawTypes = String(request_type)
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (rawTypes.length === 1) {
        conditions.push('LOWER(CONVERT(NVARCHAR(100), sir.request_type)) = @requestType1');
        request = request.input('requestType1', sql.NVarChar(100), rawTypes[0].toLowerCase());
      } else if (rawTypes.length > 1) {
        const placeholders = rawTypes.map((_, idx) => `@requestType${idx + 1}`).join(', ');
        conditions.push(`LOWER(CONVERT(NVARCHAR(100), sir.request_type)) IN (${placeholders})`);
        rawTypes.forEach((type, idx) => {
          request = request.input(`requestType${idx + 1}`, sql.NVarChar(100), type.toLowerCase());
        });
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sir.submitted_at DESC, sir.created_at DESC';

    const result = await request.query(query);

    // Transform results to nested object format expected by frontend
    const transformedData = await Promise.all(result.recordset.map(async (row) => {
      // Get items for this request
      const itemsResult = await pool.request()
        .input('requestId', sql.NVarChar(100), String(row.id))
        .query(`
          SELECT 
            sii.id,
            sii.item_master_id,
            sii.nomenclature,
            sii.requested_quantity,
            sii.approved_quantity,
            sii.item_status,
            sii.item_type,
            sii.custom_item_name,
            sii.unit_price,
            im.nomenclature as master_nomenclature,
            im.group_number,
            im.unit
          FROM stock_issuance_items sii
          LEFT JOIN item_masters im ON sii.item_master_id = im.id
          WHERE CONVERT(NVARCHAR(100), sii.request_id) = @requestId
            AND (
              COL_LENGTH('stock_issuance_items', 'is_deleted') IS NULL
              OR sii.is_deleted = 0
              OR sii.is_deleted IS NULL
            )
        `);

      let requesterDesignation = row.requester_designation_name || row['requester.designation_name'];
      let requesterRoleName = row.requester_role_name || row['requester.role_name'];

      if (!requesterDesignation || requesterDesignation === '-') {
        const fallbackDesignation = await pool.request()
          .input('userId', sql.NVarChar(450), String(row.requester_user_id || ''))
          .query(`
            SELECT TOP 1
              COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') AS designation_name,
              u.Role AS role_name
            FROM AspNetUsers u
            LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), u.Id)
            LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
            WHERE CONVERT(NVARCHAR(450), u.Id) = @userId
          `);

        requesterDesignation = fallbackDesignation.recordset?.[0]?.designation_name || '-';
        requesterRoleName = requesterRoleName || fallbackDesignation.recordset?.[0]?.role_name || '-';
      }

      return {
        id: row.id,
        request_number: row.request_number,
        request_type: row.request_type,
        requester_user_id: row.requester_user_id,
        requester_wing_id: row.requester_wing_id,
        requester_office_id: row.requester_office_id,
        requester_branch_id: row.requester_branch_id,
        purpose: row.purpose,
        urgency_level: row.urgency_level,
        justification: row.justification,
        is_returnable: row.is_returnable,
        expected_return_date: row.expected_return_date,
        approval_status: row.approval_status,
        request_status: row.approval_status || row.request_status || 'Pending', // Alias for frontend compatibility
        submitted_at: row.submitted_at || row.created_at || new Date().toISOString(),
        created_at: row.created_at || row.submitted_at || new Date().toISOString(),
        updated_at: row.updated_at,
        is_deleted: row.is_deleted,
        deleted_at: row.deleted_at,
        deleted_by: row.deleted_by,
        requester: {
          user_id: row['requester.user_id'],
          full_name: row['requester.full_name'],
          user_name: row['requester.user_name'],
          role_name: requesterRoleName,
          designation_name: requesterDesignation
        },
        wing: row['wing.wing_id'] ? {
          wing_id: row['wing.wing_id'],
          name: row['wing.name']
        } : null,
        office: row['office.office_id'] ? {
          office_id: row['office.office_id'],
          office_name: row['office.office_name'],
          name: row['office.office_name'] // Alias for frontend compatibility
        } : null,
        items: itemsResult.recordset.map(item => ({
          id: item.id,
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature || item.master_nomenclature,
          requested_quantity: item.requested_quantity,
          approved_quantity: item.approved_quantity,
          item_status: item.item_status,
          item_type: item.item_type,
          custom_item_name: item.custom_item_name,
          unit_price: item.unit_price,
          unit: item.unit,
          group_number: item.group_number || null
        }))
      };
    }));

    // Calculate summary
    const summary = {
      total: transformedData.length,
      pending: transformedData.filter(r => r.approval_status === 'Pending' || r.approval_status === 'pending').length,
      approved: transformedData.filter(r => r.approval_status === 'Approved' || r.approval_status === 'approved').length,
      rejected: transformedData.filter(r => r.approval_status === 'Rejected' || r.approval_status === 'rejected').length,
      forwarded: transformedData.filter(r => r.approval_status?.includes('Forwarded')).length,
      issued: transformedData.filter(r => r.approval_status === 'Issued' || r.approval_status === 'issued').length
    };

    res.json({
      success: true,
      data: transformedData,
      summary,
      count: transformedData.length
    });
  } catch (error) {
    console.error('❌ Error fetching stock issuance requests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests', 
      details: error.message 
    });
  }
});

// ============================================================================
// POST /api/stock-issuance/branch-demands - Staff submit branch demand lines
// ============================================================================
router.post('/branch-demands', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureBranchDemandTables(pool);

    const userId = req.session.userId;
    const { demand_lines = [], justification = '' } = req.body;

    if (!Array.isArray(demand_lines) || demand_lines.length === 0) {
      return res.status(400).json({ error: 'demand_lines are required' });
    }

    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`SELECT intBranchID as branch_id FROM AspNetUsers WHERE Id = @userId`);

    const branchId = Number(userResult.recordset[0]?.branch_id || 0);
    if (!branchId) {
      return res.status(400).json({ error: 'No branch is assigned to this user' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const line of demand_lines) {
        const qty = Math.max(1, Number(line.requested_quantity || 0));
        const nomenclature = String(line.item_nomenclature || '').trim();

        if (!nomenclature) continue;

        await transaction.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('branchId', sql.Int, branchId)
          .input('staffUserId', sql.NVarChar(450), userId)
          .input('itemMasterId', sql.UniqueIdentifier, line.item_master_id || null)
          .input('nomenclature', sql.NVarChar(sql.MAX), nomenclature)
          .input('qty', sql.Int, qty)
          .input('justification', sql.NVarChar(sql.MAX), line.justification || justification || null)
          .query(`
            INSERT INTO branch_staff_demands
              (id, branch_id, staff_user_id, item_master_id, item_nomenclature, requested_quantity, unit_label, justification, status, created_at, updated_at, is_deleted)
            VALUES
              (@id, @branchId, @staffUserId, @itemMasterId, @nomenclature, @qty, 'No(s)', @justification, 'SUBMITTED', GETDATE(), GETDATE(), 0)
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, message: 'Branch demand submitted', count: demand_lines.length });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error submitting branch demands:', error);
    res.status(500).json({ error: 'Failed to submit branch demand', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/branch-demands/my - Current user demand lines
// ============================================================================
router.get('/branch-demands/my', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureBranchDemandTables(pool);

    const userId = req.session.userId;
    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT
          d.id,
          d.branch_id,
          d.item_master_id,
          d.item_nomenclature,
          d.requested_quantity,
          d.unit_label,
          d.justification,
          d.status,
          d.included_in_request_id,
          d.created_at,
          d.updated_at
        FROM branch_staff_demands d
        WHERE d.staff_user_id = @userId
          AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
        ORDER BY d.created_at DESC
      `);

    res.json({ success: true, demands: result.recordset });
  } catch (error) {
    console.error('Error fetching my branch demands:', error);
    res.status(500).json({ error: 'Failed to fetch demands', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/branch-demands/branch-inbox - Supervisor inbox
// ============================================================================
router.get('/branch-demands/branch-inbox', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureBranchDemandTables(pool);

    const userId = req.session.userId;
    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`SELECT intBranchID as branch_id FROM AspNetUsers WHERE Id = @userId`);

    const branchId = Number(userResult.recordset[0]?.branch_id || 0);
    if (!branchId) {
      return res.status(400).json({ error: 'No branch is assigned to this user' });
    }

    const status = String(req.query.status || 'SUBMITTED').toUpperCase();

    const result = await pool.request()
      .input('branchId', sql.Int, branchId)
      .input('status', sql.NVarChar(30), status)
      .query(`
        SELECT
          d.id,
          d.item_master_id,
          d.item_nomenclature,
          d.requested_quantity,
          d.unit_label,
          d.justification,
          d.status,
          d.staff_user_id,
          u.FullName as staff_name,
          d.created_at
        FROM branch_staff_demands d
        LEFT JOIN AspNetUsers u ON u.Id = d.staff_user_id
        WHERE d.branch_id = @branchId
          AND d.status = @status
          AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
        ORDER BY d.created_at DESC
      `);

    res.json({ success: true, demands: result.recordset });
  } catch (error) {
    console.error('Error fetching branch demand inbox:', error);
    res.status(500).json({ error: 'Failed to fetch branch demand inbox', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/branch-demands/manager
// Combined manager view for demand lines and related branch request statuses
// ============================================================================
router.get('/branch-demands/manager', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureBranchDemandTables(pool);

    const userId = req.session.userId;

    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`SELECT intBranchID as branch_id FROM AspNetUsers WHERE Id = @userId`);

    const branchId = Number(userResult.recordset[0]?.branch_id || 0);
    if (!branchId) {
      return res.status(400).json({ error: 'No branch is assigned to this user' });
    }
    const demandsResult = await pool.request()
      .input('branchId', sql.Int, branchId)
      .input('userId', sql.NVarChar(450), userId)
      .query(`
      SELECT
        d.id,
        d.branch_id,
        d.staff_user_id,
        u.FullName as staff_name,
        d.item_master_id,
        d.item_nomenclature,
        d.requested_quantity,
        d.unit_label,
        d.justification,
        d.status,
        d.included_in_request_id,
        sr.request_number as included_request_number,
        ISNULL(sr.approval_status, sr.request_status) as included_request_status,
        COALESCE(sr.submitted_at, sr.created_at) as included_request_submitted_at,
        d.created_at,
        d.updated_at
      FROM branch_staff_demands d
      LEFT JOIN AspNetUsers u ON u.Id = d.staff_user_id
      LEFT JOIN stock_issuance_requests sr ON sr.id = d.included_in_request_id
      WHERE d.branch_id = @branchId
        AND d.staff_user_id = @userId
        AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
      ORDER BY d.created_at DESC
    `);

    const requestsResult = await pool.request()
      .input('branchId', sql.Int, branchId)
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT
          sir.id,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.justification,
          sir.urgency_level,
          sir.request_status,
          sir.approval_status,
          sir.submitted_at,
          sir.created_at,
          sir.updated_at,
          sir.requester_user_id,
          u.FullName as requester_name,
          COALESCE(COUNT(DISTINCT d.id), 0) as linked_demand_count,
          COALESCE(SUM(d.requested_quantity), 0) as linked_demand_qty
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
        LEFT JOIN branch_staff_demands d ON d.included_in_request_id = sir.id AND d.staff_user_id = @userId AND (d.is_deleted = 0 OR d.is_deleted IS NULL)
        WHERE sir.request_type = 'branch'
          AND sir.requester_branch_id = @branchId
          AND (
            COL_LENGTH('stock_issuance_requests', 'is_deleted') IS NULL
            OR sir.is_deleted = 0
            OR sir.is_deleted IS NULL
          )
        GROUP BY sir.id, sir.request_number, sir.request_type, sir.purpose, sir.justification, sir.urgency_level, sir.request_status, sir.approval_status, sir.submitted_at, sir.created_at, sir.updated_at, sir.requester_user_id, u.FullName
        ORDER BY sir.submitted_at DESC, sir.created_at DESC
      `);

    res.json({
      success: true,
      can_view_all: false,
      demands: demandsResult.recordset,
      requests: requestsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching branch demands manager data:', error);
    res.status(500).json({ error: 'Failed to fetch branch demands manager data', details: error.message });
  }
});

// ============================================================================
// POST /api/stock-issuance/branch-demands/attach-to-request
// Mark demand lines included in finalized branch request
// ============================================================================
router.post('/branch-demands/attach-to-request', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await ensureBranchDemandTables(pool);

    const userId = req.session.userId;
    const { request_id, demand_ids = [] } = req.body;

    if (!request_id || !Array.isArray(demand_ids) || demand_ids.length === 0) {
      return res.status(400).json({ error: 'request_id and demand_ids are required' });
    }

    const idsCsv = demand_ids.map((id) => String(id)).filter(Boolean).join(',');

    await pool.request()
      .input('requestId', sql.UniqueIdentifier, request_id)
      .input('actorId', sql.NVarChar(450), userId)
      .input('idsCsv', sql.NVarChar(sql.MAX), idsCsv)
      .query(`
        UPDATE branch_staff_demands
        SET status = 'INCLUDED',
            included_in_request_id = @requestId,
            included_by = @actorId,
            included_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id IN (
          SELECT TRY_CONVERT(uniqueidentifier, LTRIM(RTRIM(value)))
          FROM STRING_SPLIT(@idsCsv, ',')
        )
      `);

    res.json({ success: true, message: 'Demand lines linked to request' });
  } catch (error) {
    console.error('Error attaching demands to request:', error);
    res.status(500).json({ error: 'Failed to attach demand lines', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/pending/count - Get pending approvals count
// ============================================================================
router.get('/pending/count', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(CASE WHEN approval_status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN approval_status = 'Forwarded to Admin' THEN 1 END) as forwarded,
          COUNT(CASE WHEN approval_status = 'Approved by Supervisor' THEN 1 END) as supervisor_approved
        FROM stock_issuance_requests
      `);

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error counting pending:', error);
    res.status(500).json({ error: 'Failed to count pending' });
  }
});

// ============================================================================
// GET /api/stock-issuance/issued-items - Get issued items (all or by user)
// ============================================================================
router.get('/issued-items', async (req, res) => {
  try {
    const pool = getPool();
    const { user_id } = req.query;
    const request = pool.request();
    // Prefer request-linked items (current workflow). Fall back to legacy stock_issuances rows.
    let query = `
      SELECT
        sii.id,
        COALESCE(sii.request_id, sii.stock_issuance_id) AS stock_issuance_id,
        COALESCE(sir.request_number, si.issuance_number) AS issuance_number,
        sii.item_master_id,
        COALESCE(im.nomenclature, sii.nomenclature, sii.custom_item_name, 'Unknown Item') AS nomenclature,
        COALESCE(sii.issued_quantity, sii.approved_quantity, sii.requested_quantity, 0) AS issued_quantity,
        sii.approved_quantity,
        im.unit,
        COALESCE(si.issue_date, TRY_CONVERT(date, sir.expected_return_date)) AS expected_return_date,
        CAST(COALESCE(sir.is_returnable, 0) AS BIT) AS is_returnable,
        u.FullName AS requester_name,
        COALESCE(sir.updated_at, sir.submitted_at, sir.created_at, si.created_at, sii.created_at) AS created_at,
        COALESCE(sir.purpose, si.purpose, si.status, '') AS purpose,
        COALESCE(sir.approval_status, sir.request_status, si.status, sii.item_status, sii.status) AS approval_status
      FROM stock_issuance_items sii
      LEFT JOIN stock_issuance_requests sir
        ON sir.id = COALESCE(sii.request_id, CASE WHEN sii.stock_issuance_id IS NOT NULL THEN sii.stock_issuance_id END)
      LEFT JOIN stock_issuances si ON si.id = sii.stock_issuance_id
      LEFT JOIN item_masters im ON sii.item_master_id = im.id
      LEFT JOIN AspNetUsers u ON u.Id = COALESCE(sir.requester_user_id, si.requested_by)
      WHERE (
        UPPER(COALESCE(sir.approval_status, sir.request_status, si.status, sii.item_status, sii.status, '')) IN ('APPROVED', 'ISSUED', 'COMPLETED')
      )
      AND (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
    `;

    if (user_id) {
      request.input('userId', sql.NVarChar(450), user_id);
      query += ` AND (
        CONVERT(NVARCHAR(450), sir.requester_user_id) = @userId
        OR CONVERT(NVARCHAR(450), si.requested_by) = @userId
      )`;
    }

    query += ' ORDER BY COALESCE(sir.updated_at, sir.submitted_at, sir.created_at, si.created_at, sii.created_at) DESC';

    const result = await request.query(query);
    
    // Calculate summary
    const summary = {
      total_items: result.recordset.length,
      total_value: 0,
      returnable_items: result.recordset.filter(i => i.is_returnable).length,
      not_returned: result.recordset.length,
      overdue: 0
    };

    res.json({ 
      success: true,
      data: result.recordset,
      items: result.recordset,
      summary
    });
  } catch (error) {
    console.error('Error fetching issued items:', error);
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/last-issued-summary - Last issued qty/date by item
// ============================================================================
router.get('/last-issued-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { user_id, wing_id, exclude_request_id } = req.query;

    const request = pool.request();
    request.input('userId', sql.NVarChar(450), user_id || null);
    request.input('wingId', sql.Int, wing_id ? Number(wing_id) : null);
    request.input('excludeRequestId', sql.UniqueIdentifier, exclude_request_id || null);

    const result = await request.query(`
      ;WITH issued_rows AS (
        SELECT
          CAST(sii.item_master_id AS NVARCHAR(100)) AS item_master_id,
          COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), sii.requested_quantity, 0) AS issued_qty,
          CAST(COALESCE(sir.updated_at, sir.submitted_at, sir.created_at) AS DATETIME2) AS issue_date,
          ROW_NUMBER() OVER (
            PARTITION BY sii.item_master_id
            ORDER BY COALESCE(sir.updated_at, sir.submitted_at, sir.created_at) DESC
          ) AS rn
        FROM stock_issuance_items sii
        INNER JOIN stock_issuance_requests sir ON sir.id = sii.request_id
        WHERE sii.item_master_id IS NOT NULL
          AND COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), 0) > 0
          AND (
            UPPER(COALESCE(sir.request_status, '')) IN ('ISSUED', 'COMPLETED')
            OR UPPER(COALESCE(sir.approval_status, '')) IN ('ISSUED', 'COMPLETED')
          )
          AND (@userId IS NULL OR sir.requester_user_id = @userId)
          AND (@wingId IS NULL OR sir.requester_wing_id = @wingId)
            AND (@excludeRequestId IS NULL OR sir.id <> @excludeRequestId)
      )
      SELECT item_master_id, issued_qty AS last_issued_quantity, issue_date AS last_issue_date
      FROM issued_rows
      WHERE rn = 1
      ORDER BY item_master_id
    `);

    res.json({
      success: true,
      data: result.recordset || []
    });
  } catch (error) {
    console.error('Error fetching last issued summary:', error);
    res.status(500).json({ error: 'Failed to fetch last issued summary', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/:id - Get request details
// ============================================================================
router.get('/branch-storekeeper/requests', requireAuth, handleBranchStorekeeperRequests);

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }
    
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sir.*,
          u.FullName as requester_name,
          u.Email as requester_email,
          w.Name as wing_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sir.requester_user_id) = CONVERT(NVARCHAR(450), u.Id)
        LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
        WHERE sir.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = result.recordset[0];

    // Get items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sii.*,
          im.nomenclature,
          im.group_number,
          im.unit
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @requestId
      `);

    // Get wing supervisor(s) for approval workflow info
    let supervisor = null;
    if (request.requester_wing_id) {
      const supervisorResult = await pool.request()
        .input('wingId', sql.Int, request.requester_wing_id)
        .query(`
          SELECT TOP 1 
            user_id,
            supervisor_name,
            role_name,
            Email
          FROM vw_wing_supervisors 
          WHERE wing_id = @wingId
          ORDER BY 
            CASE 
              WHEN role_name LIKE '%DG%' THEN 1
              WHEN role_name LIKE '%ADG%' THEN 2
              WHEN role_name LIKE '%Director%' THEN 3
              WHEN role_name LIKE '%Manager%' THEN 4
              ELSE 5 
            END
        `);

      if (supervisorResult.recordset.length > 0) {
        supervisor = {
          user_id: supervisorResult.recordset[0].user_id,
          name: supervisorResult.recordset[0].supervisor_name,
          role: supervisorResult.recordset[0].role_name,
          email: supervisorResult.recordset[0].Email
        };
      }
    }

    const workflowStateResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, id)
      .query(`
        SELECT TOP 1
          rws.current_approver_id,
          rws.current_step_order,
          rws.total_steps,
          rws.status,
          au.FullName AS current_approver_name,
          COALESCE(role_pick.role_name, au.Role, 'Approver') AS current_approver_role
        FROM ims_request_workflow_state rws
        LEFT JOIN AspNetUsers au ON rws.current_approver_id = au.Id
        OUTER APPLY (
          SELECT TOP 1 ir.role_name
          FROM ims_user_roles ur
          INNER JOIN ims_roles ir ON ir.id = ur.role_id
          WHERE ur.user_id = rws.current_approver_id
            AND ur.is_active = 1
            AND ir.is_active = 1
          ORDER BY ir.role_name ASC
        ) role_pick
        WHERE rws.request_id = @requestId
        ORDER BY rws.group_number ASC
      `);

    // Query approval header so we can fall back if workflow state is unavailable.
    const raResult = await pool.request()
      .input('requestId2', sql.UniqueIdentifier, id)
      .query(`
        SELECT ra.id,
               ra.current_status,
               ra.current_approver_id,
               au.FullName AS current_approver_name,
               COALESCE(role_pick.role_name, au.Role, 'Approver') AS current_approver_role
        FROM request_approvals ra
        LEFT JOIN AspNetUsers au ON ra.current_approver_id = au.Id
        OUTER APPLY (
          SELECT TOP 1 ir.role_name
          FROM ims_user_roles ur
          INNER JOIN ims_roles ir ON ir.id = ur.role_id
          WHERE ur.user_id = ra.current_approver_id
            AND ur.is_active = 1
            AND ir.is_active = 1
          ORDER BY ir.role_name ASC
        ) role_pick
        WHERE ra.request_id = @requestId2
        ORDER BY ra.created_date DESC, ra.updated_date DESC
      `);

    const approvalHead = raResult.recordset[0] || null;
    const workflowStateHead = workflowStateResult.recordset[0] || null;
    const normalizedRequestType = String(request.request_type || '').trim().toLowerCase();
    const isPersonalRequest = normalizedRequestType === 'individual' || normalizedRequestType === 'personal';
    const isWingRequest = normalizedRequestType === 'wing' || normalizedRequestType === 'organizational';

    let submissionTargetName = isPersonalRequest
      ? (approvalHead?.current_approver_name || supervisor?.name || 'Approver')
      : (workflowStateHead?.current_approver_name || approvalHead?.current_approver_name || supervisor?.name || 'Approver');

    let submissionTargetRole = isPersonalRequest
      ? (approvalHead?.current_approver_role || supervisor?.role || null)
      : (workflowStateHead?.current_approver_role || approvalHead?.current_approver_role || supervisor?.role || null);

    // Guard against self-assignment display for wing/organizational requests.
    // If target resolves to requester, show first DD Admin (excluding requester) instead.
    if (!isPersonalRequest) {
      const requesterId = String(request.requester_user_id || '').toLowerCase();
      const resolvedApproverId = String(
        workflowStateHead?.current_approver_id
        || approvalHead?.current_approver_id
        || supervisor?.user_id
        || ''
      ).toLowerCase();

      if (requesterId && resolvedApproverId && requesterId === resolvedApproverId) {
        const ddAdminResult = await pool.request()
          .input('requesterId', sql.NVarChar(450), String(request.requester_user_id || ''))
          .query(`
            SELECT TOP 1
              u.Id,
              u.FullName,
              r.role_name
            FROM AspNetUsers u
            INNER JOIN ims_user_roles ur ON ur.user_id = u.Id
            INNER JOIN ims_roles r ON r.id = ur.role_id
            WHERE ur.is_active = 1
              AND r.is_active = 1
              AND u.Id <> @requesterId
              AND (
                r.role_name = 'DD Admin'
                OR r.role_name LIKE 'DD Admin%'
                OR r.role_name LIKE '%DD Admin%'
              )
            ORDER BY u.FullName ASC
          `);

        if (ddAdminResult.recordset.length > 0) {
          submissionTargetName = ddAdminResult.recordset[0].FullName;
          submissionTargetRole = ddAdminResult.recordset[0].role_name;
        }
      }
    }

    // Build approval history from real approval_history table
    const approvalHistory = [];

    // Step 1: Always add the submission entry
    approvalHistory.push({
      action: 'Submitted',
      actor_name: request.requester_name || 'Unknown User',
      actor_id: request.requester_user_id,
      timestamp: request.submitted_at || request.created_at,
      comments: request.purpose || 'Request submitted for approval',
      submitted_to: submissionTargetName,
      submitted_to_role: submissionTargetRole,
      approver_role: submissionTargetRole
    });

    if (raResult.recordset.length > 0) {
      const approvalId = approvalHead.id;
      const histResult = await pool.request()
        .input('approvalId', sql.UniqueIdentifier, approvalId)
        .query(`
          SELECT ah.*, 
                 u.FullName as actor_name,
                 fwd_to.FullName as forwarded_to_name
          FROM approval_history ah
          LEFT JOIN AspNetUsers u ON ah.action_by = u.Id
          LEFT JOIN AspNetUsers fwd_to ON ah.forwarded_to = fwd_to.Id
          WHERE ah.request_approval_id = @approvalId
          ORDER BY ah.step_number, ah.action_date
        `);

      // Deduplicate: keep only the latest action per actor in sequence
      // e.g. if supervisor has approved->forwarded->forwarded_to_admin, keep only forwarded_to_admin
      const deduped = [];
      for (let i = 0; i < histResult.recordset.length; i++) {
        const curr = histResult.recordset[i];
        const next = histResult.recordset[i + 1];
        // Skip if next entry is by the same actor (keep the later one which is the final action)
        if (next && curr.action_by === next.action_by) continue;
        deduped.push(curr);
      }

      for (const h of deduped) {
        const actionType = (h.action_type || '').toLowerCase();
        let action = actionType;
        let comments = h.comments || '';

        // Map action types to display-friendly values
        if (actionType === 'forwarded_to_admin' || actionType === 'forwarded') {
          action = 'Forwarded';
          comments = comments || 'Forwarded to Admin for approval';
        } else if (actionType === 'forwarded_to_supervisor') {
          action = 'Forwarded';
          comments = comments || 'Forwarded to Wing Supervisor';
        } else if (actionType === 'approved') {
          action = 'Approved';
          comments = comments || 'Request approved';
        } else if (actionType === 'rejected') {
          action = 'Rejected';
          comments = comments || 'Request rejected';
        } else if (actionType === 'returned') {
          action = 'Returned';
          comments = comments || 'Request returned for revision';
        } else if (actionType === 'sent_to_store_keeper') {
          action = 'Sent to Wing Store';
          comments = comments || 'Approved items sent to wing store keeper for issuance';
        } else if (actionType === 'issued') {
          action = 'Issued';
          comments = comments || 'Items physically issued to requester';
        } else if (actionType === 'completed') {
          action = 'Issued';
          comments = comments || 'Items issued to requester by wing store keeper';
        }

        approvalHistory.push({
          action,
          actor_name: h.actor_name || 'Unknown',
          actor_id: h.action_by,
          timestamp: h.action_date,
          comments,
          is_current_step: h.is_current_step || false,
          forwarded_to_name: h.forwarded_to_name || null,
          approver_role: null
        });
      }

      // If the request has an approval record and is still pending review, append the current pending assignee
      const currentStatus = (approvalHead.current_status || '').toLowerCase();
      if (['pending', 'submitted', 'forwarded_to_admin', 'forwarded_to_supervisor'].includes(currentStatus)) {
        const isAlreadyInHistory = approvalHistory.some(
          (h) => h.action === 'pending' && h.actor_id === approvalHead.current_approver_id
        );
        if (!isAlreadyInHistory) {
          approvalHistory.push({
            action: 'pending',
            actor_name: approvalHead.current_approver_name || 'Supervisor',
            actor_id: approvalHead.current_approver_id,
            timestamp: null,
            comments: 'Awaiting review and approval',
            is_current_step: true,
            approver_role: approvalHead.current_approver_role || 'Approver'
          });
        }
      }
    } else {
      // No approval record yet - show pending with supervisor
      const status = (request.request_status || '').toLowerCase();
      if (supervisor && (status === 'submitted' || status === 'pending')) {
        approvalHistory.push({
          action: 'Pending',
          actor_name: supervisor.name,
          actor_id: supervisor.user_id,
          timestamp: null,
          comments: 'Awaiting review and approval',
          is_current_step: true,
          approver_role: supervisor.role
        });
      }
    }

    res.json({
      request,
      items: itemsResult.recordset,
      supervisor,
      approval_history: approvalHistory
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
});

// ============================================================================
// POST /api/stock-issuance - Create new stock issuance request
// POST /api/stock-issuance/requests - Alias endpoint for frontend compatibility
// ============================================================================
const createStockIssuanceRequest = async (req, res) => {
  try {
    // Support both old format (wing_id) and new format (requester_wing_id)
    const {
      wing_id,
      requester_wing_id,
      requester_office_id,
      requester_branch_id,
      requester_user_id,
      items,
      purpose,
      justification,
      request_type,
      request_number,
      expected_return_date,
      is_returnable,
      urgency_level
    } = req.body;
    
    const pool = getPool();

    // Use requester_wing_id if wing_id not provided. Branch requests are scoped by
    // requester_branch_id and may not have a wing in session.
    const wingId = wing_id || requester_wing_id || null;
    const normalizedRequestType = String(request_type || '').trim().toLowerCase();

    if (normalizedRequestType === 'branch' && !requester_branch_id) {
      return res.status(400).json({ error: 'requester_branch_id is required for branch requests' });
    }

    if (normalizedRequestType !== 'branch' && !wingId) {
      return res.status(400).json({ error: 'wing_id or requester_wing_id is required' });
    }

    const requestId = uuidv4();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create request with extended fields
      await transaction.request()
        .input('id', sql.UniqueIdentifier, requestId)
        .input('requestNumber', sql.NVarChar(50), request_number || null)
        .input('requestType', sql.NVarChar(50), request_type || 'Individual')
        .input('officeId', sql.Int, requester_office_id || null)
        .input('wingId', sql.Int, wingId)
        .input('branchId', sql.Int, requester_branch_id || null)
        .input('requesterId', sql.NVarChar(450), requester_user_id || req.session.userId)
        .input('purpose', sql.NVarChar(sql.MAX), purpose || null)
        .input('urgencyLevel', sql.NVarChar(50), urgency_level || 'Normal')
        .input('justification', sql.NVarChar(sql.MAX), justification || null)
        .input('expectedReturnDate', sql.Date, expected_return_date || null)
        .input('isReturnable', sql.Bit, is_returnable ? 1 : 0)
        .query(`
          INSERT INTO stock_issuance_requests 
          (id, request_number, request_type, requester_office_id, requester_wing_id, requester_branch_id,
           requester_user_id, purpose, urgency_level, justification,
           expected_return_date, is_returnable, request_status, submitted_at, created_at)
          VALUES (@id, @requestNumber, @requestType, @officeId, @wingId, @branchId,
                  @requesterId, @purpose, @urgencyLevel, @justification,
                  @expectedReturnDate, @isReturnable, 'Submitted', GETDATE(), GETDATE())
        `);

      // Add items if provided in this request
      if (items && items.length > 0) {
        for (const item of items) {
          await transaction.request()
            .input('requestId', sql.UniqueIdentifier, requestId)
            .input('itemId', sql.UniqueIdentifier, item.item_id || item.item_master_id || null)
            .input('nomenclature', sql.NVarChar(sql.MAX), item.nomenclature || null)
            .input('qty', sql.Int, item.quantity || item.requested_quantity || 0)
            .input('itemType', sql.NVarChar(50), item.item_type || 'standard')
            .input('customName', sql.NVarChar(sql.MAX), item.custom_item_name || null)
            .query(`
              INSERT INTO stock_issuance_items 
              (id, request_id, item_master_id, nomenclature, requested_quantity, item_type, custom_item_name, status, item_status, is_deleted, created_at, updated_at)
              VALUES (NEWID(), @requestId, @itemId, @nomenclature, @qty, @itemType, @customName, 'Pending', 'Pending', 0, GETDATE(), GETDATE())
            `);
        }
      }

      await transaction.commit();

      // After successful commit, create approval workflow records
      try {
        const userId = requester_user_id || req.session.userId;
        let dynamicWorkflowResult = null;
        let approverId = null;

        const submitterWorkflowRoles = await getUserWorkflowRoles(pool, userId);
        const isBranchSupervisorSubmission = normalizedRequestType === 'branch'
          && submitterWorkflowRoles.some(isBranchSupervisorRole);
        const isBranchStorekeeperSubmission = normalizedRequestType === 'branch'
          && submitterWorkflowRoles.some(isBranchStorekeeperRole);
        const startsAtBranchStorekeeper = normalizedRequestType === 'branch'
          && !isBranchSupervisorSubmission
          && !isBranchStorekeeperSubmission;

        // Always use the same workflow initialization path for all request types
        // (personal, wing, organizational) so routing starts at the configured first step.
        // Branch supervisors submit directly to the admin chain for the item group.
        if (startsAtBranchStorekeeper) {
          const branchStorekeeper = await findBranchRoleUser(pool, requester_branch_id, [
            'BRANCH_STORE_KEEPER',
            'Branch Storekeeper',
            'CUSTOM_BRANCH_STORE_KEEPER'
          ], userId);

          if (branchStorekeeper?.user_id) {
            approverId = branchStorekeeper.user_id;
          }
        } else {
          try {
            dynamicWorkflowResult = await initializeWorkflowForRequest(pool, requestId, userId, null, {
              startAtAdminChain: isBranchSupervisorSubmission
            });
            if (dynamicWorkflowResult?.ok && dynamicWorkflowResult?.approverId) {
              approverId = dynamicWorkflowResult.approverId;
            }
          } catch (dynamicError) {
            }
        }

        // Fallback to legacy routing if dynamic workflow is not configured/resolvable.
        if (!approverId && isBranchSupervisorSubmission) {
          approverId = await findFirstAdminChainApprover(pool, userId);
        }

        if (!approverId && normalizedRequestType === 'branch' && !isBranchSupervisorSubmission) {
          const branchSupervisor = await findBranchRoleUser(pool, requester_branch_id, [
            'BRANCH_SUPERVISOR',
            'Branch Supervisor',
            'CUSTOM_BRANCH_SUPERVISOR'
          ], userId);

          if (branchSupervisor?.user_id) {
            approverId = branchSupervisor.user_id;
          }
        }

        if (!approverId && wingId) {
          const supervisorResult = await pool.request()
            .input('wingId', sql.Int, wingId)
            .input('requesterId', sql.NVarChar(450), userId)
            .query(`
              DECLARE @requesterPriority INT = 9999;
              SELECT TOP 1 @requesterPriority = COALESCE(ud.Priority, 9999)
              FROM AspNetUsers u
              LEFT JOIN tblUserDesignations ud ON u.intDesignationID = ud.intDesignationID
              WHERE u.Id = @requesterId;

              SELECT TOP 1 u.Id as user_id, u.FullName
              FROM AspNetUsers u
              INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
              INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
              LEFT JOIN tblUserDesignations ud ON u.intDesignationID = ud.intDesignationID
              WHERE u.intWingID = @wingId
                AND u.Id != @requesterId
                AND (r.Name LIKE '%Admin%' OR r.Name LIKE '%DG%' OR r.Name LIKE '%ADG%'
                     OR r.Name LIKE '%Manager%' OR r.Name LIKE '%Director%' OR r.Name LIKE '%HoD%')
                AND COALESCE(CASE WHEN ud.Priority < 0 THEN 9999 ELSE ud.Priority END, 9999) < @requesterPriority
              ORDER BY
                COALESCE(CASE WHEN ud.Priority < 0 THEN 9999 ELSE ud.Priority END, 9999) DESC,
                u.FullName ASC
            `);

          if (supervisorResult.recordset.length > 0) {
            approverId = supervisorResult.recordset[0].user_id;
          } else {
            const fallbackResult = await pool.request()
              .input('wingId', sql.Int, wingId)
              .query(`
                SELECT TOP 1 u.Id as user_id
                FROM AspNetUsers u
                INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
                INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
                LEFT JOIN tblUserDesignations ud ON u.intDesignationID = ud.intDesignationID
                WHERE u.intWingID = @wingId
                  AND (r.Name LIKE '%Admin%' OR r.Name LIKE '%DG%' OR r.Name LIKE '%ADG%'
                       OR r.Name LIKE '%Manager%' OR r.Name LIKE '%Director%' OR r.Name LIKE '%HoD%')
                ORDER BY
                  CASE WHEN r.Name LIKE '%HoD%' THEN 1
                       WHEN r.Name LIKE '%Director%' THEN 2
                       WHEN r.Name LIKE '%Manager%' THEN 3
                       ELSE 4 END,
                  COALESCE(CASE WHEN ud.Priority < 0 THEN 9999 ELSE ud.Priority END, 9999) ASC,
                  u.FullName ASC
              `);
            if (fallbackResult.recordset.length > 0) {
              approverId = fallbackResult.recordset[0].user_id;
            }
          }
        }

        if (approverId) {
          // Create request_approvals record
          const approvalResult = await pool.request()
            .input('requestId', sql.UniqueIdentifier, requestId)
            .input('requestType', sql.NVarChar(50), 'stock_issuance')
            .input('approverId', sql.NVarChar(450), approverId)
            .input('submittedBy', sql.NVarChar(450), userId)
            .input('isAdminWorkflow', sql.Bit, isBranchSupervisorSubmission ? 1 : 0)
            .query(`
              INSERT INTO request_approvals 
                (request_id, request_type, workflow_id, current_approver_id, current_status, submitted_by, submitted_date, created_date, updated_date, is_admin_workflow)
              OUTPUT INSERTED.id
              VALUES 
                (@requestId, @requestType, NEWID(), @approverId, 'pending', @submittedBy, GETDATE(), GETDATE(), GETDATE(), @isAdminWorkflow)
            `);

          const approvalId = approvalResult.recordset[0].id;

            if (startsAtBranchStorekeeper) {
              await pool.request()
                .input('requestId', sql.UniqueIdentifier, requestId)
                .input('approvalStatus', sql.NVarChar(100), 'Pending Supervisor Review')
                .query(`
                  UPDATE stock_issuance_requests
                  SET approval_status = @approvalStatus,
                      updated_at = GETDATE()
                  WHERE id = @requestId
                `);
            } else if (isBranchSupervisorSubmission) {
              if (dynamicWorkflowResult?.ok) {
                await bindRequestApprovalId(pool, requestId, approvalId);
              }

              await pool.request()
                .input('requestId', sql.UniqueIdentifier, requestId)
                .input('approvalStatus', sql.NVarChar(100), 'Forwarded to Admin')
                .query(`
                  UPDATE stock_issuance_requests
                  SET approval_status = @approvalStatus,
                      updated_at = GETDATE()
                  WHERE id = @requestId
                `);
            } else if (dynamicWorkflowResult?.ok) {
              await bindRequestApprovalId(pool, requestId, approvalId);

              const laneStatusText = dynamicWorkflowResult.laneCount && dynamicWorkflowResult.laneCount > 1
                ? `Pending ${dynamicWorkflowResult.laneCount} Group Lanes`
                : `Pending Step ${dynamicWorkflowResult.currentStepOrder} of ${dynamicWorkflowResult.totalSteps}`;

              await pool.request()
                .input('requestId', sql.UniqueIdentifier, requestId)
                .input('approvalStatus', sql.NVarChar(100), laneStatusText)
                .query(`
                  UPDATE stock_issuance_requests
                  SET approval_status = @approvalStatus,
                      updated_at = GETDATE()
                  WHERE id = @requestId
                `);
            }

          // Create approval_items from stock_issuance_items (always query from DB, don't rely on req.body.items)
          const insertedItems = await pool.request()
            .input('requestId', sql.UniqueIdentifier, requestId)
            .query(`SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity FROM stock_issuance_items WHERE request_id = @requestId`);

          if (insertedItems.recordset.length > 0) {
            for (const item of insertedItems.recordset) {
              try {
                await pool.request()
                  .input('approvalId', sql.UniqueIdentifier, approvalId)
                  .input('itemId', sql.UniqueIdentifier, item.id)
                  .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id || null)
                  .input('nomenclature', sql.NVarChar(sql.MAX), item.nomenclature)
                  .input('customName', sql.NVarChar(sql.MAX), item.custom_item_name)
                  .input('qty', sql.Int, item.requested_quantity)
                  .query(`
                    IF NOT EXISTS (SELECT 1 FROM approval_items WHERE id = @itemId)
                    INSERT INTO approval_items 
                      (id, request_approval_id, item_master_id, nomenclature, custom_item_name, requested_quantity, decision_type, created_at, updated_at)
                    VALUES 
                      (@itemId, @approvalId, @itemMasterId, @nomenclature, @customName, @qty, 'PENDING', GETDATE(), GETDATE())
                  `);
              } catch (itemErr) {
                console.error(`❌ Failed to create approval_item for ${item.nomenclature}:`, itemErr.message);
              }
            }
          } else {
            }

        } else {
          const missingScope = normalizedRequestType === 'branch' ? `branch ${requester_branch_id}` : `wing ${wingId}`;
          }
      } catch (approvalError) {
        // Don't fail the request creation, just log the error
        console.error('❌ Failed to create approval record:', approvalError.message);
      }

      res.status(201).json({ 
        success: true, 
        request_id: requestId,
        data: {
          id: requestId,
          request_number: request_number
        }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

// Register both endpoints for backward compatibility
router.post('/', requireAuth, createStockIssuanceRequest);
router.post('/requests', requireAuth, createStockIssuanceRequest);

// ============================================================================
// POST /api/stock-issuance/items - Add items to existing request
// ============================================================================
router.post('/items', requireAuth, async (req, res) => {
  try {
    const { request_id, items } = req.body;
    const pool = getPool();

    if (!request_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'request_id and items are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const item of items) {
        await transaction.request()
          .input('requestId', sql.UniqueIdentifier, request_id)
          .input('itemId', sql.UniqueIdentifier, item.item_master_id || null)
          .input('nomenclature', sql.NVarChar(sql.MAX), item.nomenclature || null)
          .input('qty', sql.Int, item.requested_quantity || 0)
          .input('unitPrice', sql.Decimal(18, 2), item.unit_price || 0)
          .input('itemType', sql.NVarChar(50), item.item_type || 'standard')
          .input('customName', sql.NVarChar(sql.MAX), item.custom_item_name || null)
          .query(`
            INSERT INTO stock_issuance_items 
            (id, request_id, item_master_id, nomenclature, requested_quantity, unit_price, item_type, custom_item_name, status, item_status, is_deleted, created_at, updated_at)
            VALUES (NEWID(), @requestId, @itemId, @nomenclature, @qty, @unitPrice, @itemType, @customName, 'Pending', 'Pending', 0, GETDATE(), GETDATE())
          `);
      }

      await transaction.commit();
      
      // After items are added, create approval_items for any existing request_approvals that don't have them yet
      try {
        const approvalResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request_id)
          .query(`
            SELECT ra.id as approval_id 
            FROM request_approvals ra 
            WHERE ra.request_id = @requestId 
            AND NOT EXISTS (SELECT 1 FROM approval_items ai WHERE ai.request_approval_id = ra.id)
          `);
        
        if (approvalResult.recordset.length > 0) {
          const approvalId = approvalResult.recordset[0].approval_id;

          const requestResult = await pool.request()
            .input('requestId', sql.UniqueIdentifier, request_id)
            .query(`
              SELECT TOP 1 request_type, requester_user_id
              FROM stock_issuance_requests
              WHERE id = @requestId
            `);

          const stockRequest = requestResult.recordset[0] || null;
          const submittedBy = stockRequest?.requester_user_id || req.session.userId;
          const submitterWorkflowRoles = await getUserWorkflowRoles(pool, submittedBy);
          const isBranchSupervisorSubmission = String(stockRequest?.request_type || '').trim().toLowerCase() === 'branch'
            && submitterWorkflowRoles.some(isBranchSupervisorRole);

          if (isBranchSupervisorSubmission) {
            const dynamicWorkflowResult = await initializeWorkflowForRequest(pool, request_id, submittedBy, approvalId, {
              startAtAdminChain: true
            });

            if (dynamicWorkflowResult?.ok && dynamicWorkflowResult?.approverId) {
              await pool.request()
                .input('approvalId', sql.UniqueIdentifier, approvalId)
                .input('approverId', sql.NVarChar(450), dynamicWorkflowResult.approverId)
                .query(`
                  UPDATE request_approvals
                  SET current_approver_id = @approverId,
                      current_status = 'pending',
                      is_admin_workflow = 1,
                      updated_date = GETDATE()
                  WHERE id = @approvalId
                `);

              await pool.request()
                .input('requestId', sql.UniqueIdentifier, request_id)
                .input('approvalStatus', sql.NVarChar(100), 'Forwarded to Admin')
                .query(`
                  UPDATE stock_issuance_requests
                  SET approval_status = @approvalStatus,
                      updated_at = GETDATE()
                  WHERE id = @requestId
                `);
            } else {
              }
          }
          
          // Get the items we just inserted
          const insertedItems = await pool.request()
            .input('requestId', sql.UniqueIdentifier, request_id)
            .query(`SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity FROM stock_issuance_items WHERE request_id = @requestId`);
          
          for (const item of insertedItems.recordset) {
            try {
              await pool.request()
                .input('approvalId', sql.UniqueIdentifier, approvalId)
                .input('itemId', sql.UniqueIdentifier, item.id)
                .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id || null)
                .input('nomenclature', sql.NVarChar(500), item.nomenclature)
                .input('customName', sql.NVarChar(500), item.custom_item_name)
                .input('qty', sql.Int, item.requested_quantity)
                .query(`
                  IF NOT EXISTS (SELECT 1 FROM approval_items WHERE id = @itemId)
                  INSERT INTO approval_items 
                    (id, request_approval_id, item_master_id, nomenclature, custom_item_name, requested_quantity, decision_type, created_at, updated_at)
                  VALUES 
                    (@itemId, @approvalId, @itemMasterId, @nomenclature, @customName, @qty, 'PENDING', GETDATE(), GETDATE())
                `);
            } catch (itemErr) {
              console.error(`❌ Failed to create approval_item for ${item.nomenclature}:`, itemErr.message);
            }
          }
        }
      } catch (approvalErr) {
        console.error('❌ Failed to create approval_items after item submission:', approvalErr.message);
      }
      
      res.status(201).json({ success: true, items_count: items.length });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error adding items to request:', error);
    res.status(500).json({ error: 'Failed to add items to request' });
  }
});

// ============================================================================
// GET /api/stock-issuance/branch-storekeeper/requests
// Branch storekeeper queue for branch employee requests awaiting stock check
// ============================================================================
async function handleBranchStorekeeperRequests(req, res) {
  try {
    const pool = getPool();
    const userId = req.session.userId;

    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`SELECT intBranchID as branch_id, FullName FROM AspNetUsers WHERE Id = @userId`);

    const branchId = userResult.recordset[0]?.branch_id || null;
    if (!branchId) {
      return res.status(400).json({ error: 'No branch is assigned to this storekeeper' });
    }

    const roleResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT r.role_name
        FROM ims_user_roles ur
        INNER JOIN ims_roles r ON r.id = ur.role_id
        WHERE ur.user_id = @userId
          AND ur.is_active = 1
          AND r.is_active = 1
      `);

    const isBranchStorekeeper = (roleResult.recordset || []).some((row) => isBranchStorekeeperRole(row.role_name));
    if (!isBranchStorekeeper) {
      return res.status(403).json({ error: 'Only branch storekeepers can access this queue' });
    }

    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('branchId', sql.Int, branchId)
      .query(`
        SELECT
          ra.id AS approval_id,
          sir.id AS request_id,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.justification,
          sir.urgency_level,
          CASE
            WHEN sir.approval_status = 'Pending Supervisor Review' THEN 'Pending Branch Storekeeper'
            ELSE sir.approval_status
          END AS approval_status,
          sir.request_status,
          sir.submitted_at,
          u.FullName AS requester_name,
          sii.id AS stock_item_id,
          ai.id AS approval_item_id,
          sii.item_master_id,
          COALESCE(sii.nomenclature, im.nomenclature, sii.custom_item_name) AS nomenclature,
          sii.requested_quantity,
          sii.approved_quantity,
          COALESCE(im.unit, 'units') AS unit,
          COALESCE(cis.current_quantity, 0) AS available_quantity
        FROM request_approvals ra
        INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        INNER JOIN stock_issuance_items sii ON sii.request_id = sir.id
        LEFT JOIN approval_items ai ON ai.request_approval_id = ra.id
          AND (
            ai.item_master_id = sii.item_master_id
            OR (ai.item_master_id IS NULL AND sii.item_master_id IS NULL AND COALESCE(ai.nomenclature, ai.custom_item_name) = COALESCE(sii.nomenclature, sii.custom_item_name))
          )
        LEFT JOIN item_masters im ON im.id = sii.item_master_id
        LEFT JOIN current_inventory_stock cis ON cis.item_master_id = sii.item_master_id
        LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
        WHERE ra.current_approver_id = @userId
          AND ra.current_status = 'pending'
          AND sir.request_type = 'branch'
          AND sir.requester_branch_id = @branchId
          AND sir.approval_status IN ('Pending Supervisor Review', 'Pending')
          AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
          AND (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
        ORDER BY sir.submitted_at DESC, sir.request_number DESC, nomenclature ASC
      `);

    const requestsById = new Map();
    for (const row of result.recordset || []) {
      if (!requestsById.has(row.request_id)) {
        requestsById.set(row.request_id, {
          approval_id: row.approval_id,
          request_id: row.request_id,
          request_number: row.request_number,
          request_type: row.request_type,
          purpose: row.purpose,
          justification: row.justification,
          urgency_level: row.urgency_level,
          approval_status: row.approval_status,
          request_status: row.request_status,
          submitted_at: row.submitted_at,
          requester_name: row.requester_name,
          items: []
        });
      }

      requestsById.get(row.request_id).items.push({
        stock_item_id: row.stock_item_id,
        approval_item_id: row.approval_item_id,
        item_master_id: row.item_master_id,
        nomenclature: row.nomenclature,
        requested_quantity: Number(row.requested_quantity || 0),
        approved_quantity: Number(row.approved_quantity || 0),
        unit: row.unit,
        available_quantity: Number(row.available_quantity || 0)
      });
    }

    res.json({ success: true, data: Array.from(requestsById.values()) });
  } catch (error) {
    console.error('❌ Error loading branch storekeeper queue:', error);
    res.status(500).json({ error: 'Failed to load branch storekeeper queue', details: error.message });
  }
}

// ============================================================================
// POST /api/stock-issuance/branch-storekeeper/review/:requestId
// Storekeeper records available/short quantities and forwards to supervisor
// ============================================================================
router.post('/branch-storekeeper/review/:requestId', requireAuth, async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { requestId } = req.params;
    const { item_reviews = [], comments = '' } = req.body;
    const userId = req.session.userId;

    if (!Array.isArray(item_reviews) || item_reviews.length === 0) {
      return res.status(400).json({ error: 'item_reviews are required' });
    }

    const requestResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT TOP 1
          sir.id,
          sir.request_number,
          sir.requester_branch_id,
          ra.id AS approval_id,
          ra.current_approver_id
        FROM stock_issuance_requests sir
        INNER JOIN request_approvals ra ON ra.request_id = sir.id
        WHERE sir.id = @requestId
          AND sir.request_type = 'branch'
          AND ra.current_approver_id = @userId
          AND ra.current_status = 'pending'
          AND sir.approval_status IN ('Pending Supervisor Review', 'Pending')
      `);

    const requestRow = requestResult.recordset[0];
    if (!requestRow) {
      return res.status(404).json({ error: 'Branch request is not pending this storekeeper review' });
    }

    const branchSupervisor = await findBranchRoleUser(pool, requestRow.requester_branch_id, [
      'BRANCH_SUPERVISOR',
      'Branch Supervisor',
      'CUSTOM_BRANCH_SUPERVISOR'
    ], userId);

    if (!branchSupervisor?.user_id) {
      return res.status(400).json({ error: 'No branch supervisor found for this request branch' });
    }

    await transaction.begin();

    for (const review of item_reviews) {
      const availableQuantity = Math.max(0, Number(review.available_quantity || 0));
      const itemComment = review.comments || comments || '';

      await transaction.request()
        .input('stockItemId', sql.UniqueIdentifier, review.stock_item_id || review.item_id)
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('availableQty', sql.Int, availableQuantity)
        .input('itemComment', sql.NVarChar(sql.MAX), itemComment)
        .query(`
          UPDATE stock_issuance_items
          SET approved_quantity = @availableQty,
              item_status = CASE
                WHEN @availableQty >= ISNULL(requested_quantity, 0) THEN 'Approved'
                WHEN @availableQty > 0 THEN 'Partially Approved'
                ELSE 'Pending'
              END,
              source_store_type = 'branch',
              updated_at = GETDATE()
          WHERE id = @stockItemId
            AND request_id = @requestId
        `);

      await transaction.request()
        .input('approvalId', sql.UniqueIdentifier, requestRow.approval_id)
        .input('approvalItemId', sql.UniqueIdentifier, review.approval_item_id || review.item_id)
        .input('availableQty', sql.Int, availableQuantity)
        .input('itemComment', sql.NVarChar(sql.MAX), itemComment)
        .query(`
          UPDATE approval_items
          SET allocated_quantity = @availableQty,
              decision_type = 'FORWARD_TO_SUPERVISOR',
              forwarding_reason = @itemComment,
              updated_at = GETDATE()
          WHERE request_approval_id = @approvalId
            AND id = @approvalItemId
        `);
    }

    const nextStepResult = await transaction.request()
      .input('approvalId', sql.UniqueIdentifier, requestRow.approval_id)
      .query(`
        SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
        FROM approval_history
        WHERE request_approval_id = @approvalId
      `);
    const nextStep = nextStepResult.recordset[0]?.next_step || 1;

    await transaction.request()
      .input('approvalId', sql.UniqueIdentifier, requestRow.approval_id)
      .query(`UPDATE approval_history SET is_current_step = 0 WHERE request_approval_id = @approvalId`);

    await transaction.request()
      .input('approvalId', sql.UniqueIdentifier, requestRow.approval_id)
      .input('actionBy', sql.NVarChar(450), userId)
      .input('comments', sql.NVarChar(sql.MAX), comments || 'Branch stock checked and forwarded to branch supervisor')
      .input('stepNumber', sql.Int, nextStep)
      .input('forwardedTo', sql.NVarChar(450), branchSupervisor.user_id)
      .query(`
        INSERT INTO approval_history
          (request_approval_id, action_type, action_by, comments, step_number, is_current_step, forwarded_to)
        VALUES
          (@approvalId, 'forwarded', @actionBy, @comments, @stepNumber, 1, @forwardedTo)
      `);

    await transaction.request()
      .input('approvalId', sql.UniqueIdentifier, requestRow.approval_id)
      .input('supervisorId', sql.NVarChar(450), branchSupervisor.user_id)
      .query(`
        UPDATE request_approvals
        SET current_approver_id = @supervisorId,
            current_status = 'pending',
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);

    await transaction.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        UPDATE stock_issuance_requests
        SET approval_status = 'Pending Supervisor Review',
            request_status = 'Pending',
            updated_at = GETDATE()
        WHERE id = @requestId
      `);

    await transaction.commit();
    res.json({ success: true, message: 'Request forwarded to branch supervisor', supervisor: branchSupervisor });
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    console.error('❌ Error submitting branch storekeeper review:', error);
    res.status(500).json({ error: 'Failed to submit branch storekeeper review', details: error.message });
  }
});

// ============================================================================
// POST /api/stock-issuance/issue/:id - Mark approved request as physically issued
// Wing store keeper issues items to the requester from their wing
// ============================================================================
router.post('/issue/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { issued_by, issued_by_name, issuance_notes } = req.body;
    const pool = getPool();
    const userId = req.session?.userId || issued_by;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate the request exists and is approved
    const requestResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT sir.*, u.FullName as requester_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        WHERE sir.id = @id
      `);

    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.recordset[0];

    // Verify the issuing user is a store keeper for the requester's wing
    const userWingResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`SELECT u.intWingID as WingId, u.intBranchID as BranchId, u.FullName FROM AspNetUsers u WHERE u.Id = @userId`);
    
    if (userWingResult.recordset.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const issuerWingId = userWingResult.recordset[0].WingId;
    const issuerBranchId = userWingResult.recordset[0].BranchId;
    const issuerName = userWingResult.recordset[0].FullName;

    // Check if user is a store keeper
    const skCheck = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT ir.role_name
        FROM ims_user_roles ur
        INNER JOIN ims_roles ir ON ur.role_id = ir.id
        WHERE ur.user_id = @userId
          AND ir.is_active = 1
          AND (
            ir.role_name LIKE '%STORE_KEEPER%'
            OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER'
            OR ir.role_name = 'Storekeeper'
          )
      `);

    if (skCheck.recordset.length === 0) {
      return res.status(403).json({ error: 'Only store keepers can issue items' });
    }

    // Verify the store keeper belongs to the same wing as the requester
    if (issuerWingId && request.requester_wing_id && issuerWingId !== request.requester_wing_id) {
      return res.status(403).json({ 
        error: 'You can only issue items for requests from your own wing',
        your_wing: issuerWingId,
        request_wing: request.requester_wing_id
      });
    }

    if (issuerBranchId && request.requester_branch_id && issuerBranchId !== request.requester_branch_id) {
      return res.status(403).json({
        error: 'You can only issue items for requests from your own branch',
        your_branch: issuerBranchId,
        request_branch: request.requester_branch_id
      });
    }

    const status = (request.approval_status || '').toLowerCase();

    if (!status.includes('approved')) {
      return res.status(400).json({ 
        error: 'Request must be approved before it can be issued',
        current_status: request.approval_status 
      });
    }

    if (status === 'issued' || status === 'completed') {
      return res.status(400).json({ error: 'Request has already been issued' });
    }

    // Get the items for this request
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, id)
      .query(`
        SELECT sii.*, im.nomenclature as master_nomenclature
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @requestId
          AND (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
      `);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const existingTxnResult = await transaction.request()
        .input('requestId', sql.UniqueIdentifier, id)
        .query(`
          SELECT COUNT(1) AS existing_count
          FROM stock_transactions
          WHERE reference_id = @requestId
            AND transaction_type = 'ISSUANCE'
            AND status = 'completed'
        `);
      const hasExistingIssuanceTransactions = Number(existingTxnResult.recordset?.[0]?.existing_count || 0) > 0;

      // Detect optional acquisition stock columns for schema compatibility.
      const hasQtyAvailableResult = await transaction.request().query(`
        SELECT CASE
          WHEN COL_LENGTH('stock_acquisitions', 'quantity_available') IS NOT NULL
           AND ISNULL(COLUMNPROPERTY(OBJECT_ID('stock_acquisitions'), 'quantity_available', 'IsComputed'), 0) = 0
          THEN 1 ELSE 0 END AS has_qty_available
      `);
      const hasQtyAvailable = hasQtyAvailableResult.recordset[0]?.has_qty_available === 1;

      // Update each item's status to 'Issued' and set issued_quantity
      for (const item of itemsResult.recordset) {
        const issuedQty = Number(item.approved_quantity || item.requested_quantity || 0);

        if (!issuedQty || issuedQty <= 0) {
          throw new Error(`Invalid issued quantity for item ${item.id}`);
        }

        await transaction.request()
          .input('itemId', sql.UniqueIdentifier, item.id)
          .input('issuedQty', sql.NVarChar, String(issuedQty))
          .query(`
            UPDATE stock_issuance_items
            SET item_status = 'Issued',
                issued_quantity = @issuedQty,
                updated_at = GETDATE()
            WHERE id = @itemId
          `);

        // Deduct stock from acquisitions first (FIFO) when quantity_available is supported.
        // If issuance transactions already exist for this request, skip deduction to avoid double deduction.
        if (hasExistingIssuanceTransactions) {
          continue;
        }

        let deductedFromAcquisitions = 0;

        if (hasQtyAvailable && item.item_master_id) {
          const stockResult = await transaction.request()
            .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
            .query(`
              SELECT id, ISNULL(quantity_available, 0) AS quantity_available
              FROM stock_acquisitions
              WHERE item_master_id = @item_master_id
                AND ISNULL(quantity_available, 0) > 0
              ORDER BY acquisition_date ASC, created_at ASC
            `);

          let remainingQty = issuedQty;

          for (const stock of stockResult.recordset) {
            if (remainingQty <= 0) break;

            const deductQty = Math.min(remainingQty, Number(stock.quantity_available || 0));
            if (deductQty <= 0) continue;

            await transaction.request()
              .input('acquisitionId', sql.UniqueIdentifier, stock.id)
              .input('deductQty', sql.Int, deductQty)
              .query(`
                UPDATE stock_acquisitions
                SET quantity_available = ISNULL(quantity_available, 0) - @deductQty,
                    quantity_issued = ISNULL(quantity_issued, 0) + @deductQty,
                    updated_at = GETDATE()
                WHERE id = @acquisitionId
              `);

            remainingQty -= deductQty;
            deductedFromAcquisitions += deductQty;
          }
        }

        const remainingToDeduct = issuedQty - deductedFromAcquisitions;

        // Fallback for item setups backed by current_inventory_stock instead of acquisitions.
        if (remainingToDeduct > 0 && item.item_master_id) {
          const cisUpdateResult = await transaction.request()
            .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id)
            .input('remainingQty', sql.Int, remainingToDeduct)
            .query(`
              UPDATE current_inventory_stock
              SET current_quantity = current_quantity - @remainingQty,
                  last_updated = GETDATE(),
                  last_transaction_date = GETDATE()
              WHERE item_master_id = @itemMasterId
                AND current_quantity >= @remainingQty
            `);

          if (!cisUpdateResult.rowsAffected || cisUpdateResult.rowsAffected[0] === 0) {
            throw new Error(`Insufficient available stock for item ${item.item_master_id}`);
          }
        }
      }

      // Update the request status to 'Issued'
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('issuedBy', sql.NVarChar, userId)
        .input('issuanceNotes', sql.NVarChar, issuance_notes || '')
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Issued',
              request_status = 'Issued',
              issued_at = GETDATE(),
              issued_by = @issuedBy,
              issuance_notes = @issuanceNotes,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Add history entries if there's a request_approvals record
      const raResult = await transaction.request()
        .input('requestId', sql.UniqueIdentifier, id)
        .query(`SELECT id FROM request_approvals WHERE request_id = @requestId`);

      if (raResult.recordset.length > 0) {
        const approvalId = raResult.recordset[0].id;
        
        // Get next step number
        const stepResult = await transaction.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .query(`SELECT ISNULL(MAX(step_number), 0) + 1 as next_step FROM approval_history WHERE request_approval_id = @approvalId`);
        
        let nextStep = stepResult.recordset[0].next_step;

        // Clear current step flags
        await transaction.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .query(`UPDATE approval_history SET is_current_step = 0 WHERE request_approval_id = @approvalId`);

        // Step 1: "Sent to Wing Store Keeper" - shows admin forwarded items to wing store keeper
        await transaction.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .input('actionBy', sql.NVarChar, request.admin_id || request.supervisor_id || userId)
          .input('comments', sql.NVarChar, `Items sent to wing store keeper (${issuerName}) for physical issuance`)
          .input('stepNumber', sql.Int, nextStep)
          .query(`
            INSERT INTO approval_history
            (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
            VALUES (@approvalId, 'sent_to_store_keeper', @actionBy, @comments, @stepNumber, 0)
          `);

        // Step 2: "Issued" - wing store keeper issues items to requester
        await transaction.request()
          .input('approvalId2', sql.UniqueIdentifier, approvalId)
          .input('issuedBy', sql.NVarChar, userId)
          .input('issueComments', sql.NVarChar, issuance_notes || `Items physically issued to requester by ${issuerName}`)
          .input('issueStep', sql.Int, nextStep + 1)
          .query(`
            INSERT INTO approval_history
            (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
            VALUES (@approvalId2, 'issued', @issuedBy, @issueComments, @issueStep, 1)
          `);

        // Update request_approvals status
        await transaction.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .query(`UPDATE request_approvals SET current_status = 'completed', updated_date = GETDATE() WHERE id = @approvalId`);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `Items issued successfully for request ${request.request_number} by ${issuerName}`,
        data: {
          request_id: id,
          request_number: request.request_number,
          items_issued: itemsResult.recordset.length,
          issued_at: new Date().toISOString(),
          issued_by: userId,
          issued_by_name: issuerName
        }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error processing issuance:', error);
    res.status(500).json({ error: 'Failed to process issuance', details: error.message });
  }
});

// ============================================================================
// POST /api/stock-issuance/acknowledge/:id - Requester confirms physical receipt
// ============================================================================
router.post('/acknowledge/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the request exists and belongs to this user
    const requestResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT * FROM stock_issuance_requests
        WHERE id = @id AND requester_user_id = @userId
      `);

    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found or not authorized' });
    }

    const request = requestResult.recordset[0];
    if (request.approval_status !== 'Issued') {
      return res.status(400).json({ error: 'Request must be in Issued status to acknowledge receipt' });
    }

    // Update to Completed
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE stock_issuance_requests
        SET approval_status = 'Completed',
            request_status = 'Completed',
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Receipt acknowledged. Request completed.' });
  } catch (error) {
    console.error('Error acknowledging receipt:', error);
    res.status(500).json({ error: 'Failed to acknowledge receipt', details: error.message });
  }
});

// ============================================================================
// PUT /api/stock-issuance/:id - Update request
// ============================================================================
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;
    const pool = getPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      if (status) {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('status', sql.NVarChar(50), status)
          .query(`
            UPDATE stock_issuance_requests
            SET approval_status = @status,
                updated_at = GETDATE()
            WHERE id = @id
          `);
      }

      if (items && Array.isArray(items)) {
        for (const item of items) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.id)
            .input('approvedQty', sql.Int, item.approved_quantity)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty
              WHERE id = @itemId
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Request updated' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ============================================================================
// DELETE /api/stock-issuance/:id - Delete request (only pending)
// ============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT approval_status FROM stock_issuance_requests WHERE id = @id AND is_deleted = 0');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (checkResult.recordset[0].approval_status !== 'Pending') {
      return res.status(400).json({ error: 'Can only delete pending requests' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Soft delete issuance items
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE stock_issuance_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE request_id = @requestId
        `);

      // Soft delete request
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE stock_issuance_requests
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Request deleted' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// ============================================================================
// POST /api/stock-issuance/historical - Create historical issuance (admin only)
// ============================================================================
// Creates a complete issuance record for past/historical transactions
// Bypasses the normal approval workflow
router.post('/historical', async (req, res) => {
  try {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
      const {
        request_type,
        requested_by_id,
        requested_for_wing_id,
        request_date,
        approval_date,
        issuance_date,
        purpose,
        remarks,
        items,
      } = req.body;

      // Validation
      if (!request_type || !purpose || !items || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (request_type === 'personal' && !requested_by_id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Person is required for personal requests' });
      }

      if (request_type === 'wing' && !requested_for_wing_id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Wing is required for wing requests' });
      }

      const requestId = uuidv4();
      const issuanceId = uuidv4();
      const currentUserId = req.session?.userId || null; // Admin who is creating this record

      // Step 1: Create the issuance request (already approved)
      await transaction.request()
        .input('id', sql.UniqueIdentifier, requestId)
        .input('request_number', sql.NVarChar, `HIST-${Date.now()}`)
        .input('requester_user_id', sql.NVarChar(450), request_type === 'personal' ? requested_by_id : null)
        .input('requester_wing_id', sql.Int, request_type === 'wing' ? parseInt(requested_for_wing_id) : null)
        .input('request_type', sql.NVarChar(50), request_type)
        .input('purpose', sql.NVarChar, purpose)
        .input('approval_status', sql.NVarChar(50), 'approved')
        .input('approval_date', sql.DateTime, new Date(approval_date))
        .input('approved_by', sql.NVarChar(450), currentUserId)
        .input('remarks', sql.NVarChar, remarks || null)
        .input('created_at', sql.DateTime, new Date(request_date))
        .input('updated_at', sql.DateTime, new Date(approval_date))
        .query(`
          INSERT INTO stock_issuance_requests (
            id, request_number, requester_user_id, requester_wing_id, 
            request_type, purpose, approval_status, approval_date, 
            approved_by, remarks, created_at, updated_at
          )
          VALUES (
            @id, @request_number, @requester_user_id, @requester_wing_id,
            @request_type, @purpose, @approval_status, @approval_date,
            @approved_by, @remarks, @created_at, @updated_at
          )
        `);

    // Step 2: Insert request items
    for (const item of items) {
      const itemId = uuidv4();
      await transaction.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('request_id', sql.UniqueIdentifier, requestId)
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('quantity_requested', sql.Int, item.quantity_requested)
        .input('quantity_approved', sql.Int, item.quantity_approved)
        .input('remarks', sql.NVarChar, item.remarks || null)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, item_master_id, quantity_requested, 
            quantity_approved, remarks
          )
          VALUES (
            @id, @request_id, @item_master_id, @quantity_requested,
            @quantity_approved, @remarks
          )
        `);
    }

    // Step 3: Create the issuance record
    await transaction.request()
      .input('id', sql.UniqueIdentifier, issuanceId)
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('issuance_number', sql.NVarChar, `ISS-HIST-${Date.now()}`)
      .input('issued_by', sql.NVarChar(450), currentUserId)
      .input('issued_to_user_id', sql.NVarChar(450), request_type === 'personal' ? requested_by_id : null)
      .input('issued_to_wing_id', sql.Int, request_type === 'wing' ? parseInt(requested_for_wing_id) : null)
      .input('issuance_date', sql.DateTime, new Date(issuance_date))
      .input('status', sql.NVarChar(50), 'issued')
      .input('remarks', sql.NVarChar, `Historical entry: ${remarks || purpose}`)
      .input('created_at', sql.DateTime, new Date(issuance_date))
      .query(`
        INSERT INTO stock_issuances (
          id, request_id, issuance_number, issued_by, issued_to_user_id,
          issued_to_wing_id, issuance_date, status, remarks, created_at
        )
        VALUES (
          @id, @request_id, @issuance_number, @issued_by, @issued_to_user_id,
          @issued_to_wing_id, @issuance_date, @status, @remarks, @created_at
        )
      `);

    // Step 4: Insert issuance items and update stock
    for (const item of items) {
      const issuanceItemId = uuidv4();
      
      // Insert issuance item
      await transaction.request()
        .input('id', sql.UniqueIdentifier, issuanceItemId)
        .input('issuance_id', sql.UniqueIdentifier, issuanceId)
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('quantity_issued', sql.Int, item.quantity_issued)
        .input('remarks', sql.NVarChar, item.remarks || null)
        .query(`
          INSERT INTO stock_issuance_issued_items (
            id, issuance_id, item_master_id, quantity_issued, remarks
          )
          VALUES (
            @id, @issuance_id, @item_master_id, @quantity_issued, @remarks
          )
        `);

      // Deduct from stock (FIFO)
      let remainingQty = item.quantity_issued;
      const stockResult = await transaction.request()
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .query(`
          SELECT id, quantity_available
          FROM stock_acquisitions
          WHERE item_master_id = @item_master_id
            AND quantity_available > 0
          ORDER BY delivery_date ASC
        `);

      for (const stock of stockResult.recordset) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(remainingQty, stock.quantity_available);
        
        await transaction.request()
          .input('id', sql.UniqueIdentifier, stock.id)
          .input('deduct', sql.Int, deductQty)
          .query(`
            UPDATE stock_acquisitions
            SET quantity_available = quantity_available - @deduct
            WHERE id = @id
          `);

        remainingQty -= deductQty;
      }

      if (remainingQty > 0) {
        throw new Error(`Insufficient stock for item: ${item.item_master_id}`);
      }
    }

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Historical issuance created successfully',
      requestId,
      issuanceId,
    });

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Error creating historical issuance:', error);
    res.status(500).json({ 
      error: 'Failed to create historical issuance',
      details: error.message 
    });
  }
});


// ============================================================================
// POST /api/stock-issuance/:id/restore - Restore deleted stock issuance
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const result = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_issuance_requests
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted issuance request not found' });
      }

      // Restore issuance items
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_issuance_items
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE request_id = @requestId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ success: true, message: '✅ Issuance request restored', request: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring issuance request:', error);
    res.status(500).json({ error: 'Failed to restore issuance request' });
  }
});

module.exports = router;