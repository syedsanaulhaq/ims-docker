-- Quick check: Is the permission actually in the database?
SELECT id, permission_key, module_name, action_name, is_active
FROM ims_permissions
WHERE permission_key LIKE '%store_keeper%' OR permission_key LIKE '%inventory%'
ORDER BY permission_key

-- And check if it's assigned to the role
SELECT COUNT(*) as permissionCount
FROM ims_role_permissions rp
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE p.permission_key = 'inventory.manage_store_keeper'
