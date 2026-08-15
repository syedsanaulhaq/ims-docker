// ====================================================================
// 🚀 SIMPLE INVENTORY API SERVICE 
// ====================================================================
// Backend API for the simplified system with:
// - NO financial data in requests/approvals
// - Financial data ONLY in tender awards
// - Direct award entry (no bidding process)
// ====================================================================

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration for InvMISDB
const dbConfig = {
    server: 'localhost',
    database: 'InvMISDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        integratedSecurity: true
    }
};

// Initialize database connection
sql.connect(dbConfig).then(() => {
    }).catch(err => {
    console.error('❌ Database connection failed:', err);
});

// ====================================================================
// 📦 1. STOCK MANAGEMENT API (QUANTITIES ONLY)
// ====================================================================

// Get current stock levels
app.get('/api/stock', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                cs.stock_id,
                im.item_code,
                im.item_name,
                ic.category_name,
                cs.current_quantity,
                cs.minimum_level,
                cs.maximum_level,
                cs.last_updated,
                CASE 
                    WHEN cs.current_quantity <= 0 THEN 'OUT_OF_STOCK'
                    WHEN cs.current_quantity <= cs.minimum_level THEN 'LOW_STOCK'
                    ELSE 'ADEQUATE'
                END as stock_status
                -- NO FINANCIAL FIELDS
            FROM CurrentStock cs
            JOIN ItemMaster im ON cs.item_id = im.item_id
            JOIN ItemCategories ic ON im.category_id = ic.category_id
            WHERE im.is_active = 1
            ORDER BY im.item_name
        `;
        
        res.json({
            success: true,
            data: result.recordset,
            message: 'Stock data (quantities only)'
        });
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stock data' });
    }
});

// Get stock transactions history
app.get('/api/stock/:itemId/transactions', async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const result = await sql.query`
            SELECT 
                st.transaction_id,
                st.transaction_type,
                st.quantity_change,
                st.quantity_before,
                st.quantity_after,
                st.reason,
                st.transaction_date,
                u.full_name as created_by_name
                -- NO FINANCIAL FIELDS
            FROM StockTransactions st
            JOIN Users u ON st.created_by = u.user_id
            WHERE st.item_id = ${itemId}
            ORDER BY st.transaction_date DESC
        `;
        
        res.json({
            success: true,
            data: result.recordset,
            message: 'Stock transaction history (quantities only)'
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});

// ====================================================================
// 📝 2. PROCUREMENT REQUESTS API (NO FINANCIAL DATA)
// ====================================================================

// Create procurement request (quantities and specifications only)
app.post('/api/procurement-requests', async (req, res) => {
    try {
        const { title, description, justification, priority, requiredDate, items } = req.body;
        const userId = 1; // In real app, get from JWT token
        const decId = 1;  // In real app, get from user data
        
        const transaction = new sql.Transaction();
        await transaction.begin();
        
        try {
            // Generate unique request code
            const requestCode = `REQ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            
            // Create main request
            const requestResult = await transaction.request()
                .input('requestCode', sql.VarChar, requestCode)
                .input('title', sql.VarChar, title)
                .input('description', sql.Text, description)
                .input('justification', sql.Text, justification)
                .input('priority', sql.VarChar, priority)
                .input('requiredDate', sql.Date, requiredDate)
                .input('requestedBy', sql.Int, userId)
                .input('decId', sql.Int, decId)
                .query`
                    INSERT INTO ProcurementRequests 
                    (request_code, request_title, description, justification, priority, required_date, requested_by, dec_id)
                    OUTPUT INSERTED.request_id
                    VALUES (@requestCode, @title, @description, @justification, @priority, @requiredDate, @requestedBy, @decId)
                `;
            
            const requestId = requestResult.recordset[0].request_id;
            
            // Add items (NO FINANCIAL DATA)
            for (const item of items) {
                // First, check if item exists or create it
                let itemId = item.itemId;
                if (!itemId) {
                    const itemResult = await transaction.request()
                        .input('itemCode', sql.VarChar, `ITEM-${Date.now()}`)
                        .input('itemName', sql.VarChar, item.itemName)
                        .input('categoryId', sql.Int, 1) // Default category
                        .input('specifications', sql.Text, item.specifications)
                        .input('unitOfMeasure', sql.VarChar, 'PIECES')
                        .query`
                            INSERT INTO ItemMaster (item_code, item_name, category_id, specifications, unit_of_measure)
                            OUTPUT INSERTED.item_id
                            VALUES (@itemCode, @itemName, @categoryId, @specifications, @unitOfMeasure)
                        `;
                    itemId = itemResult.recordset[0].item_id;
                }
                
                // Add request item
                await transaction.request()
                    .input('requestId', sql.Int, requestId)
                    .input('itemId', sql.Int, itemId)
                    .input('quantity', sql.Int, item.quantityRequested)
                    .input('specifications', sql.Text, item.specifications)
                    .input('justification', sql.Text, item.justification)
                    .query`
                        INSERT INTO RequestItems 
                        (request_id, item_id, quantity_requested, specifications, justification)
                        VALUES (@requestId, @itemId, @quantity, @specifications, @justification)
                    `;
            }
            
            // Create approval workflow
            await transaction.request()
                .input('requestId', sql.Int, requestId)
                .query`
                    INSERT INTO ApprovalWorkflow (request_id, approver_role, approval_level)
                    VALUES 
                        (@requestId, 'DG_ADMIN', 1),
                        (@requestId, 'AD_ADMIN', 2),
                        (@requestId, 'PROCUREMENT', 3)
                `;
            
            await transaction.commit();
            
            res.json({
                success: true,
                requestId: requestId,
                requestCode: requestCode,
                message: 'Procurement request created successfully (quantities only)'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ success: false, error: 'Failed to create request' });
    }
});

// Get procurement requests
app.get('/api/procurement-requests', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                pr.request_id,
                pr.request_code,
                pr.request_title,
                pr.description,
                pr.justification,
                pr.priority,
                pr.status,
                pr.required_date,
                pr.created_at,
                u.full_name as requester_name,
                d.dec_name,
                -- NO FINANCIAL FIELDS
                (SELECT COUNT(*) FROM RequestItems ri WHERE ri.request_id = pr.request_id) as total_items
            FROM ProcurementRequests pr
            JOIN Users u ON pr.requested_by = u.user_id
            JOIN DECs d ON pr.dec_id = d.dec_id
            ORDER BY pr.created_at DESC
        `;
        
        res.json({
            success: true,
            data: result.recordset,
            message: 'Procurement requests (quantities only)'
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch requests' });
    }
});

// Get request details with items
app.get('/api/procurement-requests/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Get request details
        const requestResult = await sql.query`
            SELECT 
                pr.*,
                u.full_name as requester_name,
                d.dec_name
                -- NO FINANCIAL FIELDS
            FROM ProcurementRequests pr
            JOIN Users u ON pr.requested_by = u.user_id
            JOIN DECs d ON pr.dec_id = d.dec_id
            WHERE pr.request_id = ${requestId}
        `;
        
        if (requestResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        // Get request items
        const itemsResult = await sql.query`
            SELECT 
                ri.request_item_id,
                ri.quantity_requested,
                ri.specifications,
                ri.justification,
                im.item_id,
                im.item_name,
                im.item_code,
                ic.category_name
                -- NO FINANCIAL FIELDS
            FROM RequestItems ri
            JOIN ItemMaster im ON ri.item_id = im.item_id
            JOIN ItemCategories ic ON im.category_id = ic.category_id
            WHERE ri.request_id = ${requestId}
        `;
        
        const request = requestResult.recordset[0];
        request.items = itemsResult.recordset;
        
        res.json({
            success: true,
            data: request,
            message: 'Request details (quantities only)'
        });
        
    } catch (error) {
        console.error('Error fetching request details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch request details' });
    }
});

// ====================================================================
// ✅ 3. APPROVAL WORKFLOW API (NO FINANCIAL DATA)
// ====================================================================

// Approve/reject request
app.post('/api/approvals/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action, comments, approverRole } = req.body; // 'APPROVED' or 'REJECTED'
        const approverId = 1; // In real app, get from JWT token
        
        const transaction = new sql.Transaction();
        await transaction.begin();
        
        try {
            // Update approval workflow
            await transaction.request()
                .input('requestId', sql.Int, requestId)
                .input('approverRole', sql.VarChar, approverRole)
                .input('approverId', sql.Int, approverId)
                .input('status', sql.VarChar, action)
                .input('comments', sql.Text, comments)
                .query`
                    UPDATE ApprovalWorkflow 
                    SET approver_id = @approverId,
                        status = @status,
                        comments = @comments,
                        approved_at = GETDATE()
                    WHERE request_id = @requestId AND approver_role = @approverRole
                `;
            
            // Update request status if all approvals complete or if rejected
            if (action === 'REJECTED') {
                await transaction.request()
                    .input('requestId', sql.Int, requestId)
                    .query`UPDATE ProcurementRequests SET status = 'REJECTED' WHERE request_id = @requestId`;
            } else {
                // Check if all approvals are complete
                const approvalCheck = await transaction.request()
                    .input('requestId', sql.Int, requestId)
                    .query`
                        SELECT COUNT(*) as total_approvals,
                               COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as completed_approvals
                        FROM ApprovalWorkflow 
                        WHERE request_id = @requestId
                    `;
                
                const { total_approvals, completed_approvals } = approvalCheck.recordset[0];
                
                if (total_approvals === completed_approvals) {
                    await transaction.request()
                        .input('requestId', sql.Int, requestId)
                        .query`UPDATE ProcurementRequests SET status = 'APPROVED' WHERE request_id = @requestId`;
                }
            }
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: `Request ${action.toLowerCase()} successfully`
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error processing approval:', error);
        res.status(500).json({ success: false, error: 'Failed to process approval' });
    }
});

// ====================================================================
// 🏆 4. TENDER AWARDS API (WITH FINANCIAL DATA)
// ====================================================================

// Create tender award (ONLY place for financial data entry)
app.post('/api/tender-awards', async (req, res) => {
    try {
        const {
            requestId,
            awardTitle,
            awardDate,
            expectedDeliveryDate,
            vendorName,
            vendorRegistration,
            vendorAddress,
            vendorContactPerson,
            vendorPhone,
            vendorEmail,
            contractNumber,
            contractDate,
            totalContractAmount,
            taxAmount,
            finalAmount,
            paymentTerms,
            items
        } = req.body;
        
        const createdBy = 1; // In real app, get from JWT token
        
        const transaction = new sql.Transaction();
        await transaction.begin();
        
        try {
            // Generate award code
            const awardCode = `AWARD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            
            // Create tender award
            const awardResult = await transaction.request()
                .input('awardCode', sql.VarChar, awardCode)
                .input('requestId', sql.Int, requestId)
                .input('awardTitle', sql.VarChar, awardTitle)
                .input('awardDate', sql.Date, awardDate)
                .input('expectedDeliveryDate', sql.Date, expectedDeliveryDate)
                .input('vendorName', sql.VarChar, vendorName)
                .input('vendorRegistration', sql.VarChar, vendorRegistration)
                .input('vendorAddress', sql.Text, vendorAddress)
                .input('vendorContactPerson', sql.VarChar, vendorContactPerson)
                .input('vendorPhone', sql.VarChar, vendorPhone)
                .input('vendorEmail', sql.VarChar, vendorEmail)
                .input('contractNumber', sql.VarChar, contractNumber)
                .input('contractDate', sql.Date, contractDate)
                .input('totalContractAmount', sql.Decimal(15,2), totalContractAmount)
                .input('taxAmount', sql.Decimal(15,2), taxAmount)
                .input('finalAmount', sql.Decimal(15,2), finalAmount)
                .input('paymentTerms', sql.Text, paymentTerms)
                .input('createdBy', sql.Int, createdBy)
                .query`
                    INSERT INTO TenderAwards (
                        award_code, request_id, award_title, award_date, expected_delivery_date,
                        vendor_name, vendor_registration, vendor_address, vendor_contact_person,
                        vendor_phone, vendor_email, contract_number, contract_date,
                        total_contract_amount, tax_amount, final_amount, payment_terms, created_by
                    )
                    OUTPUT INSERTED.award_id
                    VALUES (
                        @awardCode, @requestId, @awardTitle, @awardDate, @expectedDeliveryDate,
                        @vendorName, @vendorRegistration, @vendorAddress, @vendorContactPerson,
                        @vendorPhone, @vendorEmail, @contractNumber, @contractDate,
                        @totalContractAmount, @taxAmount, @finalAmount, @paymentTerms, @createdBy
                    )
                `;
            
            const awardId = awardResult.recordset[0].award_id;
            
            // Add award items with pricing
            for (const item of items) {
                await transaction.request()
                    .input('awardId', sql.Int, awardId)
                    .input('itemId', sql.Int, item.itemId)
                    .input('quantityAwarded', sql.Int, item.quantityAwarded)
                    .input('unitPrice', sql.Decimal(10,2), item.unitPrice)
                    .input('totalPrice', sql.Decimal(15,2), item.totalPrice)
                    .input('specifications', sql.Text, item.specifications)
                    .query`
                        INSERT INTO AwardItems (
                            award_id, item_id, quantity_awarded, unit_price, total_price, specifications_met
                        )
                        VALUES (@awardId, @itemId, @quantityAwarded, @unitPrice, @totalPrice, @specifications)
                    `;
            }
            
            await transaction.commit();
            
            res.json({
                success: true,
                awardId: awardId,
                awardCode: awardCode,
                message: 'Tender award created successfully (financial data recorded)'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error creating tender award:', error);
        res.status(500).json({ success: false, error: 'Failed to create tender award' });
    }
});

// Get tender awards
app.get('/api/tender-awards', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                ta.award_id,
                ta.award_code,
                ta.award_title,
                ta.vendor_name,
                ta.award_date,
                ta.expected_delivery_date,
                ta.total_contract_amount,
                ta.final_amount,
                ta.status,
                pr.request_title,
                pr.request_code
            FROM TenderAwards ta
            JOIN ProcurementRequests pr ON ta.request_id = pr.request_id
            ORDER BY ta.created_at DESC
        `;
        
        res.json({
            success: true,
            data: result.recordset,
            message: 'Tender awards with financial data'
        });
    } catch (error) {
        console.error('Error fetching awards:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch awards' });
    }
});

// ====================================================================
// 📊 5. REPORTING API
// ====================================================================

// Dashboard summary
app.get('/api/dashboard', async (req, res) => {
    try {
        const summaryResult = await sql.query`
            SELECT 
                (SELECT COUNT(*) FROM ProcurementRequests WHERE status = 'PENDING') as pending_requests,
                (SELECT COUNT(*) FROM ProcurementRequests WHERE status = 'APPROVED') as approved_requests,
                (SELECT COUNT(*) FROM TenderAwards) as total_awards,
                (SELECT COUNT(*) FROM CurrentStock WHERE current_quantity <= minimum_level) as low_stock_items,
                (SELECT ISNULL(SUM(final_amount), 0) FROM TenderAwards WHERE status = 'AWARDED') as total_contract_value
        `;
        
        res.json({
            success: true,
            data: summaryResult.recordset[0],
            message: 'Dashboard summary'
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
    }
});

// ====================================================================
// 🚀 SERVER STARTUP
// ====================================================================

const PORT = 3001;

app.listen(PORT, () => {
    });

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await sql.close();
    process.exit(0);
});

module.exports = app;
