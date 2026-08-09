// ====================================================================
// 🎯 TENDER-ONLY FINANCIAL API SERVICE
// ====================================================================
// This API enforces that financial data ONLY appears during tender/bid
// evaluation. All request and approval endpoints reject financial data.
// ====================================================================

const express = require('express');
const sql = require('mssql');

// ====================================================================
// 🔐 1. FINANCIAL DATA BLOCKING MIDDLEWARE
// ====================================================================

const blockFinancialData = (req, res, next) => {
    // List of financial field names that should NEVER appear in request/approval APIs
    const financialFields = [
        'cost', 'price', 'amount', 'budget', 'value', 'total', 'unit_cost',
        'estimated_cost', 'budget_allocation', 'cost_estimate', 'price_estimate',
        'financial_impact', 'cost_analysis', 'budget_approved', 'amount_approved'
    ];
    
    // Check request body for financial data
    if (req.body && typeof req.body === 'object') {
        const bodyString = JSON.stringify(req.body).toLowerCase();
        
        for (const field of financialFields) {
            if (bodyString.includes(field)) {
                return res.status(400).json({
                    error: 'Financial data not allowed',
                    message: `Financial field '${field}' detected. This endpoint accepts quantity and specification data only.`,
                    stage: 'REQUEST_APPROVAL_STAGE',
                    financial_stage: 'Tender/Bid evaluation only'
                });
            }
        }
    }
    
    next();
};

// ====================================================================
// 📝 2. REQUEST API (ZERO FINANCIAL DATA)
// ====================================================================

const requestAPI = {
    
    // Create procurement request - NO financial data accepted
    createRequest: async (req, res) => {
        try {
            const { title, description, justification, priority, requiredDate, items } = req.body;
            
            // Validate required fields
            if (!title || !items || items.length === 0) {
                return res.status(400).json({ error: 'Title and items are required' });
            }
            
            // Sanitize items - remove any financial data that might be included
            const sanitizedItems = items.map(item => {
                const cleanItem = {
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity,
                    unit: item.unit || 'pieces',
                    specifications: item.specifications,
                    qualityStandards: item.qualityStandards,
                    brandPreference: item.brandPreference,
                    alternativesAcceptable: item.alternativesAcceptable !== false,
                    quantityJustification: item.quantityJustification,
                    usagePurpose: item.usagePurpose,
                    urgencyReason: item.urgencyReason
                };
                
                // Explicitly remove any financial fields
                delete cleanItem.cost;
                delete cleanItem.price;
                delete cleanItem.amount;
                delete cleanItem.budget;
                delete cleanItem.estimate;
                
                return cleanItem;
            });
            
            const transaction = new sql.Transaction();
            await transaction.begin();
            
            try {
                // Create main request
                const requestResult = await transaction.request()
                    .input('title', sql.VarChar, title)
                    .input('description', sql.Text, description)
                    .input('justification', sql.Text, justification)
                    .input('priority', sql.VarChar, priority)
                    .input('requiredDate', sql.DateTime, requiredDate)
                    .input('requestedBy', sql.Int, req.user.userId)
                    .input('requestingDecId', sql.Int, req.user.decId)
                    .query`
                        INSERT INTO ProcurementRequests 
                        (request_title, description, justification, priority, required_date, 
                         requested_by, requesting_dec_id, status)
                        OUTPUT INSERTED.request_id
                        VALUES (@title, @description, @justification, @priority, @requiredDate, 
                                @requestedBy, @requestingDecId, 'PENDING')
                    `;
                
                const requestId = requestResult.recordset[0].request_id;
                
                // Add items (NO financial data)
                for (const item of sanitizedItems) {
                    await transaction.request()
                        .input('requestId', sql.Int, requestId)
                        .input('itemName', sql.VarChar, item.name)
                        .input('category', sql.VarChar, item.category)
                        .input('quantity', sql.Int, item.quantity)
                        .input('unit', sql.VarChar, item.unit)
                        .input('specifications', sql.Text, item.specifications)
                        .input('qualityStandards', sql.Text, item.qualityStandards)
                        .input('brandPreference', sql.VarChar, item.brandPreference)
                        .input('alternativesAcceptable', sql.Bit, item.alternativesAcceptable)
                        .input('quantityJustification', sql.Text, item.quantityJustification)
                        .input('usagePurpose', sql.Text, item.usagePurpose)
                        .input('urgencyReason', sql.Text, item.urgencyReason)
                        .query`
                            INSERT INTO ProcurementRequestItems 
                            (request_id, item_name, category, quantity_requested, unit_of_measurement,
                             technical_specifications, quality_standards, brand_preference, 
                             alternatives_acceptable, quantity_justification, usage_purpose, urgency_reason)
                            VALUES (@requestId, @itemName, @category, @quantity, @unit,
                                    @specifications, @qualityStandards, @brandPreference, 
                                    @alternativesAcceptable, @quantityJustification, @usagePurpose, @urgencyReason)
                        `;
                }
                
                await transaction.commit();
                
                res.json({
                    success: true,
                    requestId: requestId,
                    message: 'Request created successfully with quantity and specifications only',
                    dataType: 'QUANTITY_ONLY',
                    financialDataIncluded: false
                });
                
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error creating request:', error);
            res.status(500).json({ error: 'Failed to create request' });
        }
    },
    
    // Get request details - NO financial data returned
    getRequest: async (req, res) => {
        try {
            const { requestId } = req.params;
            
            // Get request data with NO financial fields
            const requestResult = await sql.query`
                SELECT 
                    pr.request_id,
                    pr.request_title,
                    pr.description,
                    pr.justification,
                    pr.priority,
                    pr.required_date,
                    pr.status,
                    pr.created_at,
                    u.full_name as requester_name,
                    d.dec_name
                FROM ProcurementRequests pr
                JOIN Users u ON pr.requested_by = u.user_id
                JOIN DEC_MST d ON pr.requesting_dec_id = d.dec_id
                WHERE pr.request_id = ${requestId}
            `;
            
            if (requestResult.recordset.length === 0) {
                return res.status(404).json({ error: 'Request not found' });
            }
            
            // Get items with NO financial data
            const itemsResult = await sql.query`
                SELECT 
                    item_name,
                    category,
                    quantity_requested,
                    unit_of_measurement,
                    technical_specifications,
                    quality_standards,
                    brand_preference,
                    alternatives_acceptable,
                    quantity_justification,
                    usage_purpose,
                    urgency_reason
                    -- NO COST FIELDS
                    -- NO PRICE FIELDS
                    -- NO BUDGET FIELDS
                FROM ProcurementRequestItems 
                WHERE request_id = ${requestId}
            `;
            
            const request = requestResult.recordset[0];
            request.items = itemsResult.recordset;
            
            res.json({
                success: true,
                data: request,
                dataType: 'QUANTITY_SPECIFICATIONS_ONLY',
                financialDataIncluded: false,
                message: 'Request data contains quantities and specifications only'
            });
            
        } catch (error) {
            console.error('Error fetching request:', error);
            res.status(500).json({ error: 'Failed to fetch request' });
        }
    }
};

// ====================================================================
// ✅ 3. APPROVAL API (ZERO FINANCIAL ANALYSIS)
// ====================================================================

const approvalAPI = {
    
    // Submit approval - NO financial considerations
    submitApproval: async (req, res) => {
        try {
            const { 
                requestId, 
                decision, 
                needAnalysisComments,
                quantityJustificationReview,
                technicalSpecificationReview,
                stockImpactAnalysis,
                alternativeSuggestions
            } = req.body;
            
            // Validate decision
            const validDecisions = ['APPROVED', 'REJECTED', 'RETURNED'];
            if (!validDecisions.includes(decision)) {
                return res.status(400).json({ error: 'Invalid decision value' });
            }
            
            // Create approval record with NO financial data
            const approvalResult = await sql.query`
                INSERT INTO RequestApprovals (
                    request_id,
                    approver_user_id,
                    approver_role,
                    approval_level,
                    decision,
                    decision_date,
                    need_analysis_comments,
                    quantity_justification_review,
                    technical_specification_review,
                    stock_impact_analysis,
                    alternative_suggestions
                    -- NO BUDGET ANALYSIS
                    -- NO COST REVIEW
                    -- NO FINANCIAL APPROVAL
                )
                VALUES (
                    ${requestId},
                    ${req.user.userId},
                    ${req.user.role},
                    ${req.user.approvalLevel},
                    ${decision},
                    GETDATE(),
                    ${needAnalysisComments},
                    ${quantityJustificationReview},
                    ${technicalSpecificationReview},
                    ${stockImpactAnalysis},
                    ${alternativeSuggestions}
                )
            `;
            
            // Update request status based on approval level and decision
            if (decision === 'APPROVED') {
                const nextLevel = getNextApprovalLevel(req.user.approvalLevel);
                
                if (nextLevel) {
                    // Forward to next level
                    await sql.query`
                        UPDATE ProcurementRequests 
                        SET current_approval_level = ${nextLevel}
                        WHERE request_id = ${requestId}
                    `;
                } else {
                    // Final approval - ready for tender
                    await sql.query`
                        UPDATE ProcurementRequests 
                        SET status = 'APPROVED', current_approval_level = 'COMPLETED'
                        WHERE request_id = ${requestId}
                    `;
                }
            } else if (decision === 'REJECTED') {
                await sql.query`
                    UPDATE ProcurementRequests 
                    SET status = 'REJECTED'
                    WHERE request_id = ${requestId}
                `;
            }
            
            res.json({
                success: true,
                message: `Request ${decision.toLowerCase()} based on need analysis only`,
                approvalBasis: 'NEED_AND_SPECIFICATION_ANALYSIS',
                financialAnalysisIncluded: false,
                nextStage: decision === 'APPROVED' ? 'Tender creation (where financial data will first appear)' : null
            });
            
        } catch (error) {
            console.error('Error submitting approval:', error);
            res.status(500).json({ error: 'Failed to submit approval' });
        }
    },
    
    // Get approval history - NO financial data
    getApprovalHistory: async (req, res) => {
        try {
            const { requestId } = req.params;
            
            const approvals = await sql.query`
                SELECT 
                    ra.approval_id,
                    ra.decision,
                    ra.decision_date,
                    ra.need_analysis_comments,
                    ra.quantity_justification_review,
                    ra.technical_specification_review,
                    ra.stock_impact_analysis,
                    ra.alternative_suggestions,
                    u.full_name as approver_name,
                    ra.approver_role,
                    ra.approval_level
                    -- NO FINANCIAL ANALYSIS FIELDS
                FROM RequestApprovals ra
                JOIN Users u ON ra.approver_user_id = u.user_id
                WHERE ra.request_id = ${requestId}
                ORDER BY ra.decision_date ASC
            `;
            
            res.json({
                success: true,
                data: approvals.recordset,
                analysisType: 'NEED_BASED_ONLY',
                financialDataIncluded: false
            });
            
        } catch (error) {
            console.error('Error fetching approval history:', error);
            res.status(500).json({ error: 'Failed to fetch approval history' });
        }
    }
};

// ====================================================================
// 📊 4. STOCK API (QUANTITY ONLY)
// ====================================================================

const stockAPI = {
    
    // Get stock analysis - NO financial data
    getStockAnalysis: async (req, res) => {
        try {
            const { itemName } = req.params;
            
            const stockResult = await sql.query`
                SELECT 
                    cs.current_quantity,
                    cs.minimum_level,
                    cs.maximum_level,
                    cs.reorder_level,
                    cs.last_updated,
                    cs.stock_status,
                    im.item_name,
                    im.category_name,
                    im.specifications
                    -- NO UNIT_COST
                    -- NO STOCK_VALUE
                    -- NO FINANCIAL FIELDS
                FROM CurrentStock cs
                LEFT JOIN ItemMaster im ON cs.item_id = im.item_id
                WHERE im.item_name LIKE '%' + ${itemName} + '%'
            `;
            
            // Get usage analytics (quantities only)
            const usageResult = await sql.query`
                SELECT 
                    SUM(CASE WHEN st.transaction_date >= DATEADD(month, -6, GETDATE()) 
                             AND st.quantity < 0 THEN ABS(st.quantity) ELSE 0 END) as usage_last_6_months,
                    AVG(CASE WHEN st.transaction_date >= DATEADD(month, -6, GETDATE()) 
                             AND st.quantity < 0 THEN ABS(st.quantity) ELSE 0 END) as monthly_average
                    -- NO COST CALCULATIONS
                FROM StockTransactions st
                JOIN ItemMaster im ON st.item_id = im.item_id
                WHERE im.item_name LIKE '%' + ${itemName} + '%'
                GROUP BY im.item_id
            `;
            
            const stockData = stockResult.recordset[0] || {};
            const usageData = usageResult.recordset[0] || {};
            
            const analysis = {
                ...stockData,
                usage_last_6_months: usageData.usage_last_6_months || 0,
                monthly_average: usageData.monthly_average || 0,
                projected_6_month_need: (usageData.monthly_average || 0) * 6,
                is_critical: stockData.current_quantity <= stockData.minimum_level,
                // NO FINANCIAL ANALYSIS
                dataType: 'QUANTITY_ANALYSIS_ONLY'
            };
            
            res.json({
                success: true,
                data: analysis,
                analysisType: 'QUANTITY_AND_USAGE_ONLY',
                financialDataIncluded: false
            });
            
        } catch (error) {
            console.error('Error fetching stock analysis:', error);
            res.status(500).json({ error: 'Failed to fetch stock analysis' });
        }
    }
};

// ====================================================================
// 💰 5. TENDER API (FINANCIAL DATA ENTRY POINT)
// ====================================================================

const tenderAPI = {
    
    // Create tender from approved request - NO financial data yet
    createTender: async (req, res) => {
        try {
            const { requestId, tenderTitle, submissionDeadline, evaluationCriteria } = req.body;
            
            // Verify request is approved
            const requestCheck = await sql.query`
                SELECT status FROM ProcurementRequests 
                WHERE request_id = ${requestId} AND status = 'APPROVED'
            `;
            
            if (requestCheck.recordset.length === 0) {
                return res.status(400).json({ 
                    error: 'Request must be approved before creating tender',
                    currentStage: 'TENDER_CREATION',
                    financialDataStatus: 'NOT_YET_APPLICABLE'
                });
            }
            
            // Create tender with technical specifications only
            const tenderResult = await sql.query`
                EXEC CreateTenderFromApprovedRequest 
                    @RequestId = ${requestId},
                    @TenderTitle = ${tenderTitle},
                    @SubmissionDeadline = ${submissionDeadline},
                    @CreatedBy = ${req.user.userId}
            `;
            
            const tenderId = tenderResult.recordset[0].tender_id;
            
            res.json({
                success: true,
                tenderId: tenderId,
                message: 'Tender created with technical requirements only',
                dataType: 'TECHNICAL_SPECIFICATIONS_ONLY',
                financialDataStatus: 'WILL_BE_PROVIDED_BY_VENDORS',
                nextStage: 'Vendor bid submission (where financial data first appears)'
            });
            
        } catch (error) {
            console.error('Error creating tender:', error);
            res.status(500).json({ error: 'Failed to create tender' });
        }
    },
    
    // ✅ SUBMIT BID - FINANCIAL DATA FIRST APPEARS HERE
    submitBid: async (req, res) => {
        try {
            const { tenderId } = req.params;
            const {
                vendorName,
                vendorCode,
                vendorRegistration,
                contactPerson,
                contactEmail,
                technicalCompliance,
                deliveryTimelineDays,
                warrantyMonths,
                // ✅ FINANCIAL DATA - FIRST TIME IN THE SYSTEM
                quotedUnitPrice,
                totalQuotedAmount,
                taxPercentage,
                deliveryCharges,
                installationCharges,
                paymentTerms,
                advancePaymentPercentage
            } = req.body;
            
            // Validate financial data (first time validation is needed)
            if (!quotedUnitPrice || !totalQuotedAmount) {
                return res.status(400).json({
                    error: 'Financial quotation required',
                    message: 'Unit price and total amount must be provided in vendor bids',
                    stage: 'BID_SUBMISSION',
                    note: 'This is the first point where financial data enters the system'
                });
            }
            
            // Calculate final amounts
            const taxAmount = totalQuotedAmount * (taxPercentage / 100);
            const finalAmount = totalQuotedAmount + taxAmount + (deliveryCharges || 0) + (installationCharges || 0);
            
            // ✅ STORE FINANCIAL DATA FOR FIRST TIME
            const bidResult = await sql.query`
                INSERT INTO TenderBids (
                    tender_id,
                    vendor_name,
                    vendor_code,
                    vendor_registration,
                    contact_person,
                    contact_email,
                    technical_compliance,
                    delivery_timeline_offered,
                    warranty_months,
                    -- ✅ FINANCIAL FIELDS - FIRST APPEARANCE
                    quoted_unit_price,
                    total_quoted_amount,
                    tax_percentage,
                    tax_amount,
                    total_amount_including_tax,
                    delivery_charges,
                    installation_charges,
                    payment_terms,
                    advance_payment_percentage,
                    bid_status
                )
                VALUES (
                    ${tenderId},
                    ${vendorName},
                    ${vendorCode},
                    ${vendorRegistration},
                    ${contactPerson},
                    ${contactEmail},
                    ${technicalCompliance},
                    ${deliveryTimelineDays},
                    ${warrantyMonths},
                    -- ✅ FINANCIAL VALUES
                    ${quotedUnitPrice},
                    ${totalQuotedAmount},
                    ${taxPercentage},
                    ${taxAmount},
                    ${finalAmount},
                    ${deliveryCharges || 0},
                    ${installationCharges || 0},
                    ${paymentTerms},
                    ${advancePaymentPercentage || 0},
                    'SUBMITTED'
                )
            `;
            
            res.json({
                success: true,
                bidId: bidResult.recordset[0].bid_id,
                message: 'Bid submitted with financial quotation',
                milestone: 'FIRST_FINANCIAL_DATA_ENTRY',
                financialDataStatus: 'ENTERED_FOR_FIRST_TIME',
                totalAmount: finalAmount,
                note: 'This is the first point where monetary values enter the procurement system'
            });
            
        } catch (error) {
            console.error('Error submitting bid:', error);
            res.status(500).json({ error: 'Failed to submit bid' });
        }
    },
    
    // Get bid evaluation with financial data
    getBidEvaluation: async (req, res) => {
        try {
            const { tenderId } = req.params;
            
            const bids = await sql.query`
                SELECT 
                    bid_id,
                    vendor_name,
                    vendor_code,
                    technical_compliance,
                    technical_score,
                    delivery_timeline_offered,
                    warranty_months,
                    -- ✅ FINANCIAL DATA AVAILABLE FOR EVALUATION
                    quoted_unit_price,
                    total_quoted_amount,
                    tax_percentage,
                    tax_amount,
                    total_amount_including_tax,
                    delivery_charges,
                    installation_charges,
                    payment_terms,
                    advance_payment_percentage,
                    financial_score,
                    overall_ranking,
                    bid_status,
                    submission_date
                FROM TenderBids 
                WHERE tender_id = ${tenderId}
                ORDER BY overall_ranking, total_amount_including_tax
            `;
            
            res.json({
                success: true,
                data: bids.recordset,
                evaluationStage: 'FINANCIAL_EVALUATION_ACTIVE',
                dataType: 'TECHNICAL_AND_FINANCIAL',
                financialDataSource: 'VENDOR_QUOTATIONS',
                note: 'Financial evaluation based on vendor-provided pricing'
            });
            
        } catch (error) {
            console.error('Error fetching bid evaluation:', error);
            res.status(500).json({ error: 'Failed to fetch bid evaluation' });
        }
    }
};

// ====================================================================
// 🔧 6. HELPER FUNCTIONS
// ====================================================================

const getNextApprovalLevel = (currentLevel) => {
    const levels = ['DEC_LEVEL', 'DG_LEVEL', 'AD_LEVEL', 'PROCUREMENT_LEVEL'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
};

// ====================================================================
// 🚀 7. EXPRESS ROUTES SETUP
// ====================================================================

const router = express.Router();

// Apply financial data blocking to request and approval endpoints
router.use(['/requests*', '/approvals*', '/stock*'], blockFinancialData);

// Request Routes (NO financial data)
router.post('/requests', requestAPI.createRequest);
router.get('/requests/:requestId', requestAPI.getRequest);

// Approval Routes (NO financial data)  
router.post('/approvals', approvalAPI.submitApproval);
router.get('/approvals/:requestId/history', approvalAPI.getApprovalHistory);

// Stock Analysis Routes (NO financial data)
router.get('/stock/analysis/:itemName', stockAPI.getStockAnalysis);

// Tender Routes (Financial data starts here)
router.post('/tenders', tenderAPI.createTender);
router.post('/tenders/:tenderId/bids', tenderAPI.submitBid);
router.get('/tenders/:tenderId/bids', tenderAPI.getBidEvaluation);

// Error handling middleware
router.use((error, req, res, next) => {
    if (error.message.includes('financial')) {
        res.status(400).json({
            error: 'Financial data policy violation',
            message: 'Financial data is only allowed in tender/bid evaluation endpoints',
            allowedStage: 'Tender bid submission and evaluation',
            currentStage: req.path.includes('request') || req.path.includes('approval') ? 
                'REQUEST_APPROVAL_STAGE' : 'UNKNOWN'
        });
    } else {
        next(error);
    }
});

module.exports = {
    router,
    requestAPI,
    approvalAPI,
    stockAPI,
    tenderAPI
};

// ====================================================================
// 📚 USAGE EXAMPLE
// ====================================================================

// Example API calls demonstrating the financial data segregation:

// 1. Create request (NO financial data)
// POST /api/requests
// {
//     "title": "Laptops for IT Department",
//     "items": [
//         {
//             "name": "Laptop Standard",
//             "quantity": 10,
//             "specifications": "Core i5, 8GB RAM"
//             // NO cost, price, or budget fields
//         }
//     ]
// }

// 2. Submit approval (NO financial analysis)
// POST /api/approvals  
// {
//     "requestId": 123,
//     "decision": "APPROVED",
//     "needAnalysisComments": "Stock is low, quantity justified"
//     // NO budget approval or cost analysis
// }

// 3. Submit vendor bid (FINANCIAL DATA FIRST APPEARS)
// POST /api/tenders/456/bids
// {
//     "vendorName": "Tech Solutions Ltd",
//     "quotedUnitPrice": 75000,      // ✅ First financial data
//     "totalQuotedAmount": 750000,   // ✅ First financial data
//     "taxPercentage": 17            // ✅ First financial data
// }
