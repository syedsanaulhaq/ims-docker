-- ====================================================================
-- 🔗 FIX CATEGORY RELATIONSHIPS (STEP BY STEP)
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. ADD INTEGER CATEGORY CODE TO CATEGORIES TABLE
-- ====================================================================

PRINT '🔧 Adding category_code column to categories table...';

-- Add category_code column
ALTER TABLE categories ADD category_code INT;

PRINT '✅ category_code column added';

-- ====================================================================
-- 📋 2. POPULATE CATEGORY CODES
-- ====================================================================

PRINT '🔧 Assigning category codes...';

-- Assign codes 1, 2, 3, etc. based on alphabetical order
DECLARE @RowNum INT = 1;
DECLARE @CategoryID UNIQUEIDENTIFIER;

DECLARE category_cursor CURSOR FOR
SELECT id FROM categories ORDER BY category_name;

OPEN category_cursor;
FETCH NEXT FROM category_cursor INTO @CategoryID;

WHILE @@FETCH_STATUS = 0
BEGIN
    UPDATE categories SET category_code = @RowNum WHERE id = @CategoryID;
    SET @RowNum = @RowNum + 1;
    FETCH NEXT FROM category_cursor INTO @CategoryID;
END

CLOSE category_cursor;
DEALLOCATE category_cursor;

PRINT '✅ Category codes assigned';

-- Show the mapping
SELECT 'Category Mapping:' as Info;
SELECT 
    category_code,
    category_name,
    CAST(id AS VARCHAR(40)) as UUID_ID
FROM categories 
ORDER BY category_code;

GO
