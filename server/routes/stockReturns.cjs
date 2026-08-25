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
    SELECT ISNULL(MAX(CAST(RIGHT(return_number, 6) AS INT)), 0) AS max_num
    FROM stock_returns
    WHERE return_number LIKE 'RET-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%'
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

    let query = `
      SELECT 
        sr.id,
        sr.return_date,
        u.FullName AS returned_by,
        u2.FullName AS verified_by,
        sr.remarks AS return_notes,
        sr.status AS return_status,
        sr.created_at
      FROM stock_returns sr
      LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sr.returned_by) = CONVERT(NVARCHAR(450), u.Id)
      LEFT JOIN AspNetUsers u2 ON CONVERT(NVARCHAR(450), sr.received_by) = CONVERT(NVARCHAR(450), u2.Id)
      WHERE 1=1
    `;

    const request = pool.request();

    if (status && status !== 'all') {
      query += ` AND sr.status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    query += ` ORDER BY sr.return_date DESC, sr.created_at DESC
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

    // Get return header
    const returnResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sr.id,
          sr.return_date,
          u.FullName AS returned_by,
          u2.FullName AS verified_by,
          sr.remarks AS return_notes,
          sr.status AS return_status,
          sr.created_at
        FROM stock_returns sr
        LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sr.returned_by) = CONVERT(NVARCHAR(450), u.Id)
        LEFT JOIN AspNetUsers u2 ON CONVERT(NVARCHAR(450), sr.received_by) = CONVERT(NVARCHAR(450), u2.Id)
        WHERE sr.id = @id
      `);

    if (returnResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    // Get return items
    const itemsResult = await pool.request()
      .input('return_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sri.id,
          sri.stock_return_id AS return_id,
          sri.original_issuance_item_id AS issued_item_id,
          COALESCE(im.nomenclature, 'Unknown Item') AS nomenclature,
          sri.returned_quantity AS return_quantity,
          CASE 
            WHEN sri.condition_status = 'GOOD' THEN 'Good'
            WHEN sri.condition_status = 'DAMAGED' THEN 'Damaged'
            ELSE 'Lost'
          END AS condition_on_return,
          sri.condition_remarks AS damage_description,
          sri.created_at
        FROM stock_return_items sri
        LEFT JOIN item_masters im ON sri.item_master_id = im.id
        WHERE sri.stock_return_id = @return_id
        ORDER BY sri.created_at ASC
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

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Get request/issuance details from the first return item to identify wing & requester
      const firstItem = return_items[0];
      const issuanceInfoResult = await transaction.request()
        .input('issuedItemId', sql.UniqueIdentifier, firstItem.issued_item_id)
        .query(`
          SELECT TOP 1 sir.id AS request_id, sir.requester_wing_id, sir.requester_user_id, si.id AS actual_issuance_id
          FROM stock_issuance_items sii
          INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
          LEFT JOIN stock_issuances si ON si.id = sii.stock_issuance_id
          WHERE sii.id = @issuedItemId
        `);

      if (issuanceInfoResult.recordset.length === 0) {
        throw new Error('Original issuance request not found');
      }

      const { request_id, requester_wing_id, requester_user_id, actual_issuance_id } = issuanceInfoResult.recordset[0];

      // 2. Resolve dec_id from requester_wing_id
      let decId = null;
      if (requester_wing_id) {
        const decResult = await transaction.request()
          .input('wingId', sql.Int, requester_wing_id)
          .query(`SELECT TOP 1 intAutoID FROM DEC_MST WHERE WingID = @wingId`);
        decId = decResult.recordset[0]?.intAutoID || null;
      }
      
      if (!decId) {
        const fallbackDecResult = await transaction.request()
          .query(`SELECT TOP 1 intAutoID FROM DEC_MST ORDER BY intAutoID ASC`);
        decId = fallbackDecResult.recordset[0]?.intAutoID || 1;
      }

      // 3. Generate return number
      const returnNumber = await generateReturnAcquisitionNumber(transaction);
      const returnId = uuidv4();

      // 4. Create stock return header in the clean schema
      await transaction.request()
        .input('id', sql.UniqueIdentifier, returnId)
        .input('return_number', sql.NVarChar(50), returnNumber)
        .input('dec_id', sql.Int, decId)
        .input('original_issuance_id', sql.UniqueIdentifier, actual_issuance_id || null)
        .input('returned_by', sql.NVarChar(450), String(requester_user_id || req.session.userId))
        .input('received_by', sql.NVarChar(450), String(req.session.userId))
        .input('return_date', sql.Date, return_date || new Date())
        .input('remarks', sql.NVarChar(500), return_notes || null)
        .input('status', sql.NVarChar(20), 'PROCESSED')
        .query(`
          INSERT INTO stock_returns (
            id, return_number, dec_id, original_issuance_id, returned_by, received_by,
            return_date, return_reason, condition_status, status, remarks, created_at, updated_at
          )
          VALUES (
            @id, @return_number, @dec_id, @original_issuance_id, @returned_by, @received_by,
            @return_date, 'OTHER', 'GOOD', @status, @remarks, GETDATE(), GETDATE()
          )
        `);

      const isCompleted = (return_status || 'Completed').toString().toLowerCase() === 'completed';

      // 5. Add return items in the clean schema
      for (const item of return_items) {
        if (!item.issued_item_id) {
          throw new Error('Each return item must have an issued_item_id');
        }
        if (!item.return_quantity || item.return_quantity <= 0) {
          throw new Error(`Invalid return quantity for item ${item.nomenclature || item.issued_item_id}`);
        }

        // Get details of the stock_issuance_item
        const itemDetailResult = await transaction.request()
          .input('issuedItemId', sql.UniqueIdentifier, item.issued_item_id)
          .query(`
            SELECT TOP 1 item_master_id, unit_price, COALESCE(issued_quantity, approved_quantity, requested_quantity, 0) AS issued_quantity
            FROM stock_issuance_items
            WHERE id = @issuedItemId
          `);

        if (itemDetailResult.recordset.length === 0) {
          throw new Error(`Issuance item details not found for ID ${item.issued_item_id}`);
        }

        const { item_master_id, unit_price } = itemDetailResult.recordset[0];
        const unitCost = Number(unit_price || 0);
        const conditionStatus = item.condition_on_return === 'Good' ? 'GOOD' : (item.condition_on_return === 'Damaged' ? 'DAMAGED' : 'UNUSABLE');

        await transaction.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('stock_return_id', sql.UniqueIdentifier, returnId)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('original_issuance_item_id', sql.UniqueIdentifier, item.issued_item_id)
          .input('returned_quantity', sql.Int, item.return_quantity)
          .input('condition_status', sql.NVarChar(20), conditionStatus)
          .input('unit_price', sql.Decimal(15, 4), unitCost)
          .input('condition_remarks', sql.NVarChar(500), item.damage_description || null)
          .query(`
            INSERT INTO stock_return_items (
              id, stock_return_id, item_master_id, original_issuance_item_id,
              returned_quantity, accepted_quantity, rejected_quantity,
              condition_status, unit_price, status, condition_remarks, created_at, updated_at
            )
            VALUES (
              @id, @stock_return_id, @item_master_id, @original_issuance_item_id,
              @returned_quantity, @returned_quantity, 0,
              @condition_status, @unit_price, 'PROCESSED', @condition_remarks, GETDATE(), GETDATE()
            )
          `);

        // Update inventory tracking and add stock back to inventory if completed
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
  const unitCost = Number(issuedItem.unit_price || 0);

  if (!itemMasterId) {
    console.warn(`⚠️ Issued item ${issuedItemId} has no item_master_id; skipping inventory update`);
    return;
  }

  // Update returned_quantity on stock_issuance_items if column exists (dynamic check)
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

    const pool = getPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('approval_remarks', sql.NVarChar(sql.MAX), approval_remarks || null)
      .query(`
        UPDATE stock_returns 
        SET status = 'PROCESSED',
            remarks = COALESCE(NULLIF(@approval_remarks, ''), remarks),
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Stock return approved successfully' });
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
      .input('id', sql.UniqueIdentifier, id)
      .input('rejection_reason', sql.NVarChar(sql.MAX), rejection_reason || null)
      .query(`
        UPDATE stock_returns 
        SET status = 'CANCELLED',
            remarks = COALESCE(NULLIF(@rejection_reason, ''), remarks),
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Stock return rejected' });
  } catch (error) {
    console.error('Error rejecting stock return:', error);
    res.status(500).json({ error: 'Failed to reject stock return' });
  }
});

// ============================================================================
// DELETE /api/stock-returns/:id - Cancel/Delete stock return
// ============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Check status first
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT status FROM stock_returns WHERE id = @id`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    if (checkResult.recordset[0].status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only delete pending stock returns' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('return_id', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_return_items
          SET status = 'CANCELLED',
              updated_at = GETDATE()
          WHERE stock_return_id = @return_id
        `);

      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_returns
          SET status = 'CANCELLED',
              updated_at = GETDATE()
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Stock return cancelled successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting stock return:', error);
    res.status(500).json({ error: 'Failed to delete stock return' });
  }
});

module.exports = router;
