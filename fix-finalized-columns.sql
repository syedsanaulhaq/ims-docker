-- Fix finalized_by column data type to match backend implementation
-- Change from UNIQUEIDENTIFIER to NVARCHAR to store user names/identifiers

USE InventoryManagementDB;
GO

-- Check if the columns exist and their current types
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'is_finalized')
BEGIN
    PRINT '⚠️  Finalization columns already exist. Checking data types...';
    
    -- Drop the foreign key constraint if it exists
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_tenders_finalized_by_users')
    BEGIN
        ALTER TABLE tenders DROP CONSTRAINT FK_tenders_finalized_by_users;
        PRINT '🗑️  Dropped existing foreign key constraint';
    END
    
    -- Check current data type of finalized_by
    DECLARE @current_type NVARCHAR(50);
    SELECT @current_type = DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tenders' AND COLUMN_NAME = 'finalized_by';
    
    IF @current_type = 'uniqueidentifier'
    BEGIN
        -- Alter the column to use NVARCHAR instead of UNIQUEIDENTIFIER
        ALTER TABLE tenders 
        ALTER COLUMN finalized_by NVARCHAR(255);
        PRINT '🔧 Changed finalized_by column from UNIQUEIDENTIFIER to NVARCHAR(255)';
    END
    ELSE
    BEGIN
        PRINT '✅ finalized_by column is already NVARCHAR type';
    END
END
ELSE
BEGIN
    PRINT '➕ Adding finalization columns to tenders table...';
    
    -- Add finalization columns to tenders table with correct data types
    ALTER TABLE tenders 
    ADD 
        is_finalized BIT NOT NULL DEFAULT 0,
        finalized_at DATETIME2,
        finalized_by NVARCHAR(255);
    
    -- Create index for performance on finalized queries
    CREATE INDEX IX_tenders_is_finalized ON tenders(is_finalized);
    
    PRINT '✅ Successfully added finalization columns';
END

-- Show the updated table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
    AND COLUMN_NAME IN ('is_finalized', 'finalized_at', 'finalized_by')
ORDER BY ORDINAL_POSITION;

PRINT '📊 Current finalization column structure shown above';
PRINT '✅ Finalization columns are ready for use';