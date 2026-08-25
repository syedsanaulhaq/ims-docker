// ============================================================================
// Branch Inventory Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

async function resolveBranchScope(session, pool) {
  const isSuperAdmin = session?.user?.is_super_admin === true;
  if (isSuperAdmin) {
    return { branchId: null, branchName: 'All Branches', isAdmin: true };
  }

  // Always prefer the branchId from the session variable (set by frontend/auth)
  // Fallback to AspNetUsers.intBranchID only if session branchId is not available
  const sessionBranch =
    session?.user?.branchId ??
    session?.user?.branch_id ??
    session?.user?.intBranchID ??
    null;

  if (sessionBranch) {
    const branchId = Number(sessionBranch) || null;
    return { branchId, branchName: branchId ? `Branch ${branchId}` : 'Your Branch', isAdmin: false };
  }

  // Fallback to database profile
  const userId = session.userId;
  const userRes = await pool.request()
    .input('userId', sql.NVarChar(450), userId)
    .query(`
      SELECT TOP 1 u.intBranchID
      FROM AspNetUsers u
      WHERE u.Id = @userId
    `);

  const branchId = userRes.recordset[0]?.intBranchID || null;
  const branchName = branchId ? `Branch ${branchId}` : 'Your Branch';
  return { branchId, branchName, isAdmin: false };
}

// ============================================================================
// GET /api/branch-inventory/requests
// ============================================================================
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { branchId, branchName, isAdmin } = await resolveBranchScope(req.session, pool);

    if (!isAdmin && !branchId) {
      return res.json({ success: true, branch_name: branchName, requests: [] });
    }

    const reqRequest = pool.request();
    let branchFilter = '';
    if (!isAdmin) {
      reqRequest.input('branchId', sql.Int, branchId);
      branchFilter = 'WHERE sir.requester_branch_id = @branchId AND sir.request_type = \'branch\'';
    } else {
      branchFilter = 'WHERE sir.request_type = \'branch\'';
    }

    const reqResult = await reqRequest.query(`
      SELECT
        sir.id,
        sir.request_number,
        sir.request_type,
        CASE 
          WHEN COALESCE(sir.purpose, '') = 'Branch Stock Request' AND sir.justification IS NOT NULL AND sir.justification <> '' 
          THEN sir.justification 
          ELSE COALESCE(sir.purpose, 'Stock Issuance Request') 
        END AS title,
        CASE 
          WHEN COALESCE(sir.purpose, '') = 'Branch Stock Request' AND sir.justification IS NOT NULL AND sir.justification <> '' 
          THEN 'Branch Stock Request' 
          ELSE COALESCE(sir.justification, sir.purpose, '') 
        END AS description,
        sir.created_at AS requested_date,
        sir.submitted_at AS submitted_date,
        u.FullName AS requester_name,
        CAST(COALESCE(sir.requester_branch_id, u.intBranchID) AS NVARCHAR(50)) AS requester_branch,
        COALESCE(sir.request_status, 'pending') AS current_status,
        COALESCE(sir.approval_status, sir.request_status, 'pending') AS final_status,
        COALESCE(sir.urgency_level, 'Medium') AS priority
      FROM stock_issuance_requests sir
      INNER JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
      ${branchFilter}
      ORDER BY sir.submitted_at DESC
    `);

    const requests = reqResult.recordset;
    if (requests.length === 0) {
      return res.json({ success: true, branch_name: branchName, requests: [] });
    }

    const requestIds = requests.map((r) => `'${r.id}'`).join(',');
    const itemsResult = await pool.request().query(`
      SELECT
        sii.id, sii.request_id,
        COALESCE(im.nomenclature, sii.nomenclature, 'Unknown Item') AS item_name,
        sii.requested_quantity, sii.approved_quantity,
        COALESCE(im.unit, 'units') AS unit
      FROM stock_issuance_items sii
      LEFT JOIN item_masters im ON sii.item_master_id = im.id
      WHERE sii.request_id IN (${requestIds})
    `);

    const itemsByRequest = {};
    itemsResult.recordset.forEach((item) => {
      if (!itemsByRequest[item.request_id]) itemsByRequest[item.request_id] = [];
      itemsByRequest[item.request_id].push(item);
    });

    const enriched = requests.map((r) => ({
      ...r,
      items: itemsByRequest[r.id] || [],
      total_items: (itemsByRequest[r.id] || []).length,
    }));

    res.json({ success: true, branch_name: branchName, requests: enriched });
  } catch (error) {
    console.error('Error fetching branch request history:', error);
    res.status(500).json({ error: 'Failed to fetch branch request history', details: error.message });
  }
});

// ============================================================================
// GET /api/branch-inventory/:branchId
// ============================================================================
router.get('/:branchId', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { branchId: scopedBranchId, isAdmin } = await resolveBranchScope(req.session, pool);

    const branchIdParam = req.params.branchId;
    if (branchIdParam && Number.isNaN(Number(branchIdParam))) {
      return res.status(400).json({ error: 'Invalid branchId parameter' });
    }

    const effectiveBranchId = isAdmin ? null : scopedBranchId;

    if (!isAdmin && !effectiveBranchId) {
      return res.json({
        items: [],
        summary: { total_items: 0, unique_users: 0, returnable_items: 0, not_returned: 0, overdue: 0 },
        userBreakdown: [],
      });
    }

    const invRequest = pool.request();
    let branchFilter = "AND sir.request_type = 'branch'";
    if (!isAdmin) {
      invRequest.input('branchId', sql.Int, effectiveBranchId);
      branchFilter = "AND sir.request_type = 'branch' AND sir.requester_branch_id = @branchId";
    }

    const result = await invRequest.query(`
      SELECT
        sii.id AS ledger_id,
        sir.id AS request_id,
        sir.request_number,
        COALESCE(im.nomenclature, sii.nomenclature, 'Unknown Item') AS nomenclature,
        c.category_name,
        COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), sii.requested_quantity, 0) AS issued_quantity,
        0 AS unit_price,
        0 AS total_value,
        COALESCE(sir.updated_at, sir.submitted_at, sir.created_at) AS issued_at,
        '' AS issued_by_name,
        u.FullName AS issued_to_name,
        u.Id AS issued_to_id,
        sir.purpose AS purpose,
        sir.request_type,
        COALESCE(sir.is_returnable, 0) AS is_returnable,
        sir.expected_return_date,
        NULL AS actual_return_date,
        CASE
          WHEN COALESCE(sir.is_returnable, 0) = 0 THEN 'Not Returnable'
          WHEN sir.expected_return_date IS NOT NULL AND sir.expected_return_date < GETDATE() THEN 'Overdue'
          ELSE 'Not Returned'
        END AS return_status,
        CASE
          WHEN COALESCE((SELECT SUM(sri.returned_quantity) FROM stock_return_items sri WHERE sri.original_issuance_item_id = sii.id), 0) >= COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), sii.requested_quantity, 1)
          THEN 'Returned'
          WHEN COALESCE(sir.is_returnable, 0) = 1
            AND sir.expected_return_date IS NOT NULL
            AND sir.expected_return_date < GETDATE()
          THEN 'Overdue'
          WHEN UPPER(COALESCE(sir.approval_status, '')) = 'RETURNED'
          THEN 'Returned'
          ELSE 'Not Returned'
        END AS current_return_status,
        COALESCE(sir.approval_status, sir.request_status, 'Issued') AS status,
        '' AS issuance_notes
      FROM stock_issuance_items sii
      INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
      LEFT JOIN item_masters im ON sii.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
      WHERE (
        UPPER(COALESCE(sir.request_status, '')) IN ('ISSUED', 'COMPLETED')
        OR UPPER(COALESCE(sir.approval_status, '')) IN ('ISSUED', 'COMPLETED')
      )
        ${branchFilter}
      ORDER BY COALESCE(sir.updated_at, sir.submitted_at, sir.created_at) DESC
    `);

    const items = result.recordset;
    const summary = {
      total_items: items.length,
      unique_users: new Set(items.map((i) => i.issued_to_id)).size,
      returnable_items: items.filter((i) => i.is_returnable).length,
      not_returned: items.filter((i) => i.is_returnable && i.current_return_status !== 'Returned').length,
      overdue: items.filter((i) => i.current_return_status === 'Overdue').length,
    };

    const userMap = new Map();
    items.forEach((item) => {
      const uid = item.issued_to_id;
      if (!userMap.has(uid)) {
        userMap.set(uid, { user_id: uid, user_name: item.issued_to_name, items_count: 0, overdue_count: 0 });
      }
      const summaryRow = userMap.get(uid);
      summaryRow.items_count += 1;
      if (item.current_return_status === 'Overdue') summaryRow.overdue_count += 1;
    });

    const userBreakdown = Array.from(userMap.values()).sort((a, b) => b.items_count - a.items_count);

    res.json({ items, summary, userBreakdown });
  } catch (error) {
    console.error('Error fetching branch inventory:', error);
    res.status(500).json({ error: 'Failed to fetch branch inventory', details: error.message });
  }
});

module.exports = router;
