// ============================================================================
// Approvals Workflow Routes
// ============================================================================
// Stock issuance approval workflows with supervisor and admin levels

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const {
  ensureTables,
  getWorkflowSteps,
  advanceWorkflow,
  getWorkflowRoles,
  getUserWorkflowRoles,
  WORKFLOW_ROLE_NAMES,
  resolveItemMasterGroupNumber
} = require('../utils/workflowEngine.cjs');

const WORKFLOW_ROLE_FILTER_SQL = WORKFLOW_ROLE_NAMES
  .map((_, index) => `@role${index}`)
  .join(', ');

const ADMIN_CHAIN_ROLE_NAMES = ['DD Admin', 'AD Admin-I', 'AD Admin-II', 'Storekeeper'];
const ADMIN_CHAIN_ROLE_FILTER_SQL = ADMIN_CHAIN_ROLE_NAMES
  .map((_, index) => `@adminRole${index}`)
  .join(', ');

const deriveParentLaneStatus = (lanes = []) => {
  if (!Array.isArray(lanes) || lanes.length === 0) return 'pending';

  const statuses = lanes.map((lane) => String(lane.status || '').toLowerCase());
  const allCompleted = statuses.every((status) => status === 'completed');
  const allRejected = statuses.every((status) => status === 'rejected');
  const anyCompleted = statuses.some((status) => status === 'completed');
  const anyPending = statuses.some((status) => status === 'pending');
  const anyRejected = statuses.some((status) => status === 'rejected');

  if (allCompleted) return 'approved';
  if (allRejected) return 'rejected';
  if (anyCompleted && (anyPending || anyRejected)) return 'partially_approved';
  return 'pending';
};

const createBranchDemandForForwardedShortages = async (transaction, approvalId, userId) => {
  const shortageResult = await transaction.request()
    .input('approvalId', sql.UniqueIdentifier, approvalId)
    .query(`
      SELECT
        sir.id AS request_id,
        sir.request_number,
        sir.requester_wing_id,
        sir.urgency_level,
        ai.item_master_id,
        COALESCE(ai.nomenclature, im.nomenclature, ai.custom_item_name) AS nomenclature,
        COALESCE(im.unit, ai.unit, 'units') AS unit,
        CASE
          WHEN ISNULL(ai.requested_quantity, 0) - ISNULL(ai.allocated_quantity, 0) > 0
            THEN ISNULL(ai.requested_quantity, 0) - ISNULL(ai.allocated_quantity, 0)
          ELSE ISNULL(ai.requested_quantity, 0)
        END AS quantity_needed,
        CAST(sir.requester_branch_id AS NVARCHAR(200)) AS branch_name
      FROM request_approvals ra
      INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
      LEFT JOIN item_masters im ON im.id = ai.item_master_id
      WHERE ra.id = @approvalId
        AND sir.request_type IN ('branch', 'individual', 'personal', 'Individual', 'Personal', 'wing', 'organizational', 'Organizational')
        AND ai.decision_type = 'FORWARD_TO_ADMIN'
        AND ISNULL(ai.requested_quantity, 0) > 0
    `);

  for (const item of shortageResult.recordset || []) {
    const quantityNeeded = Math.max(1, Number(item.quantity_needed || 0));

    await transaction.request()
      .input('sourceRequestId', sql.UniqueIdentifier, item.request_id)
      .input('sourceRequestNumber', sql.NVarChar(100), item.request_number)
      .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id || null)
      .input('nomenclature', sql.NVarChar(500), item.nomenclature || 'Custom Item')
      .input('quantityNeeded', sql.Int, quantityNeeded)
      .input('unit', sql.NVarChar(50), item.unit || 'units')
      .input('wingId', sql.Int, item.requester_wing_id || null)
      .input('branchName', sql.NVarChar(200), item.branch_name || null)
      .input('urgencyLevel', sql.NVarChar(50), item.urgency_level || 'Medium')
      .input('createdBy', sql.NVarChar(450), userId)
      .input('notes', sql.NVarChar(sql.MAX), 'Demand created from branch shortage forwarded to admin workflow')
      .query(`
        IF EXISTS (
          SELECT 1
          FROM required_items
          WHERE source_request_id = @sourceRequestId
            AND status IN ('Pending', 'Planned')
            AND is_deleted = 0
            AND (
              (item_master_id = @itemMasterId)
              OR (item_master_id IS NULL AND @itemMasterId IS NULL AND nomenclature = @nomenclature)
            )
        )
        BEGIN
          UPDATE required_items
          SET quantity_needed = @quantityNeeded,
              unit = @unit,
              urgency_level = @urgencyLevel,
              notes = @notes,
              updated_at = GETDATE()
          WHERE source_request_id = @sourceRequestId
            AND status IN ('Pending', 'Planned')
            AND is_deleted = 0
            AND (
              (item_master_id = @itemMasterId)
              OR (item_master_id IS NULL AND @itemMasterId IS NULL AND nomenclature = @nomenclature)
            );
        END
        ELSE
        BEGIN
          INSERT INTO required_items
            (item_master_id, nomenclature, quantity_needed, unit, source_request_id, source_request_number,
             requested_by_wing_id, requested_by_wing_name, urgency_level, status, notes, created_by)
          VALUES
            (@itemMasterId, @nomenclature, @quantityNeeded, @unit, @sourceRequestId, @sourceRequestNumber,
             @wingId, @branchName, @urgencyLevel, 'Pending', @notes, @createdBy);
        END
      `);
  }

  return shortageResult.recordset?.length || 0;
};

const createProcurementRequestFromApproval = async (transaction, approvalId, userId) => {
  const procurementResult = await transaction.request()
    .input('approvalId', sql.UniqueIdentifier, approvalId)
    .query(`
      SELECT
        sir.id AS request_id,
        sir.request_number,
        sir.requester_wing_id,
        sir.urgency_level,
        ai.item_master_id,
        COALESCE(ai.nomenclature, im.nomenclature, ai.custom_item_name) AS nomenclature,
        COALESCE(im.unit, ai.unit, 'units') AS unit,
        CASE
          WHEN ISNULL(ai.requested_quantity, 0) - ISNULL(ai.allocated_quantity, 0) > 0
            THEN ISNULL(ai.requested_quantity, 0) - ISNULL(ai.allocated_quantity, 0)
          ELSE ISNULL(ai.requested_quantity, 0)
        END AS quantity_needed,
        CAST(sir.requester_branch_id AS NVARCHAR(200)) AS branch_name
      FROM request_approvals ra
      INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
      LEFT JOIN item_masters im ON im.id = ai.item_master_id
      WHERE ra.id = @approvalId
        AND ai.decision_type = 'FORWARD_TO_PROCUREMENT'
        AND ISNULL(ai.requested_quantity, 0) > 0
    `);

  for (const item of procurementResult.recordset || []) {
    const quantityNeeded = Math.max(1, Number(item.quantity_needed || 0));

    await transaction.request()
      .input('sourceRequestId', sql.UniqueIdentifier, item.request_id)
      .input('sourceRequestNumber', sql.NVarChar(100), item.request_number)
      .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id || null)
      .input('nomenclature', sql.NVarChar(500), item.nomenclature || 'Custom Item')
      .input('quantityNeeded', sql.Int, quantityNeeded)
      .input('unit', sql.NVarChar(50), item.unit || 'units')
      .input('wingId', sql.Int, item.requester_wing_id || null)
      .input('branchName', sql.NVarChar(200), item.branch_name || null)
      .input('urgencyLevel', sql.NVarChar(50), item.urgency_level || 'Medium')
      .input('createdBy', sql.NVarChar(450), userId)
      .input('notes', sql.NVarChar(sql.MAX), 'Procurement request created from approval workflow')
      .query(`
        IF EXISTS (
          SELECT 1
          FROM required_items
          WHERE source_request_id = @sourceRequestId
            AND status IN ('Pending', 'Planned')
            AND is_deleted = 0
            AND (
              (item_master_id = @itemMasterId)
              OR (item_master_id IS NULL AND @itemMasterId IS NULL AND nomenclature = @nomenclature)
            )
        )
        BEGIN
          UPDATE required_items
          SET quantity_needed = @quantityNeeded,
              unit = @unit,
              urgency_level = @urgencyLevel,
              notes = @notes,
              updated_at = GETDATE()
          WHERE source_request_id = @sourceRequestId
            AND status IN ('Pending', 'Planned')
            AND is_deleted = 0
            AND (
              (item_master_id = @itemMasterId)
              OR (item_master_id IS NULL AND @itemMasterId IS NULL AND nomenclature = @nomenclature)
            );
        END
        ELSE
        BEGIN
          INSERT INTO required_items
            (item_master_id, nomenclature, quantity_needed, unit, source_request_id, source_request_number,
             requested_by_wing_id, requested_by_wing_name, urgency_level, status, notes, created_by)
          VALUES
            (@itemMasterId, @nomenclature, @quantityNeeded, @unit, @sourceRequestId, @sourceRequestNumber,
             @wingId, @branchName, @urgencyLevel, 'Pending', @notes, @createdBy);
        END
      `);
  }

  return procurementResult.recordset?.length || 0;
};

// ============================================================================
// Middleware: Authentication and Permission Checking
// ============================================================================
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Check if user has permission in session
      const isSuperAdmin = req.session.user?.is_super_admin === true;
      if (isSuperAdmin) {
        return next();
      }
      
      const hasPermission = req.session.user?.ims_permissions?.some(p => p.permission_key === permission);
      if (hasPermission) {
        return next();
      }
      // Fallback to database check
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.NVarChar(450), req.session.userId)
        .input('permissionKey', sql.NVarChar(100), permission)
        .query('SELECT dbo.fn_HasPermission(@userId, @permissionKey) as hasPermission');
      const rawValue = result.recordset[0]?.hasPermission;
      if (rawValue === 1 || rawValue === true) {
        return next();
      }
      res.status(403).json({ error: 'Insufficient permissions', required: permission });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// ============================================================================
// GET /api/approvals/workflow/configs - List workflow config by group
// ============================================================================
router.get('/workflow/configs', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const groupNumber = req.query.group_number ? Number(req.query.group_number) : null;

    let query = `
      SELECT group_number, step_order, designation_value, match_mode
      FROM ims_dynamic_workflow_steps
      WHERE is_active = 1
    `;

    const request = pool.request();
    if (groupNumber) {
      request.input('groupNumber', sql.Int, groupNumber);
      query += ' AND group_number = @groupNumber';
    }

    query += ' ORDER BY group_number ASC, step_order ASC, designation_value ASC';

    const result = await request.query(query);
    const grouped = {};

    for (const row of result.recordset || []) {
      if (!grouped[row.group_number]) {
        grouped[row.group_number] = [];
      }

      let step = grouped[row.group_number].find((s) => s.step_order === row.step_order);
      if (!step) {
        step = { step_order: row.step_order, designations: [] };
        grouped[row.group_number].push(step);
      }

      step.designations.push({
        value: row.designation_value,
        match_mode: row.match_mode || 'prefix'
      });
    }

    const data = Object.keys(grouped).map((group) => ({
      group_number: Number(group),
      steps: grouped[group].sort((a, b) => a.step_order - b.step_order)
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error loading workflow configs:', error);
    res.status(500).json({ success: false, error: 'Failed to load workflow configs', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/workflow/group-items - Group checker data for workflow setup
// ============================================================================
router.get('/workflow/group-items', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const result = await pool.request().query(`
      SELECT
        im.id,
        im.nomenclature,
        im.group_number,
        im.description
      FROM item_masters im
      ORDER BY im.nomenclature ASC
    `);

    const grouped = new Map();
    for (let groupNumber = 1; groupNumber <= 6; groupNumber += 1) {
      grouped.set(groupNumber, []);
    }

    for (const row of result.recordset || []) {
      const groupNumber = resolveItemMasterGroupNumber(row.group_number, row.description);
      if (!groupNumber || groupNumber < 1 || groupNumber > 6) continue;

      grouped.get(groupNumber).push({
        id: row.id,
        nomenclature: row.nomenclature || 'Unnamed Item',
        group_number: groupNumber,
        description: row.description || ''
      });
    }

    const data = Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([group_number, items]) => ({
        group_number,
        item_count: items.length,
        items
      }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error loading workflow group items:', error);
    res.status(500).json({ success: false, error: 'Failed to load group items', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/workflow/roles - List active IMS roles for workflow steps
// ============================================================================
router.get('/workflow/roles', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);
    const roles = await getWorkflowRoles(pool);
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('❌ Error loading workflow roles:', error);
    res.status(500).json({ success: false, error: 'Failed to load workflow roles', details: error.message });
  }
});

// Backward-compatible alias for older frontend calls.
router.get('/workflow/designations', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);
    const roles = await getWorkflowRoles(pool);
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('❌ Error loading workflow roles via designations alias:', error);
    res.status(500).json({ success: false, error: 'Failed to load workflow roles', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/workflow/role-assignments - List users and assigned IMS roles
// ============================================================================
router.get('/workflow/role-assignments', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);

    const request = pool.request();
    WORKFLOW_ROLE_NAMES.forEach((role, index) => {
      request.input(`role${index}`, sql.NVarChar(100), role);
    });

    const result = await request.query(`
      SELECT
        u.Id AS user_id,
        u.FullName,
        u.Email,
        roles.roles_csv
      FROM AspNetUsers u
      OUTER APPLY (
        SELECT STUFF((
          SELECT '|' + wr2.role_name
          FROM ims_user_roles ur2
          INNER JOIN ims_roles wr2
            ON wr2.id = ur2.role_id
           AND wr2.is_active = 1
           AND wr2.role_name IN (${WORKFLOW_ROLE_FILTER_SQL})
          WHERE ur2.user_id = u.Id
            AND ur2.is_active = 1
          ORDER BY wr2.role_name
          FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS roles_csv
      ) roles
      ORDER BY u.FullName ASC
    `);

    const data = (result.recordset || []).map((row) => ({
      user_id: row.user_id,
      full_name: row.FullName,
      email: row.Email,
      roles: row.roles_csv ? String(row.roles_csv).split('|').filter(Boolean) : []
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error loading workflow role assignments:', error);
    res.status(500).json({ success: false, error: 'Failed to load workflow role assignments', details: error.message });
  }
});

// ============================================================================
// PUT /api/approvals/workflow/role-assignments/:userId - Upsert IMS roles for a user
// Payload: { roles: ['IMS_ADMIN', 'DD Admin'] }
// ============================================================================
router.put('/workflow/role-assignments/:userId', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();
    const roles = Array.isArray(req.body?.roles)
      ? req.body.roles.map((r) => String(r || '').trim()).filter(Boolean)
      : [];

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Valid userId is required' });
    }

    const pool = getPool();
    await ensureTables(pool);

    const validRoles = new Set(await getWorkflowRoles(pool));

    if (roles.length > 0) {
      const unknown = roles.filter((role) => !validRoles.has(role));
      if (unknown.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Unknown IMS role(s): ${unknown.join(', ')}`
        });
      }
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const roleName of roles) {
        await transaction.request()
          .input('userId', sql.NVarChar(450), userId)
          .input('roleName', sql.NVarChar(100), roleName)
          .input('assignedBy', sql.NVarChar(450), req.session.userId || null)
          .query(`
            MERGE ims_user_roles AS target
            USING (
              SELECT @userId AS user_id, wr.id AS role_id
              FROM ims_roles wr
              WHERE wr.role_name = @roleName
                AND wr.is_active = 1
            ) AS src
            ON target.user_id = src.user_id
               AND target.role_id = src.role_id
               AND target.scope_type = 'Global'
               AND target.scope_office_id IS NULL
               AND target.scope_wing_id IS NULL
               AND target.scope_branch_id IS NULL
            WHEN MATCHED THEN
              UPDATE SET
                is_active = 1,
                assigned_by = @assignedBy,
                assigned_at = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (user_id, role_id, scope_type, assigned_by, assigned_at, is_active)
              VALUES (src.user_id, src.role_id, 'Global', @assignedBy, GETDATE(), 1);
          `);
      }

      await transaction.commit();
      res.json({ success: true, message: 'Workflow role assignment updated successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error updating workflow role assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to update workflow role assignment', details: error.message });
  }
});

// ============================================================================
// PUT /api/approvals/workflow/configs/:groupNumber - Replace group workflow steps
// Payload: { steps: [ { step_order: 1, roles: ['DD Admin'] }, ... ] }
// ============================================================================
router.put('/workflow/configs/:groupNumber', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const groupNumber = Number(req.params.groupNumber);
    const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];

    if (!Number.isInteger(groupNumber) || groupNumber <= 0) {
      return res.status(400).json({ success: false, error: 'Valid groupNumber is required' });
    }

    if (steps.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one workflow step is required' });
    }

    const pool = getPool();
    await ensureTables(pool);

    const normalizedSteps = [];
    for (const rawStep of steps) {
      const stepOrder = Number(rawStep.step_order);
      const rawRoles = Array.isArray(rawStep.roles)
        ? rawStep.roles
        : (Array.isArray(rawStep.designations)
          ? rawStep.designations
          : (Array.isArray(rawStep.designation_options) ? rawStep.designation_options : []));

      const roles = rawRoles
        .map((value) => String(value || '').trim())
        .filter(Boolean);

      if (!Number.isInteger(stepOrder) || stepOrder <= 0) {
        return res.status(400).json({ success: false, error: 'Each step must have a positive step_order' });
      }

      if (roles.length === 0) {
        return res.status(400).json({ success: false, error: `Step ${stepOrder} must include at least one role` });
      }

      normalizedSteps.push({ step_order: stepOrder, roles });
    }

    const validRoles = new Set(await getWorkflowRoles(pool));
    const unknownRoles = normalizedSteps
      .flatMap((step) => step.roles)
      .filter((roleName) => !validRoles.has(roleName));

    if (unknownRoles.length > 0) {
      return res.status(400).json({
        success: false,
        error: `These roles do not exist in IMS roles: ${Array.from(new Set(unknownRoles)).join(', ')}`
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('groupNumber', sql.Int, groupNumber)
        .query(`
          UPDATE ims_dynamic_workflow_steps
          SET is_active = 0,
              updated_at = GETDATE()
          WHERE group_number = @groupNumber
            AND is_active = 1
        `);

      for (const step of normalizedSteps) {
        for (const roleName of step.roles) {
          const matchMode = 'exact';

          await transaction.request()
            .input('groupNumber', sql.Int, groupNumber)
            .input('stepOrder', sql.Int, step.step_order)
            .input('designationValue', sql.NVarChar(200), roleName)
            .input('matchMode', sql.NVarChar(20), matchMode)
            .query(`
              INSERT INTO ims_dynamic_workflow_steps
              (group_number, step_order, designation_value, match_mode, is_active, created_at, updated_at)
              VALUES
              (@groupNumber, @stepOrder, @designationValue, @matchMode, 1, GETDATE(), GETDATE())
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Workflow configuration updated successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error updating workflow config:', error);
    res.status(500).json({ success: false, error: 'Failed to update workflow config', details: error.message });
  }
});

// ============================================================================
// DELETE /api/approvals/workflow/configs/:groupNumber - Remove group workflow steps
// ============================================================================
router.delete('/workflow/configs/:groupNumber', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const groupNumber = Number(req.params.groupNumber);

    if (!Number.isInteger(groupNumber) || groupNumber <= 0) {
      return res.status(400).json({ success: false, error: 'Valid groupNumber is required' });
    }

    const pool = getPool();
    await ensureTables(pool);

    await pool.request()
      .input('groupNumber', sql.Int, groupNumber)
      .query(`
        UPDATE ims_dynamic_workflow_steps
        SET is_active = 0,
            updated_at = GETDATE()
        WHERE group_number = @groupNumber
          AND is_active = 1
      `);

    res.json({ success: true, message: `Workflow deleted for Group ${groupNumber}` });
  } catch (error) {
    console.error('❌ Error deleting workflow config:', error);
    res.status(500).json({ success: false, error: 'Failed to delete workflow config', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/supervisor/pending - Get pending requests for supervisor
// ============================================================================
router.get('/supervisor/pending', requireAuth, requirePermission('stock_request.view_wing'), async (req, res) => {
  try {
    const pool = getPool();
    await ensureTables(pool);
    const supervisorId = req.query.supervisor_id || req.session.userId;
    let wingId = req.query.wing_id;

    const schemaResult = await pool.request().query(`
      SELECT
        MAX(CASE WHEN name = 'is_deleted' THEN 1 ELSE 0 END) AS has_is_deleted,
        MAX(CASE WHEN name = 'submitted_at' THEN 1 ELSE 0 END) AS has_submitted_at
      FROM sys.columns
      WHERE object_id = OBJECT_ID('stock_issuance_requests')
    `);

    const schemaFlags = schemaResult.recordset[0] || {};

    // If no wing_id provided, get user's wing from database
    if (!wingId) {
      const userWingResult = await pool.request()
        .input('userId', sql.NVarChar(450), req.session.userId)
        .query(`
          SELECT u.intWingID as WingId 
          FROM AspNetUsers u
          WHERE u.Id = @userId
        `);
      
      if (userWingResult.recordset.length > 0) {
        wingId = userWingResult.recordset[0].WingId;
      }
    }

    if (!wingId) {
      // Return empty instead of error if no wing found
      console.log('⚠️ No wing_id provided or found for user');
      return res.json({ requests: [], total: 0 });
    }

    // Use inline query instead of view for better compatibility
    const result = await pool.request()
      .input('wingId', sql.NVarChar(100), String(wingId))
      .input('supervisorId', sql.NVarChar(450), String(supervisorId))
      .query(`
        SELECT 
          sir.id,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.urgency_level,
          sir.approval_status,
          sir.submitted_at,
          sir.requester_user_id,
          sir.requester_wing_id,
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 1 ELSE 0 END as is_urgent,
          DATEDIFF(HOUR, ${schemaFlags.has_submitted_at ? 'sir.submitted_at' : 'sir.created_at'}, GETDATE()) as pending_hours,
          u.FullName as requester_name,
          w.Name as wing_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sir.requester_user_id) = CONVERT(NVARCHAR(450), u.Id)
        LEFT JOIN WingsInformation w ON CONVERT(NVARCHAR(100), sir.requester_wing_id) = CONVERT(NVARCHAR(100), w.Id)
        WHERE CONVERT(NVARCHAR(100), sir.requester_wing_id) = @wingId
          AND (
            sir.approval_status IN ('Pending', 'pending', 'Submitted', 'Pending Supervisor Review')
            OR sir.approval_status LIKE 'Pending%'
            OR EXISTS (
              SELECT 1
              FROM ims_request_workflow_state rws
              WHERE rws.request_id = sir.id
                AND rws.status = 'pending'
                AND rws.current_approver_id = @supervisorId
            )
          )
          AND (${schemaFlags.has_is_deleted ? '(sir.is_deleted = 0 OR sir.is_deleted IS NULL)' : '1=1'})
        ORDER BY 
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 0 ELSE 1 END,
          ${schemaFlags.has_submitted_at ? 'sir.submitted_at' : 'sir.created_at'} ASC
      `);

    console.log(`📋 Found ${result.recordset.length} pending requests for wing ${wingId}`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching supervisor pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/admin/pending - Get pending requests for admin
// ============================================================================
router.get('/admin/pending', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const pool = getPool();

    // Use inline query instead of view for better compatibility
    const result = await pool.request()
      .query(`
        SELECT 
          sir.id as request_id,
          sir.id,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.urgency_level,
          sir.approval_status,
          sir.submitted_at,
          sir.requester_user_id,
          sir.requester_wing_id,
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 1 ELSE 0 END as is_urgent,
          DATEDIFF(HOUR, sir.submitted_at, GETDATE()) as pending_hours,
          u.FullName as requester_name,
          w.Name as wing_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
        LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
        WHERE sir.approval_status IN ('Forwarded to Admin', 'Approved by Supervisor', 'Pending Admin Approval')
          AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
        ORDER BY 
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 0 ELSE 1 END,
          sir.submitted_at ASC
      `);

    console.log(`📋 Found ${result.recordset.length} pending requests for admin`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching admin pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/my-pending - Get pending approvals for current user
// ============================================================================
router.get('/my-pending', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session.userId;

    // Check if user is a supervisor (has view_wing permission)
    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT u.Id, u.intWingID as wing_id
        FROM AspNetUsers u
        WHERE u.Id = @userId
      `);

    if (userResult.recordset.length === 0) {
      return res.json({ requests: [], data: [] });
    }

    const user = userResult.recordset[0];
    if (!user.wing_id) {
      return res.json({ requests: [], data: [] });
    }

    // Get pending supervisory approvals for this user's wing
    const result = await pool.request()
      .input('wingId', sql.Int, user.wing_id)
      .query(`
        SELECT * FROM vw_pending_supervisor_approvals
        WHERE requester_wing_id = @wingId
          AND LOWER(CONVERT(NVARCHAR(100), request_type)) IN ('organizational', 'wing')
        ORDER BY is_urgent DESC, pending_hours DESC
      `);

    console.log(`📋 Found ${result.recordset.length} pending approvals for user ${userId}`);
    res.json({ 
      requests: result.recordset, 
      data: result.recordset,
      total: result.recordset.length 
    });
  } catch (error) {
    console.error('❌ Error fetching my pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/my-lane-pending - Pending mixed-group lanes for current user
// ============================================================================
router.get('/my-lane-pending', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session.userId;
    await ensureTables(pool);

    const laneRequest = pool.request()
      .input('userId', sql.NVarChar(450), userId);

    ADMIN_CHAIN_ROLE_NAMES.forEach((role, index) => {
      laneRequest.input(`adminRole${index}`, sql.NVarChar(100), role);
    });

    const result = await laneRequest
      .query(`
        SELECT
          rws.request_id,
          rws.group_number,
          rws.current_step_order,
          rws.total_steps,
          rws.status,
          rws.current_approver_id,
          ra.id AS approval_id,
          ra.current_status AS request_approval_status,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.urgency_level,
          sir.submitted_at,
          requester.FullName AS requester_name,
          approver.FullName AS lane_approver_name,
          COUNT(sii.id) AS lane_item_count
        FROM ims_request_workflow_state rws
        LEFT JOIN request_approvals ra ON ra.request_id = rws.request_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = rws.request_id
        LEFT JOIN AspNetUsers requester ON TRY_CONVERT(uniqueidentifier, requester.Id) = sir.requester_user_id
        LEFT JOIN AspNetUsers approver ON approver.Id = rws.current_approver_id
        LEFT JOIN stock_issuance_items sii ON sii.request_id = rws.request_id
        LEFT JOIN item_masters im ON im.id = sii.item_master_id
        WHERE rws.status = 'pending'
          AND (
            rws.current_approver_id = @userId
            OR EXISTS (
              SELECT 1
              FROM ims_user_roles me
              INNER JOIN ims_user_roles assigned ON assigned.role_id = me.role_id
              INNER JOIN ims_roles roleDef ON roleDef.id = me.role_id
              WHERE me.user_id = @userId
                AND me.is_active = 1
                AND assigned.user_id = rws.current_approver_id
                AND assigned.is_active = 1
                AND roleDef.is_active = 1
                AND roleDef.role_name IN (${ADMIN_CHAIN_ROLE_FILTER_SQL})
            )
          )
          AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
          AND (
            COL_LENGTH('stock_issuance_items', 'is_deleted') IS NULL
            OR sii.is_deleted = 0
            OR sii.is_deleted IS NULL
            OR sii.id IS NULL
          )
          AND (
            im.id IS NULL
            OR im.group_number = rws.group_number
          )
        GROUP BY
          rws.request_id,
          rws.group_number,
          rws.current_step_order,
          rws.total_steps,
          rws.status,
          rws.current_approver_id,
          ra.id,
          ra.current_status,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.urgency_level,
          sir.submitted_at,
          requester.FullName,
          approver.FullName
        ORDER BY sir.submitted_at DESC, rws.group_number ASC
      `);

    res.json({
      success: true,
      data: result.recordset || [],
      total: result.recordset?.length || 0
    });
  } catch (error) {
    console.error('❌ Error fetching my lane pending approvals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lane pending approvals', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/request/:requestId/lanes - Lane breakdown for a request
// ============================================================================
router.get('/request/:requestId/lanes', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(requestId)) {
      return res.status(400).json({ success: false, error: 'Invalid request ID format' });
    }

    const pool = getPool();
    await ensureTables(pool);

    const laneResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT
          rws.request_id,
          rws.group_number,
          rws.current_step_order,
          rws.total_steps,
          rws.status,
          rws.current_approver_id,
          approver.FullName AS lane_approver_name,
          MAX(activeStep.designation_value) AS lane_role_label,
          COUNT(sii.id) AS lane_item_count,
          SUM(CASE WHEN ai.decision_type = 'APPROVE_FROM_STOCK' THEN 1 ELSE 0 END) AS lane_approved_items,
          SUM(CASE WHEN ai.decision_type = 'REJECT' THEN 1 ELSE 0 END) AS lane_rejected_items
        FROM ims_request_workflow_state rws
        LEFT JOIN AspNetUsers approver ON approver.Id = rws.current_approver_id
        LEFT JOIN ims_dynamic_workflow_steps activeStep
          ON activeStep.group_number = rws.group_number
         AND activeStep.step_order = rws.current_step_order
         AND activeStep.is_active = 1
        LEFT JOIN stock_issuance_items sii ON sii.request_id = rws.request_id
        LEFT JOIN item_masters im ON im.id = sii.item_master_id
        LEFT JOIN request_approvals ra ON ra.request_id = rws.request_id
        LEFT JOIN approval_items ai ON ai.request_approval_id = ra.id AND ai.item_master_id = sii.item_master_id
        WHERE rws.request_id = @requestId
          AND (
            COL_LENGTH('stock_issuance_items', 'is_deleted') IS NULL
            OR sii.is_deleted = 0
            OR sii.is_deleted IS NULL
            OR sii.id IS NULL
          )
          AND (
            im.id IS NULL
            OR im.group_number = rws.group_number
          )
        GROUP BY
          rws.request_id,
          rws.group_number,
          rws.current_step_order,
          rws.total_steps,
          rws.status,
          rws.current_approver_id,
          approver.FullName
        ORDER BY rws.group_number ASC
      `);

    const lanes = laneResult.recordset || [];

    res.json({
      success: true,
      request_id: requestId,
      parent_status: deriveParentLaneStatus(lanes),
      lane_count: lanes.length,
      lanes
    });
  } catch (error) {
    console.error('❌ Error loading request lanes:', error);
    res.status(500).json({ success: false, error: 'Failed to load request lanes', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/request/:requestId - Get request details with items
// ============================================================================
router.get('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }
    
    const pool = getPool();

    // Get request details
    const requestResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT sir.*, u.FullName AS requester_name, u.Email AS requester_email
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
        WHERE sir.id = @requestId
      `);

    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.recordset[0];

    const tableExistsResult = await pool.request().query(`
      SELECT
        CASE WHEN OBJECT_ID('stock_wing') IS NOT NULL THEN 1 ELSE 0 END AS has_stock_wing,
        CASE WHEN OBJECT_ID('stock_admin') IS NOT NULL THEN 1 ELSE 0 END AS has_stock_admin,
        CASE WHEN OBJECT_ID('issuance_approval_history') IS NOT NULL THEN 1 ELSE 0 END AS has_issuance_history
    `);

    const tableFlags = tableExistsResult.recordset[0] || {};

    // Get request items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT
          sii.*, 
          im.nomenclature,
          im.group_number,
          im.unit,
          COALESCE(
            NULLIF(LTRIM(RTRIM(c.category_name)), ''),
            'Uncategorized'
          ) AS category_name
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        LEFT JOIN categories c
          ON CONVERT(NVARCHAR(100), im.category_id) = CONVERT(NVARCHAR(100), c.id)
        WHERE sii.request_id = @requestId
          AND (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
      `);

    // Check stock availability
    const itemsWithAvailability = await Promise.all(
      itemsResult.recordset.map(async (item) => {
        if (item.is_custom_item) {
          return {
            ...item,
            wing_stock_available: 'N/A',
            admin_stock_available: 'N/A',
            can_fulfill_from_wing: false,
            can_fulfill_from_admin: false
          };
        }

        const requestedQty = Number(item.approved_quantity || item.requested_quantity || 0);
        let wingAvailable = 0;
        let adminAvailable = 0;

        if (tableFlags.has_stock_wing) {
          const wingStock = await pool.request()
            .input('itemId', sql.UniqueIdentifier, item.item_master_id)
            .input('wingId', sql.Int, request.requester_wing_id)
            .query(`SELECT TOP 1 available_quantity FROM stock_wing WHERE item_master_id = @itemId AND wing_id = @wingId`);
          wingAvailable = Number(wingStock.recordset[0]?.available_quantity || 0);
        }

        if (tableFlags.has_stock_admin) {
          // Admin/main inventory uses current_inventory_stock as the primary
          // system-wide stock balance (same source the inventory dashboard uses).
          // Fall back to stock_acquisitions and then stock_admin for legacy data.
          const cisStock = await pool.request()
            .input('itemId', sql.UniqueIdentifier, item.item_master_id)
            .query(`SELECT TOP 1 current_quantity FROM current_inventory_stock WHERE item_master_id = @itemId`);
          let mainAvailable = Number(cisStock.recordset[0]?.current_quantity || 0);

          if (mainAvailable === 0) {
            const acqStock = await pool.request()
              .input('itemId', sql.UniqueIdentifier, item.item_master_id)
              .query(`
                SELECT ISNULL(SUM(quantity_available), 0) AS available_quantity
                FROM stock_acquisitions
                WHERE item_master_id = @itemId
                  AND (is_deleted = 0 OR is_deleted IS NULL)
              `);
            mainAvailable = Number(acqStock.recordset[0]?.available_quantity || 0);
          }

          if (mainAvailable === 0) {
            const legacyStock = await pool.request()
              .input('itemId', sql.UniqueIdentifier, item.item_master_id)
              .query(`SELECT TOP 1 available_quantity FROM stock_admin WHERE item_master_id = @itemId`);
            mainAvailable = Number(legacyStock.recordset[0]?.available_quantity || 0);
          }

          adminAvailable = mainAvailable;
        }

        // Fallback for environments without stock_wing/stock_admin tables.
        if (!tableFlags.has_stock_wing && !tableFlags.has_stock_admin) {
          const cisStock = await pool.request()
            .input('itemId', sql.UniqueIdentifier, item.item_master_id)
            .query(`SELECT TOP 1 current_quantity FROM current_inventory_stock WHERE item_master_id = @itemId`);
          const qty = Number(cisStock.recordset[0]?.current_quantity || 0);
          wingAvailable = qty;
          adminAvailable = qty;
        }

        return {
          ...item,
          wing_stock_available: wingAvailable,
          admin_stock_available: adminAvailable,
          can_fulfill_from_wing: wingAvailable >= requestedQty,
          can_fulfill_from_admin: adminAvailable >= requestedQty
        };
      })
    );

    // Get approval history
    let historyRows = [];
    if (tableFlags.has_issuance_history) {
      const historyResult = await pool.request()
        .input('requestId', sql.UniqueIdentifier, request.id)
        .query(`
          SELECT * FROM issuance_approval_history
          WHERE request_id = @requestId
          ORDER BY action_date DESC
        `);
      historyRows = historyResult.recordset;
    }

    res.json({
      request,
      items: itemsWithAvailability,
      history: historyRows
    });
  } catch (error) {
    console.error('❌ Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/request/:requestId/status - Get approval workflow status
// Returns the current_status from request_approvals for a given request
// ============================================================================
router.get('/request/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const pool = getPool();
    await ensureTables(pool);

    const result = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT ra.current_status, ra.current_approver_id, COALESCE(ra.is_admin_workflow, 0) AS is_admin_workflow,
               u.FullName as current_approver_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
        WHERE ra.request_id = @requestId
      `);

    if (result.recordset.length === 0) {
      return res.json({ success: true, current_status: null, current_approver_name: null });
    }

    const row = result.recordset[0];
    res.json({
      success: true,
      current_status: row.current_status,
      current_approver_name: row.current_approver_name,
      is_admin_workflow: !!row.is_admin_workflow
    });
  } catch (error) {
    console.error('❌ Error fetching request status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

// ============================================================================
// POST /api/approvals/supervisor/approve - Supervisor approve request
// ============================================================================
router.post('/supervisor/approve', requireAuth, requirePermission('stock_request.approve_supervisor'), async (req, res) => {
  try {
    const { requestId, supervisorId, comments, itemApprovals } = req.body;
    const pool = getPool();

    if (!requestId || !supervisorId) {
      return res.status(400).json({ error: 'requestId and supervisorId are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Approved by Supervisor',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Approved',
              source_store_type = 'Wing'
          WHERE id = @requestId
        `);

      // Update item statuses if provided
      if (itemApprovals && Array.isArray(itemApprovals)) {
        for (const item of itemApprovals) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.itemId)
            .input('approvedQty', sql.Int, item.approvedQuantity)
            .input('status', sql.NVarChar(20), item.status)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty,
                  item_status = @status,
                  source_store_type = 'Wing'
              WHERE id = @itemId
            `);
        }
      }

      // Log approval history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Approved')
        .input('newStatus', sql.NVarChar(30), 'Approved by Supervisor')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Supervisor approved request ${requestId}`);
      res.json({ success: true, message: 'Request approved successfully', action: 'approved' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/supervisor/forward - Supervisor forward to admin
// ============================================================================
router.post('/supervisor/forward', requireAuth, requirePermission('stock_request.forward'), async (req, res) => {
  try {
    const { requestId, supervisorId, forwardingReason, comments } = req.body;
    const pool = getPool();
    await ensureTables(pool);

    if (!requestId || !supervisorId || !forwardingReason) {
      return res.status(400).json({ error: 'requestId, supervisorId, and forwardingReason are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const approvalRow = await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT TOP 1 id, current_status
          FROM request_approvals
          WHERE request_id = @requestId
          ORDER BY updated_date DESC, created_date DESC
        `);

      const approvalId = approvalRow.recordset?.[0]?.id || null;
      let transition = null;
      let nextApproverId = null;
      let overallStatus = 'forwarded_to_admin';
      let statusLabel = 'Forwarded to Admin';

      // Advance all pending lanes for this request so mixed-group requests fan out
      // to each group's next approver instead of a single static assignee.
      transition = await advanceWorkflow(transaction, requestId, supervisorId, {});
      if (transition?.ok) {
        if (transition.completed) {
          overallStatus = 'approved';
          statusLabel = 'Approved';
        } else {
          overallStatus = 'pending';
          nextApproverId = transition.approverId || null;
          if ((transition.laneCount || 0) > 1) {
            statusLabel = `Pending ${transition.pendingLanes || transition.laneCount} Group Lanes`;
          } else {
            statusLabel = `Pending Step ${transition.nextStepOrder || 1} of ${transition.totalSteps || 1}`;
          }
        }
      }

      if (approvalId) {
        await transaction.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .input('status', sql.NVarChar(50), overallStatus)
          .input('nextApproverId', sql.NVarChar(450), nextApproverId)
          .query(`
            UPDATE request_approvals
            SET current_status = @status,
                updated_date = GETDATE()
                ${nextApproverId ? ', current_approver_id = @nextApproverId' : ''}
            WHERE id = @approvalId
          `);

        await transaction.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .input('actorId', sql.NVarChar(450), supervisorId)
          .input('comments', sql.NVarChar(sql.MAX), forwardingReason || comments || 'Forwarded to next workflow step')
          .query(`
            DECLARE @nextStep INT;
            SELECT @nextStep = ISNULL(MAX(step_number), 0) + 1
            FROM approval_history
            WHERE request_approval_id = @approvalId;

            UPDATE approval_history
            SET is_current_step = 0
            WHERE request_approval_id = @approvalId;

            INSERT INTO approval_history
            (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
            VALUES (@approvalId, 'forwarded_to_admin', @actorId, @comments, @nextStep, 1);
          `);
      }

      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('forwardingReason', sql.NVarChar(sql.MAX), forwardingReason)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .input('statusLabel', sql.NVarChar(100), statusLabel)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = @statusLabel,
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Forwarded',
              forwarding_reason = @forwardingReason
          WHERE id = @requestId
        `);

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Forwarded')
        .input('newStatus', sql.NVarChar(100), statusLabel)
        .input('reason', sql.NVarChar(sql.MAX), forwardingReason)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, forwarding_reason)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @reason
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Supervisor forwarded request ${requestId} to admin`);
      res.json({
        success: true,
        message: 'Request forwarded through workflow successfully',
        action: 'forwarded',
        lane_transition: transition
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error forwarding request:', error);
    res.status(500).json({ error: 'Failed to forward request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/supervisor/reject - Supervisor reject request
// ============================================================================
router.post('/supervisor/reject', requireAuth, requirePermission('stock_request.reject_supervisor'), async (req, res) => {
  try {
    const { requestId, supervisorId, comments } = req.body;
    const pool = getPool();

    if (!requestId || !supervisorId || !comments) {
      return res.status(400).json({ error: 'requestId, supervisorId, and comments are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Rejected by Supervisor',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Rejected'
          WHERE id = @requestId
        `);

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Rejected')
        .input('newStatus', sql.NVarChar(30), 'Rejected by Supervisor')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Supervisor rejected request ${requestId}`);
      res.json({ success: true, message: 'Request rejected', action: 'rejected' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/admin/approve - Admin approve request
// ============================================================================
router.post('/admin/approve', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const { requestId, adminId, comments, itemApprovals } = req.body;
    const pool = getPool();

    if (!requestId || !adminId) {
      return res.status(400).json({ error: 'requestId and adminId are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('adminId', sql.NVarChar(450), adminId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Approved by Admin',
              admin_id = @adminId,
              admin_reviewed_at = GETDATE(),
              admin_comments = @comments,
              admin_action = 'Approved',
              source_store_type = 'Admin'
          WHERE id = @requestId
        `);

      // Update item statuses if provided
      if (itemApprovals && Array.isArray(itemApprovals)) {
        for (const item of itemApprovals) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.itemId)
            .input('approvedQty', sql.Int, item.approvedQuantity)
            .input('status', sql.NVarChar(20), item.status)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty,
                  item_status = @status,
                  source_store_type = 'Admin'
              WHERE id = @itemId
            `);
        }
      }

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), adminId)
        .input('action', sql.NVarChar(30), 'Approved')
        .input('newStatus', sql.NVarChar(30), 'Approved by Admin')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Admin approved request ${requestId}`);
      res.json({ success: true, message: 'Request approved successfully', action: 'approved' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/admin/reject - Admin reject request
// ============================================================================
router.post('/admin/reject', requireAuth, requirePermission('stock_request.reject_admin'), async (req, res) => {
  try {
    const { requestId, adminId, comments } = req.body;
    const pool = getPool();

    if (!requestId || !adminId || !comments) {
      return res.status(400).json({ error: 'requestId, adminId, and comments are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('adminId', sql.NVarChar(450), adminId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Rejected by Admin',
              admin_id = @adminId,
              admin_reviewed_at = GETDATE(),
              admin_comments = @comments,
              admin_action = 'Rejected'
          WHERE id = @requestId
        `);

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), adminId)
        .input('action', sql.NVarChar(30), 'Rejected')
        .input('newStatus', sql.NVarChar(30), 'Rejected by Admin')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Admin rejected request ${requestId}`);
      res.json({ success: true, message: 'Request rejected', action: 'rejected' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/my-requests/:userId - Get user's requests
// ============================================================================
router.get('/my-requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT * FROM vw_my_issuance_requests
        WHERE requester_user_id = @userId
        ORDER BY submitted_at DESC
      `);

    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/history/:issuanceId - Get approval history
// ============================================================================
router.get('/history/:issuanceId', async (req, res) => {
  try {
    const { issuanceId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('issuanceId', sql.UniqueIdentifier, issuanceId)
      .query(`
        SELECT * FROM stock_issuance_approval_history
        WHERE request_id = @issuanceId
        ORDER BY action_date DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching approval history:', error);
    res.status(500).json({ error: 'Failed to fetch approval history', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/my-approvals - Get pending approvals for current user
// Uses request_approvals table with fallback to stock_issuance_requests
// ============================================================================
router.get('/my-approvals', async (req, res) => {
  try {
    let userId = req.query.userId || req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in first.'
      });
    }

    const status = req.query.status || 'pending';
    const pool = getPool();
    await ensureTables(pool);

    // Build WHERE clause based on requested status
    // "pending" = things I need to act on (I'm current approver, not yet decided)
    // "approved" = things I approved (or were approved in chain I was part of)
    // "forwarded" = things I forwarded to someone else
    // "rejected"/"returned" = things I rejected/returned
    let statusFilter = '';
    if (status === 'pending') {
      // Requests assigned to me that are pending my action
      statusFilter = `((ra.current_approver_id = @userId
          AND ra.current_status IN ('pending', 'forwarded_to_admin', 'forwarded_to_supervisor'))
        OR (
          ra.current_status IN ('pending', 'forwarded_to_admin')
          AND EXISTS (
            SELECT 1
            FROM ims_user_roles me
            INNER JOIN ims_user_roles assigned ON assigned.role_id = me.role_id
            INNER JOIN ims_roles roleDef ON roleDef.id = me.role_id
            WHERE me.user_id = @userId
              AND me.is_active = 1
              AND assigned.user_id = ra.current_approver_id
              AND assigned.is_active = 1
              AND roleDef.is_active = 1
              AND roleDef.role_name IN (${ADMIN_CHAIN_ROLE_FILTER_SQL})
          )
        ))
        OR EXISTS (
          SELECT 1
          FROM ims_request_workflow_state rws
          WHERE rws.request_id = ra.request_id
            AND rws.status = 'pending'
            AND rws.current_approver_id = @userId
        )`;
    } else if (status === 'approved') {
      // Requests where I took an approve action (check approval_history)
      statusFilter = `ra.current_status IN ('approved', 'completed')
        AND EXISTS (
          SELECT 1 FROM approval_history ah
          WHERE ah.request_approval_id = ra.id
          AND ah.action_by = @userId
        )`;
    } else if (status === 'rejected') {
      statusFilter = `ra.current_status = 'rejected'
        AND EXISTS (
          SELECT 1 FROM approval_history ah
          WHERE ah.request_approval_id = ra.id
          AND ah.action_by = @userId
        )`;
    } else if (status === 'returned') {
      statusFilter = `ra.current_status = 'returned'
        AND EXISTS (
          SELECT 1 FROM approval_history ah
          WHERE ah.request_approval_id = ra.id
          AND ah.action_by = @userId
        )`;
    } else if (status === 'forwarded') {
      // Requests I forwarded (I'm in the history as forwarder, but I'm no longer the approver)
      statusFilter = `ra.current_approver_id != @userId
        AND EXISTS (
          SELECT 1 FROM approval_history ah
          WHERE ah.request_approval_id = ra.id
          AND ah.action_by = @userId
          AND ah.action_type IN ('forwarded_to_admin', 'forwarded_to_supervisor')
        )`;
    }

    const approvalsRequest = pool.request()
      .input('userId', sql.NVarChar(450), userId);

    ADMIN_CHAIN_ROLE_NAMES.forEach((role, index) => {
      approvalsRequest.input(`adminRole${index}`, sql.NVarChar(100), role);
    });

    const approvalsResult = await approvalsRequest
      .query(`
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          sir.request_number,
          ra.submitted_date,
          ra.current_status,
          COALESCE(ra.is_admin_workflow, 0) AS is_admin_workflow,
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
        WHERE sir.id IS NOT NULL
        AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
        AND (${statusFilter})
        ORDER BY ra.submitted_date DESC
      `);

    // Build response
    const approvals = [];
    for (const approval of approvalsResult.recordset) {
      // Load items for this approval
      let items = [];
      try {
        const itemsResult = await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approval.id)
          .query(`
            SELECT
              ai.id as item_id,
              ai.nomenclature as item_name,
              ai.custom_item_name,
              ai.requested_quantity,
              ai.allocated_quantity as approved_quantity,
              COALESCE(ai.unit, 'units') as unit,
              ai.decision_type,
              ai.rejection_reason
            FROM approval_items ai
            WHERE ai.request_approval_id = @approvalId
            ORDER BY ai.nomenclature
          `);
        items = itemsResult.recordset || [];

        // Self-healing: if no approval_items exist, populate them from stock_issuance_items
        if (items.length === 0 && approval.request_id) {
          console.log(`⚠️ Self-healing in my-approvals: No approval_items for approval ${approval.id}, creating from stock_issuance_items`);
          const stockItems = await pool.request()
            .input('requestId', sql.UniqueIdentifier, approval.request_id)
            .query(`SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity FROM stock_issuance_items WHERE request_id = @requestId`);

          for (const item of stockItems.recordset) {
            try {
              await pool.request()
                .input('approvalId', sql.UniqueIdentifier, approval.id)
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
              console.error(`❌ Self-healing in my-approvals failed for item ${item.nomenclature}:`, itemErr.message);
            }
          }

          // Re-query
          const itemsResult2 = await pool.request()
            .input('approvalId', sql.UniqueIdentifier, approval.id)
            .query(`
              SELECT
                ai.id as item_id,
                ai.nomenclature as item_name,
                ai.custom_item_name,
                ai.requested_quantity,
                ai.allocated_quantity as approved_quantity,
                COALESCE(ai.unit, 'units') as unit,
                ai.decision_type,
                ai.rejection_reason
              FROM approval_items ai
              WHERE ai.request_approval_id = @approvalId
              ORDER BY ai.nomenclature
            `);
          items = itemsResult2.recordset || [];
        }
      } catch (itemError) {
        console.log('Could not load items for approval', approval.id, ':', itemError.message);
      }

      approvals.push({
        id: approval.id,
        request_id: approval.request_id,
        request_number: approval.request_number,
        request_type: approval.request_type || 'stock_issuance',
        scope_type: approval.scope_type || 'Individual',
        title: approval.title || 'Stock Issuance Request',
        description: approval.description || 'Request for inventory items',
        requested_date: approval.requested_date || approval.submitted_date,
        submitted_date: approval.submitted_date,
        requester_name: approval.requester_name || 'Unknown User',
        submitted_by_name: approval.requester_name || 'Unknown User',
        current_approver_name: approval.current_approver_name,
        current_status: approval.current_status || 'pending',
        is_admin_workflow: !!approval.is_admin_workflow,
        items: items,
        total_items: approval.total_items || 0,
        priority: 'Medium'
      });
    }

    console.log(`📋 Found ${approvals.length} ${status} approvals for user ${userId}`);
    res.json({
      success: true,
      data: approvals,
      total: approvals.length,
      message: `Found ${approvals.length} ${status} approvals`
    });

  } catch (error) {
    console.error('❌ Error fetching my approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals: ' + error.message
    });
  }
});

// ============================================================================
// POST /api/approvals/:approvalId/approve - Per-item approval decisions
// ============================================================================
router.post('/:approvalId/approve', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_allocations
    } = req.body;

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const pool = getPool();
    await ensureTables(pool);

    // Get approver info from DB
    let actualApproverName = approver_name || 'System';
    let actualApproverDesignation = approver_designation || 'Approver';
    let currentUserRoles = [];
    try {
      const userInfoResult = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query(`
          SELECT FullName
          FROM AspNetUsers 
          WHERE Id = @userId
        `);
      if (userInfoResult.recordset.length > 0) {
        actualApproverName = userInfoResult.recordset[0].FullName;
      }

      const userRoles = await getUserWorkflowRoles(pool, userId);
      currentUserRoles = Array.isArray(userRoles) ? userRoles : [];
      if (currentUserRoles.length > 0) {
        actualApproverDesignation = currentUserRoles.join(', ');
      }
    } catch (e) {
      console.log('⚠️ Could not get user info, using request body values');
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      const approvalRowResult = await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          SELECT request_id, COALESCE(is_admin_workflow, 0) as is_admin_workflow
          FROM request_approvals
          WHERE id = @approvalId
        `);

      requestId = approvalRowResult.recordset?.[0]?.request_id || null;
      const isAdminWorkflow = approvalRowResult.recordset?.[0]?.is_admin_workflow === 1 || approvalRowResult.recordset?.[0]?.is_admin_workflow === true;

      // Determine overall status
      const hasReturnActions = item_allocations?.some(a =>
        a.decision_type === 'RETURN' ||
        (a.decision_type === 'REJECT' && a.rejection_reason?.toLowerCase().includes('returned to requester'))
      );

      let overallStatus = 'pending';
      const hasForwardToAdmin = item_allocations?.some(a => a.decision_type === 'FORWARD_TO_ADMIN');
      const hasForwardToProcurement = item_allocations?.some(a => a.decision_type === 'FORWARD_TO_PROCUREMENT');
      const hasForwardToSupervisor = item_allocations?.some(a => a.decision_type === 'FORWARD_TO_SUPERVISOR');
      const hasForwardActions = hasForwardToAdmin || hasForwardToProcurement || hasForwardToSupervisor;
      let newApproverId = null;
      let isDynamicStepTransition = false;
      let dynamicTransitionLabel = '';

      if (hasReturnActions) {
        overallStatus = 'returned';
      } else if (hasForwardActions) {
        if (hasForwardToProcurement) {
          overallStatus = 'forwarded_to_procurement';
        } else {
          overallStatus = hasForwardToAdmin ? 'forwarded_to_admin' : 'forwarded_to_supervisor';
        }
      } else if (item_allocations?.every(a => a.decision_type === 'REJECT')) {
        overallStatus = 'rejected';
      } else if (item_allocations?.every(a =>
        a.decision_type === 'APPROVE_FROM_STOCK' ||
        a.decision_type === 'REJECT'
      )) {
        overallStatus = 'approved';
      }

      // Determine affected workflow lanes from item allocations so mixed-group requests
      // can advance only the touched group lanes.
      let touchedGroups = [];
      if (requestId && Array.isArray(item_allocations) && item_allocations.length > 0) {
        const allocationIds = item_allocations
          .map((item) => item?.requested_item_id)
          .filter(Boolean);

        if (allocationIds.length > 0) {
          const allocationIdCsv = allocationIds.join(',');
          const groupResult = await transaction.request()
            .input('allocationIdsCsv', sql.NVarChar(sql.MAX), allocationIdCsv)
            .query(`
              SELECT DISTINCT
                im.group_number,
                im.description,
                ai.nomenclature,
                ai.custom_item_name
              FROM approval_items ai
              LEFT JOIN item_masters im ON im.id = ai.item_master_id
              WHERE ai.id IN (
                SELECT TRY_CONVERT(uniqueidentifier, LTRIM(RTRIM(value)))
                FROM STRING_SPLIT(@allocationIdsCsv, ',')
              )
            `);

          touchedGroups = (groupResult.recordset || [])
            .map((row) => resolveItemMasterGroupNumber(row.group_number, row.description || row.nomenclature || row.custom_item_name))
            .filter((value) => Number.isInteger(value) && value > 0);
        }
      }

      // Dynamic workflow transition: an "approved" action may move to next configured step,
      // and only the final step becomes fully approved.
      if (overallStatus === 'approved' && !hasForwardActions && !hasReturnActions && requestId) {
        const transition = await advanceWorkflow(transaction, requestId, userId, {
          touchedGroups
        });
        if (transition?.ok) {
          if (transition.completed) {
            overallStatus = 'approved';
          } else {
            overallStatus = 'pending';
            newApproverId = transition.approverId;
            isDynamicStepTransition = true;
            dynamicTransitionLabel = `Pending Step ${transition.nextStepOrder} of ${transition.totalSteps}`;
          }
        } else {
          // Fallback routing when no dynamic workflow configuration is present
          if (isAdminWorkflow) {
            // Sequence fallback along the Admin workflow role chain: DD Admin -> AD Admin-I -> Storekeeper
            const actorRoles = await getUserWorkflowRoles(pool, userId);
            const actorRoleSet = new Set((actorRoles || []).map((role) => String(role || '').trim()));

            let preferredRoles = ['DD Admin', 'AD Admin-I', 'AD Admin-II', 'Storekeeper'];
            if (actorRoleSet.has('DD Admin')) {
              preferredRoles = ['AD Admin-I', 'AD Admin-II', 'Storekeeper'];
            } else if (actorRoleSet.has('AD Admin-I') || actorRoleSet.has('AD Admin-II')) {
              preferredRoles = ['Storekeeper'];
            } else if (actorRoleSet.has('Storekeeper')) {
              preferredRoles = [];
            }

            if (preferredRoles.length > 0) {
              const adminResult = await transaction.request()
                .input('r1', sql.NVarChar(100), preferredRoles[0] || null)
                .input('r2', sql.NVarChar(100), preferredRoles[1] || null)
                .input('r3', sql.NVarChar(100), preferredRoles[2] || null)
                .input('r4', sql.NVarChar(100), preferredRoles[3] || null)
                .input('actorUserId', sql.NVarChar(450), userId)
                .query(`
                  SELECT TOP 1 ur.user_id,
                    CASE
                      WHEN r.role_name = @r1 THEN 1
                      WHEN r.role_name = @r2 THEN 2
                      WHEN r.role_name = @r3 THEN 3
                      WHEN r.role_name = @r4 THEN 4
                      ELSE 99
                    END AS role_priority
                  FROM ims_user_roles ur
                  INNER JOIN ims_roles r ON r.id = ur.role_id
                  INNER JOIN AspNetUsers u ON u.Id = ur.user_id
                  WHERE ur.is_active = 1
                    AND r.is_active = 1
                    AND u.ISACT = 1
                    AND ur.user_id <> @actorUserId
                    AND r.role_name IN (@r1, @r2, @r3, @r4)
                  ORDER BY role_priority ASC, u.FullName ASC
                `);
              if (adminResult.recordset.length > 0) {
                overallStatus = 'pending';
                newApproverId = adminResult.recordset[0].user_id;
              }
            } else {
              // Final step (Storekeeper) approved it: complete the request!
              overallStatus = 'approved';
              newApproverId = null;
            }
          } else {
            // Legacy/standard wing supervisor personal request approval routing (routes directly to Storekeeper)
            const requestInfo = await transaction.request()
              .input('reqId', sql.UniqueIdentifier, requestId)
              .query(`SELECT request_type, requester_wing_id FROM stock_issuance_requests WHERE id = @reqId`);
            
            if (requestInfo.recordset.length > 0) {
              const reqType = String(requestInfo.recordset[0].request_type || '').toLowerCase();
              const wingId = requestInfo.recordset[0].requester_wing_id;
              
              if ((reqType === 'individual' || reqType === 'personal') && wingId) {
                const storekeeperRes = await transaction.request()
                  .input('wingId', sql.Int, wingId)
                  .query(`
                    SELECT TOP 1 u.Id
                    FROM AspNetUsers u
                    INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
                    INNER JOIN ims_roles r ON ur.role_id = r.id
                    WHERE u.intWingID = @wingId
                      AND u.ISACT = 1
                      AND ur.is_active = 1
                      AND r.role_name = 'Storekeeper'
                  `);
                
                if (storekeeperRes.recordset.length > 0) {
                  overallStatus = 'pending';
                  newApproverId = storekeeperRes.recordset[0].Id;
                }
              }
            }
          }
        }
      }

      // Forward actions for mixed-group requests should move touched lanes to their
      // next configured workflow approvers instead of assigning one static admin user.
      // Procurement forwarding skips lane advancement and targets procurement queue.
      if (hasForwardActions && !hasReturnActions && !hasForwardToProcurement && requestId) {
        const transition = await advanceWorkflow(transaction, requestId, userId, {
          touchedGroups
        });

        if (transition?.ok) {
          overallStatus = transition.completed ? 'approved' : 'pending';
          newApproverId = transition.approverId || null;
          isDynamicStepTransition = !transition.completed;

          if (!transition.completed) {
            if ((transition.laneCount || 0) > 1) {
              dynamicTransitionLabel = `Pending ${transition.pendingLanes || transition.laneCount} Group Lanes`;
            } else {
              dynamicTransitionLabel = `Pending Step ${transition.nextStepOrder} of ${transition.totalSteps}`;
            }
          }
        }
      }

      // Update approval record
      // If forwarding, find the target user to reassign current_approver_id
      if (hasForwardToAdmin && !newApproverId) {
        // Fallback path when lane transition cannot produce next approver:
        // keep the role chain aligned with workflow progression.
        const actorRoles = await getUserWorkflowRoles(pool, userId);
        const actorRoleSet = new Set((actorRoles || []).map((role) => String(role || '').trim()));

        let preferredRoles = ['DD Admin', 'AD Admin-I', 'AD Admin-II', 'Storekeeper'];
        if (actorRoleSet.has('DD Admin')) {
          preferredRoles = ['AD Admin-I', 'AD Admin-II', 'Storekeeper'];
        } else if (actorRoleSet.has('AD Admin-I') || actorRoleSet.has('AD Admin-II')) {
          preferredRoles = ['Storekeeper'];
        }

        const adminResult = await transaction.request()
          .input('r1', sql.NVarChar(100), preferredRoles[0] || null)
          .input('r2', sql.NVarChar(100), preferredRoles[1] || null)
          .input('r3', sql.NVarChar(100), preferredRoles[2] || null)
          .input('r4', sql.NVarChar(100), preferredRoles[3] || null)
          .input('actorUserId', sql.NVarChar(450), userId)
          .query(`
            SELECT TOP 1 ur.user_id,
              CASE
                WHEN r.role_name = @r1 THEN 1
                WHEN r.role_name = @r2 THEN 2
                WHEN r.role_name = @r3 THEN 3
                WHEN r.role_name = @r4 THEN 4
                ELSE 99
              END AS role_priority
            FROM ims_user_roles ur
            INNER JOIN ims_roles r ON r.id = ur.role_id
            INNER JOIN AspNetUsers u ON u.Id = ur.user_id
            WHERE ur.is_active = 1
              AND r.is_active = 1
              AND u.ISACT = 1
              AND ur.user_id <> @actorUserId
              AND r.role_name IN (@r1, @r2, @r3, @r4)
            ORDER BY role_priority ASC, u.FullName ASC
          `);
        if (adminResult.recordset.length > 0) {
          newApproverId = adminResult.recordset[0].user_id;
        }
      } else if (hasForwardToSupervisor && !newApproverId) {
        // Find a WING_SUPERVISOR user
        const supResult = await transaction.request()
          .query(`
            SELECT TOP 1 ur.user_id
            FROM ims_user_roles ur
            INNER JOIN ims_roles r ON r.id = ur.role_id
            WHERE r.role_name = 'WING_SUPERVISOR'
            AND ur.user_id != '${userId}'
            ORDER BY ur.user_id
          `);
        if (supResult.recordset.length > 0) {
          newApproverId = supResult.recordset[0].user_id;
        }
      }

      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .input('status', sql.NVarChar, overallStatus)
        .input('approver_name', sql.NVarChar, actualApproverName)
        .input('approver_designation', sql.NVarChar, actualApproverDesignation)
        .input('approval_comments', sql.NVarChar, approval_comments || '')
        .input('markAdminWorkflow', sql.Bit, hasForwardToAdmin ? 1 : 0)
        .input('newApproverId', sql.NVarChar, newApproverId)
        .query(`
          UPDATE request_approvals
          SET current_status = @status,
              updated_date = GETDATE(),
              approver_name = @approver_name,
              approver_designation = @approver_designation,
              approval_comments = @approval_comments,
              is_admin_workflow = CASE
                WHEN @markAdminWorkflow = 1 THEN 1
                ELSE COALESCE(is_admin_workflow, 0)
              END
              ${newApproverId ? ', current_approver_id = @newApproverId' : ''}
          WHERE id = @approvalId
        `);

      // Process each item allocation
      if (item_allocations && Array.isArray(item_allocations)) {
        for (const allocation of item_allocations) {
          await transaction.request()
            .input('itemId', sql.NVarChar, allocation.requested_item_id)
            .input('requested_quantity', sql.Int, allocation.requested_quantity || 0)
            .input('allocated_quantity', sql.Int, allocation.allocated_quantity || 0)
            .input('decision_type', sql.NVarChar, allocation.decision_type)
            .input('rejection_reason', sql.NVarChar, allocation.rejection_reason || '')
            .input('forwarding_reason', sql.NVarChar, allocation.forwarding_reason || '')
            .query(`
              UPDATE approval_items
              SET requested_quantity = CASE
                    WHEN @requested_quantity > 0 THEN @requested_quantity
                    ELSE requested_quantity
                  END,
                  allocated_quantity = @allocated_quantity,
                  decision_type = @decision_type,
                  rejection_reason = @rejection_reason,
                  forwarding_reason = @forwarding_reason,
                  updated_at = GETDATE()
              WHERE id = @itemId
            `);

          await transaction.request()
            .input('itemId', sql.NVarChar, allocation.requested_item_id)
            .input('requested_quantity', sql.Int, allocation.requested_quantity || 0)
            .input('allocated_quantity', sql.Int, allocation.allocated_quantity || 0)
            .input('decision_type', sql.NVarChar, allocation.decision_type)
            .query(`
              UPDATE stock_issuance_items
              SET requested_quantity = CASE
                    WHEN @requested_quantity > 0 THEN @requested_quantity
                    ELSE requested_quantity
                  END,
                  approved_quantity = CASE
                    WHEN @decision_type = 'APPROVE_FROM_STOCK' THEN @allocated_quantity
                    ELSE approved_quantity
                  END,
                  updated_at = GETDATE()
              WHERE id = TRY_CONVERT(uniqueidentifier, @itemId)
            `);
        }
      }

      if (hasForwardToAdmin) {
        await createBranchDemandForForwardedShortages(transaction, approvalId, userId);
      }

      if (hasForwardToProcurement) {
        await createProcurementRequestFromApproval(transaction, approvalId, userId);
      }

      // Add history entry
      const stepResult = await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
          FROM approval_history
          WHERE request_approval_id = @approvalId
        `);
      const nextStep = stepResult.recordset[0].next_step;

      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          UPDATE approval_history
          SET is_current_step = 0
          WHERE request_approval_id = @approvalId
        `);

      // Determine a meaningful comment for the history entry
      const historyActionType = hasForwardToAdmin
        ? 'forwarded_to_admin'
        : hasForwardToProcurement
          ? 'forwarded_to_procurement'
          : hasForwardToSupervisor
            ? 'forwarded_to_supervisor'
            : (isDynamicStepTransition || overallStatus === 'pending')
              ? 'approved_step'
              : (hasReturnActions ? 'returned' : overallStatus);
      let historyComment = approval_comments || '';
      if (!historyComment) {
        if (historyActionType === 'forwarded_to_admin') historyComment = 'Forwarded request to Admin for approval';
        else if (historyActionType === 'forwarded_to_procurement') historyComment = 'Forwarded request to Procurement for purchase';
        else if (historyActionType === 'forwarded_to_supervisor') historyComment = 'Forwarded request to Wing Supervisor';
        else if (historyActionType === 'approved_step') historyComment = dynamicTransitionLabel || 'Step approved and forwarded to next designation';
        else if (historyActionType === 'approved') historyComment = 'Request approved';
        else if (historyActionType === 'rejected') historyComment = 'Request rejected';
        else if (historyActionType === 'returned') historyComment = 'Request returned for revision';
        else historyComment = 'Decision submitted';
      }

      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .input('action_by', sql.NVarChar, userId)
        .input('comments', sql.NVarChar, historyComment)
        .input('step_number', sql.Int, nextStep)
        .input('action_type', sql.NVarChar, historyActionType)
        .input('forwarded_to', sql.NVarChar, newApproverId || null)
        .query(`
          INSERT INTO approval_history
          (request_approval_id, action_type, action_by, comments, step_number, is_current_step, forwarded_to)
          VALUES (@approvalId, @action_type, @action_by, @comments, @step_number, 1, @forwarded_to)
        `);

      // ====================================================================
      // STOCK DEDUCTION & ISSUANCE - When request is approved
      // ====================================================================
      if (overallStatus === 'approved' && item_allocations && Array.isArray(item_allocations)) {
        if (requestId) {
          for (const allocation of item_allocations) {
            if (allocation.decision_type === 'APPROVE_FROM_STOCK' && allocation.allocated_quantity > 0) {
              // Get item_master_id from approval_items
              const itemResult = await transaction.request()
                .input('aiId', sql.NVarChar, allocation.requested_item_id)
                .query(`SELECT item_master_id FROM approval_items WHERE id = @aiId`);
              
              const itemMasterId = itemResult.recordset[0]?.item_master_id;
              if (!itemMasterId) continue;

              // 1. Deduct from stock_admin
              await transaction.request()
                .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
                .input('qty', sql.Int, allocation.allocated_quantity)
                .query(`
                  UPDATE stock_admin 
                  SET available_quantity = available_quantity - @qty,
                      updated_at = GETDATE(),
                      updated_by = '${userId}'
                  WHERE item_master_id = @itemMasterId
                    AND available_quantity >= @qty
                `);

              // 2. Update stock_issuance_items
              await transaction.request()
                .input('requestId', sql.UniqueIdentifier, requestId)
                .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
                .input('approvedQty', sql.Int, allocation.allocated_quantity)
                .query(`
                  UPDATE stock_issuance_items 
                  SET approved_quantity = @approvedQty,
                      item_status = 'approved',
                      source_store_type = 'admin',
                      updated_at = GETDATE()
                  WHERE request_id = @requestId 
                    AND item_master_id = @itemMasterId
                `);

              // 3. Create stock_transaction for audit trail
              await transaction.request()
                .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
                .input('qty', sql.Decimal(18, 2), allocation.allocated_quantity)
                .input('refId', sql.UniqueIdentifier, requestId)
                .input('createdBy', sql.UniqueIdentifier, userId)
                .query(`
                  INSERT INTO stock_transactions 
                  (id, transaction_number, item_master_id, transaction_type, quantity, 
                   unit_price, total_value, reference_type, reference_id, reference_number,
                   transaction_date, created_by, status, created_at)
                  VALUES (
                    NEWID(),
                    'TXN-ISS-' + FORMAT(GETDATE(), 'yyyyMMdd-HHmmss'),
                    @itemMasterId,
                    'ISSUANCE',
                    @qty,
                    0, 0,
                    'stock_issuance_request',
                    @refId,
                    '${approvalId}',
                    GETDATE(),
                    @createdBy,
                    'completed',
                    GETDATE()
                  )
                `);
            }
          }

          // 4. Update stock_issuance_requests status
          await transaction.request()
            .input('requestId', sql.UniqueIdentifier, requestId)
            .input('approvedBy', sql.NVarChar, userId)
            .query(`
              UPDATE stock_issuance_requests 
              SET request_status = 'Approved',
                  approval_status = 'Approved by Admin',
                  approved_at = GETDATE(),
                  approved_by = @approvedBy,
                  issuance_source = 'admin_store',
                  updated_at = GETDATE()
              WHERE id = @requestId
            `);

          console.log('✅ Stock deducted from admin stock and issuance records updated for request:', requestId);
        }
      }

      // ====================================================================
      // SYNC stock_issuance_requests status for non-approval actions
      // (forwarding, rejection, return) so requester's My Requests page is accurate
      // ====================================================================
      if (overallStatus !== 'approved') {
        const syncRequestId = requestId;
        const isAdminChainActor = currentUserRoles.some((role) => ADMIN_CHAIN_ROLE_NAMES.includes(role));
        
        if (syncRequestId) {
          let sirStatus = 'Pending';
          let sirApprovalStatus = 'Pending Supervisor Review';

          if (overallStatus === 'pending' && !isDynamicStepTransition && newApproverId) {
            const approverRoleRes = await transaction.request()
              .input('approverId', sql.NVarChar, newApproverId)
              .query(`
                SELECT r.role_name AS Name
                FROM ims_user_roles ur
                INNER JOIN ims_roles r ON ur.role_id = r.id
                WHERE ur.user_id = @approverId
                  AND ur.is_active = 1
                  AND r.is_active = 1
              `);
            const roles = (approverRoleRes.recordset || []).map(r => r.Name);
            if (roles.includes('Storekeeper')) {
              sirApprovalStatus = 'Approved by Supervisor';
            } else {
              sirApprovalStatus = 'Pending Supervisor Review';
            }
          }
          
          if (isDynamicStepTransition) {
            sirStatus = 'Pending';
            if (hasForwardToAdmin) {
              sirApprovalStatus = 'Forwarded to Admin';
            } else if (hasForwardToSupervisor) {
              sirApprovalStatus = 'Pending Supervisor Review';
            } else {
              sirApprovalStatus = 'Pending Supervisor Review';
            }
          } else if (overallStatus === 'forwarded_to_admin') {
            sirStatus = 'Pending';
            sirApprovalStatus = 'Forwarded to Admin';
          } else if (overallStatus === 'forwarded_to_procurement') {
            sirStatus = 'Pending';
            sirApprovalStatus = 'Forwarded to Procurement';
          } else if (overallStatus === 'forwarded_to_supervisor') {
            sirStatus = 'Pending';
            sirApprovalStatus = 'Pending Supervisor Review';
          } else if (overallStatus === 'rejected') {
            sirStatus = 'Rejected';
            sirApprovalStatus = isAdminChainActor ? 'Rejected by Admin' : 'Rejected by Supervisor';
          } else if (overallStatus === 'returned') {
            sirStatus = 'Returned';
            sirApprovalStatus = 'Pending Supervisor Review';
          }

          await transaction.request()
            .input('syncRequestId', sql.UniqueIdentifier, syncRequestId)
            .input('sirStatus', sql.NVarChar, sirStatus)
            .input('sirApprovalStatus', sql.NVarChar, sirApprovalStatus)
            .query(`
              UPDATE stock_issuance_requests
              SET approval_status = @sirApprovalStatus,
                  updated_at = GETDATE()
              WHERE id = @syncRequestId
            `);
          
          console.log(`📋 Synced stock_issuance_requests approval_status to '${sirApprovalStatus}' for request:`, syncRequestId);
        }
      }

      await transaction.commit();

      res.json({
        success: true,
        message: hasReturnActions
          ? 'Request returned to requester for editing'
          : 'Per-item approval decisions processed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error processing per-item approval:', error);
    res.status(500).json({ error: 'Failed to process approval', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/:approvalId - Get approval details by ID
// MUST be placed AFTER all static routes to avoid catching /my-approvals etc.
// ============================================================================
router.get('/:approvalId', async (req, res, next) => {
  try {
    const { approvalId } = req.params;

    // Only handle GUID params — skip for named routes that somehow reach here
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!guidRegex.test(approvalId)) {
      return next();
    }

    const pool = getPool();
    await ensureTables(pool);

    const approvalResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT 
          ra.*,
          submitter.FullName as submitted_by_name,
          current_approver.FullName as current_approver_name,
          sir.request_type as scope_type,
          sir.request_number,
          sir.requester_user_id,
          requester.FullName as requester_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers current_approver ON ra.current_approver_id = current_approver.Id
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id
        LEFT JOIN AspNetUsers requester ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, requester.Id)
        WHERE ra.id = @approvalId
      `);

    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = approvalResult.recordset[0];

    // Legacy-safe signal for admin-page routing: some older rows may miss is_admin_workflow
    // but still have a forward-to-admin action in history.
    let hasForwardedToAdminHistory = false;
    try {
      const historyFlagResult = await pool.request()
        .input('approvalId', sql.UniqueIdentifier, approvalId)
        .query(`
          SELECT TOP 1 1 AS forwarded
          FROM approval_history
          WHERE request_approval_id = @approvalId
            AND action_type = 'forwarded_to_admin'
        `);
      hasForwardedToAdminHistory = historyFlagResult.recordset.length > 0;
    } catch (historyFlagError) {
      console.warn('Could not resolve forwarded_to_admin history flag:', historyFlagError.message);
    }

    // Get approval items
    let itemsResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT 
          ai.*,
          im.item_code,
          im.description as item_description
        FROM approval_items ai
        LEFT JOIN item_masters im ON ai.item_master_id = im.id
        WHERE ai.request_approval_id = @approvalId
        ORDER BY ai.created_at
      `);

    // Self-healing: if no approval_items exist, create them from stock_issuance_items
    if (itemsResult.recordset.length === 0 && approval.request_id) {
      console.log(`⚠️ Self-healing: No approval_items for approval ${approvalId}, creating from stock_issuance_items`);
      const stockItems = await pool.request()
        .input('requestId', sql.UniqueIdentifier, approval.request_id)
        .query(`SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity FROM stock_issuance_items WHERE request_id = @requestId`);

      for (const item of stockItems.recordset) {
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
          console.error(`❌ Self-healing failed for item ${item.nomenclature}:`, itemErr.message);
        }
      }

      // Re-query after self-healing
      if (stockItems.recordset.length > 0) {
        itemsResult = await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .query(`
            SELECT 
              ai.*,
              im.item_code,
              im.description as item_description
            FROM approval_items ai
            LEFT JOIN item_masters im ON ai.item_master_id = im.id
            WHERE ai.request_approval_id = @approvalId
            ORDER BY ai.created_at
          `);
      }
    }

    const approvalData = {
      ...approval,
      has_forwarded_to_admin_history: hasForwardedToAdminHistory,
      items: itemsResult.recordset,
      approval_items: itemsResult.recordset,
      request_items: itemsResult.recordset
    };

    res.json({ success: true, data: approvalData });
  } catch (error) {
    console.error('❌ Error fetching approval details:', error);
    res.status(500).json({ error: 'Failed to fetch approval details', details: error.message });
  }
});

console.log('✅ Approvals Routes Loaded');

module.exports = router;
