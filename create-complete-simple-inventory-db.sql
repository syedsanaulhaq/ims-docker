-- ====================================================================
-- 🏗️ COMPLETE SIMPLE INVENTORY MANAGEMENT DATABASE
-- ====================================================================
-- This creates a brand new database with the simplified workflow:
-- 1. Quantity-only requests and approvals (NO financial data)
-- 2. Direct tender award entry (skip bidding process)
-- 3. Financial data ONLY at tender award stage
-- ====================================================================

-- Create the database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SimpleInventoryDB')
BEGIN
    CREATE DATABASE SimpleInventoryDB;
END
GO

USE SimpleInventoryDB;
GO

-- ====================================================================
-- 📋 1. ORGANIZATIONAL STRUCTURE TABLES
-- ====================================================================

-- Offices Table
CREATE TABLE Offices (
    office_id INT IDENTITY(1,1) PRIMARY KEY,
    office_code VARCHAR(20) NOT NULL UNIQUE,
    office_name VARCHAR(100) NOT NULL,
    office_type VARCHAR(50) NOT NULL, -- 'HEADQUARTERS', 'REGIONAL', 'DISTRICT'
    parent_office_id INT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (parent_office_id) REFERENCES Offices(office_id)
);

-- Wings Information
CREATE TABLE Wings (
    wing_id INT IDENTITY(1,1) PRIMARY KEY,
    wing_code VARCHAR(20) NOT NULL UNIQUE,
    wing_name VARCHAR(100) NOT NULL,
    office_id INT NOT NULL,
    wing_head VARCHAR(100),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (office_id) REFERENCES Offices(office_id)
);

-- DEC (Departmental Equipment Committee)
CREATE TABLE DECs (
    dec_id INT IDENTITY(1,1) PRIMARY KEY,
    dec_code VARCHAR(20) NOT NULL UNIQUE,
    dec_name VARCHAR(100) NOT NULL,
    wing_id INT NOT NULL,
    dec_head VARCHAR(100),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (wing_id) REFERENCES Wings(wing_id)
);

-- ====================================================================
-- 👥 2. USER MANAGEMENT
-- ====================================================================

CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'DEC_USER', 'DG_ADMIN', 'AD_ADMIN', 'PROCUREMENT'
    dec_id INT NULL, -- Only for DEC users
    office_id INT NULL,
    wing_id INT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME NULL,
    FOREIGN KEY (dec_id) REFERENCES DECs(dec_id),
    FOREIGN KEY (office_id) REFERENCES Offices(office_id),
    FOREIGN KEY (wing_id) REFERENCES Wings(wing_id)
);

-- ====================================================================
-- 📦 3. ITEM MASTER DATA
-- ====================================================================

CREATE TABLE ItemCategories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    category_code VARCHAR(20) NOT NULL UNIQUE,
    category_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BIT DEFAULT 1
);

CREATE TABLE ItemMaster (
    item_id INT IDENTITY(1,1) PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    item_name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    specifications TEXT NULL,
    unit_of_measure VARCHAR(20) NOT NULL, -- 'PIECES', 'SETS', 'BOXES', etc.
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (category_id) REFERENCES ItemCategories(category_id)
);

-- ====================================================================
-- 📊 4. STOCK MANAGEMENT (NO FINANCIAL DATA)
-- ====================================================================

CREATE TABLE CurrentStock (
    stock_id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT NOT NULL,
    current_quantity INT DEFAULT 0,
    minimum_level INT DEFAULT 0,
    maximum_level INT DEFAULT 0,
    last_updated DATETIME DEFAULT GETDATE(),
    updated_by INT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id),
    FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);

-- Stock Transaction History (Quantity Only)
CREATE TABLE StockTransactions (
    transaction_id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'INITIAL_SETUP', 'RECEIVED', 'ISSUED', 'ADJUSTED'
    quantity_change INT NOT NULL, -- Positive for additions, negative for deductions
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_type VARCHAR(50) NULL, -- 'PROCUREMENT', 'ISSUANCE', 'ADJUSTMENT'
    reference_id INT NULL,
    reason VARCHAR(500) NULL,
    transaction_date DATETIME DEFAULT GETDATE(),
    created_by INT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- ====================================================================
-- 📝 5. PROCUREMENT REQUESTS (NO FINANCIAL DATA)
-- ====================================================================

CREATE TABLE ProcurementRequests (
    request_id INT IDENTITY(1,1) PRIMARY KEY,
    request_code VARCHAR(50) NOT NULL UNIQUE,
    request_title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    justification TEXT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    requested_by INT NOT NULL, -- DEC User
    dec_id INT NOT NULL,
    required_date DATE NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (requested_by) REFERENCES Users(user_id),
    FOREIGN KEY (dec_id) REFERENCES DECs(dec_id)
);

-- Request Items (Quantity and Specifications Only)
CREATE TABLE RequestItems (
    request_item_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    specifications TEXT NULL,
    justification TEXT NULL,
    -- NO FINANCIAL FIELDS HERE
    FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id)
);

-- ====================================================================
-- ✅ 6. APPROVAL WORKFLOW (NO FINANCIAL DATA)
-- ====================================================================

CREATE TABLE ApprovalWorkflow (
    approval_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL,
    approver_role VARCHAR(50) NOT NULL, -- 'DG_ADMIN', 'AD_ADMIN', 'PROCUREMENT'
    approver_id INT NULL, -- Will be filled when approved
    approval_level INT NOT NULL, -- 1, 2, 3
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    comments TEXT NULL,
    approved_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (approver_id) REFERENCES Users(user_id)
);

-- ====================================================================
-- 🏆 7. TENDER AWARDS (WITH FINANCIAL DATA)
-- ====================================================================
-- This is where ALL financial information is entered

CREATE TABLE TenderAwards (
    award_id INT IDENTITY(1,1) PRIMARY KEY,
    award_code VARCHAR(50) NOT NULL UNIQUE,
    request_id INT NOT NULL, -- Links back to the approved request
    
    -- Award Basic Information
    award_title VARCHAR(200) NOT NULL,
    award_date DATE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    
    -- Winning Vendor Information
    vendor_name VARCHAR(200) NOT NULL,
    vendor_registration VARCHAR(100) NOT NULL,
    vendor_address TEXT NOT NULL,
    vendor_contact_person VARCHAR(100) NOT NULL,
    vendor_phone VARCHAR(50) NOT NULL,
    vendor_email VARCHAR(100) NOT NULL,
    
    -- Contract Details
    contract_number VARCHAR(100) NULL,
    contract_date DATE NULL,
    
    -- Financial Information (ONLY HERE)
    total_contract_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL,
    payment_terms TEXT NULL,
    
    -- Award Status
    status VARCHAR(50) DEFAULT 'AWARDED', -- 'AWARDED', 'CONTRACT_SIGNED', 'DELIVERED', 'COMPLETED'
    
    -- Audit Fields
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- Award Items with Financial Details
CREATE TABLE AwardItems (
    award_item_id INT IDENTITY(1,1) PRIMARY KEY,
    award_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_awarded INT NOT NULL,
    
    -- Financial Information (ONLY HERE)
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    
    -- Technical Details
    brand VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    specifications_met TEXT NULL,
    warranty_months INT DEFAULT 12,
    
    FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id),
    FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id)
);

-- ====================================================================
-- 📦 8. DELIVERY MANAGEMENT
-- ====================================================================

CREATE TABLE Deliveries (
    delivery_id INT IDENTITY(1,1) PRIMARY KEY,
    award_id INT NOT NULL,
    delivery_code VARCHAR(50) NOT NULL UNIQUE,
    
    -- Delivery Information
    delivery_date DATE NOT NULL,
    delivery_note_number VARCHAR(100) NULL,
    received_by INT NOT NULL,
    
    -- Delivery Status
    status VARCHAR(50) DEFAULT 'RECEIVED', -- 'RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED'
    inspection_notes TEXT NULL,
    
    -- Quantities
    total_items_delivered INT NOT NULL,
    total_items_accepted INT DEFAULT 0,
    total_items_rejected INT DEFAULT 0,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id),
    FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

-- Delivery Items Detail
CREATE TABLE DeliveryItems (
    delivery_item_id INT IDENTITY(1,1) PRIMARY KEY,
    delivery_id INT NOT NULL,
    award_item_id INT NOT NULL,
    quantity_delivered INT NOT NULL,
    quantity_accepted INT DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    rejection_reason TEXT NULL,
    serial_numbers TEXT NULL, -- If applicable
    
    FOREIGN KEY (delivery_id) REFERENCES Deliveries(delivery_id),
    FOREIGN KEY (award_item_id) REFERENCES AwardItems(award_item_id)
);

-- ====================================================================
-- 📈 9. REPORTING VIEWS
-- ====================================================================

-- Stock Overview (No Financial Data)
CREATE VIEW StockOverview AS
SELECT 
    im.item_code,
    im.item_name,
    ic.category_name,
    cs.current_quantity,
    cs.minimum_level,
    cs.maximum_level,
    CASE 
        WHEN cs.current_quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN cs.current_quantity <= cs.minimum_level THEN 'LOW_STOCK'
        ELSE 'ADEQUATE'
    END as stock_status
FROM CurrentStock cs
JOIN ItemMaster im ON cs.item_id = im.item_id
JOIN ItemCategories ic ON im.category_id = ic.category_id
WHERE im.is_active = 1;
GO

-- Pending Requests Summary
CREATE VIEW PendingRequestsSummary AS
SELECT 
    pr.request_code,
    pr.request_title,
    d.dec_name,
    pr.priority,
    pr.required_date,
    pr.created_at,
    COUNT(ri.request_item_id) as total_items
FROM ProcurementRequests pr
JOIN DECs d ON pr.dec_id = d.dec_id
JOIN RequestItems ri ON pr.request_id = ri.request_id
WHERE pr.status = 'PENDING'
GROUP BY pr.request_code, pr.request_title, d.dec_name, pr.priority, pr.required_date, pr.created_at;
GO

-- Financial Summary (Only for Authorized Users)
CREATE VIEW FinancialSummary AS
SELECT 
    ta.award_code,
    ta.award_title,
    ta.vendor_name,
    ta.total_contract_amount,
    ta.tax_amount,
    ta.final_amount,
    ta.status,
    pr.request_title
FROM TenderAwards ta
JOIN ProcurementRequests pr ON ta.request_id = pr.request_id;
GO

-- ====================================================================
-- 🔧 10. STORED PROCEDURES
-- ====================================================================

-- Initialize Stock for New Item
CREATE PROCEDURE InitializeStock
    @item_id INT,
    @initial_quantity INT,
    @minimum_level INT,
    @maximum_level INT,
    @user_id INT
AS
BEGIN
    BEGIN TRANSACTION;
    
    -- Insert or update stock
    IF EXISTS (SELECT 1 FROM CurrentStock WHERE item_id = @item_id)
    BEGIN
        UPDATE CurrentStock 
        SET current_quantity = @initial_quantity,
            minimum_level = @minimum_level,
            maximum_level = @maximum_level,
            last_updated = GETDATE(),
            updated_by = @user_id
        WHERE item_id = @item_id;
    END
    ELSE
    BEGIN
        INSERT INTO CurrentStock (item_id, current_quantity, minimum_level, maximum_level, updated_by)
        VALUES (@item_id, @initial_quantity, @minimum_level, @maximum_level, @user_id);
    END
    
    -- Record transaction
    INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, quantity_before, quantity_after, reason, created_by)
    VALUES (@item_id, 'INITIAL_SETUP', @initial_quantity, 0, @initial_quantity, 'Initial stock setup', @user_id);
    
    COMMIT TRANSACTION;
END;
GO

-- Create Procurement Request
CREATE PROCEDURE CreateProcurementRequest
    @title VARCHAR(200),
    @description TEXT,
    @justification TEXT,
    @priority VARCHAR(20),
    @required_date DATE,
    @requested_by INT,
    @dec_id INT,
    @items NVARCHAR(MAX) -- JSON array of items
AS
BEGIN
    DECLARE @request_id INT;
    DECLARE @request_code VARCHAR(50);
    
    BEGIN TRANSACTION;
    
    -- Generate request code
    SET @request_code = 'REQ-' + FORMAT(GETDATE(), 'yyyyMMdd') + '-' + RIGHT('000' + CAST(ABS(CHECKSUM(NEWID())) % 1000 AS VARCHAR(3)), 3);
    
    -- Create main request
    INSERT INTO ProcurementRequests (request_code, request_title, description, justification, priority, required_date, requested_by, dec_id)
    VALUES (@request_code, @title, @description, @justification, @priority, @required_date, @requested_by, @dec_id);
    
    SET @request_id = SCOPE_IDENTITY();
    
    -- Create approval workflow
    INSERT INTO ApprovalWorkflow (request_id, approver_role, approval_level)
    VALUES 
        (@request_id, 'DG_ADMIN', 1),
        (@request_id, 'AD_ADMIN', 2),
        (@request_id, 'PROCUREMENT', 3);
    
    COMMIT TRANSACTION;
    
    SELECT @request_id as request_id, @request_code as request_code;
END;
GO

-- Update Stock from Delivery
CREATE PROCEDURE UpdateStockFromDelivery
    @delivery_id INT,
    @user_id INT
AS
BEGIN
    DECLARE @item_id INT, @quantity_accepted INT, @award_id INT;
    
    SELECT @award_id = award_id FROM Deliveries WHERE delivery_id = @delivery_id;
    
    DECLARE item_cursor CURSOR FOR
    SELECT ai.item_id, SUM(di.quantity_accepted)
    FROM DeliveryItems di
    JOIN AwardItems ai ON di.award_item_id = ai.award_item_id
    WHERE di.delivery_id = @delivery_id
    GROUP BY ai.item_id;
    
    OPEN item_cursor;
    FETCH NEXT FROM item_cursor INTO @item_id, @quantity_accepted;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @current_stock INT;
        SELECT @current_stock = current_quantity FROM CurrentStock WHERE item_id = @item_id;
        
        -- Update stock
        UPDATE CurrentStock 
        SET current_quantity = current_quantity + @quantity_accepted,
            last_updated = GETDATE(),
            updated_by = @user_id
        WHERE item_id = @item_id;
        
        -- Record transaction
        INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_type, reference_id, reason, created_by)
        VALUES (@item_id, 'RECEIVED', @quantity_accepted, @current_stock, @current_stock + @quantity_accepted, 'DELIVERY', @delivery_id, 'Stock received from delivery', @user_id);
        
        FETCH NEXT FROM item_cursor INTO @item_id, @quantity_accepted;
    END;
    
    CLOSE item_cursor;
    DEALLOCATE item_cursor;
END;
GO

-- ====================================================================
-- 📊 11. SAMPLE DATA
-- ====================================================================

-- Insert Sample Offices
INSERT INTO Offices (office_code, office_name, office_type) VALUES
('HQ-001', 'Headquarters', 'HEADQUARTERS'),
('RG-001', 'Northern Region', 'REGIONAL'),
('RG-002', 'Southern Region', 'REGIONAL');

-- Insert Sample Wings
INSERT INTO Wings (wing_code, wing_name, office_id) VALUES
('IT-WING', 'Information Technology Wing', 1),
('ADM-WING', 'Administration Wing', 1),
('FIN-WING', 'Finance Wing', 1);

-- Insert Sample DECs
INSERT INTO DECs (dec_code, dec_name, wing_id) VALUES
('IT-DEC-001', 'IT Equipment Committee', 1),
('ADM-DEC-001', 'Administrative Equipment Committee', 2),
('FIN-DEC-001', 'Finance Equipment Committee', 3);

-- Insert Sample Users
INSERT INTO Users (username, full_name, email, password_hash, role, dec_id) VALUES
('dec_user1', 'John Doe', 'john.doe@org.gov', 'hashed_password_1', 'DEC_USER', 1),
('dg_admin1', 'Jane Smith', 'jane.smith@org.gov', 'hashed_password_2', 'DG_ADMIN', NULL),
('ad_admin1', 'Mike Johnson', 'mike.johnson@org.gov', 'hashed_password_3', 'AD_ADMIN', NULL),
('procurement1', 'Sarah Wilson', 'sarah.wilson@org.gov', 'hashed_password_4', 'PROCUREMENT', NULL);

-- Insert Sample Categories
INSERT INTO ItemCategories (category_code, category_name, description) VALUES
('IT-EQUIP', 'IT Equipment', 'Computers, printers, and related equipment'),
('FURNITURE', 'Office Furniture', 'Desks, chairs, and office furniture'),
('STATIONERY', 'Office Stationery', 'Papers, pens, and office supplies');

-- Insert Sample Items
INSERT INTO ItemMaster (item_code, item_name, category_id, specifications, unit_of_measure) VALUES
('LAPTOP-001', 'Standard Office Laptop', 1, 'Core i5, 8GB RAM, 256GB SSD', 'PIECES'),
('PRINTER-001', 'Laser Printer', 1, 'HP LaserJet, A4 Size, Network Ready', 'PIECES'),
('DESK-001', 'Office Desk', 2, '4x2 feet, wooden, with drawers', 'PIECES'),
('CHAIR-001', 'Office Chair', 2, 'Ergonomic, adjustable height, with wheels', 'PIECES');

-- Initialize Stock
EXEC InitializeStock @item_id = 1, @initial_quantity = 50, @minimum_level = 10, @maximum_level = 100, @user_id = 1;
EXEC InitializeStock @item_id = 2, @initial_quantity = 20, @minimum_level = 5, @maximum_level = 50, @user_id = 1;
EXEC InitializeStock @item_id = 3, @initial_quantity = 30, @minimum_level = 8, @maximum_level = 60, @user_id = 1;
EXEC InitializeStock @item_id = 4, @initial_quantity = 25, @minimum_level = 5, @maximum_level = 50, @user_id = 1;

PRINT '✅ Simple Inventory Database Created Successfully!';
PRINT '🎯 Key Features:';
PRINT '   - NO financial data in requests/approvals';
PRINT '   - Financial data ONLY in tender awards';
PRINT '   - Complete quantity-based workflow';
PRINT '   - Direct award entry (no bidding)';
GO
