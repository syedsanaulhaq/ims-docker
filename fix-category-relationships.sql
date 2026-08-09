-- ====================================================================
-- 🔗 FIX CATEGORY RELATIONSHIPS IN INVENTORY SYSTEM
-- ====================================================================
-- This script resolves the data type mismatch between ItemMaster and categories
-- and establishes proper category relationships throughout the system
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. ANALYZE CURRENT CATEGORY STRUCTURE
-- ====================================================================

PRINT '🔍 ANALYZING CURRENT CATEGORY STRUCTURE...';
PRINT '';

-- Show current categories
SELECT 'Available Categories:' as Info;
SELECT 
    ROW_NUMBER() OVER (ORDER BY category_name) as IntID,
    id as UUID_ID, 
    category_name 
FROM categories 
ORDER BY category_name;

-- Show ItemMaster category references
SELECT 'ItemMaster Category References:' as Info;
SELECT 
    category_id, 
    COUNT(*) as ItemCount,
    STRING_AGG(item_name, ', ') as Items
FROM ItemMaster 
GROUP BY category_id 
ORDER BY category_id;

-- ====================================================================
-- 📋 2. SOLUTION: ADD INTEGER MAPPING TO CATEGORIES
-- ====================================================================

PRINT '';
PRINT '🔧 ADDING INTEGER CATEGORY IDs FOR COMPATIBILITY...';

-- Add an integer category_code column to categories table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'category_code')
BEGIN
    ALTER TABLE categories ADD category_code INT;
    PRINT '✅ Added category_code column to categories table';
END
ELSE
BEGIN
    PRINT 'ℹ️ category_code column already exists';
END

-- Populate category codes based on alphabetical order
UPDATE categories 
SET category_code = (
    SELECT ROW_NUMBER() OVER (ORDER BY category_name)
    FROM (SELECT category_name FROM categories c2 WHERE c2.id = categories.id) sub
);

PRINT '✅ Category codes assigned';

-- Show the mapping
SELECT 'Category Code Mapping:' as Info;
SELECT 
    category_code,
    category_name,
    id as UUID_ID
FROM categories 
ORDER BY category_code;

-- ====================================================================
-- 📋 3. UPDATE ITEMMASTER TO USE PROPER CATEGORY REFERENCES
-- ====================================================================

PRINT '';
PRINT '🔧 MAPPING ITEMMASTER TO PROPER CATEGORIES...';

-- Update ItemMaster category_id to match category_code
-- Assuming current category_id 1,2 maps to first 2 categories alphabetically

DECLARE @Category1Code INT, @Category2Code INT;
SELECT @Category1Code = MIN(category_code) FROM categories;
SELECT @Category2Code = MIN(category_code) FROM categories WHERE category_code > @Category1Code;

-- Show what we're about to map
SELECT 'Mapping Plan:' as Info;
SELECT 
    'ItemMaster category_id 1 → ' + category_name + ' (code: ' + CAST(category_code AS VARCHAR(10)) + ')' as Mapping
FROM categories WHERE category_code = @Category1Code
UNION ALL
SELECT 
    'ItemMaster category_id 2 → ' + category_name + ' (code: ' + CAST(category_code AS VARCHAR(10)) + ')' as Mapping  
FROM categories WHERE category_code = @Category2Code;

-- Update ItemMaster references
UPDATE ItemMaster 
SET category_id = @Category1Code
WHERE category_id = 1;

UPDATE ItemMaster 
SET category_id = @Category2Code  
WHERE category_id = 2;

PRINT '✅ ItemMaster category references updated';

-- ====================================================================
-- 📋 4. CREATE PROPER FOREIGN KEY RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '🔗 CREATING CATEGORY FOREIGN KEY RELATIONSHIPS...';

-- Drop existing foreign key if it exists
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ItemMaster_categories')
BEGIN
    ALTER TABLE ItemMaster DROP CONSTRAINT FK_ItemMaster_categories;
    PRINT 'Dropped existing FK_ItemMaster_categories';
END

-- Create proper foreign key using category_code
ALTER TABLE ItemMaster 
ADD CONSTRAINT FK_ItemMaster_categories 
FOREIGN KEY (category_id) REFERENCES categories(category_code);

PRINT '✅ FK_ItemMaster_categories created successfully!';

-- ====================================================================
-- 📋 5. CREATE SUB-CATEGORIES RELATIONSHIPS  
-- ====================================================================

PRINT '';
PRINT '🔧 CHECKING SUB-CATEGORIES RELATIONSHIPS...';

-- Check if sub_categories has integer references too
SELECT 'Sub-categories structure:' as Info;
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'sub_categories' 
ORDER BY ORDINAL_POSITION;

-- Check sub_categories data
SELECT 'Sub-categories data sample:' as Info;
SELECT TOP 5 
    id,
    sub_category_name,
    category_id
FROM sub_categories;

-- ====================================================================
-- 📋 6. ADD SUB-CATEGORY RELATIONSHIP TO ITEMMASTER
-- ====================================================================

PRINT '';
PRINT '🔧 ADDING SUB-CATEGORY SUPPORT TO ITEMMASTER...';

-- Add sub_category_id column to ItemMaster if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'sub_category_id')
BEGIN
    ALTER TABLE ItemMaster ADD sub_category_id UNIQUEIDENTIFIER NULL;
    PRINT '✅ Added sub_category_id column to ItemMaster';
    
    -- You can manually assign items to sub-categories later
    PRINT 'ℹ️ You can now assign items to specific sub-categories using UPDATE statements';
END
ELSE
BEGIN
    PRINT 'ℹ️ sub_category_id column already exists in ItemMaster';
END

-- Create foreign key for sub-categories if ItemMaster has the column
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'sub_category_id')
BEGIN
    -- Drop existing constraint if exists
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ItemMaster_sub_categories')
    BEGIN
        ALTER TABLE ItemMaster DROP CONSTRAINT FK_ItemMaster_sub_categories;
    END
    
    -- Create the relationship
    ALTER TABLE ItemMaster 
    ADD CONSTRAINT FK_ItemMaster_sub_categories 
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id);
    
    PRINT '✅ FK_ItemMaster_sub_categories created successfully!';
END

-- ====================================================================
-- 📋 7. VERIFY ALL CATEGORY RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '📊 FINAL CATEGORY RELATIONSHIPS STATUS:';

-- Show all category-related foreign keys
SELECT 
    fk.name AS 'Foreign Key Name',
    tp.name + ' → ' + tr.name AS 'Relationship',
    cp.name + ' → ' + cr.name AS 'Column Mapping'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
WHERE tp.name IN ('ItemMaster', 'sub_categories') 
   OR tr.name IN ('categories', 'sub_categories')
ORDER BY tp.name;

-- Show updated ItemMaster with categories
SELECT 'ItemMaster with Categories:' as Info;
SELECT 
    i.item_id,
    i.item_name,
    c.category_name,
    i.category_id
FROM ItemMaster i
LEFT JOIN categories c ON i.category_id = c.category_code
ORDER BY i.item_id;

-- ====================================================================
-- 📋 8. USAGE EXAMPLES
-- ====================================================================

PRINT '';
PRINT '📋 USAGE EXAMPLES:';
PRINT '';
PRINT '-- To assign an item to a sub-category:';
PRINT 'UPDATE ItemMaster SET sub_category_id = (SELECT id FROM sub_categories WHERE sub_category_name = ''Computers'') WHERE item_name = ''Laptop'';';
PRINT '';
PRINT '-- To view items with full category hierarchy:';
PRINT 'SELECT i.item_name, c.category_name, sc.sub_category_name';  
PRINT 'FROM ItemMaster i';
PRINT 'LEFT JOIN categories c ON i.category_id = c.category_code';
PRINT 'LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id;';
PRINT '';

SELECT '🎉 CATEGORY RELATIONSHIPS ESTABLISHED!' as Result;
SELECT 'Categories and sub-categories are now properly connected to ItemMaster' as Status;

GO
