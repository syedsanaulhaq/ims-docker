// ====================================================================
// 🔒 QUANTITY-FOCUSED API SERVICE (ROLE-BASED ACCESS CONTROL)
// ====================================================================
// Backend service implementation that respects user access levels
// and ensures financial data is never sent to unauthorized users.
// ====================================================================

const express = require('express');
const sql = require('mssql');

// ====================================================================
// 🔐 1. USER ACCESS CONTROL MIDDLEWARE
// ====================================================================

const checkUserAccessLevel = async (req, res, next) => {
    try {
        const userId = req.user.userId; // From JWT token
        
        // Get user's access level from database
        const result = await sql.query`
            SELECT access_level, role_name, can_view_financial
            FROM UserAccessLevels 
            WHERE user_id = ${userId} AND is_active = 1
        `;
        
        if (result.recordset.length === 0) {
            return res.status(403).json({ 
                error: 'Access denied', 
                message: 'User access level not found' 
            });
        }
        
        req.userAccess = result.recordset[0];
        next();
    } catch (error) {
        console.error('Access control error:', error);
        res.status(500).json({ error: 'Access control system error' });
    }
};

// ====================================================================
// 📊 2. PROCUREMENT REQUESTS API (QUANTITY-FOCUSED)
// ====================================================================

const procurementRequestsAPI = {
    
    // Get requests with user-appropriate data
    getRequests: async (req, res) => {
        try {
            const { userAccess } = req;
            
            let query = '';
            
            // Different queries based on access level
            if (userAccess.can_view_financial) {
                // Full access for financial authorized users
                query = `
                    SELECT 
                        pr.*,
                        pri.item_name,
                        pri.quantity_requested,
                        pri.estimated_unit_cost,  -- Only for financial access
                        pri.total_estimated_cost, -- Only for financial access
                        pri.specifications,
                        cs.current_stock,
                        cs.minimum_level,
                        cs.stock_value,          -- Only for financial access
                        u.full_name as requester_name
                    FROM ProcurementRequests pr
                    JOIN ProcurementRequestItems pri ON pr.request_id = pri.request_id
                    JOIN CurrentStock cs ON pri.item_id = cs.item_id
                    JOIN Users u ON pr.requested_by = u.user_id
                    WHERE pr.status != 'DELETED'
                    ORDER BY pr.created_at DESC
                `;
            } else {
                // Quantity-only access for public users
                query = `
                    SELECT 
                        pr.request_id,
                        pr.request_title,
                        pr.description,
                        pr.priority,
                        pr.status,
                        pr.requested_date,
                        pr.required_date,
                        pr.created_at,
                        pri.item_name,
                        pri.quantity_requested,
                        -- NO FINANCIAL FIELDS
                        pri.specifications,
                        pri.justification,
                        cs.current_stock,
                        cs.minimum_level,
                        -- NO STOCK VALUE
                        u.full_name as requester_name,
                        d.dec_name
                    FROM ProcurementRequests pr
                    JOIN ProcurementRequestItems pri ON pr.request_id = pri.request_id
                    JOIN CurrentStock cs ON pri.item_id = cs.item_id
                    JOIN Users u ON pr.requested_by = u.user_id
                    JOIN DECs d ON pr.requesting_dec_id = d.dec_id
                    WHERE pr.status != 'DELETED'
                    ORDER BY pr.created_at DESC
                `;
            }
            
            const result = await sql.query(query);
            
            // Additional filtering for sensitive status info
            let requests = result.recordset;
            
            if (!userAccess.can_view_financial) {
                // Remove any accidentally included financial data
                requests = requests.map(req => {
                    const cleanRequest = { ...req };
                    delete cleanRequest.estimated_unit_cost;
                    delete cleanRequest.total_estimated_cost;
                    delete cleanRequest.stock_value;
                    delete cleanRequest.budget_allocated;
                    return cleanRequest;
                });
            }
            
            res.json({
                success: true,
                data: requests,
                access_level: userAccess.access_level,
                message: userAccess.can_view_financial ? 
                    'Full data access granted' : 
                    'Quantity-focused data only'
            });
            
        } catch (error) {
            console.error('Error fetching requests:', error);
            res.status(500).json({ error: 'Failed to fetch requests' });
        }
    },
    
    // Create new request (no financial input required)
    createRequest: async (req, res) => {
        try {
            const { title, description, priority, requiredDate, items } = req.body;
            const userId = req.user.userId;
            
            const transaction = new sql.Transaction();
            await transaction.begin();
            
            try {
                // Create main request
                const requestResult = await transaction.request()
                    .input('title', sql.VarChar, title)
                    .input('description', sql.Text, description)
                    .input('priority', sql.VarChar, priority)
                    .input('requiredDate', sql.DateTime, requiredDate)
                    .input('requestedBy', sql.Int, userId)
                    .query`
                        INSERT INTO ProcurementRequests 
                        (request_title, description, priority, required_date, requested_by, status)
                        OUTPUT INSERTED.request_id
                        VALUES (@title, @description, @priority, @requiredDate, @requestedBy, 'PENDING')
                    `;
                
                const requestId = requestResult.recordset[0].request_id;
                
                // Add items (quantities and specs only, no cost estimation)
                for (const item of items) {
                    await transaction.request()
                        .input('requestId', sql.Int, requestId)
                        .input('itemName', sql.VarChar, item.itemName)
                        .input('quantity', sql.Int, item.quantity)
                        .input('specifications', sql.Text, item.specifications)
                        .input('justification', sql.Text, item.justification)
                        .query`
                            INSERT INTO ProcurementRequestItems 
                            (request_id, item_name, quantity_requested, specifications, justification)
                            VALUES (@requestId, @itemName, @quantity, @specifications, @justification)
                        `;
                }
                
                await transaction.commit();
                
                res.json({
                    success: true,
                    requestId: requestId,
                    message: 'Procurement request created successfully'
                });
                
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error creating request:', error);
            res.status(500).json({ error: 'Failed to create request' });
        }
    }
};

// ====================================================================
// 🏢 3. TENDER MANAGEMENT API (PUBLIC-FOCUSED)
// ====================================================================

const tenderAPI = {
    
    // Get public tender information (no financial data)
    getPublicTender: async (req, res) => {
        try {
            const { tenderId } = req.params;
            
            // Always return public data regardless of user access
            const tenderResult = await sql.query`
                SELECT 
                    t.tender_id,
                    t.tender_code,
                    t.tender_title,
                    t.tender_type,
                    t.status,
                    ts.status_description,
                    t.published_date,
                    t.submission_deadline,
                    t.opening_date,
                    t.evaluation_completion_target,
                    -- NO BUDGET OR FINANCIAL FIELDS
                    t.contact_person,
                    t.contact_email,
                    t.contact_phone
                FROM Tenders t
                JOIN TenderStatuses ts ON t.status = ts.status_code
                WHERE t.tender_id = ${tenderId}
                    AND t.is_public = 1
            `;
            
            if (tenderResult.recordset.length === 0) {
                return res.status(404).json({ error: 'Tender not found or not public' });
            }
            
            // Get tender items (specifications only)
            const itemsResult = await sql.query`
                SELECT 
                    ti.item_name,
                    ti.quantity_required,
                    ti.detailed_specifications,
                    ti.technical_requirements,
                    ti.quality_standards,
                    ti.delivery_timeline_days,
                    -- NO PRICE ESTIMATES
                    im.category_name
                FROM TenderItems ti
                JOIN ItemMaster im ON ti.item_id = im.item_id
                WHERE ti.tender_id = ${tenderId}
                ORDER BY ti.item_sequence
            `;
            
            const tender = tenderResult.recordset[0];
            tender.items = itemsResult.recordset;
            
            res.json({
                success: true,
                data: tender,
                message: 'Public tender information (specifications only)'
            });
            
        } catch (error) {
            console.error('Error fetching public tender:', error);
            res.status(500).json({ error: 'Failed to fetch tender information' });
        }
    },
    
    // Get bid status (public information only)
    getBidStatus: async (req, res) => {
        try {
            const { tenderId } = req.params;
            
            // Public bid information (no financial data)
            const bidsResult = await sql.query`
                SELECT 
                    tb.bid_id,
                    tb.vendor_name,
                    tb.vendor_code,
                    tb.contact_person,
                    tb.bid_reference,
                    tb.submission_date,
                    tb.is_technically_compliant,
                    tb.technical_evaluation_score,
                    tb.delivery_time_days,
                    tb.warranty_months,
                    tb.bid_status,
                    bs.status_description,
                    -- NO PRICE OR FINANCIAL EVALUATION
                    tb.disqualification_reason
                FROM TenderBids tb
                JOIN BidStatuses bs ON tb.bid_status = bs.status_code
                WHERE tb.tender_id = ${tenderId}
                ORDER BY tb.is_technically_compliant DESC, tb.technical_evaluation_score DESC
            `;
            
            res.json({
                success: true,
                data: bidsResult.recordset,
                message: 'Public bid status (technical evaluation only)'
            });
            
        } catch (error) {
            console.error('Error fetching bid status:', error);
            res.status(500).json({ error: 'Failed to fetch bid status' });
        }
    },
    
    // Get award information (public announcement)
    getAwardInformation: async (req, res) => {
        try {
            const { tenderId } = req.params;
            
            const awardResult = await sql.query`
                SELECT 
                    ta.tender_id,
                    ta.awarded_vendor_name,
                    ta.vendor_registration,
                    ta.vendor_contact,
                    ta.awarded_product,
                    ta.awarded_quantity,
                    ta.delivery_days,
                    ta.warranty_months,
                    ta.award_date,
                    ta.contract_date,
                    ta.expected_delivery_date,
                    -- NO CONTRACT VALUE
                    t.tender_title,
                    t.tender_code
                FROM TenderAwards ta
                JOIN Tenders t ON ta.tender_id = t.tender_id
                WHERE ta.tender_id = ${tenderId}
                    AND ta.is_public_announcement = 1
            `;
            
            if (awardResult.recordset.length === 0) {
                return res.status(404).json({ error: 'Award information not available' });
            }
            
            res.json({
                success: true,
                data: awardResult.recordset[0],
                message: 'Public award announcement (technical details only)'
            });
            
        } catch (error) {
            console.error('Error fetching award information:', error);
            res.status(500).json({ error: 'Failed to fetch award information' });
        }
    }
};

// ====================================================================
// 📊 4. STOCK ANALYSIS API (ACCESS-CONTROLLED)
// ====================================================================

const stockAPI = {
    
    // Get stock analysis based on user access
    getStockAnalysis: async (req, res) => {
        try {
            const { itemId } = req.params;
            const { userAccess } = req;
            
            let query = '';
            
            if (userAccess.can_view_financial) {
                // Full stock analysis with financial data
                query = `
                    SELECT 
                        cs.*,
                        im.item_name,
                        im.category_name,
                        -- Financial data for authorized users
                        cs.unit_cost,
                        cs.stock_value,
                        cs.last_purchase_cost,
                        -- Usage analytics
                        ISNULL(ua.last_6_months_issued, 0) as usage_last_6_months,
                        ISNULL(ua.monthly_average, 0) as monthly_average,
                        ISNULL(ua.projected_6_month_need, 0) as projected_need
                    FROM CurrentStock cs
                    JOIN ItemMaster im ON cs.item_id = im.item_id
                    LEFT JOIN UsageAnalytics ua ON cs.item_id = ua.item_id
                    WHERE cs.item_id = ${itemId}
                `;
            } else {
                // Quantity-only analysis for public users
                query = `
                    SELECT 
                        cs.item_id,
                        cs.current_stock,
                        cs.minimum_level,
                        cs.maximum_level,
                        cs.last_updated,
                        im.item_name,
                        im.category_name,
                        im.specifications,
                        -- NO FINANCIAL FIELDS
                        -- Usage analytics (quantities only)
                        ISNULL(ua.last_6_months_issued, 0) as usage_last_6_months,
                        ISNULL(ua.monthly_average, 0) as monthly_average,
                        ISNULL(ua.projected_6_month_need, 0) as projected_need
                    FROM CurrentStock cs
                    JOIN ItemMaster im ON cs.item_id = im.item_id
                    LEFT JOIN UsageAnalytics ua ON cs.item_id = ua.item_id
                    WHERE cs.item_id = ${itemId}
                `;
            }
            
            const result = await sql.query(query);
            
            if (result.recordset.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }
            
            const stockData = result.recordset[0];
            
            // Add computed analysis
            stockData.is_critical = stockData.current_stock <= stockData.minimum_level;
            stockData.stock_status = stockData.current_stock <= 0 ? 'OUT_OF_STOCK' :
                                   stockData.current_stock <= stockData.minimum_level ? 'LOW_STOCK' : 'ADEQUATE';
            
            res.json({
                success: true,
                data: stockData,
                access_level: userAccess.access_level,
                financial_data_included: userAccess.can_view_financial
            });
            
        } catch (error) {
            console.error('Error fetching stock analysis:', error);
            res.status(500).json({ error: 'Failed to fetch stock analysis' });
        }
    }
};

// ====================================================================
// 📋 5. AUDIT LOGGING FOR FINANCIAL ACCESS
// ====================================================================

const auditLogger = {
    
    logFinancialAccess: async (userId, action, data) => {
        try {
            await sql.query`
                INSERT INTO FinancialAccessAudit 
                (user_id, action_type, accessed_data, access_timestamp, ip_address)
                VALUES (${userId}, ${action}, ${JSON.stringify(data)}, GETDATE(), ${data.ip})
            `;
        } catch (error) {
            console.error('Audit logging failed:', error);
        }
    }
};

// ====================================================================
// 🛡️ 6. DATA SANITIZATION MIDDLEWARE
// ====================================================================

const sanitizeFinancialData = (req, res, next) => {
    // Override JSON response to remove financial fields for unauthorized users
    if (!req.userAccess?.can_view_financial) {
        const originalJson = res.json;
        res.json = function(obj) {
            if (obj && typeof obj === 'object') {
                const sanitized = removeFinancialFields(obj);
                return originalJson.call(this, sanitized);
            }
            return originalJson.call(this, obj);
        };
    }
    next();
};

const removeFinancialFields = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(item => removeFinancialFields(item));
    }
    
    if (obj && typeof obj === 'object') {
        const sanitized = { ...obj };
        
        // Remove all financial fields
        const financialFields = [
            'unit_cost', 'total_cost', 'stock_value', 'budget_allocated',
            'estimated_cost', 'actual_cost', 'price', 'amount', 'value',
            'cost_per_unit', 'total_amount', 'contract_value', 'bid_price'
        ];
        
        financialFields.forEach(field => {
            delete sanitized[field];
        });
        
        // Recursively sanitize nested objects
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] && typeof sanitized[key] === 'object') {
                sanitized[key] = removeFinancialFields(sanitized[key]);
            }
        });
        
        return sanitized;
    }
    
    return obj;
};

// ====================================================================
// 🚀 7. EXPRESS ROUTES SETUP
// ====================================================================

const router = express.Router();

// Apply access control and sanitization middleware
router.use(checkUserAccessLevel);
router.use(sanitizeFinancialData);

// Procurement Routes
router.get('/requests', procurementRequestsAPI.getRequests);
router.post('/requests', procurementRequestsAPI.createRequest);

// Public Tender Routes (no access restriction for viewing)
router.get('/tenders/:tenderId/public', tenderAPI.getPublicTender);
router.get('/tenders/:tenderId/bids', tenderAPI.getBidStatus);
router.get('/tenders/:tenderId/award', tenderAPI.getAwardInformation);

// Stock Analysis Routes (access-controlled)
router.get('/stock/:itemId/analysis', stockAPI.getStockAnalysis);

// Financial Access Logging
router.use((req, res, next) => {
    if (req.userAccess?.can_view_financial && req.method === 'GET') {
        auditLogger.logFinancialAccess(req.user.userId, 'FINANCIAL_DATA_ACCESS', {
            endpoint: req.path,
            ip: req.ip,
            timestamp: new Date()
        });
    }
    next();
});

module.exports = {
    router,
    procurementRequestsAPI,
    tenderAPI,
    stockAPI,
    auditLogger
};

// ====================================================================
// 📚 USAGE EXAMPLE IN MAIN SERVER
// ====================================================================

/*
// In your main backend-server.cjs:

const { router: quantityFocusedAPI } = require('./quantity-focused-api-service');

// Use the quantity-focused API
app.use('/api/v1', quantityFocusedAPI);

// Example client calls:

// 1. Get requests (returns data based on user access level)
GET /api/v1/requests
// Response for public user: only quantities and specs
// Response for financial user: includes cost data

// 2. Get public tender information
GET /api/v1/tenders/tender-001/public
// Always returns specification-only data

// 3. Get stock analysis (access-controlled)
GET /api/v1/stock/item-001/analysis
// Response varies by user access level

*/
