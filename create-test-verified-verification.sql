-- Create a test verified verification request
INSERT INTO inventory_verification_requests (
    stock_issuance_id,
    item_master_id,
    item_nomenclature,
    requested_by_user_id,
    requested_by_name,
    requested_quantity,
    verification_status,
    verified_by_user_id,
    verified_by_name,
    verified_at,
    physical_count,
    available_quantity,
    verification_notes,
    wing_id,
    wing_name,
    requested_at
)
VALUES (
    NEWID(), -- stock_issuance_id
    '42403953-852F-464F-8374-363716252E73', -- item_master_id (Android Phone from item_masters)
    'Android Phone', -- item_nomenclature
    '4dae06b7-17cd-480b-81eb-da9c76ad5728', -- requested_by_user_id (Muhammad Ehtesham Siddiqui)
    'Muhammad Ehtesham Siddiqui', -- requested_by_name
    10, -- requested_quantity
    'verified_available', -- verification_status
    '0121671f-76a9-4770-a477-e86c840baf0d', -- verified_by_user_id (existing AspNetUsers.Id)
    'Test Wing Supervisor', -- verified_by_name
    GETDATE(), -- verified_at
    8, -- physical_count
    8, -- available_quantity
    'Item is in good condition and ready for issuance', -- verification_notes
    19, -- wing_id (PMU)
    'PMU', -- wing_name
    DATEADD(HOUR, -1, GETDATE()) -- requested_at (1 hour ago)
);

-- Verify the insert
SELECT 
    id,
    item_nomenclature,
    verification_status,
    requested_by_user_id,
    verified_by_name,
    verified_at,
    physical_count,
    verification_notes
FROM inventory_verification_requests
WHERE requested_by_user_id = '4dae06b7-17cd-480b-81eb-da9c76ad5728'
ORDER BY verified_at DESC;

PRINT 'Test verified verification request created!';
PRINT 'Now check /api/my-notifications endpoint - it should show this as a notification';
