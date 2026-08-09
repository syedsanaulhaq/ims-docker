-- ============================================================================
-- Migration: Add procurement classification columns to required_items
-- Purpose: Track recommended procurement type and estimated value per item
--          so procurement officers can route items to the correct tender lane.
-- ============================================================================

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

-- Add source required item tracking to tender_items so we can mark demand as In Tender
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
