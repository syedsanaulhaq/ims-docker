-- ============================================================================
-- Fix: Create required_items table and add procurement columns on production
-- Run this if PRODUCTION-DELTA-DEPLOY.sql failed with:
--   Msg 4902: Cannot find the object "required_items"
-- ============================================================================
USE [InventoryManagementDB];
GO
SET NOCOUNT ON;
GO

-- Step 1: Create required_items table if it does not exist
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'required_items')
BEGIN
  CREATE TABLE required_items (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    item_master_id          UNIQUEIDENTIFIER NULL REFERENCES item_masters(id),
    nomenclature            NVARCHAR(500)    NOT NULL,
    quantity_needed         INT              NOT NULL DEFAULT 1,
    unit                    NVARCHAR(50)     NULL,
    source_request_id       UNIQUEIDENTIFIER NULL REFERENCES stock_issuance_requests(id),
    source_request_number   NVARCHAR(100)    NULL,
    requested_by_wing_id    INT              NULL,
    requested_by_wing_name  NVARCHAR(200)    NULL,
    urgency_level           NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    status                  NVARCHAR(50)     NOT NULL DEFAULT 'Pending',
    tender_id               UNIQUEIDENTIFIER NULL REFERENCES tenders(id),
    tender_type             NVARCHAR(50)     NULL,
    tender_reference        NVARCHAR(200)    NULL,
    notes                   NVARCHAR(MAX)    NULL,
    created_at              DATETIME2        NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2        NOT NULL DEFAULT GETDATE(),
    created_by              NVARCHAR(450)    NULL,
    resolved_at             DATETIME2        NULL,
    is_deleted              BIT              NOT NULL DEFAULT 0
  );

  PRINT 'required_items table created.';
END
ELSE
BEGIN
  PRINT 'required_items table already exists.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_status' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_status ON required_items(status, is_deleted);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_source' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_source ON required_items(source_request_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_tender' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_tender ON required_items(tender_id);
GO

-- Step 2: Add procurement classification columns
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('required_items') AND name = 'recommended_procurement_type')
BEGIN
  ALTER TABLE required_items ADD recommended_procurement_type NVARCHAR(50) NULL;
  PRINT 'Added recommended_procurement_type column.';
END
ELSE
BEGIN
  PRINT 'recommended_procurement_type column already exists.';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('required_items') AND name = 'estimated_value')
BEGIN
  ALTER TABLE required_items ADD estimated_value DECIMAL(18,2) NULL;
  PRINT 'Added estimated_value column.';
END
ELSE
BEGIN
  PRINT 'estimated_value column already exists.';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('required_items') AND name = 'category_id')
BEGIN
  ALTER TABLE required_items ADD category_id UNIQUEIDENTIFIER NULL;
  PRINT 'Added category_id column.';
END
ELSE
BEGIN
  PRINT 'category_id column already exists.';
END
GO

-- Step 3: Add source required item tracking to tender_items
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tender_items') AND name = 'source_required_item_id')
BEGIN
  ALTER TABLE tender_items ADD source_required_item_id UNIQUEIDENTIFIER NULL;
  PRINT 'Added source_required_item_id column to tender_items.';
END
ELSE
BEGIN
  PRINT 'source_required_item_id column already exists in tender_items.';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tender_items') AND name = 'source_required_item_ids')
BEGIN
  ALTER TABLE tender_items ADD source_required_item_ids NVARCHAR(MAX) NULL;
  PRINT 'Added source_required_item_ids column to tender_items.';
END
ELSE
BEGIN
  PRINT 'source_required_item_ids column already exists in tender_items.';
END
GO

SET NOCOUNT OFF;
PRINT 'Fix complete.';
