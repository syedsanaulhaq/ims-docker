// ============================================================================
// Vendor Routes
// ============================================================================
// All vendor management related endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

// ============================================================================
// GET /api/vendors - List all vendors
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { searchTerm, status, includeDeleted } = req.query;

    let query = `
      SELECT 
        id,
        vendor_name,
        vendor_code,
        contact_person,
        email,
        phone,
        address,
        city,
        status,
        created_at,
        is_deleted,
        deleted_at
      FROM vendors
      WHERE 1=1
    `;

    const request = pool.request();

    // Filter deleted records unless explicitly requested
    if (includeDeleted !== 'true') {
      query += ' AND is_deleted = 0';
    }

    if (searchTerm) {
      query += ' AND (vendor_name LIKE @searchTerm OR vendor_code LIKE @searchTerm)';
      request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }

    if (status && status !== 'all') {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, status);
    }

    query += ' ORDER BY vendor_name ASC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// ============================================================================
// GET /api/vendors/:id - Get vendor details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          vendor_name,
          vendor_code,
          contact_person,
          email,
          phone,
          address,
          city,
          country,
          status,
          created_at,
          updated_at
        FROM vendors
        WHERE id = @id AND is_deleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// ============================================================================
// POST /api/vendors - Create new vendor
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      vendor_name,
      vendor_code,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      status
    } = req.body;

    if (!vendor_name) {
      return res.status(400).json({ error: 'Vendor name is required' });
    }

    const vendorId = require('uuid').v4();

    await pool.request()
      .input('id', sql.UniqueIdentifier, vendorId)
      .input('vendor_name', sql.NVarChar, vendor_name)
      .input('vendor_code', sql.NVarChar, vendor_code || null)
      .input('contact_person', sql.NVarChar, contact_person || null)
      .input('email', sql.NVarChar, email || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('city', sql.NVarChar, city || null)
      .input('country', sql.NVarChar, country || null)
      .input('status', sql.NVarChar, status || 'active')
      .input('created_at', sql.DateTime, new Date())
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        INSERT INTO vendors (id, vendor_name, vendor_code, contact_person, email, phone, address, city, country, status, created_at, updated_at)
        VALUES (@id, @vendor_name, @vendor_code, @contact_person, @email, @phone, @address, @city, @country, @status, @created_at, @updated_at)
      `);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      vendorId
    });
  } catch (error) {
    console.error('❌ Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// ============================================================================
// PUT /api/vendors/:id - Update vendor
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_name,
      vendor_code,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      status
    } = req.body;

    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('vendor_name', sql.NVarChar, vendor_name)
      .input('vendor_code', sql.NVarChar, vendor_code || null)
      .input('contact_person', sql.NVarChar, contact_person || null)
      .input('email', sql.NVarChar, email || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('city', sql.NVarChar, city || null)
      .input('country', sql.NVarChar, country || null)
      .input('status', sql.NVarChar, status || 'active')
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE vendors
        SET vendor_name = @vendor_name,
            vendor_code = @vendor_code,
            contact_person = @contact_person,
            email = @email,
            phone = @phone,
            address = @address,
            city = @city,
            country = @country,
            status = @status,
            updated_at = @updated_at
        WHERE id = @id
      `);

    res.json({ message: '✅ Vendor updated successfully' });
  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// ============================================================================
// DELETE /api/vendors/:id - Delete vendor
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const deletedBy = req.user?.id || null;

    // Check if vendor is used in any tenders or POs
    const usageCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT COUNT(*) as count FROM tender_vendors WHERE vendor_id = @id AND is_deleted = 0
        UNION ALL
        SELECT COUNT(*) as count FROM purchase_orders WHERE vendor_id = @id AND is_deleted = 0
      `);

    if (usageCheck.recordset.some(r => r.count > 0)) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor - currently used in tenders or purchase orders' 
      });
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(`
        UPDATE vendors
        SET is_deleted = 1,
            deleted_at = GETDATE(),
            deleted_by = @deletedBy
        WHERE id = @id
      `);

    res.json({ message: '✅ Vendor deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// ============================================================================
// POST /api/vendors/:id/restore - Restore deleted vendor
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE vendors
        SET is_deleted = 0,
            deleted_at = NULL,
            deleted_by = NULL
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted vendor not found' });
    }

    res.json({ 
      success: true, 
      message: '✅ Vendor restored successfully',
      vendor: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error restoring vendor:', error);
    res.status(500).json({ error: 'Failed to restore vendor' });
  }
});


module.exports = router;