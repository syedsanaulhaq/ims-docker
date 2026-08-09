-- ====================================================================
-- 👥 INTEGRATE ASPNETUSERS WITH INVENTORY SYSTEM
-- ====================================================================
-- This script updates data types and creates foreign key relationships
-- to fully integrate AspNetUsers with the inventory management system
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. SHOW CURRENT ASPNETUSERS DATA
-- ====================================================================

PRINT '👥 ASPNETUSERS INTEGRATION STARTING...';
PRINT '';

SELECT 'AspNetUsers Available:' as Info;
SELECT 
    COUNT(*) as TotalUsers,
    MIN(Id) as SampleUserID,
    MAX(LEN(Id)) as MaxIdLength
FROM AspNetUsers;

SELECT 'Sample Users:' as Info;
SELECT TOP 3 
    Id,
    UserName,
    Email
FROM AspNetUsers 
WHERE UserName IS NOT NULL
ORDER BY UserName;

-- ====================================================================
-- 📋 2. UPDATE DATA TYPES FOR USER REFERENCES
-- ====================================================================

PRINT '';
PRINT '🔧 UPDATING DATA TYPES TO MATCH ASPNETUSERS.ID...';

-- Update ProcurementRequests.requested_by
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProcurementRequests' AND COLUMN_NAME = 'requested_by' AND DATA_TYPE = 'int')
BEGIN
    -- Set existing int values to NULL first (since we can't convert int to nvarchar(450) directly)
    UPDATE ProcurementRequests SET requested_by = NULL;
    
    -- Change data type
    ALTER TABLE ProcurementRequests ALTER COLUMN requested_by nvarchar(450);
    PRINT '✅ Updated ProcurementRequests.requested_by to nvarchar(450)';
END

-- Update ApprovalWorkflow.approver_id  
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ApprovalWorkflow' AND COLUMN_NAME = 'approver_id' AND DATA_TYPE = 'int')
BEGIN
    UPDATE ApprovalWorkflow SET approver_id = NULL;
    ALTER TABLE ApprovalWorkflow ALTER COLUMN approver_id nvarchar(450);
    PRINT '✅ Updated ApprovalWorkflow.approver_id to nvarchar(450)';
END

-- Update TenderAwards.created_by
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TenderAwards' AND COLUMN_NAME = 'created_by' AND DATA_TYPE = 'int')
BEGIN
    UPDATE TenderAwards SET created_by = NULL;
    ALTER TABLE TenderAwards ALTER COLUMN created_by nvarchar(450);
    PRINT '✅ Updated TenderAwards.created_by to nvarchar(450)';
END

-- Update Deliveries.received_by
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Deliveries' AND COLUMN_NAME = 'received_by' AND DATA_TYPE = 'int')
BEGIN
    UPDATE Deliveries SET received_by = NULL;
    ALTER TABLE Deliveries ALTER COLUMN received_by nvarchar(450);
    PRINT '✅ Updated Deliveries.received_by to nvarchar(450)';
END

-- Update CurrentStock.updated_by
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CurrentStock' AND COLUMN_NAME = 'updated_by' AND DATA_TYPE = 'int')
BEGIN
    UPDATE CurrentStock SET updated_by = NULL;
    ALTER TABLE CurrentStock ALTER COLUMN updated_by nvarchar(450);
    PRINT '✅ Updated CurrentStock.updated_by to nvarchar(450)';
END

-- Update StockTransactions.created_by
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StockTransactions' AND COLUMN_NAME = 'created_by' AND DATA_TYPE = 'int')
BEGIN
    UPDATE StockTransactions SET created_by = NULL;
    ALTER TABLE StockTransactions ALTER COLUMN created_by nvarchar(450);
    PRINT '✅ Updated StockTransactions.created_by to nvarchar(450)';
END

-- ====================================================================
-- 📋 3. ASSIGN SAMPLE USER IDS
-- ====================================================================

PRINT '';
PRINT '👤 ASSIGNING SAMPLE USER IDS TO EXISTING RECORDS...';

-- Get first available user ID for assignment
DECLARE @SampleUserID nvarchar(450);
SELECT TOP 1 @SampleUserID = Id FROM AspNetUsers WHERE Id IS NOT NULL ORDER BY UserName;

IF @SampleUserID IS NOT NULL
BEGIN
    -- Assign sample user to existing records for demonstration
    UPDATE ProcurementRequests SET requested_by = @SampleUserID WHERE requested_by IS NULL;
    UPDATE TenderAwards SET created_by = @SampleUserID WHERE created_by IS NULL;
    UPDATE Deliveries SET received_by = @SampleUserID WHERE received_by IS NULL;
    UPDATE CurrentStock SET updated_by = @SampleUserID WHERE updated_by IS NULL;
    UPDATE StockTransactions SET created_by = @SampleUserID WHERE created_by IS NULL;
    
    PRINT '✅ Assigned sample user ID to existing records';
    PRINT 'Sample User ID: ' + @SampleUserID;
END

-- ====================================================================
-- 📋 4. CREATE FOREIGN KEY RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '🔗 CREATING FOREIGN KEY RELATIONSHIPS WITH ASPNETUSERS...';

-- ProcurementRequests → AspNetUsers
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ProcurementRequests_AspNetUsers')
BEGIN
    ALTER TABLE ProcurementRequests 
    ADD CONSTRAINT FK_ProcurementRequests_AspNetUsers 
    FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id);
    PRINT '✅ FK_ProcurementRequests_AspNetUsers created';
END

-- ApprovalWorkflow → AspNetUsers
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ApprovalWorkflow_AspNetUsers')
BEGIN
    ALTER TABLE ApprovalWorkflow 
    ADD CONSTRAINT FK_ApprovalWorkflow_AspNetUsers 
    FOREIGN KEY (approver_id) REFERENCES AspNetUsers(Id);
    PRINT '✅ FK_ApprovalWorkflow_AspNetUsers created';
END

-- TenderAwards → AspNetUsers
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TenderAwards_AspNetUsers')
BEGIN
    ALTER TABLE TenderAwards 
    ADD CONSTRAINT FK_TenderAwards_AspNetUsers 
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);
    PRINT '✅ FK_TenderAwards_AspNetUsers created';
END

-- Deliveries → AspNetUsers
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Deliveries_AspNetUsers')
BEGIN
    ALTER TABLE Deliveries 
    ADD CONSTRAINT FK_Deliveries_AspNetUsers 
    FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id);
    PRINT '✅ FK_Deliveries_AspNetUsers created';
END

-- CurrentStock → AspNetUsers
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_CurrentStock_AspNetUsers')
BEGIN
    ALTER TABLE CurrentStock 
    ADD CONSTRAINT FK_CurrentStock_AspNetUsers 
    FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id);
    PRINT '✅ FK_CurrentStock_AspNetUsers created';
END

-- StockTransactions → AspNetUsers
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StockTransactions_AspNetUsers')
BEGIN
    ALTER TABLE StockTransactions 
    ADD CONSTRAINT FK_StockTransactions_AspNetUsers 
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);
    PRINT '✅ FK_StockTransactions_AspNetUsers created';
END

-- ====================================================================
-- 📋 5. VERIFY USER RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '📊 VERIFYING ASPNETUSERS RELATIONSHIPS...';

SELECT 'AspNetUsers Foreign Key Relationships:' as Info;
SELECT 
    fk.name AS 'Foreign Key Name',
    tp.name AS 'Table',
    cp.name AS 'Column',
    'AspNetUsers' AS 'References'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
WHERE tr.name = 'AspNetUsers'
ORDER BY tp.name;

-- Count total relationships now
DECLARE @TotalRelationships INT;
SELECT @TotalRelationships = COUNT(*) FROM sys.foreign_keys;

SELECT 'Total Foreign Key Relationships: ' + CAST(@TotalRelationships AS VARCHAR(10)) as Summary;

-- ====================================================================
-- 📋 6. SHOW SAMPLE DATA WITH USER INFORMATION
-- ====================================================================

PRINT '';
PRINT '📋 SAMPLE DATA WITH USER INFORMATION:';

-- Show procurement requests with user info
SELECT 'ProcurementRequests with Users:' as Info;
SELECT TOP 3
    pr.request_id,
    pr.title,
    u.UserName as RequestedBy,
    u.Email
FROM ProcurementRequests pr
LEFT JOIN AspNetUsers u ON pr.requested_by = u.Id
ORDER BY pr.request_id;

-- Show approvals with user info  
SELECT 'ApprovalWorkflow with Users:' as Info;
SELECT TOP 3
    aw.approval_id,
    aw.approval_level,
    aw.status,
    u.UserName as ApproverName
FROM ApprovalWorkflow aw
LEFT JOIN AspNetUsers u ON aw.approver_id = u.Id
ORDER BY aw.approval_id;

-- ====================================================================
-- 📋 7. USEFUL QUERIES FOR USER TRACKING
-- ====================================================================

PRINT '';
PRINT '📋 USEFUL USER TRACKING QUERIES:';
PRINT '';
PRINT '-- Get all requests by a specific user:';
PRINT 'SELECT pr.title, pr.request_date FROM ProcurementRequests pr';
PRINT 'JOIN AspNetUsers u ON pr.requested_by = u.Id';
PRINT 'WHERE u.UserName = ''username'';';
PRINT '';
PRINT '-- Get approval history for a request:';
PRINT 'SELECT u.UserName, aw.status, aw.approval_date FROM ApprovalWorkflow aw';
PRINT 'JOIN AspNetUsers u ON aw.approver_id = u.Id';
PRINT 'WHERE aw.request_id = 1;';
PRINT '';
PRINT '-- Get delivery receipts by user:';
PRINT 'SELECT d.delivery_date, u.UserName FROM Deliveries d';
PRINT 'JOIN AspNetUsers u ON d.received_by = u.Id;';

SELECT '🎉 ASPNETUSERS INTEGRATION COMPLETE!' as Result;
SELECT 'Your inventory system is now fully integrated with ERP user authentication!' as Status;

GO
