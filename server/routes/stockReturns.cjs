const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// Helpers: schema introspection
// ============================================================================
async function hasColumn(transaction, tableName, columnName) {
  const result = await transaction.request()
    .input('tableName', sql.NVarChar, tableName)
    .input('columnName', sql.NVarChar, columnName)
    .query(`
      SELECT COUNT(1) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName AND COLUMN_NAME = @columnName
    `);
  return (result.recordset[0]?.cnt || 0) > 0;
}

async function tableExists(transaction, tableName) {
  const result = await transaction.request()
    .input('tableName', sql.NVarChar, tableName)
    .query(`
      SELECT COUNT(1) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = @tableName
    `);
  return (result.recordset[0]?.cnt || 0) > 0;
}

async function generateReturnAcquisitionNumber(transaction) {
  const result = await transaction.request().query(`
    SELECT ISNULL(MAX(CAST(RIGHT(acquisition_number, 6) AS INT)), 0) AS max_num
    FROM stock_acquisitions
    WHERE acquisition_number LIKE 'RET-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%'
  `);
  const maxNum = result.recordset[0]?.max_num || 0;
  const year = new Date().getFullYear();
  const newNum = String(Number(maxNum) + 1).padStart(6, '0');
  return `RET-${year}-${newNum}`;
}

// ============================================================================
// GET /api/stock-returns - List all stock returns
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const pool = getPool();
    const hasSoftDelete = await hasColumn(pool, 'stock_returns', 'is_deleted');

    let query = `
      SELECT 
        sr.id,
        sr.return_date,
        sr.returned_by,
        sr.verified_by,
        sr.return_notes,
        sr.return_status,
        sr.created_at
      FROM stock_returns sr
      WHERE 1=1
    `;

    const request = pool.request();

    if (hasSoftDelete) {
      query += ` AND sr.is_deleted = 0`;
    }

    if (status && status !== 'all') {
      query += ` AND sr.return_status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    query += ` ORDER BY sr.return_date DESC, sr.id DESC
               OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    request.input('limit', sql.Int, parseInt(limit));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching stock returns:', error);
    res.status(500).json({ error: 'Failed to fetch stock returns' });
  }
});

// ============================================================================
// GET /api/stock-returns/:id - Get stock return details
// ============================================================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const pool = getPool();
    const hasSoftDelete = await hasColumn(pool, 'stock_returns', 'is_deleted');

    // Get return header
    const returnResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          sr.id,
          sr.return_date,
          sr.returned_by,
          sr.verified_by,
          sr.return_notes,
          sr.return_status,
          sr.created_at
        FROM stock_returns sr
        WHERE sr.id = @id
        ${hasSoftDelete ? 'AND sr.is_deleted = 0' : ''}
      `);

    if (returnResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    // Get return items
    const itemsResult = await pool.request()
      .input('return_id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          sri.id,
          sri.return_id,
          sri.issued_item_id,
          sri.nomenclature,
          sri.return_quantity,
          sri.condition_on_return,
          sri.damage_description,
          sri.created_at
        FROM stock_return_items sri
        WHERE sri.return_id = @return_id
        ORDER BY sri.id
      `);

    res.json({
      success: true,
      data: {
        ...returnResult.recordset[0],
        items: itemsResult.recordset
      }
    });
  } catch (error) {
    console.error('Error fetching stock return details:', error);
    res.status(500).json({ error: 'Failed to fetch stock return details' });
  }
});

// ============================================================================
// POST /api/stock-returns - Create stock return
// ============================================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      return_date,
      returned_by,
      verified_by,
      return_notes,
      return_status,
      return_items
    } = req.body;

    if (!return_items || !Array.isArray(return_items) || return_items.length === 0) {
      return res.status(400).json({ error: 'Return items are required' });
    }

    const finalReturnedBy = returned_by || req.session?.user?.FullName || req.session?.userId || '';
    if (!finalReturnedBy) {
      return res.status(400).json({ error: 'Returned by is required' });
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create stock return header
      const insertHeaderResult = await transaction.request()
        .input('return_date', sql.Date, return_date || new Date())
        .input('returned_by', sql.NVarChar(255), finalReturnedBy)
        .input('verified_by', sql.NVarChar(255), verified_by || null)
        .input('return_notes', sql.NVarChar(sql.MAX), return_notes || null)
        .input('return_status', sql.NVarChar(50), return_status || 'Completed')
        .query(`
          INSERT INTO stock_returns (return_date, returned_by, verified_by, return_notes, return_status, created_at)
          OUTPUT INSERTED.id
          VALUES (@return_date, @returned_by, @verified_by, @return_notes, @return_status, GETDATE())
        `);

      const returnId = insertHeaderResult.recordset[0].id;
      const isCompleted = (return_status || 'Completed').toString().toLowerCase() === 'completed';

      // Add return items
      for (const item of return_items) {
        if (!item.issued_item_id) {
          throw new Error('Each return item must have an issued_item_id');
        }
        if (!item.return_quantity || item.return_quantity <= 0) {
          throw new Error(`Invalid return quantity for item ${item.nomenclature || item.issued_item_id}`);
        }

        await transaction.request()
          .input('return_id', sql.Int, returnId)
          .input('issued_item_id', sql.NVarChar(255), item.issued_item_id)
          .input('nomenclature', sql.NVarChar(500), item.nomenclature || '')
          .input('return_quantity', sql.Int, item.return_quantity)
          .input('condition_on_return', sql.NVarChar(50), item.condition_on_return || 'Good')
          .input('damage_description', sql.NVarChar(sql.MAX), item.damage_description || null)
          .query(`
            INSERT INTO stock_return_items (return_id, issued_item_id, nomenclature, return_quantity, condition_on_return, damage_description, created_at)
            VALUES (@return_id, @issued_item_id, @nomenclature, @return_quantity, @condition_on_return, @damage_description, GETDATE())
          `);

        // If completed, update issuance tracking and add stock back to inventory
        if (isCompleted) {
          await processReturnInventory(transaction, item, req.session?.userId);
        }
      }

      await transaction.commit();
      res.json({ success: true, id: returnId, message: 'Stock return created successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating stock return:', error);
    res.status(500).json({ error: 'Failed to create stock return', details: error.message });
  }
});

// ============================================================================
// Helper: process inventory updates for a single returned item
// ============================================================================
async function processReturnInventory(transaction, item, processedByUserId) {
  const issuedItemId = item.issued_item_id;
  const returnQty = Number(item.return_quantity || 0);

  if (returnQty <= 0) return;

  // Get the original issuance item details
  const issuanceResult = await transaction.request()
    .input('issuedItemId', sql.UniqueIdentifier, issuedItemId)
    .query(`
      SELECT TOP 1 id, item_master_id, issued_quantity, approved_quantity, requested_quantity, unit_price
      FROM stock_issuance_items
      WHERE id = @issuedItemId
    `);

  if (issuanceResult.recordset.length === 0) {
    console.warn(`⚠️ Issued item ${issuedItemId} not found; skipping inventory update`);
    return;
  }

  const issuedItem = issuanceResult.recordset[0];
  const itemMasterId = issuedItem.item_master_id;
  const issuedQty = Number(issuedItem.issued_quantity || issuedItem.approved_quantity || issuedItem.requested_quantity || 0);
  const unitCost = Number(issuedItem.unit_price || 0);

  if (!itemMasterId) {
    console.warn(`⚠️ Issued item ${issuedItemId} has no item_master_id; skipping inventory update`);
    return;
  }

  // Update returned_quantity on stock_issuance_items if column exists
  const hasReturnedQty = await hasColumn(transaction, 'stock_issuance_items', 'returned_quantity');
  if (hasReturnedQty) {
    await transaction.request()
      .input('issuedItemId', sql.UniqueIdentifier, issuedItemId)
      .input('returnQty', sql.Int, returnQty)
      .query(`
        UPDATE stock_issuance_items
        SET returned_quantity = ISNULL(returned_quantity, 0) + @returnQty,
            updated_at = GETDATE()
        WHERE id = @issuedItemId
      `);
  }

  // Update current_inventory_stock if table exists
  const hasCurrentInventory = await tableExists(transaction, 'current_inventory_stock');
  if (hasCurrentInventory) {
    const hasItem = await transaction.request()
      .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
      .query(`
        SELECT COUNT(1) AS cnt FROM current_inventory_stock WHERE item_master_id = @itemMasterId
      `);

    if (hasItem.recordset[0]?.cnt > 0) {
      await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
        .input('returnQty', sql.Decimal(15, 2), returnQty)
        .query(`
          UPDATE current_inventory_stock
          SET current_quantity = ISNULL(current_quantity, 0) + @returnQty,
              last_transaction_type = 'RETURN',
              last_transaction_date = GETDATE(),
              last_updated = GETDATE()
          WHERE item_master_id = @itemMasterId
        `);
    } else {
      await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
        .input('returnQty', sql.Decimal(15, 2), returnQty)
        .query(`
          INSERT INTO current_inventory_stock (item_master_id, current_quantity, last_transaction_type, last_transaction_date, last_updated)
          VALUES (@itemMasterId, @returnQty, 'RETURN', GETDATE(), GETDATE())
        `);
    }
  }

  // Add a stock_acquisitions record for audit trail
  const hasAcquisitions = await tableExists(transaction, 'stock_acquisitions');
  if (hasAcquisitions) {
    const acqNumber = await generateReturnAcquisitionNumber(transaction);
    const hasQtyReceived = await hasColumn(transaction, 'stock_acquisitions', 'quantity_received');

    if (hasQtyReceived) {
      await transaction.request()
        .input('acqId', sql.UniqueIdentifier, uuidv4())
        .input('acqNumber', sql.NVarChar(50), acqNumber)
        .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
        .input('returnQty', sql.Decimal(15, 2), returnQty)
        .input('unitCost', sql.Decimal(15, 2), unitCost)
        .input('processedBy', sql.NVarChar(450), processedByUserId || null)
        .input('notes', sql.NVarChar(sql.MAX), `Stock return for issuance item ${issuedItemId}`)
        .query(`
          INSERT INTO stock_acquisitions (
            id, acquisition_number, item_master_id,
            quantity_received, quantity_issued,
            unit_cost, delivery_date, processed_by, status, notes, created_at, updated_at
          )
          VALUES (
            @acqId, @acqNumber, @itemMasterId,
            @returnQty, 0,
            @unitCost, CAST(GETDATE() AS DATE), @processedBy, 'completed', @notes, GETDATE(), GETDATE()
          )
        `);
    }
  }
}

// ============================================================================
// PUT /api/stock-returns/:id/approve - Approve stock return
// ============================================================================
router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_remarks } = req.body;

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .input('approval_remarks', sql.NVarChar(sql.MAX), approval_remarks || null)
        .query(`
          UPDATE stock_returns 
          SET return_status = 'Approved',
              return_notes = COALESCE(NULLIF(@approval_remarks, ''), return_notes),
              created_at = GETDATE()
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Stock return approved successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error approving stock return:', error);
    res.status(500).json({ error: 'Failed to approve stock return' });
  }
});

// ============================================================================
// PUT /api/stock-returns/:id/reject - Reject stock return
// ============================================================================
router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    await getPool().request()
      .input('id', sql.Int, parseInt(id))
      .input('rejection_reason', sql.NVarChar(sql.MAX), rejection_reason || null)
      .query(`
        UPDATE stock_returns 
        SET return_status = 'Rejected',
            return_notes = COALESCE(NULLIF(@rejection_reason, ''), return_notes)
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Stock return rejected' });
  } catch (error) {
    console.error('Error rejecting stock return:', error);
    res.status(500).json({ error: 'Failed to reject stock return' });
  }
});

// ============================================================================
// DELETE /api/stock-returns/:id - Delete stock return (soft delete)
// ============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.session?.userId || null;

    const pool = getPool();
    const hasSoftDelete = await hasColumn(pool, 'stock_returns', 'is_deleted');

    if (!hasSoftDelete) {
      return res.status(400).json({ error: 'Soft delete is not enabled for stock returns' });
    }

    // Check status first
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`SELECT return_status FROM stock_returns WHERE id = @id AND is_deleted = 0`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    if (checkResult.recordset[0].return_status !== 'Pending') {
      return res.status(400).json({ error: 'Can only delete pending stock returns' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('return_id', sql.Int, parseInt(id))
        .input('deletedBy', sql.NVarChar(450), deletedBy)
        .query(`
          UPDATE stock_return_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE return_id = @return_id
        `);

      await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .input('deletedBy', sql.NVarChar(450), deletedBy)
        .query(`
          UPDATE stock_returns
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Stock return deleted' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting stock return:', error);
    res.status(500).json({ error: 'Failed to delete stock return' });
  }
});

// ============================================================================
// POST /api/stock-returns/:id/restore - Restore deleted stock return
// ============================================================================
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const result = await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
          UPDATE stock_returns
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted stock return not found' });
      }

      await transaction.request()
        .input('returnId', sql.Int, parseInt(id))
        .query(`
          UPDATE stock_return_items
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE return_id = @returnId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ success: true, message: '✅ Stock return restored', stockReturn: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring stock return:', error);
    res.status(500).json({ error: 'Failed to restore stock return' });
  }
});

module.exports = router;
