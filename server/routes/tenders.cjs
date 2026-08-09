// ============================================================================
// Tender Routes
// ============================================================================
// All tender related endpoints including creation, listing, updates, and vendor management

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');
const upload = require('../middleware/fileUpload.cjs');

const normalizeIdList = (value) => {
  if (Array.isArray(value)) {
    const ids = value.map((id) => String(id).trim()).filter(Boolean);
    return ids.length > 0 ? ids.join(',') : null;
  }
  if (typeof value === 'string') {
    const ids = value.split(',').map((id) => id.trim()).filter(Boolean);
    return ids.length > 0 ? ids.join(',') : null;
  }
  return null;
};

// ============================================================================
// POST /api/tenders - Create new tender with items and documents
// ============================================================================
router.post('/', upload.fields([
  { name: 'contract_file', maxCount: 1 },
  { name: 'loi_file', maxCount: 1 },
  { name: 'noting_file', maxCount: 1 },
  { name: 'po_file', maxCount: 1 },
  { name: 'rfp_file', maxCount: 1 }
]), async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();

    // Parse tender data from FormData or JSON
    let tenderData, items;
    if (req.body.tenderData) {
      const parsedData = JSON.parse(req.body.tenderData);
      items = parsedData.items;
      tenderData = { ...parsedData };
      delete tenderData.items;
    } else {
      const { items: itemsFromBody, ...tenderDataFromBody } = req.body;
      items = itemsFromBody;
      tenderData = tenderDataFromBody;
    }

    tenderData.office_ids = normalizeIdList(tenderData.office_ids);
    tenderData.wing_ids = normalizeIdList(tenderData.wing_ids);
    tenderData.dec_ids = normalizeIdList(tenderData.dec_ids);


    if (items && items.length > 0) {
      items.forEach((item, idx) => {
      });
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.contract_file) {
        tenderData.contract_file_path = req.files.contract_file[0].filename;
      }
      if (req.files.loi_file) {
        tenderData.loi_file_path = req.files.loi_file[0].filename;
      }
      if (req.files.noting_file) {
        tenderData.noting_file_path = req.files.noting_file[0].filename;
      }
      if (req.files.po_file) {
        tenderData.po_file_path = req.files.po_file[0].filename;
      }
      if (req.files.rfp_file) {
        tenderData.rfp_file_path = req.files.rfp_file[0].filename;
      }
    }

    // Insert into tenders table
    const tenderRequest = transaction.request();
    tenderRequest.input('id', sql.UniqueIdentifier, tenderId);

    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total'
    ];

    let insertQuery = 'INSERT INTO tenders (id, created_at, updated_at, is_finalized';
    let valuesQuery = 'VALUES (@id, @created_at, @updated_at, 0';
    
    tenderRequest.input('created_at', sql.DateTime, now);
    tenderRequest.input('updated_at', sql.DateTime, now);

    for (const field of tenderFields) {
      if (tenderData[field] !== undefined) {
        insertQuery += `, ${field}`;
        valuesQuery += `, @${field}`;
        let value = tenderData[field];
        let sqlType = sql.NVarChar;

        if (field.endsWith('_date') || field.endsWith('_deadline')) {
          sqlType = sql.DateTime;
          value = value ? new Date(value) : null;
        } else if (field.endsWith('_value') || field.endsWith('_total') || field === 'quantity') {
          sqlType = sql.Decimal(15, 2);
          value = value ? parseFloat(value) : null;
        } else if (field.endsWith('_id')) {
          sqlType = sql.UniqueIdentifier;
        }
        tenderRequest.input(field, sqlType, value);
      }
    }

    insertQuery += ') ' + valuesQuery + ')';
    await tenderRequest.query(insertQuery);

    // Insert tender items
    if (items && Array.isArray(items) && items.length > 0) {
      const tender_type = tenderData.tender_type || 'contract';
      const awardedVendorId = tenderData.vendor_id || tenderData.awarded_vendor_id;


      for (const item of items) {
        const itemRequest = transaction.request();
        itemRequest.input('id', sql.UniqueIdentifier, uuidv4());
        itemRequest.input('tender_id', sql.UniqueIdentifier, tenderId);
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);

        let itemVendorId = null;
        if (tender_type === 'annual-tender') {
          itemVendorId = item.vendor_id || null;
          // Annual tender is a rate contract: items carry only price, not quantity.
          // Force these values into the insert because the NOT NULL column requires a quantity.
          item.quantity = 1;
          item.total_amount = item.estimated_unit_price || 0;
        } else if (['contract', 'spot-purchase'].includes(tender_type)) {
          itemVendorId = awardedVendorId || item.vendor_id;
        }

        itemRequest.input('vendor_id', sql.UniqueIdentifier, itemVendorId || null);

        let itemInsertQuery = 'INSERT INTO tender_items (id, tender_id, created_at, updated_at, vendor_id';
        let itemValuesQuery = 'VALUES (@id, @tender_id, @created_at, @updated_at, @vendor_id';

        const itemFields = [
          'item_master_id', 'nomenclature', 'quantity', 'quantity_received',
          'estimated_unit_price', 'actual_unit_price', 'total_amount',
          'specifications', 'remarks', 'status',
          'source_required_item_id', 'source_required_item_ids'
        ];

        for (const field of itemFields) {
          // For annual tenders, always include quantity and total_amount even if
          // the frontend omitted them, because tender_items.quantity is NOT NULL.
          if (tender_type === 'annual-tender' && (field === 'quantity' || field === 'total_amount')) {
            item[field] = field === 'quantity' ? 1 : (item.estimated_unit_price || 0);
          }
          if (item[field] !== undefined) {
            itemInsertQuery += `, ${field}`;
            itemValuesQuery += `, @${field}`;
            let value = item[field];
            let sqlType = sql.NVarChar;

            if (['quantity', 'quantity_received', 'estimated_unit_price', 'actual_unit_price', 'total_amount'].includes(field)) {
              if (field === 'quantity' || field === 'quantity_received') {
                sqlType = sql.Int;
                value = value ? parseInt(value, 10) : null;
              } else {
                sqlType = sql.Decimal(15, 2);
                value = value ? parseFloat(value) : null;
              }
            } else if (field === 'item_master_id') {
              sqlType = sql.UniqueIdentifier;
            }
            itemRequest.input(field, sqlType, value);
          }
        }

        itemInsertQuery += ') ' + itemValuesQuery + ')';
        await itemRequest.query(itemInsertQuery);
      }
    }

    await transaction.commit();
    res.status(201).json({ 
      success: true, 
      message: 'Tender created successfully', 
      tenderId 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to create tender:', error);
    res.status(500).json({ 
      error: 'Failed to create tender', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/tenders - List all tenders with filtering
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { type, status, searchTerm, includeDeleted } = req.query;

    let query = `
      SELECT 
        id,
        reference_number,
        title,
        description,
        tender_type,
        status,
        estimated_value,
        publish_date,
        submission_deadline,
        is_finalized,
        finalized_at,
        finalized_by,
        created_at,
        is_deleted,
        deleted_at
      FROM tenders
      WHERE 1=1
    `;

    const request = pool.request();

    // Filter deleted records unless explicitly requested
    if (includeDeleted !== 'true') {
      query += ' AND is_deleted = 0';
    }

    if (type && type !== 'all') {
      query += ' AND tender_type = @type';
      request.input('type', sql.NVarChar, type);
    }

    if (status && status !== 'all') {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, status);
    }

    if (searchTerm) {
      query += ' AND (title LIKE @searchTerm OR reference_number LIKE @searchTerm)';
      request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching tenders:', error);
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

// ============================================================================
// GET /api/tenders/:id - Get tender details with items
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get tender details
    const tenderResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          reference_number,
          title,
          description,
          tender_type,
          status,
          estimated_value,
          publish_date,
          submission_deadline,
          opening_date,
          office_ids,
          wing_ids,
          dec_ids,
          publication_daily,
          procurement_method,
          procedure_adopted,
          is_finalized,
          finalized_at,
          finalized_by,
          created_at,
          updated_at,
          vendor_id,
          created_by
        FROM tenders
        WHERE id = @id AND is_deleted = 0
      `);

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderResult.recordset[0];

    // Get tender items with category information
    const itemsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ti.id,
          ti.tender_id,
          ti.item_master_id,
          ti.nomenclature,
          im.group_number,
          ti.quantity,
          ti.estimated_unit_price,
          ti.total_amount,
          ti.vendor_id,
          ti.specifications,
          ti.remarks,
          c.category_name,
          c.description as category_description,
          v.vendor_name,
          v.vendor_code
        FROM tender_items ti
        LEFT JOIN item_masters im ON ti.item_master_id = im.id AND im.is_deleted = 0
        LEFT JOIN categories c ON im.category_id = c.id AND c.is_deleted = 0
        LEFT JOIN vendors v ON ti.vendor_id = v.id AND v.is_deleted = 0
        WHERE ti.tender_id = @tenderId AND ti.is_deleted = 0
        ORDER BY c.description, c.category_name, ti.nomenclature
      `);

    res.json({
      ...tender,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching tender details:', error);
    res.status(500).json({ error: 'Failed to fetch tender details' });
  }
});

// ============================================================================
// GET /api/tenders/:id/items - Get items for a tender
// ============================================================================
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get tender items with category and vendor information
    const itemsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ti.id,
          ti.tender_id,
          ti.item_master_id,
          ti.nomenclature,
          im.group_number,
          ti.quantity,
          ti.estimated_unit_price,
          ti.vendor_id,
          ti.specifications,
          ti.remarks,
          c.category_name,
          c.description as category_description,
          v.vendor_name,
          v.vendor_code
        FROM tender_items ti
        LEFT JOIN item_masters im ON ti.item_master_id = im.id AND im.is_deleted = 0
        LEFT JOIN categories c ON im.category_id = c.id AND c.is_deleted = 0
        LEFT JOIN vendors v ON ti.vendor_id = v.id AND v.is_deleted = 0
        WHERE ti.tender_id = @tenderId AND ti.is_deleted = 0
        ORDER BY c.description, c.category_name, ti.nomenclature
      `);

    res.json(itemsResult.recordset);
  } catch (error) {
    console.error('❌ Error fetching tender items:', error);
    res.status(500).json({ error: 'Failed to fetch tender items' });
  }
});

// ============================================================================
// GET /api/tenders/:id/vendors - Get vendors/bidders for a tender
// ============================================================================
router.get('/:id/vendors', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // First check if this is a regular tender with tender_vendors table
    const vendorsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          tv.id,
          tv.tender_id,
          tv.vendor_id,
          tv.vendor_name,
          tv.quoted_amount,
          tv.remarks,
          tv.is_awarded,
          tv.is_selected,
          tv.is_successful,
          tv.proposal_document_path,
          tv.created_at,
          v.vendor_code,
          v.contact_person,
          v.phone,
          v.email
        FROM tender_vendors tv
        INNER JOIN vendors v ON tv.vendor_id = v.id
        WHERE tv.tender_id = @tenderId
          AND (tv.is_deleted = 0 OR tv.is_deleted IS NULL)
          AND (v.is_deleted = 0 OR v.is_deleted IS NULL)
        ORDER BY tv.vendor_name
      `);

    // If no vendors found in tender_vendors, check if it's an annual tender with items
    if (vendorsResult.recordset.length === 0) {
      const itemVendorsResult = await pool.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`
          SELECT DISTINCT
            v.id as vendor_id,
            v.vendor_name,
            v.vendor_code,
            v.contact_person,
            v.phone,
            v.email,
            1 as is_successful
          FROM tender_items ti
          INNER JOIN vendors v ON ti.vendor_id = v.id
          WHERE ti.tender_id = @tenderId AND ti.vendor_id IS NOT NULL
          ORDER BY v.vendor_name
        `);
      
      return res.json(itemVendorsResult.recordset);
    }

    res.json(vendorsResult.recordset);
  } catch (error) {
    console.error('❌ Error fetching tender vendors:', error);
    res.status(500).json({ error: 'Failed to fetch tender vendors' });
  }
});

// ============================================================================
// POST /api/tenders/:id/vendors - Add/Save a bidder to a tender
// ============================================================================
router.post('/:id/vendors', async (req, res) => {
  try {
    const { id: tenderId } = req.params;
    const { vendor_id, vendor_name, quoted_amount, remarks, is_selected, is_successful } = req.body;
    const pool = getPool();

    // Validate required fields
    if (!vendor_id || !vendor_name) {
      return res.status(400).json({ 
        error: 'vendor_id and vendor_name are required' 
      });
    }

    // Check if vendor already exists in tender_vendors
    const existingResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('vendorId', sql.UniqueIdentifier, vendor_id)
      .query(`
        SELECT id FROM tender_vendors 
        WHERE tender_id = @tenderId AND vendor_id = @vendorId AND is_deleted = 0
      `);

    if (existingResult.recordset.length > 0) {
      // Update existing vendor
      await pool.request()
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .input('vendorId', sql.UniqueIdentifier, vendor_id)
        .input('quotedAmount', sql.Decimal(15, 2), quoted_amount || null)
        .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
        .input('isSelected', sql.Bit, is_selected ? 1 : 0)
        .input('isSuccessful', sql.Bit, is_successful ? 1 : 0)
        .query(`
          UPDATE tender_vendors
          SET 
            quoted_amount = @quotedAmount,
            remarks = @remarks,
            is_selected = @isSelected,
            is_successful = @isSuccessful,
            updated_at = GETDATE()
          WHERE tender_id = @tenderId AND vendor_id = @vendorId
        `);

      return res.json({ 
        success: true, 
        message: 'Bidder updated successfully',
        vendor_id,
        vendor_name,
        quoted_amount,
        remarks,
        is_selected: is_selected ? 1 : 0,
        is_successful: is_successful ? 1 : 0
      });
    } else {
      // Insert new vendor
      const newVendorId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, newVendorId)
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .input('vendorId', sql.UniqueIdentifier, vendor_id)
        .input('vendorName', sql.NVarChar(255), vendor_name)
        .input('quotedAmount', sql.Decimal(15, 2), quoted_amount || null)
        .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
        .input('isSelected', sql.Bit, is_selected ? 1 : 0)
        .input('isSuccessful', sql.Bit, is_successful ? 1 : 0)
        .query(`
          INSERT INTO tender_vendors (
            id, tender_id, vendor_id, vendor_name, quoted_amount, remarks, 
            is_selected, is_successful, is_awarded, created_at, updated_at
          ) VALUES (
            @id, @tenderId, @vendorId, @vendorName, @quotedAmount, @remarks,
            @isSelected, @isSuccessful, 0, GETDATE(), GETDATE()
          )
        `);

      return res.status(201).json({ 
        success: true,
        message: 'Bidder added successfully',
        id: newVendorId,
        vendor_id,
        vendor_name,
        quoted_amount,
        remarks,
        is_selected: is_selected ? 1 : 0,
        is_successful: is_successful ? 1 : 0
      });
    }
  } catch (error) {
    console.error('❌ Error saving bidder:', error);
    res.status(500).json({ 
      error: 'Failed to add/update bidder', 
      details: error.message 
    });
  }
});

// ============================================================================
// PUT /api/tenders/:id - Update tender
// ============================================================================
router.put('/:id', async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const { id } = req.params;
    const { items = [], ...tenderData } = req.body;

    tenderData.office_ids = normalizeIdList(tenderData.office_ids);
    tenderData.wing_ids = normalizeIdList(tenderData.wing_ids);
    tenderData.dec_ids = normalizeIdList(tenderData.dec_ids);

    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total'
    ];

    const updateRequest = transaction.request();
    updateRequest.input('id', sql.UniqueIdentifier, id);
    updateRequest.input('updated_at', sql.DateTime, new Date());

    let updateQuery = 'UPDATE tenders SET updated_at = @updated_at';

    for (const field of tenderFields) {
      if (tenderData[field] !== undefined) {
        updateQuery += `, ${field} = @${field}`;
        let value = tenderData[field];
        let sqlType = sql.NVarChar;

        if (field.endsWith('_date') || field.endsWith('_deadline')) {
          sqlType = sql.DateTime;
          value = value ? new Date(value) : null;
        } else if (field.endsWith('_value') || field.endsWith('_total') || field === 'quantity') {
          sqlType = sql.Decimal(15, 2);
          value = value ? parseFloat(value) : null;
        } else if (field.endsWith('_id')) {
          sqlType = sql.UniqueIdentifier;
        }

        updateRequest.input(field, sqlType, value);
      }
    }

    updateQuery += ' WHERE id = @id';
    await updateRequest.query(updateQuery);

    if (Array.isArray(items)) {
      await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');

      if (items.length > 0) {
        const tender_type = tenderData.tender_type || 'contract';
        const awardedVendorId = tenderData.vendor_id || tenderData.awarded_vendor_id;
        const now = new Date();

        for (const item of items) {
          const itemRequest = transaction.request();
          itemRequest.input('id', sql.UniqueIdentifier, uuidv4());
          itemRequest.input('tender_id', sql.UniqueIdentifier, id);
          itemRequest.input('created_at', sql.DateTime2, now);
          itemRequest.input('updated_at', sql.DateTime2, now);

          let itemVendorId = null;
          if (tender_type === 'annual-tender') {
            const vendorFromList = Array.isArray(item.vendor_ids) ? item.vendor_ids[0] : null;
            itemVendorId = item.vendor_id || vendorFromList || null;
            // Annual tender is a rate contract: items carry only price, not quantity.
            item.quantity = 1;
            item.total_amount = item.estimated_unit_price || 0;
          } else if (['contract', 'spot-purchase'].includes(tender_type)) {
            itemVendorId = awardedVendorId || item.vendor_id || null;
          }

          itemRequest.input('vendor_id', sql.UniqueIdentifier, itemVendorId || null);

          let itemInsertQuery = 'INSERT INTO tender_items (id, tender_id, created_at, updated_at, vendor_id';
          let itemValuesQuery = 'VALUES (@id, @tender_id, @created_at, @updated_at, @vendor_id';

          const itemFields = [
            'item_master_id', 'nomenclature', 'quantity', 'quantity_received',
            'estimated_unit_price', 'actual_unit_price', 'total_amount',
            'specifications', 'remarks', 'status'
          ];

          for (const field of itemFields) {
            if (item[field] !== undefined) {
              itemInsertQuery += `, ${field}`;
              itemValuesQuery += `, @${field}`;
              let value = item[field];
              let sqlType = sql.NVarChar;

              if (['quantity', 'quantity_received', 'estimated_unit_price', 'actual_unit_price', 'total_amount'].includes(field)) {
                if (field === 'quantity' || field === 'quantity_received') {
                  sqlType = sql.Int;
                  value = value ? parseInt(value, 10) : null;
                } else {
                  sqlType = sql.Decimal(15, 2);
                  value = value ? parseFloat(value) : null;
                }
              } else if (field === 'item_master_id') {
                sqlType = sql.UniqueIdentifier;
              }

              itemRequest.input(field, sqlType, value);
            }
          }

          itemInsertQuery += ') ' + itemValuesQuery + ')';
          await itemRequest.query(itemInsertQuery);
        }
      }
    }

    // Update bidders' is_successful status if bidders are provided
    const bidders = tenderData.bidders;
    if (Array.isArray(bidders) && bidders.length > 0) {
      for (const bidder of bidders) {
        if (bidder.vendor_id) {
          try {
            const bidderRequest = transaction.request();
            bidderRequest.input('tender_id', sql.UniqueIdentifier, id);
            bidderRequest.input('vendor_id', sql.UniqueIdentifier, bidder.vendor_id);
            bidderRequest.input('is_successful', sql.Bit, bidder.is_successful ? 1 : 0);
            
            await bidderRequest.query(`
              UPDATE tender_vendors 
              SET is_successful = @is_successful, updated_at = GETDATE()
              WHERE tender_id = @tender_id AND vendor_id = @vendor_id
            `);
          } catch (bidderErr) {
            }
        }
      }
    }

    await transaction.commit();
    res.json({ message: '✅ Tender updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error updating tender:', error);
    res.status(500).json({ error: 'Failed to update tender' });
  }
});

// ============================================================================
// PUT /api/tenders/:id/finalize - Finalize tender
// ============================================================================
router.put('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalized_by } = req.body;
    const pool = getPool();

    // Check if tender exists
    const tenderCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT is_finalized FROM tenders WHERE id = @id');

    if (tenderCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tenderCheck.recordset[0].is_finalized) {
      return res.status(400).json({ error: 'Tender is already finalized' });
    }

    // Update tender to finalized
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('finalized_by', sql.NVarChar(450), finalized_by || 'System')
      .query(`
        UPDATE tenders 
        SET is_finalized = 1,
            finalized_at = GETDATE(),
            finalized_by = @finalized_by,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ 
      success: true, 
      message: '✅ Tender finalized successfully',
      is_finalized: true,
      finalized_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error finalizing tender:', error);
    res.status(500).json({ error: 'Failed to finalize tender' });
  }
});

// ============================================================================
// PUT /api/tenders/:id/vendors/:vendorId - Update a specific bidder
// ============================================================================
router.put('/:id/vendors/:vendorId', async (req, res) => {
  try {
    const { id: tenderId, vendorId } = req.params;
    const { quoted_amount, remarks, is_selected, is_successful } = req.body;
    const pool = getPool();

    // Check if vendor exists in tender_vendors
    const check = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('vendorId', sql.UniqueIdentifier, vendorId)
      .query(`
        SELECT id FROM tender_vendors 
        WHERE tender_id = @tenderId AND vendor_id = @vendorId
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Bidder not found in this tender' });
    }

    // Update vendor
    await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('vendorId', sql.UniqueIdentifier, vendorId)
      .input('quotedAmount', sql.Decimal(15, 2), quoted_amount || null)
      .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
      .input('isSelected', sql.Bit, is_selected ? 1 : 0)
      .input('isSuccessful', sql.Bit, is_successful ? 1 : 0)
      .query(`
        UPDATE tender_vendors
        SET 
          quoted_amount = @quotedAmount,
          remarks = @remarks,
          is_selected = @isSelected,
          is_successful = @isSuccessful,
          updated_at = GETDATE()
        WHERE tender_id = @tenderId AND vendor_id = @vendorId
      `);

    res.json({ 
      success: true,
      message: 'Bidder updated successfully',
      vendor_id: vendorId,
      quoted_amount,
      remarks,
      is_selected: is_selected ? 1 : 0,
      is_successful: is_successful ? 1 : 0
    });
  } catch (error) {
    console.error('❌ Error updating bidder:', error);
    res.status(500).json({ 
      error: 'Failed to update bidder', 
      details: error.message 
    });
  }
});

// ============================================================================
// DELETE /api/tenders/:id/vendors/:vendorId - Remove a bidder from tender
// ============================================================================
router.delete('/:id/vendors/:vendorId', async (req, res) => {
  try {
    const { id: tenderId, vendorId } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    // Check if vendor exists
    const check = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('vendorId', sql.UniqueIdentifier, vendorId)
      .query(`
        SELECT id FROM tender_vendors 
        WHERE tender_id = @tenderId AND vendor_id = @vendorId
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Bidder not found' });
    }

    // Soft delete vendor from tender
    await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('vendorId', sql.UniqueIdentifier, vendorId)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE tender_vendors
        SET is_deleted = 1,
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        WHERE tender_id = @tenderId AND vendor_id = @vendorId
      `);

    res.json({ 
      success: true,
      message: 'Bidder removed successfully'
    });
  } catch (error) {
    console.error('❌ Error removing bidder:', error);
    res.status(500).json({ 
      error: 'Failed to remove bidder',
      details: error.message 
    });
  }
});

// ============================================================================
// DELETE /api/tenders/:id - Delete tender
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Soft delete tender
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE tenders
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      // Cascade soft delete related vendors
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE tender_vendors
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE tender_id = @tenderId
        `);

      // Cascade soft delete related items
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE tender_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE tender_id = @tenderId
        `);

      await transaction.commit();
      res.json({ message: '✅ Tender deleted successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error deleting tender:', error);
    res.status(500).json({ error: 'Failed to delete tender' });
  }
});

// ============================================================================
// POST /api/tenders/:id/restore - Restore deleted tender with items
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // Restore tender
      const tenderResult = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          UPDATE tenders
          SET is_deleted = 0,
              deleted_at = NULL,
              deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (tenderResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted tender not found' });
      }

      // Restore tender items
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE tender_items
          SET is_deleted = 0,
              deleted_at = NULL,
              deleted_by = NULL
          WHERE tender_id = @tenderId AND is_deleted = 1
        `);

      // Restore tender vendors
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE tender_vendors
          SET is_deleted = 0,
              deleted_at = NULL,
              deleted_by = NULL
          WHERE tender_id = @tenderId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ 
        success: true, 
        message: '✅ Tender restored successfully',
        tender: tenderResult.recordset[0]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring tender:', error);
    res.status(500).json({ error: 'Failed to restore tender' });
  }
});


module.exports = router;