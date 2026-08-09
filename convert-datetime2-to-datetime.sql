-- Change datetime2(7) columns to regular datetime for better compatibility
-- This will fix the date saving issues

USE InventoryManagementDB;
GO

-- Check current column types before change
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    DATETIME_PRECISION,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
AND COLUMN_NAME IN ('publication_date', 'submission_date', 'opening_date', 'publish_date', 'advertisement_date')
ORDER BY COLUMN_NAME;

PRINT 'Current column types shown above. Changing to datetime...';

-- Change datetime2(7) columns to regular datetime
ALTER TABLE tenders ALTER COLUMN publication_date datetime;
ALTER TABLE tenders ALTER COLUMN submission_date datetime;  
ALTER TABLE tenders ALTER COLUMN opening_date datetime;
ALTER TABLE tenders ALTER COLUMN publish_date datetime;
ALTER TABLE tenders ALTER COLUMN advertisement_date datetime;

PRINT 'Column types changed successfully!';

-- Verify the changes
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    DATETIME_PRECISION,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
AND COLUMN_NAME IN ('publication_date', 'submission_date', 'opening_date', 'publish_date', 'advertisement_date')
ORDER BY COLUMN_NAME;

PRINT 'Updated column types shown above. All should now be "datetime" instead of "datetime2".';
