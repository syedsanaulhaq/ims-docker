-- ========================================================================
-- CONVERT vendor_id COLUMN FROM uniqueidentifier TO NVARCHAR(MAX)
-- ========================================================================
-- REASON: vendor_id now needs to store comma-separated vendor IDs for annual tenders
-- Current type (uniqueidentifier) cannot store comma-separated values
-- ========================================================================

BEGIN TRANSACTION

-- Step 1: Create a temporary column with NVARCHAR(MAX) type
ALTER TABLE [dbo].[tender_items] 
ADD vendor_id_temp NVARCHAR(MAX) NULL;

PRINT '✅ Created temporary column vendor_id_temp';

-- Step 2: Copy data from old column to new column (convert UUID to string)
UPDATE [dbo].[tender_items]
SET vendor_id_temp = CAST([vendor_id] AS NVARCHAR(MAX))
WHERE [vendor_id] IS NOT NULL;

PRINT '✅ Copied ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records from vendor_id to vendor_id_temp';

-- Step 3: Drop the old uniqueidentifier column
ALTER TABLE [dbo].[tender_items]
DROP COLUMN [vendor_id];

PRINT '✅ Dropped old vendor_id column (uniqueidentifier type)';

-- Step 4: Rename the temporary column to vendor_id
EXEC sp_rename 'tender_items.vendor_id_temp', 'vendor_id', 'COLUMN';

PRINT '✅ Renamed vendor_id_temp to vendor_id';

-- Step 5: Verify the column type
DECLARE @dataType NVARCHAR(MAX);
SELECT @dataType = DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'vendor_id';

PRINT '✅ vendor_id column type is now: ' + @dataType;

COMMIT TRANSACTION

PRINT '✅ ========================================';
PRINT '✅ Migration Complete!';
PRINT '✅ vendor_id can now store comma-separated vendor IDs';
PRINT '✅ ========================================';
