-- ============================================================================
-- Migration: Create required_items table
-- Purpose: Track items that could not be issued due to insufficient stock
--          so they can be routed into the tender procurement pipeline
-- ============================================================================

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
    -- Tender linkage
    tender_id               UNIQUEIDENTIFIER NULL REFERENCES tenders(id),
    tender_type             NVARCHAR(50)     NULL,
    tender_reference        NVARCHAR(200)    NULL,
    -- Audit
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

-- Index for fast lookup by status and source request
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_status' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_status ON required_items(status, is_deleted);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_source' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_source ON required_items(source_request_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_required_items_tender' AND object_id = OBJECT_ID('required_items'))
  CREATE INDEX IX_required_items_tender ON required_items(tender_id);
