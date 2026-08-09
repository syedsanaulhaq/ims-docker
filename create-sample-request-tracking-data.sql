-- Sample Request Tracking Data Generation
-- This script creates sample requests for testing the request tracking functionality

-- First, check if the current user has any existing requests
SELECT COUNT(*) as existing_requests 
FROM request_approvals 
WHERE requester_user_id = '1730115698727';

-- Insert sample requests for the current user (Syed Sana ul Haq Fazli)
-- Request 1: Pending Stock Issuance Request
INSERT INTO request_approvals (
    request_id,
    request_type,
    title,
    description,
    requested_date,
    submitted_date,
    requester_user_id,
    assigned_to_user_id,
    office_name,
    wing_name,
    priority,
    current_approver,
    approval_action
) VALUES (
    'REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-001',
    'stock_issuance',
    'Office Supplies Request',
    'Monthly office supplies including stationery and computer accessories for the December operations.',
    DATEADD(day, 7, GETDATE()),
    GETDATE(),
    '1730115698727',
    'admin-user-id',
    'Head Office',
    'Information Technology Wing',
    'Medium',
    1,
    NULL  -- Still pending
);

-- Request 2: Approved Equipment Request
INSERT INTO request_approvals (
    request_id,
    request_type,
    title,
    description,
    requested_date,
    submitted_date,
    requester_user_id,
    assigned_to_user_id,
    office_name,
    wing_name,
    priority,
    current_approver,
    approval_action
) VALUES (
    'REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-002',
    'stock_issuance',
    'IT Equipment Procurement',
    'Laptop computers and networking equipment for the new project team setup.',
    DATEADD(day, 14, GETDATE()),
    DATEADD(day, -3, GETDATE()),
    '1730115698727',
    'admin-user-id',
    'Head Office',
    'Information Technology Wing',
    'High',
    1,
    'approved'
);

-- Request 3: Rejected Maintenance Request
INSERT INTO request_approvals (
    request_id,
    request_type,
    title,
    description,
    requested_date,
    submitted_date,
    requester_user_id,
    assigned_to_user_id,
    office_name,
    wing_name,
    priority,
    current_approver,
    approval_action
) VALUES (
    'REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-003',
    'maintenance',
    'Server Room Maintenance',
    'Monthly maintenance and cleaning of server room equipment and infrastructure.',
    DATEADD(day, -2, GETDATE()),
    DATEADD(day, -5, GETDATE()),
    '1730115698727',
    'admin-user-id',
    'Head Office',
    'Information Technology Wing',
    'Low',
    1,
    'rejected'
);

-- Request 4: Finalized Procurement Request
INSERT INTO request_approvals (
    request_id,
    request_type,
    title,
    description,
    requested_date,
    submitted_date,
    requester_user_id,
    assigned_to_user_id,
    office_name,
    wing_name,
    priority,
    current_approver,
    approval_action
) VALUES (
    'REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004',
    'procurement',
    'Security Equipment Purchase',
    'CCTV cameras and access control systems for office security enhancement.',
    DATEADD(day, -10, GETDATE()),
    DATEADD(day, -15, GETDATE()),
    '1730115698727',
    'admin-user-id',
    'Head Office',
    'Information Technology Wing',
    'Urgent',
    1,
    'finalized'
);

-- Now create sample items for these requests
-- Create request_items table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'request_items')
BEGIN
    CREATE TABLE request_items (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        request_id NVARCHAR(100) NOT NULL,
        item_id NVARCHAR(100) NULL,
        item_name NVARCHAR(255) NOT NULL,
        requested_quantity INT NOT NULL,
        approved_quantity INT NULL,
        unit NVARCHAR(50) DEFAULT 'units',
        specifications NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
END;

-- Insert sample items for Request 1 (Office Supplies)
INSERT INTO request_items (request_id, item_name, requested_quantity, approved_quantity, unit, specifications)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-001', 'A4 Paper Sheets', 50, NULL, 'packs', '80gsm white paper'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-001', 'Blue Ballpoint Pens', 100, NULL, 'pieces', 'Standard blue ink'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-001', 'Stapler', 5, NULL, 'pieces', 'Heavy duty office stapler'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-001', 'USB Flash Drives', 20, NULL, 'pieces', '32GB USB 3.0');

-- Insert sample items for Request 2 (IT Equipment) - Approved
INSERT INTO request_items (request_id, item_name, requested_quantity, approved_quantity, unit, specifications)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-002', 'Laptop Computer', 5, 3, 'pieces', 'Intel i5, 8GB RAM, 256GB SSD'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-002', 'Network Switch', 2, 2, 'pieces', '24-port Gigabit Ethernet'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-002', 'Ethernet Cables', 50, 50, 'pieces', 'Cat6 2-meter cables');

-- Insert sample items for Request 3 (Maintenance) - Rejected
INSERT INTO request_items (request_id, item_name, requested_quantity, approved_quantity, unit, specifications)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-003', 'Cleaning Supplies', 1, 0, 'set', 'Server room cleaning kit'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-003', 'Air Filter', 4, 0, 'pieces', 'HEPA filters for server room AC');

-- Insert sample items for Request 4 (Security Equipment) - Finalized
INSERT INTO request_items (request_id, item_name, requested_quantity, approved_quantity, unit, specifications)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004', 'CCTV Camera', 12, 10, 'pieces', '4K IP cameras with night vision'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004', 'Access Control Panel', 3, 3, 'pieces', 'Biometric access control system'),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004', 'Network Video Recorder', 2, 2, 'pieces', '16-channel NVR with 4TB storage');

-- Create approval history entries
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_history')
BEGIN
    CREATE TABLE approval_history (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        request_id NVARCHAR(100) NOT NULL,
        user_id NVARCHAR(450) NOT NULL,
        action NVARCHAR(50) NOT NULL,
        action_date DATETIME2 DEFAULT GETDATE(),
        comments NVARCHAR(MAX) NULL,
        approver_level INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
    );
END;

-- Add approval history for approved request
INSERT INTO approval_history (request_id, user_id, action, action_date, comments, approver_level)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-002', 'admin-user-id', 'assigned', DATEADD(day, -3, GETDATE()), 'Request assigned for review', 1),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-002', 'admin-user-id', 'approved', DATEADD(day, -2, GETDATE()), 'Approved with quantity adjustments due to budget constraints', 1);

-- Add approval history for rejected request
INSERT INTO approval_history (request_id, user_id, action, action_date, comments, approver_level)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-003', 'admin-user-id', 'assigned', DATEADD(day, -5, GETDATE()), 'Request assigned for review', 1),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-003', 'admin-user-id', 'rejected', DATEADD(day, -4, GETDATE()), 'Maintenance request rejected - not in current budget cycle', 1);

-- Add approval history for finalized request
INSERT INTO approval_history (request_id, user_id, action, action_date, comments, approver_level)
VALUES 
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004', 'admin-user-id', 'assigned', DATEADD(day, -15, GETDATE()), 'High priority security request assigned', 1),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004', 'admin-user-id', 'approved', DATEADD(day, -12, GETDATE()), 'Approved for security enhancement project', 1),
    ('REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-004', 'admin-user-id', 'finalized', DATEADD(day, -10, GETDATE()), 'All items procured and delivered successfully', 1);

-- Verify the created data
SELECT 'Requests Created' as DataType, COUNT(*) as Count
FROM request_approvals 
WHERE requester_user_id = '1730115698727'
UNION ALL
SELECT 'Items Created' as DataType, COUNT(*) as Count
FROM request_items 
WHERE request_id LIKE 'REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-%'
UNION ALL
SELECT 'History Entries' as DataType, COUNT(*) as Count
FROM approval_history 
WHERE request_id LIKE 'REQ-2024-' + FORMAT(GETDATE(), 'MMdd') + '-%';

PRINT 'Sample request tracking data has been created successfully!';