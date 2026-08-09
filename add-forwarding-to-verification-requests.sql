-- Add forwarding support to inventory_verification_requests
-- Run on InventoryManagementDB (or your active IMS DB)

IF COL_LENGTH('dbo.inventory_verification_requests', 'forwarded_to_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.inventory_verification_requests
      ADD forwarded_to_user_id NVARCHAR(450) NULL,
          forwarded_to_name NVARCHAR(255) NULL,
          forwarded_at DATETIME2 NULL,
          forward_notes NVARCHAR(MAX) NULL,
          forwarded_by_user_id NVARCHAR(450) NULL,
          forwarded_by_name NVARCHAR(255) NULL;
END
GO

-- Optional: widen status domain (no constraint exists today). If you add a CHECK later, include these:
-- pending, forwarded, approved, rejected, verified_available, verified_partial, verified_unavailable

PRINT '✅ Forwarding columns ready on inventory_verification_requests';
