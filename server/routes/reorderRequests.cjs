const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

// GET /api/reorder-requests - List all reorder requests
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        rr.*,
        im.nomenclature as item_name,
        im.item_code
      FROM reorder_requests rr
      LEFT JOIN item_masters im ON rr.item_master_id = im.id
      WHERE 1=1
    `;

    const request = getPool().request();

    if (status && status !== 'all') {
      query += ` AND rr.status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    query += ` ORDER BY rr.created_at DESC
               OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    request.input('limit', sql.Int, parseInt(limit));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching reorder requests:', error);
    res.status(500).json({ error: 'Failed to fetch reorder requests' });
  }
});

// GET /api/reorder-requests/:id - Get reorder request details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          rr.*,
          im.nomenclature as item_name,
          im.item_code,
          im.unit
        FROM reorder_requests rr
        LEFT JOIN item_masters im ON rr.item_master_id = im.id
        WHERE rr.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching reorder request:', error);
    res.status(500).json({ error: 'Failed to fetch reorder request' });
  }
});

// POST /api/reorder-requests - Create reorder request
router.post('/', async (req, res) => {
  try {
    const { item_master_id, reorder_quantity, min_quantity, reorder_level, notes, requested_by } = req.body;

    if (!item_master_id || !reorder_quantity) {
      return res.status(400).json({ error: 'Item ID and reorder quantity are required' });
    }

    const id = require('uuid').v4();

    const result = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_master_id', sql.Int, item_master_id)
      .input('reorder_quantity', sql.Decimal(18, 2), reorder_quantity)
      .input('min_quantity', sql.Decimal(18, 2), min_quantity || null)
      .input('reorder_level', sql.Decimal(18, 2), reorder_level || null)
      .input('status', sql.NVarChar, 'Pending')
      .input('notes', sql.NVarChar, notes || null)
      .input('requested_by', sql.NVarChar, requested_by)
      .query(`
        INSERT INTO reorder_requests 
        (id, item_master_id, reorder_quantity, min_quantity, reorder_level, status, notes, requested_by, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@id, @item_master_id, @reorder_quantity, @min_quantity, @reorder_level, @status, @notes, @requested_by, GETDATE(), GETDATE())
      `);

    res.json({ success: true, data: result.recordset[0], message: 'Reorder request created' });
  } catch (error) {
    console.error('Error creating reorder request:', error);
    res.status(500).json({ error: 'Failed to create reorder request' });
  }
});

// PUT /api/reorder-requests/:id - Update reorder request
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reorder_quantity, min_quantity, reorder_level, status, notes } = req.body;

    const result = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .input('reorder_quantity', sql.Decimal(18, 2), reorder_quantity)
      .input('min_quantity', sql.Decimal(18, 2), min_quantity || null)
      .input('reorder_level', sql.Decimal(18, 2), reorder_level || null)
      .input('status', sql.NVarChar, status)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        UPDATE reorder_requests 
        SET reorder_quantity = @reorder_quantity,
            min_quantity = @min_quantity,
            reorder_level = @reorder_level,
            status = @status,
            notes = @notes,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Reorder request updated' });
  } catch (error) {
    console.error('Error updating reorder request:', error);
    res.status(500).json({ error: 'Failed to update reorder request' });
  }
});

// DELETE /api/reorder-requests/:id - Delete reorder request
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || null;

    await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE reorder_requests
        SET is_deleted = 1,
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Reorder request deleted' });
  } catch (error) {
    console.error('Error deleting reorder request:', error);
    res.status(500).json({ error: 'Failed to delete reorder request' });
  }
});

// ============================================================================
// POST /api/reorder-requests/:id/restore - Restore deleted reorder request
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE reorder_requests
        SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted reorder request not found' });
    }

    res.json({ success: true, message: '✅ Reorder request restored', request: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error restoring reorder request:', error);
    res.status(500).json({ error: 'Failed to restore reorder request' });
  }
});

module.exports = router;
