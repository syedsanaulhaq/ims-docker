// =====================================================================
// STOCK ISSUANCE WORKFLOW - BACKEND API ENDPOINTS
// =====================================================================
// Add these endpoints to your backend-server.cjs file
// =====================================================================

// =====================================================================
// 1. CHECK STOCK AVAILABILITY (When creating request)
// =====================================================================
app.post('/api/stock/check-availability', async (req, res) => {
  try {
    const { item_master_id, requested_quantity } = req.body;

    if (!item_master_id || !requested_quantity) {
      return res.status(400).json({ error: 'Item ID and quantity are required' });
    }

    const result = await pool.request()
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('requested_quantity', sql.Int, requested_quantity)
      .query(`
        SELECT * FROM dbo.fn_CheckStockAvailability(@item_master_id, @requested_quantity)
      `);

    if (result.recordset.length === 0) {
      return res.json({
        available: false,
        message: 'Item not found in inventory',
        stock_status: 'Not Found'
      });
    }

    const stockInfo = result.recordset[0];

    res.json({
      available: stockInfo.availability_status === 'Available',
      stock_info: stockInfo,
      message: stockInfo.availability_status === 'Available' 
        ? `✅ ${stockInfo.available_quantity} units available` 
        : stockInfo.availability_status === 'Partial'
        ? `⚠️ Only ${stockInfo.available_quantity} units available (requested ${requested_quantity})`
        : '❌ Out of stock'
    });

  } catch (error) {
    console.error('❌ Error checking stock availability:', error);
    res.status(500).json({ error: 'Failed to check stock availability', details: error.message });
  }
});

// =====================================================================
// 2. BATCH CHECK AVAILABILITY (For multiple items in a request)
// =====================================================================
app.post('/api/stock/check-availability-batch', async (req, res) => {
  try {
    const { items } = req.body; // Array of { item_master_id, requested_quantity }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const availability = [];
    let allAvailable = true;

    for (const item of items) {
      const result = await pool.request()
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('requested_quantity', sql.Int, item.requested_quantity)
        .query(`
          SELECT * FROM dbo.fn_CheckStockAvailability(@item_master_id, @requested_quantity)
        `);

      if (result.recordset.length > 0) {
        const stockInfo = result.recordset[0];
        availability.push({
          item_master_id: item.item_master_id,
          nomenclature: stockInfo.nomenclature,
          requested_quantity: item.requested_quantity,
          available_quantity: stockInfo.available_quantity,
          availability_status: stockInfo.availability_status,
          can_fulfill: stockInfo.availability_status === 'Available'
        });

        if (stockInfo.availability_status !== 'Available') {
          allAvailable = false;
        }
      } else {
        availability.push({
          item_master_id: item.item_master_id,
          availability_status: 'Not Found',
          can_fulfill: false
        });
        allAvailable = false;
      }
    }

    res.json({
      all_available: allAvailable,
      items: availability,
      summary: {
        total_items: items.length,
        available: availability.filter(a => a.can_fulfill).length,
        unavailable: availability.filter(a => !a.can_fulfill).length
      }
    });

  } catch (error) {
    console.error('❌ Error checking batch availability:', error);
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
});

// =====================================================================
// 3. SEARCH ITEMS WITH STOCK AVAILABILITY
// =====================================================================
app.get('/api/stock/search-with-availability', async (req, res) => {
  try {
    const { search, category_id, sub_category_id, item_type } = req.query;

    let query = `
      SELECT 
        im.id as item_master_id,
        im.nomenclature,
        im.item_code,
        im.description,
        c.category_name,
        c.item_type,
        sc.sub_category_name,
        im.unit_price,
        cis.current_quantity,
        cis.available_quantity,
        cis.reserved_quantity,
        cis.minimum_stock_level,
        CASE 
          WHEN cis.available_quantity = 0 THEN 'Out of Stock'
          WHEN cis.available_quantity <= cis.minimum_stock_level THEN 'Low Stock'
          ELSE 'Available'
        END as stock_status
      FROM item_masters im
      INNER JOIN categories c ON im.category_id = c.id
      LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE im.status = 'Active'
    `;

    const request = pool.request();

    if (search) {
      query += ` AND (im.nomenclature LIKE @search OR im.item_code LIKE @search OR im.description LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (category_id) {
      query += ` AND im.category_id = @category_id`;
      request.input('category_id', sql.NVarChar, category_id);
    }

    if (sub_category_id) {
      query += ` AND im.sub_category_id = @sub_category_id`;
      request.input('sub_category_id', sql.NVarChar, sub_category_id);
    }

    if (item_type) {
      query += ` AND c.item_type = @item_type`;
      request.input('item_type', sql.NVarChar, item_type);
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);

    res.json({
      items: result.recordset,
      total: result.recordset.length,
      available_items: result.recordset.filter(i => i.stock_status === 'Available').length,
      low_stock_items: result.recordset.filter(i => i.stock_status === 'Low Stock').length,
      out_of_stock_items: result.recordset.filter(i => i.stock_status === 'Out of Stock').length
    });

  } catch (error) {
    console.error('❌ Error searching items with availability:', error);
    res.status(500).json({ error: 'Failed to search items', details: error.message });
  }
});

// =====================================================================
// 4. ISSUE STOCK ITEMS (After approval)
// =====================================================================
app.post('/api/stock-issuance/issue/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { issued_by, issued_by_name, issuance_notes } = req.body;

    if (!issued_by || !issued_by_name) {
      return res.status(400).json({ error: 'Issued by information is required' });
    }

    // Call the stored procedure
    await pool.request()
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('issued_by', sql.UniqueIdentifier, issued_by)
      .input('issued_by_name', sql.NVarChar, issued_by_name)
      .input('issuance_notes', sql.NVarChar, issuance_notes || null)
      .execute('sp_IssueStockItems');

    res.json({
      success: true,
      message: 'Stock items issued successfully and inventory updated',
      request_id: requestId
    });

  } catch (error) {
    console.error('❌ Error issuing stock:', error);
    res.status(500).json({ 
      error: 'Failed to issue stock items', 
      details: error.message 
    });
  }
});

// =====================================================================
// 5. GET USER'S ISSUED ITEMS HISTORY
// =====================================================================
app.get('/api/issued-items/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, is_returnable, from_date, to_date } = req.query;

    let query = `
      SELECT * FROM vw_UserIssuedItemsHistory
      WHERE issued_to_user_id = @userId
    `;

    const request = pool.request().input('userId', sql.UniqueIdentifier, userId);

    if (status) {
      query += ` AND status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    if (is_returnable !== undefined) {
      query += ` AND is_returnable = @is_returnable`;
      request.input('is_returnable', sql.Bit, is_returnable === 'true' ? 1 : 0);
    }

    if (from_date) {
      query += ` AND issued_at >= @from_date`;
      request.input('from_date', sql.Date, from_date);
    }

    if (to_date) {
      query += ` AND issued_at <= @to_date`;
      request.input('to_date', sql.Date, to_date);
    }

    query += ` ORDER BY issued_at DESC`;

    const result = await request.query(query);

    // Calculate summary statistics
    const summary = {
      total_items: result.recordset.length,
      total_value: result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0),
      returnable_items: result.recordset.filter(i => i.is_returnable).length,
      not_returned: result.recordset.filter(i => i.is_returnable && i.return_status === 'Not Returned').length,
      overdue: result.recordset.filter(i => i.current_return_status === 'Overdue').length
    };

    res.json({
      items: result.recordset,
      summary: summary
    });

  } catch (error) {
    console.error('❌ Error fetching user issued items:', error);
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});

// =====================================================================
// 6. GET ALL ISSUED ITEMS (With filters)
// =====================================================================
app.get('/api/issued-items', async (req, res) => {
  try {
    const { office_id, wing_id, item_master_id, status, return_status, from_date, to_date } = req.query;

    let query = `SELECT * FROM vw_UserIssuedItemsHistory WHERE 1=1`;
    const request = pool.request();

    if (office_id) {
      query += ` AND issued_to_office_id = @office_id`;
      request.input('office_id', sql.Int, parseInt(office_id));
    }

    if (wing_id) {
      query += ` AND issued_to_wing_id = @wing_id`;
      request.input('wing_id', sql.Int, parseInt(wing_id));
    }

    if (item_master_id) {
      query += ` AND item_master_id = @item_master_id`;
      request.input('item_master_id', sql.UniqueIdentifier, item_master_id);
    }

    if (status) {
      query += ` AND status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    if (return_status) {
      query += ` AND return_status = @return_status`;
      request.input('return_status', sql.NVarChar, return_status);
    }

    if (from_date) {
      query += ` AND issued_at >= @from_date`;
      request.input('from_date', sql.Date, from_date);
    }

    if (to_date) {
      query += ` AND issued_at <= @to_date`;
      request.input('to_date', sql.Date, to_date);
    }

    query += ` ORDER BY issued_at DESC`;

    const result = await request.query(query);

    res.json({
      items: result.recordset,
      total: result.recordset.length
    });

  } catch (error) {
    console.error('❌ Error fetching issued items:', error);
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});

// =====================================================================
// 7. RETURN ISSUED ITEMS
// =====================================================================
app.post('/api/issued-items/return/:ledgerId', async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { return_quantity, returned_by, return_notes, item_condition } = req.body;

    if (!returned_by) {
      return res.status(400).json({ error: 'Returned by information is required' });
    }

    await pool.request()
      .input('ledger_id', sql.UniqueIdentifier, ledgerId)
      .input('return_quantity', sql.Int, return_quantity)
      .input('returned_by', sql.NVarChar, returned_by)
      .input('return_notes', sql.NVarChar, return_notes || null)
      .input('item_condition', sql.NVarChar, item_condition || 'Good')
      .execute('sp_ReturnIssuedItems');

    res.json({
      success: true,
      message: 'Item returned successfully',
      ledger_id: ledgerId
    });

  } catch (error) {
    console.error('❌ Error returning item:', error);
    res.status(500).json({ error: 'Failed to return item', details: error.message });
  }
});

// =====================================================================
// 8. GET STOCK AVAILABILITY DASHBOARD
// =====================================================================
app.get('/api/stock/availability-dashboard', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        stock_status,
        COUNT(*) as count,
        SUM(available_stock_value) as total_value,
        item_classification
      FROM vw_StockAvailabilityDetails
      GROUP BY stock_status, item_classification
      ORDER BY stock_status
    `);

    // Get low stock items
    const lowStockResult = await pool.request().query(`
      SELECT TOP 10 * 
      FROM vw_StockAvailabilityDetails
      WHERE stock_status IN ('Low Stock', 'Reorder Required')
      ORDER BY available_quantity ASC
    `);

    // Get out of stock items
    const outOfStockResult = await pool.request().query(`
      SELECT * 
      FROM vw_StockAvailabilityDetails
      WHERE stock_status = 'Out of Stock'
      ORDER BY nomenclature
    `);

    res.json({
      summary: result.recordset,
      low_stock_items: lowStockResult.recordset,
      out_of_stock_items: outOfStockResult.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching availability dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard', details: error.message });
  }
});

// =====================================================================
// 9. GET PENDING RETURNS (Overdue items)
// =====================================================================
app.get('/api/issued-items/pending-returns', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT *
      FROM vw_UserIssuedItemsHistory
      WHERE is_returnable = 1
        AND return_status = 'Not Returned'
        AND expected_return_date < CAST(GETDATE() AS DATE)
      ORDER BY expected_return_date ASC
    `);

    res.json({
      overdue_items: result.recordset,
      total_overdue: result.recordset.length,
      total_value_at_risk: result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0)
    });

  } catch (error) {
    console.error('❌ Error fetching pending returns:', error);
    res.status(500).json({ error: 'Failed to fetch pending returns', details: error.message });
  }
});

// =====================================================================
// USAGE NOTES:
// =====================================================================
/*
  1. Add these endpoints to your backend-server.cjs file
  
  2. When user creates a stock issuance request:
     - Call /api/stock/check-availability-batch to verify all items are available
     - Show availability status to user before submission
  
  3. After request is approved:
     - Admin clicks "Issue Items" button
     - Call /api/stock-issuance/issue/:requestId
     - This automatically:
       * Deducts stock from inventory
       * Creates records in issued_items_ledger
       * Updates request status to "Issued"
  
  4. To view user's issued items:
     - Call /api/issued-items/user/:userId
     - Shows complete history with return status
  
  5. To return items:
     - Call /api/issued-items/return/:ledgerId
     - Stock is added back to inventory (if in good condition)
  
  6. Dashboard widgets can use:
     - /api/stock/availability-dashboard - Stock overview
     - /api/issued-items/pending-returns - Overdue items alert
*/

