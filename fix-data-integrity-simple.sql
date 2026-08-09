-- ====================================================================
-- 🔧 FIX DATA INTEGRITY ISSUES FOR FOREIGN KEY RELATIONSHIPS (FIXED)
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. IDENTIFY AND FIX ORPHANED RECORDS
-- ====================================================================

PRINT '🔍 IDENTIFYING DATA INTEGRITY ISSUES...';

-- Check orphaned DEC_MST records
SELECT 
    'Orphaned DEC_MST Records' as Issue,
    COUNT(*) as OrphanedCount
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL;

-- Show specific orphaned records
SELECT 
    'Details:' as Info,
    d.intAutoID as DEC_ID,
    d.WingID as OrphanedWingID,
    d.strDECName as DEC_Name
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL
ORDER BY d.WingID;

PRINT '✅ APPLYING FIX: Setting orphaned WingIDs to NULL...';

-- Fix orphaned records by setting WingID to NULL
UPDATE DEC_MST 
SET WingID = NULL 
WHERE WingID IN (
    SELECT DISTINCT d.WingID 
    FROM DEC_MST d 
    LEFT JOIN WingsInformation w ON d.WingID = w.Id 
    WHERE w.Id IS NULL AND d.WingID IS NOT NULL
);

SELECT '✅ Orphaned WingID references fixed' as Status;

-- ====================================================================
-- 📋 2. VERIFY THE FIX AND CREATE RELATIONSHIPS
-- ====================================================================

-- Check if fix worked
DECLARE @OrphanCount INT;
SELECT @OrphanCount = COUNT(*) 
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL;

PRINT 'Remaining orphaned records: ' + CAST(@OrphanCount AS VARCHAR(10));

-- Create the foreign key relationship if no orphans remain
IF @OrphanCount = 0
BEGIN
    PRINT '🔗 Creating FK_DEC_MST_WingsInformation relationship...';
    
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DEC_MST_WingsInformation')
    BEGIN
        ALTER TABLE DEC_MST 
        ADD CONSTRAINT FK_DEC_MST_WingsInformation 
        FOREIGN KEY (WingID) REFERENCES WingsInformation(Id);
        
        SELECT '✅ FK_DEC_MST_WingsInformation created successfully!' as Status;
    END
    ELSE
    BEGIN
        SELECT 'ℹ️ FK_DEC_MST_WingsInformation already exists' as Status;
    END
END

-- ====================================================================
-- 📋 3. CHECK AND FIX WingsInformation → tblOffices
-- ====================================================================

PRINT '🔍 Checking WingsInformation → tblOffices relationship...';

-- Check orphaned WingsInformation records
SELECT 
    'Orphaned WingsInformation Records' as Issue,
    COUNT(*) as OrphanedWingsCount
FROM WingsInformation w 
LEFT JOIN tblOffices o ON w.OfficeID = o.intOfficeID 
WHERE o.intOfficeID IS NULL AND w.OfficeID IS NOT NULL;

-- Fix orphaned WingsInformation records if any
DECLARE @OrphanedWingsCount INT;
SELECT @OrphanedWingsCount = COUNT(*) 
FROM WingsInformation w 
LEFT JOIN tblOffices o ON w.OfficeID = o.intOfficeID 
WHERE o.intOfficeID IS NULL AND w.OfficeID IS NOT NULL;

IF @OrphanedWingsCount > 0
BEGIN
    PRINT 'Fixing orphaned WingsInformation OfficeID references...';
    
    UPDATE WingsInformation 
    SET OfficeID = NULL 
    WHERE OfficeID NOT IN (SELECT intOfficeID FROM tblOffices WHERE intOfficeID IS NOT NULL);
    
    SELECT '✅ WingsInformation orphaned OfficeIDs fixed' as Status;
END
ELSE
BEGIN
    SELECT '✅ WingsInformation → tblOffices relationship is clean' as Status;
END

-- Create WingsInformation → tblOffices relationship
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WingsInformation_tblOffices')
BEGIN
    BEGIN TRY
        ALTER TABLE WingsInformation 
        ADD CONSTRAINT FK_WingsInformation_tblOffices 
        FOREIGN KEY (OfficeID) REFERENCES tblOffices(intOfficeID);
        
        SELECT '✅ FK_WingsInformation_tblOffices created successfully!' as Status;
    END TRY
    BEGIN CATCH
        SELECT '❌ Could not create FK_WingsInformation_tblOffices: ' + ERROR_MESSAGE() as Status;
    END CATCH
END
ELSE
BEGIN
    SELECT 'ℹ️ FK_WingsInformation_tblOffices already exists' as Status;
END

-- ====================================================================
-- 📋 4. FINAL VERIFICATION
-- ====================================================================

SELECT '📊 FINAL RELATIONSHIP STATUS:' as Info;

SELECT 
    fk.name AS 'Foreign Key Name',
    tp.name AS 'Parent Table',
    tr.name AS 'Referenced Table'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
WHERE tp.name IN ('DEC_MST', 'WingsInformation') 
   OR tr.name IN ('DEC_MST', 'WingsInformation', 'tblOffices')
ORDER BY tp.name;

SELECT '🎉 DATA INTEGRITY FIXES COMPLETE!' as Status;
SELECT '✅ You can now create database diagrams without foreign key conflicts' as Result;

GO
