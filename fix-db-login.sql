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

-- Check if the database user exists. If not, create it!
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'invuser')
BEGIN
    CREATE USER [invuser] FOR LOGIN [invuser];
END
ELSE
BEGIN
    -- Map the database user to the server login (fixes orphaned user after restore)
    ALTER USER [invuser] WITH LOGIN = [invuser];
END
GO

-- Ensure the user has the necessary permissions
ALTER ROLE db_owner ADD MEMBER [invuser];
GO
