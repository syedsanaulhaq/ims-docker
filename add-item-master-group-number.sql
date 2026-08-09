-- Add dedicated group field for item masters and backfill from legacy description labels.
IF OBJECT_ID('item_masters', 'U') IS NULL
BEGIN
  RAISERROR('item_masters table not found.', 16, 1);
  RETURN;
END

IF COL_LENGTH('item_masters', 'group_number') IS NULL
BEGIN
  ALTER TABLE item_masters ADD group_number INT NULL;
END

;WITH item_groups AS (
  SELECT
    id,
    UPPER(REPLACE(REPLACE(LTRIM(RTRIM(COALESCE(description, ''))), ' ', ''), ':', '-')) AS normalized_description
  FROM item_masters
  WHERE group_number IS NULL
)
UPDATE im
SET group_number = CASE
  WHEN ig.normalized_description LIKE 'GROUP-VI%' OR ig.normalized_description LIKE 'GROUP6%' OR ig.normalized_description LIKE 'GROUP-6%' THEN 6
  WHEN ig.normalized_description LIKE 'GROUP-V%' OR ig.normalized_description LIKE 'GROUP5%' OR ig.normalized_description LIKE 'GROUP-5%' THEN 5
  WHEN ig.normalized_description LIKE 'GROUP-IV%' OR ig.normalized_description LIKE 'GROUP4%' OR ig.normalized_description LIKE 'GROUP-4%' THEN 4
  WHEN ig.normalized_description LIKE 'GROUP-III%' OR ig.normalized_description LIKE 'GROUP3%' OR ig.normalized_description LIKE 'GROUP-3%' THEN 3
  WHEN ig.normalized_description LIKE 'GROUP-II%' OR ig.normalized_description LIKE 'GROUP2%' OR ig.normalized_description LIKE 'GROUP-2%' THEN 2
  WHEN ig.normalized_description LIKE 'GROUP-I%' OR ig.normalized_description LIKE 'GROUP1%' OR ig.normalized_description LIKE 'GROUP-1%' THEN 1
  ELSE NULL
END
FROM item_masters im
INNER JOIN item_groups ig ON ig.id = im.id
WHERE im.group_number IS NULL;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_item_masters_group_number'
    AND object_id = OBJECT_ID('item_masters')
)
BEGIN
  CREATE INDEX IX_item_masters_group_number ON item_masters(group_number);
END

SELECT
  group_number,
  COUNT(*) AS item_count
FROM item_masters
WHERE group_number IS NOT NULL
GROUP BY group_number
ORDER BY group_number;
