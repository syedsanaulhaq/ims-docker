-- Add the missing organizational columns to tenders table
-- The View_tenders expects office_ids, wing_ids, dec_ids (plural) but table only has singular versions

-- Check if the columns exist first
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'office_ids')
BEGIN
    ALTER TABLE tenders ADD office_ids NVARCHAR(500) NULL;
    PRINT 'Added office_ids column';
END
ELSE
    PRINT 'office_ids column already exists';

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'wing_ids')
BEGIN
    ALTER TABLE tenders ADD wing_ids NVARCHAR(500) NULL;
    PRINT 'Added wing_ids column';
END
ELSE
    PRINT 'wing_ids column already exists';

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'dec_ids')
BEGIN
    ALTER TABLE tenders ADD dec_ids NVARCHAR(500) NULL;
    PRINT 'Added dec_ids column';
END
ELSE
    PRINT 'dec_ids column already exists';

-- Migrate existing data from singular to plural columns
UPDATE tenders 
SET 
    office_ids = CASE WHEN office_id IS NOT NULL AND office_id != '' THEN office_id ELSE NULL END,
    wing_ids = CASE WHEN wing_id IS NOT NULL AND wing_id != '' THEN wing_id ELSE NULL END,
    dec_ids = CASE WHEN dec_id IS NOT NULL AND dec_id != '' THEN dec_id ELSE NULL END
WHERE office_ids IS NULL OR wing_ids IS NULL OR dec_ids IS NULL;

PRINT 'Migrated existing organizational data to plural columns';

-- Show current organizational columns in tenders table
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
AND (COLUMN_NAME LIKE '%office%' OR COLUMN_NAME LIKE '%wing%' OR COLUMN_NAME LIKE '%dec%') 
ORDER BY COLUMN_NAME;
