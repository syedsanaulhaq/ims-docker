-- Add manufacturer column to item_masters table
-- This column stores the manufacturer/supplier information for items

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('item_masters') AND name = 'manufacturer')
BEGIN
    ALTER TABLE item_masters
    ADD manufacturer NVARCHAR(255);
    
    PRINT '✅ Added manufacturer column to item_masters table';
END
ELSE
BEGIN
    PRINT '⚠️ manufacturer column already exists in item_masters table';
END;
