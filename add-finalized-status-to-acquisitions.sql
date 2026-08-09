-- Add finalization status to stock acquisitions (deliveries table)
-- This allows locking acquisitions after completion to prevent further edits

-- Add is_finalized column to deliveries table
ALTER TABLE deliveries 
ADD is_finalized BIT NOT NULL DEFAULT 0;

-- Add finalized_at timestamp column
ALTER TABLE deliveries 
ADD finalized_at DATETIME2 NULL;

-- Add finalized_by user tracking
ALTER TABLE deliveries 
ADD finalized_by UNIQUEIDENTIFIER NULL;

-- Add foreign key constraint for finalized_by
ALTER TABLE deliveries 
ADD CONSTRAINT FK_deliveries_finalized_by_users 
FOREIGN KEY (finalized_by) REFERENCES Users(id);

-- Create index for performance on finalized status queries
CREATE INDEX IX_deliveries_is_finalized ON deliveries(is_finalized);

-- Update existing completed deliveries to be finalized (optional - comment out if not desired)
-- UPDATE deliveries 
-- SET is_finalized = 1, finalized_at = updated_at 
-- WHERE delivery_date IS NOT NULL AND delivery_notes IS NOT NULL;

SELECT 'Finalization status successfully added to acquisitions' AS status;
