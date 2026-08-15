// =====================================================================
// ANNUAL TENDER SYSTEM APIS
// =====================================================================

// 1. GET ALL ANNUAL TENDERS
app.get('/api/annual-tenders', async (req, res) => {
  try {
    const status = req.query.status || null;
    
    let query = `
      SELECT 
        id,
        tender_number,
        title,
        description,
        start_date,
        end_date,
        status,
        total_budget,
        remarks,
        created_by,
        created_at,
        updated_at
      FROM annual_tenders
      WHERE 1=1
    `;

    if (status) {
      query += ` AND status = @status`;
    }

    query += ` ORDER BY created_at DESC`;

    const request = pool.request();
    if (status) {
      request.input('status', sql.NVarChar(50), status);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching annual tenders:', error);
    res.status(500).json({ error: 'Failed to fetch annual tenders', details: error.message });
  }
});

// 2. GET SINGLE ANNUAL TENDER WITH DETAILS
app.get('/api/annual-tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get tender
    const tenderResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM annual_tenders WHERE id = @id`);

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Annual tender not found' });
    }

    const tender = tenderResult.recordset[0];

    // Get groups in this tender
    const groupsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          atg.id,
          atg.group_id,
          ig.group_code,
          ig.group_name,
          ig.description
        FROM annual_tender_groups atg
        INNER JOIN item_groups ig ON atg.group_id = ig.id
        WHERE atg.annual_tender_id = @tenderId
        ORDER BY ig.group_name
      `);

    // Get vendors assigned to this tender
    const vendorsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT DISTINCT
          atv.id,
          atv.vendor_id,
          atv.group_id,
          ig.group_name,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          atv.status
        FROM annual_tender_vendors atv
        INNER JOIN item_groups ig ON atv.group_id = ig.id
        INNER JOIN vendors v ON atv.vendor_id = v.id
        WHERE atv.annual_tender_id = @tenderId AND atv.status = 'Active'
        ORDER BY ig.group_name, v.vendor_name
      `);

    res.json({
      ...tender,
      groups: groupsResult.recordset,
      vendors: vendorsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching annual tender:', error);
    res.status(500).json({ error: 'Failed to fetch annual tender', details: error.message });
  }
});

// 3. CREATE ANNUAL TENDER
app.post('/api/annual-tenders', async (req, res) => {
  try {
    const { tender_number, title, description, start_date, end_date, total_budget, remarks, created_by, groupIds } = req.body;

    if (!tender_number || !title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = require('uuid').v4();

    // Insert tender
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('tender_number', sql.NVarChar(100), tender_number)
      .input('title', sql.NVarChar(255), title)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('status', sql.NVarChar(50), 'Active')
      .input('total_budget', sql.Decimal(15, 2), total_budget || null)
      .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
      .input('created_by', sql.NVarChar(450), created_by)
      .query(`
        INSERT INTO annual_tenders (id, tender_number, title, description, start_date, end_date, status, total_budget, remarks, created_by, created_at, updated_at)
        VALUES (@id, @tender_number, @title, @description, @start_date, @end_date, @status, @total_budget, @remarks, @created_by, GETDATE(), GETDATE())
      `);

    // Assign groups if provided
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      for (const groupId of groupIds) {
        const groupAssignId = require('uuid').v4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, groupAssignId)
          .input('tenderId', sql.UniqueIdentifier, id)
          .input('groupId', sql.UniqueIdentifier, groupId)
          .query(`
            INSERT INTO annual_tender_groups (id, annual_tender_id, group_id, created_at)
            VALUES (@id, @tenderId, @groupId, GETDATE())
          `);
      }
    }

    res.json({ success: true, id, message: 'Annual tender created successfully' });
  } catch (error) {
    console.error('❌ Error creating annual tender:', error);
    res.status(500).json({ error: 'Failed to create annual tender', details: error.message });
  }
});

// 4. UPDATE ANNUAL TENDER
app.put('/api/annual-tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, status, total_budget, remarks, updated_by, groupIds } = req.body;

    // Update tender
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('title', sql.NVarChar(255), title)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('status', sql.NVarChar(50), status)
      .input('total_budget', sql.Decimal(15, 2), total_budget || null)
      .input('remarks', sql.NVarChar(sql.MAX), remarks || null)
      .input('updated_by', sql.NVarChar(450), updated_by)
      .query(`
        UPDATE annual_tenders 
        SET title = @title, description = @description, start_date = @start_date, 
            end_date = @end_date, status = @status, total_budget = @total_budget, 
            remarks = @remarks, updated_by = @updated_by, updated_at = GETDATE()
        WHERE id = @id
      `);

    // Update groups if provided
    if (groupIds && Array.isArray(groupIds)) {
      // Delete existing group assignments
      await pool.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`DELETE FROM annual_tender_groups WHERE annual_tender_id = @tenderId`);

      // Insert new assignments
      for (const groupId of groupIds) {
        const groupAssignId = require('uuid').v4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, groupAssignId)
          .input('tenderId', sql.UniqueIdentifier, id)
          .input('groupId', sql.UniqueIdentifier, groupId)
          .query(`
            INSERT INTO annual_tender_groups (id, annual_tender_id, group_id, created_at)
            VALUES (@id, @tenderId, @groupId, GETDATE())
          `);
      }
    }

    res.json({ success: true, message: 'Annual tender updated successfully' });
  } catch (error) {
    console.error('❌ Error updating annual tender:', error);
    res.status(500).json({ error: 'Failed to update annual tender', details: error.message });
  }
});

// =====================================================================
// ITEM GROUPS APIS
// =====================================================================

// 5. GET ALL ITEM GROUPS
app.get('/api/item-groups', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT id, group_code, group_name, description, is_active, created_at
      FROM item_groups
      WHERE is_active = 1
      ORDER BY group_name
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching item groups:', error);
    res.status(500).json({ error: 'Failed to fetch item groups' });
  }
});

// 6. CREATE ITEM GROUP
app.post('/api/item-groups', async (req, res) => {
  try {
    const { group_code, group_name, description, itemIds, created_by } = req.body;

    if (!group_code || !group_name) {
      return res.status(400).json({ error: 'Group code and name are required' });
    }

    const id = require('uuid').v4();

    // Create group
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('group_code', sql.NVarChar(50), group_code)
      .input('group_name', sql.NVarChar(255), group_name)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('created_by', sql.NVarChar(450), created_by)
      .query(`
        INSERT INTO item_groups (id, group_code, group_name, description, is_active, created_by, created_at, updated_at)
        VALUES (@id, @group_code, @group_name, @description, 1, @created_by, GETDATE(), GETDATE())
      `);

    // Add items if provided
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      for (const itemId of itemIds) {
        const groupItemId = require('uuid').v4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, groupItemId)
          .input('groupId', sql.UniqueIdentifier, id)
          .input('itemId', sql.UniqueIdentifier, itemId)
          .query(`
            INSERT INTO group_items (id, group_id, item_master_id, created_at)
            VALUES (@id, @groupId, @itemId, GETDATE())
          `);
      }
    }

    res.json({ success: true, id, message: 'Item group created successfully' });
  } catch (error) {
    console.error('❌ Error creating item group:', error);
    res.status(500).json({ error: 'Failed to create item group', details: error.message });
  }
});

// 7. GET ITEMS IN A GROUP
app.get('/api/item-groups/:groupId/items', async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await pool.request()
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT 
          gi.id,
          gi.item_master_id,
          im.nomenclature,
          im.unit,
          im.category,
          gi.created_at
        FROM group_items gi
        INNER JOIN item_masters im ON gi.item_master_id = im.id
        WHERE gi.group_id = @groupId
        ORDER BY im.nomenclature
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching group items:', error);
    res.status(500).json({ error: 'Failed to fetch group items' });
  }
});

// =====================================================================
// VENDOR ASSIGNMENT APIS
// =====================================================================

// 8. ASSIGN VENDORS TO GROUPS IN TENDER
app.post('/api/annual-tenders/:tenderId/assign-vendors', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { categoryId, vendorIds, created_by } = req.body; // NEW FORMAT: categoryId, vendorIds array

    if (!tenderId || !categoryId || !vendorIds || !Array.isArray(vendorIds)) {
      return res.status(400).json({ error: 'Missing required fields: tenderId, categoryId, vendorIds' });
    }

    // Delete existing assignments for this tender and category
    await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('categoryId', sql.UniqueIdentifier, categoryId)
      .query(`DELETE FROM annual_tender_vendors 
              WHERE annual_tender_id = @tenderId AND category_id = @categoryId`);

    // Add new assignments
    for (const vendorId of vendorIds) {
      const id = require('uuid').v4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .input('categoryId', sql.UniqueIdentifier, categoryId)
        .input('vendorId', sql.UniqueIdentifier, vendorId)
        .input('created_by', sql.NVarChar(450), created_by || 'System')
        .query(`
          INSERT INTO annual_tender_vendors (id, annual_tender_id, category_id, vendor_id, assignment_date, status, created_by, created_at)
          VALUES (@id, @tenderId, @categoryId, @vendorId, GETDATE(), 'Active', @created_by, GETDATE())
        `);
    }

    res.json({ success: true, message: 'Vendors assigned successfully' });
  } catch (error) {
    console.error('❌ Error assigning vendors:', error);
    res.status(500).json({ error: 'Failed to assign vendors', details: error.message });
  }
});

// 9. GET VENDORS FOR A GROUP IN TENDER
app.get('/api/annual-tenders/:tenderId/groups/:groupId/vendors', async (req, res) => {
  try {
    const { tenderId, groupId } = req.params;

    const result = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT 
          atv.id,
          atv.vendor_id,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          v.email,
          v.phone,
          atv.status
        FROM annual_tender_vendors atv
        INNER JOIN vendors v ON atv.vendor_id = v.id
        WHERE atv.annual_tender_id = @tenderId 
          AND atv.group_id = @groupId
          AND atv.status = 'Active'
        ORDER BY v.vendor_name
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching group vendors:', error);
    res.status(500).json({ error: 'Failed to fetch group vendors' });
  }
});

// =====================================================================
// VENDOR PROPOSALS APIS
// =====================================================================

// 10. CREATE/UPDATE VENDOR PROPOSAL (ITEM-WISE PRICING)
app.post('/api/vendor-proposals', async (req, res) => {
  try {
    const { annual_tender_id, group_id, vendor_id, item_master_id, proposed_unit_price, created_by } = req.body;

    if (!annual_tender_id || !group_id || !vendor_id || !item_master_id || proposed_unit_price === null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if proposal exists
    const existingResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, annual_tender_id)
      .input('vendorId', sql.UniqueIdentifier, vendor_id)
      .input('itemId', sql.UniqueIdentifier, item_master_id)
      .query(`
        SELECT id FROM vendor_proposals 
        WHERE annual_tender_id = @tenderId 
          AND vendor_id = @vendorId 
          AND item_master_id = @itemId
      `);

    if (existingResult.recordset.length > 0) {
      // Update existing
      await pool.request()
        .input('tenderId', sql.UniqueIdentifier, annual_tender_id)
        .input('vendorId', sql.UniqueIdentifier, vendor_id)
        .input('itemId', sql.UniqueIdentifier, item_master_id)
        .input('price', sql.Decimal(15, 2), proposed_unit_price)
        .input('updated_by', sql.NVarChar(450), created_by)
        .query(`
          UPDATE vendor_proposals
          SET proposed_unit_price = @price, updated_by = @updated_by, updated_at = GETDATE()
          WHERE annual_tender_id = @tenderId 
            AND vendor_id = @vendorId 
            AND item_master_id = @itemId
        `);
    } else {
      // Create new
      const id = require('uuid').v4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('tenderId', sql.UniqueIdentifier, annual_tender_id)
        .input('groupId', sql.UniqueIdentifier, group_id)
        .input('vendorId', sql.UniqueIdentifier, vendor_id)
        .input('itemId', sql.UniqueIdentifier, item_master_id)
        .input('price', sql.Decimal(15, 2), proposed_unit_price)
        .input('created_by', sql.NVarChar(450), created_by)
        .query(`
          INSERT INTO vendor_proposals (id, annual_tender_id, group_id, vendor_id, item_master_id, proposed_unit_price, created_by, created_at, updated_at)
          VALUES (@id, @tenderId, @groupId, @vendorId, @itemId, @price, @created_by, GETDATE(), GETDATE())
        `);
    }

    res.json({ success: true, message: 'Proposal updated successfully' });
  } catch (error) {
    console.error('❌ Error saving proposal:', error);
    res.status(500).json({ error: 'Failed to save proposal', details: error.message });
  }
});

// 11. GET ALL VENDOR PROPOSALS FOR A TENDER
app.get('/api/annual-tenders/:tenderId/vendor-proposals', async (req, res) => {
  try {
    const { tenderId } = req.params;

    const result = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          vp.id,
          vp.vendor_id,
          vp.group_id,
          vp.item_master_id,
          vp.proposed_unit_price,
          ig.group_name,
          v.vendor_name,
          im.nomenclature,
          im.unit
        FROM vendor_proposals vp
        INNER JOIN item_groups ig ON vp.group_id = ig.id
        INNER JOIN vendors v ON vp.vendor_id = v.id
        INNER JOIN item_masters im ON vp.item_master_id = im.id
        WHERE vp.annual_tender_id = @tenderId
        ORDER BY ig.group_name, v.vendor_name, im.nomenclature
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// 12. GET VENDOR PROPOSALS FOR A GROUP (FOR PO CREATION)
app.get('/api/annual-tenders/:tenderId/groups/:groupId/proposals', async (req, res) => {
  try {
    const { tenderId, groupId } = req.params;

    const result = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT DISTINCT
          im.id as item_id,
          im.nomenclature,
          im.unit,
          (SELECT STRING_AGG(CONCAT(v.vendor_name, ' - ', vp.proposed_unit_price), '; ')
           FROM vendor_proposals vp
           INNER JOIN vendors v ON vp.vendor_id = v.id
           WHERE vp.annual_tender_id = @tenderId 
             AND vp.group_id = @groupId 
             AND vp.item_master_id = im.id) as vendor_quotes
        FROM item_masters im
        INNER JOIN group_items gi ON im.id = gi.item_master_id
        WHERE gi.group_id = @groupId
        ORDER BY im.nomenclature
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching group proposals:', error);
    res.status(500).json({ error: 'Failed to fetch group proposals' });
  }
});

