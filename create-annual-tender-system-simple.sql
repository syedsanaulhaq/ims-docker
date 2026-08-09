-- Annual Tender System - Simplified version
-- NOTE: Using category from item_master instead of separate item_groups table
-- This eliminates redundancy since category already exists in item_master

-- 3. ANNUAL TENDERS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('annual_tenders') AND type = 'U')
BEGIN
    CREATE TABLE annual_tenders (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        tender_number NVARCHAR(100) NOT NULL UNIQUE,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status NVARCHAR(50) DEFAULT 'Active',
        total_budget DECIMAL(15, 2),
        remarks NVARCHAR(MAX),
        created_by NVARCHAR(450),
        updated_by NVARCHAR(450),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX IX_annual_tenders_number ON annual_tenders(tender_number);
    CREATE INDEX IX_annual_tenders_status ON annual_tenders(status);
    PRINT '✅ Created annual_tenders table';
END;

-- 3. ANNUAL_TENDER_CATEGORIES (instead of annual_tender_groups)
-- Links tenders to item categories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('annual_tender_categories') AND type = 'U')
BEGIN
    CREATE TABLE annual_tender_categories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        annual_tender_id UNIQUEIDENTIFIER NOT NULL,
        category_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
        UNIQUE(annual_tender_id, category_id)
    );
    CREATE INDEX IX_tender_categories_tender ON annual_tender_categories(annual_tender_id);
    CREATE INDEX IX_tender_categories_category ON annual_tender_categories(category_id);
    PRINT '✅ Created annual_tender_categories table';
END;

-- 4. ANNUAL_TENDER_VENDORS
-- Vendors assigned to specific categories within tenders
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('annual_tender_vendors') AND type = 'U')
BEGIN
    CREATE TABLE annual_tender_vendors (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        annual_tender_id UNIQUEIDENTIFIER NOT NULL,
        category_id UNIQUEIDENTIFIER NOT NULL,
        vendor_id UNIQUEIDENTIFIER NOT NULL,
        assignment_date DATETIME2 DEFAULT GETDATE(),
        status NVARCHAR(50) DEFAULT 'Active',
        created_by NVARCHAR(450),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
        UNIQUE(annual_tender_id, category_id, vendor_id)
    );
    CREATE INDEX IX_tender_vendor_tender ON annual_tender_vendors(annual_tender_id);
    CREATE INDEX IX_tender_vendor_vendor ON annual_tender_vendors(vendor_id);
    CREATE INDEX IX_tender_vendor_category ON annual_tender_vendors(category_id);
    PRINT '✅ Created annual_tender_vendors table';
END;

-- 5. VENDOR_PROPOSALS
-- Vendor pricing for specific items in tender categories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('vendor_proposals') AND type = 'U')
BEGIN
    CREATE TABLE vendor_proposals (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        annual_tender_id UNIQUEIDENTIFIER NOT NULL,
        category_id UNIQUEIDENTIFIER NOT NULL,
        vendor_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        proposed_unit_price DECIMAL(15, 2) NOT NULL,
        currency NVARCHAR(10) DEFAULT 'PKR',
        delivery_terms NVARCHAR(255),
        payment_terms NVARCHAR(255),
        remarks NVARCHAR(MAX),
        created_by NVARCHAR(450),
        updated_by NVARCHAR(450),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_proposal_tender ON vendor_proposals(annual_tender_id);
    CREATE INDEX IX_proposal_vendor ON vendor_proposals(vendor_id);
    CREATE INDEX IX_proposal_category ON vendor_proposals(category_id);
    PRINT '✅ Created vendor_proposals table';
END;

-- 6. PURCHASE_ORDERS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('purchase_orders') AND type = 'U')
BEGIN
    CREATE TABLE purchase_orders (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        po_number NVARCHAR(100) NOT NULL UNIQUE,
        annual_tender_id UNIQUEIDENTIFIER NOT NULL,
        category_id UNIQUEIDENTIFIER NOT NULL,
        vendor_id UNIQUEIDENTIFIER NOT NULL,
        po_date DATE NOT NULL,
        delivery_date DATE,
        status NVARCHAR(50) DEFAULT 'Draft',
        total_amount DECIMAL(15, 2),
        remarks NVARCHAR(MAX),
        created_by NVARCHAR(450),
        updated_by NVARCHAR(450),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id),
        FOREIGN KEY (category_id) REFERENCES categories(category_id),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );
    CREATE INDEX IX_po_number ON purchase_orders(po_number);
    CREATE INDEX IX_po_tender ON purchase_orders(annual_tender_id);
    PRINT '✅ Created purchase_orders table';
END;

-- 7. PURCHASE_ORDER_ITEMS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('purchase_order_items') AND type = 'U')
BEGIN
    CREATE TABLE purchase_order_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        purchase_order_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(15, 2) NOT NULL,
        remarks NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    CREATE INDEX IX_po_item_po ON purchase_order_items(purchase_order_id);
    PRINT '✅ Created purchase_order_items table';
END;

-- 8. PO_DELIVERIES
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('po_deliveries') AND type = 'U')
BEGIN
    CREATE TABLE po_deliveries (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        po_delivery_number NVARCHAR(100) NOT NULL UNIQUE,
        purchase_order_id UNIQUEIDENTIFIER NOT NULL,
        delivery_personnel NVARCHAR(255),
        delivery_date DATETIME2 NOT NULL,
        delivery_notes NVARCHAR(MAX),
        delivery_chalan NVARCHAR(255),
        chalan_file_path NVARCHAR(MAX),
        is_finalized BIT DEFAULT 0,
        finalized_at DATETIME2,
        finalized_by NVARCHAR(450),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_po_delivery_number ON po_deliveries(po_delivery_number);
    PRINT '✅ Created po_deliveries table';
END;

-- 9. PO_DELIVERY_ITEMS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('po_delivery_items') AND type = 'U')
BEGIN
    CREATE TABLE po_delivery_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        po_delivery_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        item_name NVARCHAR(255) NOT NULL,
        delivery_qty INT NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (po_delivery_id) REFERENCES po_deliveries(id) ON DELETE CASCADE,
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    CREATE INDEX IX_po_delivery_item_delivery ON po_delivery_items(po_delivery_id);
    PRINT '✅ Created po_delivery_items table';
END;

-- 10. PO_DELIVERY_ITEM_SERIAL_NUMBERS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('po_delivery_item_serial_numbers') AND type = 'U')
BEGIN
    CREATE TABLE po_delivery_item_serial_numbers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        po_delivery_id UNIQUEIDENTIFIER NOT NULL,
        po_delivery_item_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        serial_number NVARCHAR(255) NOT NULL,
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (po_delivery_id) REFERENCES po_deliveries(id) ON DELETE NO ACTION,
        FOREIGN KEY (po_delivery_item_id) REFERENCES po_delivery_items(id) ON DELETE NO ACTION,
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    CREATE INDEX IX_po_serial_delivery ON po_delivery_item_serial_numbers(po_delivery_id);
    PRINT '✅ Created po_delivery_item_serial_numbers table';
END;

PRINT '✅ Annual Tender System setup complete! (9 tables, no redundant item_groups)';
