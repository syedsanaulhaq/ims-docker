-- Fix deliveries table column names to match the expected schema
-- This script updates old column names to new ones

-- Check if the old column names exist and rename them
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'notes')
BEGIN
    EXEC sp_rename 'deliveries.notes', 'delivery_notes', 'COLUMN';
    PRINT 'Renamed notes to delivery_notes';
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'supplier_name')
BEGIN
    EXEC sp_rename 'deliveries.supplier_name', 'delivery_personnel', 'COLUMN';
    PRINT 'Renamed supplier_name to delivery_personnel';
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'supplier_reference')
BEGIN
    EXEC sp_rename 'deliveries.supplier_reference', 'delivery_chalan', 'COLUMN';
    PRINT 'Renamed supplier_reference to delivery_chalan';
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'delivery_location')
BEGIN
    ALTER TABLE deliveries DROP COLUMN delivery_location;
    PRINT 'Dropped delivery_location column';
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'delivery_status')
BEGIN
    ALTER TABLE deliveries DROP COLUMN delivery_status;
    PRINT 'Dropped delivery_status column';
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'received_by')
BEGIN
    ALTER TABLE deliveries DROP COLUMN received_by;
    PRINT 'Dropped received_by column';
END

-- Add missing columns if they don't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'chalan_file_path')
BEGIN
    ALTER TABLE deliveries ADD chalan_file_path NVARCHAR(500);
    PRINT 'Added chalan_file_path column';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'is_finalized')
BEGIN
    ALTER TABLE deliveries ADD is_finalized BIT DEFAULT 0;
    PRINT 'Added is_finalized column';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'finalized_at')
BEGIN
    ALTER TABLE deliveries ADD finalized_at DATETIME2;
    PRINT 'Added finalized_at column';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'finalized_by')
BEGIN
    ALTER TABLE deliveries ADD finalized_by NVARCHAR(100);
    PRINT 'Added finalized_by column';
END

-- Show final table structure
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'deliveries'
ORDER BY ORDINAL_POSITION;

PRINT 'Deliveries table column names have been fixed!';