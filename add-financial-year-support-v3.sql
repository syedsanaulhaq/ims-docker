-- ============================================================================
-- Add Financial Year Support to Opening Balance System (Production Compatible)
-- VERSION 3: Fixed category column name detection
-- ============================================================================

USE IMS;
GO

PRINT '=== Adding Financial Year Support (V3 - Production Compatible) ===';
PRINT '';

-- ============================================================================
-- STEP 1: Verify financial_years table exists
-- ============================================================================
PRINT 'STEP 1: Checking financial_years table...';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'financial_years')
BEGIN
    PRINT '  ✓ financial_years table exists with ' + 
          CAST((SELECT COUNT(*) FROM financial_years) AS VARCHAR) + ' years';
END
ELSE
BEGIN
    PRINT '  ERROR: financial_years table not found. Run v2 script first.';
END
GO

-- ============================================================================
-- STEP 2: Check what columns exist in categories table
-- ============================================================================
PRINT '';
PRINT 'STEP 2: Detecting categories table structure...';

-- List category table columns for debugging
SELECT 'Categories columns:' AS [Info], c.name AS [Column], t.name AS [Type]
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('categories')
ORDER BY c.column_id;
GO

-- ============================================================================
-- STEP 3: Drop and recreate yearwise inventory view with correct column
-- ============================================================================
PRINT '';
PRINT 'STEP 3: Creating year-wise inventory view with correct category column...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_yearwise_inventory')
    DROP VIEW vw_yearwise_inventory;
GO

DECLARE @categoryColumn NVARCHAR(50);
DECLARE @viewSQL NVARCHAR(MAX);

-- Detect the category name column (could be 'name', 'category_name', 'title', etc.)
SELECT TOP 1 @categoryColumn = c.name
FROM sys.columns c
WHERE c.object_id = OBJECT_ID('categories')
  AND c.name IN ('name', 'category_name', 'title', 'category_title', 'description')
ORDER BY CASE c.name 
    WHEN 'name' THEN 1 
    WHEN 'category_name' THEN 2 
    WHEN 'title' THEN 3 
    ELSE 4 
END;

IF @categoryColumn IS NULL
BEGIN
    -- Just get the first varchar/nvarchar column after 'id'
    SELECT TOP 1 @categoryColumn = c.name
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID('categories')
      AND t.name IN ('varchar', 'nvarchar')
      AND c.name NOT LIKE '%id%'
    ORDER BY c.column_id;
END

PRINT '  Category column detected: ' + ISNULL(@categoryColumn, 'NULL');

IF @categoryColumn IS NOT NULL
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
        ic.' + @categoryColumn + ' AS category_name,
        
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
    LEFT JOIN categories ic ON im.category_id = ic.id
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
        ic.' + @categoryColumn;
    
    EXEC sp_executesql @viewSQL;
    PRINT '  ✓ Created vw_yearwise_inventory view using categories.' + @categoryColumn;
END
ELSE
BEGIN
    -- Create view without category
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
    PRINT '  ✓ Created vw_yearwise_inventory view (no category column found)';
END
GO

-- ============================================================================
-- VERIFICATION
-- ============================================================================
PRINT '';
PRINT '=== Verification ===';

-- Test the view
SELECT TOP 5 * FROM vw_yearwise_inventory;

SELECT 'Financial Year Summary' AS [Report];
SELECT * FROM vw_financial_year_summary ORDER BY year_code;

PRINT '';
PRINT '=== Financial Year Support V3 Completed Successfully! ===';
GO
