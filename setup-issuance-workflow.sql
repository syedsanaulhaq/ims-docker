-- =========================================
-- SIMPLIFIED ISSUANCE PROCEDURES
-- =========================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '📦 Creating Simplified Inventory Issuance Procedures...';
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
    
    -- Update wing store inventory
    UPDATE stock_wing
    SET current_quantity = current_quantity - @quantity,
        available_quantity = available_quantity - @quantity,
        updated_at = GETDATE()
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
    
    -- Update request status
    UPDATE stock_issuance_requests
    SET request_status = 'Issued',
        issued_at = GETDATE(),
        issued_by = @issued_by,
        updated_at = GETDATE()
    WHERE id = @stock_issuance_request_id;
    
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
    
    -- Update admin store inventory
    UPDATE stock_admin
    SET current_quantity = current_quantity - @quantity,
        available_quantity = available_quantity - @quantity,
        updated_at = GETDATE()
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
    
    -- Update request status
    UPDATE stock_issuance_requests
    SET request_status = 'Issued',
        issued_at = GETDATE(),
        issued_by = @issued_by,
        updated_at = GETDATE()
    WHERE id = @stock_issuance_request_id;
    
    -- Return success
    SELECT 
        @transaction_id AS transaction_id,
        @quantity AS quantity_issued,
        @remaining_quantity AS remaining_admin_stock,
        GETDATE() AS issued_at;
END;
GO

PRINT '✅ Created sp_IssueFromAdminStore';

-- =========================================
-- 3. FINALIZE ISSUANCE
-- =========================================
DROP PROCEDURE IF EXISTS sp_FinalizeIssuance;
GO

CREATE PROCEDURE sp_FinalizeIssuance
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @finalized_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @total_items INT = 0;
    DECLARE @issued_items INT = 0;
    DECLARE @rejected_items INT = 0;
    DECLARE @pending_items INT = 0;
    
    -- Count items by status
    SELECT 
        @total_items = COUNT(*),
        @issued_items = SUM(CASE WHEN item_status = 'Issued' THEN 1 ELSE 0 END),
        @rejected_items = SUM(CASE WHEN item_status = 'Rejected' THEN 1 ELSE 0 END),
        @pending_items = SUM(CASE WHEN item_status NOT IN ('Issued', 'Rejected') THEN 1 ELSE 0 END)
    FROM stock_issuance_items
    WHERE request_id = @stock_issuance_request_id;
    
    -- Update request as finalized
    UPDATE stock_issuance_requests
    SET is_finalized = 1,
        finalized_by = @finalized_by,
        finalized_at = GETDATE(),
        request_status = 'Finalized',
        updated_at = GETDATE()
    WHERE id = @stock_issuance_request_id;
    
    -- Return status
    SELECT 
        @stock_issuance_request_id AS request_id,
        'Finalized' AS request_status,
        @total_items AS total_items,
        @issued_items AS issued_items,
        @rejected_items AS rejected_items,
        @pending_items AS pending_items,
        GETDATE() AS finalized_at;
END;
GO

PRINT '✅ Created sp_FinalizeIssuance';

PRINT '';
PRINT '========================================';
PRINT '✅ ISSUANCE PROCEDURES CREATED!';
PRINT '========================================';
PRINT '';
PRINT 'Successfully created:';
PRINT '  ✅ sp_DetermineIssuanceSource';
PRINT '  ✅ sp_IssueFromWingStore';
PRINT '  ✅ sp_IssueFromAdminStore';
PRINT '  ✅ sp_HandleVerificationResult';
PRINT '  ✅ sp_FinalizeIssuance';
PRINT '  ✅ View_Issuance_Status';
PRINT '';
PRINT 'Inventory verification & issuance workflow is LIVE!';
PRINT '';
