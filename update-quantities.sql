-- Update some records to have realistic quantities
UPDATE stock_transactions_clean 
SET total_quantity_received = CASE 
    WHEN item_master_id = '5c31c375-5c6b-4811-afb3-98c6021ff939' THEN 100 -- A4 Paper
    WHEN item_master_id = 'cac6cc3a-fcc3-45cf-93cd-943ebc68e0f6' THEN 7   -- Lamp Scanners
    WHEN item_master_id = '86bde58b-38d8-4abb-beaa-5bc9d44e4a11' THEN 3   -- MacBook
    WHEN item_master_id = 'c7037b95-d660-4683-9ca0-5b2adeb36d8a' THEN 2   -- Web Application Firewall
    WHEN item_master_id = 'e58ecb34-55fa-4593-b14c-00d6616859b2' THEN 5   -- Backup Solution
    WHEN item_master_id = '4cf00b7f-2543-4304-ae45-9266aff5c510' THEN 20  -- Laptops
    WHEN item_master_id = '16593a7a-d668-4523-9799-6b41078f43d8' THEN 2   -- Network Printer
    WHEN item_master_id = '53962750-624c-4d7a-98f1-96016921b561' THEN 2   -- SAN Switches
    WHEN item_master_id = 'ba99f78f-010a-48ff-8897-c6f0f0a0790e' THEN 2   -- UPS
    WHEN item_master_id = '8b959b1c-57f9-4028-b91f-89d45724629d' THEN 4   -- Rack Servers
    WHEN item_master_id = 'e44d386a-4072-4fdd-907b-30c2c6e770b3' THEN 3   -- SAN Storage
    ELSE total_quantity_received 
END
WHERE is_deleted = 0 OR is_deleted IS NULL;

-- Check the update
SELECT COUNT(*) as updated_records FROM stock_transactions_clean WHERE total_quantity_received > 0;
