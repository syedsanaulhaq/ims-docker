-- Add Manufacturer field to item_masters table
USE InventoryManagementDB;
GO

-- Check if column exists before adding
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('item_masters') 
    AND name = 'manufacturer'
)
BEGIN
    ALTER TABLE item_masters
    ADD manufacturer NVARCHAR(200) NULL;
    
    PRINT '✅ Manufacturer column added to item_masters table';
END
ELSE
BEGIN
    PRINT '⚠️ Manufacturer column already exists in item_masters table';
END
GO
