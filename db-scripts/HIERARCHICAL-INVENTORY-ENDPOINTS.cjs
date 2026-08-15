// ============================================================================
// HIERARCHICAL INVENTORY MANAGEMENT ENDPOINTS
// Separate wing and admin inventory tracking + deduction logic
// ============================================================================

/**
 * GET /api/hierarchical-inventory/locations
 * Get all inventory locations (Admin + Wings)
 */
app.get('/api/hierarchical-inventory/locations', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request().query(`
      SELECT 
        id, location_type, location_name, location_code,
        wing_id, wing_name, is_active, created_at
      FROM inventory_locations
      WHERE is_active = 1
      ORDER BY location_type, location_name
    `);

    res.json({
      success: true,
      locations: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching inventory locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

/**
 * GET /api/hierarchical-inventory/stock/:itemId
 * Get stock levels for an item across all locations
 */
app.get('/api/hierarchical-inventory/stock/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, itemId)
      .query(`
        SELECT 
          ist.id, ist.item_master_id,
          il.id as location_id, il.location_type, il.location_name, il.wing_id, il.wing_name,
          im.item_code, im.nomenclature,
          ist.quantity, ist.reserved_quantity, ist.available_quantity,
          ist.last_received_at, ist.last_issued_at, ist.updated_at
        FROM inventory_stock ist
        JOIN inventory_locations il ON ist.location_id = il.id
        JOIN item_masters im ON ist.item_master_id = im.id
        WHERE ist.item_master_id = @itemId
        ORDER BY il.location_type, il.location_name
      `);

    res.json({
      success: true,
      stock_by_location: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

/**
 * GET /api/hierarchical-inventory/wing-stock/:wingId
 * Get all inventory for a specific wing
 */
app.get('/api/hierarchical-inventory/wing-stock/:wingId', async (req, res) => {
  try {
    const { wingId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT 
          ist.id, im.item_code, im.nomenclature,
          ist.quantity, ist.reserved_quantity, ist.available_quantity,
          il.location_name, il.wing_name,
          ist.last_issued_at, ist.updated_at
        FROM inventory_stock ist
        JOIN inventory_locations il ON ist.location_id = il.id
        JOIN item_masters im ON ist.item_master_id = im.id
        WHERE il.wing_id = @wingId AND il.location_type = 'WING_INVENTORY'
        ORDER BY im.nomenclature
      `);

    res.json({
      success: true,
      wing_inventory: result.recordset,
      wing_id: wingId
    });

  } catch (error) {
    console.error('❌ Error fetching wing stock:', error);
    res.status(500).json({ error: 'Failed to fetch wing stock' });
  }
});

/**
 * GET /api/hierarchical-inventory/admin-stock
 * Get all inventory in admin warehouse
 */
app.get('/api/hierarchical-inventory/admin-stock', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request().query(`
      SELECT 
        ist.id, im.item_code, im.nomenclature,
        ist.quantity, ist.reserved_quantity, ist.available_quantity,
        il.location_name,
        ist.last_received_at, ist.last_issued_at, ist.updated_at
      FROM inventory_stock ist
      JOIN inventory_locations il ON ist.location_id = il.id
      JOIN item_masters im ON ist.item_master_id = im.id
      WHERE il.location_type = 'ADMIN_INVENTORY'
      ORDER BY im.nomenclature
    `);

    res.json({
      success: true,
      admin_inventory: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching admin stock:', error);
    res.status(500).json({ error: 'Failed to fetch admin stock' });
  }
});

/**
 * POST /api/hierarchical-inventory/deduct-hierarchical
 * Deduct inventory from appropriate location based on request type
 * 
 * Body: {
 *   requestId: UUID,
 *   itemMasterId: UUID,
 *   quantityToDeduct: number,
 *   wingId: number (NULL for admin requests),
 *   deductedBy: string,
 *   deductedByName: string,
 *   reason: string (optional)
 * }
 */
app.post('/api/hierarchical-inventory/deduct-hierarchical', async (req, res) => {
  try {
    const {
      requestId,
      itemMasterId,
      quantityToDeduct,
      wingId,
      deductedBy,
      deductedByName,
      reason
    } = req.body;

    if (!requestId || !itemMasterId || !quantityToDeduct || !deductedBy) {
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
      const sourceType = wingId ? 'WING' : 'ADMIN';
      // Get location based on wing
      let locationResult;
      if (wingId) {
        locationResult = await transaction.request()
          .input('wingId', sql.Int, wingId)
          .query(`
            SELECT id, location_name, wing_name
            FROM inventory_locations
            WHERE location_type = 'WING_INVENTORY' AND wing_id = @wingId AND is_active = 1
          `);
      } else {
        locationResult = await transaction.request().query(`
          SELECT id, location_name
          FROM inventory_locations
          WHERE location_type = 'ADMIN_INVENTORY' AND wing_id IS NULL AND is_active = 1
        `);
      }

      if (locationResult.recordset.length === 0) {
        throw new Error(`${sourceType} inventory location not found`);
      }

      const location = locationResult.recordset[0];
      const locationId = location.id;
      const locationName = location.location_name;

      // Get current stock
      const stockResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
        .input('locationId', sql.UniqueIdentifier, locationId)
        .query(`
          SELECT ist.id, ist.quantity, im.item_code, im.nomenclature
          FROM inventory_stock ist
          LEFT JOIN item_masters im ON ist.item_master_id = im.id
          WHERE ist.item_master_id = @itemMasterId AND ist.location_id = @locationId
        `);

      let currentQuantity = 0;
      let itemCode = 'UNKNOWN';
      let itemName = 'Unknown Item';

      if (stockResult.recordset.length > 0) {
        currentQuantity = stockResult.recordset[0].quantity;
        itemCode = stockResult.recordset[0].item_code;
        itemName = stockResult.recordset[0].nomenclature;
      } else {
        // Create stock record if doesn't exist
        await transaction.request()
          .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
          .input('locationId', sql.UniqueIdentifier, locationId)
          .query(`
            INSERT INTO inventory_stock (item_master_id, location_id, quantity)
            VALUES (@itemMasterId, @locationId, 0)
          `);

        // Get item details for logging
        const itemResult = await transaction.request()
          .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
          .query(`
            SELECT item_code, nomenclature FROM item_masters WHERE id = @itemMasterId
          `);

        if (itemResult.recordset.length > 0) {
          itemCode = itemResult.recordset[0].item_code;
          itemName = itemResult.recordset[0].nomenclature;
        }
      }

      // Validate sufficient quantity
      if (currentQuantity < quantityToDeduct) {
        throw new Error(
          `Insufficient inventory in ${locationName}. Available: ${currentQuantity}, Requested: ${quantityToDeduct}`
        );
      }

      const newQuantity = currentQuantity - quantityToDeduct;

      // Update inventory_stock
      await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
        .input('locationId', sql.UniqueIdentifier, locationId)
        .input('newQuantity', sql.Int, newQuantity)
        .query(`
          UPDATE inventory_stock
          SET quantity = @newQuantity,
              last_issued_at = GETDATE(),
              updated_at = GETDATE()
          WHERE item_master_id = @itemMasterId AND location_id = @locationId
        `);

      // Log the transfer
      await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
        .input('itemCode', sql.NVarChar(100), itemCode)
        .input('itemName', sql.NVarChar(500), itemName)
        .input('locationId', sql.UniqueIdentifier, locationId)
        .input('locationName', sql.NVarChar(255), locationName)
        .input('quantityTransferred', sql.Int, quantityToDeduct)
        .input('referenceId', sql.UniqueIdentifier, requestId)
        .input('userId', sql.NVarChar(450), deductedBy)
        .input('userName', sql.NVarChar(255), deductedByName)
        .input('transferReason', sql.NVarChar(sql.MAX), reason || `Deducted for approved request from ${locationName}`)
        .query(`
          INSERT INTO stock_transfer_log (
            item_master_id, item_code, item_name,
            to_location_id, to_location_name,
            transfer_type, quantity_transferred,
            reference_type, reference_id,
            user_id, user_name, reason,
            transferred_at
          ) VALUES (
            @itemMasterId, @itemCode, @itemName,
            @locationId, @locationName,
            'ISSUANCE', @quantityTransferred,
            'REQUEST', @referenceId,
            @userId, @userName, @transferReason,
            GETDATE()
          )
        `);

      // Update request source tracking
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('wingId', sql.Int, wingId)
        .input('locationId', sql.UniqueIdentifier, locationId)
        .input('sourceType', sql.NVarChar(50), sourceType === 'WING' ? 'WING_INVENTORY' : 'ADMIN_INVENTORY')
        .input('fulfillmentStatus', sql.NVarChar(30), sourceType === 'WING' ? 'wing_approved' : 'admin_approved')
        .input('approvedBy', sql.NVarChar(450), deductedBy)
        .input('approvedByName', sql.NVarChar(255), deductedByName)
        .query(`
          UPDATE request_inventory_source
          SET source_location_id = @locationId,
              source_location_type = @sourceType,
              fulfillment_status = @fulfillmentStatus,
              admin_approved_at = GETDATE(),
              admin_approved_by_user_id = @approvedBy,
              admin_approved_by_name = @approvedByName,
              updated_at = GETDATE()
          WHERE request_id = @requestId
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: `Inventory deducted from ${locationName}`,
        location: locationName,
        location_type: sourceType,
        item_code: itemCode,
        item_name: itemName,
        new_quantity: newQuantity,
        deducted: quantityToDeduct
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error deducting hierarchical inventory:', error);
    res.status(500).json({
      error: 'Failed to deduct inventory',
      details: error.message
    });
  }
});

/**
 * POST /api/hierarchical-inventory/forward-request
 * Forward wing request to admin when wing doesn't have sufficient stock
 * 
 * Body: {
 *   requestId: UUID,
 *   wingId: number,
 *   forwardedBy: string,
 *   forwardedByName: string,
 *   reason: string // Why forwarded (e.g., "Insufficient stock in wing")
 * }
 */
app.post('/api/hierarchical-inventory/forward-request', async (req, res) => {
  try {
    const {
      requestId,
      wingId,
      forwardedBy,
      forwardedByName,
      reason
    } = req.body;

    if (!requestId || !wingId || !forwardedBy) {
      return res.status(400).json({
        error: 'Missing required fields: requestId, wingId, forwardedBy'
      });
    }

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get admin location
      const adminLocationResult = await transaction.request().query(`
        SELECT id FROM inventory_locations
        WHERE location_type = 'ADMIN_INVENTORY' AND wing_id IS NULL AND is_active = 1
      `);

      if (adminLocationResult.recordset.length === 0) {
        throw new Error('Admin inventory location not found');
      }

      const adminLocationId = adminLocationResult.recordset[0].id;

      // Get wing info
      const wingResult = await transaction.request()
        .input('wingId', sql.Int, wingId)
        .query(`
          SELECT Id, Name FROM WingsInformation WHERE Id = @wingId
        `);

      const wingName = wingResult.recordset.length > 0 ? wingResult.recordset[0].Name : 'Unknown Wing';

      // Update or create request_inventory_source
      const existingResult = await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT id FROM request_inventory_source WHERE request_id = @requestId
        `);

      if (existingResult.recordset.length > 0) {
        // Update existing
        await transaction.request()
          .input('requestId', sql.UniqueIdentifier, requestId)
          .input('sourceLocationId', sql.UniqueIdentifier, adminLocationId)
          .input('fulfillmentStatus', sql.NVarChar(30), 'forwarded_to_admin')
          .input('forwardedAt', sql.DateTime2, new Date())
          .input('forwardedBy', sql.NVarChar(450), forwardedBy)
          .input('forwardedByName', sql.NVarChar(255), forwardedByName)
          .input('forwardReason', sql.NVarChar(sql.MAX), reason)
          .query(`
            UPDATE request_inventory_source
            SET source_location_id = @sourceLocationId,
                source_location_type = 'ADMIN_INVENTORY',
                fulfillment_status = @fulfillmentStatus,
                forwarded_at = @forwardedAt,
                forwarded_by_user_id = @forwardedBy,
                forwarded_by_name = @forwardedByName,
                forward_reason = @forwardReason,
                updated_at = GETDATE()
            WHERE request_id = @requestId
          `);

        } else {
        // Create new
        const sourceId = require('uuid').v4();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, sourceId)
          .input('requestId', sql.UniqueIdentifier, requestId)
          .input('wingId', sql.Int, wingId)
          .input('wingName', sql.NVarChar(255), wingName)
          .input('sourceLocationId', sql.UniqueIdentifier, adminLocationId)
          .input('requestType', sql.NVarChar(50), 'FORWARDED_REQUEST')
          .input('fulfillmentStatus', sql.NVarChar(30), 'forwarded_to_admin')
          .input('forwardedAt', sql.DateTime2, new Date())
          .input('forwardedBy', sql.NVarChar(450), forwardedBy)
          .input('forwardedByName', sql.NVarChar(255), forwardedByName)
          .input('forwardReason', sql.NVarChar(sql.MAX), reason)
          .query(`
            INSERT INTO request_inventory_source (
              id, request_id, wing_id, wing_name, source_location_id,
              source_location_type, request_type, fulfillment_status,
              forwarded_at, forwarded_by_user_id, forwarded_by_name, forward_reason,
              created_at, updated_at
            ) VALUES (
              @id, @requestId, @wingId, @wingName, @sourceLocationId,
              'ADMIN_INVENTORY', @requestType, @fulfillmentStatus,
              @forwardedAt, @forwardedBy, @forwardedByName, @forwardReason,
              GETDATE(), GETDATE()
            )
          `);

        }

      await transaction.commit();

      res.json({
        success: true,
        message: `Request forwarded to admin for approval`,
        request_id: requestId,
        from_wing: wingName,
        reason: reason
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error forwarding request:', error);
    res.status(500).json({
      error: 'Failed to forward request',
      details: error.message
    });
  }
});

/**
 * GET /api/hierarchical-inventory/request-source/:requestId
 * Get inventory source tracking for a request
 */
app.get('/api/hierarchical-inventory/request-source/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          id, request_id, wing_id, wing_name, source_location_id,
          source_location_type, request_type, fulfillment_status,
          forwarded_at, forwarded_by_name, forward_reason,
          wing_approved_at, wing_approved_by_name,
          admin_approved_at, admin_approved_by_name,
          created_at, updated_at
        FROM request_inventory_source
        WHERE request_id = @requestId
      `);

    res.json({
      success: true,
      source_info: result.recordset.length > 0 ? result.recordset[0] : null
    });

  } catch (error) {
    console.error('❌ Error fetching request source:', error);
    res.status(500).json({ error: 'Failed to fetch request source' });
  }
});

/**
 * GET /api/hierarchical-inventory/transfer-log/:itemId
 * Get complete transfer history for an item
 */
app.get('/api/hierarchical-inventory/transfer-log/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { limit = 100 } = req.query;

    if (!pool) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }

    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, itemId)
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT TOP (@limit)
          id, item_code, item_name,
          transfer_type, quantity_transferred,
          to_location_name, user_name,
          reason, transferred_at
        FROM stock_transfer_log
        WHERE item_master_id = @itemId
        ORDER BY transferred_at DESC
      `);

    res.json({
      success: true,
      transfer_log: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching transfer log:', error);
    res.status(500).json({ error: 'Failed to fetch transfer log' });
  }
});

