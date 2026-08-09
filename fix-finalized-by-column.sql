-- Fix finalized_by column type in deliveries table
-- Change from UNIQUEIDENTIFIER to NVARCHAR(450) to store user IDs

BEGIN TRANSACTION;

BEGIN TRY
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
        WHERE CONSTRAINT_NAME = 'FK_deliveries_finalized_by_users'
    )
    BEGIN
        ALTER TABLE deliveries DROP CONSTRAINT FK_deliveries_finalized_by_users;
        PRINT '✅ Dropped FK_deliveries_finalized_by_users constraint';
    END

    -- Check current data type
    DECLARE @CurrentType NVARCHAR(100);
    SELECT @CurrentType = DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'finalized_by';

    PRINT '📊 Current finalized_by column type: ' + ISNULL(@CurrentType, 'NULL');

    -- If column exists and is UNIQUEIDENTIFIER, alter it
    IF @CurrentType = 'uniqueidentifier'
    BEGIN
        -- Rename old column
        EXEC sp_rename 'deliveries.finalized_by', 'finalized_by_old', 'COLUMN';
        PRINT '✅ Renamed finalized_by to finalized_by_old';

        -- Add new column with correct type
        ALTER TABLE deliveries ADD finalized_by NVARCHAR(450) NULL;
        PRINT '✅ Added new finalized_by column as NVARCHAR(450)';

        -- Drop old column
        ALTER TABLE deliveries DROP COLUMN finalized_by_old;
        PRINT '✅ Dropped old finalized_by_old column';
    END
    ELSE IF @CurrentType IS NULL
    BEGIN
        -- Column doesn't exist, create it
        ALTER TABLE deliveries ADD finalized_by NVARCHAR(450) NULL;
        PRINT '✅ Added finalized_by column as NVARCHAR(450)';
    END
    ELSE
    BEGIN
        PRINT '⚠️  finalized_by already has correct type: ' + @CurrentType;
    END

    COMMIT TRANSACTION;
    PRINT '✅ Transaction committed successfully';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ Error: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
