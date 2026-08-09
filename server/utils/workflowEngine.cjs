const { sql } = require('../db/connection.cjs');

let tablesEnsured = false;

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const parseGroupToken = (value) => {
  if (value === null || value === undefined) return null;

  const text = String(value).trim().toUpperCase();
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    const parsed = Number(text);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const romanToNumber = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6
  };

  return romanToNumber[text] || null;
};

const WORKFLOW_ROLE_NAMES = [
  'AD Admin-I',
  'AD Admin-II',
  'DD Admin',
  'DG Admin',
  'Branch Supervisor',
  'BRANCH_SUPERVISOR',
  'CUSTOM_BRANCH_SUPERVISOR',
  'Storekeeper',
  'Branch Storekeeper',
  'BRANCH_STORE_KEEPER',
  'Transport Supervisor'
];

const ADMIN_CHAIN_START_ROLES = ['DD Admin'];
const ADMIN_CHAIN_ROLE_NAMES = ['DD Admin', 'AD Admin-I', 'AD Admin-II', 'Storekeeper'];

const WORKFLOW_ROLE_FILTER_SQL = WORKFLOW_ROLE_NAMES
  .map((_, index) => `@role${index}`)
  .join(', ');

const parseGroupFromDescription = (description) => {
  const text = String(description || '');
  const groupMatch = text.match(/group\s*[-:]?\s*([ivx]+|\d{1,2})/i);
  if (groupMatch) {
    const parsed = parseGroupToken(groupMatch[1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  const digitMatch = text.match(/\b([1-9])\b/);
  if (digitMatch) return parseGroupToken(digitMatch[1]);

  return null;
};

const resolveItemMasterGroupNumber = (groupNumber, description) => {
  const parsedGroupNumber = parseGroupToken(groupNumber);
  if (parsedGroupNumber) return parsedGroupNumber;
  return parseGroupFromDescription(description);
};

const roleMatches = (userRole, ruleValue) => {
  const user = normalize(userRole);
  const rule = normalize(ruleValue);
  if (!user || !rule) return false;

  return user === rule;
};

const stepHasAnyRole = (step, roleNames) => {
  return (step?.rules || []).some((rule) => roleNames.some((roleName) => roleMatches(roleName, rule.designation_value)));
};

const getWorkflowRoles = async (pool) => {
  await ensureTables(pool);

  const request = pool.request();
  WORKFLOW_ROLE_NAMES.forEach((role, index) => {
    request.input(`role${index}`, sql.NVarChar(100), role);
  });

  const result = await request.query(`
    SELECT role_name
    FROM ims_roles
    WHERE is_active = 1
      AND role_name IN (${WORKFLOW_ROLE_FILTER_SQL})
    ORDER BY role_name ASC
  `);

  return (result.recordset || []).map((row) => row.role_name).filter(Boolean);
};

const getUserWorkflowRoles = async (pool, userId) => {
  await ensureTables(pool);

  const request = pool.request()
    .input('userId', sql.NVarChar(450), userId);

  WORKFLOW_ROLE_NAMES.forEach((role, index) => {
    request.input(`role${index}`, sql.NVarChar(100), role);
  });

  const result = await request
    .query(`
      SELECT DISTINCT wr.role_name
      FROM ims_user_roles ur
      INNER JOIN ims_roles wr ON wr.id = ur.role_id
      WHERE ur.user_id = @userId
        AND ur.is_active = 1
        AND wr.is_active = 1
        AND wr.role_name IN (${WORKFLOW_ROLE_FILTER_SQL})
      ORDER BY wr.role_name ASC
    `);

  return (result.recordset || []).map((row) => row.role_name).filter(Boolean);
};

const getUsersWithWorkflowRoles = async (pool) => {
  await ensureTables(pool);

  const request = pool.request();
  WORKFLOW_ROLE_NAMES.forEach((role, index) => {
    request.input(`role${index}`, sql.NVarChar(100), role);
  });

  const result = await request.query(`
    SELECT
      u.Id AS user_id,
      u.FullName,
      wr.role_name
    FROM ims_user_roles ur
    INNER JOIN ims_roles wr ON wr.id = ur.role_id
    INNER JOIN AspNetUsers u ON u.Id = ur.user_id
    WHERE ur.is_active = 1
      AND wr.is_active = 1
      AND u.Id IS NOT NULL
      AND wr.role_name IS NOT NULL
      AND LTRIM(RTRIM(wr.role_name)) <> ''
      AND wr.role_name IN (${WORKFLOW_ROLE_FILTER_SQL})
    ORDER BY u.Id, wr.role_name
  `);

  const grouped = new Map();
  for (const row of result.recordset || []) {
    const userId = String(row.user_id || '').trim();
    if (!userId) continue;

    if (!grouped.has(userId)) {
      grouped.set(userId, {
        user_id: userId,
        FullName: row.FullName,
        roles: []
      });
    }

    grouped.get(userId).roles.push(row.role_name);
  }

  return Array.from(grouped.values());
};

const ensureTables = async (pool) => {
  if (tablesEnsured) return;

  await pool.request().query(`
    IF OBJECT_ID('ims_dynamic_workflow_steps', 'U') IS NULL
    BEGIN
      CREATE TABLE ims_dynamic_workflow_steps (
        id INT IDENTITY(1,1) PRIMARY KEY,
        group_number INT NOT NULL,
        step_order INT NOT NULL,
        designation_value NVARCHAR(200) NOT NULL,
        match_mode NVARCHAR(20) NOT NULL DEFAULT 'prefix',
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
      );

      CREATE INDEX IX_ims_dynamic_workflow_steps_group_step
      ON ims_dynamic_workflow_steps(group_number, step_order, is_active);
    END

    IF OBJECT_ID('ims_request_workflow_state', 'U') IS NULL
    BEGIN
      CREATE TABLE ims_request_workflow_state (
        request_id UNIQUEIDENTIFIER NOT NULL,
        request_approval_id UNIQUEIDENTIFIER NULL,
        group_number INT NOT NULL,
        current_step_order INT NOT NULL,
        total_steps INT NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'pending',
        current_approver_id NVARCHAR(450) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ims_request_workflow_state PRIMARY KEY (request_id, group_number)
      );

      CREATE INDEX IX_ims_request_workflow_state_request_status
      ON ims_request_workflow_state(request_id, status);

      CREATE INDEX IX_ims_request_workflow_state_approver_pending
      ON ims_request_workflow_state(current_approver_id, status);
    END

    IF OBJECT_ID('ims_request_workflow_state', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('ims_request_workflow_state', 'current_approver_id') IS NULL
      BEGIN
        ALTER TABLE ims_request_workflow_state ADD current_approver_id NVARCHAR(450) NULL;
      END

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ims_request_workflow_state_request_status'
          AND object_id = OBJECT_ID('ims_request_workflow_state')
      )
      BEGIN
        CREATE INDEX IX_ims_request_workflow_state_request_status
        ON ims_request_workflow_state(request_id, status);
      END

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ims_request_workflow_state_approver_pending'
          AND object_id = OBJECT_ID('ims_request_workflow_state')
      )
      BEGIN
        CREATE INDEX IX_ims_request_workflow_state_approver_pending
        ON ims_request_workflow_state(current_approver_id, status);
      END

      DECLARE @existingPkName NVARCHAR(128) = (
        SELECT kc.name
        FROM sys.key_constraints kc
        WHERE kc.parent_object_id = OBJECT_ID('ims_request_workflow_state')
          AND kc.type = 'PK'
      );

      DECLARE @pkCols NVARCHAR(MAX) = (
        SELECT STUFF((
          SELECT ',' + c2.name
          FROM sys.key_constraints kc2
          INNER JOIN sys.index_columns ic2
            ON ic2.object_id = kc2.parent_object_id
           AND ic2.index_id = kc2.unique_index_id
          INNER JOIN sys.columns c2
            ON c2.object_id = kc2.parent_object_id
           AND c2.column_id = ic2.column_id
          WHERE kc2.parent_object_id = OBJECT_ID('ims_request_workflow_state')
            AND kc2.type = 'PK'
          ORDER BY ic2.key_ordinal
          FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 1, '')
      );

      IF @existingPkName IS NOT NULL AND ISNULL(@pkCols, '') = 'request_id'
      BEGIN
        IF EXISTS (
          SELECT request_id, group_number
          FROM ims_request_workflow_state
          GROUP BY request_id, group_number
          HAVING COUNT(*) > 1
        )
        BEGIN
          ;THROW 51000, 'Duplicate workflow state rows exist for same request/group. Fix data before PK migration.', 1;
        END

        DECLARE @dropPkSql NVARCHAR(MAX) = N'ALTER TABLE ims_request_workflow_state DROP CONSTRAINT ' + QUOTENAME(@existingPkName) + N';';
        EXEC sp_executesql @dropPkSql;

        ALTER TABLE ims_request_workflow_state
        ADD CONSTRAINT PK_ims_request_workflow_state PRIMARY KEY (request_id, group_number);
      END
    END

    IF OBJECT_ID('request_approvals', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('request_approvals', 'is_admin_workflow') IS NULL
      BEGIN
        ALTER TABLE request_approvals
        ADD is_admin_workflow BIT NOT NULL CONSTRAINT DF_request_approvals_is_admin_workflow DEFAULT(0);
      END

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_request_approvals_admin_workflow'
          AND object_id = OBJECT_ID('request_approvals')
      )
      BEGIN
        CREATE INDEX IX_request_approvals_admin_workflow
        ON request_approvals(is_admin_workflow, current_status, current_approver_id);
      END
    END

    IF OBJECT_ID('item_masters', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('item_masters', 'group_number') IS NULL
      BEGIN
        ALTER TABLE item_masters ADD group_number INT NULL;
      END

      EXEC sp_executesql N'
        ;WITH item_groups AS (
          SELECT
            id,
            UPPER(REPLACE(REPLACE(LTRIM(RTRIM(COALESCE(description, ''''))), '' '', ''''), '':'', ''-'')) AS normalized_description
          FROM item_masters
          WHERE group_number IS NULL
        )
        UPDATE im
        SET group_number = CASE
          WHEN ig.normalized_description LIKE ''GROUP-VI%'' OR ig.normalized_description LIKE ''GROUP6%'' OR ig.normalized_description LIKE ''GROUP-6%'' THEN 6
          WHEN ig.normalized_description LIKE ''GROUP-V%'' OR ig.normalized_description LIKE ''GROUP5%'' OR ig.normalized_description LIKE ''GROUP-5%'' THEN 5
          WHEN ig.normalized_description LIKE ''GROUP-IV%'' OR ig.normalized_description LIKE ''GROUP4%'' OR ig.normalized_description LIKE ''GROUP-4%'' THEN 4
          WHEN ig.normalized_description LIKE ''GROUP-III%'' OR ig.normalized_description LIKE ''GROUP3%'' OR ig.normalized_description LIKE ''GROUP-3%'' THEN 3
          WHEN ig.normalized_description LIKE ''GROUP-II%'' OR ig.normalized_description LIKE ''GROUP2%'' OR ig.normalized_description LIKE ''GROUP-2%'' THEN 2
          WHEN ig.normalized_description LIKE ''GROUP-I%'' OR ig.normalized_description LIKE ''GROUP1%'' OR ig.normalized_description LIKE ''GROUP-1%'' THEN 1
          ELSE NULL
        END
        FROM item_masters im
        INNER JOIN item_groups ig ON ig.id = im.id
        WHERE im.group_number IS NULL;
      ';
    END
  `);

  tablesEnsured = true;
};

const getWorkflowSteps = async (pool, groupNumber) => {
  await ensureTables(pool);

  const result = await pool.request()
    .input('groupNumber', sql.Int, groupNumber)
    .query(`
      SELECT id, group_number, step_order, designation_value, match_mode
      FROM ims_dynamic_workflow_steps
      WHERE group_number = @groupNumber
        AND is_active = 1
      ORDER BY step_order ASC, id ASC
    `);

  const rows = result.recordset || [];
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.step_order)) {
      grouped.set(row.step_order, []);
    }
    grouped.get(row.step_order).push({
      designation_value: row.designation_value,
      match_mode: row.match_mode || 'prefix'
    });
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([step_order, rules]) => ({ step_order, rules }));
};

const getGroupFromRequestItems = async (pool, requestId) => {
  const result = await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .query(`
      SELECT im.group_number, im.description
      FROM stock_issuance_items sii
      LEFT JOIN item_masters im ON im.id = sii.item_master_id
      WHERE sii.request_id = @requestId
    `);

  const groups = new Set();
  for (const row of result.recordset || []) {
    const group = resolveItemMasterGroupNumber(row.group_number, row.description);
    if (group) groups.add(group);
  }

  if (groups.size === 0) return { groupNumber: null, groups: [] };
  if (groups.size > 1) return { groupNumber: null, groups: Array.from(groups).sort((a, b) => a - b) };

  return { groupNumber: Array.from(groups)[0], groups: Array.from(groups) };
};

const pickApproverForStep = async (pool, stepRules, excludedUserIds = []) => {
  const users = await getUsersWithWorkflowRoles(pool);
  const excludedSet = new Set((excludedUserIds || []).filter(Boolean).map(String));

  const eligible = users.filter((user) => {
    if (excludedSet.has(String(user.user_id))) return false;
    return stepRules.some((rule) => (user.roles || []).some((role) => roleMatches(role, rule.designation_value)));
  });

  if (eligible.length === 0) return null;

  const selected = eligible[0];
  const matchedRule = stepRules.find((rule) => (selected.roles || []).some((role) => roleMatches(role, rule.designation_value)));

  return {
    ...selected,
    matchedRole: matchedRule?.designation_value || null
  };
};

const initializeWorkflowForRequest = async (pool, requestId, submittedBy, requestApprovalId = null, options = {}) => {
  await ensureTables(pool);

  const { groups } = await getGroupFromRequestItems(pool, requestId);
  if (!groups.length) {
    return {
      ok: false,
      code: 'group_missing',
      groups
    };
  }

  const sortedGroups = Array.from(new Set(groups)).sort((a, b) => a - b);
  const laneStates = [];

  for (const groupNumber of sortedGroups) {
    const steps = await getWorkflowSteps(pool, groupNumber);
    if (steps.length === 0) {
      return { ok: false, code: 'workflow_not_defined', groupNumber };
    }

    const firstStep = options.startAtAdminChain
      ? (steps.find((step) => stepHasAnyRole(step, ADMIN_CHAIN_START_ROLES))
        || steps.find((step) => stepHasAnyRole(step, ADMIN_CHAIN_ROLE_NAMES))
        || steps[0])
      : steps[0];
    const approver = await pickApproverForStep(pool, firstStep.rules, [submittedBy]);
    if (!approver) {
      return { ok: false, code: 'approver_not_found', groupNumber, stepOrder: firstStep.step_order };
    }

    await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('groupNumber', sql.Int, groupNumber)
      .input('requestApprovalId', sql.UniqueIdentifier, requestApprovalId)
      .input('currentStepOrder', sql.Int, firstStep.step_order)
      .input('totalSteps', sql.Int, steps.length)
      .input('currentApproverId', sql.NVarChar(450), approver.user_id)
      .query(`
        MERGE ims_request_workflow_state AS target
        USING (SELECT @requestId AS request_id, @groupNumber AS group_number) AS src
        ON target.request_id = src.request_id AND target.group_number = src.group_number
        WHEN MATCHED THEN
          UPDATE SET
            request_approval_id = @requestApprovalId,
            current_step_order = @currentStepOrder,
            total_steps = @totalSteps,
            current_approver_id = @currentApproverId,
            status = 'pending',
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (request_id, request_approval_id, group_number, current_step_order, total_steps, status, current_approver_id, created_at, updated_at)
          VALUES (@requestId, @requestApprovalId, @groupNumber, @currentStepOrder, @totalSteps, 'pending', @currentApproverId, GETDATE(), GETDATE());
      `);

    laneStates.push({
      groupNumber,
      currentStepOrder: firstStep.step_order,
      totalSteps: steps.length,
      approverId: approver.user_id,
      approverName: approver.FullName,
      approverRole: approver.matchedRole
    });
  }

  const primaryLane = laneStates[0] || null;

  return {
    ok: true,
    groups: sortedGroups,
    laneCount: laneStates.length,
    lanes: laneStates,
    groupNumber: primaryLane?.groupNumber || null,
    currentStepOrder: primaryLane?.currentStepOrder || null,
    totalSteps: primaryLane?.totalSteps || null,
    approverId: primaryLane?.approverId || null,
    approverName: primaryLane?.approverName || null,
    approverRole: primaryLane?.approverRole || null
  };
};

const bindRequestApprovalId = async (pool, requestId, requestApprovalId) => {
  await ensureTables(pool);

  await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .input('requestApprovalId', sql.UniqueIdentifier, requestApprovalId)
    .query(`
      UPDATE ims_request_workflow_state
      SET request_approval_id = @requestApprovalId,
          updated_at = GETDATE()
      WHERE request_id = @requestId
    `);
};

const resolveAdvanceGroups = async (pool, requestId, options = {}) => {
  const explicitGroup = Number(options.groupNumber || 0);
  if (explicitGroup > 0) return [explicitGroup];

  if (Array.isArray(options.touchedGroups) && options.touchedGroups.length > 0) {
    return Array.from(new Set(options.touchedGroups.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))).sort((a, b) => a - b);
  }

  const result = await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .query(`
      SELECT DISTINCT group_number
      FROM ims_request_workflow_state
      WHERE request_id = @requestId
    `);

  return (result.recordset || [])
    .map((row) => Number(row.group_number))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
};

const advanceLane = async (pool, requestId, groupNumber, actorId) => {
  const stateResult = await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .input('groupNumber', sql.Int, groupNumber)
    .query(`
      SELECT request_id, request_approval_id, group_number, current_step_order, total_steps, status
      FROM ims_request_workflow_state
      WHERE request_id = @requestId
        AND group_number = @groupNumber
    `);

  if (!stateResult.recordset?.length) {
    return { ok: false, code: 'workflow_state_missing', groupNumber };
  }

  const state = stateResult.recordset[0];
  if (String(state.status).toLowerCase() === 'completed') {
    return { ok: true, completed: true, alreadyCompleted: true, groupNumber };
  }

  const steps = await getWorkflowSteps(pool, state.group_number);
  if (steps.length === 0) {
    return { ok: false, code: 'workflow_not_defined', groupNumber: state.group_number };
  }

  const currentStep = steps.find((step) => step.step_order === state.current_step_order);
  const actorRoles = await getUserWorkflowRoles(pool, actorId);

  if (currentStep?.rules?.length) {
    const actorAllowed = currentStep.rules.some((rule) => actorRoles.some((role) => roleMatches(role, rule.designation_value)));
    if (!actorAllowed) {
      return {
        ok: false,
        code: 'actor_not_allowed_for_step',
        actorRoles,
        stepOrder: state.current_step_order,
        groupNumber: state.group_number
      };
    }
  }

  const nextStep = steps.find((step) => step.step_order > state.current_step_order);
  if (!nextStep) {
    await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('groupNumber', sql.Int, groupNumber)
      .query(`
        UPDATE ims_request_workflow_state
        SET status = 'completed',
            current_approver_id = NULL,
            updated_at = GETDATE()
        WHERE request_id = @requestId
          AND group_number = @groupNumber
      `);

    return { ok: true, completed: true, groupNumber };
  }

  const nextApprover = await pickApproverForStep(pool, nextStep.rules, [actorId]);
  if (!nextApprover) {
    return {
      ok: false,
      code: 'next_approver_not_found',
      nextStepOrder: nextStep.step_order,
      groupNumber
    };
  }

  await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .input('groupNumber', sql.Int, groupNumber)
    .input('nextStepOrder', sql.Int, nextStep.step_order)
    .input('nextApproverId', sql.NVarChar(450), nextApprover.user_id)
    .query(`
      UPDATE ims_request_workflow_state
      SET current_step_order = @nextStepOrder,
          current_approver_id = @nextApproverId,
          status = 'pending',
          updated_at = GETDATE()
      WHERE request_id = @requestId
        AND group_number = @groupNumber
    `);

  return {
    ok: true,
    completed: false,
    groupNumber,
    nextStepOrder: nextStep.step_order,
    totalSteps: steps.length,
    approverId: nextApprover.user_id,
    approverName: nextApprover.FullName,
    approverRole: nextApprover.matchedRole
  };
};

const advanceWorkflow = async (pool, requestId, actorId, options = {}) => {
  await ensureTables(pool);

  const groupsToAdvance = await resolveAdvanceGroups(pool, requestId, options);
  if (!groupsToAdvance.length) {
    return { ok: false, code: 'workflow_state_missing' };
  }

  const laneResults = [];
  for (const groupNumber of groupsToAdvance) {
    const laneTransition = await advanceLane(pool, requestId, groupNumber, actorId);
    laneResults.push(laneTransition);
  }

  const successful = laneResults.filter((lane) => lane.ok);
  const failed = laneResults.filter((lane) => !lane.ok);

  if (!successful.length) {
    return {
      ok: false,
      code: failed[0]?.code || 'lane_transition_failed',
      lanes: laneResults
    };
  }

  const stateSummaryResult = await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .query(`
      SELECT
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        COUNT(1) AS total_count
      FROM ims_request_workflow_state
      WHERE request_id = @requestId
    `);

  const summary = stateSummaryResult.recordset?.[0] || {};
  const completedCount = Number(summary.completed_count || 0);
  const pendingCount = Number(summary.pending_count || 0);
  const totalCount = Number(summary.total_count || 0);

  const nextLane = successful.find((lane) => !lane.completed && lane.approverId)
    || laneResults.find((lane) => !lane.completed && lane.approverId)
    || null;

  return {
    ok: true,
    completed: totalCount > 0 && completedCount === totalCount,
    laneCount: totalCount,
    completedLanes: completedCount,
    pendingLanes: pendingCount,
    lanes: laneResults,
    approverId: nextLane?.approverId || null,
    approverName: nextLane?.approverName || null,
    approverRole: nextLane?.approverRole || null,
    nextStepOrder: nextLane?.nextStepOrder || null,
    totalSteps: nextLane?.totalSteps || null
  };
};

module.exports = {
  ensureTables,
  getWorkflowSteps,
  getWorkflowRoles,
  getUserWorkflowRoles,
  WORKFLOW_ROLE_NAMES,
  resolveItemMasterGroupNumber,
  initializeWorkflowForRequest,
  bindRequestApprovalId,
  advanceWorkflow,
  parseGroupFromDescription,
  roleMatches
};
