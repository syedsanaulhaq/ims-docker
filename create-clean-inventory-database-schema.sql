-- =====================================================
-- CLEAN INVENTORY MANAGEMENT DATABASE SCHEMA
-- Option A: Clean Slate with Preserved Tables
-- =====================================================

-- This script creates a clean, well-structured inventory management database
-- while preserving existing essential tables:
-- - categories, sub_categories
-- - AspNetUsers
-- - DEC_MST, tblOffices, WingsInformation  
-- - vendors

USE InventoryManagementDB;
GO

-- =====================================================
-- PRESERVED EXISTING TABLES (DO NOT MODIFY)
-- =====================================================
-- categories (existing - keep as is)
-- sub_categories (existing - keep as is) 
-- AspNetUsers (existing - keep as is)
-- DEC_MST (existing - keep as is)
-- tblOffices (existing - keep as is)
-- WingsInformation (existing - keep as is)
-- vendors (existing - keep as is)

-- =====================================================
-- 1. ORGANIZATIONAL STRUCTURE (Using existing tables)
-- =====================================================
-- We will use existing organizational structure:
-- tblOffices -> WingsInformation -> DEC_MST
-- No need to create new departments table as we'll reference DEC_MST directly

PRINT 'Using existing organizational structure: tblOffices -> WingsInformation -> DEC_MST';

-- =====================================================
-- 2. ITEM MASTERS TABLE (Clean version)
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'item_masters')
    DROP TABLE item_masters;

CREATE TABLE item_masters (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_code NVARCHAR(50) UNIQUE NOT NULL,
    nomenclature NVARCHAR(200) NOT NULL,
    category_id UNIQUEIDENTIFIER NOT NULL,
    sub_category_id UNIQUEIDENTIFIER NULL,
    specifications NVARCHAR(1000),
    description NVARCHAR(500),
    unit NVARCHAR(20) NOT NULL,
    minimum_stock_level INT DEFAULT 0,
    maximum_stock_level INT DEFAULT 0,
    reorder_point INT DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by UNIQUEIDENTIFIER NULL,
    
    -- Foreign Keys
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id),
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created clean item_masters table';

-- =====================================================
-- 3. STOCK TRANSACTIONS TABLE (Single Source of Truth)
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_transactions')
    DROP TABLE stock_transactions;

CREATE TABLE stock_transactions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    transaction_number NVARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: TXN-YYYY-NNNN
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    transaction_type NVARCHAR(20) NOT NULL, -- 'INITIAL', 'RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTMENT'
    quantity INT NOT NULL, -- Positive for IN, Negative for OUT
    unit_price DECIMAL(15,4) NULL,
    total_value DECIMAL(15,2) NULL,
    
    -- Reference Information
    reference_type NVARCHAR(20) NULL, -- 'TENDER', 'PURCHASE_ORDER', 'MANUAL', 'ISSUANCE', 'RETURN'
    reference_id UNIQUEIDENTIFIER NULL,
    reference_number NVARCHAR(50) NULL, -- Human-readable reference
    
    -- Organizational Information
    dec_id UNIQUEIDENTIFIER NULL,        -- For issuances/returns (links to DEC_MST)
    vendor_id UNIQUEIDENTIFIER NULL,     -- For receipts (links to vendors)
    office_id UNIQUEIDENTIFIER NULL,     -- For multi-office tracking
    
    -- Transaction Details
    transaction_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    remarks NVARCHAR(500),
    notes NVARCHAR(1000),
    
    -- Audit Information
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    approved_by UNIQUEIDENTIFIER NULL,
    approved_at DATETIME2 NULL,
    
    -- Status and Control
    status NVARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'CANCELLED', 'PENDING_APPROVAL'
    is_deleted BIT DEFAULT 0,
    deleted_at DATETIME2 NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    
    -- Foreign Keys
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
    FOREIGN KEY (dec_id) REFERENCES DEC_MST(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (approved_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (deleted_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created stock_transactions table';

-- =====================================================
-- 4. CURRENT STOCK LEVELS (Computed View/Table)
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'current_stock_levels')
    DROP TABLE current_stock_levels;

CREATE TABLE current_stock_levels (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_master_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
    current_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    available_quantity AS (current_quantity - reserved_quantity) PERSISTED,
    
    -- Stock Level Analysis
    minimum_stock_level INT DEFAULT 0,
    maximum_stock_level INT DEFAULT 0,
    reorder_point INT DEFAULT 0,
    
    -- Status Indicators
    stock_status AS (
        CASE 
            WHEN current_quantity <= 0 THEN 'OUT_OF_STOCK'
            WHEN current_quantity <= reorder_point THEN 'LOW_STOCK'
            WHEN current_quantity >= maximum_stock_level THEN 'OVERSTOCK'
            ELSE 'NORMAL'
        END
    ) PERSISTED,
    
    -- Last Transaction Info
    last_transaction_date DATETIME2,
    last_transaction_type NVARCHAR(20),
    
    -- Timestamps
    last_updated DATETIME2 DEFAULT GETDATE(),
    updated_by UNIQUEIDENTIFIER,
    
    -- Foreign Keys
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
    FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created current_stock_levels table';

-- =====================================================
-- 5. PURCHASE ORDERS TABLE (Clean version)
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'purchase_orders')
    DROP TABLE purchase_orders;

CREATE TABLE purchase_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    po_number NVARCHAR(50) UNIQUE NOT NULL,
    vendor_id UNIQUEIDENTIFIER NOT NULL,
    total_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,
    
    -- Dates
    order_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Status and Workflow
    status NVARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'
    
    -- Organizational
    requested_by UNIQUEIDENTIFIER NOT NULL,
    approved_by UNIQUEIDENTIFIER NULL,
    received_by UNIQUEIDENTIFIER NULL,
    
    -- Additional Info
    remarks NVARCHAR(500),
    terms_and_conditions NVARCHAR(2000),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (approved_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created purchase_orders table';

-- =====================================================
-- 6. PURCHASE ORDER ITEMS TABLE
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'purchase_order_items')
    DROP TABLE purchase_order_items;

CREATE TABLE purchase_order_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    purchase_order_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Quantities
    ordered_quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    pending_quantity AS (ordered_quantity - received_quantity) PERSISTED,
    
    -- Pricing
    unit_price DECIMAL(15,4) NOT NULL,
    total_price AS (ordered_quantity * unit_price) PERSISTED,
    
    -- Status
    status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'
    
    -- Additional Info
    specifications NVARCHAR(500),
    remarks NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
);
PRINT 'Created purchase_order_items table';

-- =====================================================
-- 7. STOCK ISSUANCES TABLE
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_issuances')
    DROP TABLE stock_issuances;

CREATE TABLE stock_issuances (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    issuance_number NVARCHAR(50) UNIQUE NOT NULL,
    dec_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Personnel
    requested_by UNIQUEIDENTIFIER NOT NULL,
    approved_by UNIQUEIDENTIFIER NULL,
    issued_by UNIQUEIDENTIFIER NULL,
    
    -- Dates
    request_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    required_date DATE,
    issue_date DATE,
    
    -- Status
    status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'COMPLETED', 'CANCELLED'
    priority NVARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    
    -- Additional Info
    purpose NVARCHAR(500),
    remarks NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (dec_id) REFERENCES DEC_MST(id),
    FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (approved_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (issued_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created stock_issuances table';

-- =====================================================
-- 8. STOCK ISSUANCE ITEMS TABLE
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_issuance_items')
    DROP TABLE stock_issuance_items;

CREATE TABLE stock_issuance_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    stock_issuance_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Quantities
    requested_quantity INT NOT NULL,
    approved_quantity INT DEFAULT 0,
    issued_quantity INT DEFAULT 0,
    
    -- Pricing (for valuation)
    unit_price DECIMAL(15,4) DEFAULT 0,
    total_value AS (issued_quantity * unit_price) PERSISTED,
    
    -- Status
    status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'ISSUED', 'CANCELLED'
    
    -- Additional Info
    remarks NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (stock_issuance_id) REFERENCES stock_issuances(id) ON DELETE CASCADE,
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
);
PRINT 'Created stock_issuance_items table';

-- =====================================================
-- 9. STOCK RETURNS TABLE
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_returns')
    DROP TABLE stock_returns;

CREATE TABLE stock_returns (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    return_number NVARCHAR(50) UNIQUE NOT NULL,
    dec_id UNIQUEIDENTIFIER NOT NULL,
    original_issuance_id UNIQUEIDENTIFIER NULL, -- Link to original issuance if applicable
    
    -- Personnel
    returned_by UNIQUEIDENTIFIER NOT NULL,
    received_by UNIQUEIDENTIFIER NULL,
    approved_by UNIQUEIDENTIFIER NULL,
    
    -- Dates
    return_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    received_date DATE,
    
    -- Return Information
    return_reason NVARCHAR(20) NOT NULL, -- 'EXCESS', 'DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'CANCELLED_WORK', 'OTHER'
    condition_status NVARCHAR(20) DEFAULT 'GOOD', -- 'GOOD', 'DAMAGED', 'EXPIRED', 'UNUSABLE'
    
    -- Status
    status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'RECEIVED', 'PROCESSED', 'CANCELLED'
    
    -- Additional Info
    remarks NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (dec_id) REFERENCES DEC_MST(id),
    FOREIGN KEY (original_issuance_id) REFERENCES stock_issuances(id),
    FOREIGN KEY (returned_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (approved_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created stock_returns table';

-- =====================================================
-- 10. STOCK RETURN ITEMS TABLE
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_return_items')
    DROP TABLE stock_return_items;

CREATE TABLE stock_return_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    stock_return_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    original_issuance_item_id UNIQUEIDENTIFIER NULL, -- Link to original issued item
    
    -- Quantities
    returned_quantity INT NOT NULL,
    accepted_quantity INT DEFAULT 0,
    rejected_quantity INT DEFAULT 0,
    
    -- Condition and Valuation
    condition_status NVARCHAR(20) DEFAULT 'GOOD',
    unit_price DECIMAL(15,4) DEFAULT 0,
    total_value AS (accepted_quantity * unit_price) PERSISTED,
    
    -- Status
    status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'
    
    -- Additional Info
    condition_remarks NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (stock_return_id) REFERENCES stock_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
    FOREIGN KEY (original_issuance_item_id) REFERENCES stock_issuance_items(id)
);
PRINT 'Created stock_return_items table';

-- =====================================================
-- 11. STOCK RESERVATIONS TABLE (For future allocations)
-- =====================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_reservations')
    DROP TABLE stock_reservations;

CREATE TABLE stock_reservations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    reservation_number NVARCHAR(50) UNIQUE NOT NULL,
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Reservation Details
    reserved_quantity INT NOT NULL,
    reference_type NVARCHAR(20) NOT NULL, -- 'ISSUANCE', 'PURCHASE_ORDER', 'TRANSFER'
    reference_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Dates
    reserved_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    expiry_date DATE,
    released_date DATE,
    
    -- Status
    status NVARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED'
    
    -- Personnel
    reserved_by UNIQUEIDENTIFIER NOT NULL,
    released_by UNIQUEIDENTIFIER NULL,
    
    -- Additional Info
    remarks NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
    FOREIGN KEY (reserved_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (released_by) REFERENCES AspNetUsers(Id)
);
PRINT 'Created stock_reservations table';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Stock Transactions Indexes
CREATE INDEX IX_stock_transactions_item_date ON stock_transactions(item_master_id, transaction_date);
CREATE INDEX IX_stock_transactions_type_status ON stock_transactions(transaction_type, status);
CREATE INDEX IX_stock_transactions_reference ON stock_transactions(reference_type, reference_id);
CREATE INDEX IX_stock_transactions_dec ON stock_transactions(dec_id, transaction_date);

-- Current Stock Levels Indexes
CREATE INDEX IX_current_stock_levels_status ON current_stock_levels(stock_status);
CREATE INDEX IX_current_stock_levels_quantity ON current_stock_levels(current_quantity);

-- Purchase Orders Indexes
CREATE INDEX IX_purchase_orders_vendor_date ON purchase_orders(vendor_id, order_date);
CREATE INDEX IX_purchase_orders_status ON purchase_orders(status);

-- Stock Issuances Indexes
CREATE INDEX IX_stock_issuances_dec_date ON stock_issuances(dec_id, request_date);
CREATE INDEX IX_stock_issuances_status ON stock_issuances(status);

PRINT 'Created performance indexes';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
PRINT '===============================================';
PRINT 'CLEAN INVENTORY DATABASE SCHEMA CREATED SUCCESSFULLY!';
PRINT '===============================================';
PRINT 'Preserved Tables: categories, sub_categories, AspNetUsers, DEC_MST, tblOffices, WingsInformation, vendors';
PRINT 'New Core Tables: item_masters, stock_transactions, current_stock_levels';
PRINT 'New Workflow Tables: purchase_orders, stock_issuances, stock_returns, stock_reservations';
PRINT 'Organizational Structure: tblOffices -> WingsInformation -> DEC_MST (used instead of departments)';
PRINT 'Performance indexes created for optimal query performance.';
PRINT '===============================================';
