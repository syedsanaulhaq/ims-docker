-- ====================================================================
-- 🔒 QUANTITY-FOCUSED PROCUREMENT SYSTEM - DATABASE MODIFICATIONS
-- ====================================================================
-- This script modifies the system to hide financial information from
-- public view while maintaining complete internal financial tracking.
-- ====================================================================

USE InventoryManagementDB;
GO

-- ====================================================================
-- 👥 1. ROLE-BASED ACCESS CONTROL SYSTEM
-- ====================================================================

-- Create table to define access levels for different user roles
CREATE TABLE user_access_levels (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    role_name NVARCHAR(50) UNIQUE NOT NULL,
    access_level NVARCHAR(30) NOT NULL, -- 'PUBLIC', 'RESTRICTED', 'CONFIDENTIAL'
    
    -- Financial Data Access
    can_view_costs BIT DEFAULT 0,
    can_view_budgets BIT DEFAULT 0,
    can_view_vendor_prices BIT DEFAULT 0,
    can_view_financial_analysis BIT DEFAULT 0,
    
    -- Procurement Data Access
    can_view_full_requests BIT DEFAULT 1,
    can_view_tender_details BIT DEFAULT 1,
    can_view_vendor_evaluation BIT DEFAULT 0,
    can_modify_workflows BIT DEFAULT 0,
    
    -- Administrative Access
    can_manage_system BIT DEFAULT 0,
    can_view_audit_trails BIT DEFAULT 0,
    
    -- Description
    access_description NVARCHAR(500),
    
    created_at DATETIME2 DEFAULT GETDATE(),
    
    INDEX IX_access_levels_role (role_name)
);

-- Insert standard access levels
INSERT INTO user_access_levels (role_name, access_level, can_view_costs, can_view_budgets, can_view_vendor_prices, can_view_financial_analysis, access_description) VALUES
('PUBLIC_USER', 'PUBLIC', 0, 0, 0, 0, 'General public - quantity and specification access only'),
('DEC_USER', 'PUBLIC', 0, 0, 0, 0, 'DEC users - can create requests but no financial data'),
('DG_ADMIN', 'RESTRICTED', 0, 1, 0, 1, 'DG Admin - limited financial oversight for approvals'),
('AD_ADMIN', 'CONFIDENTIAL', 1, 1, 1, 1, 'AD Admin - full financial access for final approvals'),
('PROCUREMENT_HEAD', 'CONFIDENTIAL', 1, 1, 1, 1, 'Procurement - full access for vendor management'),
('FINANCIAL_OFFICER', 'CONFIDENTIAL', 1, 1, 1, 1, 'Finance - complete financial oversight'),
('STORE_KEEPER', 'RESTRICTED', 0, 0, 0, 0, 'Store management - inventory focus only'),
('AUDITOR', 'CONFIDENTIAL', 1, 1, 1, 1, 'Audit - read-only access to all financial data');

-- Link users to access levels
ALTER TABLE AspNetUsers ADD 
    access_level NVARCHAR(30) DEFAULT 'PUBLIC',
    financial_access_granted BIT DEFAULT 0,
    access_granted_by UNIQUEIDENTIFIER NULL,
    access_granted_at DATETIME2 NULL;

-- ====================================================================
-- 📊 2. PUBLIC VIEWS (NO FINANCIAL INFORMATION)
-- ====================================================================

-- Public view of requests - quantities and specifications only
CREATE VIEW vw_public_requests AS
SELECT 
    ar.id,
    ar.title,
    ar.description,
    ar.request_type,
    ar.priority,
    ar.status,
    ar.required_date,
    ar.created_at,
    
    -- Organizational Context
    dm.DEC_Name,
    wi.WingName,
    o.Office_Name,
    
    -- Stock Context (No Financial)
    ar.stock_criticality,
    ar.triggered_by_low_stock,
    
    -- Workflow Status
    rwi.workflow_status,
    rwi.current_step_order,
    rwi.total_steps,
    rwi.completed_steps,
    
    -- Progress Percentage
    CASE 
        WHEN rwi.total_steps > 0 THEN (CAST(rwi.completed_steps AS FLOAT) / rwi.total_steps * 100)
        ELSE 0 
    END as progress_percentage,
    
    -- Status Description
    CASE rwi.workflow_status
        WHEN 'COMPLETED' THEN 'Approved - Proceeding to Procurement'
        WHEN 'REJECTED' THEN 'Request Rejected'
        WHEN 'IN_PROGRESS' THEN 'Under Review'
        ELSE 'Initiated'
    END as status_description
    
FROM approval_requests ar
INNER JOIN DEC_MST dm ON ar.dec_id = dm.DEC_ID
INNER JOIN WingsInformation wi ON dm.WingID = wi.WingID  
INNER JOIN tblOffices o ON wi.Office_ID = o.Office_ID
LEFT JOIN request_workflow_instances rwi ON ar.id = rwi.request_id;

-- Public view of request items - no costs
CREATE VIEW vw_public_request_items AS
SELECT 
    riws.id,
    riws.request_id,
    
    -- Item Information
    im.item_code,
    im.item_name,
    im.category_name,
    im.description as item_description,
    
    -- Quantity Information
    riws.requested_quantity,
    riws.approved_quantity,
    riws.current_stock_level,
    riws.minimum_stock_level,
    riws.stock_shortage_quantity,
    
    -- Status Indicators
    riws.is_critical_shortage,
    riws.is_below_minimum,
    riws.item_status,
    
    -- Specifications
    riws.detailed_specifications,
    riws.preferred_brand,
    riws.alternative_acceptable,
    riws.stock_justification,
    
    -- Stock Status Description
    CASE 
        WHEN riws.is_critical_shortage = 1 THEN 'CRITICAL - Out of Stock'
        WHEN riws.is_below_minimum = 1 THEN 'LOW - Below Minimum Level'
        ELSE 'ADEQUATE'
    END as stock_status_description
    
FROM request_items_with_stock riws
INNER JOIN item_masters im ON riws.item_id = im.id;

-- Public view of tenders - no financial information
CREATE VIEW vw_public_tenders AS
SELECT 
    pt.id,
    pt.tender_code,
    pt.tender_title,
    pt.tender_description,
    pt.tender_type,
    pt.tender_status,
    
    -- Important Dates
    pt.published_date,
    pt.submission_deadline,
    pt.opening_date,
    pt.evaluation_completion_target,
    
    -- Source Information (No Financial)
    ar.title as source_request_title,
    dm.DEC_Name as requesting_dec,
    
    -- Award Information (No Amount)
    v.vendor_name as awarded_vendor,
    pt.award_date,
    
    -- Status Description
    CASE pt.tender_status
        WHEN 'DRAFT' THEN 'Being Prepared'
        WHEN 'PUBLISHED' THEN 'Open for Bids'
        WHEN 'BIDDING_OPEN' THEN 'Accepting Submissions'
        WHEN 'BIDDING_CLOSED' THEN 'Submission Period Ended'
        WHEN 'UNDER_EVALUATION' THEN 'Evaluating Bids'
        WHEN 'AWARDED' THEN 'Contract Awarded'
        WHEN 'CANCELLED' THEN 'Tender Cancelled'
        ELSE 'Unknown Status'
    END as status_description
    
FROM procurement_tenders pt
LEFT JOIN approval_requests ar ON pt.source_request_id = ar.id
LEFT JOIN DEC_MST dm ON ar.dec_id = dm.DEC_ID
LEFT JOIN vendors v ON pt.awarded_vendor_id = v.id;

-- Public view of tender items - specifications only
CREATE VIEW vw_public_tender_items AS
SELECT 
    ti.id,
    ti.tender_id,
    ti.item_sequence,
    
    -- Item Information
    im.item_code,
    im.item_name,
    im.category_name,
    
    -- Quantity and Requirements
    ti.quantity_required,
    ti.detailed_specifications,
    ti.technical_requirements,
    ti.quality_standards,
    
    -- Evaluation Criteria (No Financial)
    ti.evaluation_criteria,
    ti.is_mandatory,
    ti.allow_partial_quantity,
    
    -- Requirement Description
    CASE 
        WHEN ti.is_mandatory = 1 THEN 'MANDATORY - Must be included'
        ELSE 'OPTIONAL - May be excluded'
    END as requirement_type
    
FROM tender_items ti
INNER JOIN item_masters im ON ti.item_id = im.id;

-- Public view of vendor bids - no pricing
CREATE VIEW vw_public_vendor_bids AS
SELECT 
    tb.id,
    tb.tender_id,
    
    -- Vendor Information
    v.vendor_name,
    v.vendor_code,
    v.contact_person,
    v.phone,
    v.email,
    
    -- Bid Information (No Financial)
    tb.bid_reference,
    tb.submitted_at,
    tb.submitted_by,
    
    -- Evaluation Status
    tb.is_technically_compliant,
    tb.technical_evaluation_score,
    tb.bid_status,
    tb.overall_rank,
    
    -- Award Status
    tb.is_awarded,
    
    -- Validity
    tb.bid_valid_until,
    
    -- Status Description
    CASE tb.bid_status
        WHEN 'SUBMITTED' THEN 'Under Initial Review'
        WHEN 'UNDER_EVALUATION' THEN 'Being Evaluated'
        WHEN 'QUALIFIED' THEN 'Meets Requirements'
        WHEN 'DISQUALIFIED' THEN 'Does Not Meet Requirements'
        WHEN 'AWARDED' THEN 'Contract Awarded'
        WHEN 'NOT_AWARDED' THEN 'Not Selected'
        ELSE 'Unknown Status'
    END as status_description
    
FROM tender_bids tb
INNER JOIN vendors v ON tb.vendor_id = v.id;

-- ====================================================================
-- 📊 3. FINANCIAL VIEWS (RESTRICTED ACCESS)
-- ====================================================================

-- Financial view of requests - for authorized users only
CREATE VIEW vw_financial_requests AS
SELECT 
    ar.*,
    
    -- Financial Information
    ar.estimated_amount,
    
    -- Calculated Financial Metrics
    SUM(riws.total_cost_estimate) as total_item_estimates,
    COUNT(riws.id) as total_items,
    AVG(riws.unit_cost_estimate) as average_unit_cost,
    
    -- Budget Context (if available)
    -- Add budget allocation logic here
    
    -- Cost Analysis
    CASE 
        WHEN ar.estimated_amount <= 50000 THEN 'LOW_VALUE'
        WHEN ar.estimated_amount <= 200000 THEN 'MEDIUM_VALUE'
        WHEN ar.estimated_amount <= 1000000 THEN 'HIGH_VALUE'
        ELSE 'VERY_HIGH_VALUE'
    END as procurement_category
    
FROM approval_requests ar
LEFT JOIN request_items_with_stock riws ON ar.id = riws.request_id
GROUP BY ar.id, ar.title, ar.description, ar.request_type, ar.priority, 
         ar.estimated_amount, ar.required_date, ar.status, ar.dec_id, 
         ar.created_by, ar.created_at, ar.is_stock_request, 
         ar.triggered_by_low_stock, ar.stock_criticality;

-- Financial view of tenders - complete financial data
CREATE VIEW vw_financial_tenders AS
SELECT 
    pt.*,
    
    -- Financial Summary
    SUM(ti.estimated_unit_price * ti.quantity_required) as estimated_total_value,
    MIN(tbi.unit_price * tbi.quoted_quantity) as lowest_bid_amount,
    MAX(tbi.unit_price * tbi.quoted_quantity) as highest_bid_amount,
    AVG(tbi.unit_price * tbi.quoted_quantity) as average_bid_amount,
    COUNT(DISTINCT tb.id) as total_bids_received,
    
    -- Cost Analysis
    pt.awarded_amount,
    (pt.estimated_amount - pt.awarded_amount) as cost_savings,
    CASE 
        WHEN pt.estimated_amount > 0 THEN 
            ((pt.estimated_amount - pt.awarded_amount) / pt.estimated_amount * 100)
        ELSE 0 
    END as savings_percentage
    
FROM procurement_tenders pt
LEFT JOIN tender_items ti ON pt.id = ti.tender_id
LEFT JOIN tender_bids tb ON pt.id = tb.tender_id
LEFT JOIN tender_bid_items tbi ON tb.id = tbi.bid_id
GROUP BY pt.id, pt.tender_code, pt.tender_title, pt.tender_description, 
         pt.tender_type, pt.tender_status, pt.published_date, 
         pt.submission_deadline, pt.opening_date, pt.estimated_amount,
         pt.awarded_amount, pt.created_by, pt.created_at;

-- ====================================================================
-- 🔐 4. ROLE-BASED ACCESS STORED PROCEDURES
-- ====================================================================

-- Get request details based on user access level
CREATE OR ALTER PROCEDURE sp_GetRequestDetails
    @RequestID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserAccessLevel NVARCHAR(30);
    DECLARE @CanViewCosts BIT;
    
    -- Get user access level
    SELECT 
        @UserAccessLevel = u.access_level,
        @CanViewCosts = ual.can_view_costs
    FROM AspNetUsers u
    LEFT JOIN user_access_levels ual ON u.access_level = ual.access_level
    WHERE u.Id = @UserID;
    
    -- Return data based on access level
    IF @CanViewCosts = 1
    BEGIN
        -- Return financial data for authorized users
        SELECT * FROM vw_financial_requests WHERE id = @RequestID;
        
        -- Return financial item details
        SELECT 
            riws.*,
            im.item_code,
            im.item_name,
            im.category_name
        FROM request_items_with_stock riws
        INNER JOIN item_masters im ON riws.item_id = im.id
        WHERE riws.request_id = @RequestID;
    END
    ELSE
    BEGIN
        -- Return public data only
        SELECT * FROM vw_public_requests WHERE id = @RequestID;
        
        -- Return public item details (no costs)
        SELECT * FROM vw_public_request_items WHERE request_id = @RequestID;
    END
END
GO

-- Get tender details based on user access level
CREATE OR ALTER PROCEDURE sp_GetTenderDetails
    @TenderID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CanViewVendorPrices BIT;
    
    -- Get user financial access
    SELECT 
        @CanViewVendorPrices = ual.can_view_vendor_prices
    FROM AspNetUsers u
    LEFT JOIN user_access_levels ual ON u.access_level = ual.access_level
    WHERE u.Id = @UserID;
    
    IF @CanViewVendorPrices = 1
    BEGIN
        -- Return complete tender with financial data
        SELECT * FROM vw_financial_tenders WHERE id = @TenderID;
        
        -- Return all bid details including prices
        SELECT 
            tb.*,
            tbi.*,
            v.vendor_name
        FROM tender_bids tb
        INNER JOIN tender_bid_items tbi ON tb.id = tbi.bid_id
        INNER JOIN vendors v ON tb.vendor_id = v.id
        WHERE tb.tender_id = @TenderID;
    END
    ELSE
    BEGIN
        -- Return public tender data only
        SELECT * FROM vw_public_tenders WHERE id = @TenderID;
        
        -- Return public tender items (no prices)
        SELECT * FROM vw_public_tender_items WHERE tender_id = @TenderID;
        
        -- Return public bid information (no pricing)
        SELECT * FROM vw_public_vendor_bids WHERE tender_id = @TenderID;
    END
END
GO

-- Get inventory status based on access level
CREATE OR ALTER PROCEDURE sp_GetInventoryStatusByAccess
    @ItemID UNIQUEIDENTIFIER = NULL,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CanViewCosts BIT;
    
    SELECT 
        @CanViewCosts = ual.can_view_costs
    FROM AspNetUsers u
    LEFT JOIN user_access_levels ual ON u.access_level = ual.access_level
    WHERE u.Id = @UserID;
    
    IF @CanViewCosts = 1
    BEGIN
        -- Return complete inventory with financial data
        SELECT 
            ci.*,
            im.item_code,
            im.item_name,
            im.category_name,
            ci.average_unit_cost,
            ci.total_value
        FROM current_inventory ci
        INNER JOIN item_masters im ON ci.item_id = im.id
        WHERE (@ItemID IS NULL OR ci.item_id = @ItemID);
    END
    ELSE
    BEGIN
        -- Return inventory without financial data
        SELECT 
            ci.item_id,
            im.item_code,
            im.item_name,
            im.category_name,
            ci.total_quantity,
            ci.available_quantity,
            ci.reserved_quantity,
            ci.minimum_level,
            ci.maximum_level,
            ci.stock_status,
            ci.needs_procurement,
            ci.last_transaction_date,
            ci.last_transaction_type
            -- NO COST COLUMNS
        FROM current_inventory ci
        INNER JOIN item_masters im ON ci.item_id = im.id
        WHERE (@ItemID IS NULL OR ci.item_id = @ItemID);
    END
END
GO

-- ====================================================================
-- 📱 5. API ACCESS CONTROL FUNCTIONS
-- ====================================================================

-- Function to check if user can view financial data
CREATE OR ALTER FUNCTION fn_CanViewFinancialData(@UserID UNIQUEIDENTIFIER)
RETURNS BIT
AS
BEGIN
    DECLARE @CanView BIT = 0;
    
    SELECT 
        @CanView = ISNULL(ual.can_view_costs, 0)
    FROM AspNetUsers u
    LEFT JOIN user_access_levels ual ON u.access_level = ual.access_level
    WHERE u.Id = @UserID;
    
    RETURN ISNULL(@CanView, 0);
END
GO

-- Function to get user's maximum access level
CREATE OR ALTER FUNCTION fn_GetUserAccessLevel(@UserID UNIQUEIDENTIFIER)
RETURNS NVARCHAR(30)
AS
BEGIN
    DECLARE @AccessLevel NVARCHAR(30) = 'PUBLIC';
    
    SELECT 
        @AccessLevel = ISNULL(u.access_level, 'PUBLIC')
    FROM AspNetUsers u
    WHERE u.Id = @UserID;
    
    RETURN @AccessLevel;
END
GO

-- ====================================================================
-- 🔒 6. DATA SECURITY POLICIES
-- ====================================================================

-- Create audit table for financial data access
CREATE TABLE financial_data_access_audit (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    accessed_table NVARCHAR(100) NOT NULL,
    accessed_data_type NVARCHAR(50) NOT NULL, -- 'COST_DATA', 'BUDGET_DATA', 'VENDOR_PRICES'
    access_time DATETIME2 DEFAULT GETDATE(),
    access_method NVARCHAR(100), -- 'PROCEDURE', 'VIEW', 'DIRECT_QUERY'
    ip_address NVARCHAR(45) NULL,
    session_id NVARCHAR(100) NULL,
    
    FOREIGN KEY (user_id) REFERENCES AspNetUsers(Id),
    INDEX IX_audit_user_time (user_id, access_time),
    INDEX IX_audit_data_type (accessed_data_type)
);

-- Trigger to audit financial data access
CREATE OR ALTER TRIGGER tr_audit_financial_access
ON vw_financial_requests
INSTEAD OF SELECT
AS
BEGIN
    -- Log access to financial data
    INSERT INTO financial_data_access_audit (user_id, accessed_table, accessed_data_type, access_method)
    VALUES (USER_ID(), 'vw_financial_requests', 'COST_DATA', 'VIEW');
    
    -- Return the data
    SELECT * FROM vw_financial_requests;
END
GO

PRINT '✅ Quantity-Focused Procurement System Database Modifications Completed!';
PRINT '🔒 Financial information now hidden from public view';
PRINT '👥 Role-based access control implemented';
PRINT '📊 Public views focus on quantities and specifications only';
PRINT '💰 Financial data available only to authorized personnel';

GO
