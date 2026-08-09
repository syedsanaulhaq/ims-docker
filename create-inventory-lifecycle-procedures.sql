-- ====================================================================
-- 📦 COMPLETE INVENTORY LIFECYCLE - STORED PROCEDURES
-- ====================================================================
-- These procedures manage the complete inventory lifecycle from initial
-- setup through procurement, delivery, and stock acquisition.
-- ====================================================================

USE InventoryManagementDB;
GO

-- ====================================================================
-- 🏭 1. INITIAL STOCK SETUP PROCEDURES
-- ====================================================================

-- Set up initial inventory for items (e.g., Item1 has 20 pieces from start)
CREATE OR ALTER PROCEDURE sp_SetupInitialStock
    @ItemID UNIQUEIDENTIFIER,
    @InitialQuantity INT,
    @UnitCost DECIMAL(15,2) = NULL,
    @SupplierID UNIQUEIDENTIFIER = NULL,
    @SetupReason NVARCHAR(500) = 'Initial inventory setup',
    @ReferenceDocument NVARCHAR(200) = NULL,
    @LocationID UNIQUEIDENTIFIER = NULL,
    @SetupBy UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @SetupID UNIQUEIDENTIFIER = NEWID();
    DECLARE @TotalCost DECIMAL(15,2);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Calculate total cost
        SET @TotalCost = ISNULL(@UnitCost, 0) * @InitialQuantity;
        
        -- 1. Create initial setup record
        INSERT INTO initial_stock_setup (
            id, item_id, initial_quantity, unit_cost, total_cost,
            supplier_id, setup_date, setup_reason, location_id,
            reference_document, setup_by
        ) VALUES (
            @SetupID, @ItemID, @InitialQuantity, @UnitCost, @TotalCost,
            @SupplierID, CAST(GETDATE() AS DATE), @SetupReason, @LocationID,
            @ReferenceDocument, @SetupBy
        );
        
        -- 2. Initialize current inventory record
        INSERT INTO current_inventory (
            item_id, total_quantity, available_quantity, 
            average_unit_cost, total_value,
            last_transaction_date, last_transaction_type, last_updated_by
        ) VALUES (
            @ItemID, @InitialQuantity, @InitialQuantity,
            ISNULL(@UnitCost, 0), @TotalCost,
            GETDATE(), 'INITIAL_SETUP', @SetupBy
        );
        
        -- 3. Create stock transaction record
        INSERT INTO stock_transactions (
            item_id, transaction_type, quantity, unit_cost, total_cost,
            reference_type, reference_id, transaction_date, created_by, notes
        ) VALUES (
            @ItemID, 'INITIAL_SETUP', @InitialQuantity, ISNULL(@UnitCost, 0), @TotalCost,
            'INITIAL_SETUP', @SetupID, GETDATE(), @SetupBy, @SetupReason
        );
        
        COMMIT TRANSACTION;
        
        SELECT 
            @SetupID as SetupID,
            @InitialQuantity as InitialQuantity,
            'SUCCESS' as Status,
            'Initial stock setup completed successfully' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ====================================================================
-- 📊 2. REAL-TIME INVENTORY MONITORING PROCEDURES
-- ====================================================================

-- Get current inventory status with alerts
CREATE OR ALTER PROCEDURE sp_GetInventoryStatus
    @ItemID UNIQUEIDENTIFIER = NULL, -- If NULL, returns all items
    @ShowAlertsOnly BIT = 0 -- If 1, only show items needing attention
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ci.item_id,
        im.item_code,
        im.item_name,
        im.category_name,
        
        -- Current Stock Levels
        ci.total_quantity,
        ci.available_quantity,
        ci.reserved_quantity,
        ci.issued_quantity,
        
        -- Stock Management Levels
        ci.minimum_level,
        ci.maximum_level,
        ci.reorder_quantity,
        
        -- Stock Status Analysis
        ci.stock_status,
        ci.needs_procurement,
        
        -- Shortage Analysis
        CASE 
            WHEN ci.available_quantity <= 0 THEN ci.minimum_level
            WHEN ci.available_quantity < ci.minimum_level THEN ci.minimum_level - ci.available_quantity
            ELSE 0
        END as shortage_quantity,
        
        -- Financial Information
        ci.average_unit_cost,
        ci.total_value,
        
        -- Last Activity
        ci.last_transaction_date,
        ci.last_transaction_type,
        
        -- Alert Indicators
        CASE ci.stock_status
            WHEN 'OUT_OF_STOCK' THEN '🔴'
            WHEN 'LOW_STOCK' THEN '🟡'
            WHEN 'ADEQUATE' THEN '🟢'
            WHEN 'OVERSTOCK' THEN '🔵'
        END as status_icon,
        
        CASE ci.stock_status
            WHEN 'OUT_OF_STOCK' THEN 'CRITICAL - Immediate procurement needed'
            WHEN 'LOW_STOCK' THEN 'WARNING - Stock below minimum level'
            WHEN 'ADEQUATE' THEN 'GOOD - Stock level adequate'
            WHEN 'OVERSTOCK' THEN 'INFO - Stock above maximum level'
        END as status_description
        
    FROM current_inventory ci
    INNER JOIN item_masters im ON ci.item_id = im.id
    WHERE (@ItemID IS NULL OR ci.item_id = @ItemID)
      AND (@ShowAlertsOnly = 0 OR ci.needs_procurement = 1)
    ORDER BY 
        ci.needs_procurement DESC, -- Critical items first
        ci.available_quantity ASC, -- Lowest stock first
        im.item_name;
END
GO

-- ====================================================================
-- 📝 3. SMART REQUEST CREATION WITH STOCK CONTEXT
-- ====================================================================

-- Create procurement request with current stock context
CREATE OR ALTER PROCEDURE sp_CreateStockProcurementRequest
    @DecID UNIQUEIDENTIFIER,
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000) = NULL,
    @Priority NVARCHAR(20) = 'NORMAL',
    @RequiredDate DATE = NULL,
    @CreatedBy UNIQUEIDENTIFIER,
    @WorkflowTemplateCode NVARCHAR(50) = 'STANDARD_FLOW',
    @RequestID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @WorkflowInstanceID UNIQUEIDENTIFIER;
    DECLARE @IsStockCritical BIT = 0;
    DECLARE @StockCriticality NVARCHAR(20) = 'NORMAL';
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Determine if this is triggered by low stock
        DECLARE @LowStockCount INT;
        SELECT @LowStockCount = COUNT(*) 
        FROM current_inventory 
        WHERE needs_procurement = 1;
        
        IF @LowStockCount > 0
        BEGIN
            SET @IsStockCritical = 1;
            SET @StockCriticality = CASE 
                WHEN @LowStockCount >= 5 THEN 'CRITICAL'
                WHEN @LowStockCount >= 2 THEN 'HIGH'
                ELSE 'NORMAL'
            END;
        END
        
        -- Create request with stock context
        SET @RequestID = NEWID();
        
        INSERT INTO approval_requests (
            id, dec_id, title, description, request_type, priority,
            required_date, status, is_stock_request, triggered_by_low_stock,
            stock_criticality, created_by, created_at
        ) VALUES (
            @RequestID, @DecID, @Title, @Description, 'PROCUREMENT', @Priority,
            @RequiredDate, 'WORKFLOW_INITIATED', 1, @IsStockCritical,
            @StockCriticality, @CreatedBy, GETDATE()
        );
        
        -- Create workflow instance
        EXEC sp_CreateRequestWithWorkflow
            @DecID = @DecID,
            @WorkflowTemplateCode = @WorkflowTemplateCode,
            @Title = @Title,
            @Description = @Description,
            @RequestType = 'PROCUREMENT',
            @Priority = @Priority,
            @RequiredDate = @RequiredDate,
            @CreatedBy = @CreatedBy,
            @RequestID = @RequestID,
            @WorkflowInstanceID = @WorkflowInstanceID OUTPUT;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @RequestID as RequestID,
            @WorkflowInstanceID as WorkflowInstanceID,
            @StockCriticality as StockCriticality,
            'SUCCESS' as Status;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- Add items to procurement request with stock context
CREATE OR ALTER PROCEDURE sp_AddItemsToRequest
    @RequestID UNIQUEIDENTIFIER,
    @ItemID UNIQUEIDENTIFIER,
    @RequestedQuantity INT,
    @UnitCostEstimate DECIMAL(15,2) = NULL,
    @Justification NVARCHAR(1000) = NULL,
    @DetailedSpecs NVARCHAR(2000) = NULL,
    @PreferredBrand NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentStock INT;
    DECLARE @MinimumLevel INT;
    DECLARE @TotalCostEstimate DECIMAL(15,2);
    
    -- Get current stock information
    SELECT 
        @CurrentStock = available_quantity,
        @MinimumLevel = minimum_level
    FROM current_inventory 
    WHERE item_id = @ItemID;
    
    SET @CurrentStock = ISNULL(@CurrentStock, 0);
    SET @MinimumLevel = ISNULL(@MinimumLevel, 0);
    SET @TotalCostEstimate = ISNULL(@UnitCostEstimate, 0) * @RequestedQuantity;
    
    -- Add item to request with stock context
    INSERT INTO request_items_with_stock (
        request_id, item_id, requested_quantity, unit_cost_estimate, total_cost_estimate,
        current_stock_level, minimum_stock_level, stock_justification,
        detailed_specifications, preferred_brand
    ) VALUES (
        @RequestID, @ItemID, @RequestedQuantity, @UnitCostEstimate, @TotalCostEstimate,
        @CurrentStock, @MinimumLevel, @Justification,
        @DetailedSpecs, @PreferredBrand
    );
    
    -- Update request total estimate
    UPDATE approval_requests 
    SET estimated_amount = (
        SELECT SUM(ISNULL(total_cost_estimate, 0))
        FROM request_items_with_stock 
        WHERE request_id = @RequestID
    )
    WHERE id = @RequestID;
    
    SELECT 'SUCCESS' as Status, 'Item added to request successfully' as Message;
END
GO

-- ====================================================================
-- 🏪 4. TENDER CREATION FROM APPROVED REQUESTS
-- ====================================================================

-- Create tender from approved procurement request
CREATE OR ALTER PROCEDURE sp_CreateTenderFromRequest
    @RequestID UNIQUEIDENTIFIER,
    @WorkflowInstanceID UNIQUEIDENTIFIER,
    @TenderTitle NVARCHAR(200),
    @TenderDescription NVARCHAR(2000) = NULL,
    @TenderType NVARCHAR(50) = 'OPEN_TENDER',
    @SubmissionDeadlineDays INT = 15,
    @EvaluationDays INT = 5,
    @CreatedBy UNIQUEIDENTIFIER,
    @TenderID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TenderCode NVARCHAR(50);
    DECLARE @EstimatedAmount DECIMAL(15,2);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Generate tender code
        DECLARE @TenderSequence INT;
        SELECT @TenderSequence = ISNULL(MAX(CAST(SUBSTRING(tender_code, 6, 4) AS INT)), 0) + 1
        FROM procurement_tenders 
        WHERE tender_code LIKE 'TEND-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '%';
        
        SET @TenderCode = 'TEND-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '-' + 
                         RIGHT('000' + CAST(@TenderSequence AS NVARCHAR(3)), 3);
        
        -- Get estimated amount from request
        SELECT @EstimatedAmount = ISNULL(estimated_amount, 0)
        FROM approval_requests 
        WHERE id = @RequestID;
        
        -- Create tender
        SET @TenderID = NEWID();
        
        INSERT INTO procurement_tenders (
            id, tender_code, source_request_id, source_workflow_id,
            tender_title, tender_description, tender_type,
            published_date, submission_deadline, opening_date,
            evaluation_completion_target, estimated_amount,
            created_by
        ) VALUES (
            @TenderID, @TenderCode, @RequestID, @WorkflowInstanceID,
            @TenderTitle, @TenderDescription, @TenderType,
            CAST(GETDATE() AS DATE),
            DATEADD(DAY, @SubmissionDeadlineDays, GETDATE()),
            DATEADD(DAY, @SubmissionDeadlineDays + 1, GETDATE()),
            DATEADD(DAY, @SubmissionDeadlineDays + 1 + @EvaluationDays, GETDATE()),
            @EstimatedAmount, @CreatedBy
        );
        
        -- Add tender items from request items
        INSERT INTO tender_items (
            tender_id, item_id, item_sequence, quantity_required,
            detailed_specifications, estimated_unit_price
        )
        SELECT 
            @TenderID, riws.item_id, ROW_NUMBER() OVER (ORDER BY riws.id),
            riws.approved_quantity,
            riws.detailed_specifications, riws.unit_cost_estimate
        FROM request_items_with_stock riws
        WHERE riws.request_id = @RequestID 
          AND riws.item_status = 'APPROVED';
        
        -- Update request to indicate tender created
        UPDATE approval_requests 
        SET tender_created = 1, tender_id = @TenderID
        WHERE id = @RequestID;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @TenderID as TenderID,
            @TenderCode as TenderCode,
            'SUCCESS' as Status,
            'Tender created successfully from approved request' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ====================================================================
-- 💰 5. BID MANAGEMENT PROCEDURES
-- ====================================================================

-- Submit vendor bid for tender
CREATE OR ALTER PROCEDURE sp_SubmitVendorBid
    @TenderID UNIQUEIDENTIFIER,
    @VendorID UNIQUEIDENTIFIER,
    @BidReference NVARCHAR(100),
    @BidValidityDays INT = 90,
    @SubmittedBy NVARCHAR(200),
    @BidID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Check if tender is still open for bidding
        IF NOT EXISTS (SELECT 1 FROM procurement_tenders 
                      WHERE id = @TenderID 
                        AND tender_status IN ('PUBLISHED', 'BIDDING_OPEN')
                        AND submission_deadline > GETDATE())
        BEGIN
            THROW 50001, 'Tender is not open for bidding or submission deadline has passed', 1;
        END
        
        -- Check if vendor has already submitted a bid
        IF EXISTS (SELECT 1 FROM tender_bids WHERE tender_id = @TenderID AND vendor_id = @VendorID)
        BEGIN
            THROW 50002, 'Vendor has already submitted a bid for this tender', 1;
        END
        
        -- Create bid
        SET @BidID = NEWID();
        
        INSERT INTO tender_bids (
            id, tender_id, vendor_id, bid_reference,
            bid_validity_days, submitted_by, bid_amount
        ) VALUES (
            @BidID, @TenderID, @VendorID, @BidReference,
            @BidValidityDays, @SubmittedBy, 0 -- Will be calculated when items are added
        );
        
        SELECT 
            @BidID as BidID,
            'SUCCESS' as Status,
            'Bid submitted successfully. Please add bid items.' as Message;
            
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- Add items to vendor bid
CREATE OR ALTER PROCEDURE sp_AddItemToBid
    @BidID UNIQUEIDENTIFIER,
    @TenderItemID UNIQUEIDENTIFIER,
    @QuotedQuantity INT,
    @UnitPrice DECIMAL(15,2),
    @OfferedBrand NVARCHAR(200) = NULL,
    @OfferedModel NVARCHAR(200) = NULL,
    @DeliveryTimeDays INT,
    @WarrantyMonths INT = 12
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO tender_bid_items (
        bid_id, tender_item_id, quoted_quantity, unit_price,
        offered_brand, offered_model, delivery_time_days, warranty_period_months
    ) VALUES (
        @BidID, @TenderItemID, @QuotedQuantity, @UnitPrice,
        @OfferedBrand, @OfferedModel, @DeliveryTimeDays, @WarrantyMonths
    );
    
    -- Update total bid amount
    UPDATE tender_bids 
    SET bid_amount = (
        SELECT SUM(total_price)
        FROM tender_bid_items 
        WHERE bid_id = @BidID
    )
    WHERE id = @BidID;
    
    SELECT 'SUCCESS' as Status, 'Bid item added successfully' as Message;
END
GO

-- Evaluate and award tender
CREATE OR ALTER PROCEDURE sp_AwardTender
    @TenderID UNIQUEIDENTIFIER,
    @WinningBidID UNIQUEIDENTIFIER,
    @AwardReason NVARCHAR(1000),
    @AwardedBy UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AwardedAmount DECIMAL(15,2);
    DECLARE @VendorID UNIQUEIDENTIFIER;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Get winning bid information
        SELECT @AwardedAmount = bid_amount, @VendorID = vendor_id
        FROM tender_bids 
        WHERE id = @WinningBidID;
        
        -- Update tender with award information
        UPDATE procurement_tenders SET
            tender_status = 'AWARDED',
            awarded_vendor_id = @VendorID,
            awarded_amount = @AwardedAmount,
            award_date = CAST(GETDATE() AS DATE),
            award_reason = @AwardReason
        WHERE id = @TenderID;
        
        -- Update winning bid
        UPDATE tender_bids SET
            is_awarded = 1,
            bid_status = 'AWARDED'
        WHERE id = @WinningBidID;
        
        -- Update other bids as not awarded
        UPDATE tender_bids SET
            bid_status = 'NOT_AWARDED'
        WHERE tender_id = @TenderID AND id != @WinningBidID;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @VendorID as AwardedVendorID,
            @AwardedAmount as AwardedAmount,
            'SUCCESS' as Status,
            'Tender awarded successfully' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ====================================================================
-- 📋 6. PURCHASE ORDER PROCEDURES
-- ====================================================================

-- Create purchase order from awarded tender
CREATE OR ALTER PROCEDURE sp_CreatePurchaseOrder
    @TenderID UNIQUEIDENTIFIER,
    @WinningBidID UNIQUEIDENTIFIER,
    @DeliveryAddress NVARCHAR(1000),
    @DeliveryContactPerson NVARCHAR(200),
    @DeliveryPhone NVARCHAR(50),
    @PaymentTerms NVARCHAR(500),
    @DeliveryTerms NVARCHAR(500),
    @CreatedBy UNIQUEIDENTIFIER,
    @PurchaseOrderID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @PONumber NVARCHAR(50);
    DECLARE @POAmount DECIMAL(15,2);
    DECLARE @VendorID UNIQUEIDENTIFIER;
    DECLARE @TotalItems INT;
    DECLARE @DeliveryDays INT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Generate PO number
        DECLARE @POSequence INT;
        SELECT @POSequence = ISNULL(MAX(CAST(SUBSTRING(po_number, 4, 4) AS INT)), 0) + 1
        FROM purchase_orders 
        WHERE po_number LIKE 'PO-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '%';
        
        SET @PONumber = 'PO-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '-' + 
                       RIGHT('000' + CAST(@POSequence AS NVARCHAR(3)), 3);
        
        -- Get bid information
        SELECT 
            @POAmount = bid_amount, 
            @VendorID = vendor_id,
            @DeliveryDays = MAX(tbi.delivery_time_days)
        FROM tender_bids tb
        INNER JOIN tender_bid_items tbi ON tb.id = tbi.bid_id
        WHERE tb.id = @WinningBidID
        GROUP BY bid_amount, vendor_id;
        
        -- Count total items
        SELECT @TotalItems = SUM(quoted_quantity)
        FROM tender_bid_items
        WHERE bid_id = @WinningBidID;
        
        -- Create purchase order
        SET @PurchaseOrderID = NEWID();
        
        INSERT INTO purchase_orders (
            id, po_number, tender_id, winning_bid_id, vendor_id,
            po_amount, delivery_address, delivery_contact_person, delivery_phone,
            expected_delivery_date, latest_delivery_date,
            payment_terms, delivery_terms, total_items_ordered, created_by
        ) VALUES (
            @PurchaseOrderID, @PONumber, @TenderID, @WinningBidID, @VendorID,
            @POAmount, @DeliveryAddress, @DeliveryContactPerson, @DeliveryPhone,
            DATEADD(DAY, @DeliveryDays, GETDATE()),
            DATEADD(DAY, @DeliveryDays + 7, GETDATE()),
            @PaymentTerms, @DeliveryTerms, @TotalItems, @CreatedBy
        );
        
        COMMIT TRANSACTION;
        
        SELECT 
            @PurchaseOrderID as PurchaseOrderID,
            @PONumber as PONumber,
            @POAmount as POAmount,
            'SUCCESS' as Status,
            'Purchase order created successfully' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ====================================================================
-- 📦 7. DELIVERY PROCESSING PROCEDURES
-- ====================================================================

-- Record delivery receipt
CREATE OR ALTER PROCEDURE sp_RecordDelivery
    @PurchaseOrderID UNIQUEIDENTIFIER,
    @VendorDeliveryNote NVARCHAR(100),
    @DeliveredBy NVARCHAR(200),
    @ReceivedBy UNIQUEIDENTIFIER,
    @ReceivingLocation NVARCHAR(500),
    @DeliveryID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @DeliveryNumber NVARCHAR(50);
    
    BEGIN TRY
        -- Generate delivery number
        DECLARE @DeliverySequence INT;
        SELECT @DeliverySequence = ISNULL(MAX(CAST(SUBSTRING(delivery_number, 5, 4) AS INT)), 0) + 1
        FROM deliveries 
        WHERE delivery_number LIKE 'DEL-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '%';
        
        SET @DeliveryNumber = 'DEL-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '-' + 
                            RIGHT('000' + CAST(@DeliverySequence AS NVARCHAR(3)), 3);
        
        -- Create delivery record
        SET @DeliveryID = NEWID();
        
        INSERT INTO deliveries (
            id, delivery_number, purchase_order_id, vendor_delivery_note,
            delivery_date, delivered_by, received_by, receiving_location
        ) VALUES (
            @DeliveryID, @DeliveryNumber, @PurchaseOrderID, @VendorDeliveryNote,
            CAST(GETDATE() AS DATE), @DeliveredBy, @ReceivedBy, @ReceivingLocation
        );
        
        SELECT 
            @DeliveryID as DeliveryID,
            @DeliveryNumber as DeliveryNumber,
            'SUCCESS' as Status,
            'Delivery recorded successfully. Please add delivery items.' as Message;
            
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- Add items to delivery
CREATE OR ALTER PROCEDURE sp_AddDeliveryItem
    @DeliveryID UNIQUEIDENTIFIER,
    @ItemID UNIQUEIDENTIFIER,
    @OrderedQuantity INT,
    @DeliveredQuantity INT,
    @AcceptedQuantity INT,
    @UnitCost DECIMAL(15,2),
    @QualityStatus NVARCHAR(30) = 'PASSED',
    @StorageLocation NVARCHAR(200) = NULL,
    @RejectionReason NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO delivery_items (
        delivery_id, item_id, ordered_quantity, delivered_quantity, 
        accepted_quantity, unit_cost, quality_status, 
        storage_location, rejection_reason
    ) VALUES (
        @DeliveryID, @ItemID, @OrderedQuantity, @DeliveredQuantity,
        @AcceptedQuantity, @UnitCost, @QualityStatus,
        @StorageLocation, @RejectionReason
    );
    
    SELECT 'SUCCESS' as Status, 'Delivery item added successfully' as Message;
END
GO

-- ====================================================================
-- 📊 8. STOCK ACQUISITION PROCEDURES
-- ====================================================================

-- Process stock acquisition from delivery
CREATE OR ALTER PROCEDURE sp_ProcessStockAcquisition
    @DeliveryID UNIQUEIDENTIFIER,
    @AuthorizedBy UNIQUEIDENTIFIER,
    @ProcessedBy UNIQUEIDENTIFIER,
    @AcquisitionID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AcquisitionNumber NVARCHAR(50);
    DECLARE @PurchaseOrderID UNIQUEIDENTIFIER;
    DECLARE @TotalCost DECIMAL(15,2);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Get purchase order ID and calculate total cost
        SELECT 
            @PurchaseOrderID = purchase_order_id,
            @TotalCost = SUM(total_cost)
        FROM deliveries d
        INNER JOIN delivery_items di ON d.id = di.delivery_id
        WHERE d.id = @DeliveryID
        GROUP BY purchase_order_id;
        
        -- Generate acquisition number
        DECLARE @AcqSequence INT;
        SELECT @AcqSequence = ISNULL(MAX(CAST(SUBSTRING(acquisition_number, 5, 4) AS INT)), 0) + 1
        FROM stock_acquisitions 
        WHERE acquisition_number LIKE 'ACQ-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '%';
        
        SET @AcquisitionNumber = 'ACQ-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + '-' + 
                               RIGHT('000' + CAST(@AcqSequence AS NVARCHAR(3)), 3);
        
        -- Create stock acquisition
        SET @AcquisitionID = NEWID();
        
        INSERT INTO stock_acquisitions (
            id, acquisition_number, delivery_id, purchase_order_id,
            total_acquisition_cost, authorized_by, processed_by
        ) VALUES (
            @AcquisitionID, @AcquisitionNumber, @DeliveryID, @PurchaseOrderID,
            @TotalCost, @AuthorizedBy, @ProcessedBy
        );
        
        -- Create acquisition items
        INSERT INTO stock_acquisition_items (acquisition_id, item_id, quantity_acquired, unit_cost)
        SELECT @AcquisitionID, item_id, accepted_quantity, unit_cost
        FROM delivery_items
        WHERE delivery_id = @DeliveryID AND accepted_quantity > 0;
        
        -- Update current inventory
        DECLARE @ItemID UNIQUEIDENTIFIER, @Quantity INT, @UnitCost DECIMAL(15,2);
        
        DECLARE item_cursor CURSOR FOR
        SELECT item_id, accepted_quantity, unit_cost
        FROM delivery_items
        WHERE delivery_id = @DeliveryID AND accepted_quantity > 0;
        
        OPEN item_cursor;
        FETCH NEXT FROM item_cursor INTO @ItemID, @Quantity, @UnitCost;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Update inventory quantities and average cost
            UPDATE current_inventory 
            SET 
                total_quantity = total_quantity + @Quantity,
                available_quantity = available_quantity + @Quantity,
                average_unit_cost = (
                    (average_unit_cost * total_quantity + @UnitCost * @Quantity) / 
                    (total_quantity + @Quantity)
                ),
                total_value = (
                    (average_unit_cost * total_quantity + @UnitCost * @Quantity)
                ),
                last_transaction_date = GETDATE(),
                last_transaction_type = 'ACQUISITION',
                last_updated = GETDATE(),
                last_updated_by = @ProcessedBy
            WHERE item_id = @ItemID;
            
            -- Create stock transaction
            INSERT INTO stock_transactions (
                item_id, transaction_type, quantity, unit_cost, total_cost,
                reference_type, reference_id, transaction_date, created_by,
                notes
            ) VALUES (
                @ItemID, 'ACQUISITION', @Quantity, @UnitCost, (@UnitCost * @Quantity),
                'STOCK_ACQUISITION', @AcquisitionID, GETDATE(), @ProcessedBy,
                'Stock acquired from delivery ' + (SELECT delivery_number FROM deliveries WHERE id = @DeliveryID)
            );
            
            FETCH NEXT FROM item_cursor INTO @ItemID, @Quantity, @UnitCost;
        END
        
        CLOSE item_cursor;
        DEALLOCATE item_cursor;
        
        -- Update acquisition status
        UPDATE stock_acquisitions 
        SET inventory_updated = 1, inventory_update_date = GETDATE()
        WHERE id = @AcquisitionID;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @AcquisitionID as AcquisitionID,
            @AcquisitionNumber as AcquisitionNumber,
            'SUCCESS' as Status,
            'Stock acquisition processed and inventory updated successfully' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        CLOSE item_cursor;
        DEALLOCATE item_cursor;
        THROW;
    END CATCH
END
GO

-- ====================================================================
-- 📊 9. COMPLETE LIFECYCLE REPORTING
-- ====================================================================

-- Get complete lifecycle trace for an item
CREATE OR ALTER PROCEDURE sp_GetItemLifecycleTrace
    @ItemID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Item basic information
    SELECT 
        im.item_code,
        im.item_name,
        im.category_name,
        ci.total_quantity as current_total_quantity,
        ci.available_quantity as current_available_quantity,
        ci.stock_status as current_status
    FROM item_masters im
    LEFT JOIN current_inventory ci ON im.id = ci.item_id
    WHERE im.id = @ItemID;
    
    -- Complete transaction history
    SELECT 
        st.transaction_date,
        st.transaction_type,
        st.quantity,
        st.unit_cost,
        st.total_cost,
        st.reference_type,
        st.notes,
        u.UserName as created_by_name,
        
        -- Running total calculation
        SUM(CASE WHEN st.transaction_type IN ('INITIAL_SETUP', 'ACQUISITION', 'RETURN') 
                 THEN st.quantity 
                 ELSE -st.quantity END) 
        OVER (ORDER BY st.transaction_date, st.created_at 
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total
              
    FROM stock_transactions st
    INNER JOIN AspNetUsers u ON st.created_by = u.Id
    WHERE st.item_id = @ItemID
    ORDER BY st.transaction_date, st.created_at;
    
    -- Procurement history
    SELECT 
        ar.title as request_title,
        ar.created_at as request_date,
        pt.tender_code,
        pt.tender_title,
        po.po_number,
        po.po_date,
        d.delivery_number,
        d.delivery_date,
        sa.acquisition_number,
        sa.acquisition_date,
        sai.quantity_acquired,
        sai.unit_cost as acquisition_cost
        
    FROM request_items_with_stock riws
    INNER JOIN approval_requests ar ON riws.request_id = ar.id
    LEFT JOIN procurement_tenders pt ON ar.tender_id = pt.id
    LEFT JOIN purchase_orders po ON pt.id = po.tender_id
    LEFT JOIN deliveries d ON po.id = d.purchase_order_id
    LEFT JOIN stock_acquisitions sa ON d.id = sa.delivery_id
    LEFT JOIN stock_acquisition_items sai ON sa.id = sai.acquisition_id AND sai.item_id = @ItemID
    WHERE riws.item_id = @ItemID
    ORDER BY ar.created_at DESC;
END
GO

PRINT '✅ Complete Inventory Lifecycle Stored Procedures Created!';
PRINT '📦 Manages: Initial Setup → Inventory Tracking → Request → Tender → Delivery → Acquisition';
PRINT '🎯 Integrated with your workflow: DEC → DG Admin → AD Admin → Procurement';
PRINT '📊 Complete audit trail and real-time inventory updates';

GO
