-- ====================================================================
-- 🗄️ BUSINESS DATA SAMPLE FOR INVMISDB TESTING
-- ====================================================================
-- Sample data for business tables only - NO reference table data
-- Skips: DEC_MST, tblOffices, WingsInformation, AspNetUsers
-- ====================================================================

USE InvMISDB;

-- ====================================================================
-- 📦 1. CATEGORIES (Business data)
-- ====================================================================

-- Clean up existing categories first
DELETE FROM categories;

-- Insert basic categories
INSERT INTO categories (id, category_name, description, status, created_at, updated_at) VALUES
(NEWID(), 'Office Supplies', 'General office supplies and stationery', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Computer Equipment', 'Computers and IT equipment', 'Active', GETDATE(), GETDATE()),
(NEWID(), 'Furniture', 'Office furniture', 'Active', GETDATE(), GETDATE());

-- ====================================================================
-- 📦 2. SUB-CATEGORIES (Business data)
-- ====================================================================

-- Clean up existing subcategories
DELETE FROM sub_categories;

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
-- 📋 3. ITEM MASTER (Business data)
-- ====================================================================

-- Clean up existing items
DELETE FROM ItemMaster;

-- Get subcategory IDs
DECLARE @StationerySub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Stationery');
DECLARE @PrintingSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Printing Materials');
DECLARE @LaptopsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Laptops');
DECLARE @DesktopsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Desktop Computers');
DECLARE @ChairsSub UNIQUEIDENTIFIER = (SELECT id FROM sub_categories WHERE sub_category_name = 'Office Chairs');

-- Insert items using actual column structure
INSERT INTO ItemMaster (item_code, item_name, category_id, specifications, unit_of_measure, is_active, sub_category_id, created_at) VALUES
('STAT-001', 'A4 Paper Pack', 1, 'White A4 paper, 500 sheets per pack', 'Pack', 1, @StationerySub, GETDATE()),
('STAT-002', 'Blue Ballpoint Pen', 1, 'Blue ink ballpoint pen', 'Piece', 1, @StationerySub, GETDATE()),
('STAT-003', 'Ring Binder File', 1, 'A4 size ring binder file', 'Piece', 1, @StationerySub, GETDATE()),
('PRNT-001', 'HP LaserJet Toner', 1, 'Black toner cartridge for HP LaserJet', 'Piece', 1, @PrintingSub, GETDATE()),
('PRNT-002', 'Canon Ink Cartridge', 1, 'Color ink cartridge for Canon printers', 'Piece', 1, @PrintingSub, GETDATE()),
('LPTP-001', 'Dell Latitude Laptop', 2, 'Dell Latitude laptop with Intel i7, 16GB RAM, 512GB SSD', 'Piece', 1, @LaptopsSub, GETDATE()),
('LPTP-002', 'HP EliteBook Laptop', 2, 'HP EliteBook with Intel i5, 8GB RAM, 256GB SSD', 'Piece', 1, @LaptopsSub, GETDATE()),
('DESK-001', 'Dell OptiPlex Desktop', 2, 'Dell OptiPlex desktop with Intel i5, 8GB RAM, 1TB HDD', 'Piece', 1, @DesktopsSub, GETDATE()),
('OCHR-001', 'Executive Office Chair', 3, 'Leather executive chair with armrest', 'Piece', 1, @ChairsSub, GETDATE()),
('OCHR-002', 'Staff Chair', 3, 'Mesh back staff chair with wheels', 'Piece', 1, @ChairsSub, GETDATE());

-- ====================================================================
-- 📊 4. CURRENT STOCK (Business data - using existing reference IDs)
-- ====================================================================

-- Clean up existing stock
DELETE FROM CurrentStock;

-- Get item IDs
DECLARE @Item1 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-001');
DECLARE @Item2 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-002');
DECLARE @Item3 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'STAT-003');
DECLARE @Item4 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'PRNT-001');
DECLARE @Item5 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'LPTP-001');
DECLARE @Item6 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'LPTP-002');
DECLARE @Item7 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OCHR-001');
DECLARE @Item8 INT = (SELECT item_id FROM ItemMaster WHERE item_code = 'OCHR-002');

-- Get existing user ID from AspNetUsers (don't insert, just use existing)
DECLARE @UserID NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName);

-- Insert current stock (realistic quantities)
INSERT INTO CurrentStock (item_id, current_quantity, minimum_level, maximum_level, last_updated, updated_by) VALUES
(@Item1, 45, 10, 100, GETDATE(), @UserID), -- A4 Paper - Good stock
(@Item2, 120, 50, 500, GETDATE(), @UserID), -- Blue Pens - Good stock
(@Item3, 18, 20, 200, GETDATE(), @UserID), -- Ring Binders - LOW STOCK ALERT!
(@Item4, 5, 3, 30, GETDATE(), @UserID), -- HP Toner - Normal
(@Item5, 3, 2, 20, GETDATE(), @UserID), -- Dell Laptop - Normal  
(@Item6, 2, 2, 15, GETDATE(), @UserID), -- HP Laptop - At minimum
(@Item7, 8, 5, 50, GETDATE(), @UserID), -- Executive Chair - Normal
(@Item8, 25, 10, 100, GETDATE(), @UserID); -- Staff Chair - Good stock

-- ====================================================================
-- 📋 5. PROCUREMENT REQUESTS (Business data - using existing dept ID)
-- ====================================================================

-- Clean up existing requests
DELETE FROM ProcurementRequests;

-- Get existing department IDs from DEC_MST table
DECLARE @AdminDept INT = (SELECT intAutoID FROM DEC_MST WHERE DECName LIKE '%Admin%' AND IS_ACT = 1);
DECLARE @AccountsDept INT = (SELECT intAutoID FROM DEC_MST WHERE DECName LIKE '%Accounts%' AND IS_ACT = 1);
DECLARE @ITDept INT = (SELECT TOP 1 intAutoID FROM DEC_MST WHERE IS_ACT = 1 ORDER BY intAutoID); -- Fallback to first active dept

-- Use actual department IDs if available, otherwise use fallback
DECLARE @Dept1 INT = ISNULL(@AdminDept, @ITDept);
DECLARE @Dept2 INT = ISNULL(@AccountsDept, @ITDept);

-- Insert procurement requests using real department IDs
INSERT INTO ProcurementRequests (request_code, request_title, description, justification, priority, status, requested_by, dec_id, required_date, created_at) VALUES
('PR-2025-001', 'Office Stationery Replenishment', 'Monthly office supplies for operations', 'Ring binders running low, need replenishment', 'Medium', 'Pending', @UserID, @Dept1, '2025-10-15', GETDATE()),
('PR-2025-002', 'IT Equipment Upgrade', 'New laptops for development team', 'Current laptops are 3+ years old, need upgrade for performance', 'High', 'Approved', @UserID, @Dept1, '2025-09-30', GETDATE()),
('PR-2025-003', 'Office Expansion Furniture', 'Chairs and furniture for new hires', 'Expanding team by 15 people, need additional seating', 'Medium', 'Pending', @UserID, @Dept2, '2025-11-01', GETDATE()),
('PR-2025-004', 'Printer Supplies Emergency', 'Urgent toner and ink cartridge procurement', 'Multiple printers running out of supplies', 'High', 'Approved', @UserID, @Dept2, '2025-09-20', GETDATE());

-- ====================================================================
-- 📋 6. REQUEST ITEMS (Business data)
-- ====================================================================

-- Clean up existing request items
DELETE FROM RequestItems;

-- Get request IDs
DECLARE @Req1 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-001');
DECLARE @Req2 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-002');
DECLARE @Req3 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-003');
DECLARE @Req4 INT = (SELECT request_id FROM ProcurementRequests WHERE request_code = 'PR-2025-004');

-- Insert request items with realistic quantities
INSERT INTO RequestItems (request_id, item_id, quantity_requested, justification) VALUES
-- Request 1: Office Stationery Replenishment
(@Req1, @Item1, 25, 'Monthly consumption - 50 packs needed for 2 months'),
(@Req1, @Item2, 100, 'High usage item - 200 pens for office staff'),
(@Req1, @Item3, 40, 'URGENT: Currently at 18, minimum is 20 - need immediate restocking'),

-- Request 2: IT Equipment Upgrade
(@Req2, @Item5, 4, 'Dell laptops for senior developers - high performance needed'),
(@Req2, @Item6, 3, 'HP laptops for junior developers and support staff'),

-- Request 3: Office Expansion Furniture
(@Req3, @Item7, 3, 'Executive chairs for management positions'),
(@Req3, @Item8, 15, 'Staff chairs for new team members'),

-- Request 4: Printer Supplies Emergency  
(@Req4, @Item4, 12, 'HP toners for 4 printers - 3 months supply each');

-- ====================================================================
-- ✅ 7. APPROVAL WORKFLOW (Business data)
-- ====================================================================

-- Clean up existing approvals
DELETE FROM ApprovalWorkflow;

-- Insert approval workflow records
INSERT INTO ApprovalWorkflow (request_id, approver_id, status, comments, created_at) VALUES
(@Req1, NULL, 'Pending', 'Awaiting department head approval for stationery procurement', GETDATE()),
(@Req2, @UserID, 'Approved', 'IT equipment upgrade approved - critical for development team productivity', DATEADD(day, -1, GETDATE())),
(@Req3, NULL, 'Pending', 'Under budget review - expansion furniture needs cost analysis', GETDATE()),
(@Req4, @UserID, 'Approved', 'Emergency printer supplies approved - operational necessity', DATEADD(day, -1, GETDATE()));

-- ====================================================================
-- 💰 8. TENDER AWARDS (Business data)
-- ====================================================================

-- Clean up existing awards  
DELETE FROM TenderAwards;

-- Insert tender awards for approved requests
INSERT INTO TenderAwards (
    award_code, request_id, award_title, award_date, expected_delivery_date,
    vendor_name, vendor_registration, vendor_address, vendor_contact_person,
    vendor_phone, vendor_email, contract_number, contract_date,
    total_contract_amount, tax_amount, final_amount, payment_terms,
    status, created_by, created_at
) VALUES 
-- Award for IT Equipment (Request 2)
(
    'TA-2025-001', @Req2, 'IT Equipment Purchase - Development Team Upgrade', 
    DATEADD(day, -2, GETDATE()), '2025-09-25',
    'TechWorld Solutions Pvt Ltd', 'REG-TW-12345', 'Plot 123, IT Tower, Gulshan-e-Iqbal, Karachi',
    'Ahmed Hassan Khan', '0321-1234567', 'ahmed.khan@techworld.pk',
    'CONTRACT-TW-001', DATEADD(day, -2, GETDATE()),
    580000.00, 104400.00, 684400.00, '30 days credit after delivery',
    'Awarded', @UserID, DATEADD(day, -2, GETDATE())
),
-- Award for Printer Supplies (Request 4)
(
    'TA-2025-002', @Req4, 'Emergency Printer Supplies Procurement', 
    DATEADD(day, -1, GETDATE()), '2025-09-18',
    'Office Depot Pakistan', 'REG-OD-67890', 'Main Boulevard, DHA Phase 5, Laharge',
    'Fatima Ali Sheikh', '0300-9876543', 'fatima.sheikh@officedepot.pk',
    'CONTRACT-OD-002', DATEADD(day, -1, GETDATE()),
    36000.00, 6480.00, 42480.00, 'Cash on delivery',
    'Awarded', @UserID, DATEADD(day, -1, GETDATE())
);

-- ====================================================================
-- 💰 9. AWARD ITEMS (Business data)
-- ====================================================================

-- Clean up existing award items
DELETE FROM AwardItems;

-- Get award IDs
DECLARE @Award1 INT = (SELECT award_id FROM TenderAwards WHERE award_code = 'TA-2025-001');
DECLARE @Award2 INT = (SELECT award_id FROM TenderAwards WHERE award_code = 'TA-2025-002');

-- Insert award items with realistic pricing
INSERT INTO AwardItems (award_id, item_id, quantity_awarded, unit_price, total_price) VALUES
-- Award 1: IT Equipment
(@Award1, @Item5, 4, 120000.00, 480000.00), -- Dell Laptops @ 120k each
(@Award1, @Item6, 3, 100000.00, 300000.00), -- HP Laptops @ 100k each
-- Note: Total should match contract amount (580000)

-- Award 2: Printer Supplies  
(@Award2, @Item4, 12, 3000.00, 36000.00); -- HP Toners @ 3k each

-- ====================================================================
-- 🚚 10. DELIVERIES (Business data)
-- ====================================================================

-- Clean up existing deliveries
DELETE FROM Deliveries;

-- Insert deliveries (some partial, some complete)
INSERT INTO Deliveries (award_id, delivery_date, received_by, status, created_at) VALUES
(@Award1, DATEADD(day, -1, GETDATE()), @UserID, 'Partial', DATEADD(day, -1, GETDATE())), -- IT equipment - partial delivery
(@Award2, GETDATE(), @UserID, 'Complete', GETDATE()); -- Printer supplies - complete delivery

-- ====================================================================
-- 🚚 11. DELIVERY ITEMS (Business data)
-- ====================================================================

-- Clean up existing delivery items
DELETE FROM DeliveryItems;

-- Get delivery IDs  
DECLARE @Delivery1 INT = (SELECT delivery_id FROM Deliveries WHERE award_id = @Award1);
DECLARE @Delivery2 INT = (SELECT delivery_id FROM Deliveries WHERE award_id = @Award2);

-- Get award item IDs for delivery items
DECLARE @AwardItem1 INT = (SELECT award_item_id FROM AwardItems WHERE award_id = @Award1 AND item_id = @Item5);
DECLARE @AwardItem2 INT = (SELECT award_item_id FROM AwardItems WHERE award_id = @Award1 AND item_id = @Item6);
DECLARE @AwardItem3 INT = (SELECT award_item_id FROM AwardItems WHERE award_id = @Award2 AND item_id = @Item4);

-- Insert delivery items
INSERT INTO DeliveryItems (delivery_id, award_item_id, quantity_delivered, quantity_accepted, quantity_rejected, rejection_reason, serial_numbers) VALUES
-- Delivery 1: IT Equipment (Partial)
(@Delivery1, @AwardItem1, 2, 2, 0, NULL, 'DL001234, DL001235'), -- 2 Dell laptops delivered out of 4
(@Delivery1, @AwardItem2, 0, 0, 0, NULL, NULL), -- HP laptops not yet delivered

-- Delivery 2: Printer Supplies (Complete)
(@Delivery2, @AwardItem3, 12, 12, 0, NULL, 'TONER001-TONER012'); -- All 12 toners delivered

-- ====================================================================
-- 📊 12. STOCK TRANSACTIONS (Business data - recent activity)
-- ====================================================================

-- Clean up existing transactions
DELETE FROM StockTransactions;

-- Insert stock transactions (recent activity)
INSERT INTO StockTransactions (item_id, transaction_type, quantity_change, reference_id, created_by, transaction_date) VALUES
-- Stock additions from deliveries
(@Item5, 'Stock In', 2, @Delivery1, @UserID, DATEADD(day, -1, GETDATE())), -- Dell laptops received
(@Item4, 'Stock In', 12, @Delivery2, @UserID, GETDATE()), -- Toners received

-- Regular stock issues (daily operations)
(@Item1, 'Issue', -5, NULL, @UserID, DATEADD(day, -3, GETDATE())), -- A4 paper issued
(@Item2, 'Issue', -30, NULL, @UserID, DATEADD(day, -2, GETDATE())), -- Pens issued to staff
(@Item3, 'Issue', -2, NULL, @UserID, DATEADD(day, -1, GETDATE())), -- Ring binders issued (now critically low!)
(@Item8, 'Issue', -5, NULL, @UserID, DATEADD(day, -4, GETDATE())), -- Staff chairs issued

-- Stock adjustments
(@Item4, 'Adjustment', 1, NULL, @UserID, DATEADD(day, -5, GETDATE())); -- Toner adjustment (found extra stock)

PRINT '✅ BUSINESS SAMPLE DATA INSERTED SUCCESSFULLY!';
PRINT '';
PRINT '📊 REALISTIC BUSINESS DATA SUMMARY:';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '📦 CATALOG DATA:';
PRINT '  • Categories: 3 (Office Supplies, Computer Equipment, Furniture)';
PRINT '  • Subcategories: 5 subcategories';
PRINT '  • Items: 10 realistic items with proper specifications';
PRINT '';
PRINT '📊 INVENTORY DATA:';
PRINT '  • Current Stock: 8 items with realistic quantities';
PRINT '  • Low Stock Alert: Ring Binders (18/20 minimum) - needs attention!';
PRINT '  • Stock Levels: Mix of good, normal, and critical stock levels';
PRINT '';
PRINT '📋 PROCUREMENT WORKFLOW:';
PRINT '  • Requests: 4 procurement requests (2 pending, 2 approved)';
PRINT '  • Request Items: 12 line items across all requests';
PRINT '  • Approvals: Complete workflow with realistic comments';
PRINT '';
PRINT '💰 FINANCIAL DATA:';
PRINT '  • Tender Awards: 2 awards (IT equipment: 684,400 PKR, Supplies: 42,480 PKR)';
PRINT '  • Award Items: Detailed pricing breakdown';
PRINT '  • Total Contract Value: 726,880 PKR';
PRINT '';
PRINT '🚚 DELIVERY TRACKING:';
PRINT '  • Deliveries: 1 partial (IT equipment), 1 complete (supplies)';
PRINT '  • Delivery Items: Detailed delivery status with serial numbers';
PRINT '';
PRINT '📈 TRANSACTION HISTORY:';
PRINT '  • Stock Transactions: 7 recent transactions (ins, outs, adjustments)';
PRINT '  • Transaction Types: Stock In, Issue, Adjustment';
PRINT '';
PRINT '🎯 READY FOR TESTING:';
PRINT '  • API endpoints have realistic data to display';
PRINT '  • Dashboard will show meaningful metrics';
PRINT '  • Complete procurement lifecycle represented';
PRINT '  • Low stock alerts available for testing';
PRINT '';
PRINT '🔗 USES EXISTING REFERENCE DATA:';
PRINT '  • AspNetUsers: Uses existing user IDs';
PRINT '  • DEC_MST: Uses existing department IDs';  
PRINT '  • No modification to organizational tables';
PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '✅ InvMISDB is now ready for comprehensive testing!';
