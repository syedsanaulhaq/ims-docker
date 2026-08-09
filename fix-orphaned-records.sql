-- ====================================================================
-- 🔧 FIX DATA INTEGRITY ISSUES (CORRECTED COLUMN NAMES)
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. IDENTIFY AND FIX ORPHANED RECORDS
-- ====================================================================

PRINT '🔍 Fixing DEC_MST → WingsInformation relationship issues...';

-- Show orphaned records first
SELECT 
    'Orphaned DEC_MST Records:' as Issue,
    d.intAutoID as DEC_ID,
    d.WingID as OrphanedWingID,
    d.DECName as DEC_Name
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL
ORDER BY d.WingID;

-- Count orphaned records
SELECT 
    COUNT(*) as OrphanedCount
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL;

-- Fix orphaned records by setting WingID to NULL
UPDATE DEC_MST 
SET WingID = NULL 
WHERE WingID IN (
    SELECT DISTINCT d.WingID 
    FROM DEC_MST d 
    LEFT JOIN WingsInformation w ON d.WingID = w.Id 
    WHERE w.Id IS NULL AND d.WingID IS NOT NULL
);

SELECT '✅ Orphaned WingID references set to NULL' as Status;

-- ====================================================================
-- 📋 2. CREATE THE FOREIGN KEY RELATIONSHIP
-- ====================================================================

-- Verify fix worked
DECLARE @OrphanCount INT;
SELECT @OrphanCount = COUNT(*) 
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL;

IF @OrphanCount = 0
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DEC_MST_WingsInformation')
    BEGIN
        ALTER TABLE DEC_MST DROP CONSTRAINT FK_DEC_MST_WingsInformation;
        SELECT 'Dropped existing FK_DEC_MST_WingsInformation' as Status;
    END
    
    -- Create the foreign key relationship
    ALTER TABLE DEC_MST 
    ADD CONSTRAINT FK_DEC_MST_WingsInformation 
    FOREIGN KEY (WingID) REFERENCES WingsInformation(Id);
    
    SELECT '✅ FK_DEC_MST_WingsInformation created successfully!' as Status;
END
ELSE
BEGIN
    SELECT '❌ Still have orphaned records, cannot create relationship' as Status;
END

-- ====================================================================
-- 📋 3. FIX WingsInformation → tblOffices RELATIONSHIP
-- ====================================================================

PRINT '🔍 Checking WingsInformation → tblOffices relationship...';

-- Check for orphaned WingsInformation records
SELECT 
    COUNT(*) as OrphanedWingsCount
FROM WingsInformation w 
LEFT JOIN tblOffices o ON w.OfficeID = o.intOfficeID 
WHERE o.intOfficeID IS NULL AND w.OfficeID IS NOT NULL;

-- Fix orphaned WingsInformation records
UPDATE WingsInformation 
SET OfficeID = NULL 
WHERE OfficeID IS NOT NULL 
AND OfficeID NOT IN (SELECT intOfficeID FROM tblOffices WHERE intOfficeID IS NOT NULL);

SELECT '✅ WingsInformation orphaned OfficeIDs fixed' as Status;

-- Create WingsInformation → tblOffices relationship
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WingsInformation_tblOffices')
BEGIN
    ALTER TABLE WingsInformation DROP CONSTRAINT FK_WingsInformation_tblOffices;
    SELECT 'Dropped existing FK_WingsInformation_tblOffices' as Status;
END

ALTER TABLE WingsInformation 
ADD CONSTRAINT FK_WingsInformation_tblOffices 
FOREIGN KEY (OfficeID) REFERENCES tblOffices(intOfficeID);

SELECT '✅ FK_WingsInformation_tblOffices created successfully!' as Status;

-- ====================================================================
-- 📋 4. FINAL VERIFICATION
-- ====================================================================

SELECT '📊 ALL ORGANIZATIONAL RELATIONSHIPS:' as Info;

SELECT 
    fk.name AS 'Foreign Key Name',
    tp.name + ' → ' + tr.name AS 'Relationship',
    CASE WHEN fk.is_disabled = 0 THEN '✅ Active' ELSE '❌ Disabled' END as Status
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
WHERE tp.name IN ('DEC_MST', 'WingsInformation') 
   OR tr.name IN ('DEC_MST', 'WingsInformation', 'tblOffices')
ORDER BY tp.name;

SELECT '🎉 DATA INTEGRITY FIXES COMPLETE!' as Result;
SELECT 'You can now create database diagrams in SSMS without foreign key conflicts!' as NextStep;

GO
