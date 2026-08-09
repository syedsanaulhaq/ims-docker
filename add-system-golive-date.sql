-- ============================================================================
-- Add System Go-Live Date / Opening Balance Validation
-- ============================================================================
-- This ensures:
-- 1. Opening Balance must be entered before any tender deliveries
-- 2. No delivery can have a date before the system go-live date
-- ============================================================================

-- Create system_settings table if not exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_settings')
BEGIN
    CREATE TABLE system_settings (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        setting_key NVARCHAR(100) NOT NULL UNIQUE,
        setting_value NVARCHAR(MAX),
        setting_type NVARCHAR(50) DEFAULT 'string',
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        updated_by NVARCHAR(450)
    );
    PRINT '✅ Created system_settings table';
END
ELSE
    PRINT '⏭️  system_settings table already exists';
GO

-- Add go_live_date setting (initially NULL - set when first opening balance is created)
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'go_live_date')
BEGIN
    INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
    VALUES ('go_live_date', NULL, 'date', 'The date when opening balance was entered. All tender deliveries must be on or after this date.');
    PRINT '✅ Added go_live_date setting';
END
GO

-- Add opening_balance_completed setting
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'opening_balance_completed')
BEGIN
    INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
    VALUES ('opening_balance_completed', 'false', 'boolean', 'Whether opening balance entry has been completed');
    PRINT '✅ Added opening_balance_completed setting';
END
GO

-- ============================================================================
-- Create helper function to check if delivery date is valid
-- ============================================================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'fn_IsDeliveryDateValid' AND type = 'FN')
    DROP FUNCTION fn_IsDeliveryDateValid;
GO

CREATE FUNCTION fn_IsDeliveryDateValid(@DeliveryDate DATE)
RETURNS BIT
AS
BEGIN
    DECLARE @GoLiveDate DATE;
    DECLARE @IsOpeningBalanceComplete BIT;
    
    SELECT @GoLiveDate = CAST(setting_value AS DATE)
    FROM system_settings 
    WHERE setting_key = 'go_live_date' AND setting_value IS NOT NULL;
    
    SELECT @IsOpeningBalanceComplete = CASE WHEN setting_value = 'true' THEN 1 ELSE 0 END
    FROM system_settings 
    WHERE setting_key = 'opening_balance_completed';
    
    -- If opening balance not completed, delivery is not valid
    IF @IsOpeningBalanceComplete = 0 OR @IsOpeningBalanceComplete IS NULL
        RETURN 0;
    
    -- If delivery date is before go-live date, not valid
    IF @GoLiveDate IS NOT NULL AND @DeliveryDate < @GoLiveDate
        RETURN 0;
    
    RETURN 1;
END;
GO

PRINT '✅ Created fn_IsDeliveryDateValid function';
GO

-- ============================================================================
-- Create view to get system go-live status
-- ============================================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_system_golive_status')
    DROP VIEW vw_system_golive_status;
GO

CREATE VIEW vw_system_golive_status AS
SELECT 
    (SELECT setting_value FROM system_settings WHERE setting_key = 'go_live_date') AS go_live_date,
    (SELECT CASE WHEN setting_value = 'true' THEN 1 ELSE 0 END FROM system_settings WHERE setting_key = 'opening_balance_completed') AS opening_balance_completed,
    (SELECT COUNT(*) FROM opening_balance_entries) AS total_opening_balance_entries,
    (SELECT MIN(acquisition_date) FROM opening_balance_entries) AS earliest_opening_balance_date;
GO

PRINT '✅ Created vw_system_golive_status view';
GO

-- ============================================================================
-- Summary
-- ============================================================================
PRINT '';
PRINT '╔════════════════════════════════════════════════════════════╗';
PRINT '║         System Go-Live Date Setup Complete                  ║';
PRINT '╠════════════════════════════════════════════════════════════╣';
PRINT '║ Tables: system_settings                                     ║';
PRINT '║ Settings: go_live_date, opening_balance_completed           ║';
PRINT '║ Functions: fn_IsDeliveryDateValid                           ║';
PRINT '║ Views: vw_system_golive_status                              ║';
PRINT '╚════════════════════════════════════════════════════════════╝';
GO
