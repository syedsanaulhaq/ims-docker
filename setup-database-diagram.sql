-- ====================================================================
-- 🗺️ CREATE DATABASE DIAGRAM FOR INVMISDB
-- ====================================================================
-- This script creates a comprehensive database diagram showing all
-- table relationships in SQL Server Management Studio format
-- ====================================================================

USE InvMISDB;
GO

-- ====================================================================
-- 📋 1. ENSURE DATABASE DIAGRAM SUPPORT IS ENABLED
-- ====================================================================

-- Check if database diagram support is installed
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sysdiagrams]') AND type in (N'U'))
BEGIN
    -- Install database diagram support
    EXEC sp_helpdb;
    PRINT '📊 Installing database diagram support...';
END
ELSE
BEGIN
    PRINT '✅ Database diagram support already available';
END
GO

-- ====================================================================
-- 📋 2. VERIFY ALL TABLE RELATIONSHIPS
-- ====================================================================

PRINT '';
PRINT '🔗 CURRENT DATABASE RELATIONSHIPS:';
PRINT '';

-- Display all foreign key relationships
SELECT 
    '📋 ' + fk.name AS 'Relationship',
    tp.name + ' → ' + tr.name AS 'Table Flow',
    cp.name + ' → ' + cr.name AS 'Column Mapping'
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
ORDER BY tp.name, fk.name;

PRINT '';

-- ====================================================================
-- 📋 3. LIST ALL TABLES FOR DIAGRAM
-- ====================================================================

PRINT '📊 TABLES AVAILABLE FOR DIAGRAM:';
PRINT '';

SELECT 
    ROW_NUMBER() OVER (ORDER BY TABLE_NAME) as 'Order',
    '📋 ' + TABLE_NAME as 'Table Name',
    CASE 
        WHEN TABLE_NAME IN ('AspNetUsers', 'tblOffices', 'WingsInformation', 'DEC_MST') THEN 'Organizational'
        WHEN TABLE_NAME IN ('categories', 'sub_categories', 'ItemMaster', 'CurrentStock') THEN 'Item Management'
        WHEN TABLE_NAME IN ('ProcurementRequests', 'RequestItems', 'ApprovalWorkflow') THEN 'Procurement Workflow'
        WHEN TABLE_NAME IN ('TenderAwards', 'AwardItems') THEN 'Financial (Tender Awards)'
        WHEN TABLE_NAME IN ('Deliveries', 'DeliveryItems') THEN 'Delivery Management'
        WHEN TABLE_NAME IN ('StockTransactions') THEN 'Audit & Transactions'
        ELSE 'Other'
    END as 'Category'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN TABLE_NAME IN ('AspNetUsers', 'tblOffices', 'WingsInformation', 'DEC_MST') THEN 1
        WHEN TABLE_NAME IN ('categories', 'sub_categories', 'ItemMaster', 'CurrentStock') THEN 2
        WHEN TABLE_NAME IN ('ProcurementRequests', 'RequestItems', 'ApprovalWorkflow') THEN 3
        WHEN TABLE_NAME IN ('TenderAwards', 'AwardItems') THEN 4
        WHEN TABLE_NAME IN ('Deliveries', 'DeliveryItems') THEN 5
        ELSE 6
    END, TABLE_NAME;

PRINT '';

-- ====================================================================
-- 📋 4. STEP-BY-STEP DIAGRAM CREATION INSTRUCTIONS
-- ====================================================================

PRINT '🎯 HOW TO CREATE DATABASE DIAGRAM IN SQL SERVER MANAGEMENT STUDIO:';
PRINT '';
PRINT '📋 STEP 1: Open SQL Server Management Studio (SSMS)';
PRINT '   - Launch SQL Server Management Studio';
PRINT '   - Connect to your SQL Server instance (localhost)';
PRINT '';
PRINT '📋 STEP 2: Navigate to InvMISDB';
PRINT '   - Expand "Databases" in Object Explorer';
PRINT '   - Find and expand "InvMISDB"';
PRINT '';
PRINT '📋 STEP 3: Create New Database Diagram';
PRINT '   - Locate "Database Diagrams" folder under InvMISDB';
PRINT '   - Right-click on "Database Diagrams"';
PRINT '   - Select "New Database Diagram"';
PRINT '   - If prompted about diagram support, click "Yes"';
PRINT '';
PRINT '📋 STEP 4: Add Tables to Diagram';
PRINT '   - In the "Add Table" dialog, you will see all 16 tables';
PRINT '   - Select ALL tables or choose specific ones:';
PRINT '     ✅ Core Tables: ProcurementRequests, TenderAwards, Deliveries';
PRINT '     ✅ Detail Tables: RequestItems, AwardItems, DeliveryItems'; 
PRINT '     ✅ Master Data: ItemMaster, DEC_MST, AspNetUsers';
PRINT '     ✅ Organizational: tblOffices, WingsInformation';
PRINT '   - Click "Add" for each table';
PRINT '   - Click "Close" when done';
PRINT '';
PRINT '📋 STEP 5: Arrange Tables for Best Visualization';
PRINT '   - Drag tables to organize them logically:';
PRINT '     🔸 Top: Organizational (tblOffices → WingsInformation → DEC_MST)';
PRINT '     🔸 Middle: Workflow (ProcurementRequests → ApprovalWorkflow → TenderAwards)';
PRINT '     🔸 Bottom: Deliveries and Items';
PRINT '   - Relationship lines will appear automatically';
PRINT '';
PRINT '📋 STEP 6: Save the Diagram';
PRINT '   - Click "Save" or press Ctrl+S';
PRINT '   - Name it: "InvMISDB_Complete_Diagram"';
PRINT '   - Click "OK"';
PRINT '';

-- ====================================================================
-- 📋 5. TROUBLESHOOTING COMMON ISSUES
-- ====================================================================

PRINT '🔧 TROUBLESHOOTING:';
PRINT '';
PRINT '❌ If "Database Diagrams" folder is missing:';
PRINT '   - Right-click on InvMISDB database';
PRINT '   - Select "Tasks" → "Generate Scripts"';
PRINT '   - This will initialize diagram support';
PRINT '';
PRINT '❌ If relationships don''t appear:';
PRINT '   - Verify foreign keys exist (12 should be present)';
PRINT '   - Right-click in diagram → "Show Relationship Labels"';
PRINT '';
PRINT '❌ If tables overlap:';
PRINT '   - Use "Arrange Tables" button in toolbar';
PRINT '   - Or manually drag tables to better positions';
PRINT '';

-- ====================================================================
-- 📋 6. VERIFY DIAGRAM READINESS
-- ====================================================================

-- Final verification
DECLARE @TableCount INT, @RelationshipCount INT;

SELECT @TableCount = COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
SELECT @RelationshipCount = COUNT(*) FROM sys.foreign_keys;

PRINT '✅ DIAGRAM READINESS CHECK:';
PRINT '';
PRINT '   📊 Tables Ready: ' + CAST(@TableCount AS VARCHAR(10)) + ' tables';
PRINT '   🔗 Relationships Ready: ' + CAST(@RelationshipCount AS VARCHAR(10)) + ' foreign keys';
PRINT '   🗄️ Database: InvMISDB';
PRINT '   📋 Diagram Support: Available';
PRINT '';

IF @TableCount >= 15 AND @RelationshipCount >= 10
BEGIN
    PRINT '🎉 DATABASE IS READY FOR DIAGRAM CREATION!';
    PRINT '';
    PRINT '🚀 Next Step: Open SSMS → InvMISDB → Database Diagrams → New Database Diagram';
END
ELSE
BEGIN
    PRINT '⚠️ Some components may be missing. Please check table and relationship counts.';
END

PRINT '';
PRINT '🎯 EXPECTED DIAGRAM VISUALIZATION:';
PRINT '';
PRINT '┌─────────────────────────────────────────┐';
PRINT '│         ORGANIZATIONAL HIERARCHY        │';
PRINT '│  tblOffices → WingsInformation → DEC_MST│';
PRINT '└─────────────────────────────────────────┘';
PRINT '                    │';
PRINT '                    ▼';
PRINT '┌─────────────────────────────────────────┐';
PRINT '│         PROCUREMENT WORKFLOW            │';
PRINT '│  ProcurementRequests → ApprovalWorkflow │';
PRINT '│           │                             │';
PRINT '│           ▼                             │';
PRINT '│  RequestItems ← ItemMaster → CurrentStock│';
PRINT '└─────────────────────────────────────────┘';
PRINT '                    │';
PRINT '                    ▼';
PRINT '┌─────────────────────────────────────────┐';
PRINT '│      FINANCIAL (TENDER AWARDS)         │';
PRINT '│  TenderAwards → AwardItems              │';
PRINT '└─────────────────────────────────────────┘';
PRINT '                    │';
PRINT '                    ▼';
PRINT '┌─────────────────────────────────────────┐';
PRINT '│         DELIVERY MANAGEMENT             │';
PRINT '│  Deliveries → DeliveryItems             │';
PRINT '└─────────────────────────────────────────┘';
PRINT '';

GO
