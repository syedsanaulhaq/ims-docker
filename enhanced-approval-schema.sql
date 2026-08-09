-- ENHANCED APPROVAL SYSTEM DATABASE SCHEMA
-- This file creates the additional tables needed for the enhanced approval workflow

USE InventoryManagementDB;

-- =====================================================================================
-- TABLE 1: Track approval decisions for each requested item
-- =====================================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_issuance_approval_decisions')
BEGIN
    CREATE TABLE stock_issuance_approval_decisions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        requested_item_id UNIQUEIDENTIFIER NOT NULL,
        decision_type NVARCHAR(50) NOT NULL, -- 'APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT', 'PARTIAL', 'REJECT'
        inventory_item_id UNIQUEIDENTIFIER NULL, -- If fulfilled from stock
        approved_quantity INT NULL,
        procurement_required_quantity INT NULL,
        rejection_reason NVARCHAR(500) NULL,
        approver_id NVARCHAR(450) NOT NULL,
        approved_at DATETIME2 DEFAULT GETDATE(),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_approval_decisions_request 
            FOREIGN KEY (request_id) REFERENCES stock_issuance_requests(id) ON DELETE CASCADE,
        CONSTRAINT FK_approval_decisions_item 
            FOREIGN KEY (requested_item_id) REFERENCES stock_issuance_items(id) ON DELETE CASCADE,
            
        -- Check constraints
        CONSTRAINT CK_approval_decision_type 
            CHECK (decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT', 'PARTIAL', 'REJECT')),
        CONSTRAINT CK_approval_quantities 
            CHECK (
                (decision_type = 'APPROVE_FROM_STOCK' AND approved_quantity > 0 AND inventory_item_id IS NOT NULL) OR
                (decision_type = 'APPROVE_FOR_PROCUREMENT' AND procurement_required_quantity > 0) OR
                (decision_type = 'PARTIAL' AND (approved_quantity > 0 OR procurement_required_quantity > 0)) OR
                (decision_type = 'REJECT' AND rejection_reason IS NOT NULL)
            )
    );
    
    PRINT '✅ Created table: stock_issuance_approval_decisions';
END
ELSE
BEGIN
    PRINT '⚠️  Table already exists: stock_issuance_approval_decisions';
END;

-- =====================================================================================
-- TABLE 2: Track procurement requests generated from approvals
-- =====================================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'procurement_requests')
BEGIN
    CREATE TABLE procurement_requests (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        original_request_id UNIQUEIDENTIFIER NOT NULL,
        requested_item_id UNIQUEIDENTIFIER NOT NULL,
        item_description NVARCHAR(500) NOT NULL,
        required_quantity INT NOT NULL,
        estimated_unit_price DECIMAL(10,2) NULL,
        urgency_level NVARCHAR(50) NOT NULL DEFAULT 'Medium',
        target_delivery_date DATE NULL,
        procurement_status NVARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'TENDER_CREATED', 'ORDERED', 'DELIVERED'
        tender_id UNIQUEIDENTIFIER NULL,
        created_by NVARCHAR(450) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_procurement_requests_original_request 
            FOREIGN KEY (original_request_id) REFERENCES stock_issuance_requests(id),
        CONSTRAINT FK_procurement_requests_item 
            FOREIGN KEY (requested_item_id) REFERENCES stock_issuance_items(id),
            
        -- Check constraints
        CONSTRAINT CK_procurement_status 
            CHECK (procurement_status IN ('PENDING', 'TENDER_CREATED', 'ORDERED', 'DELIVERED', 'CANCELLED')),
        CONSTRAINT CK_procurement_urgency 
            CHECK (urgency_level IN ('Low', 'Medium', 'High', 'Critical')),
        CONSTRAINT CK_procurement_quantity 
            CHECK (required_quantity > 0)
    );
    
    PRINT '✅ Created table: procurement_requests';
END
ELSE
BEGIN
    PRINT '⚠️  Table already exists: procurement_requests';
END;

-- =====================================================================================
-- TABLE 3: Track stock reservations during approval process
-- =====================================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_reservations')
BEGIN
    CREATE TABLE stock_reservations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        inventory_item_id UNIQUEIDENTIFIER NOT NULL,
        request_id UNIQUEIDENTIFIER NOT NULL,
        requested_item_id UNIQUEIDENTIFIER NOT NULL,
        reserved_quantity INT NOT NULL,
        reservation_status NVARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ISSUED', 'CANCELLED', 'EXPIRED'
        reserved_by NVARCHAR(450) NOT NULL,
        reserved_at DATETIME2 DEFAULT GETDATE(),
        expires_at DATETIME2 NOT NULL, -- Auto-cancel after X days
        issued_at DATETIME2 NULL,
        cancelled_at DATETIME2 NULL,
        cancellation_reason NVARCHAR(500) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign key constraints
        CONSTRAINT FK_stock_reservations_request 
            FOREIGN KEY (request_id) REFERENCES stock_issuance_requests(id),
        CONSTRAINT FK_stock_reservations_item 
            FOREIGN KEY (requested_item_id) REFERENCES stock_issuance_items(id),
            
        -- Check constraints
        CONSTRAINT CK_reservation_status 
            CHECK (reservation_status IN ('ACTIVE', 'ISSUED', 'CANCELLED', 'EXPIRED')),
        CONSTRAINT CK_reservation_quantity 
            CHECK (reserved_quantity > 0),
        CONSTRAINT CK_reservation_dates 
            CHECK (expires_at > reserved_at)
    );
    
    PRINT '✅ Created table: stock_reservations';
END
ELSE
BEGIN
    PRINT '⚠️  Table already exists: stock_reservations';
END;

-- =====================================================================================
-- INDEXES for Performance
-- =====================================================================================

-- Approval decisions indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_approval_decisions_request_id')
BEGIN
    CREATE INDEX IX_approval_decisions_request_id ON stock_issuance_approval_decisions(request_id);
    PRINT '✅ Created index: IX_approval_decisions_request_id';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_approval_decisions_item_id')
BEGIN
    CREATE INDEX IX_approval_decisions_item_id ON stock_issuance_approval_decisions(requested_item_id);
    PRINT '✅ Created index: IX_approval_decisions_item_id';
END;

-- Procurement requests indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_procurement_requests_status')
BEGIN
    CREATE INDEX IX_procurement_requests_status ON procurement_requests(procurement_status);
    PRINT '✅ Created index: IX_procurement_requests_status';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_procurement_requests_original_request')
BEGIN
    CREATE INDEX IX_procurement_requests_original_request ON procurement_requests(original_request_id);
    PRINT '✅ Created index: IX_procurement_requests_original_request';
END;

-- Stock reservations indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_reservations_inventory_item')
BEGIN
    CREATE INDEX IX_stock_reservations_inventory_item ON stock_reservations(inventory_item_id);
    PRINT '✅ Created index: IX_stock_reservations_inventory_item';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_reservations_status')
BEGIN
    CREATE INDEX IX_stock_reservations_status ON stock_reservations(reservation_status);
    PRINT '✅ Created index: IX_stock_reservations_status';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_stock_reservations_expires_at')
BEGIN
    CREATE INDEX IX_stock_reservations_expires_at ON stock_reservations(expires_at);
    PRINT '✅ Created index: IX_stock_reservations_expires_at';
END;

-- =====================================================================================
-- VIEWS for Easy Querying
-- =====================================================================================

-- View: Enhanced approval overview
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_enhanced_approval_overview')
    DROP VIEW vw_enhanced_approval_overview;
GO

CREATE VIEW vw_enhanced_approval_overview AS
SELECT 
    sir.id as request_id,
    sir.request_number,
    sir.request_status,
    sir.submitted_at,
    sir.approved_at,
    sir.approved_by,
    
    -- Requester info
    u.FullName as requester_name,
    o.strOfficeName as office_name,
    w.Name as wing_name,
    
    -- Item summary
    COUNT(sii.id) as total_items,
    SUM(sii.requested_quantity) as total_requested_quantity,
    COUNT(CASE WHEN ad.decision_type = 'APPROVE_FROM_STOCK' THEN 1 END) as items_approved_from_stock,
    COUNT(CASE WHEN ad.decision_type = 'APPROVE_FOR_PROCUREMENT' THEN 1 END) as items_requiring_procurement,
    COUNT(CASE WHEN ad.decision_type = 'REJECT' THEN 1 END) as items_rejected,
    
    -- Stock reservation summary
    SUM(CASE WHEN sr.reservation_status = 'ACTIVE' THEN sr.reserved_quantity ELSE 0 END) as total_reserved_quantity,
    
    -- Procurement summary
    COUNT(pr.id) as procurement_requests_created
    
FROM stock_issuance_requests sir
LEFT JOIN stock_issuance_items sii ON sir.id = sii.request_id
LEFT JOIN stock_issuance_approval_decisions ad ON sii.id = ad.requested_item_id
LEFT JOIN stock_reservations sr ON sii.id = sr.requested_item_id AND sr.reservation_status = 'ACTIVE'
LEFT JOIN procurement_requests pr ON sii.id = pr.requested_item_id
LEFT JOIN AspNetUsers u ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u.Id AS NVARCHAR(450))
LEFT JOIN tblOffices o ON sir.requester_office_id = o.intOfficeID
LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
GROUP BY 
    sir.id, sir.request_number, sir.request_status, sir.submitted_at, 
    sir.approved_at, sir.approved_by, u.FullName, o.strOfficeName, w.Name;
GO

PRINT '✅ Created view: vw_enhanced_approval_overview';

-- View: Current stock with reservations
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_current_stock_with_reservations')
    DROP VIEW vw_current_stock_with_reservations;
GO

CREATE VIEW vw_current_stock_with_reservations AS
SELECT 
    cis.id,
    cis.item_master_id,
    im.nomenclature,
    im.description,
    im.category,
    im.subcategory,
    cis.current_stock,
    ISNULL(cis.reserved_stock, 0) as reserved_stock,
    ISNULL(active_reservations.total_reserved, 0) as actual_reserved_quantity,
    (cis.current_stock - ISNULL(active_reservations.total_reserved, 0)) as true_available_stock,
    cis.reorder_level,
    cis.max_stock_level,
    cis.unit_price,
    im.unit_of_measurement
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
LEFT JOIN (
    SELECT 
        inventory_item_id,
        SUM(reserved_quantity) as total_reserved
    FROM stock_reservations 
    WHERE reservation_status = 'ACTIVE' AND expires_at > GETDATE()
    GROUP BY inventory_item_id
) active_reservations ON cis.id = active_reservations.inventory_item_id;
GO

PRINT '✅ Created view: vw_current_stock_with_reservations';

-- =====================================================================================
-- STORED PROCEDURES
-- =====================================================================================

-- Procedure: Auto-expire reservations
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_expire_old_reservations')
    DROP PROCEDURE sp_expire_old_reservations;
GO

CREATE PROCEDURE sp_expire_old_reservations
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @expired_count INT = 0;
    
    -- Update expired reservations
    UPDATE stock_reservations 
    SET 
        reservation_status = 'EXPIRED',
        cancelled_at = GETDATE(),
        cancellation_reason = 'Automatically expired - exceeded expiration date',
        updated_at = GETDATE()
    WHERE reservation_status = 'ACTIVE' 
      AND expires_at < GETDATE();
    
    SET @expired_count = @@ROWCOUNT;
    
    -- Update inventory reserved stock
    UPDATE cis 
    SET 
        reserved_stock = ISNULL(active_reservations.total_reserved, 0),
        available_stock = cis.current_stock - ISNULL(active_reservations.total_reserved, 0),
        updated_at = GETDATE()
    FROM current_inventory_stock cis
    LEFT JOIN (
        SELECT 
            inventory_item_id,
            SUM(reserved_quantity) as total_reserved
        FROM stock_reservations 
        WHERE reservation_status = 'ACTIVE' AND expires_at > GETDATE()
        GROUP BY inventory_item_id
    ) active_reservations ON cis.id = active_reservations.inventory_item_id;
    
    PRINT CONCAT('✅ Expired ', @expired_count, ' old reservations and updated inventory');
END;
GO

PRINT '✅ Created procedure: sp_expire_old_reservations';

-- =====================================================================================
-- SAMPLE DATA VERIFICATION
-- =====================================================================================

PRINT '📊 Enhanced Approval System Schema Created Successfully!';
PRINT '';
PRINT 'Tables Created:';
PRINT '  ✅ stock_issuance_approval_decisions';
PRINT '  ✅ procurement_requests';  
PRINT '  ✅ stock_reservations';
PRINT '';
PRINT 'Views Created:';
PRINT '  ✅ vw_enhanced_approval_overview';
PRINT '  ✅ vw_current_stock_with_reservations';
PRINT '';
PRINT 'Procedures Created:';
PRINT '  ✅ sp_expire_old_reservations';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Test the new approval endpoints';
PRINT '  2. Update frontend approval interface';
PRINT '  3. Schedule sp_expire_old_reservations to run daily';
PRINT '';

-- Check if the tables exist before running verification query
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_issuance_approval_decisions')
AND EXISTS (SELECT * FROM sys.tables WHERE name = 'procurement_requests')
AND EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_reservations')
BEGIN
    PRINT 'Running verification query...';
    
    -- Quick verification query
    SELECT 
        'stock_issuance_approval_decisions' as table_name,
        COUNT(*) as record_count
    FROM stock_issuance_approval_decisions
    UNION ALL
    SELECT 
        'procurement_requests' as table_name,
        COUNT(*) as record_count
    FROM procurement_requests
    UNION ALL
    SELECT 
        'stock_reservations' as table_name,
        COUNT(*) as record_count
    FROM stock_reservations;
END
ELSE
BEGIN
    PRINT '⚠️  Some tables were not created successfully. Please check the error messages above.';
END;
