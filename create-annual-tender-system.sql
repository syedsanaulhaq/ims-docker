-- Annual Tender System Tables
-- Create all tables needed for Annual Tenders, Item Categories, Vendor Proposals, and Purchase Orders
-- NOTE: Uses 'category' from item_master instead of separate item_groups table to eliminate redundancy

PRINT '🔄 Creating Annual Tender System Tables...';

    -- =====================================================================
    -- 1. ITEM GROUPS (Furniture, Stationary, etc.)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('item_groups') AND type = 'U')
    BEGIN
        CREATE TABLE item_groups (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            group_code NVARCHAR(50) NOT NULL UNIQUE,
            group_name NVARCHAR(255) NOT NULL,
            description NVARCHAR(MAX),
            is_active BIT DEFAULT 1,
            created_by NVARCHAR(450),
            updated_by NVARCHAR(450),
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX IX_item_groups_code ON item_groups(group_code);
        CREATE INDEX IX_item_groups_active ON item_groups(is_active);
        PRINT '✅ Created item_groups table';
    END

    -- =====================================================================
    -- 2. GROUP_ITEMS (mapping items to groups - many to many)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('group_items') AND type = 'U')
    BEGIN
        CREATE TABLE group_items (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            group_id UNIQUEIDENTIFIER NOT NULL,
            item_master_id UNIQUEIDENTIFIER NOT NULL,
            created_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_group_items_group FOREIGN KEY (group_id) REFERENCES item_groups(id) ON DELETE CASCADE,
            CONSTRAINT FK_group_items_item FOREIGN KEY (item_master_id) REFERENCES item_masters(id) ON DELETE CASCADE,
            CONSTRAINT UQ_group_item UNIQUE (group_id, item_master_id)
        );
        CREATE INDEX IX_group_items_group ON group_items(group_id);
        CREATE INDEX IX_group_items_item ON group_items(item_master_id);
        PRINT '✅ Created group_items table';
    END

    -- =====================================================================
    -- 3. ANNUAL TENDERS (Framework agreements for the year)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('annual_tenders') AND type = 'U')
    BEGIN
        CREATE TABLE annual_tenders (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            tender_number NVARCHAR(100) NOT NULL UNIQUE,
            title NVARCHAR(255) NOT NULL,
            description NVARCHAR(MAX),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status NVARCHAR(50) DEFAULT 'Active', -- Active, Closed, Expired, Draft
            total_budget DECIMAL(15, 2),
            remarks NVARCHAR(MAX),
            created_by NVARCHAR(450),
            updated_by NVARCHAR(450),
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX IX_annual_tenders_number ON annual_tenders(tender_number);
        CREATE INDEX IX_annual_tenders_status ON annual_tenders(status);
        CREATE INDEX IX_annual_tenders_dates ON annual_tenders(start_date, end_date);
        PRINT '✅ Created annual_tenders table';
    END

    -- =====================================================================
    -- 4. ANNUAL_TENDER_GROUPS (linking groups to annual tenders)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('annual_tender_groups') AND type = 'U')
    BEGIN
        CREATE TABLE annual_tender_groups (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            annual_tender_id UNIQUEIDENTIFIER NOT NULL,
            group_id UNIQUEIDENTIFIER NOT NULL,
            created_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_tender_groups_tender FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id) ON DELETE CASCADE,
            CONSTRAINT FK_tender_groups_group FOREIGN KEY (group_id) REFERENCES item_groups(id) ON DELETE CASCADE,
            CONSTRAINT UQ_tender_group UNIQUE (annual_tender_id, group_id)
        );
        CREATE INDEX IX_tender_groups_tender ON annual_tender_groups(annual_tender_id);
        CREATE INDEX IX_tender_groups_group ON annual_tender_groups(group_id);
        PRINT '✅ Created annual_tender_groups table';
    END

    -- =====================================================================
    -- 5. ANNUAL_TENDER_VENDORS (assigning vendors to groups in tender)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('annual_tender_vendors') AND type = 'U')
    BEGIN
        CREATE TABLE annual_tender_vendors (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            annual_tender_id UNIQUEIDENTIFIER NOT NULL,
            group_id UNIQUEIDENTIFIER NOT NULL,
            vendor_id UNIQUEIDENTIFIER NOT NULL,
            assignment_date DATETIME2 DEFAULT GETDATE(),
            status NVARCHAR(50) DEFAULT 'Active', -- Active, Inactive
            created_by NVARCHAR(450),
            created_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_tender_vendor_tender FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id) ON DELETE CASCADE,
            CONSTRAINT FK_tender_vendor_group FOREIGN KEY (group_id) REFERENCES item_groups(id) ON DELETE CASCADE,
            CONSTRAINT FK_tender_vendor_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
            CONSTRAINT UQ_tender_vendor_group UNIQUE (annual_tender_id, group_id, vendor_id)
        );
        CREATE INDEX IX_tender_vendor_tender ON annual_tender_vendors(annual_tender_id);
        CREATE INDEX IX_tender_vendor_group ON annual_tender_vendors(group_id);
        CREATE INDEX IX_tender_vendor_vendor ON annual_tender_vendors(vendor_id);
        PRINT '✅ Created annual_tender_vendors table';
    END

    -- =====================================================================
    -- 6. VENDOR_PROPOSALS (Admin-entered pricing per vendor per item per group)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('vendor_proposals') AND type = 'U')
    BEGIN
        CREATE TABLE vendor_proposals (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            annual_tender_id UNIQUEIDENTIFIER NOT NULL,
            group_id UNIQUEIDENTIFIER NOT NULL,
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
            CONSTRAINT FK_proposal_tender FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id) ON DELETE CASCADE,
            CONSTRAINT FK_proposal_group FOREIGN KEY (group_id) REFERENCES item_groups(id) ON DELETE CASCADE,
            CONSTRAINT FK_proposal_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
            CONSTRAINT FK_proposal_item FOREIGN KEY (item_master_id) REFERENCES item_masters(id) ON DELETE CASCADE,
            CONSTRAINT UQ_vendor_proposal UNIQUE (annual_tender_id, vendor_id, item_master_id)
        );
        CREATE INDEX IX_proposal_tender ON vendor_proposals(annual_tender_id);
        CREATE INDEX IX_proposal_vendor ON vendor_proposals(vendor_id);
        CREATE INDEX IX_proposal_group ON vendor_proposals(group_id);
        CREATE INDEX IX_proposal_item ON vendor_proposals(item_master_id);
        PRINT '✅ Created vendor_proposals table';
    END

    -- =====================================================================
    -- 7. PURCHASE_ORDERS (POs created from annual tenders)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('purchase_orders') AND type = 'U')
    BEGIN
        CREATE TABLE purchase_orders (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            po_number NVARCHAR(100) NOT NULL UNIQUE,
            annual_tender_id UNIQUEIDENTIFIER NOT NULL,
            group_id UNIQUEIDENTIFIER NOT NULL,
            vendor_id UNIQUEIDENTIFIER NOT NULL,
            po_date DATE NOT NULL,
            delivery_date DATE,
            status NVARCHAR(50) DEFAULT 'Draft', -- Draft, Issued, Delivered, Closed, Cancelled
            total_amount DECIMAL(15, 2),
            remarks NVARCHAR(MAX),
            created_by NVARCHAR(450),
            updated_by NVARCHAR(450),
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_po_tender FOREIGN KEY (annual_tender_id) REFERENCES annual_tenders(id),
            CONSTRAINT FK_po_group FOREIGN KEY (group_id) REFERENCES item_groups(id),
            CONSTRAINT FK_po_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        );
        CREATE INDEX IX_po_number ON purchase_orders(po_number);
        CREATE INDEX IX_po_tender ON purchase_orders(annual_tender_id);
        CREATE INDEX IX_po_vendor ON purchase_orders(vendor_id);
        CREATE INDEX IX_po_status ON purchase_orders(status);
        CREATE INDEX IX_po_dates ON purchase_orders(po_date, delivery_date);
        PRINT '✅ Created purchase_orders table';
    END

    -- =====================================================================
    -- 8. PURCHASE_ORDER_ITEMS (line items in PO)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('purchase_order_items') AND type = 'U')
    BEGIN
        CREATE TABLE purchase_order_items (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            purchase_order_id UNIQUEIDENTIFIER NOT NULL,
            item_master_id UNIQUEIDENTIFIER NOT NULL,
            quantity INT NOT NULL,
            unit_price DECIMAL(15, 2) NOT NULL,
            total_amount DECIMAL(15, 2),
            remarks NVARCHAR(MAX),
            created_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_po_item_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            CONSTRAINT FK_po_item_item FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
        );
        CREATE INDEX IX_po_item_po ON purchase_order_items(purchase_order_id);
        CREATE INDEX IX_po_item_item ON purchase_order_items(item_master_id);
        PRINT '✅ Created purchase_order_items table';
    END

    -- =====================================================================
    -- 9. PO_DELIVERIES (deliveries linked to POs, similar to current deliveries)
    -- =====================================================================
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
            CONSTRAINT FK_po_delivery_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
        );
        CREATE INDEX IX_po_delivery_number ON po_deliveries(po_delivery_number);
        CREATE INDEX IX_po_delivery_po ON po_deliveries(purchase_order_id);
        CREATE INDEX IX_po_delivery_finalized ON po_deliveries(is_finalized);
        PRINT '✅ Created po_deliveries table';
    END

    -- =====================================================================
    -- 10. PO_DELIVERY_ITEMS (items in PO delivery, similar to delivery_items)
    -- =====================================================================
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('po_delivery_items') AND type = 'U')
    BEGIN
        CREATE TABLE po_delivery_items (
            id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            po_delivery_id UNIQUEIDENTIFIER NOT NULL,
            item_master_id UNIQUEIDENTIFIER NOT NULL,
            item_name NVARCHAR(255) NOT NULL,
            delivery_qty INT NOT NULL,
            created_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_po_delivery_item_delivery FOREIGN KEY (po_delivery_id) REFERENCES po_deliveries(id) ON DELETE CASCADE,
            CONSTRAINT FK_po_delivery_item_item FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
        );
        CREATE INDEX IX_po_delivery_item_delivery ON po_delivery_items(po_delivery_id);
        CREATE INDEX IX_po_delivery_item_item ON po_delivery_items(item_master_id);
        PRINT '✅ Created po_delivery_items table';
    END

    -- =====================================================================
    -- 11. PO_DELIVERY_ITEM_SERIAL_NUMBERS (serial tracking for PO deliveries)
    -- =====================================================================
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
            CONSTRAINT FK_po_serial_delivery FOREIGN KEY (po_delivery_id) REFERENCES po_deliveries(id) ON DELETE CASCADE,
            CONSTRAINT FK_po_serial_item FOREIGN KEY (po_delivery_item_id) REFERENCES po_delivery_items(id) ON DELETE NO ACTION,
            CONSTRAINT FK_po_serial_master FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
        );
        CREATE INDEX IX_po_serial_delivery ON po_delivery_item_serial_numbers(po_delivery_id);
        CREATE INDEX IX_po_serial_item ON po_delivery_item_serial_numbers(po_delivery_item_id);
        PRINT '✅ Created po_delivery_item_serial_numbers table';
    END

PRINT '✅ All tables created successfully!';
PRINT '📊 Annual Tender System Database Setup Complete!';
