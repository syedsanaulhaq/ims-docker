// ============================================================================
// Purchase Orders Routes
// ============================================================================
// All purchase order related endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

// ============================================================================
// GET /api/purchase-orders - List all POs with filtering
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { tenderId, vendorId, status, startDate, endDate } = req.query;
    const pool = getPool();
    
    // Debug: Log incoming parameters
    
    // Validate UUID format
    const isValidUUID = (uuid) => {
      if (!uuid || typeof uuid !== 'string') return false;
      const trimmed = String(uuid).trim();
      if (!trimmed) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(trimmed);
    };

    let query = `
      SELECT 
        po.id,
        po.po_number,
        po.tender_id,
        po.vendor_id,
        po.po_date,
        po.file_number,
        po.po_detail,
        po.total_amount,
        po.status,
        po.remarks,
        po.created_at,
        po.is_deleted,
        t.title as tender_title,
        t.tender_type,
        v.vendor_name,
        (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id AND (is_deleted = 0 OR is_deleted IS NULL)) as item_count
      FROM purchase_orders po
      LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
      LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
      WHERE (po.is_deleted = 0 OR po.is_deleted IS NULL)
    `;

    const request = pool.request();

    if (tenderId && isValidUUID(tenderId)) {
      query += ' AND po.tender_id = @tenderId';
      request.input('tenderId', sql.UniqueIdentifier, tenderId.trim());
    }

    if (vendorId && isValidUUID(vendorId)) {
      query += ' AND po.vendor_id = @vendorId';
      request.input('vendorId', sql.UniqueIdentifier, vendorId.trim());
    }

    if (status && typeof status === 'string' && status.trim() && status.trim() !== 'undefined') {
      query += ' AND po.status = @status';
      request.input('status', sql.NVarChar, status.trim());
    }

    if (startDate && typeof startDate === 'string' && startDate.trim() && startDate.trim() !== 'undefined') {
      try {
        const parsedDate = new Date(startDate.trim());
        if (!isNaN(parsedDate.getTime())) {
          query += ' AND po.po_date >= @startDate';
          request.input('startDate', sql.DateTime, parsedDate);
        }
      } catch (e) {
        }
    }

    if (endDate && typeof endDate === 'string' && endDate.trim() && endDate.trim() !== 'undefined') {
      try {
        const parsedDate = new Date(endDate.trim());
        if (!isNaN(parsedDate.getTime())) {
          query += ' AND po.po_date <= @endDate';
          request.input('endDate', sql.DateTime, parsedDate);
        }
      } catch (e) {
        }
    }

    query += ' ORDER BY po.created_at DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching POs:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      state: error.state
    });

    // If table doesn't exist or there's a schema issue, return empty array
    if (error.message && (error.message.includes('Invalid object name') || error.message.includes('purchase_orders'))) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to fetch purchase orders', details: error.message });
    }
  }
});

// ============================================================================
// GET /api/purchase-orders/:id - Get specific PO with items
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get PO details
    const poResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          po.id,
          po.po_number,
          po.tender_id,
          po.vendor_id,
          po.po_date,
          po.file_number,
          po.po_detail,
          po.total_amount,
          po.status,
          po.remarks,
          po.created_at,
          po.updated_at,
          t.title as tender_title,
          t.reference_number as tender_reference_number,
          t.tender_type,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          v.phone,
          v.email
        FROM purchase_orders po
        LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
        LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
        WHERE po.id = @id
      `);

    if (poResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const po = poResult.recordset[0];

    // Get PO items
    const itemsResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          poi.id,
          poi.po_id,
          poi.item_master_id,
          poi.quantity,
          poi.unit_price,
          poi.total_price,
          poi.specifications,
          im.nomenclature,
          im.unit,
          im.category_id,
          c.category_name
        FROM purchase_order_items poi
        INNER JOIN item_masters im ON poi.item_master_id = im.id
        LEFT JOIN categories c ON im.category_id = c.id
        WHERE poi.po_id = @poId
        ORDER BY im.nomenclature
      `);

    res.json({
      ...po,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching PO details:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order details' });
  }
});

// ============================================================================
// POST /api/purchase-orders - Create POs from tender items
// ============================================================================
router.post('/', async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const { tenderId, selectedItems, poDate, fileNumber, poDetail, itemVendors, itemPrices, itemQuantities, itemSpecifications } = req.body;


    if (!tenderId || !selectedItems || selectedItems.length === 0 || !poDate) {
      return res.status(400).json({ error: 'Missing required fields: tenderId, selectedItems, poDate' });
    }

    // First, get tender info to know its type
    const tenderRequest = await transaction.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`SELECT tender_type, vendor_id FROM tenders WHERE id = @tenderId`);

    if (tenderRequest.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderRequest.recordset[0];
    const isSingleVendorType = ['contract', 'spot-purchase']
      .includes(tender.tender_type?.toLowerCase());

    // Get the latest PO number to generate new ones
    const lastPoRequest = transaction.request();
    const lastPoResult = await lastPoRequest.query(`
      SELECT MAX(CAST(SUBSTRING(po_number, PATINDEX('%[0-9]%', po_number), LEN(po_number)) AS INT)) as max_number
      FROM purchase_orders
      WHERE po_number LIKE 'PO%'
    `);

    const lastNumber = lastPoResult.recordset[0]?.max_number || 0;
    let poCounter = lastNumber + 1;

    // Get all items from tender_items
    const allItems = [];
    const itemPricesMap = itemPrices || {};
    const itemVendorsMap = itemVendors || {};
    const itemQuantitiesMap = itemQuantities || {};
    const itemSpecificationsMap = itemSpecifications || {};

    for (const itemId of selectedItems) {
      // Fetch tender_items with all details
      const itemResult = await transaction.request()
        .input('itemId', sql.UniqueIdentifier, itemId)
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .query(`
          SELECT 
            ti.id,
            ti.item_master_id,
            ti.quantity,
            ti.nomenclature,
            ti.vendor_id,
            ti.estimated_unit_price,
            im.id as item_master_id_lookup
          FROM tender_items ti
          LEFT JOIN item_masters im ON ti.item_master_id = im.id
          WHERE ti.id = @itemId AND ti.tender_id = @tenderId
        `);

      if (itemResult.recordset.length > 0) {
        const item = itemResult.recordset[0];
        const unitPrice = itemPricesMap[itemId] || item.estimated_unit_price || 0;
        const quantity = itemQuantitiesMap[itemId] || item.quantity || 1;

        let itemVendorId;
        if (isSingleVendorType) {
          // For contract/spot: use tender's vendor
          itemVendorId = tender.vendor_id;
        } else {
          // For annual-tender: use vendor_id from tender_items
          itemVendorId = item.vendor_id || itemVendorsMap[itemId];
        }

        if (!itemVendorId) {
          await transaction.rollback();
          return res.status(400).json({ error: `No vendor selected for item ${itemId}` });
        }

        allItems.push({
          ...item,
          unit_price: unitPrice,
          quantity: quantity,
          vendor_id: itemVendorId,
          po_specification: itemSpecificationsMap[itemId] || null
        });
      }
    }

    if (allItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No valid items found for the selected tender' });
    }

    // GROUP ITEMS BY VENDOR_ID
    const itemsByVendor = {};
    for (const item of allItems) {
      const vendorId = item.vendor_id;
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }
      itemsByVendor[vendorId].push(item);
    }

    // CREATE SEPARATE PO FOR EACH VENDOR
    const createdPos = [];
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;
      for (const item of vendorItems) {
        vendorTotal += (item.unit_price || 0) * (item.quantity || 1);
      }

      const poNumber = `PO${String(poCounter).padStart(6, '0')}`;
      poCounter++;

      // Insert PO
      const poInsert = transaction.request()
        .input('po_number', sql.NVarChar, poNumber)
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .input('vendor_id', sql.UniqueIdentifier, vendorId)
        .input('po_date', sql.DateTime, new Date(poDate))
        .input('file_number', sql.NVarChar(100), fileNumber || null)
        .input('po_detail', sql.NVarChar(sql.MAX), poDetail || null)
        .input('total_amount', sql.Decimal(15, 2), vendorTotal)
        .input('status', sql.NVarChar, 'draft')
        .input('created_at', sql.DateTime, new Date());

      const poResult = await poInsert.query(`
        INSERT INTO purchase_orders (po_number, tender_id, vendor_id, po_date, file_number, po_detail, total_amount, status, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@po_number, @tender_id, @vendor_id, @po_date, @file_number, @po_detail, @total_amount, @status, @created_at, GETDATE())
      `);

      const poId = poResult.recordset[0].id;

      // Insert PO items for this vendor
      for (const item of vendorItems) {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
        await transaction.request()
          .input('po_id', sql.UniqueIdentifier, poId)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id_lookup || item.item_master_id)
          .input('quantity', sql.Decimal(10, 2), item.quantity || 1)
          .input('unit_price', sql.Decimal(15, 2), item.unit_price || 0)
          .input('total_price', sql.Decimal(15, 2), itemTotal)
          .input('specifications', sql.NVarChar, item.po_specification || item.specifications || null)
          .input('created_at', sql.DateTime, new Date())
          .query(`
            INSERT INTO purchase_order_items (po_id, item_master_id, quantity, unit_price, total_price, specifications, created_at)
            VALUES (@po_id, @item_master_id, @quantity, @unit_price, @total_price, @specifications, @created_at)
          `);
      }

      createdPos.push({
        id: poId,
        po_number: poNumber,
        vendor_id: vendorId,
        item_count: vendorItems.length,
        total_amount: vendorTotal
      });

    }

    await transaction.commit();
    res.json({
      message: `✅ ${createdPos.length} Purchase Order(s) created successfully${createdPos.length > 1 ? ' (grouped by vendor)' : ''}`,
      pos: createdPos
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating POs:', error);
    res.status(500).json({ error: 'Failed to create purchase orders', details: error.message });
  }
});

// ============================================================================
// PUT /api/purchase-orders/:id - Update PO
// ============================================================================
router.put('/:id', async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const { id } = req.params;
    const { status, remarks, po_date, file_number, po_detail, items, total_amount } = req.body;


    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await transaction.begin();

    // Build update fields dynamically
    const updateFields = ['status = @status', 'updated_at = @updated_at'];
    
    if (remarks !== undefined) updateFields.push('remarks = @remarks');
    if (po_date !== undefined) updateFields.push('po_date = @po_date');
    if (file_number !== undefined) updateFields.push('file_number = @file_number');
    if (po_detail !== undefined) updateFields.push('po_detail = @po_detail');
    if (total_amount !== undefined) updateFields.push('total_amount = @total_amount');

    const request = transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .input('updated_at', sql.DateTime, new Date());

    if (remarks !== undefined) request.input('remarks', sql.NVarChar, remarks || null);
    if (po_date !== undefined) request.input('po_date', sql.Date, po_date);
    if (file_number !== undefined) request.input('file_number', sql.NVarChar(100), file_number || null);
    if (po_detail !== undefined) request.input('po_detail', sql.NVarChar(sql.MAX), po_detail || null);
    if (total_amount !== undefined) request.input('total_amount', sql.Decimal(15, 2), total_amount);

    await request.query(`
      UPDATE purchase_orders
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `);

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items that are not in the new list
      const existingItemIds = items.filter(item => item.id).map(item => item.id);
      
      if (existingItemIds.length > 0) {
        // Keep only items that are in the update list
        await transaction.request()
          .input('po_id', sql.UniqueIdentifier, id)
          .query(`
            DELETE FROM purchase_order_items 
            WHERE po_id = @po_id AND id NOT IN (${existingItemIds.map((_, i) => `'${existingItemIds[i]}'`).join(',')})
          `);
      } else {
        // If no existing items, delete all
        await transaction.request()
          .input('po_id', sql.UniqueIdentifier, id)
          .query(`DELETE FROM purchase_order_items WHERE po_id = @po_id`);
      }

      // Update or insert items
      for (const item of items) {
        const itemTotal = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 1);
        
        if (item.id) {
          // Update existing item
          await transaction.request()
            .input('item_id', sql.Int, item.id)
            .input('quantity', sql.Decimal(10, 2), item.quantity || 1)
            .input('unit_price', sql.Decimal(15, 2), item.unit_price || 0)
            .input('total_price', sql.Decimal(15, 2), itemTotal)
            .input('specifications', sql.NVarChar, item.specifications || null)
            .query(`
              UPDATE purchase_order_items 
              SET quantity = @quantity, unit_price = @unit_price, total_price = @total_price, specifications = @specifications
              WHERE id = @item_id
            `);
        } else {
          // Insert new item
          await transaction.request()
            .input('po_id', sql.UniqueIdentifier, id)
            .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
            .input('quantity', sql.Decimal(10, 2), item.quantity || 1)
            .input('unit_price', sql.Decimal(15, 2), item.unit_price || 0)
            .input('total_price', sql.Decimal(15, 2), itemTotal)
            .input('specifications', sql.NVarChar, item.specifications || null)
            .input('created_at', sql.DateTime, new Date())
            .query(`
              INSERT INTO purchase_order_items (po_id, item_master_id, quantity, unit_price, total_price, specifications, created_at)
              VALUES (@po_id, @item_master_id, @quantity, @unit_price, @total_price, @specifications, @created_at)
            `);
        }
      }
    }

    await transaction.commit();

    res.json({ message: '✅ Purchase order updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error updating PO:', error);
    res.status(500).json({ error: 'Failed to update purchase order', details: error.message });
  }
});

// ============================================================================
// PUT /api/purchase-orders/:id/finalize - Finalize PO
// ============================================================================
router.put('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Check if PO exists and is draft
    const poCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT status FROM purchase_orders WHERE id = @id');

    if (poCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (poCheck.recordset[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only finalize draft purchase orders' });
    }

    // Update status to finalized
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE purchase_orders 
        SET status = 'finalized', updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ message: '✅ Purchase order finalized successfully', status: 'finalized' });
  } catch (error) {
    console.error('❌ Error finalizing PO:', error);
    res.status(500).json({ error: 'Failed to finalize purchase order' });
  }
});

// ============================================================================
// GET /api/purchase-orders/:id/fulfillment - Get PO fulfillment status
// ============================================================================
router.get('/:id/fulfillment', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get PO fulfillment details using the view
    const result = await pool.request()
      .input('poId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          vw.po_id,
          vw.po_number,
          vw.po_date,
          vw.vendor_name,
          vw.po_item_id as id,
          vw.item_master_id as item_id,
          vw.item_name,
          poi.specifications,
          vw.ordered_quantity,
          vw.received_quantity,
          vw.pending_quantity,
          vw.unit_price,
          vw.ordered_value as total_item_value,
          vw.received_value,
          (vw.ordered_value - vw.received_value) as pending_value,
          vw.fulfillment_percentage,
          vw.delivery_status
        FROM vw_po_fulfillment_status vw
        LEFT JOIN purchase_order_items poi ON vw.po_item_id = poi.id
        WHERE vw.po_id = @poId
        ORDER BY vw.item_name
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found or has no items' });
    }

    // Calculate overall PO totals
    const totals = result.recordset.reduce((acc, item) => {
      acc.totalValue += parseFloat(item.total_item_value) || 0;
      acc.receivedValue += parseFloat(item.received_value) || 0;
      acc.pendingValue += parseFloat(item.pending_value) || 0;
      return acc;
    }, { totalValue: 0, receivedValue: 0, pendingValue: 0 });

    const overallFulfillment = totals.totalValue > 0 
      ? ((totals.receivedValue / totals.totalValue) * 100).toFixed(2)
      : 0;

    res.json({
      poId: result.recordset[0].po_id,
      poNumber: result.recordset[0].po_number,
      poDate: result.recordset[0].po_date,
      vendorName: result.recordset[0].vendor_name,
      items: result.recordset,
      summary: {
        totalValue: totals.totalValue,
        receivedValue: totals.receivedValue,
        pendingValue: totals.pendingValue,
        overallFulfillment: parseFloat(overallFulfillment)
      }
    });
  } catch (error) {
    console.error('❌ Error getting PO fulfillment:', error);
    res.status(500).json({ error: 'Failed to get PO fulfillment status' });
  }
});

// ============================================================================
// GET /api/purchase-orders/:id/delivery-status - Get overall delivery progress
// ============================================================================
router.get('/:id/delivery-status', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get PO basic info
    const poResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          po.id,
          po.po_number,
          po.po_date,
          po.vendor_id,
          v.vendor_name,
          po.total_amount,
          po.status
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = @id
      `);

    if (poResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const po = poResult.recordset[0];

    // Get delivery summary
    const deliveriesResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          delivery_id,
          delivery_number,
          delivery_date,
          delivery_personnel,
          delivery_chalan,
          received_by,
          receiving_date,
          delivery_status,
          total_items,
          total_quantity,
          good_quantity,
          damaged_quantity,
          rejected_quantity
        FROM vw_delivery_summary
        WHERE po_id = @poId
        ORDER BY delivery_date DESC
      `);

    // Get items fulfillment summary
    const itemsResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) as completed_items,
          SUM(CASE WHEN delivery_status = 'partial' THEN 1 ELSE 0 END) as partial_items,
          SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_items,
          SUM(quantity) as total_ordered,
          SUM(ISNULL(received_quantity, 0)) as total_received,
          SUM(quantity - ISNULL(received_quantity, 0)) as total_pending
        FROM purchase_order_items
        WHERE po_id = @poId
      `);

    const itemsSummary = itemsResult.recordset[0];
    const receivedPercentage = itemsSummary.total_ordered > 0
      ? ((itemsSummary.total_received / itemsSummary.total_ordered) * 100).toFixed(2)
      : 0;

    // Determine overall PO delivery status
    let overallStatus = 'pending';
    if (itemsSummary.total_received === 0) {
      overallStatus = 'pending';
    } else if (itemsSummary.total_received >= itemsSummary.total_ordered) {
      overallStatus = 'completed';
    } else {
      overallStatus = 'partial';
    }

    res.json({
      po: {
        id: po.id,
        poNumber: po.po_number,
        poDate: po.po_date,
        vendorName: po.vendor_name,
        totalAmount: po.total_amount,
        status: po.status
      },
      deliveryStatus: {
        overallStatus,
        receivedPercentage: parseFloat(receivedPercentage),
        totalOrdered: itemsSummary.total_ordered,
        totalReceived: itemsSummary.total_received,
        totalPending: itemsSummary.total_pending
      },
      itemsSummary: {
        totalItems: itemsSummary.total_items,
        completedItems: itemsSummary.completed_items,
        partialItems: itemsSummary.partial_items,
        pendingItems: itemsSummary.pending_items
      },
      deliveries: deliveriesResult.recordset,
      deliveryCount: deliveriesResult.recordset.length
    });
  } catch (error) {
    console.error('❌ Error getting delivery status:', error);
    res.status(500).json({ error: 'Failed to get delivery status' });
  }
});

// ============================================================================
// DELETE /api/purchase-orders/:id - Delete PO (only if draft)
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    // Check if PO is draft
    const poCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT status FROM purchase_orders WHERE id = @id AND is_deleted = 0');

    if (poCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (poCheck.recordset[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft purchase orders' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Soft delete PO items (if table exists)
      await transaction.request()
        .input('poId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE purchase_order_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE po_id = @poId
        `);

      // Soft delete PO
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE purchase_orders
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.json({ message: '✅ Purchase order deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting PO:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});


// ============================================================================
// POST /api/purchase-orders/:id/restore - Restore deleted purchase order
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
          UPDATE purchase_orders
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted purchase order not found' });
      }

      // Restore PO items
      await transaction.request()
        .input('poId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE purchase_order_items
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE po_id = @poId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ success: true, message: '✅ Purchase order restored', po: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring PO:', error);
    res.status(500).json({ error: 'Failed to restore purchase order' });
  }
});

module.exports = router;