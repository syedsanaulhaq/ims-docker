-- ============================================================================
-- Reset all Deliveries, POs, and Stock data for fresh start
-- Run this before entering Opening Balance
-- ============================================================================
SET QUOTED_IDENTIFIER ON;
GO

-- Reset Opening Balance Status (to start fresh)
UPDATE system_settings SET setting_value = NULL WHERE setting_key = 'go_live_date';
UPDATE system_settings SET setting_value = 'false' WHERE setting_key = 'opening_balance_completed';
PRINT '✅ Reset go_live_date and opening_balance_completed';
GO

-- Delete delivery items first (FK constraint)
DELETE FROM delivery_items;
PRINT '✅ Deleted all delivery_items';
GO

-- Delete deliveries
DELETE FROM deliveries;
PRINT '✅ Deleted all deliveries';
GO

-- Delete stock transactions (from deliveries)
DELETE FROM stock_transactions WHERE reference_type = 'PURCHASE_ORDER';
PRINT '✅ Deleted stock transactions from POs';
GO

-- Delete stock acquisitions (from deliveries, not opening balance)
DELETE FROM stock_acquisitions WHERE delivery_id IS NOT NULL;
PRINT '✅ Deleted stock acquisitions from deliveries';
GO

-- Reset current_inventory_stock (will rebuild from opening balance)
DELETE FROM current_inventory_stock;
PRINT '✅ Cleared current_inventory_stock';
GO

-- Delete purchase order items
DELETE FROM purchase_order_items;
PRINT '✅ Deleted all purchase_order_items';
GO

-- Delete purchase orders  
DELETE FROM purchase_orders;
PRINT '✅ Deleted all purchase_orders';
GO

-- Delete opening balance entries (start fresh)
DELETE FROM opening_balance_entries;
PRINT '✅ Deleted all opening_balance_entries';
GO

-- Delete all remaining stock acquisitions
DELETE FROM stock_acquisitions;
PRINT '✅ Deleted all stock_acquisitions';
GO

-- Show summary
PRINT '';
PRINT '╔════════════════════════════════════════════════════════════╗';
PRINT '║            DATA RESET COMPLETE - FRESH START               ║';
PRINT '╠════════════════════════════════════════════════════════════╣';
SELECT 
  (SELECT COUNT(*) FROM deliveries) AS Deliveries,
  (SELECT COUNT(*) FROM delivery_items) AS DeliveryItems,
  (SELECT COUNT(*) FROM purchase_orders) AS POs,
  (SELECT COUNT(*) FROM purchase_order_items) AS POItems,
  (SELECT COUNT(*) FROM stock_acquisitions) AS Acquisitions,
  (SELECT COUNT(*) FROM current_inventory_stock) AS InventoryStock,
  (SELECT COUNT(*) FROM opening_balance_entries) AS OpeningBalance;
PRINT '╚════════════════════════════════════════════════════════════╝';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Go to Opening Balance Entry page';
PRINT '2. Enter your existing stock items';
PRINT '3. This sets the go-live date';
PRINT '4. After that, create POs and Deliveries with dates >= go-live date';
GO
