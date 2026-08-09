-- ====================================================================
-- 🚀 FINAL CORRECTED SAMPLE DATA - Using Database Diagram Structure
-- ====================================================================

USE InvMISDB;
GO

PRINT 'Starting Final Corrected Sample Data...';

-- Get reference data
DECLARE @UserID NVARCHAR(450);
SELECT TOP 1 @UserID = Id FROM AspNetUsers WHERE LockoutEnabled = 0;

DECLARE @Dept1 INT = (SELECT TOP 1 intAutoID FROM DEC_MST WHERE IS_ACT = 1);

PRINT 'Using User: ' + @UserID + ', Department: ' + CAST(@Dept1 AS VARCHAR);

-- ====================================================================
-- CLEAN DATA FIRST
-- ====================================================================
DELETE FROM StockTransactions;
DELETE FROM DeliveryItems;  
DELETE FROM Deliveries;
DELETE FROM AwardItems;
DELETE FROM TenderAwards;
DELETE FROM ApprovalWorkflow;
DELETE FROM RequestItems;
DELETE FROM ProcurementRequests;
DELETE FROM CurrentStock;
DELETE FROM ItemMaster;
DELETE FROM sub_categories;
DELETE FROM categories;

-- ====================================================================
-- 1. CATEGORIES (id = uniqueidentifier, status column)
-- ====================================================================
INSERT INTO categories (id, category_name, description, status, created_at) VALUES 
(NEWID(), 'Office Supplies', 'General office supplies', 'Active', GETDATE()),
(NEWID(), 'Computer Equipment', 'IT equipment', 'Active', GETDATE()),
(NEWID(), 'Furniture', 'Office furniture', 'Active', GETDATE());

PRINT '✓ Categories inserted';

-- ====================================================================
-- 2. SUBCATEGORIES (id and category_id = uniqueidentifier)
-- ====================================================================
DECLARE @OfficeCat UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Office Supplies');
DECLARE @ITCat UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Computer Equipment');

INSERT INTO sub_categories (id, category_id, sub_category_name, description, status, created_at) VALUES 
(NEWID(), @OfficeCat, 'Stationery', 'Pens, papers, files', 'Active', GETDATE()),
(NEWID(), @OfficeCat, 'Printing Supplies', 'Toner, ink cartridges', 'Active', GETDATE()),
(NEWID(), @ITCat, 'Laptops', 'Laptop computers', 'Active', GETDATE());

PRINT '✓ Subcategories inserted';

-- ====================================================================
-- 3. ITEMS (category_id = int, sub_category_id = uniqueidentifier)
-- ====================================================================
DECLARE @StationerySub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Stationery');
DECLARE @PrintingSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Printing Supplies');
DECLARE @LaptopsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Laptops');

INSERT INTO ItemMaster (item_code, item_name, category_id, sub_category_id, specifications, unit_of_measure, is_active, created_at) VALUES 
('OFF-001', 'A4 Ring Binder', 1, @StationerySub, '2-inch capacity', 'Piece', 1, GETDATE()),
('OFF-002', 'Ballpoint Pen', 1, @StationerySub, 'Blue ink', 'Piece', 1, GETDATE()),
('PRT-001', 'HP Toner', 1, @PrintingSub, 'Black toner', 'Piece', 1, GETDATE()),
('LAP-001', 'Dell Laptop', 2, @LaptopsSub, 'i5, 8GB RAM', 'Piece', 1, GETDATE());

PRINT '✓ Items inserted';

-- ====================================================================
-- 4. STOCK (minimum_level, maximum_level columns)
-- ====================================================================
DECLARE @Item1 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OFF-001');
DECLARE @Item2 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OFF-002');
DECLARE @Item3 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'PRT-001');
DECLARE @Item4 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'LAP-001');

INSERT INTO CurrentStock (item_id, current_quantity, minimum_level, maximum_level, last_updated, updated_by) VALUES 
(@Item1, 18, 20, 100, GETDATE(), @UserID),
(@Item2, 250, 50, 500, GETDATE(), @UserID),
(@Item3, 5, 3, 20, GETDATE(), @UserID),
(@Item4, 12, 5, 25, GETDATE(), @UserID);

PRINT '✓ Stock inserted';

-- ====================================================================
-- 5. PROCUREMENT REQUEST
-- ====================================================================
INSERT INTO ProcurementRequests (request_code, request_title, description, justification, priority, status, requested_by, dec_id, required_date, created_at) VALUES 
('PR-2025-001', 'Office Supplies', 'Urgent supplies needed', 'Ring binders low', 'High', 'Pending', @UserID, @Dept1, '2025-10-15', GETDATE());

PRINT '✓ Procurement request inserted';

-- ====================================================================
-- 6. REQUEST ITEMS (no unit_price, total_price, status columns)
-- ====================================================================
DECLARE @ReqID INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-001');

INSERT INTO RequestItems (request_id, item_id, quantity_requested, specifications, justification) VALUES 
(@ReqID, @Item1, 50, 'A4 ring binders', 'Below minimum stock'),
(@ReqID, @Item2, 100, 'Blue pens', 'Regular use');

PRINT '✓ Request items inserted';

-- ====================================================================
-- 7. STOCK TRANSACTIONS (quantity_change, quantity_before, quantity_after)
-- ====================================================================
INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_type, reason, transaction_date, created_by) VALUES 
(@Item1, 'Stock In', 30, 0, 30, 'Initial', 'Initial stock', DATEADD(day, -5, GETDATE()), @UserID),
(@Item2, 'Stock In', 300, 0, 300, 'Purchase', 'Bulk purchase', DATEADD(day, -5, GETDATE()), @UserID),
(@Item1, 'Issue', -12, 30, 18, 'Issue', 'Departmental issue', DATEADD(day, -2, GETDATE()), @UserID);

PRINT '✓ Stock transactions inserted';

PRINT '';
PRINT '🎉 SUCCESS! Sample data inserted using correct database structure!';
PRINT '📊 Ready for API testing and dashboard!';
