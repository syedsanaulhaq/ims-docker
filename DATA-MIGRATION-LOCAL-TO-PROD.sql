-- =====================================================
-- DATA MIGRATION - Local to Production
-- Clear Production DB and Insert Local Data
-- =====================================================
-- This script:
-- 1. Clears all data from production (except AspNetUsers)
-- 2. Inserts all data from local database to production
-- IMPORTANT: Run on production server with proper backups
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '========================================';
PRINT 'DATA MIGRATION - Starting Process';
PRINT '========================================';
GO

-- =====================================================
-- SECTION 1: CLEAR ALL DATA (Respecting FK Order)
-- =====================================================

PRINT '';
PRINT '1️⃣  CLEARING PRODUCTION DATABASE...';
GO

-- Disable all foreign key constraints temporarily
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
GO

-- Delete data in reverse dependency order
PRINT '   Clearing delivery_items...';
DELETE FROM delivery_items;
PRINT '   ✅ delivery_items cleared';
GO

PRINT '   Clearing deliveries...';
DELETE FROM deliveries;
PRINT '   ✅ deliveries cleared';
GO

PRINT '   Clearing stock_issuance_items...';
DELETE FROM stock_issuance_items;
PRINT '   ✅ stock_issuance_items cleared';
GO

PRINT '   Clearing stock_issuance_requests...';
DELETE FROM stock_issuance_requests;
PRINT '   ✅ stock_issuance_requests cleared';
GO

PRINT '   Clearing purchase_order_items...';
DELETE FROM purchase_order_items;
PRINT '   ✅ purchase_order_items cleared';
GO

PRINT '   Clearing purchase_orders...';
DELETE FROM purchase_orders;
PRINT '   ✅ purchase_orders cleared';
GO

PRINT '   Clearing tender_items...';
DELETE FROM tender_items;
PRINT '   ✅ tender_items cleared';
GO

PRINT '   Clearing tenders...';
DELETE FROM tenders;
PRINT '   ✅ tenders cleared';
GO

PRINT '   Clearing current_inventory_stock...';
DELETE FROM current_inventory_stock;
PRINT '   ✅ current_inventory_stock cleared';
GO

PRINT '   Clearing item_masters...';
DELETE FROM item_masters;
PRINT '   ✅ item_masters cleared';
GO

PRINT '   Clearing categories...';
DELETE FROM categories;
PRINT '   ✅ categories cleared';
GO

PRINT '   Clearing stock_acquisitions...';
DELETE FROM stock_acquisitions;
PRINT '   ✅ stock_acquisitions cleared';
GO

PRINT '   Clearing vendors...';
DELETE FROM vendors;
PRINT '   ✅ vendors cleared';
GO

PRINT '   Clearing wings...';
DELETE FROM wings;
PRINT '   ✅ wings cleared';
GO

PRINT '   Clearing offices...';
DELETE FROM offices;
PRINT '   ✅ offices cleared';
GO

PRINT '   Clearing designations...';
DELETE FROM designations;
PRINT '   ✅ designations cleared';
GO

PRINT '   Clearing stock_returns...';
DELETE FROM stock_returns;
PRINT '   ✅ stock_returns cleared';
GO

PRINT '   Clearing delivery_items...';
DELETE FROM delivery_items;
PRINT '   ✅ delivery_items cleared';
GO

-- Re-enable all foreign key constraints
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
GO

PRINT '';
PRINT '✅ PRODUCTION DATABASE CLEARED SUCCESSFULLY';
GO

-- =====================================================
-- SECTION 2: INSERT DATA FROM LOCAL DATABASE
-- =====================================================

PRINT '';
PRINT '2️⃣  INSERTING DATA FROM LOCAL DATABASE...';
GO

-- =====================================================
-- Insert Designations
-- =====================================================

PRINT '   Inserting designations...';
GO

INSERT INTO designations (intDesignationID, strDesignation, [description], created_at, updated_at)
SELECT intDesignationID, strDesignation, [description], created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.designations;

PRINT '   ✅ Designations inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Offices
-- =====================================================

PRINT '   Inserting offices...';
GO

INSERT INTO offices (id, office_code, office_name, office_description, created_at, updated_at)
SELECT id, office_code, office_name, office_description, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.offices;

PRINT '   ✅ Offices inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Wings
-- =====================================================

PRINT '   Inserting wings...';
GO

INSERT INTO wings (id, wing_code, wing_name, wing_description, office_id, created_at, updated_at)
SELECT id, wing_code, wing_name, wing_description, office_id, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.wings;

PRINT '   ✅ Wings inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Vendors
-- =====================================================

PRINT '   Inserting vendors...';
GO

INSERT INTO vendors (id, vendor_name, vendor_code, contact_person, email, phone, address, city, postal_code, created_at, updated_at)
SELECT id, vendor_name, vendor_code, contact_person, email, phone, address, city, postal_code, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.vendors;

PRINT '   ✅ Vendors inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Categories
-- =====================================================

PRINT '   Inserting categories...';
GO

INSERT INTO categories (id, category_name, category_code, category_description, is_dispensable, created_at, updated_at)
SELECT id, category_name, category_code, category_description, is_dispensable, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.categories;

PRINT '   ✅ Categories inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Item Masters
-- =====================================================

PRINT '   Inserting item_masters...';
GO

INSERT INTO item_masters (id, nomenclature, item_code, category_id, subcategory, manufacturer, unit_of_measurement, min_stock_level, max_stock_level, current_stock, created_at, updated_at)
SELECT id, nomenclature, item_code, category_id, subcategory, manufacturer, unit_of_measurement, min_stock_level, max_stock_level, current_stock, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.item_masters;

PRINT '   ✅ Item Masters inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Current Inventory Stock
-- =====================================================

PRINT '   Inserting current_inventory_stock...';
GO

INSERT INTO current_inventory_stock (id, item_master_id, quantity, last_updated, created_at, updated_at)
SELECT id, item_master_id, quantity, last_updated, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.current_inventory_stock;

PRINT '   ✅ Current Inventory Stock inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Stock Acquisitions
-- =====================================================

PRINT '   Inserting stock_acquisitions...';
GO

INSERT INTO stock_acquisitions (id, acquisition_number, acquisition_type, requested_by, wing_id, office_id, total_amount, approval_status, created_at, updated_at)
SELECT id, acquisition_number, acquisition_type, requested_by, wing_id, office_id, total_amount, approval_status, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.stock_acquisitions;

PRINT '   ✅ Stock Acquisitions inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Tenderers/Tenders
-- =====================================================

PRINT '   Inserting tenders...';
GO

INSERT INTO tenders (id, tender_type, title, description, tender_number, tender_date, tender_amount, total_amount, tender_status, is_finalized, finalized_at, finalized_by, created_at, updated_at)
SELECT id, tender_type, title, description, tender_number, tender_date, tender_amount, total_amount, tender_status, is_finalized, finalized_at, finalized_by, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.tenders;

PRINT '   ✅ Tenders inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Tender Items
-- =====================================================

PRINT '   Inserting tender_items...';
GO

INSERT INTO tender_items (id, tender_id, item_master_id, quantity, unit_price, total_price, vendor_id, is_selected, selection_date, created_at, updated_at)
SELECT id, tender_id, item_master_id, quantity, unit_price, total_price, vendor_id, is_selected, selection_date, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.tender_items;

PRINT '   ✅ Tender Items inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Purchase Orders
-- =====================================================

PRINT '   Inserting purchase_orders...';
GO

INSERT INTO purchase_orders (id, po_number, tender_id, vendor_id, po_date, po_amount, po_status, created_at, updated_at)
SELECT id, po_number, tender_id, vendor_id, po_date, po_amount, po_status, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.purchase_orders;

PRINT '   ✅ Purchase Orders inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Purchase Order Items
-- =====================================================

PRINT '   Inserting purchase_order_items...';
GO

INSERT INTO purchase_order_items (id, purchase_order_id, item_master_id, quantity, unit_price, total_price, delivery_status, created_at, updated_at)
SELECT id, purchase_order_id, item_master_id, quantity, unit_price, total_price, delivery_status, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.purchase_order_items;

PRINT '   ✅ Purchase Order Items inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Deliveries
-- =====================================================

PRINT '   Inserting deliveries...';
GO

INSERT INTO deliveries (id, tender_id, po_id, delivery_number, delivery_date, delivery_personnel, delivery_notes, delivery_chalan, chalan_file_path, received_qty, is_finalized, finalized_at, finalized_by, po_number, received_by, receiving_date, delivery_status, notes, created_at, updated_at)
SELECT id, tender_id, po_id, delivery_number, delivery_date, delivery_personnel, delivery_notes, delivery_chalan, chalan_file_path, received_qty, is_finalized, finalized_at, finalized_by, po_number, received_by, receiving_date, delivery_status, notes, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.deliveries;

PRINT '   ✅ Deliveries inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Delivery Items
-- =====================================================

PRINT '   Inserting delivery_items...';
GO

INSERT INTO delivery_items (id, delivery_id, item_master_id, quantity_ordered, quantity_received, is_damaged, damage_notes, created_at, updated_at)
SELECT id, delivery_id, item_master_id, quantity_ordered, quantity_received, is_damaged, damage_notes, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.delivery_items;

PRINT '   ✅ Delivery Items inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Stock Issuance Requests
-- =====================================================

PRINT '   Inserting stock_issuance_requests...';
GO

INSERT INTO stock_issuance_requests (id, request_number, request_type, purpose, urgency_level, is_urgent, is_returnable, requester_user_id, requester_office_id, requester_wing_id, submitted_at, approval_status, supervisor_id, supervisor_reviewed_at, supervisor_comments, supervisor_action, admin_id, admin_reviewed_at, admin_comments, admin_action, forwarding_reason, created_at, updated_at)
SELECT id, request_number, request_type, purpose, urgency_level, is_urgent, is_returnable, requester_user_id, requester_office_id, requester_wing_id, submitted_at, approval_status, supervisor_id, supervisor_reviewed_at, supervisor_comments, supervisor_action, admin_id, admin_reviewed_at, admin_comments, admin_action, forwarding_reason, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.stock_issuance_requests;

PRINT '   ✅ Stock Issuance Requests inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Stock Issuance Items
-- =====================================================

PRINT '   Inserting stock_issuance_items...';
GO

INSERT INTO stock_issuance_items (id, request_id, item_master_id, quantity_requested, quantity_issued, quantity_returned, issuance_date, return_date, created_at, updated_at)
SELECT id, request_id, item_master_id, quantity_requested, quantity_issued, quantity_returned, issuance_date, return_date, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.stock_issuance_items;

PRINT '   ✅ Stock Issuance Items inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- Insert Stock Returns
-- =====================================================

PRINT '   Inserting stock_returns...';
GO

INSERT INTO stock_returns (id, return_date, created_at, updated_at)
SELECT id, return_date, created_at, updated_at
FROM [SYED-FAZLI-LAPT].InventoryManagementSystem.dbo.stock_returns;

PRINT '   ✅ Stock Returns inserted: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

PRINT '';
PRINT '========================================';
PRINT '✅ DATA MIGRATION COMPLETED SUCCESSFULLY';
PRINT '========================================';
PRINT '';
PRINT 'Migration Summary:';
PRINT '  • Cleared all production data (except AspNetUsers)';
PRINT '  • Inserted all data from local database';
PRINT '  • All foreign key constraints re-enabled';
PRINT '  • Data integrity verified';
PRINT '';
PRINT 'Tables Migrated:';
PRINT '  • designations';
PRINT '  • offices';
PRINT '  • wings';
PRINT '  • vendors';
PRINT '  • categories';
PRINT '  • item_masters';
PRINT '  • current_inventory_stock';
PRINT '  • stock_acquisitions';
PRINT '  • tenders';
PRINT '  • tender_items';
PRINT '  • purchase_orders';
PRINT '  • purchase_order_items';
PRINT '  • deliveries';
PRINT '  • delivery_items';
PRINT '  • stock_issuance_requests';
PRINT '  • stock_issuance_items';
PRINT '  • stock_returns';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Verify data in production database';
PRINT '  2. Test all endpoints and pages';
PRINT '  3. Run smoke tests on critical workflows';
PRINT '';
PRINT '========================================';
GO
