-- =====================================================
-- Add Dispensable/Indispensable Field to Categories
-- This field indicates whether items in this category 
-- are dispensable or indispensable
-- =====================================================

USE InventoryManagementDB;
GO

-- Check if the column already exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('categories') 
    AND name = 'item_type'
)
BEGIN
    -- Add item_type column
    ALTER TABLE categories
    ADD item_type NVARCHAR(20) DEFAULT 'Dispensable' CHECK (item_type IN ('Dispensable', 'Indispensable'));
    
    PRINT '✅ Added item_type column to categories table';
    PRINT '   - Values: Dispensable, Indispensable';
    PRINT '   - Default: Dispensable';
END
ELSE
BEGIN
    PRINT '⚠️ Column item_type already exists in categories table';
END
GO

-- Update any existing categories to have default value
UPDATE categories
SET item_type = 'Dispensable'
WHERE item_type IS NULL;
GO

-- Verify the change
SELECT 
    id,
    category_name,
    item_type,
    description,
    created_at
FROM categories
ORDER BY category_name;
GO

PRINT '';
PRINT '📊 Current categories with item_type:';
PRINT '   Run the SELECT query above to view all categories';
GO
