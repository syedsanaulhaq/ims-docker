-- =====================================================
-- FIX APPROVAL WORKFLOW WITH PROPER ROLE-BASED SYSTEM
-- Uses AspNetRoles and AspNetUserRoles tables
-- =====================================================

USE InventoryManagementDB;
GO

PRINT '🔧 Updating approval workflow to use AspNetUserRoles...';
GO

-- =====================================================
-- 1. Update approval history to store RoleId instead of role name
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'stock_issuance_approval_history' 
               AND COLUMN_NAME = 'actor_role_id')
BEGIN
    ALTER TABLE stock_issuance_approval_history
    ADD actor_role_id NVARCHAR(450) NULL;
    
    PRINT '✅ Added actor_role_id column to approval_history';
END
GO

-- =====================================================
-- 2. Create function to get user's primary role
-- =====================================================
IF OBJECT_ID('dbo.fn_GetUserPrimaryRole', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_GetUserPrimaryRole;
GO

CREATE FUNCTION dbo.fn_GetUserPrimaryRole(@userId NVARCHAR(450))
RETURNS NVARCHAR(256)
AS
BEGIN
    DECLARE @roleName NVARCHAR(256);
    
    -- Get the first role (users may have multiple roles)
    -- Priority: Administrator > DG > ADG > Others
    SELECT TOP 1 @roleName = r.Name
    FROM AspNetUserRoles ur
    INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
    WHERE ur.UserId = @userId
    ORDER BY 
        CASE 
            WHEN r.Name = 'Administrator' THEN 1
            WHEN r.Name LIKE 'DG%' THEN 2
            WHEN r.Name LIKE 'ADG%' THEN 3
            WHEN r.Name LIKE '%Admin%' THEN 4
            ELSE 5
        END;
    
    RETURN ISNULL(@roleName, 'Employee');
END;
GO

PRINT '✅ Created fn_GetUserPrimaryRole function';
GO

-- =====================================================
-- 3. Create function to check if user has admin/supervisor role
-- =====================================================
IF OBJECT_ID('dbo.fn_IsUserInRole', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_IsUserInRole;
GO

CREATE FUNCTION dbo.fn_IsUserInRole(
    @userId NVARCHAR(450),
    @rolePattern NVARCHAR(256)
)
RETURNS BIT
AS
BEGIN
    DECLARE @hasRole BIT = 0;
    
    IF EXISTS (
        SELECT 1
        FROM AspNetUserRoles ur
        INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
        WHERE ur.UserId = @userId
        AND (r.Name LIKE @rolePattern OR r.Name = @rolePattern)
    )
        SET @hasRole = 1;
    
    RETURN @hasRole;
END;
GO

PRINT '✅ Created fn_IsUserInRole function';
GO

-- =====================================================
-- 4. Create view to identify supervisors by wing
-- =====================================================
IF OBJECT_ID('dbo.vw_wing_supervisors', 'V') IS NOT NULL
    DROP VIEW dbo.vw_wing_supervisors;
GO

CREATE VIEW dbo.vw_wing_supervisors AS
SELECT 
    u.Id as user_id,
    u.FullName as supervisor_name,
    u.intWingID as wing_id,
    u.intOfficeID as office_id,
    u.Email,
    r.Name as role_name,
    r.Id as role_id
FROM AspNetUsers u
INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
WHERE 
    -- Users who can act as supervisors (have admin or managerial roles)
    (
        r.Name LIKE '%Admin%' OR 
        r.Name LIKE '%DG%' OR 
        r.Name LIKE '%ADG%' OR
        r.Name LIKE '%Manager%' OR
        r.Name LIKE '%Director%' OR
        r.Name LIKE '%HoD%'
    )
    AND u.intWingID IS NOT NULL
    AND u.intWingID > 0;
GO

PRINT '✅ Created vw_wing_supervisors view';
GO

-- =====================================================
-- 5. Create function to get supervisor for a wing
-- =====================================================
IF OBJECT_ID('dbo.fn_GetWingSupervisor', 'IF') IS NOT NULL
    DROP FUNCTION dbo.fn_GetWingSupervisor;
GO

CREATE FUNCTION dbo.fn_GetWingSupervisor(@wingId INT)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP 1
        user_id,
        supervisor_name,
        wing_id,
        office_id,
        Email,
        role_name
    FROM vw_wing_supervisors
    WHERE wing_id = @wingId
    ORDER BY 
        CASE 
            WHEN role_name LIKE '%HoD%' THEN 1
            WHEN role_name LIKE '%Manager%' THEN 2
            WHEN role_name LIKE '%Admin%' THEN 3
            WHEN role_name LIKE 'DG%' THEN 4
            ELSE 5
        END
);
GO

PRINT '✅ Created fn_GetWingSupervisor function';
GO

-- =====================================================
-- 6. Create view to identify system administrators
-- =====================================================
IF OBJECT_ID('dbo.vw_system_admins', 'V') IS NOT NULL
    DROP VIEW dbo.vw_system_admins;
GO

CREATE VIEW dbo.vw_system_admins AS
SELECT 
    u.Id as user_id,
    u.FullName as admin_name,
    u.intOfficeID as office_id,
    u.Email,
    r.Name as role_name,
    r.Id as role_id
FROM AspNetUsers u
INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
WHERE 
    r.Name IN ('Administrator', 'DS Admin', 'SAAdminHR') OR
    r.Name LIKE 'DG%' OR
    r.Name = 'ADG';
GO

PRINT '✅ Created vw_system_admins view';
GO

-- =====================================================
-- 7. Update pending supervisor approvals view
-- =====================================================
IF OBJECT_ID('dbo.vw_pending_supervisor_approvals', 'V') IS NOT NULL
    DROP VIEW dbo.vw_pending_supervisor_approvals;
GO

CREATE VIEW dbo.vw_pending_supervisor_approvals AS
SELECT 
    sir.id as request_id,
    sir.request_number,
    sir.request_type,
    sir.purpose,
    sir.urgency_level,
    sir.is_urgent,
    sir.is_returnable,
    sir.requester_user_id,
    u.FullName as requester_name,
    u.Email as requester_email,
    sir.requester_office_id,
    o.strOfficeName as requester_office_name,
    sir.requester_wing_id,
    w.strWingName as requester_wing_name,
    sir.submitted_at,
    DATEDIFF(HOUR, sir.submitted_at, GETDATE()) as pending_hours,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id) as total_items,
    dbo.fn_GetUserPrimaryRole(u.Id) as requester_role,
    -- Get wing supervisor info
    ws.supervisor_name,
    ws.user_id as supervisor_user_id,
    ws.role_name as supervisor_role
FROM stock_issuance_requests sir
LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN Offices o ON sir.requester_office_id = o.intOfficeID
LEFT JOIN Wings w ON sir.requester_wing_id = w.intWingID
OUTER APPLY dbo.fn_GetWingSupervisor(sir.requester_wing_id) ws
WHERE sir.approval_status = 'Pending Supervisor Review'
  AND sir.request_type = 'Individual'; -- Only individual requests go through supervisor
GO

PRINT '✅ Updated vw_pending_supervisor_approvals view';
GO

-- =====================================================
-- 8. Update pending admin approvals view
-- =====================================================
IF OBJECT_ID('dbo.vw_pending_admin_approvals', 'V') IS NOT NULL
    DROP VIEW dbo.vw_pending_admin_approvals;
GO

CREATE VIEW dbo.vw_pending_admin_approvals AS
SELECT 
    sir.id as request_id,
    sir.request_number,
    sir.request_type,
    sir.purpose,
    sir.urgency_level,
    sir.is_urgent,
    sir.forwarding_reason,
    sir.requester_user_id,
    u.FullName as requester_name,
    u.Email as requester_email,
    sir.requester_office_id,
    o.strOfficeName as requester_office_name,
    sir.requester_wing_id,
    w.strWingName as requester_wing_name,
    sir.supervisor_id,
    sup.FullName as supervisor_name,
    dbo.fn_GetUserPrimaryRole(sup.Id) as supervisor_role,
    sir.supervisor_reviewed_at as forwarded_at,
    sir.submitted_at,
    DATEDIFF(HOUR, sir.supervisor_reviewed_at, GETDATE()) as pending_hours,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id) as total_items
FROM stock_issuance_requests sir
LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN Offices o ON sir.requester_office_id = o.intOfficeID
LEFT JOIN Wings w ON sir.requester_wing_id = w.intWingID
WHERE sir.approval_status IN ('Forwarded to Admin', 'Pending Admin Review')
   OR (sir.approval_status = 'Pending Supervisor Review' AND sir.request_type = 'Organizational');
GO

PRINT '✅ Updated vw_pending_admin_approvals view';
GO

-- =====================================================
-- 9. Update my issuance requests view
-- =====================================================
IF OBJECT_ID('dbo.vw_my_issuance_requests', 'V') IS NOT NULL
    DROP VIEW dbo.vw_my_issuance_requests;
GO

CREATE VIEW dbo.vw_my_issuance_requests AS
SELECT 
    sir.id as request_id,
    sir.request_number,
    sir.request_type,
    sir.purpose,
    sir.urgency_level,
    sir.is_urgent,
    sir.approval_status,
    sir.requester_user_id,
    sir.submitted_at,
    sir.supervisor_id,
    sup.FullName as supervisor_name,
    dbo.fn_GetUserPrimaryRole(sup.Id) as supervisor_role,
    sir.supervisor_reviewed_at,
    sir.supervisor_action,
    sir.supervisor_comments,
    sir.admin_id,
    adm.FullName as admin_name,
    dbo.fn_GetUserPrimaryRole(adm.Id) as admin_role,
    sir.admin_reviewed_at,
    sir.admin_action,
    sir.admin_comments,
    sir.forwarding_reason,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id) as total_items,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id AND item_status = 'Approved') as approved_items
FROM stock_issuance_requests sir
LEFT JOIN AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN AspNetUsers adm ON sir.admin_id = adm.Id;
GO

PRINT '✅ Updated vw_my_issuance_requests view';
GO

-- =====================================================
-- 10. Create stored procedure to auto-assign supervisor
-- =====================================================
IF OBJECT_ID('dbo.sp_AssignSupervisorToRequest', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_AssignSupervisorToRequest;
GO

CREATE PROCEDURE dbo.sp_AssignSupervisorToRequest
    @requestId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @wingId INT;
    DECLARE @supervisorId NVARCHAR(450);
    
    -- Get the wing ID from the request
    SELECT @wingId = requester_wing_id
    FROM stock_issuance_requests
    WHERE id = @requestId;
    
    -- Get the supervisor for this wing
    SELECT @supervisorId = user_id
    FROM dbo.fn_GetWingSupervisor(@wingId);
    
    -- Update the request with supervisor info (optional - for notification purposes)
    IF @supervisorId IS NOT NULL
    BEGIN
        UPDATE stock_issuance_requests
        SET approval_status = 'Pending Supervisor Review'
        WHERE id = @requestId;
        
        PRINT '✅ Assigned supervisor ' + @supervisorId + ' to request';
    END
    ELSE
    BEGIN
        -- If no supervisor found, send directly to admin
        UPDATE stock_issuance_requests
        SET approval_status = 'Pending Admin Review'
        WHERE id = @requestId;
        
        PRINT '⚠️ No supervisor found for wing ' + CAST(@wingId AS NVARCHAR) + ', routing to admin';
    END
END;
GO

PRINT '✅ Created sp_AssignSupervisorToRequest procedure';
GO

-- =====================================================
-- 11. Sample data: Check existing roles
-- =====================================================
PRINT '';
PRINT '📊 Current Admin/Supervisor Roles in System:';
PRINT '═══════════════════════════════════════════════';
SELECT 
    r.Name as RoleName,
    COUNT(DISTINCT ur.UserId) as UserCount
FROM AspNetRoles r
LEFT JOIN AspNetUserRoles ur ON r.Id = ur.RoleId
WHERE r.Name LIKE '%Admin%' 
   OR r.Name LIKE '%DG%'
   OR r.Name LIKE '%ADG%'
   OR r.Name LIKE '%Manager%'
   OR r.Name LIKE '%HoD%'
   OR r.Name LIKE '%Director%'
GROUP BY r.Name
ORDER BY UserCount DESC, r.Name;
GO

PRINT '';
PRINT '📊 Wing Supervisors Available:';
PRINT '═══════════════════════════════════════════════';
SELECT 
    wing_id,
    supervisor_name,
    role_name,
    Email
FROM vw_wing_supervisors
ORDER BY wing_id;
GO

PRINT '';
PRINT '📊 System Administrators:';
PRINT '═══════════════════════════════════════════════';
SELECT 
    admin_name,
    role_name,
    Email
FROM vw_system_admins
ORDER BY role_name, admin_name;
GO

PRINT '';
PRINT '✅ Approval workflow updated to use AspNetUserRoles!';
PRINT '';
PRINT '📝 Key Changes:';
PRINT '   1. Roles now fetched from AspNetUserRoles table';
PRINT '   2. Supervisors identified by role + wing combination';
PRINT '   3. Admins identified by Administrator/DG/ADG roles';
PRINT '   4. Auto-assignment of supervisor based on requester wing';
PRINT '   5. Priority-based role resolution for users with multiple roles';
PRINT '';
