USE [master];
GO

-- Create the login if it doesn't exist on this server
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'invuser')
BEGIN
    CREATE LOGIN [invuser] WITH PASSWORD = '2025Pakistan52@';
END
ELSE
BEGIN
    -- If it does exist, ensure the password is correct for production
    ALTER LOGIN [invuser] WITH PASSWORD = '2025Pakistan52@';
END
GO

USE [InventoryManagementDB];
GO

-- Map the database user to the server login (fixes orphaned user after restore)
ALTER USER [invuser] WITH LOGIN = [invuser];
GO

-- Ensure the user has the necessary permissions
ALTER ROLE db_owner ADD MEMBER [invuser];
GO
