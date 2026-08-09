-- Add is_deleted column to ItemMaster table for soft delete functionality
-- This script adds the is_deleted bit field with default value 0 (false)

USE InvMISDB;

-- Check if column already exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'is_deleted')
BEGIN
    ALTER TABLE ItemMaster 
    ADD is_deleted BIT NOT NULL DEFAULT 0;
    
    PRINT 'is_deleted column added to ItemMaster table successfully';
END
ELSE
BEGIN
    PRINT 'is_deleted column already exists in ItemMaster table';
END

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ItemMaster' 
ORDER BY ORDINAL_POSITION;