USE [InventoryManagementDB];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.ims_schema_migrations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ims_schema_migrations
    (
        migration_id NVARCHAR(100) NOT NULL PRIMARY KEY,
        description NVARCHAR(500) NOT NULL,
        applied_at DATETIME2(7) NOT NULL CONSTRAINT DF_ims_schema_migrations_applied_at DEFAULT SYSUTCDATETIME()
    );
END;
GO

CREATE OR ALTER VIEW dbo.vw_enhanced_approval_overview
AS
SELECT
    sir.id AS request_id,
    sir.request_number,
    sir.request_status,
    sir.submitted_at,
    sir.approved_at,
    sir.approved_by,
    u.FullName AS requester_name,
    o.strOfficeName AS office_name,
    w.Name AS wing_name,
    (SELECT COUNT(*) FROM dbo.stock_issuance_items sii WHERE sii.stock_issuance_id = sir.id) AS total_items,
    (SELECT COALESCE(SUM(sii.requested_quantity), 0) FROM dbo.stock_issuance_items sii WHERE sii.stock_issuance_id = sir.id) AS total_requested_quantity,
    (SELECT COUNT(*) FROM dbo.stock_issuance_approval_decisions ad WHERE ad.request_id = sir.id AND ad.decision_type = 'APPROVE_FROM_STOCK') AS items_approved_from_stock,
    (SELECT COUNT(*) FROM dbo.stock_issuance_approval_decisions ad WHERE ad.request_id = sir.id AND ad.decision_type = 'APPROVE_FOR_PROCUREMENT') AS items_requiring_procurement,
    (SELECT COUNT(*) FROM dbo.stock_issuance_approval_decisions ad WHERE ad.request_id = sir.id AND ad.decision_type = 'REJECT') AS items_rejected,
    CAST(0 AS INT) AS total_reserved_quantity,
    CAST(0 AS INT) AS procurement_requests_created
FROM dbo.stock_issuance_requests sir
LEFT JOIN dbo.AspNetUsers u ON CONVERT(NVARCHAR(450), sir.requester_user_id) = u.Id
LEFT JOIN dbo.tblOffices o ON sir.requester_office_id = o.intOfficeID
LEFT JOIN dbo.WingsInformation w ON sir.requester_wing_id = w.Id;
GO

CREATE OR ALTER VIEW dbo.vw_approval_requests_with_items
AS
SELECT
    ra.id AS approval_id,
    ra.request_id,
    ra.request_type,
    ra.current_status AS approval_status,
    ra.submitted_date,
    ra.current_approver_id,
    submitter.FullName AS submitted_by_name,
    approver.FullName AS current_approver_name,
    wf.workflow_name,
    sir.request_number,
    sir.purpose,
    sir.urgency_level,
    sir.is_returnable,
    sii.id AS item_id,
    im.nomenclature,
    sii.requested_quantity,
    sii.approved_quantity,
    sii.issued_quantity,
    sii.status AS item_status,
    im.item_code,
    im.description AS item_description,
    im.unit
FROM dbo.request_approvals ra
LEFT JOIN dbo.AspNetUsers submitter ON ra.submitted_by = submitter.Id
LEFT JOIN dbo.AspNetUsers approver ON ra.current_approver_id = approver.Id
LEFT JOIN dbo.approval_workflows wf ON ra.workflow_id = wf.id
LEFT JOIN dbo.stock_issuance_requests sir ON ra.request_id = sir.id AND ra.request_type = 'stock_issuance'
LEFT JOIN dbo.stock_issuance_items sii ON sir.id = sii.stock_issuance_id
LEFT JOIN dbo.item_masters im ON sii.item_master_id = im.id;
GO

IF OBJECT_ID(N'dbo.sp_FinalizeIssuance', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_FinalizeIssuance AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_FinalizeIssuance
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @finalized_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @total_items INT = 0;
    DECLARE @issued_items INT = 0;
    DECLARE @rejected_items INT = 0;
    DECLARE @pending_items INT = 0;

    SELECT
        @total_items = COUNT(*),
        @issued_items = COALESCE(SUM(CASE WHEN status = 'Issued' THEN 1 ELSE 0 END), 0),
        @rejected_items = COALESCE(SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END), 0),
        @pending_items = COALESCE(SUM(CASE WHEN status NOT IN ('Issued', 'Rejected') THEN 1 ELSE 0 END), 0)
    FROM dbo.stock_issuance_items
    WHERE stock_issuance_id = @stock_issuance_request_id;

    UPDATE dbo.stock_issuance_requests
    SET is_finalized = 1,
        finalized_by = @finalized_by,
        finalized_at = GETDATE(),
        request_status = 'Finalized',
        updated_at = GETDATE()
    WHERE id = @stock_issuance_request_id;

    SELECT @stock_issuance_request_id AS request_id,
           'Finalized' AS request_status,
           @total_items AS total_items,
           @issued_items AS issued_items,
           @rejected_items AS rejected_items,
           @pending_items AS pending_items,
           GETDATE() AS finalized_at;
END;
GO

IF OBJECT_ID(N'dbo.sp_GetInventoryDashboardStats', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_GetInventoryDashboardStats AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetInventoryDashboardStats
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM dbo.item_masters) AS total_items,
        (SELECT COUNT(DISTINCT sa.item_master_id) FROM dbo.stock_acquisitions sa WHERE sa.quantity_available > 0 AND ISNULL(sa.is_deleted, 0) = 0) AS items_with_stock,
        (SELECT COALESCE(SUM(sa.quantity_available), 0) FROM dbo.stock_acquisitions sa WHERE sa.quantity_available > 0 AND ISNULL(sa.is_deleted, 0) = 0) AS total_quantity,
        (SELECT COALESCE(SUM(sa.quantity_available * ISNULL(sa.unit_cost, 0)), 0) FROM dbo.stock_acquisitions sa WHERE sa.quantity_available > 0 AND ISNULL(sa.is_deleted, 0) = 0) AS total_value,
        (SELECT COUNT(*)
         FROM dbo.item_masters im
         WHERE im.reorder_point > 0
           AND COALESCE((SELECT SUM(sa.quantity_available) FROM dbo.stock_acquisitions sa WHERE sa.item_master_id = im.id AND ISNULL(sa.is_deleted, 0) = 0), 0) <= im.reorder_point) AS low_stock_count,
        (SELECT COUNT(*) FROM dbo.stock_issuance_requests WHERE LOWER(ISNULL(approval_status, '')) = 'pending' AND ISNULL(is_deleted, 0) = 0) AS pending_requests,
        (SELECT COUNT(*) FROM dbo.categories WHERE ISNULL(is_deleted, 0) = 0) AS total_categories;
END;
GO

IF OBJECT_ID(N'dbo.sp_GetPurchaseReport', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_GetPurchaseReport AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetPurchaseReport
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Status NVARCHAR(50) = NULL,
    @VendorId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        po.id,
        po.po_number,
        CAST(NULL AS UNIQUEIDENTIFIER) AS tender_id,
        po.vendor_id,
        po.order_date AS po_date,
        po.total_amount,
        po.status,
        v.vendor_name,
        CAST(NULL AS NVARCHAR(500)) AS tender_title,
        COUNT(poi.id) AS item_count,
        COALESCE(SUM(poi.total_price), 0) AS line_total
    FROM dbo.purchase_orders po
    LEFT JOIN dbo.vendors v ON po.vendor_id = v.id
    LEFT JOIN dbo.purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE (@StartDate IS NULL OR po.order_date >= @StartDate)
      AND (@EndDate IS NULL OR po.order_date <= @EndDate)
      AND (@Status IS NULL OR po.status = @Status)
      AND (@VendorId IS NULL OR po.vendor_id = @VendorId)
    GROUP BY po.id, po.po_number, po.vendor_id, po.order_date, po.total_amount, po.status, v.vendor_name
    ORDER BY po.order_date DESC;
END;
GO

IF OBJECT_ID(N'dbo.sp_GetTenderReport', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_GetTenderReport AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetTenderReport
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Status NVARCHAR(50) = NULL,
    @Type NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.id,
        t.tender_number,
        t.title AS tender_title,
        t.tender_type,
        COALESCE(t.publish_date, t.publication_date, t.created_at) AS tender_date,
        COALESCE(t.submission_deadline, t.opening_date, t.created_at) AS closing_date,
        t.status,
        COUNT(DISTINCT ti.id) AS item_count,
        COUNT(DISTINCT tv.id) AS bidder_count,
        CAST(0 AS INT) AS po_count
    FROM dbo.tenders t
    LEFT JOIN dbo.tender_items ti ON t.id = ti.tender_id
    LEFT JOIN dbo.tender_vendors tv ON t.id = tv.tender_id
    WHERE (@StartDate IS NULL OR CAST(COALESCE(t.publish_date, t.publication_date, t.created_at) AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST(COALESCE(t.publish_date, t.publication_date, t.created_at) AS DATE) <= @EndDate)
      AND (@Status IS NULL OR t.status = @Status)
      AND (@Type IS NULL OR t.tender_type = @Type)
    GROUP BY t.id, t.tender_number, t.title, t.tender_type,
             COALESCE(t.publish_date, t.publication_date, t.created_at),
             COALESCE(t.submission_deadline, t.opening_date, t.created_at), t.status
    ORDER BY tender_date DESC;
END;
GO

IF OBJECT_ID(N'dbo.sp_HandleVerificationResult', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_HandleVerificationResult AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_HandleVerificationResult
    @stock_issuance_item_id UNIQUEIDENTIFIER,
    @verification_result NVARCHAR(50),
    @available_quantity INT = NULL,
    @verification_notes NVARCHAR(MAX) = NULL,
    @verified_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @new_status NVARCHAR(50) = CASE @verification_result
        WHEN 'available' THEN 'Approved'
        WHEN 'partial' THEN 'Approved'
        WHEN 'unavailable' THEN 'Procurement_Required'
        ELSE 'Pending'
    END;

    UPDATE dbo.stock_issuance_items
    SET status = @new_status,
        approved_quantity = CASE
            WHEN @verification_result = 'partial' THEN @available_quantity
            WHEN @verification_result = 'available' THEN requested_quantity
            ELSE 0
        END,
        remarks = COALESCE(@verification_notes, remarks),
        updated_at = GETDATE()
    WHERE id = @stock_issuance_item_id;

    SELECT @stock_issuance_item_id AS item_id,
           @new_status AS new_status,
           @available_quantity AS available_quantity,
           GETDATE() AS verified_at,
           @verified_by AS verified_by;
END;
GO

IF OBJECT_ID(N'dbo.sp_IssueFromAdminStore', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_IssueFromAdminStore AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_IssueFromAdminStore
    @stock_issuance_item_id UNIQUEIDENTIFIER,
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @item_master_id UNIQUEIDENTIFIER,
    @quantity INT,
    @issued_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    UPDATE dbo.stock_admin
    SET current_quantity = current_quantity - @quantity,
        available_quantity = available_quantity - @quantity,
        updated_at = GETDATE()
    WHERE item_master_id = @item_master_id
      AND available_quantity >= @quantity;

    IF @@ROWCOUNT = 0
        THROW 50001, 'Insufficient admin store stock.', 1;

    UPDATE dbo.stock_issuance_items
    SET status = 'Issued', issued_quantity = @quantity, updated_at = GETDATE()
    WHERE id = @stock_issuance_item_id AND stock_issuance_id = @stock_issuance_request_id;

    UPDATE dbo.stock_issuance_requests
    SET request_status = 'Issued', issued_at = CONVERT(NVARCHAR(30), GETDATE(), 126),
        issued_by = @issued_by, source_store_type = 'admin_store', updated_at = GETDATE()
    WHERE id = @stock_issuance_request_id;

    COMMIT TRANSACTION;

    SELECT NEWID() AS transaction_id, @quantity AS quantity_issued,
           (SELECT current_quantity FROM dbo.stock_admin WHERE item_master_id = @item_master_id) AS remaining_admin_stock,
           GETDATE() AS issued_at;
END;
GO

IF OBJECT_ID(N'dbo.sp_IssueFromWingStore', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_IssueFromWingStore AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_IssueFromWingStore
    @stock_issuance_item_id UNIQUEIDENTIFIER,
    @stock_issuance_request_id UNIQUEIDENTIFIER,
    @item_master_id UNIQUEIDENTIFIER,
    @quantity INT,
    @wing_id INT,
    @issued_by NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    UPDATE dbo.stock_wing
    SET current_quantity = current_quantity - @quantity,
        available_quantity = available_quantity - @quantity,
        updated_at = GETDATE()
    WHERE item_master_id = @item_master_id
      AND wing_id = @wing_id
      AND available_quantity >= @quantity;

    IF @@ROWCOUNT = 0
        THROW 50002, 'Insufficient wing store stock.', 1;

    UPDATE dbo.stock_issuance_items
    SET status = 'Issued', issued_quantity = @quantity, updated_at = GETDATE()
    WHERE id = @stock_issuance_item_id AND stock_issuance_id = @stock_issuance_request_id;

    UPDATE dbo.stock_issuance_requests
    SET request_status = 'Issued', issued_at = CONVERT(NVARCHAR(30), GETDATE(), 126),
        issued_by = @issued_by, source_store_type = 'wing_store', source_wing_id = @wing_id, updated_at = GETDATE()
    WHERE id = @stock_issuance_request_id;

    COMMIT TRANSACTION;

    SELECT NEWID() AS transaction_id, @quantity AS quantity_issued,
           (SELECT current_quantity FROM dbo.stock_wing WHERE item_master_id = @item_master_id AND wing_id = @wing_id) AS remaining_wing_stock,
           GETDATE() AS issued_at;
END;
GO

IF OBJECT_ID(N'dbo.sp_RestoreStockIssuanceRequest', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_RestoreStockIssuanceRequest AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_RestoreStockIssuanceRequest
    @RequestId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.stock_issuance_requests
    SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
    OUTPUT INSERTED.*
    WHERE id = @RequestId AND is_deleted = 1;
END;
GO

IF OBJECT_ID(N'dbo.sp_CreateStockTransactionFromDelivery', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_CreateStockTransactionFromDelivery AS RETURN 0;');
GO

CREATE OR ALTER PROCEDURE dbo.sp_CreateStockTransactionFromDelivery
    @DeliveryId UNIQUEIDENTIFIER,
    @ReceivedBy UNIQUEIDENTIFIER,
    @AcquisitionId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @POId UNIQUEIDENTIFIER;
        DECLARE @PONumber NVARCHAR(50);
        DECLARE @DeliveryNumber NVARCHAR(50);
        DECLARE @AcquisitionNumber NVARCHAR(50);
        DECLARE @TotalItems INT;
        DECLARE @TotalQuantity DECIMAL(15, 2);
        DECLARE @TotalValue DECIMAL(15, 2);

        SELECT @POId = po_id, @PONumber = po_number, @DeliveryNumber = delivery_number
        FROM dbo.deliveries
        WHERE id = @DeliveryId;

        IF @POId IS NULL
            THROW 50003, 'Delivery not linked to a purchase order.', 1;

        SELECT
            @TotalItems = COUNT(*),
            @TotalQuantity = COALESCE(SUM(di.delivery_qty), 0),
            @TotalValue = COALESCE(SUM(di.delivery_qty * poi.unit_price), 0)
        FROM dbo.delivery_items di
        INNER JOIN dbo.purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good';

        DECLARE @Sequence INT;
        SELECT @Sequence = ISNULL(MAX(TRY_CONVERT(INT, RIGHT(acquisition_number, 6))), 0) + 1
        FROM dbo.stock_acquisitions
        WHERE acquisition_number LIKE 'ACQ-' + CONVERT(VARCHAR(4), YEAR(GETDATE())) + '-%';

        SET @AcquisitionNumber = CONCAT('ACQ-', YEAR(GETDATE()), '-', RIGHT('000000' + CONVERT(VARCHAR(6), @Sequence), 6));
        SET @AcquisitionId = NEWID();

        INSERT dbo.stock_transactions
            (id, transaction_number, item_master_id, transaction_type, quantity, unit_price, total_value,
             reference_type, reference_id, reference_number, transaction_date, created_by, status)
        SELECT NEWID(), CONCAT('TXN-', YEAR(GETDATE()), '-', RIGHT(CONVERT(VARCHAR(36), NEWID()), 6)),
               di.item_master_id, 'RECEIVED', di.delivery_qty, poi.unit_price,
               di.delivery_qty * poi.unit_price, 'PURCHASE_ORDER', @POId, @PONumber,
               GETDATE(), CONVERT(NVARCHAR(450), @ReceivedBy), 'ACTIVE'
        FROM dbo.delivery_items di
        INNER JOIN dbo.purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good';

        UPDATE poi
        SET received_quantity = ISNULL(poi.received_quantity, 0) + di.delivery_qty,
            status = CASE WHEN ISNULL(poi.received_quantity, 0) + di.delivery_qty >= poi.ordered_quantity THEN 'completed' ELSE 'partial' END,
            updated_at = GETDATE()
        FROM dbo.purchase_order_items poi
        INNER JOIN dbo.delivery_items di ON di.po_item_id = poi.id
        WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good';

        MERGE dbo.current_inventory_stock AS target
        USING
        (
            SELECT di.item_master_id, SUM(di.delivery_qty) AS quantity
            FROM dbo.delivery_items di
            WHERE di.delivery_id = @DeliveryId AND ISNULL(di.quality_status, 'good') = 'good'
            GROUP BY di.item_master_id
        ) AS source
        ON target.item_master_id = source.item_master_id
        WHEN MATCHED THEN UPDATE SET
            current_quantity = target.current_quantity + source.quantity,
            last_transaction_date = GETDATE(), last_transaction_type = 'RECEIVED', last_updated = GETDATE()
        WHEN NOT MATCHED THEN INSERT
            (id, item_master_id, current_quantity, last_transaction_date, last_transaction_type, last_updated)
            VALUES (NEWID(), source.item_master_id, source.quantity, GETDATE(), 'RECEIVED', GETDATE());

        INSERT dbo.stock_acquisitions
            (id, acquisition_number, po_id, delivery_id, total_items, total_quantity, total_value, acquisition_date, processed_by, status)
        VALUES
            (@AcquisitionId, @AcquisitionNumber, @POId, @DeliveryId, @TotalItems, @TotalQuantity, @TotalValue,
             GETDATE(), CONVERT(NVARCHAR(450), @ReceivedBy), 'completed');

        UPDATE dbo.deliveries
        SET delivery_status = 'completed', received_by = @ReceivedBy, receiving_date = GETDATE(), updated_at = GETDATE()
        WHERE id = @DeliveryId;

        UPDATE dbo.purchase_orders
        SET status = CASE WHEN EXISTS
            (SELECT 1 FROM dbo.purchase_order_items WHERE purchase_order_id = @POId AND status <> 'completed')
            THEN 'partial' ELSE 'completed' END,
            updated_at = GETDATE()
        WHERE id = @POId;

        COMMIT TRANSACTION;

        SELECT @AcquisitionId AS acquisition_id, @AcquisitionNumber AS acquisition_number,
               @TotalItems AS total_items, @TotalQuantity AS total_quantity, @TotalValue AS total_value,
               'Stock acquisition completed successfully' AS message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ims_schema_migrations WHERE migration_id = N'20260731_001')
BEGIN
    INSERT dbo.ims_schema_migrations (migration_id, description)
    VALUES (N'20260731_001', N'Restored schema compatibility views and procedures');
END;
GO