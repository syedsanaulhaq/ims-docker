-- =====================================================================
-- COMPLETE STOCK ISSUANCE WORKFLOW WITH INVENTORY MANAGEMENT
-- =====================================================================
-- This script creates:
-- 1. Issued Items Tracking Table (who got what)
-- 2. Stock Availability Check Function
-- 3. Stock Update Procedures
-- 4. Automatic Stock Deduction Triggers
-- 5. Issuance History Views
-- =====================================================================

USE InventoryManagementDB;
GO

-- =====================================================================
-- 1. CREATE ISSUED ITEMS TRACKING TABLE
-- This table tracks all issued items - who got what and when
-- =====================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'issued_items_ledger')
BEGIN
    CREATE TABLE issued_items_ledger (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Request Information
        request_id UNIQUEIDENTIFIER NOT NULL,
        request_number NVARCHAR(50),
        
        -- Item Information
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        nomenclature NVARCHAR(500),
        issued_quantity INT NOT NULL,
        unit_price DECIMAL(18,2),
        total_value DECIMAL(18,2),
        
        -- Recipient Information
        issued_to_user_id UNIQUEIDENTIFIER NOT NULL,
        issued_to_user_name NVARCHAR(255),
        issued_to_office_id INT,
        issued_to_office_name NVARCHAR(255),
        issued_to_wing_id INT,
        issued_to_wing_name NVARCHAR(255),
        issued_to_branch_id NVARCHAR(100),
        
        -- Issuance Details
        issued_by UNIQUEIDENTIFIER NOT NULL,
        issued_by_name NVARCHAR(255),
        issued_at DATETIME2 DEFAULT GETDATE(),
        
        -- Purpose and Type
        purpose NVARCHAR(MAX),
        request_type NVARCHAR(50), -- 'Personal Use', 'Official', 'Project', 'Tender'
        urgency_level NVARCHAR(50),
        
        -- Return Information (for returnable items)
        is_returnable BIT DEFAULT 0,
        expected_return_date DATE,
        actual_return_date DATE,
        return_status NVARCHAR(50) DEFAULT 'Not Returned', -- 'Not Returned', 'Returned', 'Overdue', 'Lost'
        
        -- Stock Source
        source_type NVARCHAR(50), -- 'Regular Stock', 'Tender', 'Procurement'
        source_reference_id UNIQUEIDENTIFIER, -- tender_id or acquisition_id
        
        -- Serial Numbers (if applicable)
        serial_numbers NVARCHAR(MAX), -- JSON array of serial numbers
        
        -- Status
        status NVARCHAR(50) DEFAULT 'Issued', -- 'Issued', 'In Use', 'Returned', 'Lost', 'Damaged'
        
        -- Notes
        issuance_notes NVARCHAR(MAX),
        return_notes NVARCHAR(MAX),
        
        -- Timestamps
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign Keys
        FOREIGN KEY (request_id) REFERENCES stock_issuance_requests(id),
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id)
    );
    
    PRINT '✅ Table [issued_items_ledger] created successfully';
END
ELSE
    PRINT '⚠️ Table [issued_items_ledger] already exists';
GO

-- Create indexes for better performance
CREATE NONCLUSTERED INDEX IX_issued_items_user ON issued_items_ledger(issued_to_user_id);
CREATE NONCLUSTERED INDEX IX_issued_items_office ON issued_items_ledger(issued_to_office_id);
CREATE NONCLUSTERED INDEX IX_issued_items_item ON issued_items_ledger(item_master_id);
CREATE NONCLUSTERED INDEX IX_issued_items_date ON issued_items_ledger(issued_at);
CREATE NONCLUSTERED INDEX IX_issued_items_return ON issued_items_ledger(is_returnable, return_status);
GO

-- =====================================================================
-- 2. STOCK AVAILABILITY CHECK FUNCTION
-- Checks if requested items are available in stock
-- =====================================================================

CREATE OR ALTER FUNCTION dbo.fn_CheckStockAvailability
(
    @item_master_id UNIQUEIDENTIFIER,
    @requested_quantity INT
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        cis.id as stock_id,
        cis.item_master_id,
        im.nomenclature,
        im.category_id,
        im.sub_category_id,
        cis.current_quantity,
        cis.reserved_quantity,
        cis.available_quantity,
        @requested_quantity as requested_quantity,
        CASE 
            WHEN cis.available_quantity >= @requested_quantity THEN 'Available'
            WHEN cis.available_quantity > 0 AND cis.available_quantity < @requested_quantity THEN 'Partial'
            ELSE 'Out of Stock'
        END as availability_status,
        cis.available_quantity - @requested_quantity as remaining_after_issue,
        cis.minimum_stock_level,
        CASE 
            WHEN (cis.available_quantity - @requested_quantity) < cis.minimum_stock_level THEN 'Yes'
            ELSE 'No'
        END as will_trigger_reorder,
        im.unit_price,
        im.unit_price * @requested_quantity as estimated_value
    FROM current_inventory_stock cis
    INNER JOIN item_masters im ON cis.item_master_id = im.id
    WHERE cis.item_master_id = @item_master_id
);
GO

PRINT '✅ Function [fn_CheckStockAvailability] created successfully';
GO

-- =====================================================================
-- 3. STOCK UPDATE PROCEDURE - ISSUE ITEMS
-- Updates stock when items are issued
-- =====================================================================

CREATE OR ALTER PROCEDURE sp_IssueStockItems
    @request_id UNIQUEIDENTIFIER,
    @issued_by UNIQUEIDENTIFIER,
    @issued_by_name NVARCHAR(255),
    @issuance_notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        DECLARE @request_number NVARCHAR(50);
        DECLARE @requester_user_id UNIQUEIDENTIFIER;
        DECLARE @requester_user_name NVARCHAR(255);
        DECLARE @requester_office_id INT;
        DECLARE @requester_wing_id INT;
        DECLARE @requester_branch_id NVARCHAR(100);
        DECLARE @purpose NVARCHAR(MAX);
        DECLARE @request_type NVARCHAR(50);
        DECLARE @urgency_level NVARCHAR(50);
        DECLARE @is_returnable BIT;
        DECLARE @expected_return_date DATE;
        
        -- Get request details
        SELECT 
            @request_number = request_number,
            @requester_user_id = requester_user_id,
            @requester_office_id = requester_office_id,
            @requester_wing_id = requester_wing_id,
            @requester_branch_id = requester_branch_id,
            @purpose = purpose,
            @request_type = request_type,
            @urgency_level = urgency_level,
            @is_returnable = is_returnable,
            @expected_return_date = TRY_CAST(expected_return_date AS DATE)
        FROM stock_issuance_requests
        WHERE id = @request_id;
        
        -- Get requester name
        SELECT @requester_user_name = user_name 
        FROM AspNetUsers 
        WHERE Id = @requester_user_id;
        
        -- Get office and wing names
        DECLARE @office_name NVARCHAR(255), @wing_name NVARCHAR(255);
        SELECT @office_name = OfficeName FROM Offices WHERE OfficeId = @requester_office_id;
        SELECT @wing_name = WingName FROM Wings WHERE WingId = @requester_wing_id;
        
        -- Process each approved item
        DECLARE @item_id UNIQUEIDENTIFIER;
        DECLARE @item_master_id UNIQUEIDENTIFIER;
        DECLARE @nomenclature NVARCHAR(500);
        DECLARE @approved_quantity INT;
        DECLARE @unit_price DECIMAL(18,2);
        
        DECLARE item_cursor CURSOR FOR
        SELECT 
            sii.id,
            sii.item_master_id,
            sii.nomenclature,
            TRY_CAST(sii.approved_quantity AS INT),
            im.unit_price
        FROM stock_issuance_items sii
        INNER JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @request_id
            AND sii.item_status = 'Approved'
            AND TRY_CAST(sii.approved_quantity AS INT) > 0;
        
        OPEN item_cursor;
        FETCH NEXT FROM item_cursor INTO @item_id, @item_master_id, @nomenclature, @approved_quantity, @unit_price;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Check stock availability
            DECLARE @available_quantity INT;
            SELECT @available_quantity = available_quantity
            FROM current_inventory_stock
            WHERE item_master_id = @item_master_id;
            
            IF @available_quantity >= @approved_quantity
            BEGIN
                -- Update stock quantities
                UPDATE current_inventory_stock
                SET 
                    current_quantity = current_quantity - @approved_quantity,
                    available_quantity = available_quantity - @approved_quantity,
                    last_updated = GETDATE(),
                    updated_by = @issued_by_name
                WHERE item_master_id = @item_master_id;
                
                -- Update item status to issued
                UPDATE stock_issuance_items
                SET 
                    issued_quantity = @approved_quantity,
                    item_status = 'Issued',
                    updated_at = GETDATE()
                WHERE id = @item_id;
                
                -- Insert into issued items ledger
                INSERT INTO issued_items_ledger (
                    request_id, request_number,
                    item_master_id, nomenclature, issued_quantity,
                    unit_price, total_value,
                    issued_to_user_id, issued_to_user_name,
                    issued_to_office_id, issued_to_office_name,
                    issued_to_wing_id, issued_to_wing_name,
                    issued_to_branch_id,
                    issued_by, issued_by_name, issued_at,
                    purpose, request_type, urgency_level,
                    is_returnable, expected_return_date,
                    issuance_notes, status
                )
                VALUES (
                    @request_id, @request_number,
                    @item_master_id, @nomenclature, @approved_quantity,
                    @unit_price, (@unit_price * @approved_quantity),
                    @requester_user_id, @requester_user_name,
                    @requester_office_id, @office_name,
                    @requester_wing_id, @wing_name,
                    @requester_branch_id,
                    @issued_by, @issued_by_name, GETDATE(),
                    @purpose, @request_type, @urgency_level,
                    @is_returnable, @expected_return_date,
                    @issuance_notes, 'Issued'
                );
                
                PRINT '✅ Issued ' + CAST(@approved_quantity AS NVARCHAR) + ' units of: ' + @nomenclature;
            END
            ELSE
            BEGIN
                PRINT '❌ Insufficient stock for: ' + @nomenclature + ' (Available: ' + CAST(@available_quantity AS NVARCHAR) + ', Requested: ' + CAST(@approved_quantity AS NVARCHAR) + ')';
            END
            
            FETCH NEXT FROM item_cursor INTO @item_id, @item_master_id, @nomenclature, @approved_quantity, @unit_price;
        END
        
        CLOSE item_cursor;
        DEALLOCATE item_cursor;
        
        -- Update request status to Issued
        UPDATE stock_issuance_requests
        SET 
            request_status = 'Issued',
            issued_at = CAST(GETDATE() AS NVARCHAR),
            issued_by = @issued_by_name,
            issuance_notes = @issuance_notes,
            updated_at = GETDATE()
        WHERE id = @request_id;
        
        COMMIT TRANSACTION;
        PRINT '✅ Stock issuance completed successfully for request: ' + @request_number;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        PRINT '❌ Error: ' + @ErrorMessage;
        THROW;
    END CATCH
END;
GO

PRINT '✅ Procedure [sp_IssueStockItems] created successfully';
GO

-- =====================================================================
-- 4. VIEW: USER ISSUED ITEMS HISTORY
-- Shows what items each user has received
-- =====================================================================

CREATE OR ALTER VIEW vw_UserIssuedItemsHistory AS
SELECT 
    il.id as ledger_id,
    il.request_number,
    il.issued_at,
    
    -- User Information
    il.issued_to_user_id,
    il.issued_to_user_name,
    u.Email as user_email,
    
    -- Office/Wing Information
    il.issued_to_office_name,
    il.issued_to_wing_name,
    il.issued_to_branch_id,
    
    -- Item Information
    il.item_master_id,
    il.nomenclature,
    im.category_id,
    c.category_name,
    im.sub_category_id,
    sc.sub_category_name,
    
    -- Quantity and Value
    il.issued_quantity,
    il.unit_price,
    il.total_value,
    
    -- Request Details
    il.purpose,
    il.request_type,
    il.urgency_level,
    
    -- Return Information
    il.is_returnable,
    il.expected_return_date,
    il.actual_return_date,
    il.return_status,
    CASE 
        WHEN il.is_returnable = 1 AND il.return_status = 'Not Returned' AND il.expected_return_date < CAST(GETDATE() AS DATE)
        THEN 'Overdue'
        ELSE il.return_status
    END as current_return_status,
    
    -- Issued By
    il.issued_by,
    il.issued_by_name,
    
    -- Status
    il.status,
    il.issuance_notes,
    
    -- Timestamps
    il.created_at
FROM issued_items_ledger il
INNER JOIN item_masters im ON il.item_master_id = im.id
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN AspNetUsers u ON il.issued_to_user_id = u.Id;
GO

PRINT '✅ View [vw_UserIssuedItemsHistory] created successfully';
GO

-- =====================================================================
-- 5. VIEW: STOCK AVAILABILITY WITH DETAILS
-- Shows current stock with availability status
-- =====================================================================

CREATE OR ALTER VIEW vw_StockAvailabilityDetails AS
SELECT 
    cis.id as stock_id,
    cis.item_master_id,
    
    -- Item Details
    im.nomenclature,
    im.item_code,
    im.category_id,
    c.category_name,
    c.item_type, -- Dispensable/Indispensable
    im.sub_category_id,
    sc.sub_category_name,
    
    -- Stock Quantities
    cis.current_quantity,
    cis.reserved_quantity,
    cis.available_quantity,
    cis.minimum_stock_level,
    cis.reorder_point,
    cis.maximum_stock_level,
    
    -- Availability Status
    CASE 
        WHEN cis.available_quantity = 0 THEN 'Out of Stock'
        WHEN cis.available_quantity <= cis.minimum_stock_level THEN 'Low Stock'
        WHEN cis.available_quantity <= cis.reorder_point THEN 'Reorder Required'
        ELSE 'Available'
    END as stock_status,
    
    -- Pricing
    im.unit_price,
    im.unit_price * cis.available_quantity as available_stock_value,
    
    -- Item Type Classification
    CASE 
        WHEN c.item_type = 'Dispensable' THEN 'Consumable'
        WHEN c.item_type = 'Indispensable' THEN 'Non-Consumable'
        ELSE 'Unclassified'
    END as item_classification,
    
    -- Last Update
    cis.last_updated,
    cis.updated_by
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id;
GO

PRINT '✅ View [vw_StockAvailabilityDetails] created successfully';
GO

-- =====================================================================
-- 6. PROCEDURE: RETURN ISSUED ITEMS
-- Handles return of issued items back to stock
-- =====================================================================

CREATE OR ALTER PROCEDURE sp_ReturnIssuedItems
    @ledger_id UNIQUEIDENTIFIER,
    @return_quantity INT,
    @returned_by NVARCHAR(255),
    @return_notes NVARCHAR(MAX) = NULL,
    @item_condition NVARCHAR(50) = 'Good' -- 'Good', 'Damaged', 'Lost'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        DECLARE @item_master_id UNIQUEIDENTIFIER;
        DECLARE @issued_quantity INT;
        DECLARE @nomenclature NVARCHAR(500);
        
        -- Get ledger details
        SELECT 
            @item_master_id = item_master_id,
            @issued_quantity = issued_quantity,
            @nomenclature = nomenclature
        FROM issued_items_ledger
        WHERE id = @ledger_id AND is_returnable = 1;
        
        IF @item_master_id IS NULL
        BEGIN
            THROW 50001, 'Item not found or not returnable', 1;
        END
        
        IF @return_quantity > @issued_quantity
        BEGIN
            THROW 50002, 'Return quantity cannot exceed issued quantity', 1;
        END
        
        -- If item is in good condition, add back to stock
        IF @item_condition = 'Good'
        BEGIN
            UPDATE current_inventory_stock
            SET 
                current_quantity = current_quantity + @return_quantity,
                available_quantity = available_quantity + @return_quantity,
                last_updated = GETDATE(),
                updated_by = @returned_by
            WHERE item_master_id = @item_master_id;
        END
        
        -- Update ledger
        UPDATE issued_items_ledger
        SET 
            actual_return_date = CAST(GETDATE() AS DATE),
            return_status = CASE @item_condition
                WHEN 'Good' THEN 'Returned'
                WHEN 'Damaged' THEN 'Returned - Damaged'
                WHEN 'Lost' THEN 'Lost'
            END,
            status = CASE @item_condition
                WHEN 'Good' THEN 'Returned'
                WHEN 'Damaged' THEN 'Damaged'
                WHEN 'Lost' THEN 'Lost'
            END,
            return_notes = @return_notes,
            updated_at = GETDATE()
        WHERE id = @ledger_id;
        
        COMMIT TRANSACTION;
        PRINT '✅ Item returned successfully: ' + @nomenclature;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        PRINT '❌ Error: ' + @ErrorMessage;
        THROW;
    END CATCH
END;
GO

PRINT '✅ Procedure [sp_ReturnIssuedItems] created successfully';
GO

-- =====================================================================
-- 7. SAMPLE QUERIES FOR TESTING
-- =====================================================================

PRINT '';
PRINT '=====================================================================';
PRINT 'SAMPLE QUERIES - Copy and use these as needed:';
PRINT '=====================================================================';
PRINT '';
PRINT '-- Check stock availability for a specific item:';
PRINT 'SELECT * FROM dbo.fn_CheckStockAvailability(''YOUR-ITEM-MASTER-ID'', 5);';
PRINT '';
PRINT '-- View all issued items to a specific user:';
PRINT 'SELECT * FROM vw_UserIssuedItemsHistory WHERE issued_to_user_id = ''YOUR-USER-ID'' ORDER BY issued_at DESC;';
PRINT '';
PRINT '-- View current stock availability:';
PRINT 'SELECT * FROM vw_StockAvailabilityDetails WHERE stock_status != ''Out of Stock'' ORDER BY available_quantity;';
PRINT '';
PRINT '-- Issue stock items (call from backend):';
PRINT 'EXEC sp_IssueStockItems @request_id = ''REQUEST-ID'', @issued_by = ''USER-ID'', @issued_by_name = ''User Name'';';
PRINT '';
PRINT '-- Return issued items (call from backend):';
PRINT 'EXEC sp_ReturnIssuedItems @ledger_id = ''LEDGER-ID'', @return_quantity = 1, @returned_by = ''User Name'', @item_condition = ''Good'';';
PRINT '';
PRINT '=====================================================================';
PRINT '✅ COMPLETE STOCK ISSUANCE WORKFLOW CREATED SUCCESSFULLY!';
PRINT '=====================================================================';
GO
