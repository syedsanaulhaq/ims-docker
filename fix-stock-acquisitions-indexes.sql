-- Fix: Add missing indexes on stock_acquisitions table
-- Run this on the remote server to add indexes that failed due to inline INDEX syntax

USE InventoryManagementDB;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcq_POId' AND object_id = OBJECT_ID('stock_acquisitions'))
BEGIN
    CREATE INDEX IX_StockAcq_POId ON stock_acquisitions(po_id);
    PRINT '  ✓ Added IX_StockAcq_POId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcq_DeliveryId' AND object_id = OBJECT_ID('stock_acquisitions'))
BEGIN
    CREATE INDEX IX_StockAcq_DeliveryId ON stock_acquisitions(delivery_id);
    PRINT '  ✓ Added IX_StockAcq_DeliveryId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcq_Date' AND object_id = OBJECT_ID('stock_acquisitions'))
BEGIN
    CREATE INDEX IX_StockAcq_Date ON stock_acquisitions(acquisition_date);
    PRINT '  ✓ Added IX_StockAcq_Date';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcq_Status' AND object_id = OBJECT_ID('stock_acquisitions'))
BEGIN
    CREATE INDEX IX_StockAcq_Status ON stock_acquisitions(status);
    PRINT '  ✓ Added IX_StockAcq_Status';
END

PRINT 'Done - indexes fixed.';
