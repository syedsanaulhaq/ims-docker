-- =========================================
-- INVENTORY ISSUANCE WORKFLOW STORED PROCEDURES
-- =========================================
-- Handles item issuance from wing or admin stores based on verification

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '🔄 Creating Inventory Issuance Workflow Procedures...';
PRINT '';

-- =========================================
-- 1. DETERMINE ISSUANCE SOURCE
-- =========================================
-- Determines whether item should be issued from wing or admin store

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_DetermineIssuanceSource')
    DROP PROCEDURE dbo.sp_DetermineIssuanceSource;
GO

CREATE PROCEDURE dbo.sp_DetermineIssuanceSource
    @StockIssuanceId UNIQUEIDENTIFIER,
    @ItemMasterId INT,
    @RequestedQuantity INT,
    @WingId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AvailableInWing INT;
    DECLARE @AvailableInAdmin INT;
    DECLARE @IssuanceSource NVARCHAR(20);
    DECLARE @AvailableForIssuance INT;
    
    -- Check wing store availability
    SELECT @AvailableInWing = ISNULL(SUM(current_quantity), 0)
    FROM dbo.View_Current_Inv_Stock
    WHERE item_master_id = @ItemMasterId
        AND wing_id = @WingId;
    
    -- Check admin store availability
    SELECT @AvailableInAdmin = ISNULL(SUM(current_quantity), 0)
    FROM dbo.View_Current_Inv_Stock
    WHERE item_master_id = @ItemMasterId
        AND wing_id IS NULL; -- Admin central store
    
    -- Determine issuance source
    IF @AvailableInWing >= @RequestedQuantity
    BEGIN
        SET @IssuanceSource = 'wing_store';
        SET @AvailableForIssuance = @AvailableInWing;
    END
    ELSE IF (@AvailableInWing + @AvailableInAdmin) >= @RequestedQuantity
    BEGIN
        SET @IssuanceSource = 'mixed';
        SET @AvailableForIssuance = @AvailableInWing + @AvailableInAdmin;
    END
    ELSE IF @AvailableInAdmin >= @RequestedQuantity
    BEGIN
        SET @IssuanceSource = 'admin_store';
        SET @AvailableForIssuance = @AvailableInAdmin;
    END
    ELSE
    BEGIN
        SET @IssuanceSource = 'procurement';
        SET @AvailableForIssuance = @AvailableInWing + @AvailableInAdmin;
    END
    
    -- Return results
    SELECT 
        @StockIssuanceId AS stock_issuance_id,
        @ItemMasterId AS item_master_id,
        @RequestedQuantity AS requested_quantity,
        @AvailableInWing AS available_in_wing,
        @AvailableInAdmin AS available_in_admin,
        @AvailableForIssuance AS total_available,
        @IssuanceSource AS issuance_source,
        CASE 
            WHEN @IssuanceSource = 'wing_store' THEN 'Item can be fully issued from wing store'
            WHEN @IssuanceSource = 'admin_store' THEN 'Item must be issued from admin central store'
            WHEN @IssuanceSource = 'mixed' THEN 'Item will be issued from wing and admin stores'
            ELSE 'Item unavailable - requires procurement'
        END AS issuance_notes;
END
GO

PRINT '✅ Created sp_DetermineIssuanceSource';
GO

-- =========================================
-- 2. ISSUE ITEM FROM WING STORE
-- =========================================
-- Records actual issuance from wing store and updates inventory

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_IssueFromWingStore')
    DROP PROCEDURE dbo.sp_IssueFromWingStore;
GO

CREATE PROCEDURE dbo.sp_IssueFromWingStore
    @StockIssuanceId UNIQUEIDENTIFIER,
    @ItemMasterId INT,
    @RequestedQuantity INT,
    @WingId INT,
    @IssuedByUserId NVARCHAR(450),
    @IssuedByName NVARCHAR(255),
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Update stock issuance item status
        UPDATE stock_issuance_items
        SET 
            item_status = 'issued',
            approved_quantity = @RequestedQuantity,
            source_store_type = 'wing',
            inventory_checked_at = GETDATE(),
            inventory_checked_by = @IssuedByUserId
        WHERE stock_issuance_id = @StockIssuanceId
            AND item_master_id = @ItemMasterId;
        
        -- Create stock transaction (debit from wing store)
        INSERT INTO stock_transactions (
            item_master_id,
            transaction_type,
            quantity,
            transaction_date,
            wing_id,
            notes,
            created_by,
            reference_id
        )
        VALUES (
            @ItemMasterId,
            'ISSUANCE',
            -@RequestedQuantity,
            GETDATE(),
            @WingId,
            CONCAT('Issued for stock issuance request: ', @StockIssuanceId, '. ', ISNULL(@Notes, '')),
            @IssuedByUserId,
            @StockIssuanceId
        );
        
        -- Update overall stock issuance status
        UPDATE stock_issuance_requests
        SET 
            issuance_source = 'wing_store',
            request_status = 'issued'
        WHERE id = @StockIssuanceId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS success,
            'Item issued successfully from wing store' AS message;
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(MAX);
        SET @ErrorMessage = ERROR_MESSAGE();
        
        SELECT 
            0 AS success,
            @ErrorMessage AS message;
    END CATCH
END
GO

PRINT '✅ Created sp_IssueFromWingStore';
GO

-- =========================================
-- 3. ISSUE ITEM FROM ADMIN STORE
-- =========================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_IssueFromAdminStore')
    DROP PROCEDURE dbo.sp_IssueFromAdminStore;
GO

CREATE PROCEDURE dbo.sp_IssueFromAdminStore
    @StockIssuanceId UNIQUEIDENTIFIER,
    @ItemMasterId INT,
    @RequestedQuantity INT,
    @IssuedByUserId NVARCHAR(450),
    @IssuedByName NVARCHAR(255),
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Update stock issuance item status
        UPDATE stock_issuance_items
        SET 
            item_status = 'issued',
            approved_quantity = @RequestedQuantity,
            source_store_type = 'admin',
            inventory_checked_at = GETDATE(),
            inventory_checked_by = @IssuedByUserId
        WHERE stock_issuance_id = @StockIssuanceId
            AND item_master_id = @ItemMasterId;
        
        -- Create stock transaction (debit from admin central store)
        INSERT INTO stock_transactions (
            item_master_id,
            transaction_type,
            quantity,
            transaction_date,
            notes,
            created_by,
            reference_id
        )
        VALUES (
            @ItemMasterId,
            'ISSUANCE',
            -@RequestedQuantity,
            GETDATE(),
            CONCAT('Issued from admin store for stock issuance request: ', @StockIssuanceId, '. ', ISNULL(@Notes, '')),
            @IssuedByUserId,
            @StockIssuanceId
        );
        
        -- Update overall stock issuance status
        UPDATE stock_issuance_requests
        SET 
            issuance_source = 'admin_store',
            request_status = 'issued'
        WHERE id = @StockIssuanceId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS success,
            'Item issued successfully from admin store' AS message;
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(MAX);
        SET @ErrorMessage = ERROR_MESSAGE();
        
        SELECT 
            0 AS success,
            @ErrorMessage AS message;
    END CATCH
END
GO

PRINT '✅ Created sp_IssueFromAdminStore';
GO

-- =========================================
-- 4. HANDLE INVENTORY VERIFICATION RESULT
-- =========================================
-- Updates issuance status based on verification results

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_HandleVerificationResult')
    DROP PROCEDURE dbo.sp_HandleVerificationResult;
GO

CREATE PROCEDURE dbo.sp_HandleVerificationResult
    @VerificationId INT,
    @VerificationStatus NVARCHAR(30),
    @AvailableQuantity INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @StockIssuanceId UNIQUEIDENTIFIER;
    DECLARE @ItemMasterId INT;
    DECLARE @RequestedQuantity INT;
    
    -- Get verification details
    SELECT 
        @StockIssuanceId = stock_issuance_id,
        @ItemMasterId = item_master_id,
        @RequestedQuantity = requested_quantity
    FROM inventory_verification_requests
    WHERE id = @VerificationId;
    
    IF @VerificationStatus = 'verified_available'
    BEGIN
        -- Item is available - can be approved and issued
        UPDATE stock_issuance_items
        SET inventory_check_status = 'available'
        WHERE stock_issuance_id = @StockIssuanceId
            AND item_master_id = @ItemMasterId;
    END
    ELSE IF @VerificationStatus = 'verified_partial'
    BEGIN
        -- Only partial quantity available
        UPDATE stock_issuance_items
        SET 
            inventory_check_status = 'partial',
            wing_store_quantity = @AvailableQuantity
        WHERE stock_issuance_id = @StockIssuanceId
            AND item_master_id = @ItemMasterId;
    END
    ELSE IF @VerificationStatus = 'verified_unavailable'
    BEGIN
        -- Item not available in wing - must get from admin or procurement
        UPDATE stock_issuance_items
        SET inventory_check_status = 'unavailable'
        WHERE stock_issuance_id = @StockIssuanceId
            AND item_master_id = @ItemMasterId;
    END
    
    SELECT 
        @StockIssuanceId AS stock_issuance_id,
        @ItemMasterId AS item_master_id,
        @VerificationStatus AS verification_status,
        'Verification result processed' AS message;
END
GO

PRINT '✅ Created sp_HandleVerificationResult';
GO

-- =========================================
-- 5. FINALIZE ISSUANCE
-- =========================================
-- Marks request as complete after all items issued

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_FinalizeIssuance')
    DROP PROCEDURE dbo.sp_FinalizeIssuance;
GO

CREATE PROCEDURE dbo.sp_FinalizeIssuance
    @StockIssuanceId UNIQUEIDENTIFIER,
    @FinalizedByUserId NVARCHAR(450),
    @FinalizedByName NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Check if all items are issued
        DECLARE @PendingItems INT;
        SELECT @PendingItems = COUNT(*)
        FROM stock_issuance_items
        WHERE stock_issuance_id = @StockIssuanceId
            AND item_status NOT IN ('issued', 'rejected');
        
        IF @PendingItems > 0
        BEGIN
            SELECT 
                0 AS success,
                'Cannot finalize: Some items are still pending' AS message;
        END
        ELSE
        BEGIN
            -- All items issued - finalize request
            UPDATE stock_issuance_requests
            SET 
                request_status = 'finalized',
                updated_at = GETDATE()
            WHERE id = @StockIssuanceId;
            
            COMMIT TRANSACTION;
            
            SELECT 
                1 AS success,
                'Stock issuance request finalized successfully' AS message;
        END
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(MAX);
        SET @ErrorMessage = ERROR_MESSAGE();
        
        SELECT 
            0 AS success,
            @ErrorMessage AS message;
    END CATCH
END
GO

PRINT '✅ Created sp_FinalizeIssuance';
GO

-- =========================================
-- 6. CREATE VIEW FOR ISSUANCE STATUS
-- =========================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Issuance_Status')
    DROP VIEW dbo.View_Issuance_Status;
GO

CREATE VIEW dbo.View_Issuance_Status AS
SELECT 
    sir.id AS stock_issuance_id,
    sir.purpose AS request_purpose,
    sir.request_status AS status,
    sir.issuance_source,
    COUNT(sii.id) AS total_items,
    SUM(CASE WHEN sii.item_status = 'issued' THEN 1 ELSE 0 END) AS issued_items,
    SUM(CASE WHEN sii.item_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_items,
    SUM(CASE WHEN sii.item_status NOT IN ('issued', 'rejected') THEN 1 ELSE 0 END) AS pending_items,
    sir.created_at,
    sir.updated_at
FROM stock_issuance_requests sir
LEFT JOIN stock_issuance_items sii ON sir.id = sii.stock_issuance_id
GROUP BY sir.id, sir.purpose, sir.request_status, sir.issuance_source, sir.created_at, sir.updated_at;
GO

PRINT '✅ Created View_Issuance_Status';
GO

-- =========================================
-- SUMMARY
-- =========================================

PRINT '';
PRINT '========================================';
PRINT '✅ ISSUANCE WORKFLOW PROCEDURES CREATED!';
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
