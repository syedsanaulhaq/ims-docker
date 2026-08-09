const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Tender items route is working!', timestamp: new Date() });
});

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * POST /api/tender-items/bulk-upload
 * Bulk upload tender items from CSV file
 * 
 * CSV Format:
 * item_code OR item_name, vendor_id OR vendor_name, unit_price, specifications, remarks
 */
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    
    // Get bidders list from request body (sent as JSON string)
    let bidders = [];
    try {
      if (req.body.bidders) {
        bidders = JSON.parse(req.body.bidders);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse bidders JSON:', parseError);
      return res.status(400).json({ 
        error: 'Invalid bidders data', 
        details: parseError.message 
      });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    let records;
    
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true // Handle UTF-8 BOM
      });
    } catch (parseError) {
      console.error('❌ CSV parse error:', parseError);
      return res.status(400).json({ 
        error: 'Failed to parse CSV file', 
        details: parseError.message 
      });
    }


    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Get database connection
    const pool = getPool();
    
    // Fetch all item masters for lookup
    const itemMastersResult = await pool.request().query(`
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature,
        im.category_id,
        c.category_name,
        c.description as category_description
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE im.status = 'Active'
    `);

    // Create two maps: one by item_code, one by nomenclature (item_name)
    const itemsByCode = new Map();
    const itemsByName = new Map();
    
    itemMastersResult.recordset.forEach(item => {
      if (item.item_code) {
        itemsByCode.set(item.item_code.toLowerCase(), item);
      }
      if (item.nomenclature) {
        itemsByName.set(item.nomenclature.toLowerCase(), item);
      }
    });

    
    // Create vendor lookup map
    const vendorsByName = new Map();
    const vendorsById = new Map();
    
    bidders.forEach(vendor => {
      if (vendor.vendor_id) {
        vendorsById.set(vendor.vendor_id, vendor);
      }
      if (vendor.vendor_name) {
        vendorsByName.set(vendor.vendor_name.toLowerCase(), vendor);
      }
    });


    // Process each record
    const items = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        // Look up item by item_code OR item_name
        const itemCode = record.item_code?.trim();
        const itemName = record.item_name?.trim();
        
        if (!itemCode && !itemName) {
          errors.push({ 
            row: rowNum, 
            record: record,
            error: 'Missing both item_code and item_name - provide at least one' 
          });
          continue;
        }

        // Try to find item master
        let itemMaster = null;
        if (itemCode) {
          itemMaster = itemsByCode.get(itemCode.toLowerCase());
        }
        if (!itemMaster && itemName) {
          itemMaster = itemsByName.get(itemName.toLowerCase());
        }

        if (!itemMaster) {
          const searchTerm = itemCode || itemName;
          const searchType = itemCode ? 'item_code' : 'item_name';
          errors.push({ 
            row: rowNum,
            record: record,
            error: `${searchType} '${searchTerm}' not found in item masters` 
          });
          continue;
        }

        // Parse unit_price (required)
        let unitPrice = 0;
        if (record.unit_price) {
          unitPrice = parseFloat(record.unit_price);
          if (isNaN(unitPrice)) {
            errors.push({ 
              row: rowNum,
              record: record,
              error: `Invalid unit_price: ${record.unit_price}` 
            });
            continue;
          }
        }

        // Look up vendor by vendor_id OR vendor_name
        let vendorId = '';
        const inputVendorId = record.vendor_id?.trim();
        const inputVendorName = record.vendor_name?.trim();
        
        if (inputVendorId) {
          const vendor = vendorsById.get(inputVendorId);
          if (vendor) {
            vendorId = vendor.vendor_id;
          } else {
            errors.push({ 
              row: rowNum,
              record: record,
              error: `vendor_id '${inputVendorId}' not found in bidders list` 
            });
            continue;
          }
        } else if (inputVendorName) {
          const vendor = vendorsByName.get(inputVendorName.toLowerCase());
          if (vendor) {
            vendorId = vendor.vendor_id;
          } else {
            errors.push({ 
              row: rowNum,
              record: record,
              error: `vendor_name '${inputVendorName}' not found in bidders list` 
            });
            continue;
          }
        }
        // If neither vendor_id nor vendor_name provided, vendorId stays empty (optional)

        // Build tender item object
        const tenderItem = {
          item_master_id: itemMaster.id,
          item_code: itemMaster.item_code,
          nomenclature: itemMaster.nomenclature,
          category_name: itemMaster.category_name,
          category_description: itemMaster.category_description,
          estimated_unit_price: unitPrice,
          vendor_id: vendorId,
          specifications: record.specifications?.trim() || '',
          remarks: record.remarks?.trim() || ''
        };

        items.push(tenderItem);

      } catch (error) {
        console.error(`❌ Row ${rowNum} error:`, error);
        errors.push({ 
          row: rowNum,
          record: record,
          error: error.message 
        });
      }
    }


    res.json({
      success: true,
      message: `Processed ${items.length} items`,
      items: items,
      errors: errors,
      total: records.length,
      successful: items.length,
      failed: errors.length
    });

  } catch (error) {
    console.error('❌ Bulk upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV file', 
      details: error.message 
    });
  }
});

module.exports = router;