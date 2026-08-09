-- ====================================================================
-- 🗄️ INVMISDB SAMPLE DATA INSERTION
-- ====================================================================
-- Comprehensive dummy data for testing the InvMISDB system
-- This will populate all tables with realistic sample data
-- ====================================================================

USE InvMISDB;

-- ====================================================================
-- 📦 1. CATEGORIES & SUBCATEGORIES
-- ====================================================================

-- Insert Categories
INSERT INTO categories (category_name, category_code, description) VALUES
('Office Supplies', 'OS', 'General office supplies and stationery'),
('Computer Equipment', 'CE', 'Computers, laptops, and IT equipment'),
('Furniture', 'FU', 'Office furniture and fixtures'),
('Vehicles', 'VE', 'Official vehicles and transport equipment'),
('Medical Supplies', 'MS', 'Medical and healthcare supplies'),
('Security Equipment', 'SE', 'Security and safety equipment'),
('Communication', 'CM', 'Communication devices and equipment'),
('Electrical Items', 'EI', 'Electrical and electronic items');

-- Insert Subcategories
INSERT INTO sub_categories (subcategory_name, subcategory_code, category_id, description) VALUES
-- Office Supplies subcategories
('Stationery', 'STAT', 1, 'Pens, papers, files, etc.'),
('Printing Materials', 'PRNT', 1, 'Toners, cartridges, printing papers'),
('Office Tools', 'OTOL', 1, 'Staplers, hole punchers, etc.'),

-- Computer Equipment subcategories  
('Laptops', 'LPTP', 2, 'Portable computers and laptops'),
('Desktop Computers', 'DESK', 2, 'Desktop PCs and workstations'),
('Network Equipment', 'NETW', 2, 'Routers, switches, cables'),
('Software', 'SOFT', 2, 'Software licenses and applications'),

-- Furniture subcategories
('Office Chairs', 'OCHR', 3, 'Chairs and seating furniture'),
('Desks & Tables', 'DTBL', 3, 'Desks, tables, and work surfaces'),
('Storage', 'STOR', 3, 'Cabinets, shelves, storage units'),

-- Vehicles subcategories
('Cars', 'CARS', 4, 'Official cars and sedans'),
('Motorcycles', 'MOTO', 4, 'Official motorcycles'),

-- Medical Supplies subcategories
('First Aid', 'FAID', 5, 'First aid and emergency medical supplies'),
('PPE', 'PPE', 5, 'Personal protective equipment'),

-- Security Equipment subcategories
('CCTV Systems', 'CCTV', 6, 'Security cameras and monitoring'),
('Access Control', 'ACCS', 6, 'Card readers, locks, security systems'),

-- Communication subcategories
('Mobile Phones', 'MOBL', 7, 'Mobile phones and accessories'),
('Landline Equipment', 'LAND', 7, 'Landline phones and PBX systems'),

-- Electrical Items subcategories
('UPS Systems', 'UPS', 8, 'Uninterruptible power supplies'),
('Air Conditioning', 'AC', 8, 'Air conditioners and cooling systems');

-- ====================================================================
-- 📋 2. ITEM MASTER 
-- ====================================================================

INSERT INTO ItemMaster (item_code, item_name, description, unit_of_measurement, minimum_stock_level, maximum_stock_level, subcategory_id) VALUES
-- Stationery Items
('STAT-001', 'A4 Paper Pack', 'White A4 size paper, 500 sheets per pack', 'Pack', 10, 100, 1),
('STAT-002', 'Blue Ballpoint Pen', 'Blue ink ballpoint pen', 'Piece', 50, 500, 1),
('STAT-003', 'Ring Binder File', 'A4 size ring binder file', 'Piece', 20, 200, 1),
('STAT-004', 'Stapler Machine', 'Desktop stapler for office use', 'Piece', 5, 50, 3),
('STAT-005', 'Paper Clips Box', 'Metal paper clips, 100 pieces per box', 'Box', 15, 150, 1),

-- Printing Materials
('PRNT-001', 'HP LaserJet Toner', 'Black toner cartridge for HP LaserJet printers', 'Piece', 3, 30, 2),
('PRNT-002', 'Canon Ink Cartridge', 'Color ink cartridge for Canon printers', 'Piece', 5, 50, 2),
('PRNT-003', 'Photo Paper A4', 'Glossy photo paper for color printing', 'Pack', 10, 100, 2),

-- Computer Equipment
('LPTP-001', 'Dell Latitude 7420', 'Dell Latitude 7420 Laptop, Intel i7, 16GB RAM, 512GB SSD', 'Piece', 2, 20, 4),
('LPTP-002', 'HP EliteBook 840', 'HP EliteBook 840 G8, Intel i5, 8GB RAM, 256GB SSD', 'Piece', 3, 30, 4),
('DESK-001', 'Dell OptiPlex 7090', 'Dell OptiPlex 7090 Desktop, Intel i5, 8GB RAM, 1TB HDD', 'Piece', 5, 50, 5),
('NETW-001', 'Cisco Router 2911', 'Cisco 2911 Integrated Services Router', 'Piece', 1, 10, 6),
('NETW-002', 'Cat6 Ethernet Cable', 'Cat6 network cable, 10 meters', 'Piece', 20, 200, 6),

-- Furniture
('OCHR-001', 'Executive Office Chair', 'Leather executive chair with armrest', 'Piece', 5, 50, 8),
('OCHR-002', 'Staff Chair', 'Mesh back staff chair with wheels', 'Piece', 10, 100, 8),
('DTBL-001', 'Executive Desk', 'Wooden executive desk 6ft x 3ft', 'Piece', 3, 30, 9),
('DTBL-002', 'Conference Table', '12-seater conference table', 'Piece', 1, 10, 9),
('STOR-001', 'Filing Cabinet', '4-drawer steel filing cabinet', 'Piece', 5, 50, 10),

-- Vehicles
('CARS-001', 'Toyota Corolla 2024', 'Official sedan car for staff transport', 'Piece', 0, 5, 11),
('MOTO-001', 'Honda CD 70', 'Motorcycle for official dispatch', 'Piece', 0, 10, 12),

-- Medical Supplies
('FAID-001', 'First Aid Kit', 'Complete first aid kit for emergency', 'Kit', 5, 50, 13),
('PPE-001', 'N95 Face Mask', 'Medical grade N95 face masks', 'Box', 10, 100, 14),
('PPE-002', 'Hand Sanitizer', 'Alcohol-based hand sanitizer 500ml', 'Bottle', 20, 200, 14),

-- Security Equipment
('CCTV-001', 'IP Security Camera', 'HD IP security camera for surveillance', 'Piece', 5, 50, 15),
('ACCS-001', 'RFID Card Reader', 'RFID card reader for access control', 'Piece', 2, 20, 16),

-- Communication
('MOBL-001', 'Samsung Galaxy A54', 'Official mobile phone for staff', 'Piece', 5, 50, 17),
('LAND-001', 'Cisco IP Phone', 'VoIP desk phone for office use', 'Piece', 10, 100, 18),

-- Electrical Items  
('UPS-001', 'APC UPS 1000VA', '1000VA UPS for computer backup', 'Piece', 3, 30, 19),
('AC-001', 'Haier AC 1.5 Ton', '1.5 ton split air conditioner', 'Piece', 1, 10, 20);

-- ====================================================================
-- 📊 3. CURRENT STOCK (Initialize with quantities)
-- ====================================================================

-- We'll add stock for first 3 offices (office_id 1, 2, 3)
-- Office 1: Main Office stock
INSERT INTO CurrentStock (item_id, office_id, current_quantity, minimum_stock_level, maximum_stock_level, updated_by) VALUES
(1, 1, 45, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- A4 Paper
(2, 1, 120, 50, 500, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Blue Pens
(3, 1, 35, 20, 200, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Ring Binders
(4, 1, 15, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Staplers
(5, 1, 80, 15, 150, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Paper Clips
(6, 1, 8, 3, 30, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- HP Toner
(7, 1, 12, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Canon Ink
(8, 1, 5, 2, 20, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Dell Laptop
(9, 1, 3, 3, 30, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- HP Laptop
(10, 1, 12, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Dell Desktop
(11, 1, 25, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Office Chair Executive
(12, 1, 45, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Staff Chair
(13, 1, 8, 3, 30, (SELECT TOP 1 Id FROM AspNetUsers ORDER by UserName)), -- Executive Desk
(14, 1, 15, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)); -- Filing Cabinet

-- Office 2: Branch Office stock (smaller quantities)
INSERT INTO CurrentStock (item_id, office_id, current_quantity, minimum_stock_level, maximum_stock_level, updated_by) VALUES
(1, 2, 25, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- A4 Paper
(2, 2, 80, 50, 500, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Blue Pens
(3, 2, 18, 20, 200, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Ring Binders (LOW STOCK)
(4, 2, 8, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Staplers
(8, 2, 3, 2, 20, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Dell Laptop
(10, 2, 7, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Dell Desktop
(12, 2, 20, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Staff Chair
(14, 2, 6, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)); -- Filing Cabinet

-- Office 3: Regional Office stock
INSERT INTO CurrentStock (item_id, office_id, current_quantity, minimum_stock_level, maximum_stock_level, updated_by) VALUES
(1, 3, 15, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- A4 Paper
(2, 3, 65, 50, 500, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Blue Pens
(3, 3, 28, 20, 200, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Ring Binders
(6, 3, 2, 3, 30, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- HP Toner (LOW STOCK)
(8, 3, 4, 2, 20, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Dell Laptop
(12, 3, 35, 10, 100, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- Staff Chair
(22, 3, 8, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)), -- First Aid Kit
(25, 3, 3, 5, 50, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName)); -- Security Camera

-- ====================================================================
-- 📋 4. PROCUREMENT REQUESTS
-- ====================================================================

INSERT INTO ProcurementRequests (request_title, description, priority_level, required_date, requested_by, office_id, status) VALUES
('Office Stationery Replenishment', 'Monthly stationery supplies for main office operations', 'Medium', '2025-10-15', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 1, 'Pending'),
('New Laptops for IT Department', 'Procurement of 5 new laptops for expanding IT team', 'High', '2025-09-30', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 1, 'Approved'),
('Branch Office Setup Equipment', 'Furniture and equipment needed for new branch office', 'High', '2025-11-01', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 2, 'Pending'),
('Security Camera Installation', 'CCTV cameras for enhanced security coverage', 'Medium', '2025-10-20', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 3, 'Approved'),
('Medical Supplies Emergency Stock', 'Emergency medical supplies and PPE replenishment', 'High', '2025-09-20', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 1, 'Rejected'),
('Vehicle Maintenance Equipment', 'Tools and equipment for vehicle maintenance', 'Low', '2025-12-01', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 2, 'Pending');

-- ====================================================================
-- 📋 5. PROCUREMENT REQUEST ITEMS
-- ====================================================================

-- Request 1: Office Stationery Replenishment
INSERT INTO ProcurementRequestItems (request_id, item_id, quantity_requested, justification) VALUES
(1, 1, 50, 'Monthly consumption of A4 paper for printing needs'),
(1, 2, 200, 'Staff requirement for daily office work'),
(1, 3, 30, 'File organization and document management'),
(1, 4, 10, 'Office equipment replacement'),
(1, 5, 25, 'Document binding and organization');

-- Request 2: New Laptops for IT Department  
INSERT INTO ProcurementRequestItems (request_id, item_id, quantity_requested, justification) VALUES
(2, 8, 3, 'High-performance laptops for development team'),
(2, 9, 2, 'Standard laptops for support staff');

-- Request 3: Branch Office Setup Equipment
INSERT INTO ProcurementRequestItems (request_id, item_id, quantity_requested, justification) VALUES
(3, 11, 5, 'Executive chairs for senior staff'),
(3, 12, 15, 'Staff seating for new branch office'),
(3, 13, 3, 'Executive desks for management'),
(3, 14, 8, 'Document storage and filing needs');

-- Request 4: Security Camera Installation
INSERT INTO ProcurementRequestItems (request_id, item_id, quantity_requested, justification) VALUES
(4, 25, 12, 'Complete CCTV coverage for building perimeter'),
(4, 26, 3, 'Access control for restricted areas');

-- Request 5: Medical Supplies Emergency Stock
INSERT INTO ProcurementRequestItems (request_id, item_id, quantity_requested, justification) VALUES
(5, 22, 20, 'Emergency medical kits for all departments'),
(5, 23, 50, 'COVID-19 safety protocols'),
(5, 24, 100, 'Hygiene maintenance for staff');

-- Request 6: Vehicle Maintenance Equipment
INSERT INTO ProcurementRequestItems (request_id, item_id, quantity_requested, justification) VALUES
(6, 19, 2, 'Official transport for senior management'),
(6, 20, 3, 'Dispatch and delivery services');

-- ====================================================================
-- ✅ 6. APPROVAL WORKFLOW
-- ====================================================================

-- Approvals for Request 1 (Pending)
INSERT INTO ApprovalWorkflow (request_id, level_number, approver_id, status, approval_date, comments, approval_authority_limit) VALUES
(1, 1, NULL, 'Pending', GETDATE(), 'Awaiting supervisor approval', 50000.00);

-- Approvals for Request 2 (Approved)
INSERT INTO ApprovalWorkflow (request_id, level_number, approver_id, status, approval_date, comments, approval_authority_limit) VALUES
(2, 1, (SELECT TOP 1 Id FROM AspNetUsers WHERE UserName LIKE '%admin%' OR UserName LIKE '%manager%'), 'Approved', DATEADD(day, -2, GETDATE()), 'IT expansion approved for operational needs', 500000.00);

-- Approvals for Request 3 (Pending)  
INSERT INTO ApprovalWorkflow (request_id, level_number, approver_id, status, approval_date, comments, approval_authority_limit) VALUES
(3, 1, NULL, 'Pending', GETDATE(), 'Under review for budget allocation', 200000.00);

-- Approvals for Request 4 (Approved)
INSERT INTO ApprovalWorkflow (request_id, level_number, approver_id, status, approval_date, comments, approval_authority_limit) VALUES
(4, 1, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY NEWID()), 'Approved', DATEADD(day, -1, GETDATE()), 'Security enhancement approved', 150000.00);

-- Approvals for Request 5 (Rejected)
INSERT INTO ApprovalWorkflow (request_id, level_number, approver_id, status, approval_date, comments, approval_authority_limit) VALUES
(5, 1, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY NEWID()), 'Rejected', DATEADD(day, -3, GETDATE()), 'Insufficient budget allocation for current quarter', 100000.00);

-- Approvals for Request 6 (Pending)
INSERT INTO ApprovalWorkflow (request_id, level_number, approver_id, status, approval_date, comments, approval_authority_limit) VALUES
(6, 1, NULL, 'Pending', GETDATE(), 'Awaiting transport department approval', 300000.00);

-- ====================================================================
-- 💰 7. TENDER AWARDS
-- ====================================================================

-- Award for Request 2 (IT Laptops)
INSERT INTO TenderAwards (award_reference, request_id, vendor_name, vendor_contact, total_amount, expected_delivery_date, created_by, status, payment_terms, delivery_terms) VALUES
('TA-2025-001', 2, 'TechWorld Solutions', 'contact@techworld.com | 0321-1234567', 485000.00, '2025-09-25', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 'Awarded', '30 days credit', 'FOB destination');

-- Award for Request 4 (Security Cameras)
INSERT INTO TenderAwards (award_reference, request_id, vendor_name, vendor_contact, total_amount, expected_delivery_date, created_by, status, payment_terms, delivery_terms) VALUES
('TA-2025-002', 4, 'SecureVision Systems', 'sales@securevision.pk | 0300-9876543', 125000.00, '2025-10-10', (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 'Awarded', 'Advance payment 50%', 'Installation included');

-- ====================================================================
-- 💰 8. TENDER AWARD ITEMS
-- ====================================================================

-- Award Items for TA-2025-001 (IT Laptops)
INSERT INTO TenderAwardItems (award_id, item_id, quantity_awarded, unit_price, total_price) VALUES
(1, 8, 3, 125000.00, 375000.00), -- Dell Laptops
(1, 9, 2, 55000.00, 110000.00);  -- HP Laptops

-- Award Items for TA-2025-002 (Security Cameras)
INSERT INTO TenderAwardItems (award_id, item_id, quantity_awarded, unit_price, total_price) VALUES
(2, 25, 12, 8500.00, 102000.00), -- IP Cameras
(2, 26, 3, 7500.00, 22500.00);   -- RFID Readers

-- ====================================================================
-- 🚚 9. DELIVERIES
-- ====================================================================

-- Delivery for Award 1 (Partial - 2 Dell laptops delivered)
INSERT INTO Deliveries (award_id, delivery_date, received_by, status, delivery_note_reference, total_items_received, remarks) VALUES
(1, DATEADD(day, -1, GETDATE()), (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 'Partial', 'DN-2025-001', 2, 'Partial delivery - 2 Dell laptops received, remaining items expected next week');

-- Delivery for Award 2 (Complete delivery)
INSERT INTO Deliveries (award_id, delivery_date, received_by, status, delivery_note_reference, total_items_received, remarks) VALUES
(2, GETDATE(), (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), 'Completed', 'DN-2025-002', 15, 'Complete delivery of all security equipment with installation');

-- ====================================================================
-- 🚚 10. DELIVERY ITEMS
-- ====================================================================

-- Delivery Items for Delivery 1 (Partial IT delivery)
INSERT INTO DeliveryItems (delivery_id, item_id, quantity_delivered, unit_price, condition_on_delivery, serial_numbers) VALUES
(1, 8, 2, 125000.00, 'Good', 'DL001234, DL001235'), -- Dell Laptops delivered
(1, 9, 0, 55000.00, 'Pending', NULL); -- HP Laptops not yet delivered

-- Delivery Items for Delivery 2 (Complete security delivery)
INSERT INTO DeliveryItems (delivery_id, item_id, quantity_delivered, unit_price, condition_on_delivery, serial_numbers) VALUES
(2, 25, 12, 8500.00, 'Excellent', 'CAM001-CAM012'), -- All cameras delivered
(2, 26, 3, 7500.00, 'Good', 'RFID001, RFID002, RFID003'); -- All RFID readers delivered

-- ====================================================================
-- 📊 11. STOCK TRANSACTIONS (Recent activity)
-- ====================================================================

INSERT INTO StockTransactions (item_id, office_id, transaction_type, quantity_change, previous_quantity, new_quantity, reference_id, created_by, transaction_date) VALUES
-- Recent stock additions from deliveries
(8, 1, 'Stock In', 2, 3, 5, 1, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), DATEADD(day, -1, GETDATE())),
(25, 3, 'Stock In', 12, 3, 15, 2, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), GETDATE()),
(26, 3, 'Stock In', 3, 0, 3, 2, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), GETDATE()),

-- Some stock issues (outgoing)
(1, 1, 'Issue', -5, 50, 45, NULL, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), DATEADD(day, -3, GETDATE())),
(2, 1, 'Issue', -30, 150, 120, NULL, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), DATEADD(day, -2, GETDATE())),
(3, 2, 'Issue', -2, 20, 18, NULL, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), DATEADD(day, -1, GETDATE())),

-- Stock adjustments
(6, 3, 'Adjustment', -1, 3, 2, NULL, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), DATEADD(day, -4, GETDATE())),
(12, 1, 'Issue', -5, 50, 45, NULL, (SELECT TOP 1 Id FROM AspNetUsers ORDER BY UserName), DATEADD(day, -1, GETDATE()));

PRINT '✅ Sample data insertion completed successfully!';
PRINT '';
PRINT '📊 INSERTED DATA SUMMARY:';
PRINT '• Categories: 8 categories with 20 subcategories';
PRINT '• Items: 28 items across all categories';
PRINT '• Stock: 30+ stock records across 3 offices';
PRINT '• Requests: 6 procurement requests with different statuses';
PRINT '• Approvals: Complete approval workflow records';
PRINT '• Awards: 2 tender awards with financial data';
PRINT '• Deliveries: 2 deliveries (1 partial, 1 complete)';
PRINT '• Transactions: 8 stock transaction records';
PRINT '';
PRINT '🎯 Your InvMISDB system now has realistic data for testing!';
