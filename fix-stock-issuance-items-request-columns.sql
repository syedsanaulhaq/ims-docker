-- =====================================================
-- Align stock_issuance_items with request/create workflow
-- Adds request-linked columns used by IMS APIs
-- =====================================================

USE InventoryManagementDB;
GO

PRINT 'Updating stock_issuance_items schema...';
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'request_id') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD request_id UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'nomenclature') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD nomenclature NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'custom_item_name') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD custom_item_name NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'item_type') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD item_type NVARCHAR(50) NULL
    CONSTRAINT DF_stock_issuance_items_item_type DEFAULT ('standard');
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'item_status') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD item_status NVARCHAR(50) NULL
    CONSTRAINT DF_stock_issuance_items_item_status DEFAULT ('Pending');
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'is_deleted') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD is_deleted BIT NOT NULL
    CONSTRAINT DF_stock_issuance_items_is_deleted DEFAULT (0);
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'deleted_at') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD deleted_at DATETIME NULL;
GO

IF COL_LENGTH('dbo.stock_issuance_items', 'deleted_by') IS NULL
  ALTER TABLE dbo.stock_issuance_items ADD deleted_by UNIQUEIDENTIFIER NULL;
GO

-- Request items are created before physical issuance
IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'stock_issuance_items'
    AND COLUMN_NAME = 'stock_issuance_id'
    AND IS_NULLABLE = 'NO'
)
BEGIN
  ALTER TABLE dbo.stock_issuance_items ALTER COLUMN stock_issuance_id UNIQUEIDENTIFIER NULL;
END
GO

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'stock_issuance_items'
    AND COLUMN_NAME = 'item_master_id'
    AND IS_NULLABLE = 'NO'
)
BEGIN
  ALTER TABLE dbo.stock_issuance_items ALTER COLUMN item_master_id UNIQUEIDENTIFIER NULL;
END
GO

UPDATE sii
SET request_id = sii.stock_issuance_id
FROM dbo.stock_issuance_items sii
INNER JOIN dbo.stock_issuance_requests sir ON sir.id = sii.stock_issuance_id
WHERE sii.request_id IS NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_stock_issuance_items_request_id'
    AND object_id = OBJECT_ID('dbo.stock_issuance_items')
)
BEGIN
  CREATE INDEX IX_stock_issuance_items_request_id
    ON dbo.stock_issuance_items(request_id);
END
GO

IF OBJECT_ID('dbo.sp_GetLastIssuedSummary', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_GetLastIssuedSummary;
GO

CREATE PROCEDURE dbo.sp_GetLastIssuedSummary
  @userId NVARCHAR(450) = NULL,
  @wingId INT = NULL,
  @excludeRequestId UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    sii.item_master_id,
    COALESCE(im.nomenclature, sii.nomenclature, sii.custom_item_name, 'Unknown Item') AS nomenclature,
    MAX(COALESCE(sii.issued_quantity, sii.approved_quantity, sii.requested_quantity, 0)) AS last_issued_quantity,
    MAX(COALESCE(sir.updated_at, sir.submitted_at, sir.created_at, sii.created_at)) AS last_issued_at
  FROM dbo.stock_issuance_items sii
  INNER JOIN dbo.stock_issuance_requests sir
    ON sir.id = COALESCE(sii.request_id, sii.stock_issuance_id)
  LEFT JOIN dbo.item_masters im ON im.id = sii.item_master_id
  WHERE (sii.is_deleted = 0 OR sii.is_deleted IS NULL)
    AND (
      UPPER(COALESCE(sir.approval_status, sir.request_status, '')) IN ('ISSUED', 'COMPLETED', 'APPROVED')
      OR UPPER(COALESCE(sii.status, sii.item_status, '')) IN ('ISSUED', 'APPROVED')
    )
    AND (@userId IS NULL OR CONVERT(NVARCHAR(450), sir.requester_user_id) = @userId)
    AND (@wingId IS NULL OR sir.requester_wing_id = @wingId)
    AND (@excludeRequestId IS NULL OR sir.id <> @excludeRequestId)
  GROUP BY
    sii.item_master_id,
    COALESCE(im.nomenclature, sii.nomenclature, sii.custom_item_name, 'Unknown Item')
  ORDER BY last_issued_at DESC;
END
GO

PRINT 'stock_issuance_items schema aligned.';
GO
