// ==================================================
// CLEAN TENDER CRUD ENDPOINTS - REBUILT FROM SCRATCH
// ==================================================

// CREATE TENDER
app.post('/api/tenders', async (req, res) => {
  try {
    const {
      // Basic fields
      reference_number,
      title,
      description,
      tender_number,
      tender_type,
      estimated_value,
      
      // Date fields (prioritize snake_case from frontend)
      publish_date,
      publication_date,
      submission_date,
      submission_deadline,
      opening_date,
      advertisement_date,
      
      // Status fields
      status,
      tender_status,
      
      // Document paths
      document_path,
      contract_file_path,
      loi_file_path,
      noting_file_path,
      po_file_path,
      rfp_file_path,
      
      // Organization and method
      procedure_adopted,
      procurement_method,
      publication_daily,
      tender_spot_type,
      
      // Organizational IDs (arrays or comma-separated strings)
      office_ids,
      wing_ids,
      dec_ids,
      officeIds,
      wingIds,
      decIds,
      
      // Vendor
      vendor_id,
      
      // Additional fields
      individual_total,
      actual_price_total,
      is_finalized,
      finalized_at,
      finalized_by,
      
      // User info
      created_by,
      
      // Items (for transaction)
      items
    } = req.body;

    // Generate new ID and timestamp
    const tenderId = uuidv4();
    const now = new Date();

    // Process organizational IDs - handle both array and string formats
    const processedOfficeIds = Array.isArray(officeIds) ? officeIds.join(',') : 
                              (officeIds || office_ids || '');
    const processedWingIds = Array.isArray(wingIds) ? wingIds.join(',') : 
                            (wingIds || wing_ids || '');
    const processedDecIds = Array.isArray(decIds) ? decIds.join(',') : 
                           (decIds || dec_ids || '');

    // Process date fields - convert to Date objects or null
    const processDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        return new Date(dateStr);
      } catch (e) {
        return null;
      }
    };

    // Start database transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Insert tender
      const result = await transaction.request()
        .input('id', sql.UniqueIdentifier, tenderId)
        .input('reference_number', sql.NVarChar, reference_number || null)
        .input('title', sql.NVarChar, title || null)
        .input('description', sql.NVarChar, description || null)
        .input('estimated_value', sql.Int, estimated_value || null)
        .input('publish_date', sql.DateTime, processDate(publish_date))
        .input('publication_date', sql.DateTime, processDate(publication_date))
        .input('submission_date', sql.DateTime, processDate(submission_date))
        .input('submission_deadline', sql.DateTime, processDate(submission_deadline))
        .input('opening_date', sql.DateTime, processDate(opening_date))
        .input('status', sql.NVarChar, status || 'Draft')
        .input('document_path', sql.NVarChar, document_path || null)
        .input('created_by', sql.NVarChar, created_by || 'system')
        .input('created_at', sql.DateTime, now)
        .input('updated_at', sql.DateTime, now)
        .input('advertisement_date', sql.DateTime, processDate(advertisement_date))
        .input('procedure_adopted', sql.NVarChar, procedure_adopted || null)
        .input('procurement_method', sql.NVarChar, procurement_method || null)
        .input('publication_daily', sql.NVarChar, publication_daily || null)
        .input('contract_file_path', sql.NVarChar, contract_file_path || null)
        .input('loi_file_path', sql.NVarChar, loi_file_path || null)
        .input('noting_file_path', sql.NVarChar, noting_file_path || null)
        .input('po_file_path', sql.NVarChar, po_file_path || null)
        .input('rfp_file_path', sql.NVarChar, rfp_file_path || null)
        .input('tender_number', sql.NVarChar, tender_number || null)
        .input('tender_type', sql.NVarChar, tender_type || null)
        .input('office_ids', sql.NVarChar, processedOfficeIds || null)
        .input('wing_ids', sql.NVarChar, processedWingIds || null)
        .input('dec_ids', sql.NVarChar, processedDecIds || null)
        .input('tender_spot_type', sql.NVarChar, tender_spot_type || null)
        .input('vendor_id', sql.UniqueIdentifier, vendor_id || null)
        .input('tender_status', sql.NVarChar, tender_status || 'Draft')
        .input('individual_total', sql.NVarChar, individual_total || null)
        .input('actual_price_total', sql.Int, actual_price_total || null)
        .input('is_finalized', sql.Bit, is_finalized || false)
        .input('finalized_at', sql.DateTime, processDate(finalized_at))
        .input('finalized_by', sql.NVarChar, finalized_by || null)
        .query(`
          INSERT INTO tenders (
            id, reference_number, title, description, estimated_value,
            publish_date, publication_date, submission_date, submission_deadline, opening_date,
            status, document_path, created_by, created_at, updated_at, advertisement_date,
            procedure_adopted, procurement_method, publication_daily,
            contract_file_path, loi_file_path, noting_file_path, po_file_path, rfp_file_path,
            tender_number, tender_type, office_ids, wing_ids, dec_ids, tender_spot_type,
            vendor_id, tender_status, individual_total, actual_price_total,
            is_finalized, finalized_at, finalized_by
          ) VALUES (
            @id, @reference_number, @title, @description, @estimated_value,
            @publish_date, @publication_date, @submission_date, @submission_deadline, @opening_date,
            @status, @document_path, @created_by, @created_at, @updated_at, @advertisement_date,
            @procedure_adopted, @procurement_method, @publication_daily,
            @contract_file_path, @loi_file_path, @noting_file_path, @po_file_path, @rfp_file_path,
            @tender_number, @tender_type, @office_ids, @wing_ids, @dec_ids, @tender_spot_type,
            @vendor_id, @tender_status, @individual_total, @actual_price_total,
            @is_finalized, @finalized_at, @finalized_by
          )
        `);

      // Handle items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await transaction.request()
            .input('tender_id', sql.UniqueIdentifier, tenderId)
            .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
            .input('nomenclature', sql.NVarChar, item.nomenclature)
            .input('quantity', sql.Int, item.quantity)
            .input('estimated_unit_price', sql.Decimal, item.estimated_unit_price)
            .input('specifications', sql.NVarChar, item.specifications || null)
            .input('remarks', sql.NVarChar, item.remarks || null)
            .query(`
              INSERT INTO tender_items (
                tender_id, item_master_id, nomenclature, quantity, 
                estimated_unit_price, specifications, remarks
              ) VALUES (
                @tender_id, @item_master_id, @nomenclature, @quantity,
                @estimated_unit_price, @specifications, @remarks
              )
            `);
        }
      }

      // Commit transaction
      await transaction.commit();

      res.json({ 
        success: true, 
        id: tenderId,
        message: 'Tender created successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ CREATE TENDER ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to create tender', 
      details: error.message 
    });
  }
});

// UPDATE TENDER
app.put('/api/tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // Basic fields
      reference_number,
      title,
      description,
      tender_number,
      tender_type,
      estimated_value,
      
      // Date fields (prioritize snake_case from frontend)
      publish_date,
      publication_date,
      submission_date,
      submission_deadline,
      opening_date,
      advertisement_date,
      
      // Status fields
      status,
      tender_status,
      
      // Document paths
      document_path,
      contract_file_path,
      loi_file_path,
      noting_file_path,
      po_file_path,
      rfp_file_path,
      
      // Organization and method
      procedure_adopted,
      procurement_method,
      publication_daily,
      tender_spot_type,
      
      // Organizational IDs (arrays or comma-separated strings)
      office_ids,
      wing_ids,
      dec_ids,
      officeIds,
      wingIds,
      decIds,
      
      // Vendor
      vendor_id,
      
      // Additional fields
      individual_total,
      actual_price_total,
      is_finalized,
      finalized_at,
      finalized_by,
      
      // User info
      created_by
    } = req.body;

    const now = new Date();

    // Process organizational IDs - handle both array and string formats
    const processedOfficeIds = Array.isArray(officeIds) ? officeIds.join(',') : 
                              (officeIds || office_ids || '');
    const processedWingIds = Array.isArray(wingIds) ? wingIds.join(',') : 
                            (wingIds || wing_ids || '');
    const processedDecIds = Array.isArray(decIds) ? decIds.join(',') : 
                           (decIds || dec_ids || '');

    // Process date fields - convert to Date objects or null
    const processDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        return new Date(dateStr);
      } catch (e) {
        return null;
      }
    };

    // Update tender
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('reference_number', sql.NVarChar, reference_number || null)
      .input('title', sql.NVarChar, title || null)
      .input('description', sql.NVarChar, description || null)
      .input('estimated_value', sql.Int, estimated_value || null)
      .input('publish_date', sql.DateTime, processDate(publish_date))
      .input('publication_date', sql.DateTime, processDate(publication_date))
      .input('submission_date', sql.DateTime, processDate(submission_date))
      .input('submission_deadline', sql.DateTime, processDate(submission_deadline))
      .input('opening_date', sql.DateTime, processDate(opening_date))
      .input('status', sql.NVarChar, status || null)
      .input('document_path', sql.NVarChar, document_path || null)
      .input('updated_at', sql.DateTime, now)
      .input('advertisement_date', sql.DateTime, processDate(advertisement_date))
      .input('procedure_adopted', sql.NVarChar, procedure_adopted || null)
      .input('procurement_method', sql.NVarChar, procurement_method || null)
      .input('publication_daily', sql.NVarChar, publication_daily || null)
      .input('contract_file_path', sql.NVarChar, contract_file_path || null)
      .input('loi_file_path', sql.NVarChar, loi_file_path || null)
      .input('noting_file_path', sql.NVarChar, noting_file_path || null)
      .input('po_file_path', sql.NVarChar, po_file_path || null)
      .input('rfp_file_path', sql.NVarChar, rfp_file_path || null)
      .input('tender_number', sql.NVarChar, tender_number || null)
      .input('tender_type', sql.NVarChar, tender_type || null)
      .input('office_ids', sql.NVarChar, processedOfficeIds || null)
      .input('wing_ids', sql.NVarChar, processedWingIds || null)
      .input('dec_ids', sql.NVarChar, processedDecIds || null)
      .input('tender_spot_type', sql.NVarChar, tender_spot_type || null)
      .input('vendor_id', sql.UniqueIdentifier, vendor_id || null)
      .input('tender_status', sql.NVarChar, tender_status || null)
      .input('individual_total', sql.NVarChar, individual_total || null)
      .input('actual_price_total', sql.Int, actual_price_total || null)
      .input('is_finalized', sql.Bit, is_finalized || null)
      .input('finalized_at', sql.DateTime, processDate(finalized_at))
      .input('finalized_by', sql.NVarChar, finalized_by || null)
      .query(`
        UPDATE tenders SET
          reference_number = @reference_number,
          title = @title,
          description = @description,
          estimated_value = @estimated_value,
          publish_date = @publish_date,
          publication_date = @publication_date,
          submission_date = @submission_date,
          submission_deadline = @submission_deadline,
          opening_date = @opening_date,
          status = @status,
          document_path = @document_path,
          updated_at = @updated_at,
          advertisement_date = @advertisement_date,
          procedure_adopted = @procedure_adopted,
          procurement_method = @procurement_method,
          publication_daily = @publication_daily,
          contract_file_path = @contract_file_path,
          loi_file_path = @loi_file_path,
          noting_file_path = @noting_file_path,
          po_file_path = @po_file_path,
          rfp_file_path = @rfp_file_path,
          tender_number = @tender_number,
          tender_type = @tender_type,
          office_ids = @office_ids,
          wing_ids = @wing_ids,
          dec_ids = @dec_ids,
          tender_spot_type = @tender_spot_type,
          vendor_id = @vendor_id,
          tender_status = @tender_status,
          individual_total = @individual_total,
          actual_price_total = @actual_price_total,
          is_finalized = @is_finalized,
          finalized_at = @finalized_at,
          finalized_by = @finalized_by
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    res.json({ 
      success: true, 
      id: id,
      message: 'Tender updated successfully'
    });

  } catch (error) {
    console.error('❌ UPDATE TENDER ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to update tender', 
      details: error.message 
    });
  }
});

// DELETE TENDER
app.delete('/api/tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Start transaction to delete tender and related items
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Delete tender items first (foreign key constraint)
      await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');

      // Delete tender
      const result = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tenders WHERE id = @id');

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Tender not found' });
      }

      await transaction.commit();

      res.json({ 
        success: true, 
        message: 'Tender deleted successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ DELETE TENDER ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to delete tender', 
      details: error.message 
    });
  }
});
