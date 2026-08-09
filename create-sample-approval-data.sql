-- Create sample data for approval forwarding system testing
USE InventoryManagementDB;
GO

-- Insert some sample users if they don't exist
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE Id = 'admin')
BEGIN
    INSERT INTO AspNetUsers (Id, FullName, UserName, Email, Role, ISACT, Password)
    VALUES 
    ('admin', 'System Administrator', 'admin', 'admin@company.com', 'Admin', 1, 'admin'),
    ('manager1', 'John Manager', 'john.manager', 'john.manager@company.com', 'Manager', 1, 'password123'),
    ('approver1', 'Jane Approver', 'jane.approver', 'jane.approver@company.com', 'Approver', 1, 'password123'),
    ('user1', 'Mike User', 'mike.user', 'mike.user@company.com', 'User', 1, 'password123'),
    ('director1', 'Sarah Director', 'sarah.director', 'sarah.director@company.com', 'Director', 1, 'password123');
END

-- Insert sample stock issuances if they don't exist
IF NOT EXISTS (SELECT 1 FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-001')
BEGIN
    INSERT INTO StockIssuances (IssuanceNumber, RequestedBy, ApprovalStatus, CurrentApproverId, ApprovalLevel)
    VALUES 
    ('ISS-2024-001', 'user1', 'PENDING', 'manager1', 1),
    ('ISS-2024-002', 'user1', 'PENDING', 'approver1', 2),
    ('ISS-2024-003', 'manager1', 'PENDING', 'director1', 1),
    ('ISS-2024-004', 'user1', 'APPROVED', NULL, 3),
    ('ISS-2024-005', 'manager1', 'REJECTED', NULL, 2);
END

-- Insert sample approval history
INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, Level, CreatedBy)
SELECT 
    si.Id,
    si.RequestedBy,
    'SUBMITTED',
    'Initial stock issuance request submission',
    1,
    si.RequestedBy
FROM StockIssuances si
WHERE NOT EXISTS (
    SELECT 1 FROM IssuanceApprovalHistory ah 
    WHERE ah.IssuanceId = si.Id AND ah.ActionType = 'SUBMITTED'
);

-- Insert sample approval forwards
INSERT INTO IssuanceApprovalForwards (IssuanceId, ForwardedFromUserId, ForwardedToUserId, ForwardReason, Level, Priority, CreatedBy)
SELECT 
    si.Id,
    si.RequestedBy,
    si.CurrentApproverId,
    CASE 
        WHEN si.ApprovalLevel = 1 THEN 'Initial approval required for stock issuance request'
        WHEN si.ApprovalLevel = 2 THEN 'Escalated to senior management for final approval'
        ELSE 'Director level approval needed for high-value items'
    END,
    si.ApprovalLevel,
    CASE 
        WHEN si.IssuanceNumber LIKE '%001' THEN 'High'
        WHEN si.IssuanceNumber LIKE '%002' THEN 'Urgent'
        ELSE 'Normal'
    END,
    si.RequestedBy
FROM StockIssuances si
WHERE si.CurrentApproverId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM IssuanceApprovalForwards af 
    WHERE af.IssuanceId = si.Id AND af.IsActive = 1
);

-- Add some forward history for completed items
INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, ForwardedToUserId, ForwardReason, Level, CreatedBy)
VALUES 
((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-004'), 'manager1', 'FORWARDED', 'Forwarding to director for final approval', 'director1', 'High value items require director approval', 2, 'manager1'),
((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-004'), 'director1', 'APPROVED', 'Approved after review', NULL, NULL, 3, 'director1'),
((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-005'), 'approver1', 'REJECTED', 'Insufficient justification for requested items', NULL, NULL, 2, 'approver1');

-- Update some due dates for pending approvals
UPDATE IssuanceApprovalForwards 
SET DueDate = DATEADD(day, 7, GETDATE())
WHERE Priority = 'High' AND IsActive = 1;

UPDATE IssuanceApprovalForwards 
SET DueDate = DATEADD(day, 3, GETDATE())
WHERE Priority = 'Urgent' AND IsActive = 1;

-- Print summary
PRINT 'Sample data created successfully!';
PRINT '';
PRINT 'Created:';
PRINT '- 5 sample users (admin, manager1, approver1, user1, director1)';
PRINT '- 5 sample stock issuances with different statuses';
PRINT '- Approval history for all submissions';
PRINT '- Active forwards for pending approvals';
PRINT '- Due dates for high/urgent priority items';
PRINT '';
PRINT 'You can now test the approval forwarding system with:';
PRINT '- Login as admin/admin to see the system';
PRINT '- Login as manager1, approver1, or director1 to see pending approvals';
PRINT '- Use the Approval Manager to forward, approve, or reject requests';

-- Show current status
SELECT 
    'Current Approval Status' as Summary,
    COUNT(*) as TotalIssuances,
    SUM(CASE WHEN ApprovalStatus = 'PENDING' THEN 1 ELSE 0 END) as PendingCount,
    SUM(CASE WHEN ApprovalStatus = 'APPROVED' THEN 1 ELSE 0 END) as ApprovedCount,
    SUM(CASE WHEN ApprovalStatus = 'REJECTED' THEN 1 ELSE 0 END) as RejectedCount
FROM StockIssuances;
