-- ============================================================================
-- PROCUREMENT WORKFLOW TABLES
-- ============================================================================
-- This creates tables for wing-to-admin procurement requests
-- Wings request stock from central admin, admin approves and delivers
-- Once delivered, items are added to wing inventory
-- ============================================================================

USE InventoryManagementDB;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Check if tables already exist
IF OBJECT_ID('procurement_delivery_items', 'U') IS NOT NULL
    DROP TABLE procurement_delivery_items;
IF OBJECT_ID('procurement_deliveries', 'U') IS NOT NULL
    DROP TABLE procurement_deliveries;
IF OBJECT_ID('procurement_request_items', 'U') IS NOT NULL
    DROP TABLE procurement_request_items;
IF OBJECT_ID('procurement_requests', 'U') IS NOT NULL
    DROP TABLE procurement_requests;
GO

-- ============================================================================
-- Main Procurement Requests Table
-- ============================================================================
CREATE TABLE procurement_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_number NVARCHAR(50) UNIQUE NOT NULL,
    wing_id INT NOT NULL,
    wing_name NVARCHAR(200),
    requested_by_user_id NVARCHAR(450) NOT NULL,
    requested_by_name NVARCHAR(200),
    
    -- Status tracking
    status NVARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- pending, approved, partially_approved, rejected, allocated, in_transit, delivered, completed, cancelled
    
    priority NVARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    justification NVARCHAR(MAX),
    
    -- Request timestamps
    requested_at DATETIME2 DEFAULT GETDATE(),
    
    -- Review information
    reviewed_by_user_id NVARCHAR(450),
    reviewed_by_name NVARCHAR(200),
    reviewed_at DATETIME2,
    review_notes NVARCHAR(MAX),
    
    -- Delivery tracking
    allocated_at DATETIME2,
    delivered_at DATETIME2,
    completed_at DATETIME2,
    
    -- Metadata
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_procurement_requests_wing FOREIGN KEY (wing_id) REFERENCES WingsInformation(Id)
);

CREATE INDEX IX_procurement_requests_wing ON procurement_requests(wing_id);
CREATE INDEX IX_procurement_requests_status ON procurement_requests(status);
CREATE INDEX IX_procurement_requests_requested_by ON procurement_requests(requested_by_user_id);
CREATE INDEX IX_procurement_requests_requested_at ON procurement_requests(requested_at DESC);
GO

-- ============================================================================
-- Procurement Request Items
-- ============================================================================
CREATE TABLE procurement_request_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    procurement_request_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Item information
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    item_nomenclature NVARCHAR(500),
    item_code NVARCHAR(100),
    category_name NVARCHAR(200),
    subcategory_name NVARCHAR(200),
    
    -- Quantities
    requested_quantity DECIMAL(18,2) NOT NULL,
    approved_quantity DECIMAL(18,2),
    delivered_quantity DECIMAL(18,2) DEFAULT 0,
    
    unit_of_measurement NVARCHAR(50),
    
    -- Pricing (optional, for budgeting)
    estimated_unit_price DECIMAL(18,2),
    estimated_total_price AS (requested_quantity * estimated_unit_price) PERSISTED,
    
    -- Item-specific notes
    notes NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_procurement_items_request FOREIGN KEY (procurement_request_id) 
        REFERENCES procurement_requests(id) ON DELETE CASCADE,
    CONSTRAINT FK_procurement_items_itemmaster FOREIGN KEY (item_master_id) 
        REFERENCES item_masters(id)
);

CREATE INDEX IX_procurement_items_request ON procurement_request_items(procurement_request_id);
CREATE INDEX IX_procurement_items_itemmaster ON procurement_request_items(item_master_id);
GO

-- ============================================================================
-- Procurement Deliveries
-- ============================================================================
CREATE TABLE procurement_deliveries (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    procurement_request_id UNIQUEIDENTIFIER NOT NULL,
    delivery_number NVARCHAR(50) UNIQUE NOT NULL,
    
    wing_id UNIQUEIDENTIFIER NOT NULL,
    wing_name NVARCHAR(200),
    
    -- Delivery status
    status NVARCHAR(50) DEFAULT 'pending', 
    -- pending, prepared, in_transit, delivered, completed, cancelled
    
    -- Delivery information
    delivered_by_user_id NVARCHAR(450),
    delivered_by_name NVARCHAR(200),
    delivery_date DATETIME2,
    
    -- Receipt information (wing supervisor confirms)
    received_by_user_id NVARCHAR(450),
    received_by_name NVARCHAR(200),
    received_at DATETIME2,
    
    -- Transport/logistics info
    vehicle_number NVARCHAR(100),
    driver_name NVARCHAR(200),
    driver_contact NVARCHAR(50),
    
    notes NVARCHAR(MAX),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_procurement_delivery_request FOREIGN KEY (procurement_request_id) 
        REFERENCES procurement_requests(id),
    CONSTRAINT FK_procurement_delivery_wing FOREIGN KEY (wing_id) 
        REFERENCES Wings(id)
);

CREATE INDEX IX_procurement_delivery_request ON procurement_deliveries(procurement_request_id);
CREATE INDEX IX_procurement_delivery_wing ON procurement_deliveries(wing_id);
CREATE INDEX IX_procurement_delivery_status ON procurement_deliveries(status);
GO

-- ============================================================================
-- Procurement Delivery Items
-- ============================================================================
CREATE TABLE procurement_delivery_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    procurement_delivery_id UNIQUEIDENTIFIER NOT NULL,
    procurement_request_item_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Item reference
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    item_nomenclature NVARCHAR(500),
    
    -- Quantities
    delivered_quantity DECIMAL(18,2) NOT NULL,
    received_quantity DECIMAL(18,2), -- May differ if damaged/short
    
    unit_of_measurement NVARCHAR(50),
    
    -- Batch tracking
    batch_number NVARCHAR(100),
    serial_number NVARCHAR(100),
    manufacture_date DATE,
    expiry_date DATE,
    
    -- Condition on receipt
    condition_on_receipt NVARCHAR(50), -- good, damaged, partial
    discrepancy_notes NVARCHAR(500),
    
    notes NVARCHAR(500),
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_procurement_delivery_items_delivery FOREIGN KEY (procurement_delivery_id) 
        REFERENCES procurement_deliveries(id) ON DELETE CASCADE,
    CONSTRAINT FK_procurement_delivery_items_request_item FOREIGN KEY (procurement_request_item_id) 
        REFERENCES procurement_request_items(id),
    CONSTRAINT FK_procurement_delivery_items_itemmaster FOREIGN KEY (item_master_id) 
        REFERENCES item_masters(id)
);

CREATE INDEX IX_procurement_delivery_items_delivery ON procurement_delivery_items(procurement_delivery_id);
CREATE INDEX IX_procurement_delivery_items_request ON procurement_delivery_items(procurement_request_item_id);
CREATE INDEX IX_procurement_delivery_items_itemmaster ON procurement_delivery_items(item_master_id);
GO

-- ============================================================================
-- Create trigger to auto-generate request numbers
-- ============================================================================
CREATE TRIGGER trg_procurement_request_number
ON procurement_requests
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE pr
    SET request_number = 'PR-' + FORMAT(YEAR(pr.created_at), '0000') + '-' + 
                         FORMAT(MONTH(pr.created_at), '00') + '-' + 
                         RIGHT('00000' + CAST(
                            (SELECT COUNT(*) 
                             FROM procurement_requests 
                             WHERE YEAR(created_at) = YEAR(pr.created_at) 
                               AND MONTH(created_at) = MONTH(pr.created_at)
                            ) AS VARCHAR(5)
                         ), 5)
    FROM procurement_requests pr
    INNER JOIN inserted i ON pr.id = i.id
    WHERE pr.request_number IS NULL OR pr.request_number = '';
END;
GO

-- ============================================================================
-- Create trigger to auto-generate delivery numbers
-- ============================================================================
CREATE TRIGGER trg_procurement_delivery_number
ON procurement_deliveries
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE pd
    SET delivery_number = 'PD-' + FORMAT(YEAR(pd.created_at), '0000') + '-' + 
                          FORMAT(MONTH(pd.created_at), '00') + '-' + 
                          RIGHT('00000' + CAST(
                            (SELECT COUNT(*) 
                             FROM procurement_deliveries 
                             WHERE YEAR(created_at) = YEAR(pd.created_at) 
                               AND MONTH(created_at) = MONTH(pd.created_at)
                            ) AS VARCHAR(5)
                          ), 5)
    FROM procurement_deliveries pd
    INNER JOIN inserted i ON pd.id = i.id
    WHERE pd.delivery_number IS NULL OR pd.delivery_number = '';
END;
GO

-- ============================================================================
-- Create trigger to update timestamps
-- ============================================================================
CREATE TRIGGER trg_procurement_requests_update
ON procurement_requests
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE procurement_requests
    SET updated_at = GETDATE()
    FROM procurement_requests pr
    INNER JOIN inserted i ON pr.id = i.id;
END;
GO

CREATE TRIGGER trg_procurement_deliveries_update
ON procurement_deliveries
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE procurement_deliveries
    SET updated_at = GETDATE()
    FROM procurement_deliveries pd
    INNER JOIN inserted i ON pd.id = i.id;
END;
GO

-- ============================================================================
-- Insert sample procurement permissions
-- ============================================================================
PRINT 'Creating procurement permissions...';

-- Check if permissions already exist
IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'procurement.request')
BEGIN
    INSERT INTO ims_permissions (permission_key, module_name, action_name, description)
    VALUES 
        ('procurement.request', 'Procurement', 'Request', 'Create procurement requests to admin'),
        ('procurement.approve', 'Procurement', 'Approve', 'Approve/reject procurement requests'),
        ('procurement.manage_delivery', 'Procurement', 'Manage Delivery', 'Create and manage deliveries'),
        ('procurement.receive_delivery', 'Procurement', 'Receive Delivery', 'Confirm delivery receipt'),
        ('procurement.view_all', 'Procurement', 'View All', 'View all procurement requests'),
        ('procurement.view_wing', 'Procurement', 'View Wing', 'View wing procurement requests'),
        ('procurement.view_own', 'Procurement', 'View Own', 'View own procurement requests');
    
    PRINT 'Procurement permissions created successfully';
END
ELSE
BEGIN
    PRINT 'Procurement permissions already exist';
END
GO

-- ============================================================================
-- Assign procurement permissions to roles
-- ============================================================================
PRINT 'Assigning procurement permissions to roles...';

DECLARE @generalUserId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'GENERAL_USER');
DECLARE @wingUserLId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'WING_USER');
DECLARE @wingSupervisorId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'WING_SUPERVISOR');
DECLARE @adminId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'ADMIN');
DECLARE @superAdminId UNIQUEIDENTIFIER = (SELECT id FROM ims_roles WHERE role_name = 'SUPER_ADMIN');

-- GENERAL_USER and WING_USER can request and view own
IF @generalUserId IS NOT NULL
BEGIN
    INSERT INTO ims_role_permissions (role_id, permission_id)
    SELECT @generalUserId, id FROM ims_permissions 
    WHERE permission_key IN ('procurement.request', 'procurement.view_own')
    AND NOT EXISTS (
        SELECT 1 FROM ims_role_permissions 
        WHERE role_id = @generalUserId AND permission_id = ims_permissions.id
    );
    PRINT 'Assigned procurement permissions to GENERAL_USER';
END

IF @wingUserLId IS NOT NULL
BEGIN
    INSERT INTO ims_role_permissions (role_id, permission_id)
    SELECT @wingUserLId, id FROM ims_permissions 
    WHERE permission_key IN ('procurement.request', 'procurement.view_own')
    AND NOT EXISTS (
        SELECT 1 FROM ims_role_permissions 
        WHERE role_id = @wingUserLId AND permission_id = ims_permissions.id
    );
    PRINT 'Assigned procurement permissions to WING_USER';
END

-- WING_SUPERVISOR can request, view wing, and receive deliveries
IF @wingSupervisorId IS NOT NULL
BEGIN
    INSERT INTO ims_role_permissions (role_id, permission_id)
    SELECT @wingSupervisorId, id FROM ims_permissions 
    WHERE permission_key IN ('procurement.request', 'procurement.view_own', 'procurement.view_wing', 'procurement.receive_delivery')
    AND NOT EXISTS (
        SELECT 1 FROM ims_role_permissions 
        WHERE role_id = @wingSupervisorId AND permission_id = ims_permissions.id
    );
    PRINT 'Assigned procurement permissions to WING_SUPERVISOR';
END

-- ADMIN can approve and manage deliveries
IF @adminId IS NOT NULL
BEGIN
    INSERT INTO ims_role_permissions (role_id, permission_id)
    SELECT @adminId, id FROM ims_permissions 
    WHERE permission_key IN ('procurement.approve', 'procurement.manage_delivery', 'procurement.view_all', 'procurement.receive_delivery')
    AND NOT EXISTS (
        SELECT 1 FROM ims_role_permissions 
        WHERE role_id = @adminId AND permission_id = ims_permissions.id
    );
    PRINT 'Assigned procurement permissions to ADMIN';
END

-- SUPER_ADMIN gets all procurement permissions
IF @superAdminId IS NOT NULL
BEGIN
    INSERT INTO ims_role_permissions (role_id, permission_id)
    SELECT @superAdminId, id FROM ims_permissions 
    WHERE permission_key LIKE 'procurement.%'
    AND NOT EXISTS (
        SELECT 1 FROM ims_role_permissions 
        WHERE role_id = @superAdminId AND permission_id = ims_permissions.id
    );
    PRINT 'Assigned all procurement permissions to SUPER_ADMIN';
END
GO

-- ============================================================================
-- Verification and Summary
-- ============================================================================
PRINT '============================================================================';
PRINT 'PROCUREMENT TABLES CREATED SUCCESSFULLY';
PRINT '============================================================================';
PRINT '';
PRINT 'Tables created:';
PRINT '  - procurement_requests';
PRINT '  - procurement_request_items';
PRINT '  - procurement_deliveries';
PRINT '  - procurement_delivery_items';
PRINT '';
PRINT 'Triggers created:';
PRINT '  - trg_procurement_request_number (auto-generate request numbers)';
PRINT '  - trg_procurement_delivery_number (auto-generate delivery numbers)';
PRINT '  - trg_procurement_requests_update (auto-update timestamps)';
PRINT '  - trg_procurement_deliveries_update (auto-update timestamps)';
PRINT '';
PRINT 'Permissions created and assigned to roles';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Implement backend API endpoints';
PRINT '  2. Create frontend UI for procurement requests';
PRINT '  3. Test the complete workflow';
PRINT '============================================================================';
GO
