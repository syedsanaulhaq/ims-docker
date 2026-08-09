-- Fix for stock_personal and stock_transfer_log with correct user_id type

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Create stock_personal with NVARCHAR(450) for user_id
CREATE TABLE dbo.stock_personal (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    user_id NVARCHAR(450) NOT NULL,  -- Changed to match AspNetUsers.Id
    wing_id INT NOT NULL,
    
    issued_quantity INT NOT NULL,
    current_quantity INT NOT NULL,
    
    issued_date DATETIME2 NOT NULL,
    issued_by NVARCHAR(450) NULL,  -- Changed
    issuance_request_id UNIQUEIDENTIFIER NULL,
    
    is_returnable BIT NOT NULL CONSTRAINT DF_stock_personal_returnable DEFAULT 1,
    expected_return_date DATE NULL,
    return_status NVARCHAR(20) CONSTRAINT DF_stock_personal_return_status DEFAULT 'Not Returned' 
        CHECK (return_status IN ('Not Returned', 'Partially Returned', 'Fully Returned', 'Overdue')),
    actual_return_date DATETIME2 NULL,
    returned_quantity INT CONSTRAINT DF_stock_personal_returned DEFAULT 0,
    
    purpose NVARCHAR(MAX) NULL,
    issuance_notes NVARCHAR(MAX) NULL,
    condition_at_issue NVARCHAR(100) NULL,
    condition_at_return NVARCHAR(100) NULL,
    
    unit_price DECIMAL(15, 2) CONSTRAINT DF_stock_personal_price DEFAULT 0,
    total_value AS (CAST(current_quantity AS DECIMAL(15,2)) * unit_price) PERSISTED,
    
    item_status NVARCHAR(20) CONSTRAINT DF_stock_personal_status DEFAULT 'In Use' 
        CHECK (item_status IN ('In Use', 'Returned', 'Damaged', 'Lost', 'Under Maintenance')),
    
    created_at DATETIME2 CONSTRAINT DF_stock_personal_created DEFAULT GETDATE(),
    updated_at DATETIME2 CONSTRAINT DF_stock_personal_updated DEFAULT GETDATE(),
    
    CONSTRAINT FK_stock_personal_item FOREIGN KEY (item_master_id) 
        REFERENCES dbo.item_masters(id),
    CONSTRAINT FK_stock_personal_user FOREIGN KEY (user_id) 
        REFERENCES dbo.AspNetUsers(Id),
    CONSTRAINT FK_stock_personal_issued_by FOREIGN KEY (issued_by) 
        REFERENCES dbo.AspNetUsers(Id)
);

CREATE INDEX IX_stock_personal_item ON dbo.stock_personal(item_master_id);
CREATE INDEX IX_stock_personal_user ON dbo.stock_personal(user_id);
CREATE INDEX IX_stock_personal_wing ON dbo.stock_personal(wing_id);
CREATE INDEX IX_stock_personal_status ON dbo.stock_personal(return_status);

PRINT '✅ Created stock_personal table';
GO

-- Create stock_transfer_log with NVARCHAR(450) for user_id
CREATE TABLE dbo.stock_transfer_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    transfer_number NVARCHAR(50) UNIQUE NOT NULL,
    transfer_date DATETIME2 NOT NULL CONSTRAINT DF_transfer_date DEFAULT GETDATE(),
    
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    quantity INT NOT NULL,
    
    from_store_type NVARCHAR(20) NOT NULL 
        CHECK (from_store_type IN ('Admin', 'Wing', 'Personal')),
    from_wing_id INT NULL,
    from_user_id NVARCHAR(450) NULL,  -- Changed
    
    to_store_type NVARCHAR(20) NOT NULL 
        CHECK (to_store_type IN ('Admin', 'Wing', 'Personal')),
    to_wing_id INT NULL,
    to_user_id NVARCHAR(450) NULL,  -- Changed
    
    transfer_type NVARCHAR(30) NOT NULL 
        CHECK (transfer_type IN ('Admin to Wing', 'Wing to Personal', 'Personal Return to Wing', 'Wing Return to Admin')),
    transfer_reason NVARCHAR(MAX) NULL,
    request_reference UNIQUEIDENTIFIER NULL,
    
    approved_by NVARCHAR(450) NULL,  -- Changed
    approved_at DATETIME2 NULL,
    
    transfer_status NVARCHAR(20) CONSTRAINT DF_transfer_status DEFAULT 'Completed' 
        CHECK (transfer_status IN ('Pending', 'In Transit', 'Completed', 'Cancelled')),
    
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 CONSTRAINT DF_transfer_created DEFAULT GETDATE(),
    created_by NVARCHAR(450) NULL,  -- Changed
    
    CONSTRAINT FK_transfer_item FOREIGN KEY (item_master_id) 
        REFERENCES dbo.item_masters(id),
    CONSTRAINT FK_transfer_from_user FOREIGN KEY (from_user_id) 
        REFERENCES dbo.AspNetUsers(Id),
    CONSTRAINT FK_transfer_to_user FOREIGN KEY (to_user_id) 
        REFERENCES dbo.AspNetUsers(Id),
    CONSTRAINT FK_transfer_approved_by FOREIGN KEY (approved_by) 
        REFERENCES dbo.AspNetUsers(Id),
    CONSTRAINT FK_transfer_created_by FOREIGN KEY (created_by) 
        REFERENCES dbo.AspNetUsers(Id)
);

CREATE INDEX IX_transfer_item ON dbo.stock_transfer_log(item_master_id);
CREATE INDEX IX_transfer_date ON dbo.stock_transfer_log(transfer_date);
CREATE INDEX IX_transfer_from_wing ON dbo.stock_transfer_log(from_wing_id);
CREATE INDEX IX_transfer_to_wing ON dbo.stock_transfer_log(to_wing_id);
CREATE INDEX IX_transfer_status ON dbo.stock_transfer_log(transfer_status);

PRINT '✅ Created stock_transfer_log table';
GO

-- Recreate the view
IF OBJECT_ID('dbo.vw_stock_all_levels', 'V') IS NOT NULL
    DROP VIEW dbo.vw_stock_all_levels;
GO

CREATE VIEW dbo.vw_stock_all_levels AS
SELECT 
    'Admin' AS store_level,
    NULL AS wing_id,
    NULL AS user_id,
    sa.item_master_id,
    im.nomenclature,
    sa.current_quantity,
    sa.available_quantity,
    sa.reserved_quantity,
    sa.stock_status,
    sa.storage_location,
    sa.unit_price,
    sa.total_value
FROM dbo.stock_admin sa
JOIN dbo.item_masters im ON sa.item_master_id = im.id

UNION ALL

SELECT 
    'Wing' AS store_level,
    sw.wing_id,
    NULL AS user_id,
    sw.item_master_id,
    im.nomenclature,
    sw.current_quantity,
    sw.available_quantity,
    sw.reserved_quantity,
    sw.stock_status,
    sw.storage_location,
    sw.unit_price,
    sw.total_value
FROM dbo.stock_wing sw
JOIN dbo.item_masters im ON sw.item_master_id = im.id

UNION ALL

SELECT 
    'Personal' AS store_level,
    sp.wing_id,
    sp.user_id,
    sp.item_master_id,
    im.nomenclature,
    sp.current_quantity,
    sp.current_quantity AS available_quantity,
    0 AS reserved_quantity,
    sp.item_status AS stock_status,
    NULL AS storage_location,
    sp.unit_price,
    sp.total_value
FROM dbo.stock_personal sp
JOIN dbo.item_masters im ON sp.item_master_id = im.id;
GO

PRINT '✅ Created vw_stock_all_levels view';
PRINT '';
PRINT '========================================';
PRINT '✅ ALL THREE-LEVEL TABLES CREATED!';
PRINT '========================================';
