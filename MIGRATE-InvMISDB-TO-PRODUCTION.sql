-- =====================================================
-- DATA MIGRATION - Local to Production
-- Copy all data from local InventoryManagementDB to production
-- Requires LINKED SERVER: SYED-FAZLI-LAPT configured
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '========================================';
PRINT 'DATA MIGRATION';
PRINT 'Local: SYED-FAZLI-LAPT.InventoryManagementDB';
PRINT 'Prod: Production InventoryManagementDB';
PRINT '========================================';
GO

-- =====================================================
-- SECTION 1: CLEAR ALL DATA (Safe Deletion Order)
-- =====================================================

PRINT '';
PRINT '1️⃣  CLEARING EXISTING PRODUCTION DATA...';
GO

-- Disable foreign key constraints
PRINT '   Disabling foreign key constraints...';
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
PRINT '   ✅ FK constraints disabled';
GO

-- Delete tables with dependencies first
PRINT '   Clearing tables...';
DELETE FROM delivery_items; 
PRINT '   ✅ delivery_items cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM deliveries; 
PRINT '   ✅ deliveries cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM stock_issuance_items; 
PRINT '   ✅ stock_issuance_items cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM stock_issuance_requests; 
PRINT '   ✅ stock_issuance_requests cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM tender_items; 
PRINT '   ✅ tender_items cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM tenders; 
PRINT '   ✅ tenders cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM stock_returns; 
PRINT '   ✅ stock_returns cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM current_inventory_stock; 
PRINT '   ✅ current_inventory_stock cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM item_masters; 
PRINT '   ✅ item_masters cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM categories; 
PRINT '   ✅ categories cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
DELETE FROM vendors; 
PRINT '   ✅ vendors cleared: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- SECTION 2: INSERT DATA FROM LOCAL DATABASE
-- =====================================================

PRINT '';
PRINT '2️⃣  INSERTING DATA FROM LOCAL DATABASE...';
GO

-- Categories
PRINT '   Inserting categories...';
INSERT INTO categories (id, category_name, category_code, category_description, is_dispensable, created_at, updated_at)
SELECT id, category_name, category_code, category_description, is_dispensable, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.categories;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' categories';
GO

-- Vendors
PRINT '   Inserting vendors...';
INSERT INTO vendors (id, vendor_name, vendor_code, contact_person, email, phone, address, city, postal_code, created_at, updated_at)
SELECT id, vendor_name, vendor_code, contact_person, email, phone, address, city, postal_code, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.vendors;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' vendors';
GO

-- Item Masters
PRINT '   Inserting item_masters...';
INSERT INTO item_masters (id, nomenclature, item_code, category_id, subcategory, manufacturer, unit_of_measurement, min_stock_level, max_stock_level, current_stock, created_at, updated_at)
SELECT id, nomenclature, item_code, category_id, subcategory, manufacturer, unit_of_measurement, min_stock_level, max_stock_level, current_stock, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.item_masters;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' item_masters';
GO

-- Current Inventory Stock
PRINT '   Inserting current_inventory_stock...';
INSERT INTO current_inventory_stock (id, item_master_id, quantity, last_updated, created_at, updated_at)
SELECT id, item_master_id, quantity, last_updated, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.current_inventory_stock;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' inventory stock records';
GO

-- Tenders
PRINT '   Inserting tenders...';
INSERT INTO tenders (id, tender_type, title, description, tender_number, tender_date, tender_amount, total_amount, tender_status, is_finalized, finalized_at, finalized_by, created_at, updated_at)
SELECT id, tender_type, title, description, tender_number, tender_date, tender_amount, total_amount, tender_status, is_finalized, finalized_at, finalized_by, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.tenders;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tenders';
GO

-- Tender Items
PRINT '   Inserting tender_items...';
INSERT INTO tender_items (id, tender_id, item_master_id, quantity, unit_price, total_price, vendor_id, is_selected, selection_date, created_at, updated_at)
SELECT id, tender_id, item_master_id, quantity, unit_price, total_price, vendor_id, is_selected, selection_date, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.tender_items;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender_items';
GO

-- Stock Issuance Requests
PRINT '   Inserting stock_issuance_requests...';
INSERT INTO stock_issuance_requests (id, request_number, request_type, purpose, urgency_level, is_urgent, is_returnable, requester_user_id, requester_office_id, requester_wing_id, submitted_at, approval_status, supervisor_id, supervisor_reviewed_at, supervisor_comments, supervisor_action, admin_id, admin_reviewed_at, admin_comments, admin_action, forwarding_reason, created_at, updated_at)
SELECT id, request_number, request_type, purpose, urgency_level, is_urgent, is_returnable, requester_user_id, requester_office_id, requester_wing_id, submitted_at, approval_status, supervisor_id, supervisor_reviewed_at, supervisor_comments, supervisor_action, admin_id, admin_reviewed_at, admin_comments, admin_action, forwarding_reason, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.stock_issuance_requests;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' stock_issuance_requests';
GO

-- Stock Issuance Items
PRINT '   Inserting stock_issuance_items...';
INSERT INTO stock_issuance_items (id, request_id, item_master_id, quantity_requested, quantity_issued, quantity_returned, issuance_date, return_date, created_at, updated_at)
SELECT id, request_id, item_master_id, quantity_requested, quantity_issued, quantity_returned, issuance_date, return_date, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.stock_issuance_items;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' stock_issuance_items';
GO

-- Deliveries
PRINT '   Inserting deliveries...';
INSERT INTO deliveries (id, tender_id, po_id, delivery_number, delivery_date, delivery_personnel, delivery_notes, delivery_chalan, chalan_file_path, received_qty, is_finalized, finalized_at, finalized_by, po_number, received_by, receiving_date, delivery_status, notes, created_at, updated_at)
SELECT id, tender_id, po_id, delivery_number, delivery_date, delivery_personnel, delivery_notes, delivery_chalan, chalan_file_path, received_qty, is_finalized, finalized_at, finalized_by, po_number, received_by, receiving_date, delivery_status, notes, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.deliveries;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' deliveries';
GO

-- Delivery Items
PRINT '   Inserting delivery_items...';
INSERT INTO delivery_items (id, delivery_id, item_master_id, quantity_ordered, quantity_received, is_damaged, damage_notes, created_at, updated_at)
SELECT id, delivery_id, item_master_id, quantity_ordered, quantity_received, is_damaged, damage_notes, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.delivery_items;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' delivery_items';
GO

-- Stock Returns
PRINT '   Inserting stock_returns...';
INSERT INTO stock_returns (id, return_date, created_at, updated_at)
SELECT id, return_date, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.stock_returns;
PRINT '   ✅ Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' stock_returns';
GO

-- =====================================================
-- SECTION 3: RE-ENABLE CONSTRAINTS
-- =====================================================

PRINT '';
PRINT '3️⃣  Re-enabling foreign key constraints...';
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
PRINT '   ✅ All FK constraints re-enabled';
GO

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

PRINT '';
PRINT '========================================';
PRINT '✅ DATA MIGRATION COMPLETED SUCCESSFULLY';
PRINT '========================================';
PRINT '';
PRINT 'Migration Details:';
PRINT '  • Source: SYED-FAZLI-LAPT.InventoryManagementDB';
PRINT '  • Target: Production InventoryManagementDB';
PRINT '  • All tables cleared before insert';
PRINT '  • All foreign key constraints re-enabled';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Verify data counts in production';
PRINT '  2. Test Personal Dashboard pages';
PRINT '  3. Verify inventory displays correctly';
PRINT '  4. Run smoke tests on all workflows';
PRINT '';
PRINT '========================================';
GO
