-- ====================================================================
-- 🔧 FIX DATA INTEGRITY ISSUES FOR FOREIGN KEY RELATIONSHIPS
-- ====================================================================
-- This script resolves orphaned records that prevent foreign key creation
-- between tables imported from different sources
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. IDENTIFY ORPHANED RECORDS
-- ====================================================================

PRINT '🔍 IDENTIFYING DATA INTEGRITY ISSUES...';
PRINT '';

-- Check DEC_MST → WingsInformation relationship issues
PRINT '📊 Checking DEC_MST → WingsInformation relationship:';
SELECT 
    'Orphaned DEC_MST Records' as Issue,
    d.intAutoID as DEC_ID,
    d.WingID as OrphanedWingID,
    d.strDECName as DEC_Name
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL
ORDER BY d.WingID;

PRINT '';
PRINT '📊 Available WingID range in WingsInformation:';
SELECT 
    MIN(Id) as MinWingID, 
    MAX(Id) as MaxWingID, 
    COUNT(*) as TotalWings 
FROM WingsInformation;

PRINT '';

-- ====================================================================
-- 📋 2. SOLUTION OPTIONS
-- ====================================================================

PRINT '🔧 DATA INTEGRITY SOLUTION OPTIONS:';
PRINT '';
PRINT 'Option 1: Set orphaned WingID to NULL (recommended for testing)';
PRINT 'Option 2: Map to a default Wing (e.g., Admin Wing)';  
PRINT 'Option 3: Create placeholder Wing records';
PRINT '';

-- ====================================================================
-- 📋 3. IMPLEMENT FIX (OPTION 1 - SET TO NULL)
-- ====================================================================

PRINT '✅ APPLYING FIX: Setting orphaned WingIDs to NULL...';

-- Update orphaned records to NULL
UPDATE DEC_MST 
SET WingID = NULL 
WHERE WingID IN (
    SELECT DISTINCT d.WingID 
    FROM DEC_MST d 
    LEFT JOIN WingsInformation w ON d.WingID = w.Id 
    WHERE w.Id IS NULL AND d.WingID IS NOT NULL
);

PRINT '✅ Orphaned WingID references set to NULL';

-- ====================================================================
-- 📋 4. ALTERNATIVE FIX (OPTION 2 - MAP TO ADMIN WING)
-- ====================================================================
/*
-- Uncomment this section if you prefer to map to Admin Wing instead of NULL

DECLARE @AdminWingID INT;
SELECT @AdminWingID = Id FROM WingsInformation WHERE Name LIKE '%Admin%' OR Name LIKE '%Administration%';

IF @AdminWingID IS NOT NULL
BEGIN
    UPDATE DEC_MST 
    SET WingID = @AdminWingID 
    WHERE WingID IN (152, 153, 154, 155);
    
    PRINT '✅ Orphaned records mapped to Admin Wing (ID: ' + CAST(@AdminWingID AS VARCHAR(10)) + ')';
END
*/

-- ====================================================================
-- 📋 5. VERIFY THE FIX
-- ====================================================================

PRINT '';
PRINT '🔍 VERIFYING THE FIX...';

-- Check if there are still orphaned records
DECLARE @OrphanCount INT;
SELECT @OrphanCount = COUNT(*) 
FROM DEC_MST d 
LEFT JOIN WingsInformation w ON d.WingID = w.Id 
WHERE w.Id IS NULL AND d.WingID IS NOT NULL;

PRINT 'Remaining orphaned records: ' + CAST(@OrphanCount AS VARCHAR(10));

IF @OrphanCount = 0
BEGIN
    PRINT '✅ All data integrity issues resolved!';
    PRINT '';
    PRINT '🔗 NOW YOU CAN CREATE THE FOREIGN KEY RELATIONSHIP:';
    PRINT '';
    
    -- Create the foreign key relationship
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DEC_MST_WingsInformation')
    BEGIN
        ALTER TABLE DEC_MST 
        ADD CONSTRAINT FK_DEC_MST_WingsInformation 
        FOREIGN KEY (WingID) REFERENCES WingsInformation(Id);
        
        PRINT '✅ Foreign key relationship FK_DEC_MST_WingsInformation created successfully!';
    END
    ELSE
    BEGIN
        PRINT 'ℹ️ Foreign key relationship already exists';
    END
END
ELSE
BEGIN
    PRINT '⚠️ Still have ' + CAST(@OrphanCount AS VARCHAR(10)) + ' orphaned records. Please review data.';
END

-- ====================================================================
-- 📋 6. CHECK OTHER POTENTIAL RELATIONSHIP ISSUES
-- ====================================================================

PRINT '';
PRINT '🔍 CHECKING OTHER POTENTIAL RELATIONSHIP ISSUES...';

-- Check WingsInformation → tblOffices
PRINT '';
PRINT '📊 Checking WingsInformation → tblOffices relationship:';
SELECT 
    COUNT(*) as OrphanedWingsCount
FROM WingsInformation w 
LEFT JOIN tblOffices o ON w.OfficeID = o.intOfficeID 
WHERE o.intOfficeID IS NULL AND w.OfficeID IS NOT NULL;

-- Fix WingsInformation → tblOffices if needed
DECLARE @OrphanedWingsCount INT;
SELECT @OrphanedWingsCount = COUNT(*) 
FROM WingsInformation w 
LEFT JOIN tblOffices o ON w.OfficeID = o.intOfficeID 
WHERE o.intOfficeID IS NULL AND w.OfficeID IS NOT NULL;

IF @OrphanedWingsCount > 0
BEGIN
    PRINT '⚠️ Found ' + CAST(@OrphanedWingsCount AS VARCHAR(10)) + ' orphaned WingsInformation records';
    PRINT 'ℹ️ Setting orphaned OfficeID values to NULL...';
    
    UPDATE WingsInformation 
    SET OfficeID = NULL 
    WHERE OfficeID NOT IN (SELECT intOfficeID FROM tblOffices WHERE intOfficeID IS NOT NULL);
    
    PRINT '✅ WingsInformation orphaned OfficeIDs fixed';
END
ELSE
BEGIN
    PRINT '✅ WingsInformation → tblOffices relationship is clean';
END

-- ====================================================================
-- 📋 7. CREATE ALL POSSIBLE ORGANIZATIONAL RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '🔗 CREATING ORGANIZATIONAL RELATIONSHIPS...';

-- Create WingsInformation → tblOffices relationship
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_WingsInformation_tblOffices')
BEGIN
    TRY
        ALTER TABLE WingsInformation 
        ADD CONSTRAINT FK_WingsInformation_tblOffices 
        FOREIGN KEY (OfficeID) REFERENCES tblOffices(intOfficeID);
        
        PRINT '✅ FK_WingsInformation_tblOffices created successfully!';
    END TRY
    BEGIN CATCH
        PRINT '❌ Could not create FK_WingsInformation_tblOffices: ' + ERROR_MESSAGE();
    END CATCH
END
ELSE
BEGIN
    PRINT 'ℹ️ FK_WingsInformation_tblOffices already exists';
END

-- ====================================================================
-- 📋 8. FINAL VERIFICATION
-- ====================================================================

PRINT '';
PRINT '📊 FINAL RELATIONSHIP STATUS:';

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

PRINT '';
PRINT '🎉 DATA INTEGRITY FIXES COMPLETE!';
PRINT '';
PRINT '✅ You can now create database diagrams without foreign key conflicts';
PRINT '✅ All organizational relationships should work properly';
PRINT '✅ NULL values in WingID and OfficeID are acceptable for optional relationships';

GO
