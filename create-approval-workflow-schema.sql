-- =====================================================
-- APPROVAL WORKFLOW DATABASE SCHEMA
-- Complete Hierarchical Approval System
-- DEC → Wing → Office → Admin → Procurement
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '===============================================';
PRINT 'CREATING APPROVAL WORKFLOW DATABASE SCHEMA';
PRINT '===============================================';

-- =====================================================
-- 1. APPROVAL AUTHORITY LEVELS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_authority_levels')
BEGIN
    CREATE TABLE approval_authority_levels (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        level_name NVARCHAR(50) NOT NULL UNIQUE,
        level_order INT NOT NULL UNIQUE, -- 1=DEC, 2=WING, 3=OFFICE, 4=ADMIN, 5=DIRECTOR
        max_approval_amount DECIMAL(15,2) NOT NULL,
        description NVARCHAR(200),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Insert default approval levels
    INSERT INTO approval_authority_levels (level_name, level_order, max_approval_amount, description) VALUES
    ('DEC_LEVEL', 1, 50000.00, 'Department/Section Head - Basic supplies and minor items'),
    ('WING_LEVEL', 2, 150000.00, 'Wing In-charge - Departmental consolidation and wing needs'),
    ('OFFICE_LEVEL', 3, 300000.00, 'Assistant Director Admin - Office-wide requirements'),
    ('ADMIN_LEVEL', 4, 1000000.00, 'General Manager Admin - Major procurement and equipment'),
    ('DIRECTOR_LEVEL', 5, 99999999.99, 'Director/Secretary - Unlimited approval authority');
    
    PRINT 'Created approval_authority_levels table with default levels';
END

-- =====================================================
-- 2. USER APPROVAL AUTHORITIES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_approval_authorities')
BEGIN
    CREATE TABLE user_approval_authorities (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        approval_level_id UNIQUEIDENTIFIER NOT NULL,
        dec_id UNIQUEIDENTIFIER NULL, -- Specific DEC if applicable
        wing_id UNIQUEIDENTIFIER NULL, -- Specific Wing if applicable  
        office_id UNIQUEIDENTIFIER NULL, -- Specific Office if applicable
        
        -- Authority Details
        is_active BIT DEFAULT 1,
        effective_from DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        effective_to DATE NULL,
        
        -- Audit
        assigned_by UNIQUEIDENTIFIER NOT NULL,
        assigned_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign Keys
        FOREIGN KEY (user_id) REFERENCES AspNetUsers(Id),
        FOREIGN KEY (approval_level_id) REFERENCES approval_authority_levels(id),
        FOREIGN KEY (dec_id) REFERENCES DEC_MST(id),
        FOREIGN KEY (assigned_by) REFERENCES AspNetUsers(Id)
    );
    
    PRINT 'Created user_approval_authorities table';
END

-- =====================================================
-- 3. APPROVAL REQUESTS TABLE (Main Table)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_requests')
BEGIN
    CREATE TABLE approval_requests (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_number NVARCHAR(50) UNIQUE NOT NULL,
        
        -- Request Origin
        dec_id UNIQUEIDENTIFIER NOT NULL,
        wing_id UNIQUEIDENTIFIER NULL, -- Derived from DEC
        office_id UNIQUEIDENTIFIER NULL, -- Derived from Wing
        requested_by UNIQUEIDENTIFIER NOT NULL,
        
        -- Request Details
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(1000),
        request_type NVARCHAR(20) NOT NULL, -- 'PROCUREMENT', 'MAINTENANCE', 'SERVICE', 'INFRASTRUCTURE'
        priority NVARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
        
        -- Financial Details
        original_estimated_value DECIMAL(15,2) NOT NULL,
        current_estimated_value DECIMAL(15,2) NOT NULL, -- May change during consolidation
        final_approved_amount DECIMAL(15,2) NULL,
        
        -- Approval Flow Status
        current_approval_level NVARCHAR(20) NOT NULL, -- 'DEC_LEVEL', 'WING_LEVEL', 'OFFICE_LEVEL', 'ADMIN_LEVEL', 'PROCUREMENT_LEVEL'
        overall_status NVARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL', 
        -- Status values: 'PENDING_APPROVAL', 'APPROVED_AT_DEC', 'APPROVED_AT_WING', 'APPROVED_AT_OFFICE', 'APPROVED_BY_ADMIN', 'FORWARDED_TO_PROCUREMENT', 'TENDER_CREATED', 'REJECTED', 'CANCELLED'
        
        -- Required Approval Path (calculated based on amount)
        requires_wing_approval BIT DEFAULT 0,
        requires_office_approval BIT DEFAULT 0,  
        requires_admin_approval BIT DEFAULT 0,
        requires_director_approval BIT DEFAULT 0,
        
        -- Approval Status at Each Level
        dec_status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
        wing_status NVARCHAR(20) NULL, -- 'PENDING', 'APPROVED', 'REJECTED', 'CONSOLIDATED'
        office_status NVARCHAR(20) NULL, -- 'PENDING', 'APPROVED', 'FORWARDED', 'REJECTED'
        admin_status NVARCHAR(20) NULL, -- 'PENDING', 'APPROVED', 'REJECTED'
        
        -- Procurement Assignment
        procurement_assigned_to UNIQUEIDENTIFIER NULL,
        procurement_assigned_at DATETIME2 NULL,
        tender_id UNIQUEIDENTIFIER NULL,
        
        -- Timestamps
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign Keys
        FOREIGN KEY (dec_id) REFERENCES DEC_MST(id),
        FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id),
        FOREIGN KEY (procurement_assigned_to) REFERENCES AspNetUsers(Id)
    );
    
    PRINT 'Created approval_requests table';
END

-- =====================================================
-- 4. APPROVAL REQUEST ITEMS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_request_items')
BEGIN
    CREATE TABLE approval_request_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Item Details
        item_description NVARCHAR(500) NOT NULL,
        item_category NVARCHAR(100),
        specifications NVARCHAR(1000),
        
        -- Quantities and Pricing
        requested_quantity INT NOT NULL,
        approved_quantity INT NULL, -- Final approved quantity
        estimated_unit_price DECIMAL(15,4) NOT NULL,
        estimated_total_cost AS (requested_quantity * estimated_unit_price) PERSISTED,
        approved_total_cost AS (ISNULL(approved_quantity, requested_quantity) * estimated_unit_price) PERSISTED,
        
        -- Justification and Priority
        justification NVARCHAR(500) NOT NULL,
        priority NVARCHAR(10) DEFAULT 'NORMAL',
        is_essential BIT DEFAULT 1, -- Can this item be removed if budget is tight?
        
        -- Consolidation Tracking
        original_dec_id UNIQUEIDENTIFIER NULL, -- If item was added during wing consolidation
        added_at_level NVARCHAR(20) DEFAULT 'DEC_LEVEL', -- 'DEC_LEVEL', 'WING_LEVEL'
        added_by UNIQUEIDENTIFIER NULL,
        
        -- Item Linking (if item master exists)
        item_master_id UNIQUEIDENTIFIER NULL,
        
        -- Status
        item_status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'MODIFIED'
        
        -- Audit
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign Keys
        FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (original_dec_id) REFERENCES DEC_MST(id),
        FOREIGN KEY (added_by) REFERENCES AspNetUsers(Id),
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    
    PRINT 'Created approval_request_items table';
END

-- =====================================================
-- 5. APPROVAL ACTIONS TABLE (Audit Trail)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_actions')
BEGIN
    CREATE TABLE approval_actions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Action Details
        approval_level NVARCHAR(20) NOT NULL,
        action_type NVARCHAR(20) NOT NULL, -- 'APPROVED', 'REJECTED', 'FORWARDED', 'RETURNED', 'CONSOLIDATED', 'MODIFIED'
        action_by UNIQUEIDENTIFIER NOT NULL,
        action_date DATETIME2 DEFAULT GETDATE(),
        
        -- Action Details
        comments NVARCHAR(1000),
        previous_amount DECIMAL(15,2) NULL,
        new_amount DECIMAL(15,2) NULL,
        
        -- Items Modified (JSON or separate table can be used for detailed item changes)
        items_added INT DEFAULT 0,
        items_modified INT DEFAULT 0,
        items_removed INT DEFAULT 0,
        
        -- Next Action Required
        forwarded_to_level NVARCHAR(20) NULL,
        requires_action_by UNIQUEIDENTIFIER NULL,
        
        -- Foreign Keys
        FOREIGN KEY (request_id) REFERENCES approval_requests(id),
        FOREIGN KEY (action_by) REFERENCES AspNetUsers(Id),
        FOREIGN KEY (requires_action_by) REFERENCES AspNetUsers(Id)
    );
    
    PRINT 'Created approval_actions table';
END

-- =====================================================
-- 6. APPROVAL CONSOLIDATIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_consolidations')
BEGIN
    CREATE TABLE approval_consolidations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Consolidation Details
        consolidation_number NVARCHAR(50) UNIQUE NOT NULL,
        consolidation_level NVARCHAR(20) NOT NULL, -- 'WING_LEVEL', 'OFFICE_LEVEL'
        consolidated_by UNIQUEIDENTIFIER NOT NULL,
        consolidation_date DATETIME2 DEFAULT GETDATE(),
        
        -- Scope
        wing_id UNIQUEIDENTIFIER NULL,
        office_id UNIQUEIDENTIFIER NULL,
        
        -- Financial Summary
        total_original_amount DECIMAL(15,2) NOT NULL,
        total_consolidated_amount DECIMAL(15,2) NOT NULL,
        savings_achieved DECIMAL(15,2) DEFAULT 0,
        
        -- Status
        status NVARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUPERSEDED', 'CANCELLED'
        
        -- Description
        consolidation_reason NVARCHAR(1000),
        
        -- Foreign Keys
        FOREIGN KEY (consolidated_by) REFERENCES AspNetUsers(Id)
    );
    
    PRINT 'Created approval_consolidations table';
END

-- =====================================================
-- 7. APPROVAL CONSOLIDATION ITEMS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_consolidation_items')
BEGIN
    CREATE TABLE approval_consolidation_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        consolidation_id UNIQUEIDENTIFIER NOT NULL,
        original_request_id UNIQUEIDENTIFIER NOT NULL,
        original_request_item_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Consolidation Changes
        original_quantity INT NOT NULL,
        consolidated_quantity INT NOT NULL,
        quantity_change AS (consolidated_quantity - original_quantity) PERSISTED,
        
        -- Reasoning
        consolidation_reason NVARCHAR(500),
        
        -- Foreign Keys
        FOREIGN KEY (consolidation_id) REFERENCES approval_consolidations(id),
        FOREIGN KEY (original_request_id) REFERENCES approval_requests(id),
        FOREIGN KEY (original_request_item_id) REFERENCES approval_request_items(id)
    );
    
    PRINT 'Created approval_consolidation_items table';
END

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Approval Requests Indexes
CREATE INDEX IX_approval_requests_status ON approval_requests(overall_status, current_approval_level);
CREATE INDEX IX_approval_requests_dec ON approval_requests(dec_id, created_at);
CREATE INDEX IX_approval_requests_amount ON approval_requests(current_estimated_value, current_approval_level);
CREATE INDEX IX_approval_requests_priority ON approval_requests(priority, created_at);

-- Approval Actions Indexes
CREATE INDEX IX_approval_actions_request_level ON approval_actions(request_id, approval_level, action_date);
CREATE INDEX IX_approval_actions_user ON approval_actions(action_by, action_date);

-- User Authorities Index
CREATE INDEX IX_user_approval_authorities_active ON user_approval_authorities(user_id, is_active, effective_from, effective_to);

PRINT 'Created performance indexes';

-- =====================================================
-- 9. STORED PROCEDURES FOR APPROVAL WORKFLOW
-- =====================================================

-- Procedure to determine required approval path
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_DetermineApprovalPath' AND type = 'P')
    DROP PROCEDURE sp_DetermineApprovalPath;
GO

CREATE PROCEDURE sp_DetermineApprovalPath
    @EstimatedValue DECIMAL(15,2),
    @RequiresWing BIT OUTPUT,
    @RequiresOffice BIT OUTPUT,
    @RequiresAdmin BIT OUTPUT,
    @RequiresDirector BIT OUTPUT,
    @InitialLevel NVARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Default all to false
    SET @RequiresWing = 0;
    SET @RequiresOffice = 0;
    SET @RequiresAdmin = 0;
    SET @RequiresDirector = 0;
    SET @InitialLevel = 'DEC_LEVEL';
    
    -- Determine approval path based on amount
    IF @EstimatedValue <= 50000
    BEGIN
        -- DEC Head can approve directly
        SET @InitialLevel = 'DEC_LEVEL';
    END
    ELSE IF @EstimatedValue <= 150000
    BEGIN
        -- Requires Wing approval
        SET @RequiresWing = 1;
        SET @InitialLevel = 'WING_LEVEL';
    END
    ELSE IF @EstimatedValue <= 300000
    BEGIN
        -- Requires Office approval
        SET @RequiresWing = 1;
        SET @RequiresOffice = 1;
        SET @InitialLevel = 'OFFICE_LEVEL';
    END
    ELSE IF @EstimatedValue <= 1000000
    BEGIN
        -- Requires Admin approval
        SET @RequiresWing = 1;
        SET @RequiresOffice = 1;
        SET @RequiresAdmin = 1;
        SET @InitialLevel = 'ADMIN_LEVEL';
    END
    ELSE
    BEGIN
        -- Requires Director approval
        SET @RequiresWing = 1;
        SET @RequiresOffice = 1;
        SET @RequiresAdmin = 1;
        SET @RequiresDirector = 1;
        SET @InitialLevel = 'DIRECTOR_LEVEL';
    END
END;
GO

-- Procedure to create approval request
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_CreateApprovalRequest' AND type = 'P')
    DROP PROCEDURE sp_CreateApprovalRequest;
GO

CREATE PROCEDURE sp_CreateApprovalRequest
    @DecID UNIQUEIDENTIFIER,
    @RequestedBy UNIQUEIDENTIFIER,
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000),
    @RequestType NVARCHAR(20),
    @EstimatedValue DECIMAL(15,2),
    @Priority NVARCHAR(10) = 'NORMAL',
    @RequestID UNIQUEIDENTIFIER OUTPUT,
    @RequestNumber NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Generate request number
        DECLARE @Year NVARCHAR(4) = CAST(YEAR(GETDATE()) AS NVARCHAR(4));
        DECLARE @Sequence INT;
        
        SELECT @Sequence = ISNULL(MAX(CAST(RIGHT(request_number, 3) AS INT)), 0) + 1
        FROM approval_requests
        WHERE LEFT(request_number, 8) = 'REQ-' + @Year;
        
        SET @RequestNumber = 'REQ-' + @Year + '-' + RIGHT('000' + CAST(@Sequence AS NVARCHAR(3)), 3);
        SET @RequestID = NEWID();
        
        -- Determine approval path
        DECLARE @RequiresWing BIT, @RequiresOffice BIT, @RequiresAdmin BIT, @RequiresDirector BIT, @InitialLevel NVARCHAR(20);
        
        EXEC sp_DetermineApprovalPath 
            @EstimatedValue, 
            @RequiresWing OUTPUT, 
            @RequiresOffice OUTPUT, 
            @RequiresAdmin OUTPUT, 
            @RequiresDirector OUTPUT, 
            @InitialLevel OUTPUT;
        
        -- Insert approval request
        INSERT INTO approval_requests (
            id, request_number, dec_id, requested_by, title, description, request_type,
            original_estimated_value, current_estimated_value, priority,
            current_approval_level, overall_status,
            requires_wing_approval, requires_office_approval, requires_admin_approval, requires_director_approval
        )
        VALUES (
            @RequestID, @RequestNumber, @DecID, @RequestedBy, @Title, @Description, @RequestType,
            @EstimatedValue, @EstimatedValue, @Priority,
            'DEC_LEVEL', 'PENDING_APPROVAL',
            @RequiresWing, @RequiresOffice, @RequiresAdmin, @RequiresDirector
        );
        
        -- Log initial action
        INSERT INTO approval_actions (request_id, approval_level, action_type, action_by, comments)
        VALUES (@RequestID, 'DEC_LEVEL', 'SUBMITTED', @RequestedBy, 'Initial request created');
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

PRINT 'Created approval workflow stored procedures';

-- =====================================================
-- 10. VIEWS FOR APPROVAL DASHBOARD
-- =====================================================

-- View for pending approvals by user
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_PendingApprovals')
    DROP VIEW vw_PendingApprovals;
GO

CREATE VIEW vw_PendingApprovals
AS
SELECT 
    ar.id,
    ar.request_number,
    ar.title,
    ar.description,
    ar.current_estimated_value,
    ar.priority,
    ar.current_approval_level,
    ar.overall_status,
    ar.created_at,
    
    -- Requesting DEC Details
    d.DEC_Name as requesting_department,
    u_req.UserName as requested_by_name,
    
    -- Days Pending
    DATEDIFF(day, ar.created_at, GETDATE()) as days_pending,
    
    -- Approval Requirements
    ar.requires_wing_approval,
    ar.requires_office_approval,
    ar.requires_admin_approval,
    ar.requires_director_approval
    
FROM approval_requests ar
INNER JOIN DEC_MST d ON ar.dec_id = d.id
INNER JOIN AspNetUsers u_req ON ar.requested_by = u_req.Id
WHERE ar.overall_status NOT IN ('TENDER_CREATED', 'REJECTED', 'CANCELLED');
GO

PRINT 'Created approval workflow views';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
PRINT '===============================================';
PRINT 'APPROVAL WORKFLOW DATABASE SCHEMA COMPLETED!';
PRINT '===============================================';
PRINT 'Tables Created:';
PRINT '- approval_authority_levels (approval limits)';
PRINT '- user_approval_authorities (user permissions)'; 
PRINT '- approval_requests (main requests)';
PRINT '- approval_request_items (requested items)';
PRINT '- approval_actions (audit trail)';
PRINT '- approval_consolidations (wing/office consolidations)';
PRINT 'Procedures Created:';
PRINT '- sp_DetermineApprovalPath (automatic routing)';
PRINT '- sp_CreateApprovalRequest (request creation)';
PRINT 'Views Created:';
PRINT '- vw_PendingApprovals (dashboard view)';
PRINT 'The system supports complete hierarchical approval workflow!';
PRINT '===============================================';
