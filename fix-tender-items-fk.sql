-- Fix Foreign Key Constraint for TenderItems
-- This script fixes the FK constraint to point to the unified tenders table instead of AnnualTenders

PRINT '==========================================';
PRINT 'Fixing TenderItems Foreign Key Constraint';
PRINT '==========================================';
PRINT '';

-- First, delete any orphaned TenderItems rows that don't match tenders
PRINT 'Cleaning up orphaned TenderItems rows...';
DELETE FROM [dbo].[TenderItems]
WHERE tender_id NOT IN (SELECT id FROM [dbo].[tenders]);

PRINT 'Orphaned rows deleted';
PRINT '';

-- Drop the old incorrect FK constraint
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
           WHERE CONSTRAINT_NAME = 'FK_TenderItems_TenderId')
BEGIN
    PRINT 'Dropping old FK constraint: FK_TenderItems_TenderId';
    ALTER TABLE [dbo].[TenderItems] DROP CONSTRAINT [FK_TenderItems_TenderId];
    PRINT 'Old FK constraint dropped';
END
ELSE
BEGIN
    PRINT 'FK constraint does not exist, creating new one...';
END

GO

-- Create the new correct FK constraint pointing to the tenders table
PRINT '';
PRINT 'Creating new FK constraint to dbo.tenders...';

ALTER TABLE [dbo].[TenderItems] 
ADD CONSTRAINT [FK_TenderItems_TenderId] 
FOREIGN KEY ([tender_id]) 
REFERENCES [dbo].[tenders]([id]);

PRINT 'New FK constraint created successfully';
PRINT '';
PRINT '===========================================';
PRINT 'FK Constraint Fix Complete';
PRINT '===========================================';

GO
