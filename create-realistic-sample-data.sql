-- Create realistic sample data using existing AspNetUsers
USE InventoryManagementDB;
GO

-- Get some real users with different roles for testing
DECLARE @AdminUser NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers WHERE Role = 'Administrator' AND ISACT = 1);
DECLARE @CECUser NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers WHERE Role = 'CEC' AND ISACT = 1);
DECLARE @ADGUser NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers WHERE Role = 'ADG' AND ISACT = 1);
DECLARE @DEC1User NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers WHERE Role = 'DEC1' AND ISACT = 1);
DECLARE @REC1User NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers WHERE Role = 'REC1' AND ISACT = 1);

-- Display the users we'll use for testing
PRINT 'Creating sample data with real users:';
PRINT 'Administrator: ' + ISNULL(@AdminUser, 'NOT FOUND');
PRINT 'CEC: ' + ISNULL(@CECUser, 'NOT FOUND');
PRINT 'ADG: ' + ISNULL(@ADGUser, 'NOT FOUND');
PRINT 'DEC1: ' + ISNULL(@DEC1User, 'NOT FOUND');
PRINT 'REC1: ' + ISNULL(@REC1User, 'NOT FOUND');

-- Insert sample stock issuances using real users
IF @DEC1User IS NOT NULL AND @REC1User IS NOT NULL AND @ADGUser IS NOT NULL
BEGIN
    INSERT INTO StockIssuances (IssuanceNumber, RequestedBy, ApprovalStatus, CurrentApproverId, ApprovalLevel)
    VALUES 
    ('ISS-2024-001', @DEC1User, 'PENDING', @REC1User, 1),
    ('ISS-2024-002', @REC1User, 'PENDING', @ADGUser, 2),
    ('ISS-2024-003', @DEC1User, 'PENDING', @CECUser, 1),
    ('ISS-2024-004', @REC1User, 'APPROVED', NULL, 3),
    ('ISS-2024-005', @DEC1User, 'REJECTED', NULL, 2);

    PRINT 'Sample stock issuances created with real users.';

    -- Insert approval history for submissions
    INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, Level, CreatedBy)
    SELECT 
        si.Id,
        si.RequestedBy,
        'SUBMITTED',
        'Stock issuance request submitted for approval',
        1,
        si.RequestedBy
    FROM StockIssuances si
    WHERE si.IssuanceNumber LIKE 'ISS-2024-%';

    -- Insert approval forwards for pending items
    INSERT INTO IssuanceApprovalForwards (IssuanceId, ForwardedFromUserId, ForwardedToUserId, ForwardReason, Level, Priority, CreatedBy)
    SELECT 
        si.Id,
        si.RequestedBy,
        si.CurrentApproverId,
        CASE 
            WHEN si.ApprovalLevel = 1 THEN 'Initial approval required - forwarding to immediate supervisor'
            WHEN si.ApprovalLevel = 2 THEN 'Escalated for senior management approval'
            ELSE 'High-value items require executive approval'
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
      AND si.ApprovalStatus = 'PENDING';

    -- Add completion history for approved/rejected items
    IF @ADGUser IS NOT NULL
    BEGIN
        INSERT INTO IssuanceApprovalHistory (IssuanceId, UserId, ActionType, Comments, ForwardedToUserId, ForwardReason, Level, IsFinalApproval, CreatedBy)
        VALUES 
        ((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-004'), @REC1User, 'FORWARDED', 'Forwarding to ADG for final approval', @ADGUser, 'High value items require ADG approval', 2, 0, @REC1User),
        ((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-004'), @ADGUser, 'APPROVED', 'Approved after thorough review', NULL, NULL, 3, 1, @ADGUser),
        ((SELECT Id FROM StockIssuances WHERE IssuanceNumber = 'ISS-2024-005'), @REC1User, 'REJECTED', 'Insufficient documentation provided', NULL, NULL, 2, 0, @REC1User);
    END

    -- Set due dates for urgent/high priority items
    UPDATE IssuanceApprovalForwards 
    SET DueDate = DATEADD(day, 7, GETDATE())
    WHERE Priority = 'High' AND IsActive = 1;

    UPDATE IssuanceApprovalForwards 
    SET DueDate = DATEADD(day, 3, GETDATE())
    WHERE Priority = 'Urgent' AND IsActive = 1;

    PRINT 'Approval history and forwards created successfully.';
END
ELSE
BEGIN
    PRINT 'ERROR: Required user roles not found. Please ensure users with roles DEC1, REC1, ADG exist in AspNetUsers table.';
END

-- Display summary with real user information
SELECT 
    'Sample Data Summary' as Summary,
    COUNT(*) as TotalIssuances,
    SUM(CASE WHEN ApprovalStatus = 'PENDING' THEN 1 ELSE 0 END) as PendingCount,
    SUM(CASE WHEN ApprovalStatus = 'APPROVED' THEN 1 ELSE 0 END) as ApprovedCount,
    SUM(CASE WHEN ApprovalStatus = 'REJECTED' THEN 1 ELSE 0 END) as RejectedCount
FROM StockIssuances
WHERE IssuanceNumber LIKE 'ISS-2024-%';

-- Show active forwards with real user names
SELECT 
    'Active Forwards' as Type,
    si.IssuanceNumber,
    ru.FullName as RequestedBy,
    fu.FullName as ForwardedTo,
    af.Priority,
    af.DueDate
FROM IssuanceApprovalForwards af
INNER JOIN StockIssuances si ON af.IssuanceId = si.Id
INNER JOIN AspNetUsers ru ON si.RequestedBy = ru.Id  
INNER JOIN AspNetUsers fu ON af.ForwardedToUserId = fu.Id
WHERE af.IsActive = 1
  AND si.IssuanceNumber LIKE 'ISS-2024-%';

PRINT '';
PRINT 'Ready for testing!';
PRINT 'Login with any existing user credentials from AspNetUsers table.';
PRINT 'Users can now forward approvals to any other real user in the system.';
