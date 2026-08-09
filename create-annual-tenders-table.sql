-- Create Annual Tenders table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AnnualTenders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AnnualTenders] (
        [id] [uniqueidentifier] PRIMARY KEY DEFAULT NEWID(),
        [code] [nvarchar](50) NOT NULL UNIQUE,
        [name] [nvarchar](255) NOT NULL,
        [date] [datetime] NOT NULL,
        [created_at] [datetime] DEFAULT GETDATE(),
        [updated_at] [datetime] DEFAULT GETDATE()
    );
    PRINT 'AnnualTenders table created successfully';
END
ELSE
BEGIN
    PRINT 'AnnualTenders table already exists';
END

-- Create Tender Vendors junction table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TenderVendors]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TenderVendors] (
        [id] [int] IDENTITY(1,1) PRIMARY KEY,
        [tender_id] [uniqueidentifier] NOT NULL,
        [vendor_id] [uniqueidentifier] NOT NULL,
        [created_at] [datetime] DEFAULT GETDATE(),
        CONSTRAINT [FK_TenderVendors_TenderId] FOREIGN KEY ([tender_id]) REFERENCES [dbo].[AnnualTenders]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TenderVendors_VendorId] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors]([id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_TenderVendors] UNIQUE ([tender_id], [vendor_id])
    );
    PRINT 'TenderVendors table created successfully';
END
ELSE
BEGIN
    PRINT 'TenderVendors table already exists';
END

-- Create Tender Items table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TenderItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TenderItems] (
        [id] [int] IDENTITY(1,1) PRIMARY KEY,
        [tender_id] [uniqueidentifier] NOT NULL,
        [item_id] [uniqueidentifier] NOT NULL,
        [quantity] [int] NOT NULL,
        [created_at] [datetime] DEFAULT GETDATE(),
        CONSTRAINT [FK_TenderItems_TenderId] FOREIGN KEY ([tender_id]) REFERENCES [dbo].[AnnualTenders]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TenderItems_ItemId] FOREIGN KEY ([item_id]) REFERENCES [dbo].[item_masters]([id]) ON DELETE CASCADE
    );
    PRINT 'TenderItems table created successfully';
END
ELSE
BEGIN
    PRINT 'TenderItems table already exists';
END

-- Create indexes for better performance
CREATE INDEX [IDX_TenderVendors_TenderId] ON [dbo].[TenderVendors]([tender_id]);
CREATE INDEX [IDX_TenderItems_TenderId] ON [dbo].[TenderItems]([tender_id]);

PRINT 'All tables and indexes created successfully';
