-- ============================================================================
-- Add Financial Year Support to Opening Balance System (Production Compatible)
-- VERSION 2: Fixed for older SQL Server versions
-- ============================================================================

USE IMS;
GO

PRINT '=== Adding Financial Year Support (Production Compatible) ===';
PRINT '';

-- ============================================================================
-- STEP 1: Create financial_years lookup table
-- ============================================================================
PRINT 'STEP 1: Creating financial_years table...';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'financial_years')
BEGIN
    CREATE TABLE financial_years (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        year_code NVARCHAR(10) NOT NULL UNIQUE,       -- e.g., '2025-26'
        year_label NVARCHAR(50) NOT NULL,             -- e.g., 'Financial Year 2025-26'
        start_date DATE NOT NULL,                     -- e.g., 2025-04-01
        end_date DATE NOT NULL,                       -- e.g., 2026-03-31
        is_current BIT DEFAULT 0,                     -- Current active year
        is_closed BIT DEFAULT 0,                      -- Year-end closing done
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Create indexes separately (compatible with older SQL Server)
    CREATE INDEX IX_FinancialYear_Code ON financial_years(year_code);
    CREATE INDEX IX_FinancialYear_Current ON financial_years(is_current);
    
    PRINT '  ✓ Created financial_years table';
    
    -- Insert financial years from 2020-21 to 2030-31
    INSERT INTO financial_years (year_code, year_label, start_date, end_date, is_current, is_closed)
    VALUES 
        ('2020-21', 'Financial Year 2020-21', '2020-04-01', '2021-03-31', 0, 1),
        ('2021-22', 'Financial Year 2021-22', '2021-04-01', '2022-03-31', 0, 1),
        ('2022-23', 'Financial Year 2022-23', '2022-04-01', '2023-03-31', 0, 1),
        ('2023-24', 'Financial Year 2023-24', '2023-04-01', '2024-03-31', 0, 1),
        ('2024-25', 'Financial Year 2024-25', '2024-04-01', '2025-03-31', 0, 1),
        ('2025-26', 'Financial Year 2025-26', '2025-04-01', '2026-03-31', 1, 0),  -- Current year
        ('2026-27', 'Financial Year 2026-27', '2026-04-01', '2027-03-31', 0, 0),
        ('2027-28', 'Financial Year 2027-28', '2027-04-01', '2028-03-31', 0, 0),
        ('2028-29', 'Financial Year 2028-29', '2028-04-01', '2029-03-31', 0, 0),
        ('2029-30', 'Financial Year 2029-30', '2029-04-01', '2030-03-31', 0, 0),
        ('2030-31', 'Financial Year 2030-31', '2030-04-01', '2031-03-31', 0, 0);
    
    PRINT '  ✓ Inserted financial years 2020-21 to 2030-31';
END
ELSE
BEGIN
    PRINT '  ℹ financial_years table already exists';
END
GO

-- ============================================================================
-- STEP 2: Add financial_year column to opening_balance_entries
-- ============================================================================
PRINT '';
PRINT 'STEP 2: Adding financial_year column to opening_balance_entries...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('opening_balance_entries') AND name = 'financial_year')
BEGIN
    ALTER TABLE opening_balance_entries
    ADD financial_year NVARCHAR(10) NULL;
    
    PRINT '  ✓ Added financial_year column';
END
ELSE
BEGIN
    PRINT '  ℹ financial_year column already exists';
END
GO

-- Create index separately
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OpeningBalance_FinancialYear' AND object_id = OBJECT_ID('opening_balance_entries'))
BEGIN
    CREATE INDEX IX_OpeningBalance_FinancialYear ON opening_balance_entries(financial_year);
    PRINT '  ✓ Added index on financial_year';
END
GO

-- ============================================================================
-- STEP 3: Update existing entries to current financial year (2025-26)
-- ============================================================================
PRINT '';
PRINT 'STEP 3: Updating existing entries to current financial year...';

UPDATE opening_balance_entries
SET financial_year = '2025-26'
WHERE financial_year IS NULL;

DECLARE @updatedCount INT = @@ROWCOUNT;
PRINT '  ✓ Updated ' + CAST(@updatedCount AS VARCHAR) + ' entries to FY 2025-26';
GO

-- ============================================================================
-- STEP 4: Add financial_year column to stock_acquisitions (for tracking)
-- ============================================================================
PRINT '';
PRINT 'STEP 4: Adding financial_year column to stock_acquisitions...';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_acquisitions')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'financial_year')
    BEGIN
        ALTER TABLE stock_acquisitions
        ADD financial_year NVARCHAR(10) NULL;
        
        PRINT '  ✓ Added financial_year column to stock_acquisitions';
        
        -- Update existing stock_acquisitions from opening balance
        UPDATE stock_acquisitions
        SET financial_year = '2025-26'
        WHERE notes LIKE '%Opening Balance%' AND financial_year IS NULL;
        
        PRINT '  ✓ Updated existing stock_acquisitions';
    END
    ELSE
    BEGIN
        PRINT '  ℹ financial_year column already exists in stock_acquisitions';
    END
END
ELSE
BEGIN
    PRINT '  ℹ stock_acquisitions table does not exist - skipping';
END
GO

-- ============================================================================
-- STEP 5: Detect category table name (item_categories or categories)
-- ============================================================================
PRINT '';
PRINT 'STEP 5: Creating year-wise inventory view...';

-- Drop existing view if exists
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_yearwise_inventory')
    DROP VIEW vw_yearwise_inventory;
GO

-- Check which category table exists and create view accordingly
DECLARE @categoryTable NVARCHAR(50);
DECLARE @viewSQL NVARCHAR(MAX);

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'item_categories')
    SET @categoryTable = 'item_categories';
ELSE IF EXISTS (SELECT * FROM sys.tables WHERE name = 'categories')
    SET @categoryTable = 'categories';
ELSE
    SET @categoryTable = NULL;

IF @categoryTable IS NOT NULL
BEGIN
    SET @viewSQL = '
    CREATE VIEW vw_yearwise_inventory AS
    SELECT 
        obe.financial_year,
        fy.year_label,
        fy.is_current,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit,
        ic.name AS category_name,
        
        -- Opening balance for this year (closing of previous year)
        ISNULL((
            SELECT SUM(prev.quantity_received - prev.quantity_already_issued)
            FROM opening_balance_entries prev
            JOIN financial_years prev_fy ON prev.financial_year = prev_fy.year_code
            JOIN financial_years curr_fy ON obe.financial_year = curr_fy.year_code
            WHERE prev.item_master_id = obe.item_master_id
              AND prev_fy.end_date < curr_fy.start_date
              AND prev.status = ''ACTIVE''
        ), 0) AS opening_balance,
        
        -- This year''s received
        SUM(obe.quantity_received) AS quantity_received,
        
        -- This year''s issued
        SUM(obe.quantity_already_issued) AS quantity_issued,
        
        -- Closing balance for this year
        SUM(obe.quantity_received - obe.quantity_already_issued) + 
        ISNULL((
            SELECT SUM(prev.quantity_received - prev.quantity_already_issued)
            FROM opening_balance_entries prev
            JOIN financial_years prev_fy ON prev.financial_year = prev_fy.year_code
            JOIN financial_years curr_fy ON obe.financial_year = curr_fy.year_code
            WHERE prev.item_master_id = obe.item_master_id
              AND prev_fy.end_date < curr_fy.start_date
              AND prev.status = ''ACTIVE''
        ), 0) AS closing_balance,
        
        -- Unit cost (average)
        AVG(obe.unit_cost) AS avg_unit_cost,
        
        -- Entry count
        COUNT(*) AS entry_count
        
    FROM opening_balance_entries obe
    JOIN item_masters im ON obe.item_master_id = im.id
    LEFT JOIN ' + @categoryTable + ' ic ON im.category_id = ic.id
    LEFT JOIN financial_years fy ON obe.financial_year = fy.year_code
    WHERE obe.status = ''ACTIVE''
    GROUP BY 
        obe.financial_year, 
        fy.year_label,
        fy.is_current,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit,
        ic.name';
    
    EXEC sp_executesql @viewSQL;
    PRINT '  ✓ Created vw_yearwise_inventory view (using ' + @categoryTable + ')';
END
ELSE
BEGIN
    -- Create view without category join
    SET @viewSQL = '
    CREATE VIEW vw_yearwise_inventory AS
    SELECT 
        obe.financial_year,
        fy.year_label,
        fy.is_current,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit,
        NULL AS category_name,
        
        ISNULL((
            SELECT SUM(prev.quantity_received - prev.quantity_already_issued)
            FROM opening_balance_entries prev
            JOIN financial_years prev_fy ON prev.financial_year = prev_fy.year_code
            JOIN financial_years curr_fy ON obe.financial_year = curr_fy.year_code
            WHERE prev.item_master_id = obe.item_master_id
              AND prev_fy.end_date < curr_fy.start_date
              AND prev.status = ''ACTIVE''
        ), 0) AS opening_balance,
        
        SUM(obe.quantity_received) AS quantity_received,
        SUM(obe.quantity_already_issued) AS quantity_issued,
        
        SUM(obe.quantity_received - obe.quantity_already_issued) + 
        ISNULL((
            SELECT SUM(prev.quantity_received - prev.quantity_already_issued)
            FROM opening_balance_entries prev
            JOIN financial_years prev_fy ON prev.financial_year = prev_fy.year_code
            JOIN financial_years curr_fy ON obe.financial_year = curr_fy.year_code
            WHERE prev.item_master_id = obe.item_master_id
              AND prev_fy.end_date < curr_fy.start_date
              AND prev.status = ''ACTIVE''
        ), 0) AS closing_balance,
        
        AVG(obe.unit_cost) AS avg_unit_cost,
        COUNT(*) AS entry_count
        
    FROM opening_balance_entries obe
    JOIN item_masters im ON obe.item_master_id = im.id
    LEFT JOIN financial_years fy ON obe.financial_year = fy.year_code
    WHERE obe.status = ''ACTIVE''
    GROUP BY 
        obe.financial_year, 
        fy.year_label,
        fy.is_current,
        obe.item_master_id,
        im.item_code,
        im.nomenclature,
        im.unit';
    
    EXEC sp_executesql @viewSQL;
    PRINT '  ✓ Created vw_yearwise_inventory view (no category table found)';
END
GO

-- ============================================================================
-- STEP 6: Create simplified view for year summary
-- ============================================================================
PRINT '';
PRINT 'STEP 6: Creating year summary view...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_financial_year_summary')
    DROP VIEW vw_financial_year_summary;
GO

CREATE VIEW vw_financial_year_summary AS
SELECT 
    fy.year_code,
    fy.year_label,
    fy.is_current,
    fy.is_closed,
    fy.start_date,
    fy.end_date,
    ISNULL(COUNT(DISTINCT obe.item_master_id), 0) AS total_items,
    ISNULL(SUM(obe.quantity_received), 0) AS total_received,
    ISNULL(SUM(obe.quantity_already_issued), 0) AS total_issued,
    ISNULL(SUM(obe.quantity_received - obe.quantity_already_issued), 0) AS net_balance
FROM financial_years fy
LEFT JOIN opening_balance_entries obe ON fy.year_code = obe.financial_year AND obe.status = 'ACTIVE'
GROUP BY 
    fy.year_code,
    fy.year_label,
    fy.is_current,
    fy.is_closed,
    fy.start_date,
    fy.end_date;
GO

PRINT '  ✓ Created vw_financial_year_summary view';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
PRINT '';
PRINT '=== Verification ===';

SELECT 'Financial Years' AS [Table], COUNT(*) AS [Count] FROM financial_years;

SELECT 'Opening Balance Entries by FY' AS [Summary], 
       financial_year, 
       COUNT(*) AS [Entries],
       SUM(quantity_received) AS [Total Received],
       SUM(quantity_already_issued) AS [Total Issued],
       SUM(quantity_received - quantity_already_issued) AS [Available]
FROM opening_balance_entries
WHERE status = 'ACTIVE'
GROUP BY financial_year;

SELECT * FROM vw_financial_year_summary ORDER BY year_code;

PRINT '';
PRINT '=== Financial Year Support Added Successfully! ===';
GO
