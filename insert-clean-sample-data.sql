-- ====================================================================
-- 🚀 CLEAN SAMPLE DATA FOR InvMISDB - Using Existing Reference Data
-- ====================================================================
-- This script inserts realistic sample data while preserving existing
-- reference data (AspNetUsers, DEC_MST, tblOffices, WingsInformation)
-- ====================================================================

USE InvMISDB;
GO

PRINT 'Starting Clean Sample Data Insertion for InvMISDB...';

-- ====================================================================
-- 🎯 1. GET EXISTING REFERENCE DATA
-- ====================================================================

-- Get a valid user ID from AspNetUsers
DECLARE @UserID NVARCHAR(450);
SELECT TOP 1 @UserID = Id FROM AspNetUsers WHERE LockoutEnabled = 0;
PRINT 'Using User ID: ' + ISNULL(@UserID, 'NULL');

-- Get valid department IDs  
DECLARE @AdminDept INT = (SELECT TOP 1 intAutoID FROM DEC_MST WHERE DECName LIKE '%Admin%' AND IS_ACT = 1);
DECLARE @AccountsDept INT = (SELECT TOP 1 intAutoID FROM DEC_MST WHERE DECName LIKE '%Account%' AND IS_ACT = 1);
DECLARE @FallbackDept INT = (SELECT TOP 1 intAutoID FROM DEC_MST WHERE IS_ACT = 1);

-- Use valid department IDs or fallback
DECLARE @Dept1 INT = ISNULL(@AdminDept, @FallbackDept);
DECLARE @Dept2 INT = ISNULL(@AccountsDept, @FallbackDept);

PRINT 'Using Department 1 ID: ' + CAST(@Dept1 AS VARCHAR);
PRINT 'Using Department 2 ID: ' + CAST(@Dept2 AS VARCHAR);

-- ====================================================================
-- 🏷️ 2. CLEAN INSERT CATEGORIES (Basic Structure)
-- ====================================================================

-- Clear related data in proper order
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

-- Insert basic categories
INSERT INTO categories (category_name, description, is_active) VALUES 
('Office Supplies', 'General office supplies and stationery', 1),
('Computer Equipment', 'IT equipment and accessories', 1),
('Furniture', 'Office furniture and fixtures', 1);

PRINT '✓ 3 Categories inserted';

-- ====================================================================
-- 🏷️ 3. INSERT SUBCATEGORIES  
-- ====================================================================

DECLARE @OfficeCat INT = (SELECT category_id FROM categories WHERE category_name = 'Office Supplies');
DECLARE @ITCat INT = (SELECT category_id FROM categories WHERE category_name = 'Computer Equipment');
DECLARE @FurnitureCat INT = (SELECT category_id FROM categories WHERE category_name = 'Furniture');

INSERT INTO sub_categories (subcategory_name, category_id, description, is_active) VALUES 
('Stationery', @OfficeCat, 'Pens, papers, files etc.', 1),
('Printing Supplies', @OfficeCat, 'Toner, ink cartridges, paper', 1),
('Laptops', @ITCat, 'Laptop computers', 1),
('Desktops', @ITCat, 'Desktop computers and accessories', 1),
('Office Furniture', @FurnitureCat, 'Desks, chairs, cabinets', 1);

PRINT '✓ 5 Subcategories inserted';

-- ====================================================================
-- 📦 4. INSERT SAMPLE ITEMS
-- ====================================================================

DECLARE @StationerySub INT = (SELECT subcategory_id FROM sub_categories WHERE subcategory_name = 'Stationery');
DECLARE @PrintingSub INT = (SELECT subcategory_id FROM sub_categories WHERE subcategory_name = 'Printing Supplies');
DECLARE @LaptopsSub INT = (SELECT subcategory_id FROM sub_categories WHERE subcategory_name = 'Laptops');

INSERT INTO ItemMaster (item_code, item_name, description, sub_category_id, unit_of_measure, unit_price, specifications, is_active, created_by, created_at) VALUES 
('OFF-001', 'A4 Ring Binder', 'Standard A4 size ring binder', @StationerySub, 'Piece', 150.00, '2-inch capacity, plastic cover', 1, @UserID, GETDATE()),
('OFF-002', 'Ballpoint Pen - Blue', 'Standard blue ballpoint pen', @StationerySub, 'Piece', 25.00, 'Medium tip, blue ink', 1, @UserID, GETDATE()),
('PRT-001', 'HP Toner Cartridge', 'HP LaserJet toner cartridge', @PrintingSub, 'Piece', 8500.00, 'Model: CF217A, Black, 1600 pages', 1, @UserID, GETDATE()),
('LAP-001', 'Dell Laptop', 'Dell business laptop', @LaptopsSub, 'Piece', 95000.00, 'i5 processor, 8GB RAM, 256GB SSD', 1, @UserID, GETDATE());

PRINT '✓ 4 Items inserted';

-- ====================================================================
-- 📊 5. INSERT CURRENT STOCK
-- ====================================================================

DECLARE @Item1 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OFF-001');
DECLARE @Item2 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OFF-002');
DECLARE @Item3 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'PRT-001');
DECLARE @Item4 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'LAP-001');

INSERT INTO CurrentStock (item_id, current_quantity, minimum_stock_level, maximum_stock_level, last_updated, updated_by) VALUES 
(@Item1, 18, 20, 100, GETDATE(), @UserID),
(@Item2, 250, 50, 500, GETDATE(), @UserID),
(@Item3, 5, 3, 20, GETDATE(), @UserID),
(@Item4, 12, 5, 25, GETDATE(), @UserID);

PRINT '✓ 4 Stock records inserted';

-- ====================================================================
-- 📋 6. INSERT PROCUREMENT REQUEST
-- ====================================================================

INSERT INTO ProcurementRequests (request_code, request_title, description, justification, priority, status, requested_by, dec_id, required_date, created_at) VALUES 
('PR-2025-001', 'Office Supplies Replenishment', 'Urgent office supplies needed', 'Ring binders below minimum stock', 'High', 'Pending', @UserID, @Dept1, '2025-10-15', GETDATE());

PRINT '✓ 1 Procurement request inserted';

-- ====================================================================
-- 📦 7. INSERT REQUEST ITEMS
-- ====================================================================

DECLARE @ReqID INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-001');

INSERT INTO RequestItems (request_id, item_id, quantity_requested, unit_price, total_price, justification, status) VALUES 
(@ReqID, @Item1, 50, 150.00, 7500.00, 'Below minimum stock level', 'Pending'),
(@ReqID, @Item2, 100, 25.00, 2500.00, 'Regular consumption', 'Pending');

PRINT '✓ 2 Request items inserted';

-- ====================================================================
-- 🔄 8. INSERT STOCK TRANSACTIONS  
-- ====================================================================

INSERT INTO StockTransactions (item_id, transaction_type, quantity, transaction_date, reference_number, performed_by, notes) VALUES 
(@Item1, 'Stock In', 30, DATEADD(day, -5, GETDATE()), 'SI-001', @UserID, 'Initial stock received'),
(@Item2, 'Stock In', 300, DATEADD(day, -5, GETDATE()), 'SI-002', @UserID, 'Bulk purchase'),
(@Item3, 'Stock In', 10, DATEADD(day, -3, GETDATE()), 'SI-003', @UserID, 'Toner refill'),
(@Item1, 'Issue', -12, DATEADD(day, -2, GETDATE()), 'IS-001', @UserID, 'Issued to departments');

PRINT '✓ 4 Stock transactions inserted';

-- ====================================================================
-- 🎉 SUCCESS SUMMARY
-- ====================================================================

PRINT '';
PRINT '🎉 CLEAN SAMPLE DATA INSERTED SUCCESSFULLY!';
PRINT '';
PRINT '📊 SAMPLE DATA SUMMARY:';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📁 CATALOG DATA:';
PRINT '  • Categories: 3 (Office Supplies, Computer Equipment, Furniture)';
PRINT '  • Subcategories: 5 subcategories';  
PRINT '  • Items: 4 sample items with realistic pricing';
PRINT '';
PRINT '📦 INVENTORY DATA:';
PRINT '  • Current Stock: 4 items with quantities';
PRINT '  • Low Stock Alert: Ring Binders (18/20 minimum)';
PRINT '  • Stock ready for testing';
PRINT '';
PRINT '📋 PROCUREMENT DATA:';
PRINT '  • Requests: 1 active procurement request';
PRINT '  • Request Items: 2 line items';
PRINT '  • Ready for approval workflow testing';
PRINT '';
PRINT '🔄 TRANSACTION DATA:';
PRINT '  • Stock Transactions: 4 sample transactions';
PRINT '  • Transaction Types: Stock In, Issue';
PRINT '';
PRINT '✅ USES EXISTING REFERENCE DATA:';
PRINT '  • AspNetUsers: Uses existing user IDs';
PRINT '  • DEC_MST: Uses existing department IDs';
PRINT '  • No modification to organizational tables';
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '🚀 InvMISDB is ready for API testing!';
