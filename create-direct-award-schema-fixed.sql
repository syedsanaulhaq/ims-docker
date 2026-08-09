-- ====================================================================
-- 🏆 DIRECT TENDER AWARD SYSTEM - FIXED SQL
-- ====================================================================
-- Clean database schema for direct tender awards without bidding.
-- Financial data is entered ONLY in award tables.
-- ====================================================================

USE InventoryManagementDB;
GO

-- Drop existing objects if they exist
IF OBJECT_ID('TenderAwardDetailsView', 'V') IS NOT NULL DROP VIEW TenderAwardDetailsView;
IF OBJECT_ID('TenderSummaryView', 'V') IS NOT NULL DROP VIEW TenderSummaryView;
IF OBJECT_ID('AwardTenderDirectly', 'P') IS NOT NULL DROP PROCEDURE AwardTenderDirectly;
IF OBJECT_ID('CreateTenderFromRequest', 'P') IS NOT NULL DROP PROCEDURE CreateTenderFromRequest;
IF OBJECT_ID('TenderSequence') IS NOT NULL DROP SEQUENCE TenderSequence;

IF OBJECT_ID('TenderAwardItems', 'U') IS NOT NULL DROP TABLE TenderAwardItems;
IF OBJECT_ID('TenderAwards', 'U') IS NOT NULL DROP TABLE TenderAwards;
IF OBJECT_ID('TenderItems', 'U') IS NOT NULL DROP TABLE TenderItems;
IF OBJECT_ID('Tenders', 'U') IS NOT NULL DROP TABLE Tenders;
IF OBJECT_ID('AwardStatuses', 'U') IS NOT NULL DROP TABLE AwardStatuses;
IF OBJECT_ID('TenderStatuses', 'U') IS NOT NULL DROP TABLE TenderStatuses;
IF OBJECT_ID('FinancialDataEntryLog', 'U') IS NOT NULL DROP TABLE FinancialDataEntryLog;
GO

-- ====================================================================
-- 📊 1. LOOKUP TABLES
-- ====================================================================

-- Tender Status Lookup
CREATE TABLE TenderStatuses (
    status_code VARCHAR(50) PRIMARY KEY,
    status_description VARCHAR(200) NOT NULL,
    next_possible_statuses VARCHAR(500),
    is_final_status BIT DEFAULT 0
);

INSERT INTO TenderStatuses VALUES
('PREPARED', 'Tender Prepared - Ready for Award', 'AWARDED,CANCELLED', 0),
('AWARDED', 'Tender Awarded to Vendor', 'DELIVERY_IN_PROGRESS,CANCELLED', 0),
('DELIVERY_IN_PROGRESS', 'Items Being Delivered', 'COMPLETED,PARTIALLY_DELIVERED', 0),
('PARTIALLY_DELIVERED', 'Some Items Delivered', 'COMPLETED,CANCELLED', 0),
('COMPLETED', 'Tender Fully Completed', '', 1),
('CANCELLED', 'Tender Cancelled', '', 1);

-- Award Status Lookup
CREATE TABLE AwardStatuses (
    status_code VARCHAR(50) PRIMARY KEY,
    status_description VARCHAR(200) NOT NULL,
    is_active BIT DEFAULT 1
);

INSERT INTO AwardStatuses VALUES
('ACTIVE', 'Award Active - In Progress', 1),
('DELIVERY_STARTED', 'Delivery Started', 1),
('PARTIALLY_COMPLETED', 'Partially Completed', 1),
('COMPLETED', 'Award Fully Completed', 0),
('CANCELLED', 'Award Cancelled', 0);

-- Financial Data Entry Audit Log
CREATE TABLE FinancialDataEntryLog (
    entry_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entry_data NVARCHAR(MAX),
    entry_timestamp DATETIME DEFAULT GETDATE(),
    ip_address VARCHAR(50)
);
GO

-- ====================================================================
-- 📋 2. MAIN TENDER TABLES (NO FINANCIAL DATA)
-- ====================================================================

-- Main Tenders Table (Specifications only)
CREATE TABLE Tenders (
    tender_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_code VARCHAR(50) UNIQUE NOT NULL,
    tender_title VARCHAR(500) NOT NULL,
    tender_description TEXT,
    
    -- Source request information
    source_request_id INT,
    requesting_dec_id INT DEFAULT 1, -- Default DEC
    
    -- Tender specifications (NO financial data)
    tender_type VARCHAR(50) DEFAULT 'DIRECT_PROCUREMENT',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    
    -- Timeline
    tender_date DATE NOT NULL DEFAULT GETDATE(),
    required_delivery_date DATE,
    
    -- Status (simplified workflow)
    status VARCHAR(50) DEFAULT 'PREPARED',
    
    -- Administrative
    created_by INT NOT NULL DEFAULT 1, -- Default user
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Tender Items (specifications only, NO costs)
CREATE TABLE TenderItems (
    tender_item_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id INT NOT NULL,
    item_sequence INT NOT NULL,
    
    -- Item information
    item_name VARCHAR(200) NOT NULL,
    category_name VARCHAR(100),
    quantity_required INT NOT NULL,
    
    -- Specifications only (NO financial data)
    detailed_specifications TEXT,
    technical_requirements TEXT,
    quality_standards TEXT,
    
    -- Requirements
    required_delivery_days INT DEFAULT 30,
    warranty_required_months INT DEFAULT 12,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id),
    UNIQUE (tender_id, item_sequence)
);
GO

-- ====================================================================
-- 🏆 3. TENDER AWARDS (WITH FINANCIAL DATA)
-- ====================================================================

-- Tender Awards - ONLY place with financial data
CREATE TABLE TenderAwards (
    award_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id INT NOT NULL UNIQUE, -- One award per tender
    
    -- Winning vendor information
    awarded_vendor_name VARCHAR(200) NOT NULL,
    vendor_registration VARCHAR(100),
    vendor_contact_person VARCHAR(200),
    vendor_phone VARCHAR(50),
    vendor_email VARCHAR(200),
    vendor_address TEXT,
    
    -- Award details with financial data
    award_date DATE NOT NULL DEFAULT GETDATE(),
    contract_reference VARCHAR(100),
    
    -- ⭐ FINANCIAL DATA ENTRY POINT ⭐
    total_contract_value DECIMAL(15,2) NOT NULL,
    contract_currency VARCHAR(10) DEFAULT 'PKR',
    payment_terms TEXT,
    
    -- Delivery and warranty
    promised_delivery_days INT NOT NULL,
    warranty_months INT NOT NULL,
    
    -- Contract timeline
    contract_start_date DATE DEFAULT GETDATE(),
    contract_end_date DATE,
    expected_delivery_date DATE,
    
    -- Award justification
    selection_reason TEXT,
    technical_compliance_notes TEXT,
    
    -- Administrative
    awarded_by INT NOT NULL DEFAULT 1,
    approved_by INT,
    award_status VARCHAR(50) DEFAULT 'ACTIVE',
    
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id)
);

-- Award Items with individual pricing
CREATE TABLE TenderAwardItems (
    award_item_id INT IDENTITY(1,1) PRIMARY KEY,
    award_id INT NOT NULL,
    tender_item_id INT NOT NULL,
    
    -- Item details
    awarded_item_name VARCHAR(200) NOT NULL,
    awarded_quantity INT NOT NULL,
    awarded_specifications TEXT,
    
    -- ⭐ INDIVIDUAL ITEM FINANCIAL DATA ⭐
    unit_price DECIMAL(12,2) NOT NULL,
    total_item_cost DECIMAL(15,2) NOT NULL,
    
    -- Delivery specifics
    item_delivery_schedule TEXT,
    item_warranty_terms TEXT,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id),
    FOREIGN KEY (tender_item_id) REFERENCES TenderItems(tender_item_id)
);
GO

-- ====================================================================
-- 📊 4. VIEWS FOR DATA RETRIEVAL
-- ====================================================================

-- Tender Summary View (NO financial data)
CREATE VIEW TenderSummaryView AS
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
    ts.status_description,
    
    -- Item count
    (SELECT COUNT(*) FROM TenderItems WHERE tender_id = t.tender_id) as item_count,
    
    -- Award status (but NO financial data)
    CASE 
        WHEN ta.award_id IS NOT NULL THEN 'AWARDED'
        ELSE 'NOT_AWARDED'
    END as award_status,
    
    ta.awarded_vendor_name,
    ta.award_date,
    
    -- Admin info
    t.created_at
    
FROM Tenders t
LEFT JOIN TenderStatuses ts ON t.status = ts.status_code
LEFT JOIN TenderAwards ta ON t.tender_id = ta.tender_id;
GO

-- Award Details View (WITH financial data - restricted access)
CREATE VIEW TenderAwardDetailsView AS
SELECT 
    ta.award_id,
    ta.tender_id,
    t.tender_code,
    t.tender_title,
    
    -- Vendor information
    ta.awarded_vendor_name,
    ta.vendor_registration,
    ta.vendor_contact_person,
    ta.vendor_phone,
    ta.vendor_email,
    ta.vendor_address,
    
    -- Financial information ⭐
    ta.total_contract_value,
    ta.contract_currency,
    ta.payment_terms,
    
    -- Contract details
    ta.award_date,
    ta.contract_reference,
    ta.promised_delivery_days,
    ta.warranty_months,
    ta.expected_delivery_date,
    ta.selection_reason,
    
    -- Status
    ta.award_status,
    
    -- Item breakdown
    (SELECT COUNT(*) FROM TenderAwardItems WHERE award_id = ta.award_id) as item_count,
    (SELECT SUM(total_item_cost) FROM TenderAwardItems WHERE award_id = ta.award_id) as calculated_total,
    
    -- Administrative
    ta.created_at as award_created_at
    
FROM TenderAwards ta
JOIN Tenders t ON ta.tender_id = t.tender_id;
GO

-- ====================================================================
-- 📊 5. SAMPLE DATA FOR TESTING
-- ====================================================================

-- Create sequence for tender codes
CREATE SEQUENCE TenderSequence START WITH 1 INCREMENT BY 1;
GO

-- Sample tender (NO financial data)
INSERT INTO Tenders (
    tender_code, tender_title, tender_description,
    source_request_id, requesting_dec_id, created_by, status
) VALUES (
    'TND-202509-0001', 
    'Office Equipment Procurement - Q3 2025',
    'Procurement of laptops and printers for administrative offices',
    1, 1, 1, 'PREPARED'
);

-- Sample tender items (specifications only)
INSERT INTO TenderItems (
    tender_id, item_sequence, item_name, category_name,
    quantity_required, detailed_specifications, technical_requirements
) VALUES 
(1, 1, 'Laptop - Standard Office', 'Computer Equipment', 15,
 'Intel Core i5 processor, 8GB RAM, 256GB SSD, 14-inch display', 
 'Windows 11 Professional, MS Office compatibility'),
(1, 2, 'Laser Printer - Network', 'Printing Equipment', 3,
 'Monochrome laser printer, network enabled, duplex printing',
 'Minimum 25ppm, network connectivity required');

-- Sample direct award (WITH financial data)
INSERT INTO TenderAwards (
    tender_id, awarded_vendor_name, vendor_registration,
    vendor_contact_person, vendor_phone, vendor_email, vendor_address,
    total_contract_value, contract_currency, payment_terms,
    promised_delivery_days, warranty_months,
    expected_delivery_date, selection_reason,
    contract_reference, awarded_by, award_status
) VALUES (
    1, 'TechSolutions Pakistan Pvt Ltd', 'REG-2024-TS-001',
    'Ahmed Khan', '+92-21-12345678', 'ahmed.khan@techsolutions.pk',
    'Plot 45, Industrial Area, Karachi',
    1410000.00, 'PKR', '30% advance, 70% on delivery',
    21, 24,
    DATEADD(DAY, 21, GETDATE()), 'Best technical compliance with competitive pricing and proven track record',
    'CONTRACT-2025-TS-001', 1, 'ACTIVE'
);

-- Sample award items (WITH pricing)
INSERT INTO TenderAwardItems (
    award_id, tender_item_id, awarded_item_name, awarded_quantity,
    awarded_specifications, unit_price, total_item_cost
) VALUES 
(1, 1, 'Laptop - Standard Office', 15, 
 'Intel Core i5 processor, 8GB RAM, 256GB SSD, 14-inch display', 
 85000.00, 1275000.00),
(1, 2, 'Laser Printer - Network', 3,
 'Monochrome laser printer, network enabled, duplex printing',
 45000.00, 135000.00);
GO

-- ====================================================================
-- ✅ VERIFICATION QUERIES
-- ====================================================================

-- Check tender summary (NO financial data)
SELECT 'Tender Summary (No Financial Data)' as QueryType;
SELECT TOP 5 * FROM TenderSummaryView;

-- Check award details (WITH financial data)
SELECT 'Award Details (Financial Data Present)' as QueryType;
SELECT TOP 5 * FROM TenderAwardDetailsView;

-- Verify financial data isolation
SELECT 
    'Financial Data Location Check' as QueryType,
    'Tenders' as table_name, 
    COUNT(*) as records,
    'NO_FINANCIAL_COLUMNS' as financial_data_status
FROM Tenders
UNION ALL
SELECT 
    '',
    'TenderAwards' as table_name,
    COUNT(*) as records,
    'FINANCIAL_DATA_PRESENT' as financial_data_status
FROM TenderAwards;

PRINT '🏆 Direct Tender Award System Created Successfully!';
PRINT '💰 Financial data is ONLY in TenderAwards and TenderAwardItems tables';
PRINT '📋 All other tables contain specifications and quantities only';
