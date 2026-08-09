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

IF COL_LENGTH(N'dbo.item_masters', N'manufacturer') IS NULL
    ALTER TABLE dbo.item_masters ADD manufacturer NVARCHAR(255) NULL;
GO

IF COL_LENGTH(N'dbo.item_masters', N'is_deleted') IS NULL
    ALTER TABLE dbo.item_masters ADD is_deleted BIT NOT NULL CONSTRAINT DF_item_masters_is_deleted DEFAULT (0);
GO

IF COL_LENGTH(N'dbo.item_masters', N'deleted_at') IS NULL
    ALTER TABLE dbo.item_masters ADD deleted_at DATETIME NULL;
GO

IF COL_LENGTH(N'dbo.item_masters', N'deleted_by') IS NULL
    ALTER TABLE dbo.item_masters ADD deleted_by UNIQUEIDENTIFIER NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ims_schema_migrations WHERE migration_id = N'20260803_001')
BEGIN
    INSERT dbo.ims_schema_migrations (migration_id, description)
    VALUES (N'20260803_001', N'Add item master fields required by the item management API');
END;
GO