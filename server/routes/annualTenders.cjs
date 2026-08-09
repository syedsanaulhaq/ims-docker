const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const { v4: uuidv4 } = require('uuid');

// GET /api/annual-tenders - List all annual tenders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        id,
        tender_number,
        title,
        description,
        start_date,
        end_date,
        status,
        tender_type,
        total_budget,
        remarks,
        created_by,
        created_at,
        updated_at
      FROM annual_tenders
      WHERE 1=1
    `;

    if (status) {
      query += ` AND status = @status`;
    }
    query += ` ORDER BY created_at DESC`;

    const request = getPool().request();
    if (status) {
      request.input('status', sql.NVarChar(50), status);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching annual tenders:', error);
    res.status(500).json({ error: 'Failed to fetch annual tenders' });
  }
});

// GET /api/annual-tenders/:id - Get single tender with details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get tender
    const tenderResult = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM annual_tenders WHERE id = @id`);

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Annual tender not found' });
    }

    // Get groups
    const groupsResult = await getPool().request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          atg.id,
          atg.group_id,
          ig.group_code,
          ig.group_name
        FROM annual_tender_groups atg
        INNER JOIN item_groups ig ON atg.group_id = ig.id
        WHERE atg.annual_tender_id = @tenderId
      `);

    // Get vendors
    const vendorsResult = await getPool().request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT DISTINCT
          atv.id,
          atv.vendor_id,
          atv.group_id,
          ig.group_name,
          v.vendor_name,
          atv.status
        FROM annual_tender_vendors atv
        INNER JOIN item_groups ig ON atv.group_id = ig.id
        INNER JOIN vendors v ON atv.vendor_id = v.id
        WHERE atv.annual_tender_id = @tenderId
      `);

    res.json({
      ...tenderResult.recordset[0],
      groups: groupsResult.recordset,
      vendors: vendorsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching annual tender:', error);
    res.status(500).json({ error: 'Failed to fetch annual tender' });
  }
});

// POST /api/annual-tenders - Create tender
router.post('/', async (req, res) => {
  try {
    const { tender_number, title, description, start_date, end_date, total_budget, remarks, created_by, groupIds } = req.body;

    if (!tender_number || !title) {
      return res.status(400).json({ error: 'Tender number and title are required' });
    }

    const id = uuidv4();
    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Create tender
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('tender_number', sql.NVarChar(100), tender_number)
        .input('title', sql.NVarChar(255), title)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .input('start_date', sql.Date, start_date)
        .input('end_date', sql.Date, end_date)
        .input('status', sql.NVarChar(50), 'Active')
        .input('total_budget', sql.Decimal(15, 2), total_budget || null)
        .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
        .input('created_by', sql.NVarChar(450), created_by)
        .query(`
          INSERT INTO annual_tenders 
          (id, tender_number, title, description, start_date, end_date, status, total_budget, remarks, created_by, created_at, updated_at)
          VALUES (@id, @tender_number, @title, @description, @start_date, @end_date, @status, @total_budget, @remarks, @created_by, GETDATE(), GETDATE())
        `);

      // Assign groups if provided
      if (groupIds && Array.isArray(groupIds)) {
        for (const groupId of groupIds) {
          const groupAssignId = uuidv4();
          await transaction.request()
            .input('id', sql.UniqueIdentifier, groupAssignId)
            .input('tenderId', sql.UniqueIdentifier, id)
            .input('groupId', sql.UniqueIdentifier, groupId)
            .query(`
              INSERT INTO annual_tender_groups (id, annual_tender_id, group_id, created_at)
              VALUES (@id, @tenderId, @groupId, GETDATE())
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, id, message: 'Annual tender created successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating annual tender:', error);
    res.status(500).json({ error: 'Failed to create annual tender' });
  }
});

// POST /api/annual-tenders/:tenderId/assign-vendors - Assign vendors to tender groups
router.post('/:tenderId/assign-vendors', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { assignments, created_by } = req.body;
    const deletedBy = req.user?.id || null;

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments must be an array' });
    }

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Soft delete existing assignments
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE annual_tender_vendors
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE annual_tender_id = @tenderId
        `);

      // Add new assignments
      for (const assignment of assignments) {
        const { groupId, vendorIds } = assignment;
        for (const vendorId of vendorIds) {
          const id = uuidv4();
          await transaction.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('tenderId', sql.UniqueIdentifier, tenderId)
            .input('groupId', sql.UniqueIdentifier, groupId)
            .input('vendorId', sql.UniqueIdentifier, vendorId)
            .input('created_by', sql.NVarChar(450), created_by)
            .query(`
              INSERT INTO annual_tender_vendors 
              (id, annual_tender_id, group_id, vendor_id, assignment_date, status, created_by, created_at)
              VALUES (@id, @tenderId, @groupId, @vendorId, GETDATE(), 'Active', @created_by, GETDATE())
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Vendors assigned successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error assigning vendors:', error);
    res.status(500).json({ error: 'Failed to assign vendors' });
  }
});

// DELETE /api/annual-tenders/:id - Delete tender
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || null;

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Soft delete vendors
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE annual_tender_vendors
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE annual_tender_id = @tenderId
        `);

      // Soft delete groups
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE annual_tender_groups
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE annual_tender_id = @tenderId
        `);

      // Soft delete tender
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE annual_tenders
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Annual tender deleted' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting annual tender:', error);
    res.status(500).json({ error: 'Failed to delete annual tender' });
  }
});

// GET /api/item-groups - List item groups
router.get('/groups/list', async (req, res) => {
  try {
    const result = await getPool().request().query(`
      SELECT 
        ig.id, 
        ig.group_code, 
        ig.group_name, 
        ig.description, 
        COUNT(gi.id) as item_count
      FROM item_groups ig
      LEFT JOIN group_items gi ON ig.id = gi.group_id
      WHERE ig.is_active = 1
      GROUP BY ig.id, ig.group_code, ig.group_name, ig.description
      ORDER BY ig.group_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching item groups:', error);
    res.status(500).json({ error: 'Failed to fetch item groups' });
  }
});

// POST /api/item-groups - Create item group
router.post('/groups', async (req, res) => {
  try {
    const { group_code, group_name, description, itemIds, created_by } = req.body;

    if (!group_code || !group_name) {
      return res.status(400).json({ error: 'Group code and name are required' });
    }

    const id = uuidv4();
    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Create group
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('group_code', sql.NVarChar(50), group_code)
        .input('group_name', sql.NVarChar(255), group_name)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .input('created_by', sql.NVarChar(450), created_by)
        .query(`
          INSERT INTO item_groups (id, group_code, group_name, description, is_active, created_by, created_at, updated_at)
          VALUES (@id, @group_code, @group_name, @description, 1, @created_by, GETDATE(), GETDATE())
        `);

      // Add items if provided
      if (itemIds && Array.isArray(itemIds)) {
        for (const itemId of itemIds) {
          const groupItemId = uuidv4();
          await transaction.request()
            .input('id', sql.UniqueIdentifier, groupItemId)
            .input('groupId', sql.UniqueIdentifier, id)
            .input('itemId', sql.UniqueIdentifier, itemId)
            .query(`
              INSERT INTO group_items (id, group_id, item_master_id, created_at)
              VALUES (@id, @groupId, @itemId, GETDATE())
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, id, message: 'Item group created' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating item group:', error);
    res.status(500).json({ error: 'Failed to create item group' });
  }
});

// GET /api/item-groups/:groupId/items - Get items in group
router.get('/groups/:groupId/items', async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await getPool().request()
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT 
          gi.id,
          gi.item_master_id,
          im.nomenclature,
          im.item_code,
          im.unit
        FROM group_items gi
        INNER JOIN item_masters im ON gi.item_master_id = im.id
        WHERE gi.group_id = @groupId
        ORDER BY im.nomenclature
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching group items:', error);
    res.status(500).json({ error: 'Failed to fetch group items' });
  }
});

// DELETE /api/item-groups/:groupId - Delete item group
router.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const deletedBy = req.user?.id || null;

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Soft delete items
      await transaction.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE group_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE group_id = @groupId
        `);

      // Soft delete group
      await transaction.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE item_groups
          SET is_deleted = 1,
              is_active = 0,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @groupId
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Item group deleted' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting item group:', error);
    res.status(500).json({ error: 'Failed to delete item group' });
  }
});

// ============================================================================
// POST /api/annual-tenders/:id/restore - Restore deleted annual tender
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
          UPDATE annual_tenders
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted annual tender not found' });
      }

      // Restore annual tender vendors
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE annual_tender_vendors
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE tender_id = @tenderId AND is_deleted = 1
        `);

      // Restore annual tender groups
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE annual_tender_groups
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE tender_id = @tenderId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ success: true, message: '✅ Annual tender restored', tender: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring annual tender:', error);
    res.status(500).json({ error: 'Failed to restore annual tender' });
  }
});

module.exports = router;
