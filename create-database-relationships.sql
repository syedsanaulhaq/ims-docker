-- ====================================================================
-- 🔗 CREATE PROPER TABLE RELATIONSHIPS FOR SQL SERVER DIAGRAM
-- ====================================================================
-- This script creates all foreign key relationships between tables
-- to generate a proper database diagram in SQL Server Management Studio
-- ====================================================================

USE SimpleInventoryDB;
GO

-- ====================================================================
-- 📋 1. DROP EXISTING FOREIGN KEY CONSTRAINTS (IF ANY)
-- ====================================================================

-- Function to drop all existing foreign keys
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + 
    '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
    ' DROP CONSTRAINT ' + QUOTENAME(name) + '; '
FROM sys.foreign_keys;

IF LEN(@sql) > 0
    EXEC sp_executesql @sql;

PRINT '✅ Existing foreign key constraints dropped';
GO

-- ====================================================================
-- 📋 2. ADD PRIMARY KEY CONSTRAINTS (IF MISSING)
-- ====================================================================

-- Ensure all tables have proper primary keys
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_AspNetUsers')
    ALTER TABLE AspNetUsers ADD CONSTRAINT PK_AspNetUsers PRIMARY KEY (Id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_categories')
    ALTER TABLE categories ADD CONSTRAINT PK_categories PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_sub_categories')
    ALTER TABLE sub_categories ADD CONSTRAINT PK_sub_categories PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_tblOffices')
    ALTER TABLE tblOffices ADD CONSTRAINT PK_tblOffices PRIMARY KEY (intOfficeID);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_WingsInformation')
    ALTER TABLE WingsInformation ADD CONSTRAINT PK_WingsInformation PRIMARY KEY (Id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_DEC_MST')
    ALTER TABLE DEC_MST ADD CONSTRAINT PK_DEC_MST PRIMARY KEY (intAutoID);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_ItemMaster')
    ALTER TABLE ItemMaster ADD CONSTRAINT PK_ItemMaster PRIMARY KEY (item_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_CurrentStock')
    ALTER TABLE CurrentStock ADD CONSTRAINT PK_CurrentStock PRIMARY KEY (stock_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_ProcurementRequests')
    ALTER TABLE ProcurementRequests ADD CONSTRAINT PK_ProcurementRequests PRIMARY KEY (request_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_RequestItems')
    ALTER TABLE RequestItems ADD CONSTRAINT PK_RequestItems PRIMARY KEY (request_item_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_ApprovalWorkflow')
    ALTER TABLE ApprovalWorkflow ADD CONSTRAINT PK_ApprovalWorkflow PRIMARY KEY (approval_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_TenderAwards')
    ALTER TABLE TenderAwards ADD CONSTRAINT PK_TenderAwards PRIMARY KEY (award_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_AwardItems')
    ALTER TABLE AwardItems ADD CONSTRAINT PK_AwardItems PRIMARY KEY (award_item_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_Deliveries')
    ALTER TABLE Deliveries ADD CONSTRAINT PK_Deliveries PRIMARY KEY (delivery_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_DeliveryItems')
    ALTER TABLE DeliveryItems ADD CONSTRAINT PK_DeliveryItems PRIMARY KEY (delivery_item_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_StockTransactions')
    ALTER TABLE StockTransactions ADD CONSTRAINT PK_StockTransactions PRIMARY KEY (transaction_id);

PRINT '✅ Primary key constraints verified';
GO

-- ====================================================================
-- 📋 3. ORGANIZATIONAL HIERARCHY RELATIONSHIPS
-- ====================================================================

-- WingsInformation → tblOffices
ALTER TABLE WingsInformation 
ADD CONSTRAINT FK_WingsInformation_tblOffices 
FOREIGN KEY (OfficeID) REFERENCES tblOffices(intOfficeID);

-- DEC_MST → WingsInformation
ALTER TABLE DEC_MST 
ADD CONSTRAINT FK_DEC_MST_WingsInformation 
FOREIGN KEY (WingID) REFERENCES WingsInformation(Id);

-- sub_categories → categories
ALTER TABLE sub_categories 
ADD CONSTRAINT FK_sub_categories_categories 
FOREIGN KEY (category_id) REFERENCES categories(id);

PRINT '✅ Organizational hierarchy relationships created';
GO

-- ====================================================================
-- 📋 4. ITEM MANAGEMENT RELATIONSHIPS
-- ====================================================================

-- ItemMaster → categories
ALTER TABLE ItemMaster 
ADD CONSTRAINT FK_ItemMaster_categories 
FOREIGN KEY (category_id) REFERENCES categories(id);

-- CurrentStock → ItemMaster
ALTER TABLE CurrentStock 
ADD CONSTRAINT FK_CurrentStock_ItemMaster 
FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id);

-- CurrentStock → AspNetUsers (updated_by)
ALTER TABLE CurrentStock 
ADD CONSTRAINT FK_CurrentStock_AspNetUsers 
FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id);

-- StockTransactions → ItemMaster
ALTER TABLE StockTransactions 
ADD CONSTRAINT FK_StockTransactions_ItemMaster 
FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id);

-- StockTransactions → AspNetUsers (created_by)
ALTER TABLE StockTransactions 
ADD CONSTRAINT FK_StockTransactions_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);

PRINT '✅ Item management relationships created';
GO

-- ====================================================================
-- 📋 5. PROCUREMENT REQUEST RELATIONSHIPS
-- ====================================================================

-- ProcurementRequests → AspNetUsers (requested_by)
ALTER TABLE ProcurementRequests 
ADD CONSTRAINT FK_ProcurementRequests_AspNetUsers 
FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id);

-- ProcurementRequests → DEC_MST (dec_id)
ALTER TABLE ProcurementRequests 
ADD CONSTRAINT FK_ProcurementRequests_DEC_MST 
FOREIGN KEY (dec_id) REFERENCES DEC_MST(intAutoID);

-- RequestItems → ProcurementRequests
ALTER TABLE RequestItems 
ADD CONSTRAINT FK_RequestItems_ProcurementRequests 
FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id);

-- RequestItems → ItemMaster
ALTER TABLE RequestItems 
ADD CONSTRAINT FK_RequestItems_ItemMaster 
FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id);

PRINT '✅ Procurement request relationships created';
GO

-- ====================================================================
-- 📋 6. APPROVAL WORKFLOW RELATIONSHIPS
-- ====================================================================

-- ApprovalWorkflow → ProcurementRequests
ALTER TABLE ApprovalWorkflow 
ADD CONSTRAINT FK_ApprovalWorkflow_ProcurementRequests 
FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id);

-- ApprovalWorkflow → AspNetUsers (approver_id)
ALTER TABLE ApprovalWorkflow 
ADD CONSTRAINT FK_ApprovalWorkflow_AspNetUsers 
FOREIGN KEY (approver_id) REFERENCES AspNetUsers(Id);

PRINT '✅ Approval workflow relationships created';
GO

-- ====================================================================
-- 📋 7. TENDER AWARD RELATIONSHIPS (FINANCIAL DATA)
-- ====================================================================

-- TenderAwards → ProcurementRequests
ALTER TABLE TenderAwards 
ADD CONSTRAINT FK_TenderAwards_ProcurementRequests 
FOREIGN KEY (request_id) REFERENCES ProcurementRequests(request_id);

-- TenderAwards → AspNetUsers (created_by)
ALTER TABLE TenderAwards 
ADD CONSTRAINT FK_TenderAwards_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);

-- AwardItems → TenderAwards
ALTER TABLE AwardItems 
ADD CONSTRAINT FK_AwardItems_TenderAwards 
FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id);

-- AwardItems → ItemMaster
ALTER TABLE AwardItems 
ADD CONSTRAINT FK_AwardItems_ItemMaster 
FOREIGN KEY (item_id) REFERENCES ItemMaster(item_id);

PRINT '✅ Tender award relationships created';
GO

-- ====================================================================
-- 📋 8. DELIVERY MANAGEMENT RELATIONSHIPS
-- ====================================================================

-- Deliveries → TenderAwards
ALTER TABLE Deliveries 
ADD CONSTRAINT FK_Deliveries_TenderAwards 
FOREIGN KEY (award_id) REFERENCES TenderAwards(award_id);

-- Deliveries → AspNetUsers (received_by)
ALTER TABLE Deliveries 
ADD CONSTRAINT FK_Deliveries_AspNetUsers 
FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id);

-- DeliveryItems → Deliveries
ALTER TABLE DeliveryItems 
ADD CONSTRAINT FK_DeliveryItems_Deliveries 
FOREIGN KEY (delivery_id) REFERENCES Deliveries(delivery_id);

-- DeliveryItems → AwardItems
ALTER TABLE DeliveryItems 
ADD CONSTRAINT FK_DeliveryItems_AwardItems 
FOREIGN KEY (award_item_id) REFERENCES AwardItems(award_item_id);

PRINT '✅ Delivery management relationships created';
GO

-- ====================================================================
-- 📋 9. VERIFY ALL RELATIONSHIPS
-- ====================================================================

PRINT '📊 DATABASE RELATIONSHIP SUMMARY:';
PRINT '';

-- Show all foreign key relationships
SELECT 
    fk.name AS 'Foreign Key Name',
    tp.name AS 'Parent Table',
    cp.name AS 'Parent Column',
    tr.name AS 'Referenced Table', 
    cr.name AS 'Referenced Column'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
ORDER BY tp.name, fk.name;

-- Count relationships by category
PRINT '';
PRINT '🔗 RELATIONSHIP CATEGORIES:';

SELECT 
    CASE 
        WHEN tp.name LIKE '%Wings%' OR tp.name LIKE '%DEC%' OR tp.name LIKE '%Office%' THEN 'Organizational'
        WHEN tp.name LIKE '%Item%' OR tp.name LIKE '%Stock%' OR tp.name LIKE '%categories%' THEN 'Item Management' 
        WHEN tp.name LIKE '%Request%' OR tp.name LIKE '%Approval%' THEN 'Procurement Process'
        WHEN tp.name LIKE '%Award%' OR tp.name LIKE '%Tender%' THEN 'Financial (Tender Awards)'
        WHEN tp.name LIKE '%Delivery%' THEN 'Delivery Management'
        ELSE 'Other'
    END AS 'Category',
    COUNT(*) AS 'Relationship Count'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
GROUP BY 
    CASE 
        WHEN tp.name LIKE '%Wings%' OR tp.name LIKE '%DEC%' OR tp.name LIKE '%Office%' THEN 'Organizational'
        WHEN tp.name LIKE '%Item%' OR tp.name LIKE '%Stock%' OR tp.name LIKE '%categories%' THEN 'Item Management'
        WHEN tp.name LIKE '%Request%' OR tp.name LIKE '%Approval%' THEN 'Procurement Process' 
        WHEN tp.name LIKE '%Award%' OR tp.name LIKE '%Tender%' THEN 'Financial (Tender Awards)'
        WHEN tp.name LIKE '%Delivery%' THEN 'Delivery Management'
        ELSE 'Other'
    END
ORDER BY COUNT(*) DESC;

PRINT '';
PRINT '🎯 DATABASE DIAGRAM READY FOR SQL SERVER!';
PRINT '';
PRINT '📋 Next Steps:';
PRINT '   1. Open SQL Server Management Studio (SSMS)';
PRINT '   2. Connect to your server';
PRINT '   3. Expand SimpleInventoryDB → Database Diagrams';
PRINT '   4. Right-click → New Database Diagram';
PRINT '   5. Add all tables to see the complete relationship diagram';
PRINT '';
PRINT '🔗 Key Relationship Flows:';
PRINT '   📍 Organizational: tblOffices → WingsInformation → DEC_MST';
PRINT '   📦 Item Flow: categories → ItemMaster → CurrentStock';
PRINT '   📝 Procurement: DEC_MST → ProcurementRequests → ApprovalWorkflow'; 
PRINT '   💰 Financial: ProcurementRequests → TenderAwards → AwardItems';
PRINT '   🚚 Delivery: TenderAwards → Deliveries → DeliveryItems';
PRINT '';
PRINT '✅ ALL RELATIONSHIPS SUCCESSFULLY CREATED!';
GO
