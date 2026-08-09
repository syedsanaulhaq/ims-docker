-- ============================================================================
-- Add po_detail column to purchase_orders table
-- ============================================================================
-- This column stores the custom supply order text that appears in the PO document
-- Date: 2026-02-02
-- ============================================================================

USE [InvMIS_ECPIMA_DB_UAT];
GO

-- Check if column exists, if not add it
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('purchase_orders') 
    AND name = 'po_detail'
)
BEGIN
    ALTER TABLE purchase_orders
    ADD po_detail NVARCHAR(MAX) NULL;
    
    PRINT '✅ Column po_detail added to purchase_orders table';
END
ELSE
BEGIN
    PRINT '⚠️ Column po_detail already exists in purchase_orders table';
END
GO

-- Optional: Set a default value for existing records
UPDATE purchase_orders
SET po_detail = 'It is submitted that the following items may kindly be provided to this Commission Secretariat at the earliest to meet the official requirements as per annual tender rates. Furthermore, the supplier may be requested to furnish the corresponding bill/invoice to this office after delivery of the items, so that necessary arrangements for payment can be made in accordance with the prescribed financial rules and procedures.'
WHERE po_detail IS NULL;
GO

PRINT '✅ Migration complete: po_detail column added and existing records updated';
GO
