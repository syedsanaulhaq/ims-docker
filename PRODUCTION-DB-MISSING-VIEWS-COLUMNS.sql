-- =====================================================
-- PRODUCTION DATABASE UPDATE - February 2026
-- Add Missing Views and Columns for New Endpoints
-- =====================================================
-- This script adds:
-- 1. vw_User_with_designation view (for auth.cjs)
-- 2. vw_my_issuance_requests view (for approvals.cjs)
-- 3. Missing columns in deliveries table
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '========================================';
PRINT 'PROD DB UPDATE - Missing Views/Columns';
PRINT '========================================';
GO

-- =====================================================
-- SECTION 1: Add Missing Columns to Deliveries Table
-- =====================================================

PRINT '';
PRINT '1️⃣  Adding missing columns to deliveries table...';
GO

-- Column 1: po_id
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'po_id')
BEGIN
    ALTER TABLE deliveries ADD po_id UNIQUEIDENTIFIER NULL;
    PRINT '   ✅ Added po_id column';
END
ELSE
    PRINT '   ✅ po_id already exists';
GO

-- Column 2: po_number
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'po_number')
BEGIN
    ALTER TABLE deliveries ADD po_number NVARCHAR(100) NULL;
    PRINT '   ✅ Added po_number column';
END
ELSE
    PRINT '   ✅ po_number already exists';
GO

-- Column 3: received_by
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'received_by')
BEGIN
    ALTER TABLE deliveries ADD received_by NVARCHAR(450) NULL;
    PRINT '   ✅ Added received_by column';
END
ELSE
    PRINT '   ✅ received_by already exists';
GO

-- Column 4: receiving_date
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'receiving_date')
BEGIN
    ALTER TABLE deliveries ADD receiving_date DATETIME2 NULL;
    PRINT '   ✅ Added receiving_date column';
END
ELSE
    PRINT '   ✅ receiving_date already exists';
GO

-- Column 5: delivery_status
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'delivery_status')
BEGIN
    ALTER TABLE deliveries ADD delivery_status NVARCHAR(50) DEFAULT 'Pending' 
        CHECK (delivery_status IN ('Pending', 'Received', 'Partial', 'Rejected', 'Cancelled'));
    PRINT '   ✅ Added delivery_status column';
END
ELSE
    PRINT '   ✅ delivery_status already exists';
GO

-- Column 6: notes
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'notes')
BEGIN
    ALTER TABLE deliveries ADD notes NVARCHAR(MAX) NULL;
    PRINT '   ✅ Added notes column';
END
ELSE
    PRINT '   ✅ notes already exists';
GO

-- =====================================================
-- SECTION 2: Create vw_User_with_designation View
-- =====================================================

PRINT '';
PRINT '2️⃣  Creating vw_User_with_designation view...';
GO

IF OBJECT_ID('dbo.vw_User_with_designation', 'V') IS NOT NULL
    DROP VIEW dbo.vw_User_with_designation;
GO

CREATE VIEW dbo.vw_User_with_designation AS
SELECT 
    u.Id,
    u.UserName,
    u.Email,
    u.FullName,
    ISNULL(d.strDesignation, 'N/A') as strDesignation,
    u.intDesignationID
FROM AspNetUsers u
LEFT JOIN designations d ON u.intDesignationID = d.intDesignationID;
GO

PRINT '   ✅ Created vw_User_with_designation';
GO

-- =====================================================
-- SECTION 3: Create vw_my_issuance_requests View
-- =====================================================

PRINT '';
PRINT '3️⃣  Creating vw_my_issuance_requests view...';
GO

IF OBJECT_ID('dbo.vw_my_issuance_requests', 'V') IS NOT NULL
    DROP VIEW dbo.vw_my_issuance_requests;
GO

CREATE VIEW dbo.vw_my_issuance_requests AS
SELECT 
    sir.id,
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
    sir.approval_status,
    sir.supervisor_id,
    sup.FullName as supervisor_name,
    sir.admin_id,
    adm.FullName as admin_name,
    DATEDIFF(HOUR, sir.submitted_at, GETDATE()) as pending_hours
FROM stock_issuance_requests sir
LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN AspNetUsers adm ON sir.admin_id = adm.Id;
GO

PRINT '   ✅ Created vw_my_issuance_requests';
GO

-- =====================================================
-- SECTION 4: Create Indexes for Performance
-- =====================================================

PRINT '';
PRINT '4️⃣  Creating performance indexes...';
GO

-- Index on deliveries.po_id
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'IX_deliveries_po_id')
BEGIN
    CREATE INDEX IX_deliveries_po_id ON deliveries(po_id);
    PRINT '   ✅ Created index on deliveries.po_id';
END
ELSE
    PRINT '   ✅ Index on deliveries.po_id already exists';
GO

-- Index on deliveries.delivery_status
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE object_id = OBJECT_ID('deliveries') 
               AND name = 'IX_deliveries_status')
BEGIN
    CREATE INDEX IX_deliveries_status ON deliveries(delivery_status);
    PRINT '   ✅ Created index on deliveries.delivery_status';
END
ELSE
    PRINT '   ✅ Index on deliveries.delivery_status already exists';
GO

-- =====================================================
-- SECTION 5: Verify Created Objects
-- =====================================================

PRINT '';
PRINT '5️⃣  Verifying created objects...';
GO

-- Check if views exist
IF OBJECT_ID('dbo.vw_User_with_designation', 'V') IS NOT NULL
    PRINT '   ✅ vw_User_with_designation view verified';
ELSE
    PRINT '   ❌ ERROR: vw_User_with_designation view not found';
GO

IF OBJECT_ID('dbo.vw_my_issuance_requests', 'V') IS NOT NULL
    PRINT '   ✅ vw_my_issuance_requests view verified';
ELSE
    PRINT '   ❌ ERROR: vw_my_issuance_requests view not found';
GO

-- Check if columns exist in deliveries
DECLARE @deliveries_count INT;
SELECT @deliveries_count = COUNT(*) FROM sys.columns 
WHERE object_id = OBJECT_ID('deliveries') 
AND name IN ('po_id', 'po_number', 'received_by', 'receiving_date', 'delivery_status', 'notes');

IF @deliveries_count = 6
    PRINT '   ✅ All 6 columns verified in deliveries table';
ELSE
    PRINT '   ⚠️ WARNING: Only ' + CAST(@deliveries_count AS VARCHAR) + ' of 6 columns found in deliveries table';
GO

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

PRINT '';
PRINT '========================================';
PRINT '✅ UPDATE COMPLETED SUCCESSFULLY';
PRINT '========================================';
PRINT '';
PRINT 'Columns Added to deliveries Table:';
PRINT '  • po_id (UNIQUEIDENTIFIER)';
PRINT '  • po_number (NVARCHAR(100))';
PRINT '  • received_by (NVARCHAR(450))';
PRINT '  • receiving_date (DATETIME2)';
PRINT '  • delivery_status (NVARCHAR(50), CHECK constraint)';
PRINT '  • notes (NVARCHAR(MAX))';
PRINT '';
PRINT 'Database Views Created:';
PRINT '  • vw_User_with_designation (for auth queries)';
PRINT '  • vw_my_issuance_requests (for user request queries)';
PRINT '';
PRINT 'Performance Indexes Created:';
PRINT '  • IX_deliveries_po_id';
PRINT '  • IX_deliveries_status';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. On production server, run this script in SQL Server Management Studio';
PRINT '  2. Restart backend service: npm run dev:server';
PRINT '  3. Test Dashboard and Delivery pages';
PRINT '';
PRINT '========================================';
GO
