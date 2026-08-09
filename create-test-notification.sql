-- TEST: Create a sample verification notification for testing
-- Replace 'YOUR_USER_ID' with your actual user ID from AspNetUsers table

DECLARE @TestUserId NVARCHAR(450) = '9a4d3aca-7a4f-4342-a431-267da1171244'; -- Replace with your user ID

-- Insert test notification
INSERT INTO Notifications (Id, UserId, Title, Message, Type, ActionUrl, ActionText, CreatedAt, IsRead)
VALUES (
    NEWID(),
    @TestUserId,
    'TEST: Verification Complete: Surgical Masks',
    'Verification Details:
Item: Surgical Masks
Requested Quantity: 100
Status: ✅ Available
Physical Count: 150
Verified By: Wing Supervisor Test
Wing: PMU

Notes: Test notification - Items available in stock',
    'info',
    '/dashboard/verification-history',
    'View Verification Details',
    GETDATE(),
    0
);

PRINT '✅ Test notification created';

-- Show the notification
SELECT TOP 1
    Id,
    UserId,
    Title,
    Type,
    ActionUrl,
    ActionText,
    IsRead,
    CreatedAt
FROM Notifications
WHERE UserId = @TestUserId
ORDER BY CreatedAt DESC;
