-- Fix tender_items.tender_id data type to match tenders.id
-- Change from VARCHAR to UNIQUEIDENTIFIER for proper foreign key relationship

USE InventoryManagementDB;
GO

-- Check current data type
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tender_items' 
    AND COLUMN_NAME = 'tender_id';

PRINT '📊 Current tender_items.tender_id data type shown above';

-- Drop foreign key constraint if it exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
           WHERE CONSTRAINT_NAME LIKE '%tender_items%tender%' 
           AND TABLE_NAME = 'tender_items')
BEGIN
    DECLARE @fk_name NVARCHAR(255);
    SELECT @fk_name = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_NAME LIKE '%tender_items%tender%' 
    AND TABLE_NAME = 'tender_items';
    
    IF @fk_name IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE tender_items DROP CONSTRAINT ' + @fk_name);
        PRINT '🗑️ Dropped existing foreign key constraint: ' + @fk_name;
    END
END

-- Check if the column is currently VARCHAR
DECLARE @current_type NVARCHAR(50);
SELECT @current_type = DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'tender_id';

IF @current_type IN ('varchar', 'nvarchar', 'char', 'nchar')
BEGIN
    PRINT '🔧 Converting tender_id from ' + @current_type + ' to UNIQUEIDENTIFIER...';
    
    -- Alter the column to UNIQUEIDENTIFIER
    ALTER TABLE tender_items 
    ALTER COLUMN tender_id UNIQUEIDENTIFIER NOT NULL;
    
    PRINT '✅ Successfully converted tender_items.tender_id to UNIQUEIDENTIFIER';
END
ELSE
BEGIN
    PRINT '✅ tender_items.tender_id is already UNIQUEIDENTIFIER type';
END

-- Add foreign key constraint back
ALTER TABLE tender_items
ADD CONSTRAINT FK_tender_items_tender_id_tenders
FOREIGN KEY (tender_id) REFERENCES tenders(id);

PRINT '🔗 Added foreign key constraint: FK_tender_items_tender_id_tenders';

-- Verify the changes
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tender_items' 
    AND COLUMN_NAME = 'tender_id';

PRINT '📊 Updated tender_items.tender_id data type shown above';

-- Also check if item_master_id needs to be fixed
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tender_items' 
    AND COLUMN_NAME = 'item_master_id';

PRINT '📊 tender_items.item_master_id data type shown above';
PRINT '✅ tender_items table data types updated successfully!';