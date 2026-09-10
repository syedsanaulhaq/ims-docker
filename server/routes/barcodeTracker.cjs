// ============================================================================
// Barcode & QR Code Physical Asset Tracker Router
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || (!req.session.userId && !req.session.user)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/barcode/lookup - Look up physical asset by Serial Number or Barcode
// ============================================================================
router.get('/lookup', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Barcode or Serial number query is required' });
    }

    const pool = getPool();
    const searchTerm = query.trim();

    // Find the matching serial number record
    const serialResult = await pool.request()
      .input('queryExact', sql.NVarChar(255), searchTerm)
      .input('queryLike', sql.NVarChar(255), `%${searchTerm}%`)
      .query(`
        SELECT TOP 1
          sn.id AS serial_id,
          sn.delivery_id,
          sn.delivery_item_id,
          sn.item_master_id,
          sn.serial_number,
          ISNULL(sn.barcode_data, sn.serial_number) AS barcode_data,
          ISNULL(sn.status, 'IN_STOCK') AS status,
          sn.notes AS serial_notes,
          sn.created_at AS serial_created_at,
          sn.issued_to_user_id,
          sn.issued_to_wing_id,
          sn.issued_to_office_id,
          sn.issued_to_branch_id,
          sn.issuance_request_id,
          sn.issuance_item_id,
          sn.issued_at,
          sn.issued_by,
          -- Master Item details
          im.nomenclature,
          im.item_code,
          im.group_number,
          im.unit,
          im.manufacturer,
          im.specifications,
          COALESCE(cat.category_name, 'IT Equipment') AS category_name,
          ISNULL(sub.sub_category_name, '') AS subcategory_name,
          -- Receiving & Delivery details
          d.delivery_number,
          d.delivery_date,
          d.po_id,
          d.received_by,
          d.notes AS delivery_notes,
          poi.unit_price,
          -- Purchase Order & Vendor
          po.po_number,
          po.po_date,
          po.vendor_id,
          COALESCE(v.vendor_name, 'Vendor N/A') AS vendor_name,
          COALESCE(v.contact_person, '-') AS vendor_contact_person,
          COALESCE(v.phone, '-') AS vendor_phone,
          COALESCE(v.email, '-') AS vendor_email,
          -- Current Assignment / Recipient
          u.FullName AS recipient_name,
          u.UserName AS recipient_username,
          u.Role AS recipient_role,
          COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(desig.strDesignation, ''), '-') AS recipient_designation,
          w.Name AS wing_name,
          o.strOfficeName AS office_name,
          CAST(NULL AS NVARCHAR(100)) AS branch_name,
          -- Issuance Request
          sir.request_number,
          sir.purpose AS issuance_purpose,
          sir.urgency_level,
          sir.is_returnable,
          sir.expected_return_date
        FROM delivery_item_serial_numbers sn
        INNER JOIN item_masters im ON sn.item_master_id = im.id
        LEFT JOIN categories cat ON im.category_id = cat.id
        LEFT JOIN sub_categories sub ON im.sub_category_id = sub.id
        LEFT JOIN deliveries d ON sn.delivery_id = d.id
        LEFT JOIN delivery_items di ON sn.delivery_item_id = di.id
        LEFT JOIN purchase_orders po ON d.po_id = po.id
        LEFT JOIN purchase_order_items poi ON (po.id = poi.po_id AND sn.item_master_id = poi.item_master_id)
        LEFT JOIN vendors v ON CONVERT(NVARCHAR(100), po.vendor_id) = CONVERT(NVARCHAR(100), v.id)
        LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sn.issued_to_user_id) = CONVERT(NVARCHAR(450), u.Id)
        LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), sn.issued_to_user_id)
        LEFT JOIN tblUserDesignations desig ON u.intDesignationID = desig.intDesignationID
        LEFT JOIN WingsInformation w ON sn.issued_to_wing_id = w.Id
        LEFT JOIN tblOffices o ON sn.issued_to_office_id = o.intOfficeID
        LEFT JOIN stock_issuance_requests sir ON sn.issuance_request_id = sir.id
        WHERE sn.serial_number = @queryExact
           OR sn.barcode_data = @queryExact
           OR sn.serial_number LIKE @queryLike
           OR sn.barcode_data LIKE @queryLike
        ORDER BY CASE
          WHEN sn.serial_number = @queryExact OR sn.barcode_data = @queryExact THEN 1
          WHEN sn.serial_number LIKE @queryExact + '%' THEN 2
          ELSE 3
        END, sn.created_at DESC
      `);

    if (serialResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No physical asset found matching barcode/serial number "${searchTerm}"`
      });
    }

    const asset = serialResult.recordset[0];

    // Fetch full lifecycle history logs for this item
    const timelineResult = await pool.request()
      .input('serialId', sql.UniqueIdentifier, asset.serial_id)
      .input('serialNum', sql.NVarChar(255), asset.serial_number)
      .query(`
        SELECT
          id,
          serial_id,
          serial_number,
          action_type,
          actor_id,
          actor_name,
          recipient_user_id,
          recipient_name,
          wing_id,
          office_id,
          branch_id,
          reference_id,
          notes,
          created_at
        FROM item_serial_lifecycle_logs
        WHERE serial_id = @serialId OR serial_number = @serialNum
        ORDER BY created_at ASC
      `);

    // Transform timeline logs
    const timeline = timelineResult.recordset;

    // Fallback timeline entry if no logs exist yet
    if (timeline.length === 0) {
      timeline.push({
        id: `init-${asset.serial_id}`,
        serial_id: asset.serial_id,
        serial_number: asset.serial_number,
        action_type: 'ACQUIRED',
        actor_name: asset.received_by || 'Storekeeper',
        reference_id: asset.po_number || asset.delivery_number || 'PO Receipt',
        notes: `Received in store via Delivery #${asset.delivery_number || 'N/A'}`,
        created_at: asset.serial_created_at || asset.delivery_date
      });

      if (asset.status === 'ISSUED' && asset.issued_at) {
        timeline.push({
          id: `issue-${asset.serial_id}`,
          serial_id: asset.serial_id,
          serial_number: asset.serial_number,
          action_type: 'ISSUED',
          actor_name: asset.issued_by || 'Storekeeper',
          recipient_name: asset.recipient_name,
          reference_id: asset.request_number || 'Stock Issuance',
          notes: asset.issuance_purpose || 'Physically issued to recipient',
          created_at: asset.issued_at
        });
      }
    }

    res.json({
      success: true,
      data: {
        serial_id: asset.serial_id,
        serial_number: asset.serial_number,
        barcode_data: asset.barcode_data,
        status: asset.status,
        notes: asset.serial_notes,
        created_at: asset.serial_created_at,
        item: {
          item_master_id: asset.item_master_id,
          nomenclature: asset.nomenclature,
          item_code: asset.item_code,
          group_number: asset.group_number,
          unit: asset.unit,
          manufacturer: asset.manufacturer,
          specifications: asset.specifications,
          category_name: asset.category_name,
          subcategory_name: asset.subcategory_name
        },
        procurement: {
          delivery_id: asset.delivery_id,
          delivery_number: asset.delivery_number,
          delivery_date: asset.delivery_date,
          unit_price: asset.unit_price,
          po_number: asset.po_number,
          po_date: asset.po_date,
          vendor_name: asset.vendor_name,
          vendor_contact_person: asset.vendor_contact_person,
          vendor_phone: asset.vendor_phone,
          vendor_email: asset.vendor_email
        },
        assignment: asset.status === 'ISSUED' ? {
          issued_to_user_id: asset.issued_to_user_id,
          recipient_name: asset.recipient_name,
          recipient_username: asset.recipient_username,
          recipient_role: asset.recipient_role,
          recipient_designation: asset.recipient_designation,
          wing_name: asset.wing_name,
          office_name: asset.office_name,
          branch_name: asset.branch_name,
          issued_at: asset.issued_at,
          issuance_request_id: asset.issuance_request_id,
          request_number: asset.request_number,
          issuance_purpose: asset.issuance_purpose,
          urgency_level: asset.urgency_level,
          is_returnable: asset.is_returnable,
          expected_return_date: asset.expected_return_date
        } : null,
        timeline
      }
    });

  } catch (error) {
    console.error('❌ Error in barcode lookup:', error);
    res.status(500).json({ success: false, error: 'Failed to perform barcode lookup', details: error.message });
  }
});

// ============================================================================
// GET /api/barcode/available-serials/:itemMasterId - Get unassigned available serials for an item master
// ============================================================================
router.get('/available-serials/:itemMasterId', requireAuth, async (req, res) => {
  try {
    const { itemMasterId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
      .query(`
        SELECT
          sn.id,
          sn.delivery_id,
          sn.delivery_item_id,
          sn.item_master_id,
          sn.serial_number,
          ISNULL(sn.barcode_data, sn.serial_number) AS barcode_data,
          ISNULL(sn.status, 'IN_STOCK') AS status,
          sn.notes,
          sn.created_at
        FROM delivery_item_serial_numbers sn
        WHERE sn.item_master_id = @itemMasterId
          AND (sn.status = 'IN_STOCK' OR sn.status IS NULL OR sn.status = '')
        ORDER BY sn.created_at ASC
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (error) {
    console.error('❌ Error fetching available serials:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available serials', details: error.message });
  }
});

// ============================================================================
// GET /api/barcode/all-items - List tracked physical serial numbers/barcodes
// ============================================================================
router.get('/all-items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { status, limit = 100 } = req.query;

    let query = `
      SELECT TOP (${Math.min(Number(limit) || 100, 500)})
        sn.id,
        sn.serial_number,
        ISNULL(sn.barcode_data, sn.serial_number) AS barcode_data,
        ISNULL(sn.status, 'IN_STOCK') AS status,
        sn.created_at,
        sn.issued_at,
        im.nomenclature,
        im.item_code,
        u.FullName AS recipient_name,
        w.Name AS wing_name
      FROM delivery_item_serial_numbers sn
      INNER JOIN item_masters im ON sn.item_master_id = im.id
      LEFT JOIN AspNetUsers u ON CONVERT(NVARCHAR(450), sn.issued_to_user_id) = CONVERT(NVARCHAR(450), u.Id)
      LEFT JOIN WingsInformation w ON sn.issued_to_wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();
    if (status) {
      query += ` AND ISNULL(sn.status, 'IN_STOCK') = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    query += ` ORDER BY sn.created_at DESC`;

    const result = await request.query(query);
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (error) {
    console.error('❌ Error listing barcode items:', error);
    res.status(500).json({ success: false, error: 'Failed to list barcode items', details: error.message });
  }
});

module.exports = router;
