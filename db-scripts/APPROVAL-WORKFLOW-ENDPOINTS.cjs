// ============================================================================
// APPROVAL-TO-ISSUANCE WORKFLOW ENDPOINTS
// Complete: Approve → Assign → Deduct Inventory
// ============================================================================

/**
 * POST /api/approval-workflow/approve-and-allocate
 * Supervisor approves a request and creates allocation
 * 
 * Body: {
 *   requestId: UUID,
 *   approverId: string,
 *   approverName: string,
 *   approvalComments: string,
 *   allocations: [
 *     { itemId: UUID, quantity: number, inventoryItemId: UUID }
 *   ]
 * }
 */
app.post('/api/approval-workflow/approve-and-allocate', async (req, res) => {
  try {
    const {
      requestId,
      approverId,
      approverName,
      approvalComments,
      allocations
    } = req.body;

    if (!requestId || !approverId || !allocations?.length) {
      return res.status(400).json({
        error: 'Missing required fields: requestId, approverId, allocations'
      });
    }

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get request details
      const requestResult = await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT id, requester_user_id, requester_name
          FROM stock_issuance_requests
          WHERE id = @requestId
        `);

      if (requestResult.recordset.length === 0) {
        throw new Error('Request not found');
      }

      const request = requestResult.recordset[0];
      const transactionId = require('uuid').v4();

      // 1. Create main transaction record
      await transaction.request()
        .input('id', sql.UniqueIdentifier, transactionId)
        .input('stock_issuance_request_id', sql.UniqueIdentifier, requestId)
        .input('requester_user_id', sql.NVarChar(450), request.requester_user_id)
        .input('requester_name', sql.NVarChar(255), request.requester_name)
        .input('transaction_type', sql.NVarChar(50), 'ALLOCATION')
        .input('quantity', sql.Int, allocations.reduce((sum, a) => sum + a.quantity, 0))
        .input('transaction_status', sql.NVarChar(30), 'allocated')
        .input('approved_by_user_id', sql.NVarChar(450), approverId)
        .input('approved_by_name', sql.NVarChar(255), approverName)
        .input('approved_at', sql.DateTime2, new Date())
        .input('approval_comments', sql.NVarChar(sql.MAX), approvalComments)
        .query(`
          INSERT INTO stock_issuance_transactions (
            id, stock_issuance_request_id, requester_user_id, requester_name,
            transaction_type, quantity, transaction_status,
            approved_by_user_id, approved_by_name, approved_at, approval_comments,
            created_at, updated_at
          ) VALUES (
            @id, @stock_issuance_request_id, @requester_user_id, @requester_name,
            @transaction_type, @quantity, @transaction_status,
            @approved_by_user_id, @approved_by_name, @approved_at, @approval_comments,
            GETDATE(), GETDATE()
          )
        `);

      // 2. Create allocations for each item
      for (const allocation of allocations) {
        const allocationId = require('uuid').v4();

        await transaction.request()
          .input('id', sql.UniqueIdentifier, allocationId)
          .input('transaction_id', sql.UniqueIdentifier, transactionId)
          .input('inventory_item_id', sql.UniqueIdentifier, allocation.inventoryItemId)
          .input('requester_user_id', sql.NVarChar(450), request.requester_user_id)
          .input('requester_name', sql.NVarChar(255), request.requester_name)
          .input('allocated_quantity', sql.Int, allocation.quantity)
          .input('allocation_status', sql.NVarChar(30), 'allocated')
          .query(`
            INSERT INTO stock_allocations (
              id, transaction_id, inventory_item_id,
              requester_user_id, requester_name, allocated_quantity,
              allocation_status, created_at, updated_at
            ) VALUES (
              @id, @transaction_id, @inventory_item_id,
              @requester_user_id, @requester_name, @allocated_quantity,
              @allocation_status, GETDATE(), GETDATE()
            )
          `);

        }

      // 3. Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('approverName', sql.NVarChar(255), approverName)
        .input('approvalComments', sql.NVarChar(sql.MAX), approvalComments)
        .query(`
          UPDATE stock_issuance_requests
          SET request_status = 'Approved',
              approved_at = GETDATE(),
              approved_by = @approverName,
              review_comments = @approvalComments,
              updated_at = GETDATE()
          WHERE id = @requestId
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Request approved and allocated successfully',
        transaction_id: transactionId
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error in approval workflow:', error);
    res.status(500).json({
      error: 'Failed to approve and allocate',
      details: error.message
    });
  }
});

/**
 * POST /api/approval-workflow/deduct-from-inventory
 * Deduct approved quantity from inventory
 * 
 * Body: {
 *   transactionId: UUID,
 *   inventoryItemId: UUID,
 *   quantityToDeduct: number,
 *   deductedBy: string,
 *   deductedByName: string,
 *   notes: string (optional)
 * }
 */
app.post('/api/approval-workflow/deduct-from-inventory', async (req, res) => {
  try {
    const {
      transactionId,
      inventoryItemId,
      quantityToDeduct,
      deductedBy,
      deductedByName,
      notes
    } = req.body;

    if (!transactionId || !inventoryItemId || !quantityToDeduct || !deductedBy) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get current inventory level
      const inventoryResult = await transaction.request()
        .input('id', sql.UniqueIdentifier, inventoryItemId)
        .query(`
          SELECT id, item_code, nomenclature, quantity
          FROM item_masters
          WHERE id = @id
        `);

      if (inventoryResult.recordset.length === 0) {
        throw new Error('Inventory item not found');
      }

      const inventory = inventoryResult.recordset[0];
      const currentQuantity = inventory.quantity;

      // Check sufficient quantity
      if (currentQuantity < quantityToDeduct) {
        throw new Error(`Insufficient inventory. Available: ${currentQuantity}, Requested: ${quantityToDeduct}`);
      }

      const newQuantity = currentQuantity - quantityToDeduct;

      // Deduct from inventory
      await transaction.request()
        .input('id', sql.UniqueIdentifier, inventoryItemId)
        .input('newQuantity', sql.Int, newQuantity)
        .query(`
          UPDATE item_masters
          SET quantity = @newQuantity,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Update transaction status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, transactionId)
        .input('deductedBy', sql.NVarChar(450), deductedBy)
        .input('quantityToDeduct', sql.Int, quantityToDeduct)
        .query(`
          UPDATE stock_issuance_transactions
          SET inventory_deducted = 1,
              deducted_at = GETDATE(),
              deducted_by = @deductedBy,
              transaction_status = 'issued',
              issued_quantity = @quantityToDeduct,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Log the deduction
      await transaction.request()
        .input('inventory_item_id', sql.UniqueIdentifier, inventoryItemId)
        .input('item_code', sql.NVarChar(100), inventory.item_code)
        .input('item_name', sql.NVarChar(500), inventory.nomenclature)
        .input('quantity_before', sql.Int, currentQuantity)
        .input('quantity_after', sql.Int, newQuantity)
        .input('quantity_changed', sql.Int, -quantityToDeduct)
        .input('user_id', sql.NVarChar(450), deductedBy)
        .input('user_name', sql.NVarChar(255), deductedByName)
        .input('reference_id', sql.UniqueIdentifier, transactionId)
        .input('description', sql.NVarChar(sql.MAX), notes || 'Inventory deducted for approved issuance')
        .query(`
          INSERT INTO inventory_log (
            inventory_item_id, item_code, item_name,
            log_type, quantity_before, quantity_after, quantity_changed,
            user_id, user_name, reference_type, reference_id,
            description, logged_at
          ) VALUES (
            @inventory_item_id, @item_code, @item_name,
            'DEDUCTION', @quantity_before, @quantity_after, @quantity_changed,
            @user_id, @user_name, 'REQUEST', @reference_id,
            @description, GETDATE()
          )
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Inventory deducted successfully',
        new_quantity: newQuantity,
        deducted: quantityToDeduct
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error deducting inventory:', error);
    res.status(500).json({
      error: 'Failed to deduct from inventory',
      details: error.message
    });
  }
});

/**
 * POST /api/approval-workflow/assign-to-requester
 * Assign allocated items to requester
 * 
 * Body: {
 *   transactionId: UUID,
 *   requesterId: string,
 *   requesterName: string,
 *   allocatedQuantity: number,
 *   assignedBy: string,
 *   assignedByName: string,
 *   notes: string (optional)
 * }
 */
app.post('/api/approval-workflow/assign-to-requester', async (req, res) => {
  try {
    const {
      transactionId,
      requesterId,
      requesterName,
      allocatedQuantity,
      assignedBy,
      assignedByName,
      notes
    } = req.body;

    if (!transactionId || !requesterId || !allocatedQuantity || !assignedBy) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get transaction details
      const txResult = await transaction.request()
        .input('id', sql.UniqueIdentifier, transactionId)
        .query(`
          SELECT id, inventory_item_id
          FROM stock_issuance_transactions
          WHERE id = @id
        `);

      if (txResult.recordset.length === 0) {
        throw new Error('Transaction not found');
      }

      const tx = txResult.recordset[0];
      const allocationId = require('uuid').v4();

      // Create allocation record
      await transaction.request()
        .input('id', sql.UniqueIdentifier, allocationId)
        .input('transaction_id', sql.UniqueIdentifier, transactionId)
        .input('inventory_item_id', sql.UniqueIdentifier, tx.inventory_item_id)
        .input('requester_user_id', sql.NVarChar(450), requesterId)
        .input('requester_name', sql.NVarChar(255), requesterName)
        .input('allocated_quantity', sql.Int, allocatedQuantity)
        .query(`
          INSERT INTO stock_allocations (
            id, transaction_id, inventory_item_id,
            requester_user_id, requester_name, allocated_quantity,
            allocation_status, created_at, updated_at
          ) VALUES (
            @id, @transaction_id, @inventory_item_id,
            @requester_user_id, @requester_name, @allocated_quantity,
            'allocated', GETDATE(), GETDATE()
          )
        `);

      // Update transaction with assignment info
      await transaction.request()
        .input('id', sql.UniqueIdentifier, transactionId)
        .input('requesterId', sql.NVarChar(450), requesterId)
        .input('requesterName', sql.NVarChar(255), requesterName)
        .input('notes', sql.NVarChar(sql.MAX), notes)
        .query(`
          UPDATE stock_issuance_transactions
          SET assigned_to_user_id = @requesterId,
              assigned_to_name = @requesterName,
              assigned_at = GETDATE(),
              notes = @notes,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Log the assignment
      await transaction.request()
        .input('inventory_item_id', sql.UniqueIdentifier, tx.inventory_item_id)
        .input('user_id', sql.NVarChar(450), assignedBy)
        .input('user_name', sql.NVarChar(255), assignedByName)
        .input('reference_id', sql.UniqueIdentifier, allocationId)
        .input('description', sql.NVarChar(sql.MAX), `Assigned ${allocatedQuantity} units to ${requesterName}`)
        .query(`
          INSERT INTO inventory_log (
            inventory_item_id, log_type,
            user_id, user_name, reference_type, reference_id,
            description, logged_at
          ) VALUES (
            @inventory_item_id, 'ALLOCATION',
            @user_id, @user_name, 'ALLOCATION', @reference_id,
            @description, GETDATE()
          )
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Items assigned successfully',
        allocation_id: allocationId
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error assigning to requester:', error);
    res.status(500).json({
      error: 'Failed to assign items',
      details: error.message
    });
  }
});

/**
 * GET /api/approval-workflow/transactions/:requestId
 * Get all transactions for a request
 */
app.get('/api/approval-workflow/transactions/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          id, stock_issuance_request_id, transaction_type, quantity,
          transaction_status, approved_by_name, approved_at,
          assigned_to_name, assigned_at,
          inventory_deducted, deducted_at,
          created_at, updated_at
        FROM stock_issuance_transactions
        WHERE stock_issuance_request_id = @requestId
        ORDER BY created_at DESC
      `);

    res.json({
      success: true,
      transactions: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.message
    });
  }
});

/**
 * GET /api/approval-workflow/allocations/:transactionId
 * Get all allocations for a transaction
 */
app.get('/api/approval-workflow/allocations/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('transactionId', sql.UniqueIdentifier, transactionId)
      .query(`
        SELECT 
          sa.id, sa.transaction_id, sa.inventory_item_id,
          sa.requester_name, sa.allocated_quantity,
          sa.allocation_status, sa.issued_at, sa.issued_quantity,
          im.item_code, im.nomenclature,
          sa.created_at, sa.updated_at
        FROM stock_allocations sa
        LEFT JOIN item_masters im ON sa.inventory_item_id = im.id
        WHERE sa.transaction_id = @transactionId
        ORDER BY sa.created_at DESC
      `);

    res.json({
      success: true,
      allocations: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching allocations:', error);
    res.status(500).json({
      error: 'Failed to fetch allocations',
      details: error.message
    });
  }
});

/**
 * GET /api/approval-workflow/inventory-log/:itemId
 * Get inventory log for an item
 */
app.get('/api/approval-workflow/inventory-log/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { limit = 50 } = req.query;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, itemId)
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT TOP (@limit)
          id, log_type, quantity_before, quantity_after, quantity_changed,
          user_name, reference_type, description, logged_at
        FROM inventory_log
        WHERE inventory_item_id = @itemId
        ORDER BY logged_at DESC
      `);

    res.json({
      success: true,
      log: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching inventory log:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory log',
      details: error.message
    });
  }
});

