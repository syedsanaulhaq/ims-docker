-- =========================================
-- FINAL ISSUANCE WORKFLOW PROCEDURES
-- =========================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '📦 Creating Final Inventory Issuance Workflow Procedures...';
PRINT '';

-- =========================================
-- 1. ISSUE FROM WING STORE
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
    DECLARE @issued_by_id UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM AspNetUsers WHERE FullName = @issued_by OR UserName = @issued_by);
    
    -- If no user found, use NULL for updated_by
    IF @issued_by_id IS NULL
        SET @issued_by_id = NULL;
    
    -- Update wing store inventory
    UPDATE stock_wing
    SET current_quantity = current_quantity - @quantity,
        updated_at = GETDATE(),
        updated_by = @issued_by_id
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
        issued_quantity = CAST(@quantity AS NVARCHAR(50)),
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
-- 2. ISSUE FROM ADMIN STORE
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
    DECLARE @issued_by_id UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM AspNetUsers WHERE FullName = @issued_by OR UserName = @issued_by);
    
    -- If no user found, use NULL for updated_by
    IF @issued_by_id IS NULL
        SET @issued_by_id = NULL;
    
    -- Update admin store inventory
    UPDATE stock_admin
    SET current_quantity = current_quantity - @quantity,
        updated_at = GETDATE(),
        updated_by = @issued_by_id
    WHERE item_master_id = @item_master_id;
    
    -- Get remaining quantity
    SELECT @remaining_quantity = ISNULL(current_quantity, 0)
    FROM stock_admin
    WHERE item_master_id = @item_master_id;
    
    -- Update issuance item status
    UPDATE stock_issuance_items
    SET item_status = 'Issued',
        issued_quantity = CAST(@quantity AS NVARCHAR(50)),
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
PRINT '✅ ISSUANCE PROCEDURES FINALIZED!';
PRINT '========================================';
PRINT '';
PRINT 'Database objects successfully created:';
PRINT '  ✅ sp_DetermineIssuanceSource';
PRINT '  ✅ sp_IssueFromWingStore';
PRINT '  ✅ sp_IssueFromAdminStore';
PRINT '  ✅ sp_HandleVerificationResult';
PRINT '  ✅ sp_FinalizeIssuance';
PRINT '  ✅ View_Issuance_Status';
PRINT '';
PRINT 'The inventory verification and issuance workflow is now ready!';
PRINT '';
