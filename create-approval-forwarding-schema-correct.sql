-- Enhanced Stock Issuance Approval Forwarding System Schema
-- This creates a flexible approval workflow where approvers can forward requests to any user
-- Using InventoryManagementDB database and AspNetUsers table

USE InventoryManagementDB;
GO

-- Drop existing tables if they exist
IF OBJECT_ID('IssuanceApprovalForwards', 'U') IS NOT NULL
    DROP TABLE IssuanceApprovalForwards;

IF OBJECT_ID('IssuanceApprovalHistory', 'U') IS NOT NULL
    DROP TABLE IssuanceApprovalHistory;

-- Enhanced IssuanceApprovalHistory table to track all approval actions
CREATE TABLE IssuanceApprovalHistory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    IssuanceId INT NOT NULL,
    UserId NVARCHAR(450) NOT NULL, -- Reference to AspNetUsers.Id
    ActionType NVARCHAR(50) NOT NULL, -- 'SUBMITTED', 'APPROVED', 'REJECTED', 'FORWARDED', 'RECALLED'
    ActionDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    Comments NTEXT NULL,
    ForwardedToUserId NVARCHAR(450) NULL, -- If forwarded, who it was forwarded to
    ForwardReason NTEXT NULL, -- Reason for forwarding
    Level INT NOT NULL DEFAULT 1, -- Approval level (1=immediate supervisor, 2=manager, etc.)
    IsFinalApproval BIT NOT NULL DEFAULT 0, -- Indicates if this is the final approval
    CreatedBy NVARCHAR(450) NOT NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Foreign key constraints
    FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (ForwardedToUserId) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (CreatedBy) REFERENCES AspNetUsers(Id)
);

-- IssuanceApprovalForwards table to track current forward assignments
CREATE TABLE IssuanceApprovalForwards (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    IssuanceId INT NOT NULL,
    ForwardedFromUserId NVARCHAR(450) NOT NULL, -- Who forwarded it
    ForwardedToUserId NVARCHAR(450) NOT NULL, -- Who it was forwarded to
    ForwardReason NTEXT NULL,
    ForwardDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    IsActive BIT NOT NULL DEFAULT 1, -- Active forward (not yet acted upon)
    Level INT NOT NULL, -- Approval level
    Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal', -- 'Low', 'Normal', 'High', 'Urgent'
    DueDate DATETIME2 NULL, -- Optional due date for action
    ReminderSent BIT NOT NULL DEFAULT 0,
    CreatedBy NVARCHAR(450) NOT NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Foreign key constraints
    FOREIGN KEY (ForwardedFromUserId) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (ForwardedToUserId) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (CreatedBy) REFERENCES AspNetUsers(Id)
);

-- Create indexes for better performance
CREATE INDEX IX_IssuanceApprovalHistory_IssuanceId ON IssuanceApprovalHistory(IssuanceId);
CREATE INDEX IX_IssuanceApprovalHistory_UserId ON IssuanceApprovalHistory(UserId);
CREATE INDEX IX_IssuanceApprovalHistory_ActionType ON IssuanceApprovalHistory(ActionType);
CREATE INDEX IX_IssuanceApprovalHistory_ActionDate ON IssuanceApprovalHistory(ActionDate);

CREATE INDEX IX_IssuanceApprovalForwards_IssuanceId ON IssuanceApprovalForwards(IssuanceId);
CREATE INDEX IX_IssuanceApprovalForwards_ForwardedToUserId ON IssuanceApprovalForwards(ForwardedToUserId);
CREATE INDEX IX_IssuanceApprovalForwards_IsActive ON IssuanceApprovalForwards(IsActive);
CREATE INDEX IX_IssuanceApprovalForwards_Level ON IssuanceApprovalForwards(Level);

-- Check if StockIssuances table exists, if not create a basic one for testing
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockIssuances')
BEGIN
    CREATE TABLE StockIssuances (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        IssuanceNumber NVARCHAR(50) NOT NULL,
        RequestedBy NVARCHAR(450) NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
        CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY (RequestedBy) REFERENCES AspNetUsers(Id)
    );
END

-- Update StockIssuances table to include approval status and current approver
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockIssuances') AND name = 'ApprovalStatus')
    ALTER TABLE StockIssuances ADD ApprovalStatus NVARCHAR(50) NOT NULL DEFAULT 'PENDING';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockIssuances') AND name = 'CurrentApproverId')
    ALTER TABLE StockIssuances ADD CurrentApproverId NVARCHAR(450) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockIssuances') AND name = 'ApprovalLevel')
    ALTER TABLE StockIssuances ADD ApprovalLevel INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockIssuances') AND name = 'FinalApprovedBy')
    ALTER TABLE StockIssuances ADD FinalApprovedBy NVARCHAR(450) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockIssuances') AND name = 'FinalApprovalDate')
    ALTER TABLE StockIssuances ADD FinalApprovalDate DATETIME2 NULL;

-- Add foreign key constraints to StockIssuances
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StockIssuances_CurrentApprover')
    ALTER TABLE StockIssuances 
    ADD CONSTRAINT FK_StockIssuances_CurrentApprover 
    FOREIGN KEY (CurrentApproverId) REFERENCES AspNetUsers(Id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StockIssuances_FinalApprover')
    ALTER TABLE StockIssuances 
    ADD CONSTRAINT FK_StockIssuances_FinalApprover 
    FOREIGN KEY (FinalApprovedBy) REFERENCES AspNetUsers(Id);

PRINT 'Enhanced approval forwarding schema created successfully!';
PRINT 'Key features:';
PRINT '- Flexible forwarding to any user in AspNetUsers';
PRINT '- Complete approval history tracking';
PRINT '- Multi-level approval support';
PRINT '- Priority and due date management';
