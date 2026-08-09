-- Create database if it doesn't exist (useful for standalone setups)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'DockerInventoryManagementDB')
BEGIN
    CREATE DATABASE DockerInventoryManagementDB;
END
GO

USE DockerInventoryManagementDB;
GO

-- Create Inventory Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Inventory')
BEGIN
    CREATE TABLE Inventory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(150) NOT NULL,
        sku NVARCHAR(50) UNIQUE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        description NVARCHAR(500) NULL,
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- Insert sample records to populate dashboard at launch
IF NOT EXISTS (SELECT 1 FROM Inventory)
BEGIN
    INSERT INTO Inventory (name, sku, quantity, price, description)
    VALUES 
    ('Enterprise Server Rack 42U', 'SR-42U-ENT', 15, 1299.99, 'Standard 42U server cabinet with ventilated mesh doors and cable management integration.'),
    ('Gigabit Switch 24-Port Managed', 'SW-24-MNGD', 45, 189.50, 'Layer 2 managed switch with 24 Gigabit Ethernet ports and 4 SFP uplink ports.'),
    ('Cat6 STP Ethernet Patch Cable 100ft', 'CB-CAT6-100', 120, 24.99, 'Shielded Twisted Pair Snagless Cat6 ethernet cable for high noise environments.'),
    ('Uninterruptible Power Supply 1500VA', 'UPS-1500VA-PRO', 8, 349.00, 'Smart-UPS 1500VA battery backup & surge protector with LCD interface.'),
    ('High-Speed HDMI 2.1 Cable 10ft', 'CB-HDMI-2.1', 200, 14.99, 'Ultra high-speed 48Gbps 8K HDMI cable with gold-plated connectors.'),
    ('Solid State Drive 1TB NVMe PCIe 4.0', 'SSD-1TB-NVME', 65, 89.99, 'Gen4 M.2 2280 internal SSD with read speeds up to 7300MB/s.'),
    ('Wireless Router Wi-Fi 6 Dual-Band', 'RT-AX3000-WIFI', 30, 129.00, 'Dual-band Wi-Fi 6 router delivering speeds up to 3000Mbps and extended range.');
END
GO

-- ==========================================
-- STORED PROCEDURES MIGRATION
-- ==========================================

-- 1. Get Inventory Items (with optional filter)
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetInventoryItems')
    DROP PROCEDURE sp_GetInventoryItems;
GO

CREATE PROCEDURE sp_GetInventoryItems
    @search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @search IS NULL OR @search = ''
    BEGIN
        SELECT * FROM Inventory ORDER BY updatedAt DESC;
    END
    ELSE
    BEGIN
        SELECT * FROM Inventory
        WHERE name LIKE '%' + @search + '%'
           OR sku LIKE '%' + @search + '%'
           OR description LIKE '%' + @search + '%'
        ORDER BY updatedAt DESC;
    END
END
GO

-- 2. Insert Inventory Item
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_InsertInventoryItem')
    DROP PROCEDURE sp_InsertInventoryItem;
GO

CREATE PROCEDURE sp_InsertInventoryItem
    @name NVARCHAR(150),
    @sku NVARCHAR(50),
    @quantity INT,
    @price DECIMAL(10,2),
    @description NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check SKU uniqueness
    IF EXISTS (SELECT 1 FROM Inventory WHERE sku = @sku)
    BEGIN
        RAISERROR('SKU code already exists in inventory.', 16, 1);
        RETURN;
    END

    INSERT INTO Inventory (name, sku, quantity, price, description)
    OUTPUT inserted.*
    VALUES (@name, @sku, @quantity, @price, @description);
END
GO

-- 3. Update Inventory Item
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateInventoryItem')
    DROP PROCEDURE sp_UpdateInventoryItem;
GO

CREATE PROCEDURE sp_UpdateInventoryItem
    @id INT,
    @name NVARCHAR(150),
    @sku NVARCHAR(50),
    @quantity INT,
    @price DECIMAL(10,2),
    @description NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check SKU uniqueness excluding current item
    IF EXISTS (SELECT 1 FROM Inventory WHERE sku = @sku AND id <> @id)
    BEGIN
        RAISERROR('SKU code is already used by another item.', 16, 1);
        RETURN;
    END

    UPDATE Inventory
    SET name = @name,
        sku = @sku,
        quantity = @quantity,
        price = @price,
        description = @description,
        updatedAt = GETDATE()
    OUTPUT inserted.*
    WHERE id = @id;
END
GO

-- 4. Delete Inventory Item
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_DeleteInventoryItem')
    DROP PROCEDURE sp_DeleteInventoryItem;
GO

CREATE PROCEDURE sp_DeleteInventoryItem
    @id INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Inventory
    OUTPUT deleted.id
    WHERE id = @id;
END
GO
