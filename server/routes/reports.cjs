// ============================================================================
// Reports Routes
// ============================================================================
// Reporting and analytics endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/reports/purchases - Purchase report
// ============================================================================
router.get('/purchases', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { start_date, end_date, status, vendor_id } = req.query;

    let query = `
      SELECT 
        po.id,
        po.po_number,
        po.tender_id,
        po.vendor_id,
        po.po_date,
        po.total_amount,
        po.status,
        v.vendor_name,
        t.tender_title,
        COUNT(poi.id) as item_count,
        SUM(poi.total_price) as line_total
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN tenders t ON po.tender_id = t.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE 1=1
    `;

    let request = pool.request();

    if (start_date) {
      query += ` AND CAST(po.po_date AS DATE) >= @startDate`;
      request = request.input('startDate', sql.Date, new Date(start_date));
    }

    if (end_date) {
      query += ` AND CAST(po.po_date AS DATE) <= @endDate`;
      request = request.input('endDate', sql.Date, new Date(end_date));
    }

    if (status) {
      query += ` AND po.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (vendor_id) {
      query += ` AND po.vendor_id = @vendorId`;
      request = request.input('vendorId', sql.UniqueIdentifier, vendor_id);
    }

    query += ` GROUP BY po.id, po.po_number, po.tender_id, po.vendor_id, po.po_date, po.total_amount, po.status, v.vendor_name, t.tender_title
             ORDER BY po.po_date DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching purchase report:', error);
    res.status(500).json({ error: 'Failed to fetch purchase report' });
  }
});

// ============================================================================
// GET /api/reports/tenders - Tender report
// ============================================================================
router.get('/tenders', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { start_date, end_date, status, type } = req.query;

    let query = `
      SELECT 
        t.id,
        t.tender_number,
        t.tender_title,
        t.tender_type,
        t.tender_date,
        t.closing_date,
        t.status,
        COUNT(DISTINCT ti.id) as item_count,
        COUNT(DISTINCT tv.id) as bidder_count,
        COUNT(DISTINCT po.id) as po_count
      FROM tenders t
      LEFT JOIN tender_items ti ON t.id = ti.tender_id
      LEFT JOIN tender_vendors tv ON t.id = tv.tender_id
      LEFT JOIN purchase_orders po ON t.id = po.tender_id
      WHERE 1=1
    `;

    let request = pool.request();

    if (start_date) {
      query += ` AND CAST(t.tender_date AS DATE) >= @startDate`;
      request = request.input('startDate', sql.Date, new Date(start_date));
    }

    if (end_date) {
      query += ` AND CAST(t.tender_date AS DATE) <= @endDate`;
      request = request.input('endDate', sql.Date, new Date(end_date));
    }

    if (status) {
      query += ` AND t.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (type) {
      query += ` AND t.tender_type = @type`;
      request = request.input('type', sql.NVarChar(50), type);
    }

    query += ` GROUP BY t.id, t.tender_number, t.tender_title, t.tender_type, t.tender_date, t.closing_date, t.status
             ORDER BY t.tender_date DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching tender report:', error);
    res.status(500).json({ error: 'Failed to fetch tender report' });
  }
});

// ============================================================================
// GET /api/reports/inventory - Inventory status report
// ============================================================================
router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id, category_id, low_stock } = req.query;

    let query = `
      SELECT 
        im.id,
        im.nomenclature,
        im.unit,
        c.category_name,
        sw.wing_id,
        w.Name as wing_name,
        COALESCE(sw.available_quantity, 0) as available,
        COALESCE(sw.reserved_quantity, 0) as reserved,
        COALESCE(sw.damaged_quantity, 0) as damaged,
        COALESCE(sa.available_quantity, 0) as admin_available
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN stock_wing sw ON im.id = sw.item_master_id
      LEFT JOIN stock_admin sa ON im.id = sa.item_master_id
      LEFT JOIN WingsInformation w ON sw.wing_id = w.Id
      WHERE im.status = 'Active'
    `;

    let request = pool.request();

    if (wing_id) {
      query += ` AND sw.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (category_id) {
      query += ` AND im.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (low_stock === 'true') {
      query += ` AND (COALESCE(sw.available_quantity, 0) < 10 OR COALESCE(sa.available_quantity, 0) < 10)`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ error: 'Failed to fetch inventory report' });
  }
});

// ============================================================================
// GET /api/reports/approvals - Approvals report
// ============================================================================
router.get('/approvals', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { start_date, end_date, status, wing_id } = req.query;

    let query = `
      SELECT 
        sir.id,
        sir.requester_user_id,
        u.FullName as requester_name,
        w.Name as wing_name,
        sir.approval_status,
        sir.submitted_at,
        sir.supervisor_reviewed_at,
        sir.admin_reviewed_at,
        COUNT(sii.id) as item_count,
        SUM(CASE WHEN sii.item_status = 'Approved' THEN 1 ELSE 0 END) as approved_items
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
      LEFT JOIN stock_issuance_items sii ON sir.id = sii.request_id
      WHERE 1=1
    `;

    let request = pool.request();

    if (start_date) {
      query += ` AND CAST(sir.submitted_at AS DATE) >= @startDate`;
      request = request.input('startDate', sql.Date, new Date(start_date));
    }

    if (end_date) {
      query += ` AND CAST(sir.submitted_at AS DATE) <= @endDate`;
      request = request.input('endDate', sql.Date, new Date(end_date));
    }

    if (status) {
      query += ` AND sir.approval_status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (wing_id) {
      query += ` AND sir.requester_wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    query += ` GROUP BY sir.id, sir.requester_user_id, u.FullName, w.Name, sir.approval_status, sir.submitted_at, sir.supervisor_reviewed_at, sir.admin_reviewed_at
             ORDER BY sir.submitted_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching approvals report:', error);
    res.status(500).json({ error: 'Failed to fetch approvals report' });
  }
});

// ============================================================================
// GET /api/reports/dashboard - Dashboard summary
// ============================================================================
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    const poCount = await pool.request()
      .query(`SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Draft'`);

    const tenderCount = await pool.request()
      .query(`SELECT COUNT(*) as count FROM tenders WHERE status = 'Active'`);

    const approvalsCount = await pool.request()
      .query(`SELECT COUNT(*) as count FROM stock_issuance_requests WHERE approval_status = 'Pending'`);

    const lowStockCount = await pool.request()
      .query(`
        SELECT COUNT(*) as count FROM stock_wing 
        WHERE available_quantity < 10
      `);

    res.json({
      draft_pos: poCount.recordset[0].count,
      active_tenders: tenderCount.recordset[0].count,
      pending_approvals: approvalsCount.recordset[0].count,
      low_stock_items: lowStockCount.recordset[0].count
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});


module.exports = router;