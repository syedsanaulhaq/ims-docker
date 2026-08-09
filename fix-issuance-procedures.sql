-- =========================================
-- FIXED ISSUANCE WORKFLOW PROCEDURES
-- =========================================
-- Corrected procedures that work with actual database schema

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '📦 Creating Fixed Inventory Issuance Workflow Procedures...';
PRINT '';

-- =========================================
-- 1. DETERMINE ISSUANCE SOURCE
-- =========================================
DROP PROCEDURE IF EXISTS sp_DetermineIssuanceSource;
GO

CREATE PROCEDURE sp_DetermineIssuanceSource
    @item_master_id UNIQUEIDENTIFIER,
    @required_quantity INT,
    @wing_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @wing_available INT = 0;
    DECLARE @admin_available INT = 0;
    DECLARE @issuance_source NVARCHAR(50);
    
    -- Check wing store availability
    SELECT @wing_available = ISNULL(current_quantity, 0)
    FROM stock_wing
    WHERE item_master_id = @item_master_id 
      AND wing_id = @wing_id;
    
    -- Check admin store availability
    SELECT @admin_available = ISNULL(current_quantity, 0)
    FROM stock_admin
    WHERE item_master_id = @item_master_id;
    
    -- Determine source
    IF @wing_available >= @required_quantity
    BEGIN
        SET @issuance_source = 'wing_store';
    END
    ELSE IF @admin_available >= @required_quantity
    BEGIN
        SET @issuance_source = 'admin_store';
    END
    ELSE IF (@wing_available + @admin_available) >= @required_quantity
    BEGIN
        SET @issuance_source = 'mixed';
    END
    ELSE
    BEGIN
        SET @issuance_source = 'procurement';
    END
    
    -- Return results
    SELECT 
        @issuance_source AS issuance_source,
        @wing_available AS wing_available_quantity,
        @admin_available AS admin_available_quantity,
        (@wing_available + @admin_available) AS total_available_quantity;
    
END;
GO

PRINT '✅ Created sp_DetermineIssuanceSource';

-- =========================================
-- 2. ISSUE FROM WING STORE
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
    DECLARE @remaining_quantity INT;
    
    BEGIN TRANSACTION;
    
    TRY
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
        
        COMMIT TRANSACTION;
        
        -- Return success
        SELECT 
            @transaction_id AS transaction_id,
            @quantity AS quantity_issued,
            @remaining_quantity AS remaining_wing_stock,
            GETDATE() AS issued_at;
    
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

PRINT '✅ Created sp_IssueFromWingStore';

-- =========================================
-- 3. ISSUE FROM ADMIN STORE
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
    DECLARE @remaining_quantity INT;
    
    BEGIN TRANSACTION;
    
    TRY
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
        
        COMMIT TRANSACTION;
        
        -- Return success
        SELECT 
            @transaction_id AS transaction_id,
            @quantity AS quantity_issued,
            @remaining_quantity AS remaining_admin_stock,
            GETDATE() AS issued_at;
    
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

PRINT '✅ Created sp_IssueFromAdminStore';

-- =========================================
-- 4. HANDLE VERIFICATION RESULT
-- =========================================
DROP PROCEDURE IF EXISTS sp_HandleVerificationResult;
GO

CREATE PROCEDURE sp_HandleVerificationResult
    @stock_issuance_item_id UNIQUEIDENTIFIER,
    @verification_result NVARCHAR(50), -- 'available', 'partial', 'unavailable'
    @available_quantity INT = NULL,
    @verification_notes NVARCHAR(MAX) = NULL,
    @verified_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @new_status NVARCHAR(50);
    
    -- Determine status based on result
    IF @verification_result = 'available'
        SET @new_status = 'Approved';
    ELSE IF @verification_result = 'partial'
        SET @new_status = 'Approved';
    ELSE IF @verification_result = 'unavailable'
        SET @new_status = 'Procurement_Required';
    ELSE
        SET @new_status = 'Pending';
    
    -- Update item with verification result
    UPDATE stock_issuance_items
    SET item_status = @new_status,
        approved_quantity = CASE 
            WHEN @verification_result = 'partial' THEN @available_quantity
            WHEN @verification_result = 'available' THEN requested_quantity
            ELSE 0
        END,
        updated_at = GETDATE()
    WHERE id = @stock_issuance_item_id;
    
    -- Return results
    SELECT 
        @stock_issuance_item_id AS item_id,
        @new_status AS new_status,
        @available_quantity AS available_quantity,
        GETDATE() AS verified_at,
        @verified_by AS verified_by;
END;
GO

PRINT '✅ Created sp_HandleVerificationResult';

-- =========================================
-- 5. FINALIZE ISSUANCE
-- =========================================
DROP PROCEDURE IF EXISTS sp_FinalizeIssuance;
GO

CREATE PROCEDURE sp_FinalizeIssuance
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @finalized_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @total_items INT;
    DECLARE @issued_items INT;
    DECLARE @rejected_items INT;
    DECLARE @pending_items INT;
    
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

-- =========================================
-- 6. ISSUANCE STATUS VIEW
-- =========================================
DROP VIEW IF EXISTS View_Issuance_Status;
GO

CREATE VIEW View_Issuance_Status AS
SELECT 
    sir.id AS request_id,
    COUNT(sii.id) AS total_items,
    SUM(CASE WHEN sii.item_status = 'Issued' THEN 1 ELSE 0 END) AS issued_items,
    SUM(CASE WHEN sii.item_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_items,
    SUM(CASE WHEN sii.item_status NOT IN ('Issued', 'Rejected') THEN 1 ELSE 0 END) AS pending_items,
    CAST(
        SUM(CASE WHEN sii.item_status = 'Issued' THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(sii.id), 0) 
        AS INT
    ) AS issuance_rate,
    sir.updated_at AS last_updated,
    sir.finalized_at AS finalized_at
FROM stock_issuance_requests sir
LEFT JOIN stock_issuance_items sii ON sir.id = sii.request_id
GROUP BY sir.id, sir.updated_at, sir.finalized_at;
GO

PRINT '✅ Created View_Issuance_Status';

PRINT '';
PRINT '========================================';
PRINT '✅ FIXED ISSUANCE WORKFLOW COMPLETE!';
PRINT '========================================';
PRINT '';
PRINT 'Procedures Created:';
PRINT '  ✅ sp_DetermineIssuanceSource';
PRINT '  ✅ sp_IssueFromWingStore';
PRINT '  ✅ sp_IssueFromAdminStore';
PRINT '  ✅ sp_HandleVerificationResult';
PRINT '  ✅ sp_FinalizeIssuance';
PRINT '';
PRINT 'Views Created:';
PRINT '  ✅ View_Issuance_Status';
PRINT '';
