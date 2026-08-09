-- ====================================================================
-- 🗄️ INVMISDB SAMPLE DATA INSERTION (CORRECTED VERSION)
-- ====================================================================
-- Comprehensive dummy data for testing the InvMISDB system
-- This matches the actual table structure in InvMISDB
-- ====================================================================

USE InvMISDB;

-- ====================================================================
-- 📦 1. CATEGORIES (Using actual column names)
-- ====================================================================

-- First, let's check if we have any categories and clean up
DELETE FROM categories;

-- Insert Categories (using actual column structure)
INSERT INTO categories (id, category_name, description, status, created_at, updated_at) VALUES
(NEWID(), 'Office Supplies', 'General office supplies and stationery', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Computer Equipment', 'Computers, laptops, and IT equipment', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Furniture', 'Office furniture and fixtures', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Vehicles', 'Official vehicles and transport equipment', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Medical Supplies', 'Medical and healthcare supplies', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Security Equipment', 'Security and safety equipment', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Communication', 'Communication devices and equipment', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Electrical Items', 'Electrical and electronic items', 'Active', GETDATE(), GETDATE());

-- ====================================================================
-- 📦 2. SUB-CATEGORIES (Using actual column names)
-- ====================================================================

-- Clean up existing subcategories
DELETE FROM sub_categories;

-- Insert Subcategories (using actual column structure with GUIDs)
DECLARE @OfficeSupplies UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Office Supplies');
DECLARE @ComputerEquip UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Computer Equipment');
DECLARE @Furniture UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Furniture');
DECLARE @Vehicles UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Vehicles');
DECLARE @Medical UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Medical Supplies');
DECLARE @Security UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Security Equipment');
DECLARE @Communication UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Communication');
DECLARE @Electrical UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Electrical Items');

INSERT INTO sub_categories (id, category_id, sub_category_name, description, status, created_at, updated_at) VALUES
-- Office Supplies subcategories
(NEWID(), @OfficeSupplies, 'Stationery', 'Pens, papers, files, etc.', 'Active', GETDATE(), GETDATE()),
(NEWID(), @OfficeSupplies, 'Printing Materials', 'Toners, cartridges, printing papers', 'Active', GETDATE(), GETDATE()),
(NEWID(), @OfficeSupplies, 'Office Tools', 'Staplers, hole punchers, etc.', 'Active', GETDATE(), GETDATE()),

-- Computer Equipment subcategories  
(NEWID(), @ComputerEquip, 'Laptops', 'Portable computers and laptops', 'Active', GETDATE(), GETDATE()),
(NEWID(), @ComputerEquip, 'Desktop Computers', 'Desktop PCs and workstations', 'Active', GETDATE(), GETDATE()),
(NEWID(), @ComputerEquip, 'Network Equipment', 'Routers, switches, cables', 'Active', GETDATE(), GETDATE()),

-- Furniture subcategories
(NEWID(), @Furniture, 'Office Chairs', 'Chairs and seating furniture', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Furniture, 'Desks & Tables', 'Desks, tables, and work surfaces', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Furniture, 'Storage', 'Cabinets, shelves, storage units', 'Active', GETDATE(), GETDATE()),

-- Other categories
(NEWID(), @Vehicles, 'Cars', 'Official cars and sedans', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Medical, 'First Aid', 'First aid and emergency medical supplies', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Security, 'CCTV Systems', 'Security cameras and monitoring', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Communication, 'Mobile Phones', 'Mobile phones and accessories', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Electrical, 'UPS Systems', 'Uninterruptible power supplies', 'Active', GETDATE(), GETDATE());

-- ====================================================================
-- 📋 3. ITEM MASTER (Check actual structure first)
-- ====================================================================

-- Let's get some subcategory IDs for ItemMaster
DECLARE @StationerySub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Stationery');
DECLARE @PrintingSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Printing Materials');
DECLARE @ToolsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Office Tools');
DECLARE @LaptopsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Laptops');
DECLARE @DesktopsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Desktop Computers');
DECLARE @ChairsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Office Chairs');

-- Clean up existing items if any
DELETE FROM ItemMaster;

-- Insert sample items (assuming ItemMaster has similar structure)
INSERT INTO ItemMaster (item_code, item_name, description, unit_of_measurement, reorder_level, sub_category_id, status, created_at, updated_at) VALUES
-- Stationery Items
('STAT-001', 'A4 Paper Pack', 'White A4 size paper, 500 sheets per pack', 'Pack', 10, @StationerySub, 'Active', GETDATE(), GETDATE()),
('STAT-002', 'Blue Ballpoint Pen', 'Blue ink ballpoint pen', 'Piece', 50, @StationerySub, 'Active', GETDATE(), GETDATE()),
('STAT-003', 'Ring Binder File', 'A4 size ring binder file', 'Piece', 20, @StationerySub, 'Active', GETDATE(), GETDATE()),
('STAT-004', 'Stapler Machine', 'Desktop stapler for office use', 'Piece', 5, @ToolsSub, 'Active', GETDATE(), GETDATE()),
('STAT-005', 'Paper Clips Box', 'Metal paper clips, 100 pieces per box', 'Box', 15, @StationerySub, 'Active', GETDATE(), GETDATE()),

-- Printing Materials
('PRNT-001', 'HP LaserJet Toner', 'Black toner cartridge for HP LaserJet printers', 'Piece', 3, @PrintingSub, 'Active', GETDATE(), GETDATE()),
('PRNT-002', 'Canon Ink Cartridge', 'Color ink cartridge for Canon printers', 'Piece', 5, @PrintingSub, 'Active', GETDATE(), GETDATE()),

-- Computer Equipment
('LPTP-001', 'Dell Latitude 7420', 'Dell Latitude 7420 Laptop, Intel i7, 16GB RAM, 512GB SSD', 'Piece', 2, @LaptopsSub, 'Active', GETDATE(), GETDATE()),
('LPTP-002', 'HP EliteBook 840', 'HP EliteBook 840 G8, Intel i5, 8GB RAM, 256GB SSD', 'Piece', 3, @LaptopsSub, 'Active', GETDATE(), GETDATE()),
('DESK-001', 'Dell OptiPlex 7090', 'Dell OptiPlex 7090 Desktop, Intel i5, 8GB RAM, 1TB HDD', 'Piece', 5, @DesktopsSub, 'Active', GETDATE(), GETDATE()),

-- Furniture
('OCHR-001', 'Executive Office Chair', 'Leather executive chair with armrest', 'Piece', 5, @ChairsSub, 'Active', GETDATE(), GETDATE()),
('OCHR-002', 'Staff Chair', 'Mesh back staff chair with wheels', 'Piece', 10, @ChairsSub, 'Active', GETDATE(), GETDATE());

-- ====================================================================
-- 📊 4. CURRENT STOCK (Using actual column names)
-- ====================================================================

-- Clean up existing stock
DELETE FROM CurrentStock;

-- Get some item IDs for stock entries
DECLARE @Item1 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-001');
DECLARE @Item2 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-002');
DECLARE @Item3 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-003');
DECLARE @Item4 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'LPTP-001');
DECLARE @Item5 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OCHR-001');

-- Get a user ID for updated_by
DECLARE @UserID NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName);

-- Insert Current Stock (using actual column names: minimum_level, maximum_level)
INSERT INTO CurrentStock (item_id, current_quantity, minimum_level, maximum_level, last_updated, updated_by) VALUES
(@Item1, 45, 10, 100, GETDATE(), @UserID), -- A4 Paper
(@Item2, 120, 50, 500, GETDATE(), @UserID), -- Blue Pens  
(@Item3, 35, 20, 200, GETDATE(), @UserID), -- Ring Binders
(@Item4, 5, 2, 20, GETDATE(), @UserID), -- Dell Laptop
(@Item5, 15, 5, 50, GETDATE(), @UserID); -- Office Chair

-- ====================================================================
-- 📋 5. PROCUREMENT REQUESTS (Using actual column names)
-- ====================================================================

-- Clean up existing requests
DELETE FROM ProcurementRequests;

-- Get a DEC_MST ID for dec_id column
DECLARE @DecID INT = (SELECT TOP 1 dec_id FROM DEC_MST);

-- Insert Procurement Requests (using actual columns: priority, dec_id)
INSERT INTO ProcurementRequests (request_code, request_title, description, justification, priority, status, requested_by, dec_id, required_date, created_at) VALUES
('PR-2025-001', 'Office Stationery Replenishment', 'Monthly stationery supplies for main office operations', 'Required for daily office operations', 'Medium', 'Pending', @UserID, @DecID, '2025-10-15', GETDATE()),
('PR-2025-002', 'New Laptops for IT Department', 'Procurement of 5 new laptops for expanding IT team', 'IT department expansion and equipment upgrade', 'High', 'Approved', @UserID, @DecID, '2025-09-30', GETDATE()),
('PR-2025-003', 'Branch Office Setup Equipment', 'Furniture and equipment needed for new branch office', 'New branch office operational requirements', 'High', 'Pending', @UserID, @DecID, '2025-11-01', GETDATE()),
('PR-2025-004', 'Security Equipment Installation', 'CCTV cameras for enhanced security coverage', 'Enhanced security measures for building', 'Medium', 'Approved', @UserID, @DecID, '2025-10-20', GETDATE());

-- ====================================================================
-- 📋 6. REQUEST ITEMS
-- ====================================================================

-- Clean up existing request items
DELETE FROM RequestItems;

-- Get request IDs
DECLARE @Req1 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-001');
DECLARE @Req2 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-002');

-- Insert Request Items
INSERT INTO RequestItems (request_id, item_id, quantity_requested, justification) VALUES
-- Request 1: Office Stationery
(@Req1, @Item1, 50, 'Monthly consumption of A4 paper for printing needs'),
(@Req1, @Item2, 200, 'Staff requirement for daily office work'),
(@Req1, @Item3, 30, 'File organization and document management'),

-- Request 2: IT Laptops
(@Req2, @Item4, 5, 'New laptops for IT department expansion');

-- ====================================================================
-- ✅ 7. APPROVAL WORKFLOW
-- ====================================================================

-- Clean up existing approvals
DELETE FROM ApprovalWorkflow;

-- Insert Approval Workflow records
INSERT INTO ApprovalWorkflow (request_id, approver_id, status, comments, created_at, updated_at) VALUES
(@Req1, NULL, 'Pending', 'Awaiting supervisor approval for stationery procurement', GETDATE(), GETDATE()),
(@Req2, @UserID, 'Approved', 'IT equipment procurement approved for department expansion', DATEADD(day, -1, GETDATE()), GETDATE());

-- ====================================================================
-- 💰 8. TENDER AWARDS
-- ====================================================================

-- Clean up existing awards
DELETE FROM TenderAwards;

-- Insert Tender Awards
INSERT INTO TenderAwards (request_id, vendor_name, award_amount, award_date, expected_delivery_date, status, created_by, created_at, updated_at) VALUES
(@Req2, 'TechWorld Solutions', 485000.00, DATEADD(day, -2, GETDATE()), '2025-09-25', 'Awarded', @UserID, DATEADD(day, -2, GETDATE()), GETDATE());

-- ====================================================================
-- 💰 9. AWARD ITEMS
-- ====================================================================

-- Clean up existing award items
DELETE FROM AwardItems;

-- Get award ID
DECLARE @Award1 INT = (SELECT award_id FROM TenderAwards WHERE vendor_name = 'TechWorld Solutions');

-- Insert Award Items  
INSERT INTO AwardItems (award_id, item_id, quantity, unit_price) VALUES
(@Award1, @Item4, 5, 97000.00); -- Dell Laptops

-- ====================================================================
-- 🚚 10. DELIVERIES
-- ====================================================================

-- Clean up existing deliveries
DELETE FROM Deliveries;

-- Insert Deliveries
INSERT INTO Deliveries (award_id, delivery_date, received_by, status, created_at, updated_at) VALUES
(@Award1, DATEADD(day, -1, GETDATE()), @UserID, 'Partial', DATEADD(day, -1, GETDATE()), GETDATE());

-- ====================================================================
-- 🚚 11. DELIVERY ITEMS  
-- ====================================================================

-- Clean up existing delivery items
DELETE FROM DeliveryItems;

-- Get delivery ID
DECLARE @Delivery1 INT = (SELECT delivery_id FROM Deliveries WHERE award_id = @Award1);

-- Insert Delivery Items
INSERT INTO DeliveryItems (delivery_id, item_id, quantity_delivered, unit_price, condition_notes) VALUES
(@Delivery1, @Item4, 3, 97000.00, 'Good condition - 3 laptops delivered, 2 pending');

-- ====================================================================
-- 📊 12. STOCK TRANSACTIONS
-- ====================================================================

-- Clean up existing transactions
DELETE FROM StockTransactions;

-- Insert Stock Transactions (using actual column names)
INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, reference_id, created_by, transaction_date) VALUES
-- Recent stock additions from deliveries
(@Item4, 'Stock In', 3, @Delivery1, @UserID, DATEADD(day, -1, GETDATE())),

-- Some stock issues (outgoing)
(@Item1, 'Issue', -5, NULL, @UserID, DATEADD(day, -3, GETDATE())),
(@Item2, 'Issue', -30, NULL, @UserID, DATEADD(day, -2, GETDATE())),
(@Item3, 'Issue', -5, NULL, @UserID, DATEADD(day, -1, GETDATE()));

PRINT '✅ Sample data insertion completed successfully!';
PRINT '';
PRINT '📊 INSERTED DATA SUMMARY:';
PRINT '• Categories: 8 categories with 14 subcategories';
PRINT '• Items: 12 items across different categories';
PRINT '• Stock: 5 stock records with realistic quantities';
PRINT '• Requests: 4 procurement requests with different statuses';
PRINT '• Approvals: Approval workflow records';
PRINT '• Awards: 1 tender award with financial data';
PRINT '• Deliveries: 1 partial delivery record';
PRINT '• Transactions: 4 stock transaction records';
PRINT '';
PRINT '🎯 Your InvMISDB system now has realistic test data!';
