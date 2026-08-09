-- Complete Database Schema Creation Script
-- Based on the database diagram provided
-- This creates all tables with proper relationships and constraints

-- =====================================================
-- 1. VENDORS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vendors')
BEGIN
    CREATE TABLE vendors (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        vendor_code NVARCHAR(50) UNIQUE NOT NULL,
        vendor_name NVARCHAR(200) NOT NULL,
        contact_person NVARCHAR(100),
        email NVARCHAR(100),
        phone NVARCHAR(20),
        address NVARCHAR(500),
        city NVARCHAR(100),
        country NVARCHAR(100),
        tax_number NVARCHAR(50),
        status NVARCHAR(20) DEFAULT 'Active',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created vendors table';
END

-- =====================================================
-- 2. CATEGORIES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categories')
BEGIN
    CREATE TABLE categories (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        category_name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created categories table';
END

-- =====================================================
-- 3. SUB_CATEGORIES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sub_categories')
BEGIN
    CREATE TABLE sub_categories (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        category_id NVARCHAR(50) NOT NULL,
        sub_category_name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    PRINT 'Created sub_categories table';
END

-- =====================================================
-- 4. ITEM_MASTERS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'item_masters')
BEGIN
    CREATE TABLE item_masters (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        item_code NVARCHAR(50) UNIQUE,
        nomenclature NVARCHAR(200) NOT NULL,
        category_id NVARCHAR(50),
        sub_category_id NVARCHAR(50),
        specifications NVARCHAR(1000),
        description NVARCHAR(500),
        unit NVARCHAR(20),
        manufacturer NVARCHAR(255),
        minimum_stock_level INT DEFAULT 0,
        maximum_stock_level INT DEFAULT 0,
        reorder_level INT DEFAULT 0,
        status NVARCHAR(50) DEFAULT 'Active',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id)
    );
    PRINT 'Created item_masters table';
END

-- =====================================================
-- 5. TENDERS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tenders')
BEGIN
    CREATE TABLE tenders (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        tender_number NVARCHAR(100) UNIQUE NOT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(1000),
        estimated_value DECIMAL(15,2),
        publish_date DATE,
        publication_date DATE,
        submission_date DATE,
        submission_deadline DATETIME2,
        opening_date DATETIME2,
        tender_spot_type NVARCHAR(50),
        procurement_method NVARCHAR(100),
        publication_daily NVARCHAR(100),
        document_path NVARCHAR(500),
        office_ids NVARCHAR(500), -- Comma-separated office IDs
        wing_ids NVARCHAR(500),   -- Comma-separated wing IDs
        dec_ids NVARCHAR(500),    -- Comma-separated DEC IDs
        office_name NVARCHAR(200),
        wing_name NVARCHAR(200),
        vendor_id NVARCHAR(50),
        is_finalized BIT DEFAULT 0,
        finalized_at DATETIME2,
        finalized_by NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );
    PRINT 'Created tenders table';
END

-- =====================================================
-- 6. TENDER_ITEMS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tender_items')
BEGIN
    CREATE TABLE tender_items (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        tender_id NVARCHAR(50) NOT NULL,
        item_master_id NVARCHAR(50) NOT NULL,
        nomenclature NVARCHAR(200) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        estimated_unit_price DECIMAL(15,2) DEFAULT 0,
        actual_unit_price DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        specifications NVARCHAR(1000),
        remarks NVARCHAR(500),
        status NVARCHAR(20) DEFAULT 'Active',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    PRINT 'Created tender_items table';
END

-- =====================================================
-- 7. STOCK_TRANSACTIONS_CLEAN TABLE (Your existing table)
-- =====================================================
-- Use your existing table name: stock_transactions_clean (plural)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_transactions_clean')
BEGIN
    CREATE TABLE stock_transactions_clean (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        tender_id NVARCHAR(50) NOT NULL,
        item_master_id NVARCHAR(50) NOT NULL,
        estimated_unit_price DECIMAL(15,2) DEFAULT 0,
        actual_unit_price DECIMAL(15,2) DEFAULT 0,
        total_quantity_received DECIMAL(10,2) DEFAULT 0,
        pricing_confirmed BIT DEFAULT 0,
        type NVARCHAR(10) DEFAULT 'IN',
        remarks NVARCHAR(500),
        is_deleted BIT DEFAULT 0,
        deleted_at DATETIME2,
        deleted_by NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (tender_id) REFERENCES tenders(id),
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
        UNIQUE(tender_id, item_master_id) -- Ensure one record per tender-item combination
    );
    PRINT 'Created stock_transactions_clean table';
END
ELSE
BEGIN
    PRINT 'stock_transactions_clean table already exists';
END

-- =====================================================
-- 8. DELIVERIES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'deliveries')
BEGIN
    CREATE TABLE deliveries (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        delivery_number INT IDENTITY(1,1) UNIQUE NOT NULL,
        tender_id NVARCHAR(50) NOT NULL,
        delivery_personnel NVARCHAR(100) NOT NULL,
        delivery_date DATE NOT NULL,
        delivery_notes NVARCHAR(1000),
        delivery_chalan NVARCHAR(100),
        chalan_file_path NVARCHAR(500),
        is_finalized BIT DEFAULT 0,
        finalized_at DATETIME2,
        finalized_by NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (tender_id) REFERENCES tenders(id)
    );
    PRINT 'Created deliveries table';
END

-- =====================================================
-- 9. DELIVERY_ITEMS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'delivery_items')
BEGIN
    CREATE TABLE delivery_items (
        id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
        delivery_id NVARCHAR(50) NOT NULL,
        item_master_id NVARCHAR(50) NOT NULL,
        item_name NVARCHAR(200) NOT NULL,
        delivery_qty DECIMAL(10,2) NOT NULL,
        unit NVARCHAR(20),
        remarks NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    PRINT 'Created delivery_items table';
END

-- =====================================================
-- 10. CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Vendors indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vendors_vendor_code')
    CREATE INDEX IX_vendors_vendor_code ON vendors(vendor_code);

-- Categories indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sub_categories_category_id')
    CREATE INDEX IX_sub_categories_category_id ON sub_categories(category_id);

-- Item masters indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_item_masters_category_id')
    CREATE INDEX IX_item_masters_category_id ON item_masters(category_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_item_masters_sub_category_id')
    CREATE INDEX IX_item_masters_sub_category_id ON item_masters(sub_category_id);

-- Tenders indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tenders_vendor_id')
    CREATE INDEX IX_tenders_vendor_id ON tenders(vendor_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tenders_tender_number')
    CREATE INDEX IX_tenders_tender_number ON tenders(tender_number);

-- Tender items indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_items_tender_id')
    CREATE INDEX IX_tender_items_tender_id ON tender_items(tender_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tender_items_item_master_id')
    CREATE INDEX IX_tender_items_item_master_id ON tender_items(item_master_id);

-- Stock transactions indexes (using your existing table name)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_transactions_clean_tender_id')
    CREATE INDEX IX_stock_transactions_clean_tender_id ON stock_transactions_clean(tender_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_transactions_clean_item_master_id')
    CREATE INDEX IX_stock_transactions_clean_item_master_id ON stock_transactions_clean(item_master_id);

-- Deliveries indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_deliveries_tender_id')
    CREATE INDEX IX_deliveries_tender_id ON deliveries(tender_id);

-- Delivery items indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_delivery_items_delivery_id')
    CREATE INDEX IX_delivery_items_delivery_id ON delivery_items(delivery_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_delivery_items_item_master_id')
    CREATE INDEX IX_delivery_items_item_master_id ON delivery_items(item_master_id);

-- =====================================================
-- 11. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Tenders with vendor information
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_tenders_with_vendors')
BEGIN
    EXEC('
    CREATE VIEW vw_tenders_with_vendors AS
    SELECT 
        t.*,
        v.vendor_name,
        v.vendor_code,
        v.contact_person AS vendor_contact_person,
        v.email AS vendor_email,
        v.phone AS vendor_phone,
        v.address AS vendor_address
    FROM tenders t
    LEFT JOIN vendors v ON t.vendor_id = v.id
    ');
    PRINT 'Created view: vw_tenders_with_vendors';
END

-- View: Item masters with category information
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_item_masters_with_categories')
BEGIN
    EXEC('
    CREATE VIEW vw_item_masters_with_categories AS
    SELECT 
        im.*,
        c.category_name,
        sc.sub_category_name
    FROM item_masters im
    LEFT JOIN categories c ON im.category_id = c.id
    LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
    ');
    PRINT 'Created view: vw_item_masters_with_categories';
END

-- View: Stock transactions with related information (using your existing table name)
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_stock_transactions_detailed')
BEGIN
    EXEC('
    CREATE VIEW vw_stock_transactions_detailed AS
    SELECT 
        stc.*,
        t.tender_number,
        t.title AS tender_title,
        im.nomenclature,
        im.specifications,
        im.unit,
        c.category_name,
        sc.sub_category_name
    FROM stock_transactions_clean stc
    INNER JOIN tenders t ON stc.tender_id = t.id
    INNER JOIN item_masters im ON stc.item_master_id = im.id
    LEFT JOIN categories c ON im.category_id = c.id
    LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
    WHERE stc.is_deleted = 0
    ');
    PRINT 'Created view: vw_stock_transactions_detailed (using stock_transactions_clean)';
END

-- =====================================================
-- 12. INSERT SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Sample categories
IF NOT EXISTS (SELECT * FROM categories WHERE category_name = 'Office Supplies')
BEGIN
    INSERT INTO categories (id, category_name, description) VALUES 
    (NEWID(), 'Office Supplies', 'General office supplies and stationery'),
    (NEWID(), 'IT Equipment', 'Information technology hardware and software'),
    (NEWID(), 'Furniture', 'Office furniture and fixtures'),
    (NEWID(), 'Maintenance', 'Maintenance and repair items');
    PRINT 'Inserted sample categories';
END

-- Sample vendors
IF NOT EXISTS (SELECT * FROM vendors WHERE vendor_code = 'VEN001')
BEGIN
    INSERT INTO vendors (id, vendor_code, vendor_name, contact_person, email, phone, status) VALUES 
    (NEWID(), 'VEN001', 'ABC Office Solutions', 'John Smith', 'john@abc.com', '123-456-7890', 'Active'),
    (NEWID(), 'VEN002', 'Tech World Ltd', 'Jane Doe', 'jane@techworld.com', '098-765-4321', 'Active'),
    (NEWID(), 'VEN003', 'Furniture Plus', 'Bob Johnson', 'bob@furnitureplus.com', '555-123-4567', 'Active');
    PRINT 'Inserted sample vendors';
END

PRINT 'Database schema creation completed successfully!';
PRINT '';
PRINT 'Summary of created tables:';
PRINT '1. vendors - Vendor management';
PRINT '2. categories - Item categorization';
PRINT '3. sub_categories - Sub-categorization';
PRINT '4. item_masters - Master item catalog';
PRINT '5. tenders - Tender/procurement management';
PRINT '6. tender_items - Items within each tender';
PRINT '7. stock_transactions_clean - Stock transaction records';
PRINT '8. deliveries - Delivery management';
PRINT '9. delivery_items - Items within each delivery';
PRINT '';
PRINT 'Views created:';
PRINT '- vw_tenders_with_vendors';
PRINT '- vw_item_masters_with_categories';
PRINT '- vw_stock_transactions_detailed';
PRINT '';
PRINT 'Indexes created for optimal performance';
PRINT 'Sample data inserted for testing';
