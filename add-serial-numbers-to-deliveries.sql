-- ============================================================================
-- Add Serial Numbers Support to Delivery Items
-- ============================================================================
-- This script creates a table to store serial numbers for delivery items
-- Usage: Run this on InventoryManagementDB

USE InventoryManagementDB;
GO

PRINT '🔧 Creating delivery_item_serial_numbers table...';

-- Create table for storing serial numbers
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND type = 'U')
BEGIN
    CREATE TABLE delivery_item_serial_numbers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        delivery_id UNIQUEIDENTIFIER NOT NULL,
        delivery_item_id UNIQUEIDENTIFIER NOT NULL,
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        serial_number NVARCHAR(255) NOT NULL,
        notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_delivery_serial_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
        CONSTRAINT FK_delivery_serial_item_master FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    
    -- Create indexes for better performance
    CREATE INDEX IX_delivery_serial_delivery_id ON delivery_item_serial_numbers(delivery_id);
    CREATE INDEX IX_delivery_serial_delivery_item_id ON delivery_item_serial_numbers(delivery_item_id);
    CREATE INDEX IX_delivery_serial_item_master_id ON delivery_item_serial_numbers(item_master_id);
    CREATE INDEX IX_delivery_serial_number ON delivery_item_serial_numbers(serial_number);
    
    -- Create unique constraint to prevent duplicate serial numbers per item
    CREATE UNIQUE INDEX UX_serial_per_item ON delivery_item_serial_numbers(item_master_id, serial_number);
    
    PRINT '✅ Created delivery_item_serial_numbers table with indexes';
END
ELSE
BEGIN
    PRINT '⚠️ Table delivery_item_serial_numbers already exists';
END;

GO

PRINT '✅ Serial numbers support added successfully!';
PRINT '';
PRINT 'Summary:';
PRINT '- Table: delivery_item_serial_numbers';
PRINT '- Supports: Multiple serial numbers per delivery item';
PRINT '- Constraint: Unique serial numbers per item_master';
PRINT '- Cascade delete: When delivery is deleted, serial numbers are removed';
