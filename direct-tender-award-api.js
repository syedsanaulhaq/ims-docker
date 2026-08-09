// ====================================================================
// 🏆 DIRECT TENDER AWARD API SERVICE
// ====================================================================
// Backend API for direct tender award system without bidding process.
// Financial data is handled ONLY in tender award operations.
// ====================================================================

const express = require('express');
const sql = require('mssql');

// ====================================================================
// 📋 1. TENDER PREPARATION API (NO FINANCIAL DATA)
// ====================================================================

const tenderPreparationAPI = {
    
    // Create tender from approved request (specifications only)
    createTender: async (req, res) => {
        try {
            const { 
                source_request_id, 
                tender_title, 
                tender_description, 
                required_delivery_date,
                items 
            } = req.body;
            const userId = req.user.userId;
            
            const transaction = new sql.Transaction();
            await transaction.begin();
            
            try {
                // Create tender (NO financial data)
                const result = await transaction.request()
                    .input('sourceRequestId', sql.Int, source_request_id)
                    .input('tenderTitle', sql.VarChar, tender_title)
                    .input('tenderDescription', sql.Text, tender_description)
                    .input('requiredDeliveryDate', sql.Date, required_delivery_date)
                    .input('createdBy', sql.Int, userId)
                    .execute('CreateTenderFromRequest');
                
                const tenderResult = result.recordset[0];
                
                if (tenderResult.result !== 'SUCCESS') {
                    throw new Error('Failed to create tender');
                }
                
                await transaction.commit();
                
                res.json({
                    success: true,
                    tender_id: tenderResult.tender_id,
                    tender_code: tenderResult.tender_code,
                    message: 'Tender prepared successfully (no financial data)',
                    next_step: 'READY_FOR_AWARD'
                });
                
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error creating tender:', error);
            res.status(500).json({ 
                error: 'Failed to create tender',
                details: error.message 
            });
        }
    },
    
    // Get tender details for award (specifications only)
    getTenderForAward: async (req, res) => {
        try {
            const { tenderId } = req.params;
            
            // Get tender information (no financial data)
            const tenderResult = await sql.query`
                SELECT 
                    t.tender_id,
                    t.tender_code,
                    t.tender_title,
                    t.tender_description,
                    t.tender_type,
                    t.priority,
                    t.tender_date,
                    t.required_delivery_date,
                    t.status,
                    
                    -- Source request info
                    pr.request_title as source_request_title,
                    d.dec_name as requesting_dec,
                    u.full_name as created_by_name,
                    t.created_at
                    
                FROM Tenders t
                LEFT JOIN ProcurementRequests pr ON t.source_request_id = pr.request_id
                LEFT JOIN DECs d ON t.requesting_dec_id = d.dec_id
                LEFT JOIN Users u ON t.created_by = u.user_id
                WHERE t.tender_id = ${tenderId}
                    AND t.status = 'PREPARED'
            `;
            
            if (tenderResult.recordset.length === 0) {
                return res.status(404).json({ 
                    error: 'Tender not found or not ready for award' 
                });
            }
            
            // Get tender items (specifications only)
            const itemsResult = await sql.query`
                SELECT 
                    ti.tender_item_id,
                    ti.item_sequence,
                    ti.item_name,
                    ti.category_name,
                    ti.quantity_required,
                    ti.detailed_specifications,
                    ti.technical_requirements,
                    ti.quality_standards,
                    ti.required_delivery_days,
                    ti.warranty_required_months
                    -- NO COST ESTIMATES
                FROM TenderItems ti
                WHERE ti.tender_id = ${tenderId}
                ORDER BY ti.item_sequence
            `;
            
            res.json({
                success: true,
                tender: tenderResult.recordset[0],
                items: itemsResult.recordset,
                message: 'Tender ready for award entry',
                financial_data_status: 'NOT_ENTERED_YET'
            });
            
        } catch (error) {
            console.error('Error fetching tender for award:', error);
            res.status(500).json({ 
                error: 'Failed to fetch tender details' 
            });
        }
    }
};

// ====================================================================
// 🏆 2. DIRECT AWARD API (WITH FINANCIAL DATA)
// ====================================================================

const directAwardAPI = {
    
    // Award tender directly to vendor (FINANCIAL DATA ENTRY POINT)
    awardTender: async (req, res) => {
        try {
            const {
                tender_id,
                // Vendor information
                vendor_name,
                vendor_registration,
                vendor_contact,
                vendor_phone,
                vendor_email,
                vendor_address,
                
                // ⭐ FINANCIAL DATA ⭐
                total_contract_value,
                contract_currency,
                payment_terms,
                
                // Contract details
                delivery_days,
                warranty_months,
                selection_reason,
                contract_reference,
                
                // Item pricing (financial data)
                item_pricing // Array of {tender_item_id, unit_price, total_cost}
                
            } = req.body;
            
            const userId = req.user.userId;
            
            // Validate financial data
            if (!total_contract_value || total_contract_value <= 0) {
                return res.status(400).json({
                    error: 'Total contract value is required and must be greater than 0'
                });
            }
            
            if (!item_pricing || !Array.isArray(item_pricing) || item_pricing.length === 0) {
                return res.status(400).json({
                    error: 'Item pricing information is required'
                });
            }
            
            // Validate pricing totals
            const calculatedTotal = item_pricing.reduce((sum, item) => sum + (item.total_cost || 0), 0);
            const priceDifference = Math.abs(calculatedTotal - total_contract_value);
            
            if (priceDifference > 1) { // Allow 1 PKR difference for rounding
                return res.status(400).json({
                    error: 'Total contract value does not match sum of item costs',
                    calculated_total: calculatedTotal,
                    entered_total: total_contract_value
                });
            }
            
            const transaction = new sql.Transaction();
            await transaction.begin();
            
            try {
                // Use stored procedure to award tender
                const result = await transaction.request()
                    .input('tenderId', sql.Int, tender_id)
                    .input('vendorName', sql.VarChar, vendor_name)
                    .input('vendorRegistration', sql.VarChar, vendor_registration)
                    .input('vendorContact', sql.VarChar, vendor_contact)
                    .input('vendorPhone', sql.VarChar, vendor_phone)
                    .input('vendorEmail', sql.VarChar, vendor_email)
                    .input('vendorAddress', sql.Text, vendor_address)
                    .input('totalContractValue', sql.Decimal(15,2), total_contract_value)
                    .input('contractCurrency', sql.VarChar, contract_currency || 'PKR')
                    .input('paymentTerms', sql.Text, payment_terms)
                    .input('deliveryDays', sql.Int, delivery_days)
                    .input('warrantyMonths', sql.Int, warranty_months)
                    .input('selectionReason', sql.Text, selection_reason)
                    .input('contractReference', sql.VarChar, contract_reference)
                    .input('awardedBy', sql.Int, userId)
                    .input('itemPricing', sql.NVarChar, JSON.stringify(item_pricing))
                    .execute('AwardTenderDirectly');
                
                const awardResult = result.recordset[0];
                
                if (awardResult.result !== 'SUCCESS') {
                    throw new Error('Failed to award tender');
                }
                
                // Log financial data entry
                await logFinancialDataEntry(userId, 'TENDER_AWARD', {
                    tender_id,
                    award_id: awardResult.award_id,
                    contract_value: total_contract_value,
                    vendor: vendor_name,
                    timestamp: new Date()
                });
                
                await transaction.commit();
                
                res.json({
                    success: true,
                    award_id: awardResult.award_id,
                    tender_id: awardResult.tender_id,
                    message: 'Tender awarded successfully with financial data',
                    financial_data_status: 'ENTERED_AND_SAVED',
                    next_step: 'DELIVERY_TRACKING'
                });
                
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error awarding tender:', error);
            res.status(500).json({ 
                error: 'Failed to award tender',
                details: error.message 
            });
        }
    },
    
    // Get award summary (financial data visible to authorized users)
    getAwardSummary: async (req, res) => {
        try {
            const { awardId } = req.params;
            const userRole = req.user.role;
            
            // Check if user can view financial data
            const canViewFinancial = await checkFinancialAccess(req.user.userId);
            
            let query = '';
            
            if (canViewFinancial) {
                // Full financial data for authorized users
                query = `
                    SELECT 
                        ta.*,
                        t.tender_code,
                        t.tender_title,
                        t.tender_description,
                        -- ⭐ FINANCIAL DATA VISIBLE ⭐
                        ta.total_contract_value,
                        ta.contract_currency,
                        ta.payment_terms,
                        
                        u.full_name as awarded_by_name
                    FROM TenderAwards ta
                    JOIN Tenders t ON ta.tender_id = t.tender_id
                    LEFT JOIN Users u ON ta.awarded_by = u.user_id
                    WHERE ta.award_id = ${awardId}
                `;
            } else {
                // Limited data for non-financial users
                query = `
                    SELECT 
                        ta.award_id,
                        ta.tender_id,
                        t.tender_code,
                        t.tender_title,
                        ta.awarded_vendor_name,
                        ta.vendor_contact_person,
                        ta.vendor_phone,
                        ta.vendor_email,
                        ta.award_date,
                        ta.promised_delivery_days,
                        ta.warranty_months,
                        ta.expected_delivery_date,
                        ta.award_status,
                        -- NO FINANCIAL FIELDS
                        u.full_name as awarded_by_name
                    FROM TenderAwards ta
                    JOIN Tenders t ON ta.tender_id = t.tender_id
                    LEFT JOIN Users u ON ta.awarded_by = u.user_id
                    WHERE ta.award_id = ${awardId}
                `;
            }
            
            const awardResult = await sql.query(query);
            
            if (awardResult.recordset.length === 0) {
                return res.status(404).json({ error: 'Award not found' });
            }
            
            // Get award items
            let itemQuery = '';
            
            if (canViewFinancial) {
                itemQuery = `
                    SELECT 
                        tai.*,
                        ti.detailed_specifications,
                        -- ⭐ FINANCIAL DATA VISIBLE ⭐
                        tai.unit_price,
                        tai.total_item_cost
                    FROM TenderAwardItems tai
                    JOIN TenderItems ti ON tai.tender_item_id = ti.tender_item_id
                    WHERE tai.award_id = ${awardId}
                    ORDER BY ti.item_sequence
                `;
            } else {
                itemQuery = `
                    SELECT 
                        tai.award_item_id,
                        tai.awarded_item_name,
                        tai.awarded_quantity,
                        tai.awarded_specifications,
                        ti.detailed_specifications
                        -- NO PRICING FIELDS
                    FROM TenderAwardItems tai
                    JOIN TenderItems ti ON tai.tender_item_id = ti.tender_item_id
                    WHERE tai.award_id = ${awardId}
                    ORDER BY ti.item_sequence
                `;
            }
            
            const itemsResult = await sql.query(itemQuery);
            
            res.json({
                success: true,
                award: awardResult.recordset[0],
                items: itemsResult.recordset,
                financial_access: canViewFinancial,
                message: canViewFinancial ? 
                    'Full award data with financial information' : 
                    'Award data without financial information'
            });
            
        } catch (error) {
            console.error('Error fetching award summary:', error);
            res.status(500).json({ 
                error: 'Failed to fetch award summary' 
            });
        }
    }
};

// ====================================================================
// 📊 3. TENDER LISTING API (NO FINANCIAL DATA IN LISTS)
// ====================================================================

const tenderListingAPI = {
    
    // Get all tenders (no financial data in listing)
    getAllTenders: async (req, res) => {
        try {
            const result = await sql.query`
                SELECT 
                    t.tender_id,
                    t.tender_code,
                    t.tender_title,
                    t.tender_type,
                    t.priority,
                    t.tender_date,
                    t.required_delivery_date,
                    t.status,
                    ts.status_description,
                    
                    -- Award status (but NO financial data)
                    CASE 
                        WHEN ta.award_id IS NOT NULL THEN 'AWARDED'
                        ELSE 'NOT_AWARDED'
                    END as award_status,
                    
                    ta.awarded_vendor_name,
                    ta.award_date,
                    -- NO CONTRACT VALUE IN LISTING
                    
                    d.dec_name as requesting_dec,
                    u.full_name as created_by_name,
                    t.created_at,
                    
                    (SELECT COUNT(*) FROM TenderItems WHERE tender_id = t.tender_id) as item_count
                    
                FROM Tenders t
                LEFT JOIN TenderStatuses ts ON t.status = ts.status_code
                LEFT JOIN TenderAwards ta ON t.tender_id = ta.tender_id
                LEFT JOIN DECs d ON t.requesting_dec_id = d.dec_id
                LEFT JOIN Users u ON t.created_by = u.user_id
                WHERE t.status != 'DELETED'
                ORDER BY t.created_at DESC
            `;
            
            res.json({
                success: true,
                tenders: result.recordset,
                message: 'Tender listing (no financial data)',
                financial_note: 'Financial data available in individual award details for authorized users'
            });
            
        } catch (error) {
            console.error('Error fetching tender list:', error);
            res.status(500).json({ 
                error: 'Failed to fetch tender list' 
            });
        }
    }
};

// ====================================================================
// 🔐 4. HELPER FUNCTIONS
// ====================================================================

const checkFinancialAccess = async (userId) => {
    try {
        const result = await sql.query`
            SELECT can_view_financial 
            FROM UserAccessLevels 
            WHERE user_id = ${userId} AND is_active = 1
        `;
        
        return result.recordset.length > 0 && result.recordset[0].can_view_financial;
    } catch (error) {
        console.error('Error checking financial access:', error);
        return false;
    }
};

const logFinancialDataEntry = async (userId, action, data) => {
    try {
        await sql.query`
            INSERT INTO FinancialDataEntryLog 
            (user_id, action_type, entry_data, entry_timestamp, ip_address)
            VALUES (${userId}, ${action}, ${JSON.stringify(data)}, GETDATE(), ${data.ip || 'unknown'})
        `;
    } catch (error) {
        console.error('Financial logging failed:', error);
    }
};

// ====================================================================
// 🛡️ 5. FINANCIAL DATA PROTECTION MIDDLEWARE
// ====================================================================

const protectFinancialData = async (req, res, next) => {
    // Check if this is a financial data operation
    if (req.path.includes('/award') && req.method === 'POST') {
        // Log financial data entry attempt
        await logFinancialDataEntry(req.user.userId, 'FINANCIAL_ENTRY_ATTEMPT', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            timestamp: new Date()
        });
    }
    
    next();
};

// ====================================================================
// 🚀 6. EXPRESS ROUTES SETUP
// ====================================================================

const router = express.Router();

// Apply financial protection middleware
router.use(protectFinancialData);

// Tender Preparation Routes (no financial data)
router.post('/tenders/create', tenderPreparationAPI.createTender);
router.get('/tenders/:tenderId/details', tenderPreparationAPI.getTenderForAward);

// Direct Award Routes (financial data entry point)
router.post('/tenders/award', directAwardAPI.awardTender);
router.get('/tender-awards/:awardId/summary', directAwardAPI.getAwardSummary);

// Listing Routes (no financial data)
router.get('/tenders', tenderListingAPI.getAllTenders);

// ====================================================================
// 📊 7. FINANCIAL AUDIT ENDPOINTS
// ====================================================================

// Get financial entry audit (restricted access)
router.get('/audit/financial-entries', async (req, res) => {
    try {
        const canViewFinancial = await checkFinancialAccess(req.user.userId);
        
        if (!canViewFinancial) {
            return res.status(403).json({ 
                error: 'Access denied - Financial audit access required' 
            });
        }
        
        const result = await sql.query`
            SELECT 
                fel.entry_id,
                fel.user_id,
                u.full_name as user_name,
                fel.action_type,
                fel.entry_data,
                fel.entry_timestamp,
                fel.ip_address
            FROM FinancialDataEntryLog fel
            JOIN Users u ON fel.user_id = u.user_id
            WHERE fel.entry_timestamp > DATEADD(day, -30, GETDATE())
            ORDER BY fel.entry_timestamp DESC
        `;
        
        res.json({
            success: true,
            audit_entries: result.recordset,
            message: 'Financial data entry audit trail (last 30 days)'
        });
        
    } catch (error) {
        console.error('Error fetching financial audit:', error);
        res.status(500).json({ error: 'Failed to fetch audit data' });
    }
});

module.exports = {
    router,
    tenderPreparationAPI,
    directAwardAPI,
    tenderListingAPI,
    checkFinancialAccess,
    logFinancialDataEntry
};

// ====================================================================
// 📚 USAGE EXAMPLE
// ====================================================================

/*
// In your main backend-server.cjs:

const { router: directAwardAPI } = require('./direct-tender-award-api');

app.use('/api/v1', directAwardAPI);

// Example API calls:

// 1. Create tender (no financial data)
POST /api/v1/tenders/create
{
    "source_request_id": 1,
    "tender_title": "Office Equipment Procurement",
    "tender_description": "Laptops and printers for Q3 2025",
    "required_delivery_date": "2025-10-15"
}

// 2. Award tender (financial data entry point)
POST /api/v1/tenders/award
{
    "tender_id": 1,
    "vendor_name": "TechSolutions Pakistan",
    "vendor_contact": "Ahmed Khan",
    "vendor_phone": "+92-21-12345678",
    "vendor_email": "ahmed@techsolutions.pk",
    "total_contract_value": 1410000.00,
    "contract_currency": "PKR",
    "payment_terms": "30% advance, 70% on delivery",
    "delivery_days": 21,
    "warranty_months": 24,
    "selection_reason": "Best technical compliance with competitive pricing",
    "item_pricing": [
        {"tender_item_id": 1, "unit_price": 85000.00, "total_cost": 1275000.00},
        {"tender_item_id": 2, "unit_price": 45000.00, "total_cost": 135000.00}
    ]
}

// 3. Get award summary (financial data based on user access)
GET /api/v1/tender-awards/1/summary

*/
