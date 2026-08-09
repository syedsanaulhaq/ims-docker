-- ============================================================================
-- DEPLOY: Opening Balance Status Field
-- Run this on production SQL Server
-- Date: 2026-03-09
-- ============================================================================

USE IMS;
GO

-- ============================================================================
-- STEP 1: Add 'status' column to opening_balance_entries if not exists
-- ============================================================================
PRINT 'STEP 1: Adding status column to opening_balance_entries...';

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('opening_balance_entries') 
    AND name = 'status'
)
BEGIN
    ALTER TABLE opening_balance_entries
    ADD status NVARCHAR(20) DEFAULT 'pending';
    
    PRINT '  ✅ Added status column to opening_balance_entries';
END
ELSE
BEGIN
    PRINT '  ⏭️ status column already exists';
END
GO

-- ============================================================================
-- STEP 2: Ensure system_settings table exists with required settings
-- ============================================================================
PRINT 'STEP 2: Creating/updating system_settings table...';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_settings')
BEGIN
    CREATE TABLE system_settings (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        setting_key NVARCHAR(100) NOT NULL UNIQUE,
        setting_value NVARCHAR(MAX),
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '  ✅ Created system_settings table';
END
ELSE
BEGIN
    PRINT '  ⏭️ system_settings table already exists';
END
GO

-- Insert go_live_date setting if not exists
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'go_live_date')
BEGIN
    INSERT INTO system_settings (setting_key, setting_value, description)
    VALUES ('go_live_date', NULL, 'The date when the system went live. All deliveries must be on or after this date.');
    PRINT '  ✅ Added go_live_date setting';
END

-- Insert opening_balance_completed setting if not exists
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'opening_balance_completed')
BEGIN
    INSERT INTO system_settings (setting_key, setting_value, description)
    VALUES ('opening_balance_completed', 'false', 'Whether the opening balance entry has been completed.');
    PRINT '  ✅ Added opening_balance_completed setting';
END
GO

-- ============================================================================
-- STEP 3: Update view to include status field
-- ============================================================================
PRINT 'STEP 3: Updating vw_opening_balance_summary view...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_opening_balance_summary')
    DROP VIEW vw_opening_balance_summary;
GO

CREATE VIEW vw_opening_balance_summary AS
SELECT 
    obe.id,
    obe.tender_reference,
    obe.tender_title,
    obe.source_type,
    obe.acquisition_date,
    
    -- Item Details
    im.id as item_master_id,
    im.nomenclature,
    im.item_code,
    c.category_name,
    sc.sub_category_name,
    im.unit,
    
    -- Quantities
    obe.quantity_received,
    obe.quantity_already_issued,
    obe.quantity_available,
    
    -- Financial
    obe.unit_cost,
    obe.total_cost,
    
    -- Status
    obe.status,
    obe.processed_to_stock,
    
    -- Audit
    obe.entry_date,
    u.UserName as entered_by_name,
    obe.remarks
    
FROM opening_balance_entries obe
INNER JOIN item_masters im ON obe.item_master_id = im.id
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN AspNetUsers u ON obe.entered_by = u.Id;
GO

PRINT '  ✅ Updated vw_opening_balance_summary view';

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================
PRINT '';
PRINT '============================================';
PRINT 'DEPLOYMENT VERIFICATION';
PRINT '============================================';

-- Check opening_balance_entries columns
SELECT 'opening_balance_entries columns' as check_type, 
       name as column_name, 
       TYPE_NAME(system_type_id) as data_type
FROM sys.columns 
WHERE object_id = OBJECT_ID('opening_balance_entries')
AND name IN ('status', 'quantity_received', 'quantity_already_issued', 'quantity_available');

-- Check system_settings
SELECT 'system_settings' as check_type, setting_key, setting_value 
FROM system_settings 
WHERE setting_key IN ('go_live_date', 'opening_balance_completed');

PRINT '';
PRINT '✅ Deployment completed successfully!';
PRINT '';
PRINT 'Summary:';
PRINT '  - opening_balance_entries.status column ready';
PRINT '  - system_settings table with go_live_date and opening_balance_completed';
PRINT '  - vw_opening_balance_summary view updated';
GO
