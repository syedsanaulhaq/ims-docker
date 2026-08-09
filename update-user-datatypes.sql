-- ====================================================================
-- 👥 INTEGRATE ASPNETUSERS - PART 1: UPDATE DATA TYPES
-- ====================================================================

USE InvMISDB;
GO

PRINT '👥 ASPNETUSERS INTEGRATION - UPDATING DATA TYPES...';

-- Update ProcurementRequests.requested_by
ALTER TABLE ProcurementRequests ALTER COLUMN requested_by nvarchar(450);
PRINT '✅ Updated ProcurementRequests.requested_by to nvarchar(450)';

-- Update ApprovalWorkflow.approver_id  
ALTER TABLE ApprovalWorkflow ALTER COLUMN approver_id nvarchar(450);
PRINT '✅ Updated ApprovalWorkflow.approver_id to nvarchar(450)';

-- Update TenderAwards.created_by
ALTER TABLE TenderAwards ALTER COLUMN created_by nvarchar(450);
PRINT '✅ Updated TenderAwards.created_by to nvarchar(450)';

-- Update Deliveries.received_by
ALTER TABLE Deliveries ALTER COLUMN received_by nvarchar(450);
PRINT '✅ Updated Deliveries.received_by to nvarchar(450)';

-- Update CurrentStock.updated_by
ALTER TABLE CurrentStock ALTER COLUMN updated_by nvarchar(450);
PRINT '✅ Updated CurrentStock.updated_by to nvarchar(450)';

-- Update StockTransactions.created_by
ALTER TABLE StockTransactions ALTER COLUMN created_by nvarchar(450);
PRINT '✅ Updated StockTransactions.created_by to nvarchar(450)';

SELECT '✅ All data types updated successfully!' as Status;

GO
