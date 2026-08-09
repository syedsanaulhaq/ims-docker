-- ============================================================================
-- Fix PO Migration - Step 1: Add all columns only
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT 'Adding columns to purchase_order_items...';

-- Add columns to purchase_order_items
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'received_quantity')
    ALTER TABLE purchase_order_items ADD received_quantity DECIMAL(10, 2) DEFAULT 0;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'delivery_status')
    ALTER TABLE purchase_order_items ADD delivery_status VARCHAR(20) DEFAULT 'pending';

GO

PRINT 'Adding columns to deliveries...';

-- Add columns to deliveries
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('deliveries') AND name = 'po_id')
    ALTER TABLE deliveries ADD po_id UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('deliveries') AND name = 'po_number')
    ALTER TABLE deliveries ADD po_number NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('deliveries') AND name = 'received_by')
    ALTER TABLE deliveries ADD received_by UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('deliveries') AND name = 'receiving_date')
    ALTER TABLE deliveries ADD receiving_date DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('deliveries') AND name = 'delivery_status')
    ALTER TABLE deliveries ADD delivery_status VARCHAR(20) DEFAULT 'pending';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('deliveries') AND name = 'notes')
    ALTER TABLE deliveries ADD notes NVARCHAR(MAX) NULL;

GO

PRINT 'Adding columns to delivery_items...';

-- Add columns to delivery_items
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_items') AND name = 'po_item_id')
    ALTER TABLE delivery_items ADD po_item_id UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_items') AND name = 'quality_status')
    ALTER TABLE delivery_items ADD quality_status VARCHAR(20) DEFAULT 'good';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_items') AND name = 'remarks')
    ALTER TABLE delivery_items ADD remarks NVARCHAR(500) NULL;

GO

PRINT 'Adding columns to current_inventory_stock...';

-- Add columns to current_inventory_stock
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'last_transaction_date')
    ALTER TABLE current_inventory_stock ADD last_transaction_date DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('current_inventory_stock') AND name = 'last_transaction_type')
    ALTER TABLE current_inventory_stock ADD last_transaction_type VARCHAR(50) NULL;

GO

PRINT 'All columns added successfully!';
