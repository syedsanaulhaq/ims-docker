-- Create wing_stock_confirmations table for wing stock supervisor workflow
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wing_stock_confirmations')
BEGIN
  CREATE TABLE wing_stock_confirmations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    approval_id NVARCHAR(450) NOT NULL,
    item_id UNIQUEIDENTIFIER,
    item_name NVARCHAR(500),
    requested_quantity INT,
    available_quantity INT,
    request_type NVARCHAR(100),
    status NVARCHAR(50) DEFAULT 'pending', -- pending, confirmed, rejected
    confirmed_by NVARCHAR(450),
    confirmation_notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    confirmed_at DATETIME,
    requested_by NVARCHAR(450),
    
    FOREIGN KEY (approval_id) REFERENCES request_approvals(id)
  );
  
  CREATE INDEX idx_wing_confirmations_approval ON wing_stock_confirmations(approval_id);
  CREATE INDEX idx_wing_confirmations_status ON wing_stock_confirmations(status);
  CREATE INDEX idx_wing_confirmations_item ON wing_stock_confirmations(item_id);
  
  PRINT '✓ wing_stock_confirmations table created successfully';
END
ELSE
BEGIN
  PRINT '⚠ wing_stock_confirmations table already exists';
END
GO
