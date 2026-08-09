-- Add forwarding columns to inventory_verification_requests table
-- This enables forwarding verification requests to store keepers

PRINT '=== Adding forwarding columns to inventory_verification_requests ===';

-- Check if columns already exist and only add missing ones
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME = 'forwarded_to_user_id')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD forwarded_to_user_id NVARCHAR(450) NULL;
    
    PRINT '✅ Added forwarded_to_user_id column';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME = 'forwarded_to_name')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD forwarded_to_name NVARCHAR(255) NULL;
    
    PRINT '✅ Added forwarded_to_name column';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME = 'forwarded_by_user_id')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD forwarded_by_user_id NVARCHAR(450) NULL;
    
    PRINT '✅ Added forwarded_by_user_id column';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME = 'forwarded_by_name')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD forwarded_by_name NVARCHAR(255) NULL;
    
    PRINT '✅ Added forwarded_by_name column';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME = 'forwarded_at')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD forwarded_at DATETIME2 NULL;
    
    PRINT '✅ Added forwarded_at column';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME = 'forward_notes')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD forward_notes NVARCHAR(MAX) NULL;
    
    PRINT '✅ Added forward_notes column';
END

-- Note: item_nomenclature column already exists, so no need to add it

-- Add foreign key for forwarded_to_user_id if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'FK_verification_forwarded_to')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD CONSTRAINT FK_verification_forwarded_to FOREIGN KEY (forwarded_to_user_id) 
        REFERENCES dbo.AspNetUsers(Id);
    
    PRINT '✅ Added foreign key for forwarded_to_user_id';
END
ELSE
BEGIN
    PRINT '⚠️  Foreign key FK_verification_forwarded_to already exists';
END

-- Add foreign key for forwarded_by_user_id if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'FK_verification_forwarded_by')
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
    ADD CONSTRAINT FK_verification_forwarded_by FOREIGN KEY (forwarded_by_user_id) 
        REFERENCES dbo.AspNetUsers(Id);
    
    PRINT '✅ Added foreign key for forwarded_by_user_id';
END
ELSE
BEGIN
    PRINT '⚠️  Foreign key FK_verification_forwarded_by already exists';
END

GO

PRINT '=== Migration complete ===';
