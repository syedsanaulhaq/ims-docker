-- Ensure Notifications table exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId NVARCHAR(450) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        Type NVARCHAR(50) NOT NULL,
        ActionUrl NVARCHAR(500) NULL,
        ActionText NVARCHAR(200) NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        ReadAt DATETIME NULL,
        INDEX IX_Notifications_UserId (UserId),
        INDEX IX_Notifications_CreatedAt (CreatedAt DESC),
        INDEX IX_Notifications_IsRead (IsRead)
    );
    PRINT '✓ Created Notifications table';
END
ELSE
    PRINT '✓ Notifications table already exists';

GO

-- Drop and recreate stored procedure
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'GetUserNotifications')
    DROP PROCEDURE GetUserNotifications;

GO

CREATE PROCEDURE GetUserNotifications
    @UserId NVARCHAR(450),
    @UnreadOnly BIT = 0,
    @Limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP(@Limit)
        Id,
        UserId,
        Title,
        Message,
        Type,
        ActionUrl,
        ActionText,
        IsRead,
        CreatedAt,
        ReadAt
    FROM Notifications
    WHERE UserId = @UserId 
        AND (@UnreadOnly = 0 OR IsRead = 0)
    ORDER BY CreatedAt DESC;
END

GO

PRINT '✓ Created GetUserNotifications stored procedure';

GO

-- Show sample data
PRINT '--- Current Notifications ---';
SELECT TOP 10
    Id,
    UserId,
    Title,
    Type,
    IsRead,
    CreatedAt
FROM Notifications
ORDER BY CreatedAt DESC;
