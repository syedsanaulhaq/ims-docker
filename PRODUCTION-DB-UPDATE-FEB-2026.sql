-- =====================================================
-- PRODUCTION DATABASE UPDATE - February 2026
-- Personal Dashboard & Approval Workflow Support
-- =====================================================
-- This script ensures all required database objects exist
-- for the Personal Dashboard and approval workflow endpoints
-- Safe to run multiple times (checks for existence first)
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '========================================';
PRINT 'PRODUCTION DB UPDATE - February 2026';
PRINT 'Personal Dashboard & Approval Support';
PRINT '========================================';
GO

-- =====================================================
-- SECTION 1: Required Views for Approval Endpoints
-- =====================================================

PRINT '';
PRINT '1️⃣  Checking approval workflow views...';
GO

-- View 1: vw_pending_supervisor_approvals
IF OBJECT_ID('dbo.vw_pending_supervisor_approvals', 'V') IS NULL
BEGIN
    PRINT '   Creating vw_pending_supervisor_approvals...';
    EXEC('
    CREATE VIEW dbo.vw_pending_supervisor_approvals AS
    SELECT 
        sir.id as request_id,
        sir.request_number,
        sir.request_type,
        sir.purpose,
        sir.urgency_level,
        sir.is_urgent,
        sir.is_returnable,
        sir.requester_user_id,
        u.FullName as requester_name,
        u.Email as requester_email,
        sir.requester_office_id,
        sir.requester_wing_id,
        sir.submitted_at,
        DATEDIFF(HOUR, sir.submitted_at, GETDATE()) as pending_hours,
        (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id) as total_items
    FROM stock_issuance_requests sir
    LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
    WHERE sir.approval_status = ''Pending'' 
       OR sir.approval_status = ''Pending Supervisor Review''
    ');
    PRINT '   ✅ Created vw_pending_supervisor_approvals';
END
ELSE
    PRINT '   ✅ vw_pending_supervisor_approvals already exists';
GO

-- View 2: vw_pending_admin_approvals
IF OBJECT_ID('dbo.vw_pending_admin_approvals', 'V') IS NULL
BEGIN
    PRINT '   Creating vw_pending_admin_approvals...';
    EXEC('
    CREATE VIEW dbo.vw_pending_admin_approvals AS
    SELECT 
        sir.id as request_id,
        sir.request_number,
        sir.request_type,
        sir.purpose,
        sir.urgency_level,
        sir.is_urgent,
        sir.forwarding_reason,
        sir.requester_user_id,
        u.FullName as requester_name,
        u.Email as requester_email,
        sir.requester_office_id,
        sir.requester_wing_id,
        sir.supervisor_id,
        sup.FullName as supervisor_name,
        sir.supervisor_reviewed_at as forwarded_at,
        sir.submitted_at,
        DATEDIFF(HOUR, ISNULL(sir.supervisor_reviewed_at, sir.submitted_at), GETDATE()) as pending_hours,
        (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id) as total_items
    FROM stock_issuance_requests sir
    LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
    LEFT JOIN AspNetUsers sup ON sir.supervisor_id = sup.Id
    WHERE sir.approval_status IN (''Forwarded to Admin'', ''Pending Admin Review'')
    ');
    PRINT '   ✅ Created vw_pending_admin_approvals';
END
ELSE
    PRINT '   ✅ vw_pending_admin_approvals already exists';
GO

-- =====================================================
-- SECTION 2: Verify Required Tables Exist
-- =====================================================

PRINT '';
PRINT '2️⃣  Verifying required tables...';
GO

-- Check stock_issuance_requests table
IF OBJECT_ID('dbo.stock_issuance_requests', 'U') IS NULL
BEGIN
    PRINT '   ❌ ERROR: stock_issuance_requests table does not exist!';
    PRINT '   Please run the stock issuance setup scripts first.';
    RAISERROR('Required table stock_issuance_requests is missing', 16, 1);
END
ELSE
    PRINT '   ✅ stock_issuance_requests table exists';
GO

-- Check stock_issuance_items table
IF OBJECT_ID('dbo.stock_issuance_items', 'U') IS NULL
BEGIN
    PRINT '   ❌ ERROR: stock_issuance_items table does not exist!';
    RAISERROR('Required table stock_issuance_items is missing', 16, 1);
END
ELSE
    PRINT '   ✅ stock_issuance_items table exists';
GO

-- Check item_masters table
IF OBJECT_ID('dbo.item_masters', 'U') IS NULL
BEGIN
    PRINT '   ❌ ERROR: item_masters table does not exist!';
    RAISERROR('Required table item_masters is missing', 16, 1);
END
ELSE
    PRINT '   ✅ item_masters table exists';
GO

-- Check current_inventory_stock table
IF OBJECT_ID('dbo.current_inventory_stock', 'U') IS NULL
BEGIN
    PRINT '   ❌ ERROR: current_inventory_stock table does not exist!';
    RAISERROR('Required table current_inventory_stock is missing', 16, 1);
END
ELSE
    PRINT '   ✅ current_inventory_stock table exists';
GO

-- =====================================================
-- SECTION 3: Verify Required Columns
-- =====================================================

PRINT '';
PRINT '3️⃣  Verifying required columns...';
GO

-- Check approval_status column
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_issuance_requests') 
               AND name = 'approval_status')
BEGIN
    PRINT '   ❌ ERROR: approval_status column missing!';
    RAISERROR('Required column approval_status is missing', 16, 1);
END
ELSE
    PRINT '   ✅ approval_status column exists';
GO

-- Check requester_wing_id column
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('stock_issuance_requests') 
               AND name = 'requester_wing_id')
BEGIN
    PRINT '   ❌ ERROR: requester_wing_id column missing!';
    RAISERROR('Required column requester_wing_id is missing', 16, 1);
END
ELSE
    PRINT '   ✅ requester_wing_id column exists';
GO

-- =====================================================
-- SECTION 4: Verify Indexes for Performance
-- =====================================================

PRINT '';
PRINT '4️⃣  Creating performance indexes...';
GO

-- Index on approval_status for faster filtering
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE object_id = OBJECT_ID('stock_issuance_requests') 
               AND name = 'IX_stock_issuance_requests_approval_status')
BEGIN
    CREATE INDEX IX_stock_issuance_requests_approval_status 
    ON stock_issuance_requests(approval_status);
    PRINT '   ✅ Created index on approval_status';
END
ELSE
    PRINT '   ✅ Index on approval_status already exists';
GO

-- Index on requester_user_id for personal dashboard queries
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE object_id = OBJECT_ID('stock_issuance_requests') 
               AND name = 'IX_stock_issuance_requests_requester_user_id')
BEGIN
    CREATE INDEX IX_stock_issuance_requests_requester_user_id 
    ON stock_issuance_requests(requester_user_id);
    PRINT '   ✅ Created index on requester_user_id';
END
ELSE
    PRINT '   ✅ Index on requester_user_id already exists';
GO

-- Index on requester_wing_id for wing-based filtering
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE object_id = OBJECT_ID('stock_issuance_requests') 
               AND name = 'IX_stock_issuance_requests_requester_wing_id')
BEGIN
    CREATE INDEX IX_stock_issuance_requests_requester_wing_id 
    ON stock_issuance_requests(requester_wing_id);
    PRINT '   ✅ Created index on requester_wing_id';
END
ELSE
    PRINT '   ✅ Index on requester_wing_id already exists';
GO

-- =====================================================
-- SECTION 5: Test Queries
-- =====================================================

PRINT '';
PRINT '5️⃣  Running test queries...';
GO

-- Test view query
DECLARE @pendingCount INT;
SELECT @pendingCount = COUNT(*) FROM vw_pending_supervisor_approvals;
PRINT '   ✅ vw_pending_supervisor_approvals: ' + CAST(@pendingCount AS VARCHAR) + ' records';

SELECT @pendingCount = COUNT(*) FROM vw_pending_admin_approvals;
PRINT '   ✅ vw_pending_admin_approvals: ' + CAST(@pendingCount AS VARCHAR) + ' records';

-- Test issued items query (new endpoint)
DECLARE @issuedCount INT;
SELECT @issuedCount = COUNT(*)
FROM stock_issuance_items sii
INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
WHERE sir.approval_status IN ('Approved', 'Issued');
PRINT '   ✅ Issued items query: ' + CAST(@issuedCount AS VARCHAR) + ' records';

-- Test inventory query
DECLARE @inventoryCount INT;
SELECT @inventoryCount = COUNT(*) FROM current_inventory_stock;
PRINT '   ✅ Current inventory: ' + CAST(@inventoryCount AS VARCHAR) + ' items';

GO

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

PRINT '';
PRINT '========================================';
PRINT '✅ DATABASE UPDATE COMPLETED';
PRINT '========================================';
PRINT '';
PRINT 'New Endpoints Supported:';
PRINT '  • GET /api/approvals/my-pending';
PRINT '  • GET /api/approvals/my-requests/:userId';
PRINT '  • GET /api/stock-issuance/issued-items';
PRINT '  • GET /api/stock-issuance/issued-items?user_id=:id';
PRINT '';
PRINT 'Database Objects Created/Verified:';
PRINT '  • vw_pending_supervisor_approvals (view)';
PRINT '  • vw_pending_admin_approvals (view)';
PRINT '  • Performance indexes on key columns';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Restart backend server: npm run dev:server';
PRINT '  2. Restart frontend: npm run dev:client';
PRINT '  3. Test Personal Dashboard pages';
PRINT '  4. Test Stock Issuance pages';
PRINT '';
PRINT '========================================';
GO
