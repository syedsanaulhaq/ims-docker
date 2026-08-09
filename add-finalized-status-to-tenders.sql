-- Add finalization tracking to tenders table for Spot Purchase finalization
-- This allows tracking finalization at the tender level (parent record)

USE InventoryManagementDB;
GO

-- Add finalization columns to tenders table
ALTER TABLE tenders 
ADD 
    is_finalized BIT NOT NULL DEFAULT 0,
    finalized_at DATETIME2,
    finalized_by UNIQUEIDENTIFIER;

-- Add foreign key constraint for finalized_by to reference Users table
ALTER TABLE tenders
ADD CONSTRAINT FK_tenders_finalized_by_users
FOREIGN KEY (finalized_by) REFERENCES Users(id);

-- Create index for performance on finalized queries
CREATE INDEX IX_tenders_is_finalized ON tenders(is_finalized);

-- Add check constraint to ensure finalized_at and finalized_by are set together
-- (Adding this after the columns are created)
-- ALTER TABLE tenders
-- ADD CONSTRAINT CK_tenders_finalization_consistency
-- CHECK (
--     (is_finalized = 0 AND finalized_at IS NULL AND finalized_by IS NULL) OR
--     (is_finalized = 1 AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
-- );

PRINT '✅ Successfully added finalization tracking to tenders table';
PRINT '   - is_finalized: BIT column to track if tender is finalized';
PRINT '   - finalized_at: DATETIME2 column for finalization timestamp';
PRINT '   - finalized_by: UNIQUEIDENTIFIER foreign key to Users table';
PRINT '   - Added constraints and indexes for data integrity and performance';

-- Show the updated table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
    AND COLUMN_NAME IN ('is_finalized', 'finalized_at', 'finalized_by')
ORDER BY ORDINAL_POSITION;
