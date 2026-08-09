-- ====================================================================
-- 🗄️ SIMPLE SAMPLE DATA FOR INVMISDB TESTING
-- ====================================================================
-- Basic sample data insertion matching actual table structure
-- ====================================================================

USE InvMISDB;

-- ====================================================================
-- 📦 1. CATEGORIES (Minimal data)
-- ====================================================================

-- Insert basic categories
INSERT INTO categories (id, category_name, description, status, created_at, updated_at) VALUES
(NEWID(), 'Office Supplies', 'General office supplies and stationery', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Computer Equipment', 'Computers and IT equipment', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Furniture', 'Office furniture', 'Active', GETDATE(), GETDATE());

-- ====================================================================
-- 📦 2. SUB-CATEGORIES
-- ====================================================================

-- Get category IDs
DECLARE @OfficeSupplies UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Office Supplies');
DECLARE @ComputerEquip UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Computer Equipment');
DECLARE @Furniture UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE category_name = 'Furniture');

-- Insert subcategories
INSERT INTO sub_categories (id, category_id, sub_category_name, description, status, created_at, updated_at) VALUES
(NEWID(), @OfficeSupplies, 'Stationery', 'Pens, papers, files', 'Active', GETDATE(), GETDATE()),
(NEWID(), @OfficeSupplies, 'Printing Materials', 'Toners, cartridges', 'Active', GETDATE(), GETDATE()),
(NEWID(), @ComputerEquip, 'Laptops', 'Portable computers', 'Active', GETDATE(), GETDATE()),
(NEWID(), @ComputerEquip, 'Desktop Computers', 'Desktop PCs', 'Active', GETDATE(), GETDATE()),
(NEWID(), @Furniture, 'Office Chairs', 'Seating furniture', 'Active', GETDATE(), GETDATE());

-- ====================================================================
-- 📋 3. ITEM MASTER (Using actual columns)
-- ====================================================================

-- Get subcategory IDs
DECLARE @StationerySub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Stationery');
DECLARE @PrintingSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Printing Materials');
DECLARE @LaptopsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Laptops');
DECLARE @ChairsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Office Chairs');

-- Insert items using actual column structure
INSERT INTO ItemMaster (item_code, item_name, category_id, specifications, unit_of_measure, is_active, sub_category_id, created_at) VALUES
('STAT-001', 'A4 Paper Pack', 1, 'White A4 paper, 500 sheets per pack', 'Pack', 1, @StationerySub, GETDATE()),
('STAT-002', 'Blue Ballpoint Pen', 1, 'Blue ink ballpoint pen', 'Piece', 1, @StationerySub, GETDATE()),
('PRNT-001', 'HP LaserJet Toner', 1, 'Black toner cartridge for HP LaserJet', 'Piece', 1, @PrintingSub, GETDATE()),
('LPTP-001', 'Dell Latitude Laptop', 2, 'Dell Latitude laptop with Intel i7, 16GB RAM', 'Piece', 1, @LaptopsSub, GETDATE()),
('OCHR-001', 'Executive Office Chair', 3, 'Leather executive chair with armrest', 'Piece', 1, @ChairsSub, GETDATE());

-- ====================================================================
-- 📊 4. CURRENT STOCK
-- ====================================================================

-- Get item IDs
DECLARE @Item1 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-001');
DECLARE @Item2 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-002');
DECLARE @Item3 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'PRNT-001');
DECLARE @Item4 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'LPTP-001');
DECLARE @Item5 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OCHR-001');

-- Get user ID
DECLARE @UserID NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName);

-- Insert current stock
INSERT INTO CurrentStock (item_id, current_quantity, minimum_level, maximum_level, last_updated, updated_by) VALUES
(@Item1, 45, 10, 100, GETDATE(), @UserID), -- A4 Paper
(@Item2, 120, 50, 500, GETDATE(), @UserID), -- Blue Pens  
(@Item3, 8, 3, 30, GETDATE(), @UserID), -- HP Toner
(@Item4, 5, 2, 20, GETDATE(), @UserID), -- Dell Laptop
(@Item5, 15, 5, 50, GETDATE(), @UserID); -- Office Chair

-- ====================================================================
-- 📋 5. PROCUREMENT REQUESTS (Simple version)
-- ====================================================================

-- Get department ID
DECLARE @DeptID INT = (SELECT TOP 1 dec_id FROM DEC_MST);

-- Insert procurement requests
INSERT INTO ProcurementRequests (request_code, request_title, description, justification, priority, status, requested_by, dec_id, required_date, created_at) VALUES
('PR-2025-001', 'Office Stationery Supplies', 'Monthly office supplies procurement', 'Required for daily operations', 'Medium', 'Pending', @UserID, @DeptID, '2025-10-15', GETDATE()),
('PR-2025-002', 'IT Equipment Purchase', 'New laptops for staff', 'IT upgrade and expansion', 'High', 'Approved', @UserID, @DeptID, '2025-09-30', GETDATE()),
('PR-2025-003', 'Office Furniture', 'Chairs and desks for new office', 'Office setup requirements', 'Medium', 'Pending', @UserID, @DeptID, '2025-11-01', GETDATE());

-- ====================================================================
-- 📋 6. REQUEST ITEMS (Simple version)
-- ====================================================================

-- Get request IDs
DECLARE @Req1 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-001');
DECLARE @Req2 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-002');
DECLARE @Req3 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-003');

-- Insert request items
INSERT INTO RequestItems (request_id, item_id, quantity_requested, justification) VALUES
(@Req1, @Item1, 50, 'Monthly paper requirement'),
(@Req1, @Item2, 200, 'Staff pen requirements'),
(@Req1, @Item3, 10, 'Printer toner replacement'),
(@Req2, @Item4, 3, 'New laptops for IT team'),
(@Req3, @Item5, 10, 'Office chairs for new setup');

-- ====================================================================
-- ✅ 7. APPROVAL WORKFLOW (Simple)
-- ====================================================================

INSERT INTO ApprovalWorkflow (request_id, approver_id, status, comments, created_at) VALUES
(@Req1, NULL, 'Pending', 'Awaiting department head approval', GETDATE()),
(@Req2, @UserID, 'Approved', 'IT procurement approved', DATEADD(day, -1, GETDATE())),
(@Req3, NULL, 'Pending', 'Under budget review', GETDATE());

-- ====================================================================
-- 💰 8. TENDER AWARDS (Simple)
-- ====================================================================

INSERT INTO TenderAwards (
    award_code, request_id, award_title, award_date, expected_delivery_date,
    vendor_name, vendor_registration, vendor_address, vendor_contact_person,
    vendor_phone, vendor_email, contract_number, contract_date,
    total_contract_amount, tax_amount, final_amount, payment_terms,
    status, created_by, created_at
) VALUES (
    'TA-2025-001', @Req2, 'IT Equipment Procurement Award', 
    DATEADD(day, -2, GETDATE()), '2025-09-25',
    'TechWorld Solutions', 'REG-12345', '123 Tech Street, Karachi',
    'Ahmed Khan', '0321-1234567', 'info@techworld.pk',
    'CONTRACT-001', DATEADD(day, -2, GETDATE()),
    450000.00, 81000.00, 531000.00, '30 days credit terms',
    'Awarded', @UserID, DATEADD(day, -2, GETDATE())
);

-- ====================================================================
-- 💰 9. AWARD ITEMS (Simple)
-- ====================================================================

DECLARE @Award1 INT = (SELECT award_id FROM TenderAwards WHERE award_code = 'TA-2025-001');

INSERT INTO AwardItems (award_id, item_id, quantity_awarded, unit_price, total_price) VALUES
(@Award1, @Item4, 3, 150000.00, 450000.00); -- Dell Laptops

-- ====================================================================
-- 🚚 10. DELIVERIES (Simple)
-- ====================================================================

INSERT INTO Deliveries (award_id, delivery_date, received_by, status, created_at) VALUES
(@Award1, DATEADD(day, -1, GETDATE()), @UserID, 'Partial', DATEADD(day, -1, GETDATE()));

-- ====================================================================
-- 📊 11. STOCK TRANSACTIONS (Simple)
-- ====================================================================

INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, reference_id, created_by, transaction_date) VALUES
(@Item4, 'Stock In', 2, NULL, @UserID, DATEADD(day, -1, GETDATE())),
(@Item1, 'Issue', -5, NULL, @UserID, DATEADD(day, -2, GETDATE())),
(@Item2, 'Issue', -20, NULL, @UserID, DATEADD(day, -1, GETDATE()));

PRINT '✅ SIMPLE SAMPLE DATA INSERTED SUCCESSFULLY!';
PRINT '';
PRINT '📊 DATA SUMMARY:';
PRINT '• Categories: 3 main categories';
PRINT '• Subcategories: 5 subcategories';  
PRINT '• Items: 5 sample items';
PRINT '• Stock: 5 stock records';
PRINT '• Requests: 3 procurement requests';
PRINT '• Awards: 1 tender award';
PRINT '• Deliveries: 1 delivery record';
PRINT '• Transactions: 3 stock transactions';
PRINT '';
PRINT '🎯 Ready for API testing with real data!';
