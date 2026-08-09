-- ====================================================================
-- 🔗 PROPER CATEGORY RELATIONSHIPS: ItemMaster → sub_categories → categories
-- ====================================================================
-- This creates the correct hierarchy where ItemMaster links to sub_categories,
-- and sub_categories links to categories
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. CHECK CURRENT STRUCTURE
-- ====================================================================

PRINT '🔍 ANALYZING CURRENT CATEGORY STRUCTURE...';

-- Show categories
SELECT 'Available Categories:' as Info;
SELECT 
    CAST(id AS VARCHAR(40)) as CategoryID,
    category_name
FROM categories 
ORDER BY category_name;

-- Show sub-categories with their categories
SELECT 'Sub-categories with Categories:' as Info;
SELECT 
    CAST(sc.id AS VARCHAR(40)) as SubCategoryID,
    sc.sub_category_name,
    c.category_name
FROM sub_categories sc
LEFT JOIN categories c ON sc.category_id = c.id
ORDER BY c.category_name, sc.sub_category_name;

-- Show current ItemMaster structure
SELECT 'Current ItemMaster structure:' as Info;
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ItemMaster' 
  AND COLUMN_NAME IN ('category_id', 'sub_category_id')
ORDER BY COLUMN_NAME;

-- ====================================================================
-- 📋 2. MODIFY ITEMMASTER TABLE STRUCTURE
-- ====================================================================

PRINT '';
PRINT '🔧 UPDATING ITEMMASTER TABLE STRUCTURE...';

-- Drop the old category_id column (int type) if it exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'category_id')
BEGIN
    -- First drop any existing foreign key constraint
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ItemMaster_categories')
    BEGIN
        ALTER TABLE ItemMaster DROP CONSTRAINT FK_ItemMaster_categories;
        PRINT 'Dropped old FK_ItemMaster_categories constraint';
    END
    
    -- Drop the old category_id column
    ALTER TABLE ItemMaster DROP COLUMN category_id;
    PRINT '✅ Removed old category_id column from ItemMaster';
END

-- Add sub_category_id column if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ItemMaster' AND COLUMN_NAME = 'sub_category_id')
BEGIN
    ALTER TABLE ItemMaster ADD sub_category_id UNIQUEIDENTIFIER NULL;
    PRINT '✅ Added sub_category_id column to ItemMaster';
END
ELSE
BEGIN
    PRINT 'ℹ️ sub_category_id column already exists in ItemMaster';
END

-- ====================================================================
-- 📋 3. ASSIGN ITEMS TO SUB-CATEGORIES
-- ====================================================================

PRINT '';
PRINT '🔧 ASSIGNING ITEMS TO SUB-CATEGORIES...';

-- Get some sub-category IDs for assignment
DECLARE @LaptopsSubCatID UNIQUEIDENTIFIER;
DECLARE @PrintersSubCatID UNIQUEIDENTIFIER;
DECLARE @ServersSubCatID UNIQUEIDENTIFIER;

SELECT @LaptopsSubCatID = id FROM sub_categories WHERE sub_category_name LIKE '%Laptop%';
SELECT @PrintersSubCatID = id FROM sub_categories WHERE sub_category_name LIKE '%Printer%';
SELECT @ServersSubCatID = id FROM sub_categories WHERE sub_category_name LIKE '%Server%';

-- Assign items based on their names (you can modify this logic)
UPDATE ItemMaster 
SET sub_category_id = @LaptopsSubCatID 
WHERE item_name LIKE '%Laptop%' OR item_name LIKE '%Computer%';

UPDATE ItemMaster 
SET sub_category_id = @PrintersSubCatID 
WHERE item_name LIKE '%Printer%';

UPDATE ItemMaster 
SET sub_category_id = @ServersSubCatID 
WHERE item_name LIKE '%Server%';

-- For items that don't match, assign to a default sub-category
DECLARE @DefaultSubCatID UNIQUEIDENTIFIER;
SELECT TOP 1 @DefaultSubCatID = id FROM sub_categories;

UPDATE ItemMaster 
SET sub_category_id = @DefaultSubCatID 
WHERE sub_category_id IS NULL;

PRINT '✅ Items assigned to sub-categories';

-- ====================================================================
-- 📋 4. CREATE FOREIGN KEY RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '🔗 CREATING FOREIGN KEY RELATIONSHIPS...';

-- Drop existing foreign key if it exists
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ItemMaster_sub_categories')
BEGIN
    ALTER TABLE ItemMaster DROP CONSTRAINT FK_ItemMaster_sub_categories;
    PRINT 'Dropped existing FK_ItemMaster_sub_categories';
END

-- Create ItemMaster → sub_categories relationship
ALTER TABLE ItemMaster 
ADD CONSTRAINT FK_ItemMaster_sub_categories 
FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id);

PRINT '✅ FK_ItemMaster_sub_categories created successfully!';

-- Verify sub_categories → categories relationship exists
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sub_categories_categories')
BEGIN
    ALTER TABLE sub_categories 
    ADD CONSTRAINT FK_sub_categories_categories 
    FOREIGN KEY (category_id) REFERENCES categories(id);
    
    PRINT '✅ FK_sub_categories_categories created successfully!';
END
ELSE
BEGIN
    PRINT 'ℹ️ FK_sub_categories_categories already exists';
END

-- ====================================================================
-- 📋 5. VERIFY THE COMPLETE HIERARCHY
-- ====================================================================

PRINT '';
PRINT '📊 VERIFYING COMPLETE CATEGORY HIERARCHY...';

-- Show all category-related relationships
SELECT 'Category Foreign Key Relationships:' as Info;
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
WHERE fk.name LIKE '%categories%' OR fk.name LIKE '%ItemMaster%'
ORDER BY fk.name;

-- Show items with complete category hierarchy
SELECT 'Items with Complete Category Hierarchy:' as Info;
SELECT 
    i.item_id,
    i.item_name,
    sc.sub_category_name,
    c.category_name,
    'ItemMaster → ' + sc.sub_category_name + ' → ' + c.category_name as 'Full Hierarchy'
FROM ItemMaster i
LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
LEFT JOIN categories c ON sc.category_id = c.id
ORDER BY c.category_name, sc.sub_category_name, i.item_name;

-- ====================================================================
-- 📋 6. USAGE EXAMPLES AND QUERIES
-- ====================================================================

PRINT '';
PRINT '📋 USEFUL QUERIES FOR CATEGORY HIERARCHY:';
PRINT '';
PRINT '-- Get all items in a specific category:';
PRINT 'SELECT i.item_name, sc.sub_category_name';
PRINT 'FROM ItemMaster i';
PRINT 'JOIN sub_categories sc ON i.sub_category_id = sc.id';  
PRINT 'JOIN categories c ON sc.category_id = c.id';
PRINT 'WHERE c.category_name = ''IT Equipment'';';
PRINT '';
PRINT '-- Get all items in a specific sub-category:';
PRINT 'SELECT item_name FROM ItemMaster i';
PRINT 'JOIN sub_categories sc ON i.sub_category_id = sc.id';
PRINT 'WHERE sc.sub_category_name = ''Laptops'';';
PRINT '';
PRINT '-- Count items by category:';
PRINT 'SELECT c.category_name, COUNT(i.item_id) as ItemCount';
PRINT 'FROM categories c';
PRINT 'LEFT JOIN sub_categories sc ON c.id = sc.category_id';
PRINT 'LEFT JOIN ItemMaster i ON sc.id = i.sub_category_id';
PRINT 'GROUP BY c.category_name;';

SELECT '🎉 CATEGORY HIERARCHY ESTABLISHED!' as Result;
SELECT 'ItemMaster → sub_categories → categories relationship created successfully' as Status;

-- Count relationships
DECLARE @CategoryRelationships INT;
SELECT @CategoryRelationships = COUNT(*) 
FROM sys.foreign_keys 
WHERE name LIKE '%categories%' OR name LIKE '%sub_categories%';

SELECT 'Total Category Relationships: ' + CAST(@CategoryRelationships AS VARCHAR(10)) as Summary;

GO
