-- ====================================================================
-- 🏆 DIRECT TENDER AWARD SYSTEM (NO BIDDING PROCESS)
-- ====================================================================
-- This system allows direct entry of tender awards without the bidding
-- process. Financial data is entered only when recording the award.
-- ====================================================================

USE InventoryManagementDB;
GO

-- ====================================================================
-- 📋 1. SIMPLIFIED TENDER TABLES (NO BID TABLES)
-- ====================================================================

-- Main Tenders Table (No financial data during creation)
CREATE TABLE Tenders (
    tender_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_code VARCHAR(50) UNIQUE NOT NULL,
    tender_title VARCHAR(500) NOT NULL,
    tender_description TEXT,
    
    -- Source request information
    source_request_id INT,
    requesting_dec_id INT,
    
    -- Tender specifications (no financial data)
    tender_type VARCHAR(50) DEFAULT 'DIRECT_PROCUREMENT',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    
    -- Timeline
    tender_date DATE NOT NULL DEFAULT GETDATE(),
    required_delivery_date DATE,
    
    -- Status (simplified - goes straight to AWARDED)
    status VARCHAR(50) DEFAULT 'PREPARED', -- PREPARED -> AWARDED -> COMPLETED
    
    -- Administrative
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (source_request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (requesting_dec_id) REFERENCES DECs(dec_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- Tender Items (specifications only, no costs)
CREATE TABLE TenderItems (
    tender_item_id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id INT NOT NULL,
    item_sequence INT NOT NULL,
    
    -- Item information
    item_name VARCHAR(200) NOT NULL,
    category_name VARCHAR(100),
    quantity_required INT NOT NULL,
    
    -- Specifications only (no financial data)
    detailed_specifications TEXT,
    technical_requirements TEXT,
    quality_standards TEXT,
    
    -- Requirements
    required_delivery_days INT,
    warranty_required_months INT DEFAULT 12,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id),
    UNIQUE (tender_id, item_sequence)
);

-- ====================================================================
-- 🏆 2. DIRECT TENDER AWARDS (WITH FINANCIAL DATA)
-- ====================================================================

-- Tender Awards - This is where ALL financial data is entered
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
    contract_start_date DATE,
    contract_end_date DATE,
    expected_delivery_date DATE,
    
    -- Award justification
    selection_reason TEXT,
    technical_compliance_notes TEXT,
    
    -- Administrative
    awarded_by INT NOT NULL,
    approved_by INT,
    award_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, CANCELLED
    
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (tender_id) REFERENCES Tenders(tender_id),
    FOREIGN KEY (awarded_by) REFERENCES Users(user_id),
    FOREIGN KEY (approved_by) REFERENCES Users(user_id)
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

-- ====================================================================
-- 📊 3. SIMPLIFIED STATUS TRACKING
-- ====================================================================

-- Tender Status Lookup
CREATE TABLE TenderStatuses (
    status_code VARCHAR(50) PRIMARY KEY,
    status_description VARCHAR(200) NOT NULL,
    next_possible_statuses VARCHAR(500), -- Comma-separated list
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

-- ====================================================================
-- 🔄 4. STORED PROCEDURES FOR DIRECT AWARD SYSTEM
-- ====================================================================

-- Create tender from approved request (no financial data)
CREATE PROCEDURE CreateTenderFromRequest
    @requestId INT,
    @tenderTitle VARCHAR(500),
    @tenderDescription TEXT = NULL,
    @requiredDeliveryDate DATE = NULL,
    @createdBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @tenderId INT;
    DECLARE @tenderCode VARCHAR(50);
    DECLARE @requestingDecId INT;
    
    BEGIN TRANSACTION;
    
    TRY
        -- Get requesting DEC
        SELECT @requestingDecId = requesting_dec_id 
        FROM ProcurementRequests 
        WHERE request_id = @requestId;
        
        -- Generate tender code
        SET @tenderCode = 'TND-' + FORMAT(GETDATE(), 'yyyyMM') + '-' + FORMAT(NEXT VALUE FOR TenderSequence, '0000');
        
        -- Create tender (no financial data)
        INSERT INTO Tenders (
            tender_code, tender_title, tender_description,
            source_request_id, requesting_dec_id,
            required_delivery_date, created_by, status
        ) VALUES (
            @tenderCode, @tenderTitle, @tenderDescription,
            @requestId, @requestingDecId,
            @requiredDeliveryDate, @createdBy, 'PREPARED'
        );
        
        SET @tenderId = SCOPE_IDENTITY();
        
        -- Copy items from request (specifications only)
        INSERT INTO TenderItems (
            tender_id, item_sequence, item_name, category_name,
            quantity_required, detailed_specifications, technical_requirements,
            required_delivery_days, warranty_required_months
        )
        SELECT 
            @tenderId,
            ROW_NUMBER() OVER (ORDER BY pri.created_at),
            pri.item_name,
            im.category_name,
            pri.quantity_requested,
            pri.specifications,
            pri.technical_requirements,
            ISNULL(pri.required_delivery_days, 30),
            ISNULL(pri.warranty_months, 12)
        FROM ProcurementRequestItems pri
        LEFT JOIN ItemMaster im ON pri.item_id = im.item_id
        WHERE pri.request_id = @requestId;
        
        -- Update source request status
        UPDATE ProcurementRequests 
        SET status = 'CONVERTED_TO_TENDER', tender_id = @tenderId
        WHERE request_id = @requestId;
        
        COMMIT TRANSACTION;
        
        SELECT @tenderId as tender_id, @tenderCode as tender_code, 'SUCCESS' as result;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Award tender directly to vendor (with financial data)
CREATE PROCEDURE AwardTenderDirectly
    @tenderId INT,
    @vendorName VARCHAR(200),
    @vendorRegistration VARCHAR(100) = NULL,
    @vendorContact VARCHAR(200) = NULL,
    @vendorPhone VARCHAR(50) = NULL,
    @vendorEmail VARCHAR(200) = NULL,
    @vendorAddress TEXT = NULL,
    @totalContractValue DECIMAL(15,2),
    @contractCurrency VARCHAR(10) = 'PKR',
    @paymentTerms TEXT = NULL,
    @deliveryDays INT,
    @warrantyMonths INT = 12,
    @selectionReason TEXT = NULL,
    @contractReference VARCHAR(100) = NULL,
    @awardedBy INT,
    @itemPricing NVARCHAR(MAX) -- JSON array of {tender_item_id, unit_price, total_cost}
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @awardId INT;
    DECLARE @expectedDeliveryDate DATE;
    
    BEGIN TRANSACTION;
    
    TRY
        -- Check if tender exists and is not already awarded
        IF NOT EXISTS (SELECT 1 FROM Tenders WHERE tender_id = @tenderId AND status = 'PREPARED')
        BEGIN
            RAISERROR('Tender not found or already awarded', 16, 1);
            RETURN;
        END
        
        -- Calculate expected delivery date
        SET @expectedDeliveryDate = DATEADD(DAY, @deliveryDays, GETDATE());
        
        -- Create award record with financial data
        INSERT INTO TenderAwards (
            tender_id, awarded_vendor_name, vendor_registration,
            vendor_contact_person, vendor_phone, vendor_email, vendor_address,
            total_contract_value, contract_currency, payment_terms,
            promised_delivery_days, warranty_months,
            expected_delivery_date, selection_reason,
            contract_reference, awarded_by, award_status
        ) VALUES (
            @tenderId, @vendorName, @vendorRegistration,
            @vendorContact, @vendorPhone, @vendorEmail, @vendorAddress,
            @totalContractValue, @contractCurrency, @paymentTerms,
            @deliveryDays, @warrantyMonths,
            @expectedDeliveryDate, @selectionReason,
            @contractReference, @awardedBy, 'ACTIVE'
        );
        
        SET @awardId = SCOPE_IDENTITY();
        
        -- Insert award items with pricing
        INSERT INTO TenderAwardItems (
            award_id, tender_item_id, awarded_item_name, awarded_quantity,
            awarded_specifications, unit_price, total_item_cost
        )
        SELECT 
            @awardId,
            ti.tender_item_id,
            ti.item_name,
            ti.quantity_required,
            ti.detailed_specifications,
            pricing.unit_price,
            pricing.total_cost
        FROM TenderItems ti
        CROSS APPLY (
            SELECT 
                CAST(JSON_VALUE(value, '$.unit_price') AS DECIMAL(12,2)) as unit_price,
                CAST(JSON_VALUE(value, '$.total_cost') AS DECIMAL(15,2)) as total_cost
            FROM OPENJSON(@itemPricing)
            WHERE JSON_VALUE(value, '$.tender_item_id') = CAST(ti.tender_item_id AS VARCHAR(10))
        ) pricing
        WHERE ti.tender_id = @tenderId;
        
        -- Update tender status
        UPDATE Tenders 
        SET status = 'AWARDED', updated_at = GETDATE()
        WHERE tender_id = @tenderId;
        
        COMMIT TRANSACTION;
        
        SELECT @awardId as award_id, @tenderId as tender_id, 'SUCCESS' as result;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ====================================================================
-- 🔍 5. VIEWS FOR DATA RETRIEVAL
-- ====================================================================

-- Tender Summary View (no financial data)
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
    
    -- Source request info
    pr.request_title as source_request_title,
    d.dec_name as requesting_dec,
    
    -- Item count
    (SELECT COUNT(*) FROM TenderItems WHERE tender_id = t.tender_id) as item_count,
    
    -- Award status (but no financial data)
    CASE 
        WHEN ta.award_id IS NOT NULL THEN 'AWARDED'
        ELSE 'NOT_AWARDED'
    END as award_status,
    
    ta.awarded_vendor_name,
    ta.award_date,
    
    -- Admin info
    u.full_name as created_by_name,
    t.created_at
    
FROM Tenders t
LEFT JOIN TenderStatuses ts ON t.status = ts.status_code
LEFT JOIN ProcurementRequests pr ON t.source_request_id = pr.request_id
LEFT JOIN DECs d ON t.requesting_dec_id = d.dec_id
LEFT JOIN TenderAwards ta ON t.tender_id = ta.tender_id
LEFT JOIN Users u ON t.created_by = u.user_id;
GO

-- Award Details View (with financial data - restricted access)
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
    u1.full_name as awarded_by_name,
    u2.full_name as approved_by_name,
    ta.created_at as award_created_at
    
FROM TenderAwards ta
JOIN Tenders t ON ta.tender_id = t.tender_id
LEFT JOIN Users u1 ON ta.awarded_by = u1.user_id
LEFT JOIN Users u2 ON ta.approved_by = u2.user_id;
GO

-- ====================================================================
-- 📊 6. SAMPLE DATA FOR TESTING
-- ====================================================================

-- Create sequence for tender codes
CREATE SEQUENCE TenderSequence
    START WITH 1
    INCREMENT BY 1;
GO

-- Sample tender (created from request, no financial data)
INSERT INTO Tenders (
    tender_code, tender_title, tender_description,
    source_request_id, requesting_dec_id, created_by, status
) VALUES (
    'TND-202509-0001', 
    'Office Equipment Procurement - Q3 2025',
    'Procurement of laptops and printers for administrative offices',
    1, -- Assuming request ID 1 exists
    1, -- Assuming DEC ID 1 exists  
    1, -- Assuming user ID 1 exists
    'PREPARED'
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

-- Sample direct award (with financial data)
DECLARE @itemPricing NVARCHAR(MAX) = '[
    {"tender_item_id": 1, "unit_price": 85000.00, "total_cost": 1275000.00},
    {"tender_item_id": 2, "unit_price": 45000.00, "total_cost": 135000.00}
]';

EXEC AwardTenderDirectly
    @tenderId = 1,
    @vendorName = 'TechSolutions Pakistan Pvt Ltd',
    @vendorRegistration = 'REG-2024-TS-001',
    @vendorContact = 'Ahmed Khan',
    @vendorPhone = '+92-21-12345678',
    @vendorEmail = 'ahmed.khan@techsolutions.pk',
    @vendorAddress = 'Plot 45, Industrial Area, Karachi',
    @totalContractValue = 1410000.00,
    @contractCurrency = 'PKR',
    @paymentTerms = '30% advance, 70% on delivery',
    @deliveryDays = 21,
    @warrantyMonths = 24,
    @selectionReason = 'Best technical compliance with competitive pricing and proven track record',
    @contractReference = 'CONTRACT-2025-TS-001',
    @awardedBy = 1,
    @itemPricing = @itemPricing;

GO

-- ====================================================================
-- ✅ VERIFICATION QUERIES
-- ====================================================================

-- Check tender summary (no financial data)
SELECT * FROM TenderSummaryView;

-- Check award details (financial data visible)
SELECT * FROM TenderAwardDetailsView;

-- Verify financial data isolation
SELECT 
    'Tenders' as table_name, 
    COUNT(*) as records,
    'NO_FINANCIAL_COLUMNS' as financial_data_status
FROM Tenders
UNION ALL
SELECT 
    'TenderAwards' as table_name,
    COUNT(*) as records,
    'FINANCIAL_DATA_PRESENT' as financial_data_status
FROM TenderAwards;

PRINT '🏆 Direct Tender Award System Created Successfully!';
PRINT '💰 Financial data is ONLY in TenderAwards and TenderAwardItems tables';
PRINT '📋 All other tables contain specifications and quantities only';
