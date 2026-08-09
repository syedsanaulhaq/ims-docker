-- Create Notifications table for approval system
USE InventoryManagementDB;

-- Create Notifications table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId NVARCHAR(450) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        Message NVARCHAR(2000) NOT NULL,
        Type NVARCHAR(50) NOT NULL DEFAULT 'info', -- info, success, warning, error
        ActionUrl NVARCHAR(500) NULL,
        ActionText NVARCHAR(100) NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        ReadAt DATETIME2 NULL,
        
        -- Foreign key to AspNetUsers
        CONSTRAINT FK_Notifications_User FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id),
        
        -- Indexes for performance
        INDEX IX_Notifications_UserId_CreatedAt (UserId, CreatedAt DESC),
        INDEX IX_Notifications_IsRead (IsRead, CreatedAt DESC)
    );
    
    PRINT '✅ Notifications table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️ Notifications table already exists';
END

-- Create stored procedure for creating notifications
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'CreateNotification')
    DROP PROCEDURE CreateNotification;

GO

CREATE PROCEDURE CreateNotification
    @UserId NVARCHAR(450),
    @Title NVARCHAR(500),
    @Message NVARCHAR(2000),
    @Type NVARCHAR(50) = 'info',
    @ActionUrl NVARCHAR(500) = NULL,
    @ActionText NVARCHAR(100) = NULL
AS
BEGIN
    DECLARE @NewId UNIQUEIDENTIFIER = NEWID();
    
    INSERT INTO Notifications (Id, UserId, Title, Message, Type, ActionUrl, ActionText)
    VALUES (@NewId, @UserId, @Title, @Message, @Type, @ActionUrl, @ActionText);
    
    SELECT * FROM Notifications WHERE Id = @NewId;
END

GO

-- Create stored procedure for getting user notifications
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'GetUserNotifications')
    DROP PROCEDURE GetUserNotifications;

GO

CREATE PROCEDURE GetUserNotifications
    @UserId NVARCHAR(450),
    @UnreadOnly BIT = 0,
    @Limit INT = 50
AS
BEGIN
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

-- Create stored procedure for marking notifications as read
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'MarkNotificationRead')
    DROP PROCEDURE MarkNotificationRead;

GO

CREATE PROCEDURE MarkNotificationRead
    @NotificationId UNIQUEIDENTIFIER,
    @UserId NVARCHAR(450)
AS
BEGIN
    UPDATE Notifications 
    SET IsRead = 1, ReadAt = GETDATE()
    WHERE Id = @NotificationId AND UserId = @UserId;
END

GO

PRINT '✅ Notification system database schema created successfully';
PRINT '📧 Ready to send notifications for approval requests';