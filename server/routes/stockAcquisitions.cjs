// ============================================================================
// Stock Acquisitions Routes - MILESTONE-1
// ============================================================================
// Handles opening balance entries and stock acquisition tracking
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// GET /api/stock-acquisitions/system-status
// Check if opening balance is completed and get go-live date
// ============================================================================
router.get('/system-status', async (req, res) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        (SELECT setting_value FROM system_settings WHERE setting_key = 'go_live_date') AS go_live_date,
        (SELECT setting_value FROM system_settings WHERE setting_key = 'opening_balance_completed') AS opening_balance_completed,
        (SELECT COUNT(*) FROM opening_balance_entries) AS total_opening_balance_entries,
        (SELECT MIN(acquisition_date) FROM opening_balance_entries) AS earliest_opening_balance_date
    `);
    
    const status = result.recordset[0] || {};
    
    res.json({
      success: true,
      go_live_date: status.go_live_date,
      opening_balance_completed: status.opening_balance_completed === 'true',
      total_opening_balance_entries: status.total_opening_balance_entries || 0,
      earliest_opening_balance_date: status.earliest_opening_balance_date,
      message: status.opening_balance_completed === 'true' 
        ? `System go-live date: ${status.go_live_date}. All deliveries must be on or after this date.`
        : 'Opening balance not yet completed. Please enter opening balance before processing deliveries.'
    });
  } catch (error) {
    console.error('❌ Error fetching system status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system status',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/stock-acquisitions/go-live-status (alias for system-status)
// ============================================================================
router.get('/go-live-status', async (req, res) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        (SELECT setting_value FROM system_settings WHERE setting_key = 'go_live_date') AS go_live_date,
        (SELECT setting_value FROM system_settings WHERE setting_key = 'opening_balance_completed') AS opening_balance_completed,
        (SELECT COUNT(*) FROM opening_balance_entries) AS total_opening_balance_entries,
        (SELECT MIN(acquisition_date) FROM opening_balance_entries) AS earliest_opening_balance_date
    `);
    
    const status = result.recordset[0] || {};
    
    res.json({
      success: true,
      go_live_date: status.go_live_date,
      opening_balance_completed: status.opening_balance_completed === 'true',
      total_opening_balance_entries: status.total_opening_balance_entries || 0,
      earliest_opening_balance_date: status.earliest_opening_balance_date,
      message: status.opening_balance_completed === 'true' 
        ? `System go-live date: ${status.go_live_date}. All deliveries must be on or after this date.`
        : 'Opening balance not yet completed. Please enter opening balance before processing deliveries.'
    });
  } catch (error) {
    console.error('❌ Error fetching go-live status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch go-live status',
      details: error.message 
    });
  }
});

// ============================================================================
// PUT /api/stock-acquisitions/opening-balance-status
// Update opening balance status (mark as Completed or Pending)
// ============================================================================
router.put('/opening-balance-status', async (req, res) => {
  try {
    const { status, go_live_date } = req.body;
    
    if (!status || !['completed', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "completed" or "pending"' });
    }

    const pool = await getPool();
    
    if (status === 'completed') {
      // Mark as completed with go-live date
      const effectiveDate = go_live_date || new Date().toISOString().split('T')[0];
      await pool.request()
        .input('go_live_date', sql.NVarChar, effectiveDate)
        .query(`
          UPDATE system_settings 
          SET setting_value = @go_live_date, updated_at = GETDATE()
          WHERE setting_key = 'go_live_date';
          
          UPDATE system_settings 
          SET setting_value = 'true', updated_at = GETDATE()
          WHERE setting_key = 'opening_balance_completed';
        `);
      
      
      res.json({
        success: true,
        message: `Opening balance marked as completed. Go-live date set to ${effectiveDate}`,
        status: 'completed',
        go_live_date: effectiveDate
      });
    } else {
      // Mark as pending (reopen for edits)
      await pool.request().query(`
        UPDATE system_settings 
        SET setting_value = 'false', updated_at = GETDATE()
        WHERE setting_key = 'opening_balance_completed';
      `);
      // Note: We keep go_live_date so they can see what it was
      
      
      res.json({
        success: true,
        message: 'Opening balance marked as pending. You can now make edits.',
        status: 'pending'
      });
    }
  } catch (error) {
    console.error('❌ Error updating opening balance status:', error);
    res.status(500).json({ 
      error: 'Failed to update opening balance status',
      details: error.message 
    });
  }
});

// ============================================================================
// POST /api/stock-acquisitions/opening-balance
// Create opening balance entries for existing stock
// ============================================================================
router.post('/opening-balance', async (req, res) => {
  try {
    const {
      tender_id,            // NEW: Link to existing tender
      tender_reference,
      tender_title,
      source_type,
      acquisition_date,
      remarks,
      items,
      financial_year       // NEW: Financial year for the entry
    } = req.body;

    // Get current user ID from session
    const entered_by = req.session?.userId;
    
    
    if (!entered_by) {
      console.error('❌ Authentication failed - no userId in session');
      return res.status(401).json({ 
        error: 'Authentication required. Please refresh the page and try again.' 
      });
    }

    // Validation: Only items are required - reference is optional
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        error: 'At least one item is required' 
      });
    }

    // Auto-generate reference if not provided
    const finalReference = tender_reference || `Opening Balance - ${new Date().toISOString().split('T')[0]}`;
    
    // Request status controls overall workflow state in system_settings.
    // Keep row status ACTIVE so saved entries remain editable/visible in list queries.
    const entryStatus = req.body.status || 'pending';
    const rowStatus = 'ACTIVE';

    const pool = await getPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // Backward-compatibility: production may lag behind latest schema migrations.
      const schemaFlagsResult = await transaction.request().query(`
        SELECT
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('opening_balance_entries')
              AND name = 'financial_year'
          ) THEN 1 ELSE 0 END AS opening_has_financial_year,
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('opening_balance_entries')
              AND name = 'processed_to_stock'
          ) THEN 1 ELSE 0 END AS opening_has_processed_to_stock,
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('stock_acquisitions')
              AND name = 'financial_year'
          ) THEN 1 ELSE 0 END AS stock_has_financial_year
      `);

      const schemaFlags = schemaFlagsResult.recordset[0] || {
        opening_has_financial_year: 0,
        opening_has_processed_to_stock: 0,
        stock_has_financial_year: 0
      };

      const createdEntries = [];

      // Get the financial year to use - from request or auto-detect
      const fyToUse = financial_year || getCurrentFinancialYear();
      
      // Create opening balance entry for each item
      for (const item of items) {
        const entryId = uuidv4();

        await transaction.request()
          .input('id', sql.UniqueIdentifier, entryId)
          .input('tender_id', sql.UniqueIdentifier, tender_id || null)  // Save tender_id if provided
          .input('tender_reference', sql.NVarChar, finalReference)  // Use auto-generated if not provided
          .input('tender_title', sql.NVarChar, tender_title || null)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('quantity_received', sql.Int, item.quantity_received)
          .input('quantity_already_issued', sql.Int, item.quantity_already_issued || 0)
          .input('unit_cost', sql.Decimal(15, 2), item.unit_cost || null)
          .input('source_type', sql.NVarChar, source_type || 'OPENING_BALANCE')
          .input('acquisition_date', sql.Date, acquisition_date || new Date())
          .input('entered_by', sql.NVarChar, entered_by)  // NVARCHAR to match AspNetUsers.Id
          .input('remarks', sql.NVarChar, remarks || null)
          .input('status', sql.NVarChar, rowStatus)
          .input('financial_year', sql.NVarChar, fyToUse)
          .query(schemaFlags.opening_has_financial_year ? `
            INSERT INTO opening_balance_entries (
              id, tender_id, tender_reference, tender_title, item_master_id,
              quantity_received, quantity_already_issued, unit_cost,
              source_type, acquisition_date, entered_by, remarks, status, financial_year
            )
            VALUES (
              @id, @tender_id, @tender_reference, @tender_title, @item_master_id,
              @quantity_received, @quantity_already_issued, @unit_cost,
              @source_type, @acquisition_date, @entered_by, @remarks, @status, @financial_year
            )
          ` : `
            INSERT INTO opening_balance_entries (
              id, tender_id, tender_reference, tender_title, item_master_id,
              quantity_received, quantity_already_issued, unit_cost,
              source_type, acquisition_date, entered_by, remarks, status
            )
            VALUES (
              @id, @tender_id, @tender_reference, @tender_title, @item_master_id,
              @quantity_received, @quantity_already_issued, @unit_cost,
              @source_type, @acquisition_date, @entered_by, @remarks, @status
            )
          `);

        // Immediately process to stock_acquisitions
        const acqNumber = await generateAcquisitionNumber(transaction);
        const acqId = uuidv4();

        await transaction.request()
          .input('acq_id', sql.UniqueIdentifier, acqId)
          .input('acq_number', sql.NVarChar, acqNumber)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('quantity_received', sql.Decimal(15, 2), item.quantity_received)
          .input('quantity_issued', sql.Decimal(15, 2), item.quantity_already_issued || 0)
          .input('unit_cost', sql.Decimal(15, 2), item.unit_cost || null)
          .input('delivery_date', sql.Date, acquisition_date || new Date())
          .input('processed_by', sql.NVarChar, entered_by)
          .input('notes', sql.NVarChar, `Opening Balance: ${finalReference}`)
          .input('financial_year', sql.NVarChar, fyToUse)
          .query(schemaFlags.stock_has_financial_year ? `
            INSERT INTO stock_acquisitions (
              id, acquisition_number, item_master_id,
              quantity_received, quantity_issued,
              unit_cost, delivery_date, processed_by, status, notes, financial_year
            )
            VALUES (
              @acq_id, @acq_number, @item_master_id,
              @quantity_received, @quantity_issued,
              @unit_cost, @delivery_date, @processed_by, 'completed', @notes, @financial_year
            )
          ` : `
            INSERT INTO stock_acquisitions (
              id, acquisition_number, item_master_id,
              quantity_received, quantity_issued,
              unit_cost, delivery_date, processed_by, status, notes
            )
            VALUES (
              @acq_id, @acq_number, @item_master_id,
              @quantity_received, @quantity_issued,
              @unit_cost, @delivery_date, @processed_by, 'completed', @notes
            )
          `);

        // Mark opening balance as processed
        if (schemaFlags.opening_has_processed_to_stock) {
          await transaction.request()
            .input('entry_id', sql.UniqueIdentifier, entryId)
            .query(`
              UPDATE opening_balance_entries
              SET processed_to_stock = 1
              WHERE id = @entry_id
            `);
        }

        // Update current_inventory_stock (this is what the inventory dashboard reads)
        const currentQty = item.quantity_received - (item.quantity_already_issued || 0);
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('current_quantity', sql.Decimal(15, 2), currentQty)
          .input('transaction_date', sql.DateTime2, acquisition_date || new Date())
          .query(`
            IF EXISTS (SELECT 1 FROM current_inventory_stock WHERE item_master_id = @item_master_id)
            BEGIN
              UPDATE current_inventory_stock
              SET current_quantity = current_quantity + @current_quantity,
                  last_transaction_date = @transaction_date,
                  last_transaction_type = 'OPENING_BALANCE',
                  last_updated = GETDATE()
              WHERE item_master_id = @item_master_id
            END
            ELSE
            BEGIN
              INSERT INTO current_inventory_stock (
                id, item_master_id, current_quantity, 
                last_transaction_date, last_transaction_type, last_updated
              )
              VALUES (
                NEWID(), @item_master_id, @current_quantity,
                @transaction_date, 'OPENING_BALANCE', GETDATE()
              )
            END
          `);

        createdEntries.push({
          entryId,
          acqNumber,
          item: item.nomenclature,
          quantity_available: currentQty
        });
      }

      // Set system go-live date if this is the first opening balance entry
      const goLiveDateValue = acquisition_date || new Date().toISOString().split('T')[0];
      
      // Use entryStatus from request
      const isCompleted = entryStatus === 'completed';
      
      await transaction.request()
        .input('go_live_date', sql.NVarChar, goLiveDateValue)
        .input('is_completed', sql.NVarChar, isCompleted ? 'true' : 'false')
        .query(`
          -- Set go_live_date if not already set (first opening balance)
          UPDATE system_settings 
          SET setting_value = @go_live_date, updated_at = GETDATE()
          WHERE setting_key = 'go_live_date' AND (setting_value IS NULL OR setting_value = '');
          
          -- Update opening balance completed status based on user selection
          UPDATE system_settings 
          SET setting_value = @is_completed, updated_at = GETDATE()
          WHERE setting_key = 'opening_balance_completed';
        `);

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `Created ${createdEntries.length} opening balance entries`,
        entries: createdEntries,
        go_live_date: goLiveDateValue,
        status: entryStatus
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating opening balance:', error);
    res.status(500).json({ 
      error: 'Failed to create opening balance',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/stock-acquisitions/opening-balance
// Get all opening balance entries (optionally filtered by financial year)
// ============================================================================
router.get('/opening-balance', async (req, res) => {
  try {
    const { financial_year } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT 
        obe.id,
        obe.tender_id,
        obe.tender_reference,
        obe.tender_title,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit,
        c.category_name AS category_name,
        obe.quantity_received,
        obe.quantity_already_issued,
        (obe.quantity_received - obe.quantity_already_issued) AS quantity_available,
        obe.unit_cost,
        obe.source_type,
        obe.acquisition_date,
        obe.entry_date,
        obe.entered_by,
        obe.remarks,
        obe.status,
        obe.financial_year,
        fy.year_label
      FROM opening_balance_entries obe
      JOIN item_masters im ON obe.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN financial_years fy ON obe.financial_year = fy.year_code
      WHERE UPPER(ISNULL(obe.status, 'ACTIVE')) IN ('ACTIVE', 'PENDING', 'COMPLETED')
    `;
    
    let request = pool.request();
    
    if (financial_year) {
      query += ` AND obe.financial_year = @financial_year`;
      request = request.input('financial_year', sql.NVarChar, financial_year);
    }
    
    query += ` ORDER BY obe.entry_date DESC`;
    
    const result = await request.query(query);

    res.json({
      success: true,
      entries: result.recordset,
      current_year: getCurrentFinancialYear()
    });

  } catch (error) {
    console.error('❌ Error fetching opening balance entries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch opening balance entries',
      details: error.message 
    });
  }
});

// ============================================================================
// PUT /api/stock-acquisitions/opening-balance
// Update existing opening balance entries
// ============================================================================
router.put('/opening-balance', async (req, res) => {
  try {
    const { items, status } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'No items to update' 
      });
    }

    const pool = await getPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      const updatedEntries = [];

      for (const item of items) {
        if (!item.entry_id) continue; // Skip items without entry_id
        
        const currentQty = item.quantity_received - (item.quantity_already_issued || 0);

        // Update opening_balance_entries
        await transaction.request()
          .input('entry_id', sql.UniqueIdentifier, item.entry_id)
          .input('quantity_received', sql.Int, item.quantity_received)
          .input('quantity_already_issued', sql.Int, item.quantity_already_issued || 0)
          .input('unit_cost', sql.Decimal(15, 2), item.unit_cost || null)
          .query(`
            UPDATE opening_balance_entries
            SET quantity_received = @quantity_received,
                quantity_already_issued = @quantity_already_issued,
                unit_cost = @unit_cost
            WHERE id = @entry_id
          `);

        // Update stock_acquisitions (find by item_master_id and notes containing Opening Balance)
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('quantity_received', sql.Decimal(15, 2), item.quantity_received)
          .input('quantity_issued', sql.Decimal(15, 2), item.quantity_already_issued || 0)
          .input('unit_cost', sql.Decimal(15, 2), item.unit_cost || null)
          .query(`
            UPDATE stock_acquisitions
            SET quantity_received = @quantity_received,
                quantity_issued = @quantity_issued,
                unit_cost = @unit_cost
            WHERE item_master_id = @item_master_id
              AND notes LIKE '%Opening Balance%'
          `);

        // Recalculate and update current_inventory_stock 
        // (sum all stock_acquisitions for this item)
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .query(`
            UPDATE current_inventory_stock
            SET current_quantity = (
                  SELECT ISNULL(SUM(quantity_available), 0)
                  FROM stock_acquisitions
                  WHERE item_master_id = @item_master_id
                ),
                last_updated = GETDATE()
            WHERE item_master_id = @item_master_id
          `);

        updatedEntries.push({
          entry_id: item.entry_id,
          item: item.nomenclature,
          quantity_available: currentQty
        });
      }

      // Update status if provided
      if (status) {
        const isCompleted = status === 'completed';
        await transaction.request()
          .input('is_completed', sql.NVarChar, isCompleted ? 'true' : 'false')
          .query(`
            UPDATE system_settings 
            SET setting_value = @is_completed, updated_at = GETDATE()
            WHERE setting_key = 'opening_balance_completed';
          `);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `Updated ${updatedEntries.length} opening balance entries`,
        entries: updatedEntries,
        status: status
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error updating opening balance:', error);
    res.status(500).json({ 
      error: 'Failed to update opening balance',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/stock-acquisitions/stock-by-item/:itemId
// Get available stock for an item (with FIFO ordering)
// ============================================================================
router.get('/stock-by-item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('item_master_id', sql.UniqueIdentifier, itemId)
      .query(`
        SELECT 
          id,
          acquisition_number,
          quantity_received,
          quantity_issued,
          quantity_available,
          unit_cost,
          delivery_date,
          notes,
          created_at
        FROM stock_acquisitions
        WHERE item_master_id = @item_master_id
          AND quantity_available > 0
        ORDER BY delivery_date ASC, created_at ASC
      `);

    const totalAvailable = result.recordset.reduce(
      (sum, stock) => sum + parseFloat(stock.quantity_available || 0), 
      0
    );

    res.json({
      success: true,
      stocks: result.recordset,
      total_available: totalAvailable
    });

  } catch (error) {
    console.error('❌ Error fetching stock:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock',
      details: error.message 
    });
  }
});

// ============================================================================
// Helper: Generate acquisition number
// ============================================================================
async function generateAcquisitionNumber(transaction) {
  const result = await transaction.request().query(`
    SELECT ISNULL(MAX(CAST(RIGHT(acquisition_number, 6) AS INT)), 0) as max_num
    FROM stock_acquisitions
    WHERE acquisition_number LIKE 'OPB-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%'
  `);
  
  const maxNum = result.recordset[0].max_num;
  const year = new Date().getFullYear();
  const newNum = String(maxNum + 1).padStart(6, '0');
  
  return `OPB-${year}-${newNum}`;
}

// ============================================================================
// Helper: Get current financial year code (e.g., '2025-26')
// ============================================================================
function getCurrentFinancialYear() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  // Financial year in India: April (month 3) to March (month 2)
  // If current month is January-March (0-2), we're in the FY that started last year
  if (month < 3) {
    return `${year - 1}-${String(year).slice(2)}`;
  } else {
    return `${year}-${String(year + 1).slice(2)}`;
  }
}

// ============================================================================
// GET /api/stock-acquisitions/financial-years
// Get list of all financial years
// ============================================================================
router.get('/financial-years', async (req, res) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        fy.id,
        fy.year_code,
        fy.year_label,
        fy.start_date,
        fy.end_date,
        fy.is_current,
        fy.is_closed,
        ISNULL(COUNT(DISTINCT obe.item_master_id), 0) AS item_count,
        ISNULL(SUM(obe.quantity_received), 0) AS total_received,
        ISNULL(SUM(obe.quantity_already_issued), 0) AS total_issued
      FROM financial_years fy
      LEFT JOIN opening_balance_entries obe ON fy.year_code = obe.financial_year AND obe.status = 'ACTIVE'
      GROUP BY fy.id, fy.year_code, fy.year_label, fy.start_date, fy.end_date, fy.is_current, fy.is_closed
      ORDER BY fy.start_date DESC
    `);
    
    res.json({
      success: true,
      financial_years: result.recordset,
      current_year: getCurrentFinancialYear()
    });
    
  } catch (error) {
    console.error('❌ Error fetching financial years:', error);
    res.status(500).json({ 
      error: 'Failed to fetch financial years',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/stock-acquisitions/yearwise-inventory
// Get year-wise inventory report (item-wise for each year)
// ============================================================================
router.get('/yearwise-inventory', async (req, res) => {
  try {
    const { financial_year } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT 
        obe.financial_year,
        fy.year_label,
        fy.is_current,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit,
        c.category_name AS category_name,
        
        -- Opening balance for this year (closing of previous year)
        ISNULL((
          SELECT SUM(prev.quantity_received - prev.quantity_already_issued)
          FROM opening_balance_entries prev
          JOIN financial_years prev_fy ON prev.financial_year = prev_fy.year_code
          JOIN financial_years curr_fy ON obe.financial_year = curr_fy.year_code
          WHERE prev.item_master_id = obe.item_master_id
            AND prev_fy.end_date < curr_fy.start_date
            AND prev.status = 'ACTIVE'
        ), 0) AS opening_balance,
        
        -- This year's received
        SUM(obe.quantity_received) AS quantity_received,
        
        -- This year's issued
        SUM(obe.quantity_already_issued) AS quantity_issued,
        
        -- Closing balance for this year
        SUM(obe.quantity_received - obe.quantity_already_issued) + 
        ISNULL((
          SELECT SUM(prev.quantity_received - prev.quantity_already_issued)
          FROM opening_balance_entries prev
          JOIN financial_years prev_fy ON prev.financial_year = prev_fy.year_code
          JOIN financial_years curr_fy ON obe.financial_year = curr_fy.year_code
          WHERE prev.item_master_id = obe.item_master_id
            AND prev_fy.end_date < curr_fy.start_date
            AND prev.status = 'ACTIVE'
        ), 0) AS closing_balance,
        
        -- Unit cost (average)
        AVG(obe.unit_cost) AS avg_unit_cost
        
      FROM opening_balance_entries obe
      JOIN item_masters im ON obe.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN financial_years fy ON obe.financial_year = fy.year_code
      WHERE obe.status = 'ACTIVE'
    `;
    
    let request = pool.request();
    
    if (financial_year) {
      query += ` AND obe.financial_year = @financial_year`;
      request = request.input('financial_year', sql.NVarChar, financial_year);
    }
    
    query += `
      GROUP BY 
        obe.financial_year, 
        fy.year_label,
        fy.is_current,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit,
        c.category_name
      ORDER BY obe.financial_year DESC, im.nomenclature
    `;
    
    const result = await request.query(query);
    
    // Group by financial year
    const groupedByYear = {};
    result.recordset.forEach(row => {
      const fy = row.financial_year || 'Unknown';
      if (!groupedByYear[fy]) {
        groupedByYear[fy] = {
          year_code: fy,
          year_label: row.year_label || fy,
          is_current: row.is_current || false,
          items: [],
          totals: { opening: 0, received: 0, issued: 0, closing: 0 }
        };
      }
      groupedByYear[fy].items.push({
        item_master_id: row.item_master_id,
        item_code: row.item_code,
        nomenclature: row.nomenclature,
        unit: row.unit,
        category_name: row.category_name,
        opening_balance: row.opening_balance,
        quantity_received: row.quantity_received,
        quantity_issued: row.quantity_issued,
        closing_balance: row.closing_balance,
        avg_unit_cost: row.avg_unit_cost
      });
      groupedByYear[fy].totals.opening += row.opening_balance || 0;
      groupedByYear[fy].totals.received += row.quantity_received || 0;
      groupedByYear[fy].totals.issued += row.quantity_issued || 0;
      groupedByYear[fy].totals.closing += row.closing_balance || 0;
    });
    
    res.json({
      success: true,
      yearwise_inventory: Object.values(groupedByYear),
      current_year: getCurrentFinancialYear()
    });
    
  } catch (error) {
    console.error('❌ Error fetching yearwise inventory:', error);
    res.status(500).json({ 
      error: 'Failed to fetch yearwise inventory',
      details: error.message 
    });
  }
});


module.exports = router;