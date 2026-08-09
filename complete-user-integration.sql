-- ====================================================================
-- 👥 COMPLETE ASPNETUSERS INTEGRATION
-- ====================================================================

USE InvMISDB;
GO

-- Get sample user ID
DECLARE @SampleUserID nvarchar(450);
SELECT TOP 1 @SampleUserID = Id FROM AspNetUsers;

-- Update remaining NULL values
UPDATE CurrentStock SET updated_by = @SampleUserID WHERE updated_by IS NULL;
UPDATE StockTransactions SET created_by = @SampleUserID WHERE created_by IS NULL;

-- Create remaining foreign keys
ALTER TABLE CurrentStock 
ADD CONSTRAINT FK_CurrentStock_AspNetUsers 
FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id);

ALTER TABLE StockTransactions 
ADD CONSTRAINT FK_StockTransactions_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);

SELECT '✅ All AspNetUsers relationships created!' as Status;

-- Show final count
SELECT 'Total Foreign Key Relationships: ' + CAST(COUNT(*) AS VARCHAR(10)) as FinalCount
FROM sys.foreign_keys;

GO
