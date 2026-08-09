-- ==============================================
-- 🔧 FIX PURCHASE ORDERS TABLE SCHEMA
-- ==============================================
-- This migration fixes the purchase_orders table
-- to match the actual data types in the tenders table
-- ==============================================

USE InventoryManagementDB;
GO

-- Drop foreign keys that reference purchase_orders
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
              ' DROP CONSTRAINT ' + QUOTENAME(name) + '; '
FROM sys.foreign_keys 
WHERE referenced_object_id = OBJECT_ID('purchase_orders');

IF @sql <> ''
BEGIN
    PRINT '⚠️ Dropping foreign key constraints...';
    EXEC sp_executesql @sql;
    PRINT '✅ Foreign key constraints dropped';
END

GO

-- Now drop the tables
IF OBJECT_ID('purchase_order_items', 'U') IS NOT NULL
BEGIN
    PRINT '⚠️ Dropping purchase_order_items table...';
    DROP TABLE purchase_order_items;
    PRINT '✅ purchase_order_items dropped';
END

IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL
BEGIN
    PRINT '⚠️ Dropping purchase_orders table...';
    
    -- Drop any existing triggers
    IF OBJECT_ID('tr_update_po_total_amount', 'TR') IS NOT NULL
    BEGIN
        DROP TRIGGER tr_update_po_total_amount;
    END
    
    DROP TABLE purchase_orders;
    PRINT '✅ purchase_orders dropped';
END

GO

-- Create new Purchase Orders table with correct schema
CREATE TABLE purchase_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    po_number NVARCHAR(50) NOT NULL UNIQUE,
    tender_id NVARCHAR(100) NOT NULL,  -- Match tenders.id type (UUID string)
    vendor_id NVARCHAR(100) NOT NULL,  -- Use NVARCHAR to be flexible
    po_date DATETIME NOT NULL DEFAULT GETDATE(),
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status NVARCHAR(50) DEFAULT 'draft', -- draft, issued, confirmed, closed
    remarks NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(255) NULL,
    updated_by NVARCHAR(255) NULL,
    INDEX idx_tender_id (tender_id),
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_po_date (po_date),
    INDEX idx_status (status)
);

PRINT '✅ purchase_orders table created';

-- Create index for PO number lookup
CREATE INDEX idx_po_number ON purchase_orders(po_number);

-- Create Purchase Order Items table
CREATE TABLE purchase_order_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    po_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id NVARCHAR(100) NOT NULL,  -- Match item_masters schema
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    specifications NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_purchase_order_items_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    INDEX idx_po_id (po_id),
    INDEX idx_item_master_id (item_master_id)
);

PRINT '✅ purchase_order_items table created';

GO

-- Create trigger to auto-update total_amount in purchase_orders when items are added/modified
CREATE TRIGGER tr_update_po_total_amount
ON purchase_order_items
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    UPDATE purchase_orders
    SET total_amount = ISNULL((
        SELECT SUM(total_price) 
        FROM purchase_order_items 
        WHERE po_id = purchase_orders.id
    ), 0),
    updated_at = GETDATE()
    WHERE id IN (SELECT DISTINCT po_id FROM inserted UNION SELECT DISTINCT po_id FROM deleted);
END;

PRINT '✅ Trigger tr_update_po_total_amount created successfully';
PRINT '✅ Purchase Orders table schema fixed with correct data types';
PRINT '✅ Tender ID: NVARCHAR(100) - matches tenders table';
PRINT '✅ Vendor ID: NVARCHAR(100) - flexible for various vendor ID formats';
GO
