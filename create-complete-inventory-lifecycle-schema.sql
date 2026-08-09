-- ====================================================================
-- 📦 COMPLETE INVENTORY LIFECYCLE DATABASE SCHEMA  
-- ====================================================================
-- This schema supports the full inventory lifecycle from initial setup
-- through procurement, delivery, and real-time inventory tracking.
--
-- Flow: Initial Setup → Current Inventory → Request → Workflow → 
--       Tender → Bidding → Vendor Selection → Delivery → Stock Acquisition
-- ====================================================================

USE InventoryManagementDB;
GO

-- ====================================================================
-- 🏭 1. INITIAL STOCK SETUP SYSTEM
-- ====================================================================

-- Table to track initial inventory setup for items
CREATE TABLE initial_stock_setup (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Initial Setup Details
    initial_quantity INT NOT NULL,
    unit_cost DECIMAL(15,2) NULL,
    total_cost DECIMAL(15,2) NULL,
    supplier_id UNIQUEIDENTIFIER NULL, -- If known from which supplier
    
    -- Setup Information
    setup_date DATE NOT NULL,
    setup_reason NVARCHAR(500) NOT NULL, -- 'Initial inventory setup', 'Warehouse transfer', etc.
    location_id UNIQUEIDENTIFIER NULL, -- Where items are stored
    
    -- Reference Information
    reference_document NVARCHAR(200) NULL, -- Purchase order, transfer note, etc.
    batch_number NVARCHAR(100) NULL,
    
    -- Audit Fields
    setup_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Status
    is_active BIT DEFAULT 1, -- Can be disabled if setup was incorrect
    
    -- Indexes
    INDEX IX_initial_setup_item (item_id),
    INDEX IX_initial_setup_date (setup_date),
    
    FOREIGN KEY (item_id) REFERENCES item_masters(id),
    FOREIGN KEY (supplier_id) REFERENCES vendors(id),
    FOREIGN KEY (setup_by) REFERENCES AspNetUsers(Id)
);

-- ====================================================================
-- 📊 2. REAL-TIME CURRENT INVENTORY SYSTEM  
-- ====================================================================

-- Main table for current inventory levels (real-time)
CREATE TABLE current_inventory (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_id UNIQUEIDENTIFIER UNIQUE NOT NULL,
    
    -- Current Stock Levels
    total_quantity INT NOT NULL DEFAULT 0, -- Total items in system
    available_quantity INT NOT NULL DEFAULT 0, -- Available for issuance
    reserved_quantity INT NOT NULL DEFAULT 0, -- Reserved for pending orders
    issued_quantity INT NOT NULL DEFAULT 0, -- Currently issued to users
    
    -- Stock Management
    minimum_level INT NOT NULL DEFAULT 0, -- Reorder level
    maximum_level INT NOT NULL DEFAULT 1000, -- Maximum stock level
    reorder_quantity INT NOT NULL DEFAULT 0, -- Standard reorder quantity
    
    -- Location Information
    primary_location_id UNIQUEIDENTIFIER NULL, -- Main storage location
    
    -- Cost Information (Average Cost)
    average_unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Last Transaction Information
    last_transaction_date DATETIME2 NULL,
    last_transaction_type NVARCHAR(50) NULL,
    last_updated DATETIME2 DEFAULT GETDATE(),
    last_updated_by UNIQUEIDENTIFIER NOT NULL,
    
    -- Stock Status Calculation
    stock_status AS (
        CASE 
            WHEN available_quantity <= 0 THEN 'OUT_OF_STOCK'
            WHEN available_quantity <= minimum_level THEN 'LOW_STOCK'
            WHEN available_quantity >= maximum_level THEN 'OVERSTOCK'
            ELSE 'ADEQUATE'
        END
    ) PERSISTED,
    
    -- Alert Flags
    needs_procurement BIT AS (
        CASE WHEN available_quantity <= minimum_level THEN 1 ELSE 0 END
    ) PERSISTED,
    
    -- Indexes
    INDEX IX_current_inventory_item (item_id),
    INDEX IX_current_inventory_status (stock_status),
    INDEX IX_current_inventory_low_stock (needs_procurement) WHERE needs_procurement = 1,
    INDEX IX_current_inventory_last_updated (last_updated),
    
    FOREIGN KEY (item_id) REFERENCES item_masters(id),
    FOREIGN KEY (last_updated_by) REFERENCES AspNetUsers(Id)
);

-- ====================================================================
-- 📝 3. ENHANCED REQUEST SYSTEM (Integrated with Workflow)
-- ====================================================================

-- Enhanced approval requests table (extends existing)
ALTER TABLE approval_requests ADD 
    -- Request Classification
    is_stock_request BIT DEFAULT 1, -- Is this for inventory items
    is_procurement_approved BIT DEFAULT 0, -- Has procurement been approved
    
    -- Stock Context
    triggered_by_low_stock BIT DEFAULT 0, -- Auto-generated due to low stock
    stock_criticality NVARCHAR(20) DEFAULT 'NORMAL', -- 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'
    
    -- Procurement Information
    procurement_approved_at DATETIME2 NULL,
    procurement_approved_by UNIQUEIDENTIFIER NULL,
    tender_created BIT DEFAULT 0,
    tender_id UNIQUEIDENTIFIER NULL,
    
    FOREIGN KEY (procurement_approved_by) REFERENCES AspNetUsers(Id);

-- Request items with current stock context
CREATE TABLE request_items_with_stock (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Request Details
    requested_quantity INT NOT NULL,
    approved_quantity INT NULL, -- May be different from requested
    unit_cost_estimate DECIMAL(15,2) NULL,
    total_cost_estimate DECIMAL(15,2) NULL,
    
    -- Current Stock Context (at time of request)
    current_stock_level INT NOT NULL, -- Stock level when request was made
    minimum_stock_level INT NOT NULL, -- Minimum level at time of request
    stock_shortage_quantity INT AS (
        CASE 
            WHEN minimum_stock_level - current_stock_level > 0 
            THEN minimum_stock_level - current_stock_level 
            ELSE 0 
        END
    ) PERSISTED, -- How much short we are
    
    -- Urgency Indicators
    is_critical_shortage BIT AS (
        CASE WHEN current_stock_level <= 0 THEN 1 ELSE 0 END
    ) PERSISTED,
    is_below_minimum BIT AS (
        CASE WHEN current_stock_level < minimum_stock_level THEN 1 ELSE 0 END
    ) PERSISTED,
    
    -- Justification
    stock_justification NVARCHAR(1000), -- Why this quantity is needed
    
    -- Specifications
    detailed_specifications NVARCHAR(2000), -- Technical specifications
    preferred_brand NVARCHAR(200) NULL,
    alternative_acceptable BIT DEFAULT 1,
    
    -- Status
    item_status NVARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'MODIFIED'
    
    -- Indexes
    INDEX IX_request_items_request (request_id),
    INDEX IX_request_items_item (item_id),
    INDEX IX_request_items_critical (is_critical_shortage) WHERE is_critical_shortage = 1,
    
    FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item_masters(id)
);

-- ====================================================================
-- 🏪 4. TENDER MANAGEMENT SYSTEM
-- ====================================================================

-- Tenders created from approved procurement requests
CREATE TABLE procurement_tenders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tender_code NVARCHAR(50) UNIQUE NOT NULL, -- 'TEND-2025-001'
    
    -- Source Information
    source_request_id UNIQUEIDENTIFIER NULL, -- Original request that triggered this
    source_workflow_id UNIQUEIDENTIFIER NULL, -- Workflow that approved procurement
    
    -- Tender Details
    tender_title NVARCHAR(200) NOT NULL,
    tender_description NVARCHAR(2000),
    tender_type NVARCHAR(50) DEFAULT 'OPEN_TENDER', -- 'OPEN_TENDER', 'LIMITED_TENDER', 'QUOTATION'
    
    -- Tender Dates
    published_date DATE NOT NULL,
    submission_deadline DATETIME2 NOT NULL,
    opening_date DATETIME2 NOT NULL,
    evaluation_completion_target DATE NULL,
    
    -- Tender Status
    tender_status NVARCHAR(30) DEFAULT 'DRAFT', 
    -- 'DRAFT', 'PUBLISHED', 'BIDDING_OPEN', 'BIDDING_CLOSED', 'UNDER_EVALUATION', 'AWARDED', 'CANCELLED'
    
    -- Financial Information
    estimated_amount DECIMAL(15,2) NOT NULL,
    reserve_price DECIMAL(15,2) NULL, -- Maximum acceptable price
    
    -- Eligibility Criteria
    eligibility_criteria NVARCHAR(2000),
    technical_requirements NVARCHAR(2000),
    
    -- Tender Committee
    committee_chairman UNIQUEIDENTIFIER NULL,
    committee_members NVARCHAR(1000) NULL, -- JSON array of user IDs
    
    -- Documents
    tender_document_path NVARCHAR(500) NULL,
    
    -- Award Information
    awarded_vendor_id UNIQUEIDENTIFIER NULL,
    awarded_amount DECIMAL(15,2) NULL,
    award_date DATE NULL,
    award_reason NVARCHAR(1000) NULL,
    
    -- Audit Fields
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_tenders_code (tender_code),
    INDEX IX_tenders_status (tender_status),
    INDEX IX_tenders_dates (submission_deadline, opening_date),
    INDEX IX_tenders_source_request (source_request_id),
    
    FOREIGN KEY (source_request_id) REFERENCES approval_requests(id),
    FOREIGN KEY (source_workflow_id) REFERENCES request_workflow_instances(id),
    FOREIGN KEY (awarded_vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (committee_chairman) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id)
);

-- Items in each tender
CREATE TABLE tender_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tender_id UNIQUEIDENTIFIER NOT NULL,
    item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Tender Item Details
    item_sequence INT NOT NULL, -- Order in tender document
    quantity_required INT NOT NULL,
    
    -- Specifications
    detailed_specifications NVARCHAR(2000) NOT NULL,
    technical_requirements NVARCHAR(2000),
    quality_standards NVARCHAR(1000),
    
    -- Pricing
    estimated_unit_price DECIMAL(15,2) NULL,
    maximum_unit_price DECIMAL(15,2) NULL, -- Reserve price per unit
    
    -- Evaluation Criteria
    evaluation_criteria NVARCHAR(1000), -- How this item will be evaluated
    weightage_percentage DECIMAL(5,2) DEFAULT 100.00, -- If multiple items, weightage
    
    -- Status
    is_mandatory BIT DEFAULT 1, -- Must be included in bid
    allow_partial_quantity BIT DEFAULT 0, -- Can vendor bid for less quantity
    
    -- Indexes
    INDEX IX_tender_items_tender (tender_id),
    INDEX IX_tender_items_item (item_id),
    
    FOREIGN KEY (tender_id) REFERENCES procurement_tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item_masters(id)
);

-- ====================================================================
-- 💰 5. VENDOR BIDDING SYSTEM
-- ====================================================================

-- Bids submitted by vendors
CREATE TABLE tender_bids (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tender_id UNIQUEIDENTIFIER NOT NULL,
    vendor_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Bid Information
    bid_reference NVARCHAR(100) NOT NULL, -- Vendor's bid reference
    bid_amount DECIMAL(15,2) NOT NULL, -- Total bid amount
    
    -- Submission Details
    submitted_at DATETIME2 DEFAULT GETDATE(),
    submitted_by NVARCHAR(200), -- Name of person who submitted
    submission_method NVARCHAR(50) DEFAULT 'ONLINE', -- 'ONLINE', 'PHYSICAL', 'EMAIL'
    
    -- Technical Compliance
    is_technically_compliant BIT NULL, -- NULL = not evaluated yet
    technical_evaluation_score DECIMAL(5,2) NULL, -- Out of 100
    technical_comments NVARCHAR(2000),
    
    -- Financial Evaluation  
    is_financially_compliant BIT NULL,
    financial_evaluation_score DECIMAL(5,2) NULL, -- Out of 100
    financial_comments NVARCHAR(2000),
    
    -- Overall Evaluation
    overall_score DECIMAL(5,2) NULL, -- Weighted score out of 100
    overall_rank INT NULL, -- 1 = best, 2 = second best, etc.
    
    -- Bid Status
    bid_status NVARCHAR(30) DEFAULT 'SUBMITTED',
    -- 'SUBMITTED', 'UNDER_EVALUATION', 'QUALIFIED', 'DISQUALIFIED', 'AWARDED', 'NOT_AWARDED'
    
    -- Award Information
    is_awarded BIT DEFAULT 0,
    award_percentage DECIMAL(5,2) NULL, -- If partial award (e.g., 60% of items)
    
    -- Validity
    bid_validity_days INT NOT NULL DEFAULT 90,
    bid_valid_until DATE AS (DATEADD(DAY, bid_validity_days, CAST(submitted_at AS DATE))) PERSISTED,
    
    -- Evaluation Details
    evaluated_by UNIQUEIDENTIFIER NULL,
    evaluated_at DATETIME2 NULL,
    evaluation_remarks NVARCHAR(2000),
    
    -- Indexes
    INDEX IX_bids_tender (tender_id),
    INDEX IX_bids_vendor (vendor_id),
    INDEX IX_bids_status (bid_status),
    INDEX IX_bids_awarded (is_awarded) WHERE is_awarded = 1,
    
    FOREIGN KEY (tender_id) REFERENCES procurement_tenders(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (evaluated_by) REFERENCES AspNetUsers(Id)
);

-- Bid details for each item
CREATE TABLE tender_bid_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    bid_id UNIQUEIDENTIFIER NOT NULL,
    tender_item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Bid Item Details
    quoted_quantity INT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) AS (quoted_quantity * unit_price) PERSISTED,
    
    -- Vendor Specifications
    offered_brand NVARCHAR(200),
    offered_model NVARCHAR(200),
    offered_specifications NVARCHAR(2000),
    
    -- Compliance and Quality
    meets_specifications BIT NULL, -- Technical evaluation result
    quality_certification NVARCHAR(500), -- Certifications offered
    
    -- Delivery
    delivery_time_days INT NOT NULL,
    delivery_terms NVARCHAR(500),
    
    -- Warranty and Support
    warranty_period_months INT DEFAULT 12,
    warranty_terms NVARCHAR(1000),
    after_sales_support NVARCHAR(1000),
    
    -- Evaluation Scores
    technical_score DECIMAL(5,2) NULL,
    price_score DECIMAL(5,2) NULL,
    delivery_score DECIMAL(5,2) NULL,
    overall_item_score DECIMAL(5,2) NULL,
    
    -- Status
    item_awarded BIT DEFAULT 0,
    
    -- Indexes
    INDEX IX_bid_items_bid (bid_id),
    INDEX IX_bid_items_tender_item (tender_item_id),
    
    FOREIGN KEY (bid_id) REFERENCES tender_bids(id) ON DELETE CASCADE,
    FOREIGN KEY (tender_item_id) REFERENCES tender_items(id)
);

-- ====================================================================
-- 📋 6. PURCHASE ORDER SYSTEM
-- ====================================================================

-- Purchase orders generated from awarded bids
CREATE TABLE purchase_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    po_number NVARCHAR(50) UNIQUE NOT NULL, -- 'PO-2025-001'
    
    -- Source Information
    tender_id UNIQUEIDENTIFIER NOT NULL,
    winning_bid_id UNIQUEIDENTIFIER NOT NULL,
    vendor_id UNIQUEIDENTIFIER NOT NULL,
    
    -- PO Details
    po_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    po_amount DECIMAL(15,2) NOT NULL,
    
    -- Delivery Information
    delivery_address NVARCHAR(1000) NOT NULL,
    delivery_contact_person NVARCHAR(200) NOT NULL,
    delivery_phone NVARCHAR(50),
    
    -- Timeline
    expected_delivery_date DATE NOT NULL,
    latest_delivery_date DATE NOT NULL,
    
    -- Terms and Conditions
    payment_terms NVARCHAR(500) NOT NULL,
    delivery_terms NVARCHAR(500) NOT NULL,
    warranty_terms NVARCHAR(1000),
    
    -- PO Status
    po_status NVARCHAR(30) DEFAULT 'ISSUED',
    -- 'DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED', 'CANCELLED'
    
    -- Financial Tracking
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_pending DECIMAL(15,2) AS (po_amount - amount_paid) PERSISTED,
    
    -- Delivery Tracking
    total_items_ordered INT NOT NULL,
    total_items_delivered INT DEFAULT 0,
    delivery_completion_percentage AS (
        CASE 
            WHEN total_items_ordered > 0 
            THEN (CAST(total_items_delivered AS FLOAT) / total_items_ordered * 100)
            ELSE 0 
        END
    ) PERSISTED,
    
    -- Audit Fields
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_po_number (po_number),
    INDEX IX_po_vendor (vendor_id),
    INDEX IX_po_status (po_status),
    INDEX IX_po_delivery_date (expected_delivery_date),
    
    FOREIGN KEY (tender_id) REFERENCES procurement_tenders(id),
    FOREIGN KEY (winning_bid_id) REFERENCES tender_bids(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id)
);

-- ====================================================================
-- 📦 7. DELIVERY TRACKING SYSTEM
-- ====================================================================

-- Deliveries received against purchase orders
CREATE TABLE deliveries (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    delivery_number NVARCHAR(50) UNIQUE NOT NULL, -- 'DEL-2025-001'
    
    -- Source Information
    purchase_order_id UNIQUEIDENTIFIER NOT NULL,
    vendor_delivery_note NVARCHAR(100), -- Vendor's delivery note number
    
    -- Delivery Details
    delivery_date DATE NOT NULL,
    delivery_time TIME DEFAULT CAST(GETDATE() AS TIME),
    delivered_by NVARCHAR(200), -- Name of delivery person/company
    
    -- Receiving Information
    received_by UNIQUEIDENTIFIER NOT NULL, -- Store keeper or authorized person
    received_at DATETIME2 DEFAULT GETDATE(),
    receiving_location NVARCHAR(500),
    
    -- Delivery Status
    delivery_status NVARCHAR(30) DEFAULT 'PARTIAL',
    -- 'PARTIAL', 'COMPLETE', 'OVER_DELIVERY', 'SHORT_DELIVERY', 'DAMAGED', 'REJECTED'
    
    -- Quality Control
    quality_check_performed BIT DEFAULT 0,
    quality_check_passed BIT NULL, -- NULL = not checked yet
    quality_checked_by UNIQUEIDENTIFIER NULL,
    quality_check_date DATE NULL,
    quality_remarks NVARCHAR(1000),
    
    -- Documentation
    delivery_documents_complete BIT DEFAULT 0,
    delivery_documents_path NVARCHAR(500), -- Path to scanned documents
    
    -- Discrepancy Handling
    has_discrepancy BIT DEFAULT 0,
    discrepancy_description NVARCHAR(2000),
    discrepancy_resolved BIT DEFAULT 0,
    
    -- Approval for Stock Entry
    approved_for_stock_entry BIT DEFAULT 0,
    stock_entry_approved_by UNIQUEIDENTIFIER NULL,
    stock_entry_approved_at DATETIME2 NULL,
    
    -- Indexes
    INDEX IX_deliveries_number (delivery_number),
    INDEX IX_deliveries_po (purchase_order_id),
    INDEX IX_deliveries_date (delivery_date),
    INDEX IX_deliveries_status (delivery_status),
    
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (quality_checked_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (stock_entry_approved_by) REFERENCES AspNetUsers(Id)
);

-- Items in each delivery
CREATE TABLE delivery_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    delivery_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Item Information
    item_id UNIQUEIDENTIFIER NOT NULL,
    po_item_id UNIQUEIDENTIFIER NULL, -- Link to specific PO line item
    
    -- Quantity Information
    ordered_quantity INT NOT NULL, -- What was ordered
    delivered_quantity INT NOT NULL, -- What was actually delivered
    accepted_quantity INT NOT NULL, -- What was accepted after QC
    rejected_quantity INT AS (delivered_quantity - accepted_quantity) PERSISTED,
    
    -- Quality Information
    quality_status NVARCHAR(30) DEFAULT 'PENDING_QC',
    -- 'PENDING_QC', 'PASSED', 'FAILED', 'CONDITIONALLY_ACCEPTED'
    rejection_reason NVARCHAR(1000) NULL,
    
    -- Cost Information
    unit_cost DECIMAL(15,2) NOT NULL, -- Cost per unit as per PO
    total_cost DECIMAL(15,2) AS (accepted_quantity * unit_cost) PERSISTED,
    
    -- Serial Number Tracking
    has_serial_numbers BIT DEFAULT 0,
    serial_numbers_recorded BIT DEFAULT 0,
    
    -- Location Information
    storage_location NVARCHAR(200), -- Where items are stored
    
    -- Indexes
    INDEX IX_delivery_items_delivery (delivery_id),
    INDEX IX_delivery_items_item (item_id),
    INDEX IX_delivery_items_quality (quality_status),
    
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item_masters(id)
);

-- Serial numbers for delivered items (if applicable)
CREATE TABLE delivery_item_serial_numbers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    delivery_item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Serial Number Information
    serial_number NVARCHAR(100) NOT NULL,
    manufacturer_serial NVARCHAR(100) NULL, -- Original manufacturer serial
    
    -- Item Condition
    condition_on_receipt NVARCHAR(30) DEFAULT 'GOOD', -- 'GOOD', 'DAMAGED', 'DEFECTIVE'
    condition_remarks NVARCHAR(500),
    
    -- Status
    is_accepted BIT DEFAULT 1,
    
    -- Indexes
    INDEX IX_serial_numbers_delivery_item (delivery_item_id),
    INDEX IX_serial_numbers_serial (serial_number),
    
    FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(id) ON DELETE CASCADE
);

-- ====================================================================
-- 📊 8. STOCK ACQUISITION SYSTEM
-- ====================================================================

-- Final step: Adding delivered items to inventory
CREATE TABLE stock_acquisitions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    acquisition_number NVARCHAR(50) UNIQUE NOT NULL, -- 'ACQ-2025-001'
    
    -- Source Information
    delivery_id UNIQUEIDENTIFIER NOT NULL,
    purchase_order_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Acquisition Details
    acquisition_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    acquisition_type NVARCHAR(30) DEFAULT 'PURCHASE', -- 'PURCHASE', 'TRANSFER', 'DONATION', 'RETURN'
    
    -- Financial Information
    total_acquisition_cost DECIMAL(15,2) NOT NULL,
    
    -- Authorization
    authorized_by UNIQUEIDENTIFIER NOT NULL, -- Who authorized this acquisition
    processed_by UNIQUEIDENTIFIER NOT NULL, -- Store keeper who processed
    
    -- Status
    acquisition_status NVARCHAR(30) DEFAULT 'PROCESSED',
    -- 'PENDING', 'PROCESSED', 'COMPLETED', 'CANCELLED'
    
    -- Inventory Update Status
    inventory_updated BIT DEFAULT 0,
    inventory_update_date DATETIME2 NULL,
    
    -- Audit Fields
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_acquisitions_number (acquisition_number),
    INDEX IX_acquisitions_delivery (delivery_id),
    INDEX IX_acquisitions_date (acquisition_date),
    
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (authorized_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (processed_by) REFERENCES AspNetUsers(Id)
);

-- Items acquired in each acquisition
CREATE TABLE stock_acquisition_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    acquisition_id UNIQUEIDENTIFIER NOT NULL,
    item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Quantity and Cost
    quantity_acquired INT NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) AS (quantity_acquired * unit_cost) PERSISTED,
    
    -- Location
    storage_location_id UNIQUEIDENTIFIER NULL,
    
    -- Status
    added_to_inventory BIT DEFAULT 0,
    
    -- Indexes
    INDEX IX_acquisition_items_acquisition (acquisition_id),
    INDEX IX_acquisition_items_item (item_id),
    
    FOREIGN KEY (acquisition_id) REFERENCES stock_acquisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item_masters(id)
);

PRINT '✅ Complete Inventory Lifecycle Database Schema Created!';
PRINT '📦 Supports: Initial Setup → Current Inventory → Request → Workflow → Tender → Bidding → Delivery → Acquisition';
PRINT '🎯 Full integration with your approval flow: DEC → DG Admin → AD Admin → Procurement';

GO
