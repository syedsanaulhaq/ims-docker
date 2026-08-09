-- ============================================================================
-- Migration: Add stock return tracking columns
-- Run this against the IMS database to support the Stock Return form
-- ============================================================================

-- Add returned_quantity tracking to stock_issuance_items
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'returned_quantity')
BEGIN
    ALTER TABLE stock_issuance_items ADD returned_quantity INT NOT NULL DEFAULT 0;
    PRINT '✅ Added returned_quantity to stock_issuance_items';
END
ELSE
BEGIN
    PRINT 'ℹ returned_quantity already exists on stock_issuance_items';
END

-- Ensure stock_returns has the expected columns for the Stock Return form
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_returns' and xtype='U')
BEGIN
    CREATE TABLE stock_returns (
        id int IDENTITY(1,1) PRIMARY KEY,
        return_date date NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        returned_by varchar(255) NOT NULL,
        verified_by varchar(255) NULL,
        return_notes text NULL,
        return_status varchar(50) DEFAULT 'Completed',
        created_at datetime DEFAULT GETDATE()
    );
    PRINT '✅ Created stock_returns table';
END
ELSE
BEGIN
    -- Add missing columns if table exists but was created from an older/other script
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'return_date')
        ALTER TABLE stock_returns ADD return_date date NOT NULL DEFAULT CAST(GETDATE() AS DATE);
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'returned_by')
        ALTER TABLE stock_returns ADD returned_by varchar(255) NOT NULL DEFAULT '';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'verified_by')
        ALTER TABLE stock_returns ADD verified_by varchar(255) NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'return_notes')
        ALTER TABLE stock_returns ADD return_notes text NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'return_status')
        ALTER TABLE stock_returns ADD return_status varchar(50) DEFAULT 'Completed';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_returns' AND COLUMN_NAME = 'created_at')
        ALTER TABLE stock_returns ADD created_at datetime DEFAULT GETDATE();

    PRINT 'ℹ stock_returns table exists, ensured required columns';
END

-- Ensure stock_return_items has the expected columns
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_return_items' and xtype='U')
BEGIN
    CREATE TABLE stock_return_items (
        id int IDENTITY(1,1) PRIMARY KEY,
        return_id int NOT NULL,
        issued_item_id varchar(255) NOT NULL,
        nomenclature varchar(500) NOT NULL,
        return_quantity int NOT NULL,
        condition_on_return varchar(50) NOT NULL,
        damage_description text NULL,
        created_at datetime DEFAULT GETDATE(),
        FOREIGN KEY (return_id) REFERENCES stock_returns(id)
    );
    PRINT '✅ Created stock_return_items table';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'return_id')
        ALTER TABLE stock_return_items ADD return_id int NOT NULL DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'issued_item_id')
        ALTER TABLE stock_return_items ADD issued_item_id varchar(255) NOT NULL DEFAULT '';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'nomenclature')
        ALTER TABLE stock_return_items ADD nomenclature varchar(500) NOT NULL DEFAULT '';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'return_quantity')
        ALTER TABLE stock_return_items ADD return_quantity int NOT NULL DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'condition_on_return')
        ALTER TABLE stock_return_items ADD condition_on_return varchar(50) NOT NULL DEFAULT 'Good';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'damage_description')
        ALTER TABLE stock_return_items ADD damage_description text NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_return_items' AND COLUMN_NAME = 'created_at')
        ALTER TABLE stock_return_items ADD created_at datetime DEFAULT GETDATE();

    -- Ensure FK exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_stock_return_items_stock_returns')
    BEGIN
        ALTER TABLE stock_return_items ADD CONSTRAINT FK_stock_return_items_stock_returns FOREIGN KEY (return_id) REFERENCES stock_returns(id);
        PRINT '✅ Added FK on stock_return_items.return_id';
    END

    PRINT 'ℹ stock_return_items table exists, ensured required columns';
END

PRINT 'Stock return tracking migration completed';
