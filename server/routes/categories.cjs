// ============================================================================
// Categories Routes
// ============================================================================
// All category and sub-category management endpoints

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');

// ============================================================================
// GET /api/categories - Get all active categories with item count
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { includeDeleted } = req.query;

    let filter = "WHERE c.status = 'Active'";
    if (includeDeleted !== 'true') {
      filter += ' AND c.is_deleted = 0';
    }

    const result = await pool.request().query(`
      SELECT 
        c.id,
        c.category_name,
        c.description,
        c.status,
        c.item_type,
        c.created_at,
        c.updated_at,
        c.is_deleted,
        c.deleted_at,
        COUNT(DISTINCT CASE WHEN im.is_deleted = 0 THEN im.id END) as item_count
      FROM categories c
      LEFT JOIN item_masters im ON c.id = im.category_id
      ${filter}
      GROUP BY c.id, c.category_name, c.description, c.status, c.item_type, c.created_at, c.updated_at, c.is_deleted, c.deleted_at
      ORDER BY c.category_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      details: error.message
    });
  }
});

// ============================================================================
// GET /api/categories/:id - Get single category by ID
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          category_name,
          description,
          status,
          item_type,
          created_at,
          updated_at
        FROM categories 
        WHERE id = @id AND status != 'Deleted' AND is_deleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error fetching category:', error);
    res.status(500).json({
      error: 'Failed to fetch category',
      details: error.message
    });
  }
});

// ============================================================================
// GET /api/categories/:categoryId/items - Get items in a category
// ============================================================================
router.get('/:categoryId/items', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const pool = getPool();


    const result = await pool.request()
      .input('categoryId', sql.UniqueIdentifier, categoryId)
      .query(`
        SELECT 
          id,
          nomenclature,
          item_code,
          specifications
        FROM item_masters
        WHERE category_id = @categoryId
        AND status = 'Active'
        ORDER BY nomenclature
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching category items:', error);
    res.status(500).json({
      error: 'Failed to fetch category items',
      details: error.message
    });
  }
});

// ============================================================================
// POST /api/categories - Create new category
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const { category_name, description, item_type, status } = req.body;

    if (!category_name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const pool = getPool();
    const categoryId = uuidv4();
    const now = new Date();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, categoryId)
      .input('category_name', sql.NVarChar, category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status || 'Active')
      .input('item_type', sql.NVarChar, item_type || 'Dispensable')
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO categories (id, category_name, description, status, item_type, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@id, @category_name, @description, @status, @item_type, @created_at, @updated_at)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({
      error: 'Failed to create category',
      details: error.message
    });
  }
});

// ============================================================================
// PUT /api/categories/:id - Update category
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description, item_type, status } = req.body;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('category_name', sql.NVarChar, category_name)
      .input('description', sql.NVarChar, description || null)
      .input('item_type', sql.NVarChar, item_type || 'Dispensable')
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE categories
        SET category_name = @category_name,
            description = @description,
            item_type = @item_type,
            status = @status,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      message: 'Category updated successfully',
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error updating category:', error);
    res.status(500).json({
      error: 'Failed to update category',
      details: error.message
    });
  }
});

// ============================================================================
// DELETE /api/categories/:id - Delete category
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    // Check if category has sub-categories
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT COUNT(*) as count FROM sub_categories WHERE category_id = @id');

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with existing sub-categories',
        details: 'Please delete all sub-categories first'
      });
    }

    // Check if category has items
    const itemsCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT COUNT(*) as count FROM item_masters WHERE category_id = @id');

    if (itemsCheck.recordset[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with existing items',
        details: 'Please delete all items in this category first'
      });
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE categories
        SET is_deleted = 1,
            status = 'Deleted',
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    res.status(500).json({
      error: 'Failed to delete category',
      details: error.message
    });
  }
});

// ============================================================================
// SUB-CATEGORIES ENDPOINTS
// ============================================================================

// ============================================================================
// GET /api/sub-categories - Get all sub-categories
// ============================================================================
router.get('/list/all', async (req, res) => {
  try {
    const pool = getPool();
    const { includeDeleted } = req.query;

    let filter = '';
    if (includeDeleted !== 'true') {
      filter = 'WHERE sc.is_deleted = 0';
    }

    const result = await pool.request().query(`
      SELECT 
        sc.id,
        sc.sub_category_name,
        sc.category_id,
        sc.description,
        sc.status,
        sc.created_at,
        sc.updated_at,
        sc.is_deleted,
        sc.deleted_at,
        COUNT(DISTINCT CASE WHEN im.is_deleted = 0 THEN im.id END) as item_count
      FROM sub_categories sc
      LEFT JOIN item_masters im ON sc.id = im.sub_category_id
      ${filter}
      GROUP BY sc.id, sc.sub_category_name, sc.category_id, sc.description, sc.status, sc.created_at, sc.updated_at, sc.is_deleted, sc.deleted_at
      ORDER BY sc.sub_category_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching sub-categories:', error);
    res.status(500).json({
      error: 'Failed to fetch sub-categories',
      details: error.message
    });
  }
});

// ============================================================================
// GET /api/sub-categories/by-category/:categoryId - Get sub-categories by category
// ============================================================================
router.get('/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const pool = getPool();


    const result = await pool.request()
      .input('categoryId', sql.UniqueIdentifier, categoryId)
      .query(`
        SELECT 
          id,
          sub_category_name,
          category_id,
          description,
          status,
          created_at,
          updated_at
        FROM sub_categories 
        WHERE category_id = @categoryId AND is_deleted = 0
        ORDER BY sub_category_name
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching sub-categories by category:', error);
    res.status(500).json({
      error: 'Failed to fetch sub-categories',
      details: error.message
    });
  }
});

// ============================================================================
// POST /api/sub-categories - Create new sub-category
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const { category_id, sub_category_name, description, status } = req.body;

    if (!category_id || !sub_category_name) {
      return res.status(400).json({
        error: 'Category ID and sub-category name are required'
      });
    }

    const pool = getPool();

    const result = await pool.request()
      .input('category_id', sql.UniqueIdentifier, category_id)
      .input('sub_category_name', sql.NVarChar, sub_category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO sub_categories (category_id, sub_category_name, description, status, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@category_id, @sub_category_name, @description, @status, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      message: 'Sub-category created successfully',
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error creating sub-category:', error);
    res.status(500).json({
      error: 'Failed to create sub-category',
      details: error.message
    });
  }
});

// ============================================================================
// PUT /api/sub-categories/:id - Update sub-category
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, sub_category_name, description, status } = req.body;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('category_id', sql.UniqueIdentifier, category_id)
      .input('sub_category_name', sql.NVarChar, sub_category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE sub_categories
        SET category_id = @category_id,
            sub_category_name = @sub_category_name,
            description = @description,
            status = @status,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }

    res.json({
      message: 'Sub-category updated successfully',
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error updating sub-category:', error);
    res.status(500).json({
      error: 'Failed to update sub-category',
      details: error.message
    });
  }
});

// ============================================================================
// DELETE /api/sub-categories/:id - Delete sub-category
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE sub_categories
        SET is_deleted = 1,
            status = 'Deleted',
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }

    res.json({ message: 'Sub-category deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting sub-category:', error);
    res.status(500).json({
      error: 'Failed to delete sub-category',
      details: error.message
    });
  }
});

// ============================================================================
// POST /api/categories/:id/restore - Restore deleted category
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE categories
        SET is_deleted = 0,
            deleted_at = NULL,
            deleted_by = NULL,
            status = 'Active'
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted category not found' });
    }

    res.json({ 
      success: true, 
      message: '✅ Category restored successfully',
      category: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error restoring category:', error);
    res.status(500).json({ error: 'Failed to restore category' });
  }
});

// ============================================================================
// POST /api/sub-categories/:id/restore - Restore deleted sub-category
// ============================================================================
router.post('/sub/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE sub_categories
        SET is_deleted = 0,
            deleted_at = NULL,
            deleted_by = NULL,
            status = 'Active'
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted sub-category not found' });
    }

    res.json({ 
      success: true, 
      message: '✅ Sub-category restored successfully',
      subCategory: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error restoring sub-category:', error);
    res.status(500).json({ error: 'Failed to restore sub-category' });
  }
});


module.exports = router;