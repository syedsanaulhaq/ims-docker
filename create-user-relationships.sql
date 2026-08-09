-- ====================================================================
-- 👥 INTEGRATE ASPNETUSERS - PART 2: CREATE FOREIGN KEY RELATIONSHIPS
-- ====================================================================

USE InvMISDB;
GO

PRINT '🔗 CREATING FOREIGN KEY RELATIONSHIPS WITH ASPNETUSERS...';

-- Get a sample user ID for assignment
DECLARE @SampleUserID nvarchar(450);
SELECT TOP 1 @SampleUserID = Id FROM AspNetUsers WHERE Id IS NOT NULL ORDER BY UserName;

PRINT 'Sample User ID: ' + ISNULL(@SampleUserID, 'NULL');

-- Assign sample user to existing NULL records
IF @SampleUserID IS NOT NULL
BEGIN
    UPDATE ProcurementRequests SET requested_by = @SampleUserID WHERE requested_by IS NULL;
    UPDATE ApprovalWorkflow SET approver_id = @SampleUserID WHERE approver_id IS NULL;
    UPDATE TenderAwards SET created_by = @SampleUserID WHERE created_by IS NULL;
    UPDATE Deliveries SET received_by = @SampleUserID WHERE received_by IS NULL;
    UPDATE CurrentStock SET updated_by = @SampleUserID WHERE updated_by IS NULL;
    UPDATE StockTransactions SET created_by = @SampleUserID WHERE created_by IS NULL;
    
    PRINT '✅ Assigned sample user to existing records';
END

-- ProcurementRequests → AspNetUsers
ALTER TABLE ProcurementRequests 
ADD CONSTRAINT FK_ProcurementRequests_AspNetUsers 
FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id);
PRINT '✅ FK_ProcurementRequests_AspNetUsers created';

-- ApprovalWorkflow → AspNetUsers
ALTER TABLE ApprovalWorkflow 
ADD CONSTRAINT FK_ApprovalWorkflow_AspNetUsers 
FOREIGN KEY (approver_id) REFERENCES AspNetUsers(Id);
PRINT '✅ FK_ApprovalWorkflow_AspNetUsers created';

-- TenderAwards → AspNetUsers
ALTER TABLE TenderAwards 
ADD CONSTRAINT FK_TenderAwards_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);
PRINT '✅ FK_TenderAwards_AspNetUsers created';

-- Deliveries → AspNetUsers
ALTER TABLE Deliveries 
ADD CONSTRAINT FK_Deliveries_AspNetUsers 
FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id);
PRINT '✅ FK_Deliveries_AspNetUsers created';

-- CurrentStock → AspNetUsers
ALTER TABLE CurrentStock 
ADD CONSTRAINT FK_CurrentStock_AspNetUsers 
FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id);
PRINT '✅ FK_CurrentStock_AspNetUsers created';

-- StockTransactions → AspNetUsers
ALTER TABLE StockTransactions 
ADD CONSTRAINT FK_StockTransactions_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);
PRINT '✅ FK_StockTransactions_AspNetUsers created';

-- Count total relationships
SELECT 'Total Foreign Key Relationships: ' + CAST(COUNT(*) AS VARCHAR(10)) as Summary
FROM sys.foreign_keys;

SELECT '🎉 ASPNETUSERS INTEGRATION COMPLETE!' as Result;

GO
