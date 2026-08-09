// ============================================================================
// Item Master Routes
// ============================================================================
// All item master management endpoints

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

// Configure multer for CSV file upload (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

let groupFieldEnsured = false;

const ensureItemGroupField = async (pool) => {
  if (groupFieldEnsured) return;

  await pool.request().query(`
    IF OBJECT_ID('item_masters', 'U') IS NOT NULL
      AND COL_LENGTH('item_masters', 'group_number') IS NULL
    BEGIN
      ALTER TABLE item_masters ADD group_number INT NULL;
    END
  `);

  groupFieldEnsured = true;
};

const normalizeGroupNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;

  const romanToNumber = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6
  };

  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : null;
  }

  if (romanToNumber[raw]) return romanToNumber[raw];

  const prefixed = raw.match(/^GROUP\s*[-:]?\s*([IVX]+|\d{1,2})$/i);
  if (!prefixed) return null;

  const token = String(prefixed[1]).toUpperCase();
  if (/^\d+$/.test(token)) {
    const parsed = Number(token);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : null;
  }

  return romanToNumber[token] || null;
};

router.use(async (req, res, next) => {
  try {
    const pool = getPool();
    await ensureItemGroupField(pool);
    next();
  } catch (error) {
    console.error('❌ Error ensuring item group_number field:', error);
    res.status(500).json({ error: 'Failed to initialize item group field' });
  }
});

// ============================================================================
// GET /api/items-master - Get all active items with optional category filtering
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const categoryId = req.query.category_id;
    const searchTerm = req.query.search;
    const includeDeleted = req.query.includeDeleted;


    let request = pool.request();
    let query = `
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature,
        im.group_number,
        im.unit,
        im.specifications,
        im.category_id,
        im.sub_category_id,
        c.category_name,
        c.description as category_description,
        im.status,
        im.created_at,
        im.is_deleted,
        im.deleted_at
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id AND c.is_deleted = 0
      WHERE im.status = 'Active'
    `;

    // Filter deleted records unless explicitly requested
    if (includeDeleted !== 'true') {
      query += ' AND im.is_deleted = 0';
    }

    if (categoryId) {
      query += ` AND (im.category_id = @categoryId OR CAST(im.category_id AS VARCHAR(MAX)) = @categoryId)`;
      request = request.input('categoryId', sql.VarChar, categoryId);
    }

    if (searchTerm) {
      query += ` AND (im.nomenclature LIKE @searchTerm OR im.item_code LIKE @searchTerm)`;
      request = request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    const items = result.recordset;


    res.json({
      success: true,
      items: items,
      count: items.length
    });
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({
      error: 'Failed to fetch items',
      details: error.message
    });
  }
});

// ============================================================================
// GET /api/items-master/:id - Get single item details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          im.id,
          im.item_code,
          im.nomenclature,
          im.group_number,
          im.unit,
          im.specifications,
          im.description,
          im.category_id,
          im.sub_category_id,
          c.category_name,
          im.status,
          im.created_at,
          im.updated_at
        FROM item_masters im
        LEFT JOIN categories c ON im.category_id = c.id AND c.is_deleted = 0
        WHERE im.id = @id AND im.is_deleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// ============================================================================
// POST /api/items-master/bulk-upload - Bulk upload items from CSV
// ============================================================================
// NOTE: This MUST be before the generic POST / route to match correctly
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    // Parse CSV file
    const fileContent = req.file.buffer.toString('utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });


    const pool = getPool();
    const results = {
      success: [],
      created: [],
      updated: [],
      errors: [],
      total: records.length
    };

    // Get all categories and subcategories for validation
    const categoriesResult = await pool.request().query('SELECT id, category_name FROM categories WHERE status = \'Active\'');
    const subCategoriesResult = await pool.request().query('SELECT id, sub_category_name, category_id FROM sub_categories WHERE status = \'Active\'');
    
    const categoryMap = new Map(categoriesResult.recordset.map(c => [c.category_name.toLowerCase(), c.id]));
    const subCategoryMap = new Map(subCategoriesResult.recordset.map(sc => [sc.sub_category_name.toLowerCase(), sc.id]));

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Validate required fields
        if (!row.nomenclature || !row.nomenclature.trim()) {
          results.errors.push({
            row: i + 2, // +2 for header and 1-indexed
            error: 'Missing required field: nomenclature',
            data: row
          });
          continue;
        }

        // Map category and subcategory names to IDs
        let category_id = null;
        let sub_category_id = null;

        if (row.category_name && row.category_name.trim()) {
          category_id = categoryMap.get(row.category_name.toLowerCase().trim());
          if (!category_id) {
            results.errors.push({
              row: i + 2,
              error: `Category not found: ${row.category_name}`,
              data: row
            });
            continue;
          }
        }

        if (row.sub_category_name && row.sub_category_name.trim()) {
          sub_category_id = subCategoryMap.get(row.sub_category_name.toLowerCase().trim());
          if (!sub_category_id) {
            results.errors.push({
              row: i + 2,
              error: `Sub-category not found: ${row.sub_category_name}`,
              data: row
            });
            continue;
          }
        }

        const trimmedItemCode = row.item_code?.trim() || null;
        const rawGroupValue = row.group_number ?? row.group ?? row.item_group ?? null;
        const hasGroupValue = rawGroupValue !== null && rawGroupValue !== undefined && String(rawGroupValue).trim() !== '';
        const parsedGroupNumber = normalizeGroupNumber(rawGroupValue);
        const now = new Date();
        let itemId = uuidv4();
        let action = 'created';

        // Upsert by item_code when provided.
        let existingItem = null;
        if (trimmedItemCode) {
          const existingItemResult = await pool.request()
            .input('item_code', sql.NVarChar, trimmedItemCode)
            .query(`
              SELECT id, is_deleted
              FROM item_masters
              WHERE item_code = @item_code
            `);

          existingItem = existingItemResult.recordset[0] || null;
        }

        if (existingItem) {
          itemId = existingItem.id;
          action = 'updated';

          // UPDATE in-place to preserve all FK relationships in child tables
          await pool.request()
            .input('id', sql.UniqueIdentifier, itemId)
            .input('item_code', sql.NVarChar, trimmedItemCode)
            .input('nomenclature', sql.NVarChar, row.nomenclature.trim())
            .input('manufacturer', sql.NVarChar, row.manufacturer?.trim() || null)
            .input('unit', sql.NVarChar, row.unit?.trim() || null)
            .input('specifications', sql.NVarChar, row.specifications?.trim() || null)
            .input('description', sql.NVarChar, row.description?.trim() || null)
            .input('group_number', sql.Int, parsedGroupNumber)
            .input('groupNumberProvided', sql.Bit, hasGroupValue ? 1 : 0)
            .input('category_id', sql.UniqueIdentifier, category_id)
            .input('sub_category_id', sql.UniqueIdentifier, sub_category_id)
            .input('status', sql.NVarChar, row.status?.trim() || 'Active')
            .input('minimum_stock_level', sql.Int, row.minimum_stock_level ? parseInt(row.minimum_stock_level) : null)
            .input('maximum_stock_level', sql.Int, row.maximum_stock_level ? parseInt(row.maximum_stock_level) : null)
            .input('reorder_point', sql.Int, row.reorder_level ? parseInt(row.reorder_level) : null)
            .input('updated_at', sql.DateTime, now)
            .query(`
              UPDATE item_masters
              SET item_code = @item_code,
                  nomenclature = @nomenclature,
                  manufacturer = @manufacturer,
                  unit = @unit,
                  specifications = @specifications,
                  description = @description,
                  group_number = CASE WHEN @groupNumberProvided = 1 THEN @group_number ELSE group_number END,
                  category_id = @category_id,
                  sub_category_id = @sub_category_id,
                  status = @status,
                  minimum_stock_level = @minimum_stock_level,
                  maximum_stock_level = @maximum_stock_level,
                  reorder_point = @reorder_point,
                  is_deleted = 0,
                  deleted_at = NULL,
                  deleted_by = NULL,
                  updated_at = @updated_at
              WHERE id = @id
            `);
        } else {

          await pool.request()
            .input('id', sql.UniqueIdentifier, itemId)
            .input('item_code', sql.NVarChar, trimmedItemCode)
            .input('nomenclature', sql.NVarChar, row.nomenclature.trim())
            .input('manufacturer', sql.NVarChar, row.manufacturer?.trim() || null)
            .input('unit', sql.NVarChar, row.unit?.trim() || null)
            .input('specifications', sql.NVarChar, row.specifications?.trim() || null)
            .input('description', sql.NVarChar, row.description?.trim() || null)
            .input('group_number', sql.Int, parsedGroupNumber)
            .input('category_id', sql.UniqueIdentifier, category_id)
            .input('sub_category_id', sql.UniqueIdentifier, sub_category_id)
            .input('status', sql.NVarChar, row.status?.trim() || 'Active')
            .input('minimum_stock_level', sql.Int, row.minimum_stock_level ? parseInt(row.minimum_stock_level) : null)
            .input('maximum_stock_level', sql.Int, row.maximum_stock_level ? parseInt(row.maximum_stock_level) : null)
            .input('reorder_point', sql.Int, row.reorder_level ? parseInt(row.reorder_level) : null)
            .input('created_at', sql.DateTime, now)
            .input('updated_at', sql.DateTime, now)
            .query(`
              INSERT INTO item_masters (
                id, item_code, nomenclature, manufacturer, unit, specifications, description, group_number,
                category_id, sub_category_id, status,
                minimum_stock_level, maximum_stock_level, reorder_point,
                created_at, updated_at
              )
              VALUES (
                @id, @item_code, @nomenclature, @manufacturer, @unit, @specifications, @description, @group_number,
                @category_id, @sub_category_id, @status,
                @minimum_stock_level, @maximum_stock_level, @reorder_point,
                @created_at, @updated_at
              )
            `);
        }

        const successEntry = {
          row: i + 2,
          action,
          item_code: row.item_code || 'N/A',
          nomenclature: row.nomenclature,
          itemId
        };

        results.success.push(successEntry);
        if (action === 'updated') {
          results.updated.push(successEntry);
        } else {
          results.created.push(successEntry);
        }

      } catch (error) {
        console.error(`❌ Error processing row ${i + 2}:`, error);
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: row
        });
      }
    }


    res.status(200).json({
      success: true,
      message: `Processed ${results.total} rows: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors`,
      results
    });

  } catch (error) {
    console.error('❌ Error in bulk upload:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV file',
      details: error.message 
    });
  }
});

// ============================================================================
// POST /api/items-master - Create new item
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      item_code,
      nomenclature,
      unit,
      specifications,
      group_number,
      category_id,
      sub_category_id,
      status
    } = req.body;

    if (!nomenclature) {
      return res.status(400).json({ error: 'Item nomenclature is required' });
    }

    const itemId = uuidv4();

    await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('item_code', sql.NVarChar, item_code || null)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('unit', sql.NVarChar, unit || null)
      .input('specifications', sql.NVarChar, specifications || null)
      .input('group_number', sql.Int, normalizeGroupNumber(group_number))
      .input('category_id', sql.UniqueIdentifier, category_id || null)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id || null)
      .input('status', sql.NVarChar, status || 'Active')
      .input('created_at', sql.DateTime, new Date())
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        INSERT INTO item_masters (id, item_code, nomenclature, unit, specifications, group_number, category_id, sub_category_id, status, created_at, updated_at)
        VALUES (@id, @item_code, @nomenclature, @unit, @specifications, @group_number, @category_id, @sub_category_id, @status, @created_at, @updated_at)
      `);

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      itemId
    });
  } catch (error) {
    console.error('❌ Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// ============================================================================
// PUT /api/items-master/:id - Update item
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_code,
      nomenclature,
      unit,
      specifications,
      group_number,
      category_id,
      sub_category_id,
      status
    } = req.body;

    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_code', sql.NVarChar, item_code || null)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('unit', sql.NVarChar, unit || null)
      .input('specifications', sql.NVarChar, specifications || null)
      .input('group_number', sql.Int, normalizeGroupNumber(group_number))
      .input('groupNumberProvided', sql.Bit, group_number !== undefined && group_number !== null && String(group_number).trim() !== '' ? 1 : 0)
      .input('category_id', sql.UniqueIdentifier, category_id || null)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id || null)
      .input('status', sql.NVarChar, status || 'Active')
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE item_masters
        SET item_code = @item_code,
            nomenclature = @nomenclature,
            unit = @unit,
            specifications = @specifications,
            group_number = CASE WHEN @groupNumberProvided = 1 THEN @group_number ELSE group_number END,
            category_id = @category_id,
            sub_category_id = @sub_category_id,
            status = @status,
            updated_at = @updated_at
        WHERE id = @id
      `);

    res.json({ message: '✅ Item updated successfully' });
  } catch (error) {
    console.error('❌ Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ============================================================================
// DELETE /api/items-master/:id - Delete item
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    // Check if item is used in any tender items or PO items
    const usageCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT COUNT(*) as count FROM tender_items WHERE item_master_id = @id AND is_deleted = 0
        UNION ALL
        SELECT COUNT(*) as count FROM purchase_order_items WHERE item_master_id = @id AND is_deleted = 0
      `);

    if (usageCheck.recordset.some(r => r.count > 0)) {
      return res.status(400).json({
        error: 'Cannot delete item - currently used in tenders or purchase orders'
      });
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE item_masters
        SET is_deleted = 1,
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        WHERE id = @id
      `);

    res.json({ message: '✅ Item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============================================================================
// POST /api/items-master/:id/restore - Restore deleted item
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE item_masters
        SET is_deleted = 0,
            deleted_at = NULL,
            deleted_by = NULL,
            status = 'Active'
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted item not found' });
    }

    res.json({ 
      success: true, 
      message: '✅ Item restored successfully',
      item: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error restoring item:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// ============================================================================
// POST /api/items-master/cleanup/remove-without-codes - Remove items without item_code
// ============================================================================
router.post('/cleanup/remove-without-codes', async (req, res) => {
  try {
    const pool = getPool();
    const deletedBy = req.user?.id || null;


    // Step 1: Find items without item_code
    const itemsResult = await pool.request().query(`
      SELECT id, nomenclature
      FROM item_masters
      WHERE (item_code IS NULL OR item_code = '' OR LTRIM(RTRIM(item_code)) = '')
        AND is_deleted = 0
    `);

    if (itemsResult.recordset.length === 0) {
      return res.json({
        success: true,
        message: 'No items without item_code found',
        removed: 0
      });
    }

    const itemIds = itemsResult.recordset.map(item => `'${item.id}'`).join(',');

    // Step 2: Check for dependencies
    const dependenciesResult = await pool.request().query(`
      SELECT 'purchase_order_items' as table_name, COUNT(*) as count
      FROM purchase_order_items
      WHERE item_id IN (${itemIds}) AND is_deleted = 0
      UNION ALL
      SELECT 'stock_acquisitions', COUNT(*)
      FROM stock_acquisitions
      WHERE item_id IN (${itemIds}) AND is_deleted = 0
      UNION ALL
      SELECT 'deliveries', COUNT(*)
      FROM deliveries
      WHERE item_id IN (${itemIds}) AND is_deleted = 0
      UNION ALL
      SELECT 'tender_items', COUNT(*)
      FROM tender_items
      WHERE item_id IN (${itemIds}) AND is_deleted = 0
    `);

    const hasDependencies = dependenciesResult.recordset.some(dep => dep.count > 0);
    if (hasDependencies) {
      const deps = dependenciesResult.recordset.filter(d => d.count > 0);
      return res.status(400).json({
        success: false,
        error: 'Cannot delete items with active dependencies',
        dependencies: deps
      });
    }

    // Step 3: Soft delete items without item_code
    const deleteResult = await pool.request()
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE item_masters
        SET is_deleted = 1, 
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        WHERE (item_code IS NULL OR item_code = '' OR LTRIM(RTRIM(item_code)) = '')
          AND is_deleted = 0
      `);


    res.json({
      success: true,
      message: `Successfully soft-deleted ${deleteResult.rowsAffected[0]} items without item_code`,
      removed: deleteResult.rowsAffected[0],
      items: itemsResult.recordset.map(item => ({
        id: item.id,
        nomenclature: item.nomenclature
      }))
    });
  } catch (error) {
    console.error('❌ Error cleaning up items without codes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup items',
      details: error.message
    });
  }
});


module.exports = router;