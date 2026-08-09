-- ====================================================================
-- 🔗 ASSIGN ITEMS TO SUB-CATEGORIES AND CREATE RELATIONSHIPS
-- ====================================================================

USE InvMISDB;
GO

-- Assign items to sub-categories
DECLARE @DefaultSubCatID UNIQUEIDENTIFIER;
SELECT TOP 1 @DefaultSubCatID = id FROM sub_categories ORDER BY sub_category_name;

UPDATE ItemMaster SET sub_category_id = @DefaultSubCatID;

SELECT 'Items assigned to sub-categories' as Status;

-- Show the assignments
SELECT 'Items with Category Hierarchy:' as Info;
SELECT 
    i.item_name,
    sc.sub_category_name,
    c.category_name,
    'ItemMaster → ' + sc.sub_category_name + ' → ' + c.category_name as Hierarchy
FROM ItemMaster i
LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
LEFT JOIN categories c ON sc.category_id = c.id
ORDER BY i.item_name;

-- Create foreign key relationship
ALTER TABLE ItemMaster 
ADD CONSTRAINT FK_ItemMaster_sub_categories 
FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id);

SELECT '✅ FK_ItemMaster_sub_categories created successfully!' as Status;

-- Show all category relationships
SELECT 'All Category Foreign Key Relationships:' as Info;
SELECT 
    fk.name AS 'Foreign Key Name',
    tp.name + ' → ' + tr.name AS 'Relationship'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
WHERE fk.name LIKE '%categories%' OR fk.name LIKE '%sub_categories%'
ORDER BY fk.name;

GO
