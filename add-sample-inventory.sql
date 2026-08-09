-- Add Sample Inventory Data to current_inventory_stock table
-- This will populate the Inventory Dashboard with realistic data

-- First, delete any existing data to avoid duplicates
DELETE FROM current_inventory_stock WHERE updated_by = 'System Admin';

-- Insert sample inventory data
INSERT INTO current_inventory_stock (
    id, item_master_id, current_quantity, available_quantity, reserved_quantity,
    minimum_stock_level, maximum_stock_level, reorder_point,
    created_at, last_updated, updated_by
) VALUES 
-- Dell Laptop - Low stock (below minimum)
(NEWID(), 15, 3, 3, 0, 5, 50, 10, GETDATE(), GETDATE(), 'System Admin'),

-- A4 Ring Binder - Normal stock  
(NEWID(), 12, 150, 140, 10, 20, 300, 50, GETDATE(), GETDATE(), 'System Admin'),

-- Ballpoint Pen - High stock
(NEWID(), 13, 750, 680, 70, 100, 1000, 200, GETDATE(), GETDATE(), 'System Admin'),

-- HP Toner - Critical low stock (out of stock)
(NEWID(), 14, 0, 0, 0, 2, 20, 5, GETDATE(), GETDATE(), 'System Admin'),

-- Test Item New - Normal stock
(NEWID(), 16, 45, 35, 10, 10, 100, 20, GETDATE(), GETDATE(), 'System Admin');

-- Verify the data
SELECT 
    im.item_name,
    cis.current_quantity,
    cis.available_quantity,
    cis.reserved_quantity,
    cis.minimum_stock_level,
    cis.maximum_stock_level,
    cis.reorder_point,
    CASE 
        WHEN cis.current_quantity = 0 THEN 'Out of Stock'
        WHEN cis.current_quantity <= cis.minimum_stock_level THEN 'Low Stock'
        WHEN cis.current_quantity > cis.maximum_stock_level THEN 'Overstock'
        ELSE 'Normal'
    END as stock_status
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
WHERE cis.updated_by = 'System Admin'
ORDER BY im.item_name;