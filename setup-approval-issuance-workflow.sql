-- =============================================
-- APPROVAL TO ISSUANCE WORKFLOW
-- Complete flow: Approve → Assign → Deduct Inventory
-- =============================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '========================================';
PRINT '🚀 SETTING UP APPROVAL-TO-ISSUANCE WORKFLOW';
PRINT '========================================';
PRINT '';

-- =========================================
-- TABLE 1: STOCK ISSUANCE_TRANSACTIONS
-- Track all inventory movements
-- =========================================

PRINT '📋 CREATING stock_issuance_transactions TABLE...';
GO

IF OBJECT_ID('dbo.stock_issuance_transactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_issuance_transactions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Link to request and items
        stock_issuance_request_id UNIQUEIDENTIFIER NOT NULL,
        stock_issuance_item_id UNIQUEIDENTIFIER NULL,
        inventory_item_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Requester info
        requester_user_id NVARCHAR(450) NOT NULL,
        requester_name NVARCHAR(255),
        
        -- Transaction details
        transaction_type NVARCHAR(50) NOT NULL -- 'ISSUANCE', 'RETURN', 'TRANSFER', 'ADJUSTMENT'
            CHECK (transaction_type IN ('ISSUANCE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'ALLOCATION')),
        
        quantity INT NOT NULL,
        issued_quantity INT DEFAULT 0,
        returned_quantity INT DEFAULT 0,
        
        -- Status tracking
        transaction_status NVARCHAR(30) NOT NULL DEFAULT 'pending'
            CHECK (transaction_status IN ('pending', 'allocated', 'issued', 'partially_returned', 'fully_returned', 'cancelled')),
        
        -- Approver info
        approved_by_user_id NVARCHAR(450) NULL,
        approved_by_name NVARCHAR(255) NULL,
        approved_at DATETIME2 NULL,
        approval_comments NVARCHAR(MAX) NULL,
        
        -- Inventory deduction
        inventory_deducted BIT DEFAULT 0,
        deducted_at DATETIME2 NULL,
        deducted_by NVARCHAR(450) NULL,
        
        -- Item assignment
        assigned_to_user_id NVARCHAR(450) NULL,
        assigned_to_name NVARCHAR(255) NULL,
        assigned_at DATETIME2 NULL,
        
        -- Additional info
        notes NVARCHAR(MAX) NULL,
        
        -- Audit
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_sit_item_master FOREIGN KEY (inventory_item_id) REFERENCES dbo.item_masters(id),
        CONSTRAINT fk_sit_requester FOREIGN KEY (requester_user_id) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT fk_sit_approver FOREIGN KEY (approved_by_user_id) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT fk_sit_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES dbo.AspNetUsers(Id)
    );
    
    PRINT '   ✅ Created stock_issuance_transactions table';
    
    -- Create indexes
    CREATE INDEX idx_sit_request ON dbo.stock_issuance_transactions(stock_issuance_request_id);
    CREATE INDEX idx_sit_requester ON dbo.stock_issuance_transactions(requester_user_id);
    CREATE INDEX idx_sit_status ON dbo.stock_issuance_transactions(transaction_status);
    CREATE INDEX idx_sit_inventory ON dbo.stock_issuance_transactions(inventory_item_id);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  stock_issuance_transactions table already exists';
END
GO

-- =========================================
-- TABLE 2: STOCK_ALLOCATIONS
-- Track item allocations to requesters
-- =========================================

PRINT '';
PRINT '📋 CREATING stock_allocations TABLE...';
GO

IF OBJECT_ID('dbo.stock_allocations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stock_allocations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Link to transaction and inventory
        transaction_id UNIQUEIDENTIFIER NOT NULL,
        inventory_item_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Allocation details
        requester_user_id NVARCHAR(450) NOT NULL,
        requester_name NVARCHAR(255),
        allocated_quantity INT NOT NULL,
        
        -- Status
        allocation_status NVARCHAR(30) NOT NULL DEFAULT 'allocated'
            CHECK (allocation_status IN ('allocated', 'issued', 'returned', 'cancelled')),
        
        -- Issue tracking
        issued_at DATETIME2 NULL,
        issued_quantity INT DEFAULT 0,
        issued_by NVARCHAR(450) NULL,
        issue_notes NVARCHAR(MAX) NULL,
        
        -- Return tracking
        returned_at DATETIME2 NULL,
        returned_quantity INT DEFAULT 0,
        returned_by NVARCHAR(450) NULL,
        return_notes NVARCHAR(MAX) NULL,
        
        -- Serial numbers (for trackable items)
        serial_numbers NVARCHAR(MAX) NULL, -- JSON array of serial numbers if applicable
        
        -- Audit
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_sa_transaction FOREIGN KEY (transaction_id) REFERENCES dbo.stock_issuance_transactions(id),
        CONSTRAINT fk_sa_inventory FOREIGN KEY (inventory_item_id) REFERENCES dbo.item_masters(id),
        CONSTRAINT fk_sa_requester FOREIGN KEY (requester_user_id) REFERENCES dbo.AspNetUsers(Id)
    );
    
    PRINT '   ✅ Created stock_allocations table';
    
    -- Create indexes
    CREATE INDEX idx_sa_transaction ON dbo.stock_allocations(transaction_id);
    CREATE INDEX idx_sa_requester ON dbo.stock_allocations(requester_user_id);
    CREATE INDEX idx_sa_status ON dbo.stock_allocations(allocation_status);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  stock_allocations table already exists';
END
GO

-- =========================================
-- TABLE 3: INVENTORY_LOG
-- Immutable log of all inventory changes
-- =========================================

PRINT '';
PRINT '📋 CREATING inventory_log TABLE...';
GO

IF OBJECT_ID('dbo.inventory_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventory_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Item reference
        inventory_item_id UNIQUEIDENTIFIER NOT NULL,
        item_code NVARCHAR(100),
        item_name NVARCHAR(500),
        
        -- Transaction type
        log_type NVARCHAR(50) NOT NULL -- 'ISSUANCE', 'RETURN', 'ALLOCATION', 'DEDUCTION', 'ADJUSTMENT'
            CHECK (log_type IN ('ISSUANCE', 'RETURN', 'ALLOCATION', 'DEDUCTION', 'ADJUSTMENT', 'RESERVATION')),
        
        -- Quantity changes
        quantity_before INT,
        quantity_after INT,
        quantity_changed INT,
        
        -- User involved
        user_id NVARCHAR(450),
        user_name NVARCHAR(255),
        
        -- Reference info
        reference_type NVARCHAR(50), -- 'REQUEST', 'RETURN', 'ADJUSTMENT', 'ALLOCATION'
        reference_id UNIQUEIDENTIFIER,
        
        -- Description
        description NVARCHAR(MAX),
        
        -- Timestamp (immutable)
        logged_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_il_inventory FOREIGN KEY (inventory_item_id) REFERENCES dbo.item_masters(id)
    );
    
    PRINT '   ✅ Created inventory_log table';
    
    -- Create indexes
    CREATE INDEX idx_il_item ON dbo.inventory_log(inventory_item_id);
    CREATE INDEX idx_il_type ON dbo.inventory_log(log_type);
    CREATE INDEX idx_il_date ON dbo.inventory_log(logged_at);
    PRINT '   ✅ Created indexes';
END
ELSE
BEGIN
    PRINT '   ⚠️  inventory_log table already exists';
END
GO

-- =========================================
-- STORED PROCEDURE: APPROVE_AND_ALLOCATE
-- =========================================

PRINT '';
PRINT '📋 CREATING sp_ApproveAndAllocateItems PROCEDURE...';
GO

IF OBJECT_ID('dbo.sp_ApproveAndAllocateItems', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ApproveAndAllocateItems;
GO

CREATE PROCEDURE dbo.sp_ApproveAndAllocateItems
    @RequestId UNIQUEIDENTIFIER,
    @ApproverId NVARCHAR(450),
    @ApproverName NVARCHAR(255),
    @ApprovalComments NVARCHAR(MAX),
    @ItemAllocations NVARCHAR(MAX) -- JSON array of allocations
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TransactionId UNIQUEIDENTIFIER;
    DECLARE @RequesterId NVARCHAR(450);
    DECLARE @RequesterName NVARCHAR(255);
    DECLARE @InventoryItemId UNIQUEIDENTIFIER;
    DECLARE @AllocatedQuantity INT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        PRINT '🔄 Starting approval and allocation process...';
        
        -- Get request details
        SELECT @RequesterId = requester_user_id, @RequesterName = ISNULL(requester_name, '')
        FROM stock_issuance_requests
        WHERE id = @RequestId;
        
        IF @RequesterId IS NULL
        BEGIN
            THROW 50001, 'Request not found', 1;
        END
        
        -- Create main transaction record
        SET @TransactionId = NEWID();
        
        INSERT INTO stock_issuance_transactions (
            id, stock_issuance_request_id, requester_user_id, requester_name,
            transaction_type, quantity, transaction_status,
            approved_by_user_id, approved_by_name, approved_at, approval_comments,
            created_at, updated_at
        ) VALUES (
            @TransactionId, @RequestId, @RequesterId, @RequesterName,
            'ALLOCATION', 0, 'allocated',
            @ApproverId, @ApproverName, GETDATE(), @ApprovalComments,
            GETDATE(), GETDATE()
        );
        
        PRINT CONCAT('✅ Created transaction: ', @TransactionId);
        
        -- Update request status to APPROVED
        UPDATE stock_issuance_requests
        SET request_status = 'Approved',
            approved_at = GETDATE(),
            approved_by = @ApproverName,
            review_comments = @ApprovalComments,
            updated_at = GETDATE()
        WHERE id = @RequestId;
        
        PRINT '✅ Updated request status to Approved';
        
        COMMIT TRANSACTION;
        
        -- Return success
        SELECT 1 as success, @TransactionId as transaction_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        PRINT CONCAT('❌ Error: ', ERROR_MESSAGE());
        THROW;
    END CATCH
END
GO

PRINT '   ✅ Created sp_ApproveAndAllocateItems procedure';
PRINT '';

-- =========================================
-- STORED PROCEDURE: DEDUCT_FROM_INVENTORY
-- =========================================

PRINT '📋 CREATING sp_DeductFromInventory PROCEDURE...';
GO

IF OBJECT_ID('dbo.sp_DeductFromInventory', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_DeductFromInventory;
GO

CREATE PROCEDURE dbo.sp_DeductFromInventory
    @TransactionId UNIQUEIDENTIFIER,
    @InventoryItemId UNIQUEIDENTIFIER,
    @QuantityToDeduct INT,
    @DeductedBy NVARCHAR(450),
    @DeductedByName NVARCHAR(255),
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentQuantity INT;
    DECLARE @NewQuantity INT;
    DECLARE @ItemCode NVARCHAR(100);
    DECLARE @ItemName NVARCHAR(500);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        PRINT CONCAT('🔄 Deducting ', @QuantityToDeduct, ' units from inventory...');
        
        -- Lock and get current inventory
        SELECT @CurrentQuantity = quantity, 
               @ItemCode = item_code,
               @ItemName = nomenclature
        FROM item_masters WITH (UPDLOCK)
        WHERE id = @InventoryItemId;
        
        IF @CurrentQuantity IS NULL
        BEGIN
            THROW 50002, 'Inventory item not found', 1;
        END
        
        -- Check if enough quantity available
        IF @CurrentQuantity < @QuantityToDeduct
        BEGIN
            THROW 50003, CONCAT('Insufficient inventory. Available: ', @CurrentQuantity, ', Requested: ', @QuantityToDeduct), 1;
        END
        
        -- Calculate new quantity
        SET @NewQuantity = @CurrentQuantity - @QuantityToDeduct;
        
        -- Deduct from inventory
        UPDATE item_masters
        SET quantity = @NewQuantity,
            updated_at = GETDATE()
        WHERE id = @InventoryItemId;
        
        PRINT CONCAT('✅ Deducted ', @QuantityToDeduct, ' units. New quantity: ', @NewQuantity);
        
        -- Update transaction as deducted
        UPDATE stock_issuance_transactions
        SET inventory_deducted = 1,
            deducted_at = GETDATE(),
            deducted_by = @DeductedBy,
            transaction_status = 'issued',
            issued_quantity = @QuantityToDeduct,
            updated_at = GETDATE()
        WHERE id = @TransactionId;
        
        -- Log the deduction
        INSERT INTO inventory_log (
            inventory_item_id, item_code, item_name,
            log_type, quantity_before, quantity_after, quantity_changed,
            user_id, user_name, reference_type, reference_id,
            description, logged_at
        ) VALUES (
            @InventoryItemId, @ItemCode, @ItemName,
            'DEDUCTION', @CurrentQuantity, @NewQuantity, -@QuantityToDeduct,
            @DeductedBy, @DeductedByName, 'REQUEST', @TransactionId,
            @Notes, GETDATE()
        );
        
        PRINT '✅ Logged inventory deduction';
        
        COMMIT TRANSACTION;
        
        SELECT 1 as success, @NewQuantity as new_quantity;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        PRINT CONCAT('❌ Error deducting inventory: ', ERROR_MESSAGE());
        THROW;
    END CATCH
END
GO

PRINT '   ✅ Created sp_DeductFromInventory procedure';
PRINT '';

-- =========================================
-- STORED PROCEDURE: ASSIGN_TO_REQUESTER
-- =========================================

PRINT '📋 CREATING sp_AssignToRequester PROCEDURE...';
GO

IF OBJECT_ID('dbo.sp_AssignToRequester', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_AssignToRequester;
GO

CREATE PROCEDURE dbo.sp_AssignToRequester
    @TransactionId UNIQUEIDENTIFIER,
    @RequesterId NVARCHAR(450),
    @RequesterName NVARCHAR(255),
    @AllocatedQuantity INT,
    @AssignedBy NVARCHAR(450),
    @AssignedByName NVARCHAR(255) = NULL,
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @InventoryItemId UNIQUEIDENTIFIER;
    DECLARE @AllocationId UNIQUEIDENTIFIER;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        PRINT CONCAT('🔄 Assigning ', @AllocatedQuantity, ' units to requester...');
        
        -- Get inventory item from transaction
        SELECT @InventoryItemId = inventory_item_id
        FROM stock_issuance_transactions
        WHERE id = @TransactionId;
        
        IF @InventoryItemId IS NULL
        BEGIN
            THROW 50004, 'Transaction not found', 1;
        END
        
        -- Create allocation record
        SET @AllocationId = NEWID();
        
        INSERT INTO stock_allocations (
            id, transaction_id, inventory_item_id,
            requester_user_id, requester_name, allocated_quantity,
            allocation_status, created_at, updated_at
        ) VALUES (
            @AllocationId, @TransactionId, @InventoryItemId,
            @RequesterId, @RequesterName, @AllocatedQuantity,
            'allocated', GETDATE(), GETDATE()
        );
        
        PRINT CONCAT('✅ Created allocation: ', @AllocationId);
        
        -- Update transaction with assignment
        UPDATE stock_issuance_transactions
        SET assigned_to_user_id = @RequesterId,
            assigned_to_name = @RequesterName,
            assigned_at = GETDATE(),
            notes = @Notes,
            updated_at = GETDATE()
        WHERE id = @TransactionId;
        
        -- Log the assignment
        INSERT INTO inventory_log (
            inventory_item_id, log_type,
            user_id, user_name, reference_type, reference_id,
            description, logged_at
        ) SELECT
            @InventoryItemId, 'ALLOCATION',
            @AssignedBy, ISNULL(@AssignedByName, ''), 'ALLOCATION', @AllocationId,
            CONCAT('Assigned ', @AllocatedQuantity, ' units to ', @RequesterName), GETDATE();
        
        PRINT '✅ Logged allocation';
        
        COMMIT TRANSACTION;
        
        SELECT 1 as success, @AllocationId as allocation_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        PRINT CONCAT('❌ Error assigning to requester: ', ERROR_MESSAGE());
        THROW;
    END CATCH
END
GO

PRINT '   ✅ Created sp_AssignToRequester procedure';
PRINT '';

-- =========================================
-- SUMMARY
-- =========================================

PRINT '';
PRINT '========================================';
PRINT '✅ APPROVAL-TO-ISSUANCE WORKFLOW READY!';
PRINT '========================================';
PRINT '';
PRINT 'Tables created:';
PRINT '   1. stock_issuance_transactions - Main transaction tracking';
PRINT '   2. stock_allocations - Item allocation to requesters';
PRINT '   3. inventory_log - Immutable audit log';
PRINT '';
PRINT 'Procedures created:';
PRINT '   1. sp_ApproveAndAllocateItems - Approve request and create allocation';
PRINT '   2. sp_DeductFromInventory - Deduct approved quantity from inventory';
PRINT '   3. sp_AssignToRequester - Assign allocated items to requester';
PRINT '';
PRINT 'Complete workflow:';
PRINT '   1. Supervisor approves request → sp_ApproveAndAllocateItems';
PRINT '   2. Admin assigns items → sp_AssignToRequester';
PRINT '   3. Admin deducts from inventory → sp_DeductFromInventory';
PRINT '';
