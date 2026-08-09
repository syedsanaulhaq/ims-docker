-- ============================================================================
-- Production Diagnostic: Why is an item (e.g. laptop) missing from the
-- personal request item dropdown?
--
-- The /api/inventory/requestable-items endpoint returns items from ALL
-- categories. It only filters out rows where:
--   - item_masters.is_deleted = 1, OR
--   - item_masters.status IS NOT NULL AND status <> 'Active'
--
-- Run this on production to see if the missing item is being filtered out.
-- ============================================================================
USE [InventoryManagementDB];
GO
SET NOCOUNT ON;
GO

-- 1. Show items matching 'laptop' and whether they pass the requestable filter
PRINT '=== Items matching laptop ===';
SELECT
  im.id,
  im.nomenclature,
  im.item_code,
  im.status,
  im.is_deleted,
  c.category_name,
  c.item_type AS category_item_type,
  ISNULL(cis.current_quantity, 0) AS current_quantity,
  CASE
    WHEN (im.is_deleted = 0 OR im.is_deleted IS NULL)
         AND (im.status = 'Active' OR im.status IS NULL)
    THEN 'YES - requestable'
    ELSE 'NO - filtered out'
  END AS appears_in_requestable_list
FROM item_masters im
LEFT JOIN categories c ON c.id = im.category_id
LEFT JOIN current_inventory_stock cis ON cis.item_master_id = im.id
WHERE im.nomenclature LIKE '%laptop%'
   OR im.item_code LIKE '%laptop%'
ORDER BY im.nomenclature;
GO

-- 2. Overall counts
PRINT '=== Requestable item counts ===';
SELECT
  COUNT(*) AS total_item_masters,
  SUM(CASE WHEN (im.is_deleted = 0 OR im.is_deleted IS NULL)
            AND (im.status = 'Active' OR im.status IS NULL)
           THEN 1 ELSE 0 END) AS requestable_count,
  SUM(CASE WHEN im.is_deleted = 1 THEN 1 ELSE 0 END) AS deleted_count,
  SUM(CASE WHEN im.status IS NOT NULL AND im.status <> 'Active' THEN 1 ELSE 0 END) AS inactive_count,
  SUM(CASE WHEN im.status IS NULL THEN 1 ELSE 0 END) AS null_status_count
FROM item_masters im;
GO

-- 3. Categories and how many requestable items each has
PRINT '=== Categories and requestable item counts ===';
SELECT
  c.id,
  c.category_name,
  c.item_type,
  COUNT(im.id) AS total_items,
  SUM(CASE WHEN (im.is_deleted = 0 OR im.is_deleted IS NULL)
            AND (im.status = 'Active' OR im.status IS NULL)
           THEN 1 ELSE 0 END) AS requestable_items
FROM categories c
LEFT JOIN item_masters im ON im.category_id = c.id
GROUP BY c.id, c.category_name, c.item_type
ORDER BY c.category_name;
GO

-- 4. Verify the endpoint query shape works on production
PRINT '=== Sample requestable items (top 20) ===';
SELECT TOP 20
  im.id,
  im.id AS item_master_id,
  im.nomenclature,
  im.item_code,
  c.category_name,
  ISNULL(cis.current_quantity, 0) AS current_quantity
FROM item_masters im
LEFT JOIN categories c ON c.id = im.category_id
LEFT JOIN current_inventory_stock cis ON cis.item_master_id = im.id
WHERE (im.is_deleted = 0 OR im.is_deleted IS NULL)
  AND (im.status = 'Active' OR im.status IS NULL)
ORDER BY im.nomenclature;
GO
