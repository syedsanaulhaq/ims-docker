-- ====================================================================
-- 🏗️ INVENTORY MANAGEMENT INFORMATION SYSTEM DATABASE (InvMISDB)
-- ====================================================================

-- Create the database
CREATE DATABASE InvMISDB;
GO

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. ORGANIZATIONAL STRUCTURE
-- ====================================================================

CREATE TABLE Offices (
    office_id INT IDENTITY(1,1) PRIMARY KEY,
    office_code VARCHAR(20) NOT NULL UNIQUE,
    office_name VARCHAR(100) NOT NULL,
    office_type VARCHAR(50) NOT NULL,
    parent_office_id INT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (parent_office_id) REFERENCES Offices(office_id)
);

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
    role VARCHAR(50) NOT NULL,
    dec_id INT NULL,
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
-- 📦 3. ITEM MANAGEMENT
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
    unit_of_measure VARCHAR(20) NOT NULL,
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

CREATE TABLE StockTransactions (
    transaction_id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_type VARCHAR(50) NULL,
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
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(50) DEFAULT 'PENDING',
    requested_by INT NOT NULL,
    dec_id INT NOT NULL,
    required_date DATE NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (requested_by) REFERENCES Users(user_id),
    FOREIGN KEY (dec_id) REFERENCES DECs(dec_id)
);

CREATE TABLE RequestItems (
    request_item_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    specifications TEXT NULL,
    justification TEXT NULL,
    -- NO FINANCIAL FIELDS
    FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id)
);

-- ====================================================================
-- ✅ 6. APPROVAL WORKFLOW (NO FINANCIAL DATA)
-- ====================================================================

CREATE TABLE ApprovalWorkflow (
    approval_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    approver_id INT NULL,
    approval_level INT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    comments TEXT NULL,
    approved_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (approver_id) REFERENCES Users(user_id)
);

-- ====================================================================
-- 🏆 7. TENDER AWARDS (WITH FINANCIAL DATA)
-- ====================================================================

CREATE TABLE TenderAwards (
    award_id INT IDENTITY(1,1) PRIMARY KEY,
    award_code VARCHAR(50) NOT NULL UNIQUE,
    request_id INT NOT NULL,
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
    
    -- Status
    status VARCHAR(50) DEFAULT 'AWARDED',
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

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
    delivery_date DATE NOT NULL,
    delivery_note_number VARCHAR(100) NULL,
    received_by INT NOT NULL,
    status VARCHAR(50) DEFAULT 'RECEIVED',
    inspection_notes TEXT NULL,
    total_items_delivered INT NOT NULL,
    total_items_accepted INT DEFAULT 0,
    total_items_rejected INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id),
    FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

CREATE TABLE DeliveryItems (
    delivery_item_id INT IDENTITY(1,1) PRIMARY KEY,
    delivery_id INT NOT NULL,
    award_item_id INT NOT NULL,
    quantity_delivered INT NOT NULL,
    quantity_accepted INT DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    rejection_reason TEXT NULL,
    serial_numbers TEXT NULL,
    FOREIGN KEY (delivery_id) REFERENCES Deliveries(delivery_id),
    FOREIGN KEY (award_item_id) REFERENCES AwardItems(award_item_id)
);

PRINT '✅ SimpleInventoryDB tables created successfully!';
GO

-- ====================================================================
-- 📊 9. SAMPLE DATA
-- ====================================================================

-- Insert Sample Data
INSERT INTO Offices (office_code, office_name, office_type) VALUES
('HQ-001', 'Headquarters', 'HEADQUARTERS'),
('RG-001', 'Northern Region', 'REGIONAL');

INSERT INTO Wings (wing_code, wing_name, office_id) VALUES
('IT-WING', 'Information Technology Wing', 1),
('ADM-WING', 'Administration Wing', 1);

INSERT INTO DECs (dec_code, dec_name, wing_id) VALUES
('IT-DEC-001', 'IT Equipment Committee', 1),
('ADM-DEC-001', 'Administrative Equipment Committee', 2);

INSERT INTO Users (username, full_name, email, password_hash, role, dec_id) VALUES
('dec_user1', 'John Doe', 'john.doe@org.gov', 'hashed_password_1', 'DEC_USER', 1),
('dg_admin1', 'Jane Smith', 'jane.smith@org.gov', 'hashed_password_2', 'DG_ADMIN', NULL),
('ad_admin1', 'Mike Johnson', 'mike.johnson@org.gov', 'hashed_password_3', 'AD_ADMIN', NULL),
('procurement1', 'Sarah Wilson', 'sarah.wilson@org.gov', 'hashed_password_4', 'PROCUREMENT', NULL);

INSERT INTO ItemCategories (category_code, category_name, description) VALUES
('IT-EQUIP', 'IT Equipment', 'Computers, printers, and related equipment'),
('FURNITURE', 'Office Furniture', 'Desks, chairs, and office furniture');

INSERT INTO ItemMaster (item_code, item_name, category_id, specifications, unit_of_measure) VALUES
('LAPTOP-001', 'Standard Office Laptop', 1, 'Core i5, 8GB RAM, 256GB SSD', 'PIECES'),
('PRINTER-001', 'Laser Printer', 1, 'HP LaserJet, A4 Size, Network Ready', 'PIECES'),
('DESK-001', 'Office Desk', 2, '4x2 feet, wooden, with drawers', 'PIECES');

-- Initialize Stock (quantities only, no financial data)
INSERT INTO CurrentStock (item_id, current_quantity, minimum_level, maximum_level, updated_by) VALUES
(1, 50, 10, 100, 1),
(2, 20, 5, 50, 1),
(3, 30, 8, 60, 1);

-- Record initial stock transactions
INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, quantity_before, quantity_after, reason, created_by) VALUES
(1, 'INITIAL_SETUP', 50, 0, 50, 'Initial stock setup for laptops', 1),
(2, 'INITIAL_SETUP', 20, 0, 20, 'Initial stock setup for printers', 1),
(3, 'INITIAL_SETUP', 30, 0, 30, 'Initial stock setup for desks', 1);

PRINT '✅ Sample data inserted successfully!';
PRINT '🎯 Database Features:';
PRINT '   ✅ NO financial data in requests/approvals';
PRINT '   ✅ Financial data ONLY in tender awards';  
PRINT '   ✅ Complete quantity-based workflow';
PRINT '   ✅ Direct award entry (no bidding process)';
GO
