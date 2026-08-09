-- ====================================================================
-- 🔗 CREATE PROPER CATEGORY HIERARCHY (STEP BY STEP)
-- ====================================================================
-- ItemMaster → sub_categories → categories
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 STEP 1: ADD SUB_CATEGORY_ID TO ITEMMASTER
-- ====================================================================

PRINT '🔧 Adding sub_category_id column to ItemMaster...';

-- Add sub_category_id column
ALTER TABLE ItemMaster ADD sub_category_id UNIQUEIDENTIFIER NULL;

PRINT '✅ sub_category_id column added to ItemMaster';

-- ====================================================================
-- 📋 STEP 2: SHOW AVAILABLE SUB-CATEGORIES
-- ====================================================================

SELECT 'Available Sub-Categories:' as Info;
SELECT 
    CAST(sc.id AS VARCHAR(40)) as SubCategoryID,
    sc.sub_category_name,
    c.category_name
FROM sub_categories sc
LEFT JOIN categories c ON sc.category_id = c.id
ORDER BY c.category_name, sc.sub_category_name;

-- ====================================================================
-- 📋 STEP 3: ASSIGN ITEMS TO SUB-CATEGORIES  
-- ====================================================================

PRINT '';
PRINT '🔧 Assigning items to sub-categories based on item names...';

-- Get first available sub-category for default assignment
DECLARE @DefaultSubCatID UNIQUEIDENTIFIER;
SELECT TOP 1 @DefaultSubCatID = id FROM sub_categories ORDER BY sub_category_name;

-- Assign all items to the first sub-category as default
UPDATE ItemMaster SET sub_category_id = @DefaultSubCatID;

PRINT '✅ All items assigned to default sub-category';

-- Show current item assignments
SELECT 'Current Item Assignments:' as Info;
SELECT 
    i.item_id,
    i.item_name,
    i.category_id as old_category_id,
    sc.sub_category_name,
    c.category_name
FROM ItemMaster i
LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
LEFT JOIN categories c ON sc.category_id = c.id
ORDER BY i.item_id;

GO
