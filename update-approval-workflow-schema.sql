-- =========================================
-- UPDATE STOCK ISSUANCE SCHEMA FOR APPROVAL WORKFLOW
-- =========================================
-- Adds columns to support three-level approval (User → Supervisor → Admin)

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '🔄 Updating stock_issuance_requests for approval workflow...';
PRINT '';

-- Add approval-related columns if they don't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'approval_status')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD approval_status NVARCHAR(30) DEFAULT 'Pending Supervisor Review'
        CHECK (approval_status IN (
            'Pending Supervisor Review',
            'Approved by Supervisor',
            'Forwarded to Admin',
            'Approved by Admin',
            'Partially Approved',
            'Rejected by Supervisor',
            'Rejected by Admin',
            'Issued',
            'Completed'
        ));
    PRINT '✅ Added approval_status column';
END

-- Supervisor approval fields
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'supervisor_id')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD supervisor_id NVARCHAR(450) NULL,
        supervisor_reviewed_at DATETIME2 NULL,
        supervisor_comments NVARCHAR(MAX) NULL,
        supervisor_action NVARCHAR(20) NULL 
            CHECK (supervisor_action IN ('Approved', 'Forwarded', 'Rejected'));
    
    ALTER TABLE dbo.stock_issuance_requests
    ADD CONSTRAINT FK_issuance_supervisor FOREIGN KEY (supervisor_id) 
        REFERENCES dbo.AspNetUsers(Id);
    
    PRINT '✅ Added supervisor approval fields';
END

-- Admin approval fields
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'admin_id')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD admin_id NVARCHAR(450) NULL,
        admin_reviewed_at DATETIME2 NULL,
        admin_comments NVARCHAR(MAX) NULL,
        admin_action NVARCHAR(20) NULL 
            CHECK (admin_action IN ('Approved', 'Rejected', 'Pending Procurement'));
    
    ALTER TABLE dbo.stock_issuance_requests
    ADD CONSTRAINT FK_issuance_admin FOREIGN KEY (admin_id) 
        REFERENCES dbo.AspNetUsers(Id);
    
    PRINT '✅ Added admin approval fields';
END

-- Store type fields (where items will be issued from)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'source_store_type')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD source_store_type NVARCHAR(20) NULL 
            CHECK (source_store_type IN ('Admin', 'Wing')),
        source_wing_id INT NULL;
    
    PRINT '✅ Added source store tracking fields';
END

-- Forwarding reason (why supervisor forwarded to admin)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'forwarding_reason')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD forwarding_reason NVARCHAR(MAX) NULL;
    
    PRINT '✅ Added forwarding_reason field';
END

-- Priority/urgency indicator
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'is_urgent')
BEGIN
    ALTER TABLE dbo.stock_issuance_requests
    ADD is_urgent BIT DEFAULT 0;
    
    PRINT '✅ Added is_urgent field';
END

GO

-- =========================================
-- UPDATE STOCK ISSUANCE ITEMS TABLE
-- =========================================

PRINT '';
PRINT '🔄 Updating stock_issuance_items...';

-- Add source tracking for each item
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'source_store_type')
BEGIN
    ALTER TABLE dbo.stock_issuance_items
    ADD source_store_type NVARCHAR(20) NULL 
            CHECK (source_store_type IN ('Admin', 'Wing')),
        source_stock_id INT NULL,  -- References stock_admin.id or stock_wing.id
        availability_checked BIT DEFAULT 0,
        availability_check_date DATETIME2 NULL;
    
    PRINT '✅ Added source tracking to items';
END

-- Add custom item flag
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_items' AND COLUMN_NAME = 'is_custom_item')
BEGIN
    ALTER TABLE dbo.stock_issuance_items
    ADD is_custom_item BIT DEFAULT 0,
        custom_item_description NVARCHAR(MAX) NULL;
    
    PRINT '✅ Added custom item support';
END

GO

-- =========================================
-- CREATE APPROVAL HISTORY TABLE
-- =========================================

PRINT '';
PRINT '🔄 Creating approval history table...';

IF OBJECT_ID('dbo.stock_issuance_approval_history', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_issuance_approval_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        request_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Who acted
        actor_id NVARCHAR(450) NOT NULL,
        actor_name NVARCHAR(255) NOT NULL,
        actor_role NVARCHAR(50) NOT NULL,  -- 'Supervisor' or 'Admin'
        
        -- What action
        action NVARCHAR(30) NOT NULL
            CHECK (action IN ('Submitted', 'Approved', 'Forwarded', 'Rejected', 'Issued')),
        previous_status NVARCHAR(30) NULL,
        new_status NVARCHAR(30) NOT NULL,
        
        -- Why
        comments NVARCHAR(MAX) NULL,
        forwarding_reason NVARCHAR(MAX) NULL,
        
        -- When
        action_date DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Additional data
        items_approved INT NULL,  -- How many items approved
        items_rejected INT NULL,
        
        CONSTRAINT FK_approval_history_request FOREIGN KEY (request_id) 
            REFERENCES dbo.stock_issuance_requests(id) ON DELETE CASCADE,
        CONSTRAINT FK_approval_history_actor FOREIGN KEY (actor_id) 
            REFERENCES dbo.AspNetUsers(Id)
    );
    
    CREATE INDEX IX_approval_history_request ON dbo.stock_issuance_approval_history(request_id);
    CREATE INDEX IX_approval_history_actor ON dbo.stock_issuance_approval_history(actor_id);
    CREATE INDEX IX_approval_history_date ON dbo.stock_issuance_approval_history(action_date);
    
    PRINT '✅ Created stock_issuance_approval_history table';
END
ELSE
BEGIN
    PRINT '⚠️  stock_issuance_approval_history already exists';
END
GO

-- =========================================
-- CREATE VIEWS FOR APPROVAL QUEUES
-- =========================================

PRINT '';
PRINT '🔄 Creating approval queue views...';

-- View: Pending Supervisor Approvals
IF OBJECT_ID('dbo.vw_pending_supervisor_approvals', 'V') IS NOT NULL
    DROP VIEW dbo.vw_pending_supervisor_approvals;
GO

CREATE VIEW dbo.vw_pending_supervisor_approvals AS
SELECT 
    sir.id AS request_id,
    sir.request_number,
    sir.request_type,
    sir.requester_wing_id,
    sir.requester_user_id,
    u.FullName AS requester_name,
    u.Email AS requester_email,
    sir.purpose,
    sir.urgency_level,
    sir.is_urgent,
    sir.approval_status,
    sir.submitted_at,
    DATEDIFF(HOUR, sir.submitted_at, GETDATE()) AS pending_hours,
    COUNT(sii.id) AS total_items,
    STRING_AGG(sii.nomenclature, ', ') AS item_list
FROM dbo.stock_issuance_requests sir
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN dbo.stock_issuance_items sii ON sir.id = sii.request_id
WHERE sir.approval_status = 'Pending Supervisor Review'
GROUP BY 
    sir.id, sir.request_number, sir.request_type, sir.requester_wing_id, 
    sir.requester_user_id, u.FullName, u.Email, sir.purpose, sir.urgency_level, 
    sir.is_urgent, sir.approval_status, sir.submitted_at;
GO

PRINT '✅ Created vw_pending_supervisor_approvals';

-- View: Pending Admin Approvals
IF OBJECT_ID('dbo.vw_pending_admin_approvals', 'V') IS NOT NULL
    DROP VIEW dbo.vw_pending_admin_approvals;
GO

CREATE VIEW dbo.vw_pending_admin_approvals AS
SELECT 
    sir.id AS request_id,
    sir.request_number,
    sir.request_type,
    sir.requester_wing_id,
    sir.requester_user_id,
    u.FullName AS requester_name,
    sup.FullName AS supervisor_name,
    sir.forwarding_reason,
    sir.purpose,
    sir.urgency_level,
    sir.is_urgent,
    sir.approval_status,
    sir.supervisor_reviewed_at AS forwarded_at,
    DATEDIFF(HOUR, sir.supervisor_reviewed_at, GETDATE()) AS pending_hours,
    COUNT(sii.id) AS total_items,
    STRING_AGG(sii.nomenclature, ', ') AS item_list
FROM dbo.stock_issuance_requests sir
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN dbo.AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN dbo.stock_issuance_items sii ON sir.id = sii.request_id
WHERE sir.approval_status IN ('Forwarded to Admin', 'Pending Procurement')
GROUP BY 
    sir.id, sir.request_number, sir.request_type, sir.requester_wing_id, 
    sir.requester_user_id, u.FullName, sup.FullName, sir.forwarding_reason,
    sir.purpose, sir.urgency_level, sir.is_urgent, sir.approval_status, 
    sir.supervisor_reviewed_at;
GO

PRINT '✅ Created vw_pending_admin_approvals';

-- View: My Requests (for users)
IF OBJECT_ID('dbo.vw_my_issuance_requests', 'V') IS NOT NULL
    DROP VIEW dbo.vw_my_issuance_requests;
GO

CREATE VIEW dbo.vw_my_issuance_requests AS
SELECT 
    sir.id AS request_id,
    sir.request_number,
    sir.request_type,
    sir.requester_user_id,
    sir.purpose,
    sir.urgency_level,
    sir.approval_status,
    sir.submitted_at,
    sir.supervisor_reviewed_at,
    sir.admin_reviewed_at,
    sup.FullName AS supervisor_name,
    admin.FullName AS admin_name,
    COUNT(sii.id) AS total_items,
    SUM(CASE WHEN sii.item_status = 'Approved' THEN 1 ELSE 0 END) AS approved_items,
    SUM(CASE WHEN sii.item_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_items
FROM dbo.stock_issuance_requests sir
LEFT JOIN dbo.AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN dbo.AspNetUsers admin ON sir.admin_id = admin.Id
LEFT JOIN dbo.stock_issuance_items sii ON sir.id = sii.request_id
GROUP BY 
    sir.id, sir.request_number, sir.request_type, sir.requester_user_id,
    sir.purpose, sir.urgency_level, sir.approval_status, sir.submitted_at,
    sir.supervisor_reviewed_at, sir.admin_reviewed_at, sup.FullName, admin.FullName;
GO

PRINT '✅ Created vw_my_issuance_requests';

GO

PRINT '';
PRINT '========================================';
PRINT '✅ APPROVAL WORKFLOW SCHEMA UPDATED!';
PRINT '========================================';
PRINT '';
PRINT '📋 New Features:';
PRINT '  • Supervisor approval tracking';
PRINT '  • Admin approval tracking';
PRINT '  • Forwarding workflow support';
PRINT '  • Source store tracking (Admin/Wing)';
PRINT '  • Approval history logging';
PRINT '  • Custom items support';
PRINT '';
PRINT '📊 New Views Created:';
PRINT '  • vw_pending_supervisor_approvals';
PRINT '  • vw_pending_admin_approvals';
PRINT '  • vw_my_issuance_requests';
PRINT '';
PRINT '⏭️  Next: Create approval APIs';
PRINT '========================================';
