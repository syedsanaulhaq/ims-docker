-- =====================================================
-- GENERATE INSERT STATEMENTS FROM LOCAL DATABASE
-- Run this on PRODUCTION database
-- Pulls data from LOCAL InventoryManagementDB on SYED-FAZLI-LAPT
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '========================================';
PRINT 'GENERATING DATA INSERT SCRIPTS';
PRINT '========================================';
GO

-- =====================================================
-- CATEGORIES
-- =====================================================

PRINT '';
PRINT '-- ===== CATEGORIES =====';
GO

SELECT 
    'INSERT INTO categories (id, category_name, category_code, category_description, is_dispensable, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(category_name, '''') + ',' +
    QUOTENAME(category_code, '''') + ',' +
    QUOTENAME(ISNULL(category_description, ''), '''') + ',' +
    CAST(ISNULL(is_dispensable, 0) AS VARCHAR(1)) + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.categories
ORDER BY id;
GO

-- =====================================================
-- VENDORS
-- =====================================================

PRINT '';
PRINT '-- ===== VENDORS =====';
GO

SELECT 
    'INSERT INTO vendors (id, vendor_name, vendor_code, contact_person, email, phone, address, city, postal_code, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(vendor_name, '''') + ',' +
    QUOTENAME(vendor_code, '''') + ',' +
    QUOTENAME(ISNULL(contact_person, ''), '''') + ',' +
    QUOTENAME(ISNULL(email, ''), '''') + ',' +
    QUOTENAME(ISNULL(phone, ''), '''') + ',' +
    QUOTENAME(ISNULL(address, ''), '''') + ',' +
    QUOTENAME(ISNULL(city, ''), '''') + ',' +
    QUOTENAME(ISNULL(postal_code, ''), '''') + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.vendors
ORDER BY id;
GO

-- =====================================================
-- ITEM MASTERS
-- =====================================================

PRINT '';
PRINT '-- ===== ITEM MASTERS =====';
GO

SELECT 
    'INSERT INTO item_masters (id, nomenclature, item_code, category_id, subcategory, manufacturer, unit_of_measurement, min_stock_level, max_stock_level, current_stock, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(nomenclature, '''') + ',' +
    QUOTENAME(item_code, '''') + ',' +
    QUOTENAME(CAST(category_id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(ISNULL(subcategory, ''), '''') + ',' +
    QUOTENAME(ISNULL(manufacturer, ''), '''') + ',' +
    QUOTENAME(ISNULL(unit_of_measurement, ''), '''') + ',' +
    CAST(ISNULL(min_stock_level, 0) AS VARCHAR(10)) + ',' +
    CAST(ISNULL(max_stock_level, 0) AS VARCHAR(10)) + ',' +
    CAST(ISNULL(current_stock, 0) AS VARCHAR(10)) + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.item_masters
ORDER BY id;
GO

-- =====================================================
-- CURRENT INVENTORY STOCK
-- =====================================================

PRINT '';
PRINT '-- ===== CURRENT INVENTORY STOCK =====';
GO

SELECT 
    'INSERT INTO current_inventory_stock (id, item_master_id, quantity, last_updated, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(CAST(item_master_id AS NVARCHAR(MAX)), '''') + ',' +
    CAST(quantity AS VARCHAR(10)) + ',' +
    QUOTENAME(CAST(last_updated AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.current_inventory_stock
ORDER BY id;
GO

-- =====================================================
-- TENDERS
-- =====================================================

PRINT '';
PRINT '-- ===== TENDERS =====';
GO

SELECT 
    'INSERT INTO tenders (id, tender_type, title, description, tender_number, tender_date, tender_amount, total_amount, tender_status, is_finalized, finalized_at, finalized_by, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(ISNULL(tender_type, ''), '''') + ',' +
    QUOTENAME(title, '''') + ',' +
    QUOTENAME(ISNULL(description, ''), '''') + ',' +
    QUOTENAME(ISNULL(tender_number, ''), '''') + ',' +
    QUOTENAME(CAST(tender_date AS VARCHAR(30)), '''') + ',' +
    CAST(ISNULL(tender_amount, 0) AS VARCHAR(20)) + ',' +
    CAST(ISNULL(total_amount, 0) AS VARCHAR(20)) + ',' +
    QUOTENAME(ISNULL(tender_status, ''), '''') + ',' +
    CAST(ISNULL(is_finalized, 0) AS VARCHAR(1)) + ',' +
    ISNULL(QUOTENAME(CAST(finalized_at AS VARCHAR(30)), ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(finalized_by, ''''), 'NULL') + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.tenders
ORDER BY id;
GO

-- =====================================================
-- TENDER ITEMS
-- =====================================================

PRINT '';
PRINT '-- ===== TENDER ITEMS =====';
GO

SELECT 
    'INSERT INTO tender_items (id, tender_id, item_master_id, quantity, unit_price, total_price, vendor_id, is_selected, selection_date, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(CAST(tender_id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(CAST(item_master_id AS NVARCHAR(MAX)), '''') + ',' +
    CAST(quantity AS VARCHAR(10)) + ',' +
    CAST(ISNULL(unit_price, 0) AS VARCHAR(20)) + ',' +
    CAST(ISNULL(total_price, 0) AS VARCHAR(20)) + ',' +
    ISNULL(QUOTENAME(CAST(vendor_id AS NVARCHAR(MAX)), ''''), 'NULL') + ',' +
    CAST(ISNULL(is_selected, 0) AS VARCHAR(1)) + ',' +
    ISNULL(QUOTENAME(CAST(selection_date AS VARCHAR(30)), ''''), 'NULL') + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.tender_items
ORDER BY id;
GO

-- =====================================================
-- STOCK ISSUANCE REQUESTS
-- =====================================================

PRINT '';
PRINT '-- ===== STOCK ISSUANCE REQUESTS =====';
GO

SELECT 
    'INSERT INTO stock_issuance_requests (id, request_number, request_type, purpose, urgency_level, is_urgent, is_returnable, requester_user_id, requester_office_id, requester_wing_id, submitted_at, approval_status, supervisor_id, supervisor_reviewed_at, supervisor_comments, supervisor_action, admin_id, admin_reviewed_at, admin_comments, admin_action, forwarding_reason, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(ISNULL(request_number, ''), '''') + ',' +
    QUOTENAME(ISNULL(request_type, ''), '''') + ',' +
    QUOTENAME(purpose, '''') + ',' +
    QUOTENAME(ISNULL(urgency_level, ''), '''') + ',' +
    CAST(ISNULL(is_urgent, 0) AS VARCHAR(1)) + ',' +
    CAST(ISNULL(is_returnable, 0) AS VARCHAR(1)) + ',' +
    QUOTENAME(ISNULL(requester_user_id, ''), '''') + ',' +
    ISNULL(QUOTENAME(CAST(requester_office_id AS NVARCHAR(MAX)), ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(CAST(requester_wing_id AS NVARCHAR(MAX)), ''''), 'NULL') + ',' +
    QUOTENAME(CAST(submitted_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(ISNULL(approval_status, ''), '''') + ',' +
    ISNULL(QUOTENAME(supervisor_id, ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(CAST(supervisor_reviewed_at AS VARCHAR(30)), ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(supervisor_comments, ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(supervisor_action, ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(admin_id, ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(CAST(admin_reviewed_at AS VARCHAR(30)), ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(admin_comments, ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(admin_action, ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(forwarding_reason, ''''), 'NULL') + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.stock_issuance_requests
ORDER BY id;
GO

-- =====================================================
-- STOCK ISSUANCE ITEMS
-- =====================================================

PRINT '';
PRINT '-- ===== STOCK ISSUANCE ITEMS =====';
GO

SELECT 
    'INSERT INTO stock_issuance_items (id, request_id, item_master_id, quantity_requested, quantity_issued, quantity_returned, issuance_date, return_date, created_at, updated_at) VALUES (' +
    QUOTENAME(CAST(id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(CAST(request_id AS NVARCHAR(MAX)), '''') + ',' +
    QUOTENAME(CAST(item_master_id AS NVARCHAR(MAX)), '''') + ',' +
    CAST(quantity_requested AS VARCHAR(10)) + ',' +
    CAST(ISNULL(quantity_issued, 0) AS VARCHAR(10)) + ',' +
    CAST(ISNULL(quantity_returned, 0) AS VARCHAR(10)) + ',' +
    ISNULL(QUOTENAME(CAST(issuance_date AS VARCHAR(30)), ''''), 'NULL') + ',' +
    ISNULL(QUOTENAME(CAST(return_date AS VARCHAR(30)), ''''), 'NULL') + ',' +
    QUOTENAME(CAST(created_at AS VARCHAR(30)), '''') + ',' +
    QUOTENAME(CAST(updated_at AS VARCHAR(30)), '''') + ');'
FROM [SYED-FAZLI-LAPT].InventoryManagementDB.dbo.stock_issuance_items
ORDER BY id;
GO

PRINT '';
PRINT '========================================';
PRINT '✅ INSERT STATEMENTS GENERATED';
PRINT '========================================';
GO
