-- First check if item_masters is empty
IF NOT EXISTS (SELECT 1 FROM item_masters)
BEGIN
    PRINT 'item_masters table is empty. Creating sample data...'
    
    -- Insert some sample item masters for the existing item_master_ids
    INSERT INTO item_masters (id, nomenclature, specifications, unit, status, created_at, updated_at)
    VALUES 
    ('cac6cc3a-fcc3-45cf-93cd-943ebc68e0f6', 'Desktop Computer', 'High-performance desktop with Intel i7 processor', 'Each', 'Active', GETDATE(), GETDATE()),
    ('8b959b1c-57f9-4028-b91f-89d45724629d', 'Laptop Computer', 'Business laptop with 16GB RAM', 'Each', 'Active', GETDATE(), GETDATE()),
    ('e58ecb34-55fa-4593-b14c-00d6616859b2', 'Network Printer', 'Color laser printer with network connectivity', 'Each', 'Active', GETDATE(), GETDATE()),
    ('c7037b95-d660-4683-9ca0-5b2adeb36d8a', 'Server Unit', 'Rack-mount server with redundant power supply', 'Each', 'Active', GETDATE(), GETDATE()),
    ('e44d386a-4072-4fdd-907b-30c2c6e770b3', 'Network Switch', '24-port managed switch', 'Each', 'Active', GETDATE(), GETDATE()),
    ('16593a7a-d668-4523-9799-6b41078f43d8', 'Wireless Router', 'Enterprise-grade wireless router', 'Each', 'Active', GETDATE(), GETDATE()),
    ('ba99f78f-010a-48ff-8897-c6f0f0a0790e', 'Monitor', '27-inch LED monitor', 'Each', 'Active', GETDATE(), GETDATE()),
    ('86bde58b-38d8-4abb-beaa-5bc9d44e4a11', 'Keyboard', 'Wireless keyboard and mouse combo', 'Set', 'Active', GETDATE(), GETDATE()),
    ('4cf00b7f-2543-4304-ae45-9266aff5c510', 'Office Chair', 'Ergonomic office chair', 'Each', 'Active', GETDATE(), GETDATE()),
    ('53962750-624c-4d7a-98f1-96016921b561', 'Conference Table', 'Large conference table for 12 people', 'Each', 'Active', GETDATE(), GETDATE());
    
    PRINT 'Sample item masters created successfully.'
END
ELSE
BEGIN
    PRINT 'item_masters table already has data.'
    SELECT COUNT(*) as existing_count FROM item_masters;
END
