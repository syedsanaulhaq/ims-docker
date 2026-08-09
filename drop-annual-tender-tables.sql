-- Drop separate Annual Tender system tables
-- These are being replaced with unified tenders table with tender_type='annual-tender'
-- Backup your database before running this script

PRINT '==========================================';
PRINT 'Dropping separate Annual Tender tables';
PRINT '==========================================';
PRINT '';

-- Step 1: Drop foreign key constraints before dropping tables
PRINT '💾 Step 1: Dropping foreign key constraints...';

-- Drop constraints on vendor_proposals table
IF OBJECT_ID('dbo.vendor_proposals', 'U') IS NOT NULL
BEGIN
    IF CONSTRAINT_ID('[FK_VendorProposals_AnnualTenders]') IS NOT NULL
        ALTER TABLE [dbo].[vendor_proposals] DROP CONSTRAINT [FK_VendorProposals_AnnualTenders];
    
    IF CONSTRAINT_ID('[FK_VendorProposals_Vendors]') IS NOT NULL
        ALTER TABLE [dbo].[vendor_proposals] DROP CONSTRAINT [FK_VendorProposals_Vendors];
    
    IF CONSTRAINT_ID('[FK_VendorProposals_ItemMasters]') IS NOT NULL
        ALTER TABLE [dbo].[vendor_proposals] DROP CONSTRAINT [FK_VendorProposals_ItemMasters];
    
    PRINT '✅ vendor_proposals constraints removed';
END

-- Drop constraints on annual_tender_vendors
IF OBJECT_ID('dbo.annual_tender_vendors', 'U') IS NOT NULL
BEGIN
    IF CONSTRAINT_ID('[FK_AnnualTenderVendors_AnnualTenders]') IS NOT NULL
        ALTER TABLE [dbo].[annual_tender_vendors] DROP CONSTRAINT [FK_AnnualTenderVendors_AnnualTenders];
    
    IF CONSTRAINT_ID('[FK_AnnualTenderVendors_Vendors]') IS NOT NULL
        ALTER TABLE [dbo].[annual_tender_vendors] DROP CONSTRAINT [FK_AnnualTenderVendors_Vendors];
    
    PRINT '✅ annual_tender_vendors constraints removed';
END

-- Drop constraints on annual_tender_groups
IF OBJECT_ID('dbo.annual_tender_groups', 'U') IS NOT NULL
BEGIN
    IF CONSTRAINT_ID('[FK_AnnualTenderGroups_AnnualTenders]') IS NOT NULL
        ALTER TABLE [dbo].[annual_tender_groups] DROP CONSTRAINT [FK_AnnualTenderGroups_AnnualTenders];
    
    IF CONSTRAINT_ID('[FK_AnnualTenderGroups_Categories]') IS NOT NULL
        ALTER TABLE [dbo].[annual_tender_groups] DROP CONSTRAINT [FK_AnnualTenderGroups_Categories];
    
    PRINT '✅ annual_tender_groups constraints removed';
END

PRINT '';
PRINT '💾 Step 2: Dropping tables...';

-- Drop vendor_proposals first (depends on other tables)
IF OBJECT_ID('dbo.vendor_proposals', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[vendor_proposals];
    PRINT '✅ Dropped table: vendor_proposals';
END

-- Drop annual_tender_vendors
IF OBJECT_ID('dbo.annual_tender_vendors', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[annual_tender_vendors];
    PRINT '✅ Dropped table: annual_tender_vendors';
END

-- Drop annual_tender_groups
IF OBJECT_ID('dbo.annual_tender_groups', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[annual_tender_groups];
    PRINT '✅ Dropped table: annual_tender_groups';
END

-- Drop AnnualTenders (main table)
IF OBJECT_ID('dbo.annual_tenders', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[annual_tenders];
    PRINT '✅ Dropped table: annual_tenders';
END

PRINT '';
PRINT '==========================================';
PRINT '✅ All separate annual tender tables dropped';
PRINT 'ℹ️ Using unified tenders table with tender_type=annual-tender instead';
PRINT '==========================================';
