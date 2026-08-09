-- ============================================================================
-- Add file_number column to purchase_orders table
-- Date: March 2, 2026
-- Purpose: Allow users to enter a file number when creating purchase orders
-- ============================================================================

PRINT 'Adding file_number column to purchase_orders table...';

-- Add file_number column if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'purchase_orders' 
    AND COLUMN_NAME = 'file_number'
)
BEGIN
    ALTER TABLE purchase_orders
    ADD file_number NVARCHAR(100) NULL;
    
    PRINT '✅ Column file_number added to purchase_orders table';
END
ELSE
BEGIN
    PRINT '⚠️ Column file_number already exists in purchase_orders table';
END

-- Verify the column was added
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'purchase_orders' 
AND COLUMN_NAME = 'file_number';

PRINT 'Script completed successfully.';
