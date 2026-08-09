-- Use existing real users from AspNetUsers table for approval forwarding testing
USE InventoryManagementDB;
GO

-- Get some real users for testing (first 5 active users)
DECLARE @TestUsers TABLE (
    Id NVARCHAR(450),
    FullName NVARCHAR(450),
    UserName NVARCHAR(256),
    Role NVARCHAR(50)
);

INSERT INTO @TestUsers (Id, FullName, UserName, Role)
SELECT TOP 5 
    Id, 
    FullName, 
    UserName,
    COALESCE(Role, 'User') as Role
FROM AspNetUsers 
WHERE ISACT = 1 AND PasswordHash IS NOT NULL
ORDER BY FullName;

-- Display the users we'll use for testing
SELECT 'Test Users Selected:' as Info;
SELECT Id, FullName, UserName, Role FROM @TestUsers;

-- Insert sample stock issuances using real users
DECLARE @User1 NVARCHAR(450) = (SELECT TOP 1 Id FROM @TestUsers ORDER BY FullName);
DECLARE @User2 NVARCHAR(450) = (SELECT Id FROM @TestUsers WHERE Id != @User1 ORDER BY FullName OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY);
DECLARE @User3 NVARCHAR(450) = (SELECT Id FROM @TestUsers WHERE Id NOT IN (@User1, @User2) ORDER BY FullName OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY);
DECLARE @User4 NVARCHAR(450) = (SELECT Id FROM @TestUsers WHERE Id NOT IN (@User1, @User2, @User3) ORDER BY FullName OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY);
DECLARE @User5 NVARCHAR(450) = (SELECT Id FROM @TestUsers WHERE Id NOT IN (@User1, @User2, @User3, @User4) ORDER BY FullName OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY);

-- Clean up any existing test data first
DELETE FROM IssuanceApprovalForwards WHERE IssuanceId IN (
    SELECT Id FROM StockIssuances WHERE IssuanceNumber LIKE 'ISS-TEST-%'
);
DELETE FROM IssuanceApprovalHistory WHERE IssuanceId IN (
    SELECT Id FROM StockIssuances WHERE IssuanceNumber LIKE 'ISS-TEST-%'
);
DELETE FROM StockIssuances WHERE IssuanceNumber LIKE 'ISS-TEST-%';

-- Insert sample stock issuances with real users
INSERT INTO StockIssuances (IssuanceNumber, RequestedBy, ApprovalStatus, CurrentApproverId, ApprovalLevel)
VALUES 
('ISS-TEST-001', @User1, 'PENDING', @User2, 1),
('ISS-TEST-002', @User1, 'PENDING', @User3, 2),
('ISS-TEST-003', @User2, 'PENDING', @User4, 1),
('ISS-TEST-004', @User1, 'APPROVED', NULL, 3),
('ISS-TEST-005', @User2, 'REJECTED', NULL, 2);

-- Insert sample approval history for all submissions
INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, Level, CreatedBy)
SELECT 
    si.Id,
    si.RequestedBy,
    'SUBMITTED',
    'Stock issuance request for ' + si.IssuanceNumber,
    1,
    si.RequestedBy
FROM StockIssuances si
WHERE si.IssuanceNumber LIKE 'ISS-TEST-%';

-- Insert sample approval forwards for pending items
INSERT INTO IssuanceApprovalForwards (IssuanceId, ForwardedFromUserId, ForwardedToUserId, ForwardReason, Level, Priority, CreatedBy)
SELECT 
    si.Id,
    si.RequestedBy,
    si.CurrentApproverId,
    CASE 
        WHEN si.ApprovalLevel = 1 THEN 'Please review and approve this stock issuance request'
        WHEN si.ApprovalLevel = 2 THEN 'Escalated for senior management approval'
        ELSE 'High-value items require director level approval'
    END,
    si.ApprovalLevel,
    CASE 
        WHEN si.IssuanceNumber LIKE '%001' THEN 'High'
        WHEN si.IssuanceNumber LIKE '%002' THEN 'Urgent'
        WHEN si.IssuanceNumber LIKE '%003' THEN 'Normal'
        ELSE 'Normal'
    END,
    si.RequestedBy
FROM StockIssuances si
WHERE si.CurrentApproverId IS NOT NULL
  AND si.IssuanceNumber LIKE 'ISS-TEST-%';

-- Add forward history for approved item
INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, ForwardedToUserId, ForwardReason, Level, CreatedBy)
VALUES 
((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-TEST-004'), @User3, 'FORWARDED', 'Forwarding to senior manager for final approval', @User4, 'High value items require senior approval', 2, @User3),
((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-TEST-004'), @User4, 'APPROVED', 'Approved after thorough review', NULL, NULL, 3, @User4);

-- Add rejection history
INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, Level, CreatedBy)
VALUES 
((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-TEST-005'), @User3, 'REJECTED', 'Request does not meet current procurement guidelines', 2, @User3);

-- Set due dates for urgent/high priority items
UPDATE IssuanceApprovalForwards 
SET DueDate = DATEADD(day, 3, GETDATE())
WHERE Priority = 'Urgent' AND IsActive = 1;

UPDATE IssuanceApprovalForwards 
SET DueDate = DATEADD(day, 7, GETDATE())
WHERE Priority = 'High' AND IsActive = 1;

-- Display final status
PRINT 'Sample approval data created successfully using REAL USERS!';
PRINT '';

-- Show the test setup
SELECT 
    'Test Setup Summary' as Summary,
    u.FullName as UserName,
    u.Role,
    si.IssuanceNumber,
    si.ApprovalStatus,
    ca.FullName as CurrentApprover,
    af.Priority
FROM StockIssuances si
INNER JOIN AspNetUsers u ON si.RequestedBy = u.Id
LEFT JOIN AspNetUsers ca ON si.CurrentApproverId = ca.Id
LEFT JOIN IssuanceApprovalForwards af ON si.Id = af.IssuanceId AND af.IsActive = 1
WHERE si.IssuanceNumber LIKE 'ISS-TEST-%'
ORDER BY si.IssuanceNumber;

-- Show who can test what
PRINT '';
PRINT 'TESTING INSTRUCTIONS:';
PRINT '1. Login with any of the above users using their CNIC as username';
PRINT '2. Users with pending approvals will see them in Approval Manager';  
PRINT '3. Test forwarding, approving, and rejecting workflows';
PRINT '4. Check approval history to see complete audit trail';

-- Show current approval status
SELECT 
    'Final Status' as Summary,
    COUNT(*) as TotalTestIssuances,
    SUM(CASE WHEN ApprovalStatus = 'PENDING' THEN 1 ELSE 0 END) as PendingCount,
    SUM(CASE WHEN ApprovalStatus = 'APPROVED' THEN 1 ELSE 0 END) as ApprovedCount,
    SUM(CASE WHEN ApprovalStatus = 'REJECTED' THEN 1 ELSE 0 END) as RejectedCount
FROM StockIssuances
WHERE IssuanceNumber LIKE 'ISS-TEST-%';
