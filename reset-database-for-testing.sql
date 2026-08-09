-- ============================================================================
-- Clear Procurement Request Test Data
-- ============================================================================
-- Remove all test procurement requests, items, and related data
-- to reset database for fresh testing
-- ============================================================================

USE InvMISDB;
GO

PRINT '========================================';
PRINT 'CLEARING TEST DATA FOR FRESH START';
PRINT '========================================';
PRINT '';

-- Show current state
PRINT 'BEFORE CLEANUP:';
SELECT 'ProcurementRequests' as [Table Name], COUNT(*) as [Records] 
FROM ProcurementRequests
UNION ALL
SELECT 'RequestItems', COUNT(*) FROM RequestItems
UNION ALL
SELECT 'ApprovalWorkflow', COUNT(*) FROM ApprovalWorkflow
UNION ALL
SELECT 'StockTransactions', COUNT(*) FROM StockTransactions
UNION ALL
SELECT 'CurrentStock', COUNT(*) FROM CurrentStock;

PRINT '';
PRINT 'Clearing data...';
PRINT '';

-- Disable constraints
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

-- Delete in correct order (dependencies)
BEGIN TRY
    DELETE FROM RequestItems;
    PRINT '✓ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows from RequestItems';
    
    DELETE FROM ApprovalWorkflow;
    PRINT '✓ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows from ApprovalWorkflow';
    
    DELETE FROM ProcurementRequests;
    PRINT '✓ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows from ProcurementRequests';
    
    DELETE FROM StockTransactions;
    PRINT '✓ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows from StockTransactions';
    
    DELETE FROM CurrentStock;
    PRINT '✓ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows from CurrentStock';
    
END TRY
BEGIN CATCH
    PRINT 'ERROR: ' + ERROR_MESSAGE();
    PRINT 'Attempting to re-enable constraints...';
    EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
    THROW;
END CATCH

-- Re-enable constraints
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

PRINT '';
PRINT 'AFTER CLEANUP:';
SELECT 'ProcurementRequests' as [Table Name], COUNT(*) as [Records] 
FROM ProcurementRequests
UNION ALL
SELECT 'RequestItems', COUNT(*) FROM RequestItems
UNION ALL
SELECT 'ApprovalWorkflow', COUNT(*) FROM ApprovalWorkflow
UNION ALL
SELECT 'StockTransactions', COUNT(*) FROM StockTransactions
UNION ALL
SELECT 'CurrentStock', COUNT(*) FROM CurrentStock;

PRINT '';
PRINT '========================================';
PRINT '✓ DATABASE RESET COMPLETE';
PRINT '========================================';
PRINT 'Ready for fresh testing!';
GO
