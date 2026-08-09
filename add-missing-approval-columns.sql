-- Add missing columns to request_approvals table
-- These columns are needed for storing approval metadata

USE InventoryManagementDB;

-- Add approver_name column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('request_approvals') AND name = 'approver_name')
BEGIN
    ALTER TABLE request_approvals ADD approver_name NVARCHAR(200);
END

-- Add approver_designation column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('request_approvals') AND name = 'approver_designation')
BEGIN
    ALTER TABLE request_approvals ADD approver_designation NVARCHAR(200);
END

-- Add approval_comments column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('request_approvals') AND name = 'approval_comments')
BEGIN
    ALTER TABLE request_approvals ADD approval_comments NVARCHAR(1000);
END

PRINT 'Missing columns added to request_approvals table successfully';