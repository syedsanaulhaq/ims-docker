-- ============================================================================
-- Export IMS Roles and User Role Assignments
-- ============================================================================
-- Run this on your LOCAL database to get the complete roles structure
-- Then import the data to the PRODUCTION database

-- ============================================================================
-- 1. GET ALL ROLES
-- ============================================================================
SELECT 
  id,
  role_name,
  display_name,
  description,
  is_active,
  created_at,
  updated_at
FROM ims_roles
ORDER BY role_name;

-- ============================================================================
-- 2. GET ALL USER-ROLE ASSIGNMENTS WITH ROLE DETAILS
-- ============================================================================
SELECT 
  iur.id,
  iur.user_id,
  iur.role_id,
  ir.role_name,
  ir.display_name,
  iur.scope_type,
  iur.scope_value,
  iur.is_active,
  iur.assigned_at,
  au.FullName,
  au.UserName,
  au.Email
FROM ims_user_roles iur
JOIN ims_roles ir ON iur.role_id = ir.id
LEFT JOIN AspNetUsers au ON iur.user_id = au.Id
ORDER BY au.UserName, ir.role_name;

-- ============================================================================
-- 3. GET USER ROLES FOR SPECIFIC USER (Syed Sana ul Haq Fazli)
-- ============================================================================
SELECT 
  iur.id,
  iur.user_id,
  iur.role_id,
  ir.role_name,
  ir.display_name,
  iur.scope_type,
  iur.is_active,
  iur.assigned_at
FROM ims_user_roles iur
JOIN ims_roles ir ON iur.role_id = ir.id
WHERE iur.user_id = '869dd81b-a782-494d-b8c2-695369b5ebb6'
  AND iur.is_active = 1
ORDER BY ir.display_name;

-- ============================================================================
-- 4. COUNT USERS BY ROLE
-- ============================================================================
SELECT 
  ir.id,
  ir.role_name,
  ir.display_name,
  COUNT(iur.user_id) as total_users
FROM ims_roles ir
LEFT JOIN ims_user_roles iur ON ir.id = iur.role_id AND iur.is_active = 1
GROUP BY ir.id, ir.role_name, ir.display_name
ORDER BY total_users DESC;

-- ============================================================================
-- 5. INSERT STATEMENTS (Copy the data from local and generate INSERT statements)
-- ============================================================================
-- First, get the role IDs you need to assign to the SSO user in production
-- Then use these INSERT statements to assign them

-- Example: If you want to add roles to user 869dd81b-a782-494d-b8c2-695369b5ebb6
-- Get the role IDs first from query above, then uncomment and modify:

/*
INSERT INTO ims_user_roles (user_id, role_id, scope_type, is_active, assigned_at)
VALUES 
  ('869dd81b-a782-494d-b8c2-695369b5ebb6', '<ROLE_ID_1>', 'GLOBAL', 1, GETDATE()),
  ('869dd81b-a782-494d-b8c2-695369b5ebb6', '<ROLE_ID_2>', 'GLOBAL', 1, GETDATE()),
  ('869dd81b-a782-494d-b8c2-695369b5ebb6', '<ROLE_ID_3>', 'GLOBAL', 1, GETDATE());
*/
