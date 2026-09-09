-- ============================================================================
-- Barcode & Serial Number Lifecycle Tracking Migration Script
-- ============================================================================

IF EXISTS (SELECT * FROM sys.databases WHERE name = 'InventoryManagementDB')
BEGIN
    USE InventoryManagementDB;
END;
GO

PRINT '🔧 Updating delivery_item_serial_numbers with lifecycle tracking columns...';

IF OBJECT_ID('delivery_item_serial_numbers', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'status')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD status NVARCHAR(50) NOT NULL DEFAULT 'IN_STOCK';
        PRINT '  + Added status column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issued_to_user_id')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issued_to_user_id NVARCHAR(450) NULL;
        PRINT '  + Added issued_to_user_id column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issued_to_wing_id')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issued_to_wing_id INT NULL;
        PRINT '  + Added issued_to_wing_id column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issued_to_office_id')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issued_to_office_id INT NULL;
        PRINT '  + Added issued_to_office_id column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issued_to_branch_id')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issued_to_branch_id INT NULL;
        PRINT '  + Added issued_to_branch_id column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issuance_request_id')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issuance_request_id UNIQUEIDENTIFIER NULL;
        PRINT '  + Added issuance_request_id column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issuance_item_id')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issuance_item_id UNIQUEIDENTIFIER NULL;
        PRINT '  + Added issuance_item_id column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issued_at')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issued_at DATETIME2 NULL;
        PRINT '  + Added issued_at column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'issued_by')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD issued_by NVARCHAR(450) NULL;
        PRINT '  + Added issued_by column';
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_item_serial_numbers') AND name = 'barcode_data')
    BEGIN
        ALTER TABLE delivery_item_serial_numbers ADD barcode_data NVARCHAR(255) NULL;
        PRINT '  + Added barcode_data column';
    END;

    -- Add index on status & barcode_data
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_delivery_serial_status')
    BEGIN
        CREATE INDEX IX_delivery_serial_status ON delivery_item_serial_numbers(status);
    END;

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_delivery_serial_barcode')
    BEGIN
        CREATE INDEX IX_delivery_serial_barcode ON delivery_item_serial_numbers(barcode_data);
    END;
END;
GO

-- Create item_serial_lifecycle_logs table for audit trail
PRINT '🔧 Creating item_serial_lifecycle_logs table...';

IF OBJECT_ID('item_serial_lifecycle_logs', 'U') IS NULL
BEGIN
    CREATE TABLE item_serial_lifecycle_logs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        serial_id UNIQUEIDENTIFIER NOT NULL,
        serial_number NVARCHAR(255) NOT NULL,
        action_type NVARCHAR(50) NOT NULL, -- 'ACQUIRED', 'ISSUED', 'RETURNED', 'TRANSFERRED', 'DISPOSED'
        actor_id NVARCHAR(450) NULL,
        actor_name NVARCHAR(255) NULL,
        recipient_user_id NVARCHAR(450) NULL,
        recipient_name NVARCHAR(255) NULL,
        wing_id INT NULL,
        office_id INT NULL,
        branch_id INT NULL,
        reference_id NVARCHAR(255) NULL, -- PO number or Issuance Request Number
        notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_serial_lifecycle_serial_id ON item_serial_lifecycle_logs(serial_id);
    CREATE INDEX IX_serial_lifecycle_serial_number ON item_serial_lifecycle_logs(serial_number);
    CREATE INDEX IX_serial_lifecycle_action ON item_serial_lifecycle_logs(action_type);
    
    PRINT '✅ Created item_serial_lifecycle_logs table';
END;
GO

PRINT '✅ Barcode & Serial Number Lifecycle migration completed successfully!';
