-- =========================================
-- FIXED ISSUANCE WORKFLOW PROCEDURES - Version 2
-- =========================================
-- Corrected procedures without TRY/CATCH blocks

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '📦 Creating Fixed Inventory Issuance Workflow Procedures v2...';
PRINT '';

-- =========================================
-- 1. ISSUE FROM WING STORE (Simplified)
-- =========================================
DROP PROCEDURE IF EXISTS sp_IssueFromWingStore;
GO

CREATE PROCEDURE sp_IssueFromWingStore
    @stock_issuance_item_id UNIQUEIDENTIFIER,
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @item_master_id UNIQUEIDENTIFIER,
    @quantity INT,
    @wing_id INT,
    @issued_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @transaction_id UNIQUEIDENTIFIER = NEWID();
    DECLARE @remaining_quantity INT = 0;
    
    -- Update wing store inventory
    UPDATE stock_wing
    SET current_quantity = current_quantity - @quantity,
        last_updated = GETDATE(),
        updated_by = @issued_by
    WHERE item_master_id = @item_master_id 
      AND wing_id = @wing_id;
    
    -- Get remaining quantity
    SELECT @remaining_quantity = ISNULL(current_quantity, 0)
    FROM stock_wing
    WHERE item_master_id = @item_master_id 
      AND wing_id = @wing_id;
    
    -- Update issuance item status
    UPDATE stock_issuance_items
    SET item_status = 'Issued',
        issued_quantity = @quantity,
        source_store_type = 'wing_store',
        updated_at = GETDATE()
    WHERE id = @stock_issuance_item_id;
    
    -- Create transaction record
    INSERT INTO stock_transactions_clean (
        id, item_master_id, type, quantity, remarks, created_at
    )
    VALUES (
        @transaction_id, @item_master_id, 'OUT', @quantity,
        'Issued from wing store - Request: ' + CAST(@stock_issuance_request_id AS NVARCHAR(MAX)),
        GETDATE()
    );
    
    -- Return success
    SELECT 
        @transaction_id AS transaction_id,
        @quantity AS quantity_issued,
        @remaining_quantity AS remaining_wing_stock,
        GETDATE() AS issued_at;
END;
GO

PRINT '✅ Created sp_IssueFromWingStore';

-- =========================================
-- 2. ISSUE FROM ADMIN STORE (Simplified)
-- =========================================
DROP PROCEDURE IF EXISTS sp_IssueFromAdminStore;
GO

CREATE PROCEDURE sp_IssueFromAdminStore
    @stock_issuance_item_id UNIQUEIDENTIFIER,
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @item_master_id UNIQUEIDENTIFIER,
    @quantity INT,
    @issued_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @transaction_id UNIQUEIDENTIFIER = NEWID();
    DECLARE @remaining_quantity INT = 0;
    
    -- Update admin store inventory
    UPDATE stock_admin
    SET current_quantity = current_quantity - @quantity,
        last_updated = GETDATE(),
        updated_by = @issued_by
    WHERE item_master_id = @item_master_id;
    
    -- Get remaining quantity
    SELECT @remaining_quantity = ISNULL(current_quantity, 0)
    FROM stock_admin
    WHERE item_master_id = @item_master_id;
    
    -- Update issuance item status
    UPDATE stock_issuance_items
    SET item_status = 'Issued',
        issued_quantity = @quantity,
        source_store_type = 'admin_store',
        updated_at = GETDATE()
    WHERE id = @stock_issuance_item_id;
    
    -- Create transaction record
    INSERT INTO stock_transactions_clean (
        id, item_master_id, type, quantity, remarks, created_at
    )
    VALUES (
        @transaction_id, @item_master_id, 'OUT', @quantity,
        'Issued from admin store - Request: ' + CAST(@stock_issuance_request_id AS NVARCHAR(MAX)),
        GETDATE()
    );
    
    -- Return success
    SELECT 
        @transaction_id AS transaction_id,
        @quantity AS quantity_issued,
        @remaining_quantity AS remaining_admin_stock,
        GETDATE() AS issued_at;
END;
GO

PRINT '✅ Created sp_IssueFromAdminStore';

PRINT '';
PRINT '========================================';
PRINT '✅ PROCEDURES UPDATED SUCCESSFULLY!';
PRINT '========================================';
PRINT '';
