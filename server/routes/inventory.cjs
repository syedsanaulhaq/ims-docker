// ============================================================================
// Inventory Management Routes
// ============================================================================
// Inventory verification workflows and inventory tracking

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const normalizeRole = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

const hasScopedRole = (roles = [], targets = []) => {
  const normalizedTargets = new Set(targets.map(normalizeRole));
  return roles.some((role) => normalizedTargets.has(normalizeRole(role?.role_name || role)));
};

const isSuperAdminSession = (session) => {
  if (session?.user?.is_super_admin === true) return true;
  const roles = session?.user?.ims_roles || [];
  return hasScopedRole(roles, ['IMS_SUPER_ADMIN', 'ADMINISTRATOR']);
};

const hasWingOrBranchScopedRole = (session) => {
  const roles = session?.user?.ims_roles || [];
  return hasScopedRole(roles, [
    'WING_SUPERVISOR',
    'WING_STORE_KEEPER',
    'CUSTOM_WING_STORE_KEEPER',
    'BRANCH_SUPERVISOR',
    'CUSTOM_BRANCH_SUPERVISOR',
    'BRANCH_STORE_KEEPER',
    'CUSTOM_BRANCH_STORE_KEEPER'
  ]);
};

const ADMIN_CHAIN_ROLE_NAMES = ['DD Admin', 'AD Admin-I', 'AD Admin-II', 'DG Admin', 'Storekeeper'];

const canAccessGlobalInventory = (session) => {
  if (isSuperAdminSession(session)) return true;
  if (hasWingOrBranchScopedRole(session)) return false;

  const roles = session?.user?.ims_roles || [];
  return hasScopedRole(roles, ['IMS_ADMIN', 'STOREKEEPER']) || hasScopedRole(roles, ADMIN_CHAIN_ROLE_NAMES);
};

const requireGlobalInventoryAccess = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!canAccessGlobalInventory(req.session)) {
    return res.status(403).json({
      error: 'Forbidden: this inventory view is restricted to central inventory roles'
    });
  }

  next();
};

// ============================================================================
// GET /api/inventory - Get all inventory items (root route for /api/inventory-stock alias)
// ============================================================================
router.get('/', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id, category_id, search, includeDeleted } = req.query;

    let query = `
      SELECT 
        im.id,
        im.nomenclature,
        im.description,
        im.unit,
        im.category_id,
        c.category_name,
        COALESCE(
          (SELECT SUM(sa.quantity_available) 
           FROM stock_acquisitions sa 
           WHERE sa.item_master_id = im.id 
             AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)), 0
        ) as quantity_in_stock,
        im.reorder_point,
        im.created_at,
        im.updated_at
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE (im.is_deleted = 0 OR im.is_deleted IS NULL)
    `;

    let request = pool.request();

    if (category_id) {
      query += ` AND im.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (search) {
      query += ` AND (im.nomenclature LIKE @search OR im.description LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch inventory', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/personal-inventory/:userId
// Personal inventory for a user (strictly scoped to self unless super admin)
// ============================================================================
router.get('/personal-inventory/:userId', requireAuth, async (req, res) => {
  try {
    console.log('PERSONAL_INVENTORY_V3 hit', { userId: req.params.userId, sessionUserId: req.session?.userId });
    const pool = getPool();
    const sessionUserId = req.session.userId;
    const requestedUserId = String(req.params.userId || '');
    const isSuperAdmin = isSuperAdminSession(req.session);

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!isSuperAdmin && requestedUserId !== sessionUserId) {
      return res.status(403).json({ error: 'Forbidden: personal inventory is only available for current user' });
    }

    const effectiveUserId = isSuperAdmin ? requestedUserId : sessionUserId;

    // Call sp_GetPersonalInventory to optimize heavy joins and unions
    let items = [];
    try {
      const result = await pool.request()
        .input('UserId', sql.NVarChar(450), effectiveUserId)
        .execute('sp_GetPersonalInventory');
      items = result.recordset || [];
    } catch (spError) {
      console.error('Error executing sp_GetPersonalInventory:', spError);
      throw spError;
    }

    const summary = {
      total_items: items.length,
      total_value: items.reduce((sum, item) => sum + Number(item.total_value || 0), 0),
      returnable_items: items.filter((item) => !!item.is_returnable).length,
      not_returned: items.filter((item) => !!item.is_returnable && item.current_return_status !== 'Returned').length,
      overdue: items.filter((item) => item.current_return_status === 'Overdue').length
    };

    res.json({ items, summary });
  } catch (error) {
    console.error('Error fetching personal inventory:', error);
    res.status(500).json({ error: 'Failed to fetch personal inventory', details: error.message });
  }
});

// ============================================================================
// GET /api/inventory/requestable-items
// Request form item catalog for authenticated users (uses stored procedure sp_GetRequestableInventoryItems)
// ============================================================================
router.get('/requestable-items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { search, category_id } = req.query;

    const result = await pool.request()
      .input('CategoryId', sql.UniqueIdentifier, category_id || null)
      .input('SearchTerm', sql.NVarChar, search ? `%${search}%` : null)
      .execute('sp_GetRequestableInventoryItems');

    res.json({
      success: true,
      inventory: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching requestable items via SP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requestable items',
      details: error.message
    });
  }
});

// ============================================================================
// GET /api/inventory/dashboard-stats - Get dashboard statistics (uses stored procedure sp_GetInventoryDashboardStats)
// ============================================================================
router.get('/dashboard-stats', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().execute('sp_GetInventoryDashboardStats');
    const stats = result.recordset[0] || {};

    res.json({
      success: true,
      total_items: stats.total_items || 0,
      items_with_stock: stats.items_with_stock || 0,
      total_quantity: stats.total_quantity || 0,
      total_value: stats.total_value || 0,
      low_stock_count: stats.low_stock_count || 0,
      pending_requests: stats.pending_requests || 0,
      total_categories: stats.total_categories || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard stats via SP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard statistics', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/dashboard - Alias for dashboard-stats
// ============================================================================
router.get('/dashboard', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().execute('sp_GetInventoryDashboardStats');
    const stats = result.recordset[0] || {};

    res.json({
      success: true,
      total_items: stats.total_items || 0,
      items_with_stock: stats.items_with_stock || 0,
      total_quantity: stats.total_quantity || 0,
      total_value: stats.total_value || 0,
      low_stock_count: stats.low_stock_count || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard via SP:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

// ============================================================================
// GET /api/inventory/verification - Get inventory verification list
// ============================================================================
router.get('/verification', async (req, res) => {
  try {
    const pool = getPool();
    const { status, wing_id, search } = req.query;

    let query = `
      SELECT 
        iv.id,
        iv.verification_code,
        iv.wing_id,
        iv.status,
        iv.start_date,
        iv.end_date,
        iv.total_items,
        iv.verified_items,
        iv.discrepancy_items,
        iv.created_by,
        iv.created_at,
        w.Name as wing_name,
        u.FullName as created_by_name
      FROM inventory_verifications iv
      LEFT JOIN WingsInformation w ON iv.wing_id = w.Id
      LEFT JOIN AspNetUsers u ON iv.created_by = u.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND iv.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (wing_id) {
      query += ` AND iv.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (search) {
      query += ` AND (iv.verification_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY iv.created_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching inventory verifications:', error);
    res.status(500).json({ error: 'Failed to fetch verifications', details: error.message });
  }
});

// ============================================================================
// GET /api/inventory/verification/:id - Get verification details
// ============================================================================
router.get('/verification/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          iv.*,
          w.Name as wing_name,
          u.FullName as created_by_name
        FROM inventory_verifications iv
        LEFT JOIN WingsInformation w ON iv.wing_id = w.Id
        LEFT JOIN AspNetUsers u ON iv.created_by = u.Id
        WHERE iv.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    const verification = result.recordset[0];

    // Get verification items
    const itemsResult = await pool.request()
      .input('verificationId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ivi.*,
          im.nomenclature,
          im.unit
        FROM inventory_verification_items ivi
        LEFT JOIN item_masters im ON ivi.item_master_id = im.id
        WHERE ivi.verification_id = @verificationId
      `);

    res.json({
      verification,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching verification details:', error);
    res.status(500).json({ error: 'Failed to fetch verification details' });
  }
});

// ============================================================================
// POST /api/inventory/verification - Create new inventory verification
// ============================================================================
router.post('/verification', requireAuth, async (req, res) => {
  try {
    const { wing_id, items } = req.body;
    const pool = getPool();

    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'wing_id and items are required' });
    }

    const verificationId = require('uuid').v4();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create verification record
      await transaction.request()
        .input('id', sql.UniqueIdentifier, verificationId)
        .input('wingId', sql.Int, wing_id)
        .input('totalItems', sql.Int, items.length)
        .input('createdBy', sql.NVarChar(450), req.session.userId)
        .query(`
          INSERT INTO inventory_verifications 
          (id, wing_id, status, total_items, verified_items, discrepancy_items, created_by, created_at)
          VALUES (@id, @wingId, 'In Progress', @totalItems, 0, 0, @createdBy, GETDATE())
        `);

      // Add verification items
      for (const item of items) {
        await transaction.request()
          .input('verificationId', sql.UniqueIdentifier, verificationId)
          .input('itemId', sql.UniqueIdentifier, item.item_id)
          .input('systemQty', sql.Int, item.system_quantity)
          .input('physicalQty', sql.Int, item.physical_quantity)
          .input('status', sql.NVarChar(20), 'Pending')
          .query(`
            INSERT INTO inventory_verification_items 
            (verification_id, item_master_id, system_quantity, physical_quantity, status)
            VALUES (@verificationId, @itemId, @systemQty, @physicalQty, @status)
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, verification_id: verificationId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: 'Failed to create verification' });
  }
});

// ============================================================================
// PUT /api/inventory/verification/:id - Update verification status
// ============================================================================
router.put('/verification/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;
    const pool = getPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update verification status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar(50), status)
        .query(`
          UPDATE inventory_verifications
          SET status = @status,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Update items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.id)
            .input('physicalQty', sql.Int, item.physical_quantity)
            .input('itemStatus', sql.NVarChar(20), item.status)
            .query(`
              UPDATE inventory_verification_items
              SET physical_quantity = @physicalQty,
                  status = @itemStatus
              WHERE id = @itemId
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Verification updated' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// ============================================================================
// GET /api/inventory/stock - Get current stock levels
// ============================================================================
router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id, item_id, low_stock } = req.query;

    let query = `
      SELECT 
        sw.id,
        sw.item_master_id,
        sw.wing_id,
        sw.available_quantity,
        sw.reserved_quantity,
        sw.damaged_quantity,
        im.nomenclature,
        im.unit,
        w.Name as wing_name
      FROM stock_wing sw
      JOIN item_masters im ON sw.item_master_id = im.id
      JOIN WingsInformation w ON sw.wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (wing_id) {
      query += ` AND sw.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (item_id) {
      query += ` AND sw.item_master_id = @itemId`;
      request = request.input('itemId', sql.UniqueIdentifier, item_id);
    }

    if (low_stock === 'true') {
      query += ` AND sw.available_quantity < 10`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
});

// ============================================================================
// GET /api/inventory/stock/admin - Get admin stock levels
// ============================================================================
router.get('/stock/admin', async (req, res) => {
  try {
    const pool = getPool();
    const { item_id, low_stock } = req.query;

    let query = `
      SELECT 
        sa.id,
        sa.item_master_id,
        sa.available_quantity,
        sa.reserved_quantity,
        sa.damaged_quantity,
        im.nomenclature,
        im.unit
      FROM stock_admin sa
      JOIN item_masters im ON sa.item_master_id = im.id
      WHERE 1=1
    `;

    let request = pool.request();

    if (item_id) {
      query += ` AND sa.item_master_id = @itemId`;
      request = request.input('itemId', sql.UniqueIdentifier, item_id);
    }

    if (low_stock === 'true') {
      query += ` AND sa.available_quantity < 10`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching admin stock:', error);
    res.status(500).json({ error: 'Failed to fetch admin stock' });
  }
});

// ============================================================================
// POST /api/inventory/request-verification - Forward item to store keeper
// ============================================================================
router.post('/request-verification', async (req, res) => {
  try {
    const { 
      stockIssuanceId,
      itemMasterId,
      itemNomenclature,
      requestedQuantity,
      requestedByUserId,
      requestedByName,
      wingId,
      wingName,
      forwardToStoreKeeperId
    } = req.body;


    if (!stockIssuanceId || !itemMasterId || !requestedByUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { stockIssuanceId, itemMasterId, requestedByUserId }
      });
    }

    const pool = getPool();

    // Find a store keeper for this wing
    let storeKeeperUserId = forwardToStoreKeeperId || null;
    let storeKeeperName = null;

    if (storeKeeperUserId) {
      const skResult = await pool.request()
        .input('userId', sql.NVarChar, storeKeeperUserId)
        .query(`SELECT FullName FROM AspNetUsers WHERE Id = @userId`);
      if (skResult.recordset.length > 0) {
        storeKeeperName = skResult.recordset[0].FullName;
      }
    } else if (wingId) {
      // Auto-forward to store keeper in this wing
      const skSearchResult = await pool.request()
        .input('wingId', sql.Int, wingId)
        .query(`
          SELECT TOP 1 u.Id, u.FullName
          FROM AspNetUsers u
          INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
          INNER JOIN ims_roles ir ON ur.role_id = ir.id
          WHERE u.intWingID = @wingId
            AND ir.is_active = 1
            AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
          ORDER BY u.FullName
        `);
      if (skSearchResult.recordset.length > 0) {
        storeKeeperUserId = skSearchResult.recordset[0].Id;
        storeKeeperName = skSearchResult.recordset[0].FullName;
      } else {
      }
    }

    // Get wing name if not provided
    let finalWingName = wingName || 'Unknown';
    if (wingId && !wingName) {
      const wingQuery = await pool.request()
        .input('wingId', sql.Int, wingId)
        .query(`
          SELECT TOP 1 'Wing ' + CAST(intWingID AS NVARCHAR(10)) AS wing_name
          FROM AspNetUsers WHERE intWingID = @wingId
        `);
      if (wingQuery.recordset.length > 0) {
        finalWingName = wingQuery.recordset[0].wing_name;
      }
    }

    const result = await pool.request()
      .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
      .input('itemMasterId', sql.NVarChar, itemMasterId)
      .input('itemNomenclature', sql.NVarChar, itemNomenclature || 'Unknown Item')
      .input('requestedByUserId', sql.NVarChar, requestedByUserId)
      .input('requestedByName', sql.NVarChar, requestedByName || 'System')
      .input('requestedQuantity', sql.Int, requestedQuantity || 0)
      .input('wingId', sql.Int, wingId || 0)
      .input('wingName', sql.NVarChar, finalWingName)
      .input('forwardedToUserId', sql.NVarChar, storeKeeperUserId || null)
      .input('forwardedToName', sql.NVarChar, storeKeeperName || null)
      .input('forwardedByUserId', sql.NVarChar, requestedByUserId)
      .input('forwardedByName', sql.NVarChar, requestedByName)
      .query(`
        INSERT INTO inventory_verification_requests 
        (stock_issuance_id, item_master_id, item_nomenclature, requested_by_user_id, requested_by_name, 
         requested_quantity, verification_status, wing_id, wing_name, created_at, updated_at,
         forwarded_to_user_id, forwarded_to_name, forwarded_by_user_id, forwarded_by_name, forwarded_at)
        OUTPUT INSERTED.id
        VALUES (@stockIssuanceId, @itemMasterId, @itemNomenclature, @requestedByUserId, @requestedByName,
                @requestedQuantity, 'pending', @wingId, @wingName, GETDATE(), GETDATE(),
                @forwardedToUserId, @forwardedToName, @forwardedByUserId, @forwardedByName, GETDATE())
      `);

    const verificationId = result.recordset[0]?.id;

    res.json({
      success: true,
      message: 'Verification request created successfully',
      verificationId: verificationId
    });
  } catch (error) {
    console.error('âŒ Error requesting verification:', error);
    res.status(500).json({ 
      error: 'Failed to request verification', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/my-forwarded-verifications - Get verifications forwarded to a store keeper
// ============================================================================
router.get('/my-forwarded-verifications', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pool = getPool();

    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ivr.requested_by_user_id,
          ivr.requested_by_name,
          ivr.requested_at,
          ivr.requested_quantity,
          ivr.verification_status,
          ivr.verified_by_user_id,
          ivr.verified_by_name,
          ivr.verified_at,
          ivr.physical_count,
          ivr.available_quantity,
          ivr.verification_notes,
          ivr.wing_id,
          ivr.item_nomenclature,
          ivr.forwarded_to_user_id,
          ivr.forwarded_to_name,
          ivr.forwarded_by_user_id,
          ivr.forwarded_by_name,
          ivr.forwarded_at,
          ivr.forward_notes,
          ivr.created_at,
          ivr.updated_at
        FROM inventory_verification_requests ivr
        WHERE ivr.forwarded_to_user_id = @userId
        ORDER BY ivr.forwarded_at DESC
      `);


    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('âŒ Error fetching forwarded verifications:', error);
    res.status(500).json({ error: 'Failed to fetch forwarded verifications', details: error.message });
  }
});

// ============================================================================
// POST /api/inventory/check-availability - Check inventory availability for an item
// ============================================================================
router.post('/check-availability', async (req, res) => {
  try {
    const { itemMasterId, wingId, branchId, requestedQuantity, inventoryScope } = req.body;

    if (!itemMasterId || !requestedQuantity) {
      return res.status(400).json({ error: 'Missing required fields: itemMasterId, requestedQuantity' });
    }

    const requestedScope = String(inventoryScope || '').trim().toLowerCase();
    const normalizedScope = requestedScope === 'wing' || requestedScope === 'branch' ? requestedScope : 'admin';
    const sessionWingId = Number(req.session?.user?.intWingID || req.session?.user?.wing_id || 0);
    const payloadWingId = Number(wingId || 0);
    const resolvedWingId = Number.isFinite(payloadWingId) && payloadWingId > 0
      ? payloadWingId
      : (Number.isFinite(sessionWingId) && sessionWingId > 0 ? sessionWingId : null);

    const sessionBranchId = Number(req.session?.user?.intBranchID || req.session?.user?.branch_id || 0);
    const payloadBranchId = Number(branchId || 0);
    const resolvedBranchId = Number.isFinite(payloadBranchId) && payloadBranchId > 0
      ? payloadBranchId
      : (Number.isFinite(sessionBranchId) && sessionBranchId > 0 ? sessionBranchId : null);

    const pool = getPool();

    const result = await pool.request()
      .input('ItemMasterId', sql.NVarChar, itemMasterId)
      .input('RequestedQuantity', sql.Int, requestedQuantity)
      .input('InventoryScope', sql.NVarChar(20), normalizedScope)
      .input('WingId', sql.Int, resolvedWingId)
      .input('BranchId', sql.Int, resolvedBranchId)
      .query(`
        SELECT
          CAST(im.id AS NVARCHAR(450)) as item_master_id,
          ISNULL(im.nomenclature, 'Unknown Item') as item_name,
          ISNULL(im.unit, 'PCS') as unit,
          @RequestedQuantity as requested_quantity,
          ISNULL(wing_stock.wing_qty, 0) as wing_available_quantity,
          ISNULL(branch_stock.branch_qty, 0) as branch_available_quantity,
          COALESCE(main_stock.main_qty, admin_stock.admin_qty, 0) as admin_available_quantity,
          CASE
            WHEN @InventoryScope = 'wing' THEN ISNULL(wing_stock.wing_qty, 0)
            WHEN @InventoryScope = 'branch' THEN ISNULL(branch_stock.branch_qty, 0)
            ELSE ISNULL(main_stock.main_qty, 0)
          END as available_quantity,
          CASE
            WHEN (
              CASE
                WHEN @InventoryScope = 'wing' THEN ISNULL(wing_stock.wing_qty, 0)
                WHEN @InventoryScope = 'branch' THEN ISNULL(branch_stock.branch_qty, 0)
                ELSE ISNULL(main_stock.main_qty, 0)
              END
            ) >= @RequestedQuantity THEN 1
            ELSE 0
          END as is_available,
          CASE
            WHEN (
              CASE
                WHEN @InventoryScope = 'wing' THEN ISNULL(wing_stock.wing_qty, 0)
                WHEN @InventoryScope = 'branch' THEN ISNULL(branch_stock.branch_qty, 0)
                ELSE ISNULL(main_stock.main_qty, 0)
              END
            ) >= @RequestedQuantity THEN 'Sufficient Stock'
            ELSE 'Insufficient Stock (' + CAST(
              CASE
                WHEN @InventoryScope = 'wing' THEN ISNULL(wing_stock.wing_qty, 0)
                WHEN @InventoryScope = 'branch' THEN ISNULL(branch_stock.branch_qty, 0)
                ELSE ISNULL(main_stock.main_qty, 0)
              END
            AS NVARCHAR(10)) + ' available)'
          END as availability_status
        FROM item_masters im
        LEFT JOIN (
          SELECT item_master_id, current_quantity as main_qty
          FROM current_inventory_stock
          WHERE item_master_id = TRY_CAST(@ItemMasterId AS UNIQUEIDENTIFIER)
        ) main_stock ON main_stock.item_master_id = im.id
        LEFT JOIN (
          SELECT item_master_id, available_quantity as admin_qty
          FROM stock_admin
          WHERE item_master_id = TRY_CAST(@ItemMasterId AS UNIQUEIDENTIFIER)
        ) admin_stock ON admin_stock.item_master_id = im.id
        LEFT JOIN (
          SELECT item_master_id, SUM(available_quantity) as wing_qty
          FROM stock_wing
          WHERE item_master_id = TRY_CAST(@ItemMasterId AS UNIQUEIDENTIFIER)
            AND (@WingId IS NULL OR wing_id = @WingId)
          GROUP BY item_master_id
        ) wing_stock ON wing_stock.item_master_id = im.id
        LEFT JOIN (
          SELECT 
            sii.item_master_id,
            SUM(
              COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), sii.requested_quantity, 0)
              - COALESCE(ret.returned_qty, 0)
            ) as branch_qty
          FROM stock_issuance_items sii
          INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
          LEFT JOIN (
            SELECT original_issuance_item_id, SUM(returned_quantity) as returned_qty
            FROM stock_return_items
            GROUP BY original_issuance_item_id
          ) ret ON ret.original_issuance_item_id = sii.id
          WHERE sir.requester_branch_id = @BranchId
            AND (
              UPPER(COALESCE(sir.request_status, '')) IN ('ISSUED', 'COMPLETED')
              OR UPPER(COALESCE(sir.approval_status, '')) IN ('ISSUED', 'COMPLETED')
            )
            AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
            AND (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
            AND sii.item_master_id = TRY_CAST(@ItemMasterId AS UNIQUEIDENTIFIER)
          GROUP BY sii.item_master_id
        ) branch_stock ON branch_stock.item_master_id = im.id
        WHERE im.id = TRY_CAST(@ItemMasterId AS UNIQUEIDENTIFIER)
      `);

    if (result.recordset.length === 0) {
      return res.json({
        success: true,
        data: {
          item_master_id: itemMasterId,
          item_name: 'Unknown Item',
          unit: 'PCS',
          requested_quantity: requestedQuantity,
          wing_available_quantity: 0,
          branch_available_quantity: 0,
          admin_available_quantity: 0,
          available_quantity: 0,
          is_available: false,
          availability_status: 'Item not found in inventory',
          inventory_scope: normalizedScope,
          wing_id: resolvedWingId,
          branch_id: resolvedBranchId
        }
      });
    }

    const row = result.recordset[0];

    res.json({
      success: true,
      data: {
        ...row,
        inventory_scope: normalizedScope,
        wing_id: resolvedWingId,
        branch_id: resolvedBranchId
      }
    });
  } catch (error) {
    console.error('❌ Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
});

// ============================================================================
// POST /api/inventory/update-verification - Update verification status
// ============================================================================
router.post('/update-verification', async (req, res) => {
  try {
    const {
      verificationId,
      verificationStatus,
      action,
      physicalCount,
      availableQuantity,
      verificationNotes,
      verifiedByUserId,
      verifiedByName,
      forwardToUserId,
      forwardToName
    } = req.body;

    if (!verificationId || !verificationStatus || !verifiedByUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    const actionType = action || 'verify';
    let finalStatus = verificationStatus;

    if (actionType === 'approve') finalStatus = 'approved';
    else if (actionType === 'reject') finalStatus = 'rejected';
    else if (actionType === 'forward') finalStatus = 'forwarded';

    const requestBuilder = pool.request()
      .input('verificationId', sql.Int, verificationId)
      .input('verificationStatus', sql.NVarChar, finalStatus)
      .input('physicalCount', sql.Int, physicalCount || 0)
      .input('availableQuantity', sql.Int, availableQuantity || 0)
      .input('verificationNotes', sql.NVarChar, verificationNotes || 'No notes')
      .input('verifiedByUserId', sql.NVarChar, verifiedByUserId)
      .input('verifiedByName', sql.NVarChar, verifiedByName)
      .input('forwardToUserId', sql.NVarChar, forwardToUserId || null)
      .input('forwardToName', sql.NVarChar, forwardToName || null);

    if (actionType === 'forward') {
      await requestBuilder.query(`
        UPDATE inventory_verification_requests
        SET verification_status = @verificationStatus,
            verification_notes = @verificationNotes,
            forwarded_to_user_id = @forwardToUserId,
            forwarded_to_name = @forwardToName,
            forward_notes = @verificationNotes,
            forwarded_by_user_id = @verifiedByUserId,
            forwarded_by_name = @verifiedByName,
            forwarded_at = GETDATE(),
            verified_by_user_id = NULL,
            verified_by_name = NULL,
            verified_at = NULL,
            updated_at = GETDATE()
        WHERE id = @verificationId
      `);
    } else {
      await requestBuilder.query(`
        UPDATE inventory_verification_requests
        SET verification_status = @verificationStatus,
            physical_count = @physicalCount,
            available_quantity = @availableQuantity,
            verification_notes = @verificationNotes,
            verified_by_user_id = @verifiedByUserId,
            verified_by_name = @verifiedByName,
            verified_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @verificationId
      `);
    }


    res.json({
      success: true,
      message: 'Verification updated successfully',
      verificationId: verificationId
    });
  } catch (error) {
    console.error('âŒ Error updating verification:', error);
    res.status(500).json({ error: 'Failed to update verification', details: error.message });
  }
});

// ============================================================================
// GET /api/inventory/stock/:itemMasterId - Get stock for a specific item
// ============================================================================
router.get('/stock/:itemMasterId', async (req, res) => {
  try {
    const { itemMasterId } = req.params;

    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(itemMasterId)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const pool = getPool();

    // Get stock from stock_admin (main inventory) and stock_wing
    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, itemMasterId)
      .query(`
        SELECT 
          im.id as item_master_id,
          im.nomenclature,
          im.item_code,
          im.unit,
          im.specifications,
          im.description,
          COALESCE(wing_total.total_wing_qty, 0) as wing_available_quantity,
          COALESCE(cis.current_quantity, admin_stock.admin_qty, 0) as admin_available_quantity,
          COALESCE(cis.current_quantity, admin_stock.admin_qty, 0) as available_quantity
        FROM item_masters im
        LEFT JOIN (
          SELECT item_master_id, SUM(available_quantity) as total_wing_qty
          FROM stock_wing
          WHERE item_master_id = @itemId
          GROUP BY item_master_id
        ) wing_total ON wing_total.item_master_id = im.id
        LEFT JOIN (
          SELECT item_master_id, available_quantity as admin_qty
          FROM stock_admin
          WHERE item_master_id = @itemId
        ) admin_stock ON admin_stock.item_master_id = im.id
        LEFT JOIN current_inventory_stock cis ON cis.item_master_id = im.id
        WHERE im.id = @itemId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found', available_quantity: 0 });
    }

    const item = result.recordset[0];
    res.json({
      item_master_id: item.item_master_id,
      nomenclature: item.nomenclature,
      item_code: item.item_code,
      unit: item.unit,
      description: item.description,
      available_quantity: item.available_quantity,
      quantity: item.available_quantity,
      wing_available_quantity: item.wing_available_quantity,
      admin_available_quantity: item.admin_available_quantity
    });
  } catch (error) {
    console.error('Error fetching item stock:', error);
    res.status(500).json({ error: 'Failed to fetch item stock' });
  }
});

// ============================================================================
// GET /api/inventory/current-stock - Get current inventory from deliveries
// ============================================================================
router.get('/current-stock', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const pool = getPool();
    const { search, category_id, low_stock } = req.query;

    let query = `
      SELECT 
        COALESCE(cis.id, im.id) as id,
        im.id as item_master_id,
        ISNULL(cis.current_quantity, 0) as current_quantity,
        cis.last_transaction_date,
        cis.last_transaction_type,
        cis.last_updated,
        im.nomenclature,
        im.item_code,
        im.unit,
        im.specifications,
        c.category_name,
        c.description as category_description
      FROM item_masters im
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE (im.is_deleted = 0 OR im.is_deleted IS NULL)
    `;

    let request = pool.request();

    if (search) {
      query += ` AND (im.nomenclature LIKE @search OR im.item_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (category_id) {
      query += ` AND im.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (low_stock === 'true') {
      query += ` AND (cis.current_quantity IS NULL OR cis.current_quantity < 10)`;
    }

    query += ` ORDER BY cis.last_transaction_date DESC, im.nomenclature`;

    const result = await request.query(query);
    
    res.json({
      success: true,
      inventory: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching current inventory stock:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch current inventory stock',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/current-stock/summary - Get inventory summary stats
// ============================================================================
router.get('/current-stock/summary', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM item_masters) as total_items,
        (SELECT ISNULL(SUM(current_quantity), 0) FROM current_inventory_stock) as total_quantity,
        (SELECT COUNT(DISTINCT id) FROM categories) as total_categories,
        (
          SELECT COUNT(*) 
          FROM item_masters im 
          LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id 
          WHERE (im.is_deleted = 0 OR im.is_deleted IS NULL) 
            AND (cis.current_quantity IS NULL OR cis.current_quantity < 10)
        ) as low_stock_items,
        (SELECT COUNT(*) FROM stock_acquisitions WHERE UPPER(ISNULL(status, '')) = 'COMPLETED') as total_acquisitions,
        (SELECT MAX(last_updated) FROM current_inventory_stock) as last_updated
    `);

    res.json({
      success: true,
      summary: result.recordset[0]
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch inventory summary' 
    });
  }
});

// ============================================================================
// GET /api/inventory/stock-breakdown - Get stock with OPB vs new acquisitions breakdown
// ============================================================================
router.get('/stock-breakdown', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const pool = getPool();
    const { search, category_id, low_stock, show_zero_stock } = req.query;

    let query = `
      WITH issued_requests AS (
        SELECT
          sii.item_master_id,
          SUM(
            ISNULL(
              TRY_CAST(NULLIF(LTRIM(RTRIM(CAST(sii.issued_quantity AS NVARCHAR(50)))), '') AS INT),
              ISNULL(TRY_CAST(NULLIF(LTRIM(RTRIM(CAST(sii.requested_quantity AS NVARCHAR(50)))), '') AS INT), 0)
            )
          ) AS total_issued_requests
        FROM stock_issuance_items sii
        INNER JOIN stock_issuance_requests sir
          ON sir.id = sii.request_id
        WHERE UPPER(ISNULL(sir.approval_status, '')) IN ('ISSUED', 'COMPLETED')
          AND (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
        GROUP BY sii.item_master_id
      ),
      sqb AS (
        SELECT
          im.id AS item_master_id,
          im.nomenclature,
          im.item_code,
          im.unit,
          im.specifications,
          c.id AS category_id,
          c.category_name,
          sc.id AS sub_category_id,
          sc.sub_category_name,
          ISNULL(SUM(CASE
            WHEN sa.acquisition_number LIKE 'OPB-%'
            THEN ISNULL(sa.quantity_received, 0) - ISNULL(sa.quantity_issued, 0)
            ELSE 0
          END), 0) AS opening_balance_quantity,
          CASE
            WHEN COUNT(sa.id) > 0 THEN ISNULL(SUM(CASE
              WHEN sa.acquisition_number NOT LIKE 'OPB-%' AND sa.acquisition_number IS NOT NULL
              THEN ISNULL(sa.quantity_received, 0) - ISNULL(sa.quantity_issued, 0)
              ELSE 0
            END), 0)
            ELSE CASE
              WHEN ISNULL(cis.current_quantity, 0) - ISNULL(ir.total_issued_requests, 0) > 0
              THEN ISNULL(cis.current_quantity, 0) - ISNULL(ir.total_issued_requests, 0)
              ELSE 0
            END
          END AS new_acquisition_quantity,
          CASE
            WHEN COUNT(sa.id) > 0 THEN CASE
              WHEN ISNULL(SUM(ISNULL(sa.quantity_received, 0)), 0) -
                   (CASE
                      WHEN ISNULL(SUM(ISNULL(sa.quantity_issued, 0)), 0) > ISNULL(ir.total_issued_requests, 0)
                      THEN ISNULL(SUM(ISNULL(sa.quantity_issued, 0)), 0)
                      ELSE ISNULL(ir.total_issued_requests, 0)
                    END) > 0
              THEN ISNULL(SUM(ISNULL(sa.quantity_received, 0)), 0) -
                   (CASE
                      WHEN ISNULL(SUM(ISNULL(sa.quantity_issued, 0)), 0) > ISNULL(ir.total_issued_requests, 0)
                      THEN ISNULL(SUM(ISNULL(sa.quantity_issued, 0)), 0)
                      ELSE ISNULL(ir.total_issued_requests, 0)
                    END)
              ELSE 0
            END
            ELSE CASE
              WHEN ISNULL(cis.current_quantity, 0) - ISNULL(ir.total_issued_requests, 0) > 0
              THEN ISNULL(cis.current_quantity, 0) - ISNULL(ir.total_issued_requests, 0)
              ELSE 0
            END
          END AS total_quantity,
          ISNULL(SUM(ISNULL(sa.quantity_received, 0)), 0) AS total_received,
          CASE
            WHEN ISNULL(SUM(ISNULL(sa.quantity_issued, 0)), 0) > ISNULL(ir.total_issued_requests, 0)
            THEN ISNULL(SUM(ISNULL(sa.quantity_issued, 0)), 0)
            ELSE ISNULL(ir.total_issued_requests, 0)
          END AS total_issued,
          CASE
            WHEN MAX(sa.updated_at) > cis.last_updated OR cis.last_updated IS NULL
            THEN MAX(sa.updated_at)
            ELSE cis.last_updated
          END AS last_transaction_date,
          COUNT(sa.id) AS acquisition_count,
          COUNT(CASE WHEN sa.acquisition_number LIKE 'OPB-%' THEN 1 END) AS opening_balance_count,
          COUNT(CASE WHEN sa.acquisition_number NOT LIKE 'OPB-%' AND sa.acquisition_number IS NOT NULL THEN 1 END) AS new_acquisition_count
        FROM item_masters im
        LEFT JOIN categories c ON im.category_id = c.id
        LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
        LEFT JOIN stock_acquisitions sa ON im.id = sa.item_master_id
        LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
        LEFT JOIN issued_requests ir ON ir.item_master_id = im.id
        GROUP BY
          im.id,
          im.nomenclature,
          im.item_code,
          im.unit,
          im.specifications,
          c.id,
          c.category_name,
          sc.id,
          sc.sub_category_name,
            ir.total_issued_requests,
          cis.current_quantity,
          cis.last_updated
      )
      SELECT
        sqb.item_master_id,
        sqb.nomenclature,
        sqb.item_code,
        sqb.unit,
        sqb.specifications,
        sqb.category_id,
        sqb.category_name,
        sqb.sub_category_id,
        sqb.sub_category_name,
        sqb.opening_balance_quantity,
        sqb.new_acquisition_quantity,
        sqb.total_quantity,
        sqb.total_received,
        sqb.total_issued,
        sqb.last_transaction_date,
        sqb.acquisition_count,
        sqb.opening_balance_count,
        sqb.new_acquisition_count
      FROM sqb
      WHERE 1=1
    `;

    let request = pool.request();

    if (search) {
      query += ` AND (sqb.nomenclature LIKE @search OR sqb.item_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (category_id) {
      query += ` AND sqb.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (low_stock === 'true') {
      query += ` AND sqb.total_quantity < 10 AND sqb.total_quantity > 0`;
    }

    // By default, hide items with zero stock unless requested
    if (show_zero_stock !== 'true') {
      query += ` AND sqb.total_quantity > 0`;
    }

    query += ` ORDER BY sqb.total_quantity ASC, sqb.nomenclature`;

    const result = await request.query(query);
    
    res.json({
      success: true,
      inventory: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching stock breakdown:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch stock breakdown',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/current-stock/:id/history - Get item transaction history
// ============================================================================
router.get('/current-stock/:id/history', requireGlobalInventoryAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          d.delivery_number,
          d.delivery_date,
          d.receiving_date,
          d.delivery_personnel,
          d.delivery_chalan,
          po.po_number,
          di.delivery_qty,
          di.quality_status,
          sa.acquisition_number,
          sa.acquisition_date
        FROM delivery_items di
        INNER JOIN deliveries d ON di.delivery_id = d.id
        INNER JOIN purchase_orders po ON d.po_id = po.id
        LEFT JOIN stock_acquisitions sa ON sa.delivery_id = d.id
        WHERE di.item_master_id = @itemId
          AND UPPER(ISNULL(d.delivery_status, '')) = 'COMPLETED'
          AND UPPER(ISNULL(di.quality_status, 'GOOD')) = 'GOOD'
        ORDER BY d.receiving_date DESC
      `);

    res.json({
      success: true,
      history: result.recordset
    });
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch item history' 
    });
  }
});


module.exports = router;