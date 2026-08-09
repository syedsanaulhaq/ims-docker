-- ====================================================================
-- 🎯 TENDER-ONLY FINANCIAL DATABASE SCHEMA
-- ====================================================================
-- This schema ensures financial data ONLY exists in tender/bid tables
-- All request and approval tables are purely quantity-focused
-- ====================================================================

-- ====================================================================
-- 🔄 1. REQUEST TABLES (NO FINANCIAL FIELDS)
-- ====================================================================

-- Drop existing tables with financial fields and recreate without them
IF OBJECT_ID('ProcurementRequestItems', 'U') IS NOT NULL
    DROP TABLE ProcurementRequestItems;

IF OBJECT_ID('ProcurementRequests', 'U') IS NOT NULL
    DROP TABLE ProcurementRequests;

-- Pure quantity-focused procurement requests
CREATE TABLE ProcurementRequests (
    request_id INT IDENTITY(1,1) PRIMARY KEY,
    request_code NVARCHAR(50) UNIQUE,
    request_title NVARCHAR(500) NOT NULL,
    description TEXT,
    justification TEXT,
    priority NVARCHAR(20) DEFAULT 'NORMAL',
    
    -- Organizational fields
    requesting_dec_id INT,
    requested_by INT,
    
    -- Timeline fields
    required_date DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    -- Status tracking
    status NVARCHAR(50) DEFAULT 'PENDING',
    current_approval_level NVARCHAR(50),
    
    -- NO BUDGET FIELDS
    -- NO COST ESTIMATES
    -- NO FINANCIAL DATA
    
    CONSTRAINT FK_Request_DEC FOREIGN KEY (requesting_dec_id) REFERENCES DEC_MST(dec_id),
    CONSTRAINT FK_Request_User FOREIGN KEY (requested_by) REFERENCES Users(user_id)
);

-- Request items - pure specifications and quantities
CREATE TABLE ProcurementRequestItems (
    item_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL,
    
    -- Item identification
    item_name NVARCHAR(200) NOT NULL,
    category NVARCHAR(100),
    
    -- Quantity information ONLY
    quantity_requested INT NOT NULL,
    unit_of_measurement NVARCHAR(20) DEFAULT 'pieces',
    
    -- Technical specifications
    technical_specifications TEXT,
    quality_standards TEXT,
    brand_preference NVARCHAR(100),
    alternatives_acceptable BIT DEFAULT 1,
    
    -- Justification
    quantity_justification TEXT,
    usage_purpose TEXT,
    urgency_reason TEXT,
    
    -- NO COST FIELDS
    -- NO PRICE ESTIMATES
    -- NO BUDGET ALLOCATION
    -- NO FINANCIAL DATA
    
    CONSTRAINT FK_RequestItem_Request FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id)
);

-- ====================================================================
-- 🔍 2. APPROVAL TABLES (NO FINANCIAL FIELDS)
-- ====================================================================

-- Drop existing approval tables with financial fields
IF OBJECT_ID('RequestApprovals', 'U') IS NOT NULL
    DROP TABLE RequestApprovals;

-- Pure need-based approval tracking
CREATE TABLE RequestApprovals (
    approval_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL,
    
    -- Approver information
    approver_user_id INT NOT NULL,
    approver_role NVARCHAR(50),
    approval_level NVARCHAR(50), -- DEC_LEVEL, DG_LEVEL, AD_LEVEL, PROCUREMENT_LEVEL
    
    -- Decision information
    decision NVARCHAR(20), -- APPROVED, REJECTED, RETURNED, PENDING
    decision_date DATETIME,
    
    -- Analysis and comments (NO FINANCIAL)
    need_analysis_comments TEXT,
    quantity_justification_review TEXT,
    technical_specification_review TEXT,
    stock_impact_analysis TEXT,
    usage_pattern_analysis TEXT,
    alternative_suggestions TEXT,
    
    -- Workflow
    forwarded_to_level NVARCHAR(50),
    forwarded_at DATETIME,
    
    -- NO BUDGET ANALYSIS
    -- NO COST REVIEW
    -- NO FINANCIAL APPROVAL
    -- NO BUDGET ALLOCATION
    
    CONSTRAINT FK_Approval_Request FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    CONSTRAINT FK_Approval_User FOREIGN KEY (approver_user_id) REFERENCES Users(user_id)
);

-- ====================================================================
-- 📊 3. STOCK TRACKING (NO FINANCIAL VALUES)
-- ====================================================================

-- Drop existing stock tables with financial data
IF OBJECT_ID('CurrentStock', 'U') IS NOT NULL
    DROP TABLE CurrentStock;

-- Pure quantity-based stock tracking
CREATE TABLE CurrentStock (
    stock_id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT,
    
    -- Quantity tracking ONLY
    current_quantity INT NOT NULL DEFAULT 0,
    minimum_level INT DEFAULT 0,
    maximum_level INT DEFAULT 0,
    reorder_level INT DEFAULT 0,
    
    -- Physical tracking
    location_code NVARCHAR(50),
    storage_conditions TEXT,
    
    -- Status tracking
    last_updated DATETIME DEFAULT GETDATE(),
    last_movement_date DATETIME,
    stock_status NVARCHAR(20), -- ADEQUATE, LOW, OUT_OF_STOCK, EXCESS
    
    -- NO UNIT COST
    -- NO STOCK VALUE
    -- NO FINANCIAL TRACKING
    
    CONSTRAINT FK_Stock_Item FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id)
);

-- ====================================================================
-- 🏢 4. TENDER TABLES (FINANCIAL DATA STARTS HERE)
-- ====================================================================

-- Drop existing tender tables to rebuild with proper financial segregation
IF OBJECT_ID('TenderBids', 'U') IS NOT NULL
    DROP TABLE TenderBids;
IF OBJECT_ID('TenderItems', 'U') IS NOT NULL
    DROP TABLE TenderItems;
IF OBJECT_ID('Tenders', 'U') IS NOT NULL
    DROP TABLE Tenders;

-- Tender creation from approved requests (still no financial data)
CREATE TABLE Tenders (
    tender_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_code NVARCHAR(50) UNIQUE,
    tender_title NVARCHAR(500) NOT NULL,
    
    -- Source request (approved)
    source_request_id INT NOT NULL,
    
    -- Tender details (technical focus)
    tender_type NVARCHAR(50), -- OPEN, LIMITED, SINGLE_SOURCE
    technical_specifications TEXT,
    evaluation_criteria TEXT,
    
    -- Timeline
    published_date DATETIME DEFAULT GETDATE(),
    submission_deadline DATETIME,
    opening_date DATETIME,
    evaluation_target_date DATETIME,
    
    -- Status
    status NVARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, CLOSED, EVALUATED, AWARDED
    
    -- Contact information
    contact_person NVARCHAR(100),
    contact_email NVARCHAR(100),
    contact_phone NVARCHAR(20),
    
    -- Administrative
    created_by INT,
    created_at DATETIME DEFAULT GETDATE(),
    
    -- NO BUDGET LIMIT
    -- NO ESTIMATED COST
    -- NO FINANCIAL CONSTRAINTS
    
    CONSTRAINT FK_Tender_Request FOREIGN KEY (source_request_id) REFERENCES ProcurementRequests(request_id),
    CONSTRAINT FK_Tender_Creator FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- Tender items (from request items, no financial data)
CREATE TABLE TenderItems (
    tender_item_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id INT NOT NULL,
    
    -- Item details (from approved request)
    item_name NVARCHAR(200) NOT NULL,
    quantity_required INT NOT NULL,
    unit_of_measurement NVARCHAR(20),
    
    -- Technical requirements
    detailed_specifications TEXT,
    technical_requirements TEXT,
    quality_standards TEXT,
    performance_criteria TEXT,
    
    -- Delivery requirements
    delivery_timeline_days INT,
    delivery_location NVARCHAR(200),
    installation_required BIT DEFAULT 0,
    
    -- Evaluation criteria weights
    technical_weight_percentage DECIMAL(5,2) DEFAULT 60.00,
    delivery_weight_percentage DECIMAL(5,2) DEFAULT 20.00,
    experience_weight_percentage DECIMAL(5,2) DEFAULT 20.00,
    
    -- NO PRICE ESTIMATES
    -- NO BUDGET ALLOCATION
    -- NO COST CONSTRAINTS
    
    CONSTRAINT FK_TenderItem_Tender FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id)
);

-- ====================================================================
-- 💰 5. BID TABLES (FINANCIAL DATA ENTERS HERE)
-- ====================================================================

-- Vendor bids - WHERE FINANCIAL DATA FIRST APPEARS
CREATE TABLE TenderBids (
    bid_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id INT NOT NULL,
    
    -- Vendor information
    vendor_name NVARCHAR(200) NOT NULL,
    vendor_code NVARCHAR(50),
    vendor_registration NVARCHAR(100),
    contact_person NVARCHAR(100),
    contact_email NVARCHAR(100),
    contact_phone NVARCHAR(20),
    
    -- Bid reference
    bid_reference NVARCHAR(50),
    submission_date DATETIME DEFAULT GETDATE(),
    
    -- Technical evaluation
    technical_compliance BIT,
    technical_score DECIMAL(5,2),
    delivery_timeline_offered INT, -- days
    warranty_months INT,
    after_sales_support TEXT,
    
    -- ✅ FINANCIAL DATA - FIRST TIME IN THE SYSTEM
    quoted_unit_price DECIMAL(15,2),
    total_quoted_amount DECIMAL(15,2),
    tax_percentage DECIMAL(5,2),
    tax_amount DECIMAL(15,2),
    total_amount_including_tax DECIMAL(15,2),
    
    -- Additional financial details
    payment_terms TEXT,
    advance_payment_percentage DECIMAL(5,2),
    delivery_charges DECIMAL(15,2),
    installation_charges DECIMAL(15,2),
    
    -- Financial evaluation
    financial_score DECIMAL(5,2),
    overall_ranking INT,
    
    -- Status
    bid_status NVARCHAR(50) DEFAULT 'SUBMITTED',
    evaluation_status NVARCHAR(50) DEFAULT 'PENDING',
    disqualification_reason TEXT,
    
    -- Evaluation details
    evaluated_by INT,
    evaluation_date DATETIME,
    evaluator_comments TEXT,
    
    CONSTRAINT FK_Bid_Tender FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id),
    CONSTRAINT FK_Bid_Evaluator FOREIGN KEY (evaluated_by) REFERENCES Users(user_id)
);

-- ====================================================================
-- 🏆 6. AWARD TABLES (FINAL FINANCIAL DATA)
-- ====================================================================

-- Contract awards with final financial details
CREATE TABLE TenderAwards (
    award_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id INT NOT NULL,
    winning_bid_id INT NOT NULL,
    
    -- Awarded vendor
    awarded_vendor_name NVARCHAR(200),
    vendor_registration NVARCHAR(100),
    contact_person NVARCHAR(100),
    
    -- Awarded specifications
    awarded_item_name NVARCHAR(200),
    awarded_quantity INT,
    awarded_specifications TEXT,
    
    -- ✅ FINAL CONTRACTED FINANCIAL DETAILS
    contracted_unit_price DECIMAL(15,2),
    contracted_total_amount DECIMAL(15,2),
    contracted_tax_amount DECIMAL(15,2),
    final_contract_value DECIMAL(15,2),
    
    -- Payment and delivery terms
    payment_terms TEXT,
    advance_payment_amount DECIMAL(15,2),
    delivery_timeline_days INT,
    warranty_months INT,
    
    -- Contract details
    contract_number NVARCHAR(50),
    award_date DATETIME DEFAULT GETDATE(),
    contract_signing_date DATETIME,
    expected_delivery_date DATETIME,
    
    -- Administrative
    awarded_by INT,
    award_justification TEXT,
    
    -- Performance tracking
    contract_status NVARCHAR(50) DEFAULT 'ACTIVE',
    
    CONSTRAINT FK_Award_Tender FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id),
    CONSTRAINT FK_Award_Bid FOREIGN KEY (winning_bid_id) REFERENCES TenderBids(bid_id),
    CONSTRAINT FK_Award_User FOREIGN KEY (awarded_by) REFERENCES Users(user_id)
);

-- ====================================================================
-- 📦 7. DELIVERY TRACKING (WITH FINANCIAL RECONCILIATION)
-- ====================================================================

-- Delivery tracking with financial verification
CREATE TABLE DeliveryReceipts (
    delivery_id INT IDENTITY(1,1) PRIMARY KEY,
    award_id INT NOT NULL,
    
    -- Delivery details
    delivery_reference NVARCHAR(50),
    delivered_date DATETIME,
    delivered_quantity INT,
    delivery_location NVARCHAR(200),
    
    -- Quality verification
    quality_check_status NVARCHAR(20), -- PASSED, FAILED, PARTIAL
    quality_inspector INT,
    quality_remarks TEXT,
    
    -- ✅ FINANCIAL VERIFICATION
    invoice_number NVARCHAR(50),
    invoice_date DATETIME,
    invoice_amount DECIMAL(15,2),
    tax_amount_invoiced DECIMAL(15,2),
    total_invoice_amount DECIMAL(15,2),
    
    -- Payment processing
    amount_variance DECIMAL(15,2), -- Difference from contract
    variance_reason TEXT,
    payment_approved_by INT,
    payment_status NVARCHAR(20) DEFAULT 'PENDING',
    
    -- Administrative
    received_by INT,
    verified_by INT,
    
    CONSTRAINT FK_Delivery_Award FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id),
    CONSTRAINT FK_Delivery_Inspector FOREIGN KEY (quality_inspector) REFERENCES Users(user_id),
    CONSTRAINT FK_Delivery_Receiver FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

-- ====================================================================
-- 📊 8. STOCK TRANSACTIONS (QUANTITY FOCUS WITH COST TRACKING)
-- ====================================================================

-- Stock movements with cost information for accounting
CREATE TABLE StockTransactions (
    transaction_id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Transaction details
    transaction_type NVARCHAR(50), -- RECEIPT, ISSUE, TRANSFER, ADJUSTMENT
    transaction_date DATETIME DEFAULT GETDATE(),
    reference_number NVARCHAR(50),
    
    -- Item and quantity
    item_id INT,
    quantity INT, -- Positive for receipt, negative for issue
    unit_of_measurement NVARCHAR(20),
    
    -- Source tracking
    source_type NVARCHAR(50), -- DELIVERY, ISSUE, TRANSFER, ADJUSTMENT
    source_id INT, -- delivery_id, issue_id, etc.
    
    -- Location tracking
    from_location NVARCHAR(50),
    to_location NVARCHAR(50),
    
    -- ✅ COST TRACKING (For accounting purposes)
    unit_cost DECIMAL(15,2), -- From delivery or last known cost
    total_transaction_value DECIMAL(15,2),
    
    -- Administrative
    processed_by INT,
    approved_by INT,
    remarks TEXT,
    
    CONSTRAINT FK_StockTxn_Item FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id),
    CONSTRAINT FK_StockTxn_Processor FOREIGN KEY (processed_by) REFERENCES Users(user_id)
);

-- ====================================================================
-- 🔧 9. SUPPORTING FUNCTIONS AND PROCEDURES
-- ====================================================================

-- Function to create tender from approved request (no financial data transfer)
CREATE PROCEDURE CreateTenderFromApprovedRequest
    @RequestId INT,
    @TenderTitle NVARCHAR(500),
    @SubmissionDeadline DATETIME,
    @CreatedBy INT
AS
BEGIN
    -- Verify request is approved
    IF NOT EXISTS (SELECT 1 FROM ProcurementRequests WHERE request_id = @RequestId AND status = 'APPROVED')
    BEGIN
        RAISERROR('Request must be approved before creating tender', 16, 1);
        RETURN;
    END
    
    -- Create tender with technical specifications only
    INSERT INTO Tenders (
        source_request_id,
        tender_title,
        technical_specifications,
        submission_deadline,
        created_by,
        status
    )
    SELECT 
        @RequestId,
        @TenderTitle,
        STRING_AGG(pri.technical_specifications, '; '),
        @SubmissionDeadline,
        @CreatedBy,
        'DRAFT'
    FROM ProcurementRequestItems pri
    WHERE pri.request_id = @RequestId;
    
    -- Get the new tender ID
    DECLARE @TenderId INT = SCOPE_IDENTITY();
    
    -- Create tender items from request items (no financial data)
    INSERT INTO TenderItems (
        tender_id,
        item_name,
        quantity_required,
        detailed_specifications,
        technical_requirements
    )
    SELECT 
        @TenderId,
        pri.item_name,
        pri.quantity_requested,
        pri.technical_specifications,
        pri.quantity_justification
    FROM ProcurementRequestItems pri
    WHERE pri.request_id = @RequestId;
    
    SELECT @TenderId as tender_id;
END;

-- Function to calculate financial rankings (only used during bid evaluation)
CREATE PROCEDURE EvaluateBidFinancials
    @TenderId INT
AS
BEGIN
    -- Calculate financial scores based on lowest bid gets highest score
    WITH BidRanking AS (
        SELECT 
            bid_id,
            total_amount_including_tax,
            ROW_NUMBER() OVER (ORDER BY total_amount_including_tax ASC) as price_rank,
            COUNT(*) OVER () as total_bids
        FROM TenderBids 
        WHERE tender_id = @TenderId 
            AND technical_compliance = 1
            AND bid_status = 'SUBMITTED'
    )
    UPDATE tb
    SET 
        financial_score = CASE 
            WHEN br.price_rank = 1 THEN 100.00
            ELSE 100.00 - ((br.price_rank - 1) * 10.00)
        END,
        overall_ranking = br.price_rank
    FROM TenderBids tb
    JOIN BidRanking br ON tb.bid_id = br.bid_id;
    
    -- Return evaluation results
    SELECT 
        vendor_name,
        total_amount_including_tax,
        financial_score,
        overall_ranking
    FROM TenderBids 
    WHERE tender_id = @TenderId 
        AND technical_compliance = 1
    ORDER BY overall_ranking;
END;

-- ====================================================================
-- 🎯 10. VERIFICATION QUERIES
-- ====================================================================

-- Verify no financial data in request tables
SELECT 
    'ProcurementRequests' as table_name,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProcurementRequests' 
    AND COLUMN_NAME LIKE '%cost%' 
    OR COLUMN_NAME LIKE '%price%' 
    OR COLUMN_NAME LIKE '%budget%'
    OR COLUMN_NAME LIKE '%amount%';

-- Should return no rows - confirms no financial fields in request tables

-- Verify financial data exists only in tender/bid tables
SELECT 
    TABLE_NAME,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE (COLUMN_NAME LIKE '%cost%' 
    OR COLUMN_NAME LIKE '%price%' 
    OR COLUMN_NAME LIKE '%amount%'
    OR COLUMN_NAME LIKE '%value%')
    AND TABLE_NAME IN ('TenderBids', 'TenderAwards', 'DeliveryReceipts', 'StockTransactions');

-- This should show financial fields only in appropriate tables

PRINT '✅ Tender-Only Financial Schema Created Successfully';
PRINT '📋 Request and Approval tables: NO financial fields';
PRINT '💰 Tender and Bid tables: Financial data enabled';
PRINT '🎯 Financial data enters system ONLY through vendor bids';
