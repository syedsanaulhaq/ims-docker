-- ============================================================================
-- Production Fix: Missing Views + System Settings
-- Run this after PRODUCTION-DELTA-DEPLOY.sql if branch/user features don't work
-- Safe to re-run. Uses CREATE OR ALTER VIEW to preserve dependencies.
-- ============================================================================
USE [InventoryManagementDB];
GO
SET NOCOUNT ON;
GO

-- ============================================================================
-- 1. SEED SYSTEM SETTINGS
-- ============================================================================
PRINT 'Seeding system_settings...';
GO

-- go_live_date: used for delivery date validation
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'go_live_date')
BEGIN
  INSERT INTO system_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
  VALUES (
    NEWID(),
    'go_live_date',
    '2026-03-09',
    'date',
    'The date when opening balance was entered. All tender deliveries must be on or after this date.',
    GETDATE(),
    GETDATE()
  );
  PRINT 'Added go_live_date setting.';
END
ELSE
BEGIN
  PRINT 'go_live_date setting already exists.';
END

-- opening_balance_completed: controls admin landing page
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'opening_balance_completed')
BEGIN
  DECLARE @hasOpeningBalance BIT = 0;
  IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'opening_balance_entries')
  BEGIN
    SELECT @hasOpeningBalance = CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM opening_balance_entries;
  END

  INSERT INTO system_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
  VALUES (
    NEWID(),
    'opening_balance_completed',
    CASE WHEN @hasOpeningBalance = 1 THEN 'true' ELSE 'false' END,
    'boolean',
    'Whether opening balance entry has been completed',
    GETDATE(),
    GETDATE()
  );
  PRINT 'Added opening_balance_completed setting.';
END
ELSE
BEGIN
  PRINT 'opening_balance_completed setting already exists.';
END
GO

-- ============================================================================
-- 2. vw_User_with_designation
-- ============================================================================
PRINT 'Creating/updating vw_User_with_designation...';
GO

CREATE OR ALTER VIEW dbo.vw_User_with_designation AS
SELECT dbo.AspNetUsers.*, dbo.tblUserDesignations.strDesignation
FROM dbo.AspNetUsers
INNER JOIN dbo.tblUserDesignations ON dbo.AspNetUsers.intDesignationID = dbo.tblUserDesignations.intDesignationID;
GO

-- ============================================================================
-- 3. vw_employee_branch (critical for branch features)
-- ============================================================================
PRINT 'Creating/updating vw_employee_branch...';
GO

CREATE OR ALTER VIEW dbo.vw_employee_branch
AS
SELECT dbo.REG_APP.DEC_ID AS BranchID,
       dbo.DEC_MST.DECName AS BranchName,
       dbo.DEC_MST.DECAcronym AS BranchAcron,
       dbo.REG_APP.DEPARTMENT_DESIGNATION_ID AS Designation,
       dbo.AspNetUsers.Id,
       dbo.AspNetUsers.FullName,
       dbo.AspNetUsers.FatherOrHusbandName,
       dbo.AspNetUsers.CNIC,
       dbo.AspNetUsers.Email,
       dbo.AspNetUsers.PhoneNumber,
       dbo.AspNetUsers.ISACT,
       dbo.AspNetUsers.UserName,
       dbo.DEC_MST.WingID,
       dbo.WingsInformation.Name AS WingName
FROM dbo.WingsInformation
RIGHT OUTER JOIN dbo.AspNetUsers ON dbo.WingsInformation.Id = dbo.AspNetUsers.intWingID
LEFT OUTER JOIN dbo.DEC_MST
INNER JOIN dbo.REG_APP ON dbo.DEC_MST.intAutoID = dbo.REG_APP.DEC_ID
ON dbo.AspNetUsers.CNIC = dbo.REG_APP.CNIC
WHERE (dbo.AspNetUsers.ISACT = 1);
GO

-- ============================================================================
-- 4. vw_my_issuance_requests
-- ============================================================================
PRINT 'Creating/updating vw_my_issuance_requests...';
GO

CREATE OR ALTER VIEW dbo.vw_my_issuance_requests AS
SELECT
    sir.id,
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
    sir.requester_wing_id,
    sir.submitted_at,
    sir.approval_status,
    sir.supervisor_id,
    sup.FullName as supervisor_name,
    sir.admin_id,
    adm.FullName as admin_name,
    sir.admin_reviewed_at,
    sir.admin_action,
    sir.admin_comments,
    sir.forwarding_reason,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id) as total_items,
    (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = sir.id AND UPPER(ISNULL(item_status, '')) = 'APPROVED') as approved_items,
    ISNULL((SELECT SUM(requested_quantity) FROM stock_issuance_items WHERE request_id = sir.id), 0) as requested_quantity
FROM stock_issuance_requests sir
LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN AspNetUsers sup ON sir.supervisor_id = sup.Id
LEFT JOIN AspNetUsers adm ON sir.admin_id = adm.Id;
GO

-- ============================================================================
-- 5. vw_pending_supervisor_approvals
-- ============================================================================
PRINT 'Creating/updating vw_pending_supervisor_approvals...';
GO

CREATE OR ALTER VIEW dbo.vw_pending_supervisor_approvals AS
SELECT sir.id AS request_id,
       sir.request_number,
       sir.request_type,
       sir.requester_wing_id,
       sir.requester_user_id,
       u.FullName AS requester_name,
       u.Email AS requester_email,
       sir.purpose,
       sir.urgency_level,
       sir.is_urgent,
       sir.approval_status,
       sir.submitted_at,
       DATEDIFF(HOUR, sir.submitted_at, GETDATE()) AS pending_hours,
       COUNT(sii.id) AS total_items,
       STRING_AGG(sii.nomenclature, ', ') AS item_list
FROM dbo.stock_issuance_requests sir
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN dbo.stock_issuance_items sii ON sir.id = sii.request_id
WHERE sir.approval_status = 'Pending Supervisor Review'
GROUP BY sir.id, sir.request_number, sir.request_type, sir.requester_wing_id, sir.requester_user_id,
         u.FullName, u.Email, sir.purpose, sir.urgency_level, sir.is_urgent, sir.approval_status, sir.submitted_at;
GO

-- ============================================================================
-- 6. vw_pending_admin_approvals
-- ============================================================================
PRINT 'Creating/updating vw_pending_admin_approvals...';
GO

CREATE OR ALTER VIEW dbo.vw_pending_admin_approvals AS
SELECT sir.id AS request_id,
       sir.request_number,
       sir.request_type,
       sir.requester_wing_id,
       sir.requester_user_id,
       u.FullName AS requester_name,
       u.Email AS requester_email,
       sir.purpose,
       sir.urgency_level,
       sir.is_urgent,
       sir.approval_status,
       sir.submitted_at,
       DATEDIFF(HOUR, sir.submitted_at, GETDATE()) AS pending_hours,
       COUNT(sii.id) AS total_items,
       STRING_AGG(sii.nomenclature, ', ') AS item_list
FROM dbo.stock_issuance_requests sir
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id
LEFT JOIN dbo.stock_issuance_items sii ON sir.id = sii.request_id
WHERE sir.approval_status = 'Pending Admin Review'
GROUP BY sir.id, sir.request_number, sir.request_type, sir.requester_wing_id, sir.requester_user_id,
         u.FullName, u.Email, sir.purpose, sir.urgency_level, sir.is_urgent, sir.approval_status, sir.submitted_at;
GO

-- ============================================================================
-- 7. vw_delivery_summary
-- ============================================================================
PRINT 'Creating/updating vw_delivery_summary...';
GO

CREATE OR ALTER VIEW dbo.vw_delivery_summary AS
SELECT
    d.id AS delivery_id,
    d.delivery_number,
    d.delivery_date,
    d.delivery_personnel,
    d.delivery_chalan,
    d.po_id,
    d.po_number,
    d.delivery_status,
    po.po_number AS po_ref,
    v.vendor_name,
    COUNT(di.id) AS total_items,
    SUM(di.delivery_qty) AS total_quantity,
    SUM(di.delivery_qty * poi.unit_price) AS total_value,
    SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END) AS good_quantity,
    SUM(CASE WHEN di.quality_status = 'damaged' THEN di.delivery_qty ELSE 0 END) AS damaged_quantity,
    SUM(CASE WHEN di.quality_status = 'rejected' THEN di.delivery_qty ELSE 0 END) AS rejected_quantity,
    d.received_by,
    d.receiving_date,
    d.created_at
FROM deliveries d
LEFT JOIN purchase_orders po ON d.po_id = po.id
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN delivery_items di ON d.id = di.delivery_id
LEFT JOIN purchase_order_items poi ON di.po_item_id = poi.id
GROUP BY d.id, d.delivery_number, d.delivery_date, d.delivery_personnel, d.delivery_chalan,
         d.po_id, d.po_number, d.delivery_status, po.po_number, v.vendor_name,
         d.received_by, d.receiving_date, d.created_at;
GO

-- ============================================================================
-- 8. vw_po_fulfillment_status
-- ============================================================================
PRINT 'Creating/updating vw_po_fulfillment_status...';
GO

CREATE OR ALTER VIEW dbo.vw_po_fulfillment_status AS
SELECT
    po.id AS po_id,
    po.po_number,
    po.po_date,
    po.status AS po_status,
    t.title AS tender_title,
    v.vendor_name,
    poi.id AS po_item_id,
    poi.item_master_id,
    im.nomenclature AS item_name,
    poi.quantity AS ordered_quantity,
    ISNULL(poi.received_quantity, 0) AS received_quantity,
    (poi.quantity - ISNULL(poi.received_quantity, 0)) AS pending_quantity,
    poi.unit_price,
    (poi.quantity * poi.unit_price) AS ordered_value,
    (ISNULL(poi.received_quantity, 0) * poi.unit_price) AS received_value,
    poi.delivery_status,
    CASE
        WHEN ISNULL(poi.received_quantity, 0) = 0 THEN 0
        ELSE CAST((ISNULL(poi.received_quantity, 0) * 100.0 / poi.quantity) AS DECIMAL(5,2))
    END AS fulfillment_percentage,
    po.created_at AS po_created_at
FROM purchase_orders po
INNER JOIN purchase_order_items poi ON po.id = poi.po_id
LEFT JOIN tenders t ON po.tender_id = t.id
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN item_masters im ON poi.item_master_id = im.id;
GO

-- ============================================================================
-- 9. View_Issuance_Status
-- ============================================================================
PRINT 'Creating/updating View_Issuance_Status...';
GO

CREATE OR ALTER VIEW dbo.View_Issuance_Status AS
SELECT
    sir.id AS request_id,
    COUNT(sii.id) AS total_items,
    SUM(CASE WHEN sii.item_status = 'Issued' THEN 1 ELSE 0 END) AS issued_items,
    SUM(CASE WHEN sii.item_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_items,
    SUM(CASE WHEN sii.item_status NOT IN ('Issued', 'Rejected') THEN 1 ELSE 0 END) AS pending_items,
    CAST(
        SUM(CASE WHEN sii.item_status = 'Issued' THEN 1 ELSE 0 END) * 100.0 /
        NULLIF(COUNT(sii.id), 0)
        AS INT
    ) AS issuance_rate,
    sir.updated_at AS last_updated,
    sir.finalized_at AS finalized_at
FROM stock_issuance_requests sir
LEFT JOIN stock_issuance_items sii ON sir.id = sii.request_id
GROUP BY sir.id, sir.updated_at, sir.finalized_at;
GO

-- ============================================================================
-- 10. View_IssuanceApprovalStatus
-- ============================================================================
PRINT 'Creating/updating View_IssuanceApprovalStatus...';
GO

CREATE OR ALTER VIEW dbo.View_IssuanceApprovalStatus AS
SELECT
    si.Id as IssuanceId,
    si.IssuanceNumber,
    si.RequestedBy,
    ru.FullName as RequestedByName,
    ru.Email as RequestedByEmail,
    si.ApprovalStatus,
    si.CurrentApproverId,
    ca.FullName as CurrentApproverName,
    ca.Email as CurrentApproverEmail,
    si.ApprovalLevel,
    si.FinalApprovedBy,
    fa.FullName as FinalApprovedByName,
    si.FinalApprovalDate,
    si.CreatedDate as RequestDate,

    -- Active forward information
    af.ForwardedFromUserId,
    ff.FullName as ForwardedFromName,
    af.ForwardReason,
    af.ForwardDate,
    af.Priority,
    af.DueDate,

    -- Latest action
    lah.ActionType as LatestAction,
    lah.ActionDate as LatestActionDate,
    lah.Comments as LatestComments,
    la.FullName as LatestActionByName

FROM StockIssuances si
LEFT JOIN AspNetUsers ru ON si.RequestedBy = ru.Id
LEFT JOIN AspNetUsers ca ON si.CurrentApproverId = ca.Id
LEFT JOIN AspNetUsers fa ON si.FinalApprovedBy = fa.Id

-- Join with active forwards
LEFT JOIN IssuanceApprovalForwards af ON si.Id = af.IssuanceId AND af.IsActive = 1
LEFT JOIN AspNetUsers ff ON af.ForwardedFromUserId = ff.Id

-- Join with latest approval history using CTE
LEFT JOIN (
    SELECT IssuanceId, UserId, ActionType, ActionDate, Comments,
           ROW_NUMBER() OVER (PARTITION BY IssuanceId ORDER BY ActionDate DESC) as rn
    FROM IssuanceApprovalHistory
) lah ON si.Id = lah.IssuanceId AND lah.rn = 1
LEFT JOIN AspNetUsers la ON lah.UserId = la.Id;
GO

-- ============================================================================
-- 11. View_Pending_Inventory_Verifications
-- ============================================================================
PRINT 'Creating/updating View_Pending_Inventory_Verifications...';
GO

CREATE OR ALTER VIEW dbo.View_Pending_Inventory_Verifications AS
SELECT
    ivr.id,
    ivr.stock_issuance_id,
    ivr.item_master_id,
    ISNULL(ivr.item_nomenclature, ISNULL(im.nomenclature, 'Unknown Item')) AS item_nomenclature,
    im.nomenclature AS item_name,
    im.item_code,
    ivr.requested_quantity,
    ivr.requested_by_name,
    ivr.requested_by_user_id,
    ivr.requested_at,
    ivr.verification_status,
    CASE
        WHEN ivr.verification_status LIKE 'verified%' THEN 'verified'
        ELSE 'pending'
    END AS status,
    ivr.verified_by_user_id,
    ivr.verified_by_name,
    ivr.verified_at,
    ivr.physical_count,
    ivr.available_quantity,
    ivr.verification_notes,
    ivr.wing_id,
    ivr.wing_name,
    w.Name AS wing_full_name,
    sir.purpose AS request_purpose,
    sir.request_type,
    u.FullName AS requester_name,
    ivr.created_at,
    ivr.updated_at
FROM dbo.inventory_verification_requests ivr
LEFT JOIN dbo.item_masters im ON ivr.item_master_id = im.id
LEFT JOIN dbo.WingsInformation w ON ivr.wing_id = w.Id
LEFT JOIN dbo.stock_issuance_requests sir ON ivr.stock_issuance_id = sir.id
LEFT JOIN dbo.AspNetUsers u ON sir.requester_user_id = u.Id;
GO

-- ============================================================================
-- 12. View_stock_transactions_clean
-- ============================================================================
PRINT 'Creating/updating View_stock_transactions_clean...';
GO

CREATE OR ALTER VIEW dbo.View_stock_transactions_clean AS
SELECT
    stc.id,
    stc.tender_id,
    t.reference_number,
    t.title,
    t.description,
    t.estimated_value,
    t.publish_date,
    t.publication_date,
    t.submission_date,
    t.submission_deadline,
    t.opening_date,
    t.document_path,
    t.created_at,
    t.updated_at,
    t.created_by,
    t.advertisement_date,
    t.procedure_adopted,
    t.procurement_method,
    t.publication_daily,
    t.contract_file_path,
    t.loi_file_path,
    t.noting_file_path,
    t.po_file_path,
    t.rfp_file_path,
    t.tender_number,
    t.tender_type,
    t.office_ids,
    t.wing_ids,
    t.dec_ids,
    t.tender_spot_type,
    t.vendor_id,
    t.tender_status,
    t.individual_total,
    t.actual_price_total,
    t.is_finalized,
    t.finalized_at,
    t.finalized_by,
    dbo.GetOfficeNames(t.office_ids) AS office_names,
    dbo.GetWingNames(t.wing_ids) AS wing_names,
    dbo.GetDecNames(t.dec_ids) AS dec_names,
    stc.item_master_id,
    im.nomenclature,
    stc.estimated_unit_price,
    stc.actual_unit_price,
    stc.total_quantity_received,
    stc.type,
    stc.remarks,
    stc.pricing_confirmed,
    stc.is_deleted,
    im.category_id,
    im.sub_category_id,
    sc.sub_category_name,
    c.category_name,
    v.vendor_name,
    v.vendor_code
FROM stock_transactions_clean stc
LEFT OUTER JOIN tenders t ON stc.tender_id = t.id
LEFT OUTER JOIN item_masters im ON stc.item_master_id = im.id
LEFT OUTER JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT OUTER JOIN categories c ON im.category_id = c.id
LEFT OUTER JOIN vendors v ON t.vendor_id = v.id;
GO

-- ============================================================================
-- 13. View_tenders
-- ============================================================================
PRINT 'Creating/updating View_tenders...';
GO

CREATE OR ALTER VIEW dbo.View_tenders
AS
SELECT dbo.tenders.id, dbo.tenders.title, dbo.tenders.reference_number, dbo.tenders.description, dbo.tenders.estimated_value, dbo.tenders.publish_date, dbo.tenders.publication_date, dbo.tenders.submission_date,
                  dbo.tenders.submission_deadline, dbo.tenders.opening_date, dbo.tenders.document_path, dbo.tenders.created_at, dbo.tenders.updated_at, dbo.tenders.created_by, dbo.tenders.advertisement_date, dbo.tenders.procedure_adopted,
                  dbo.tenders.procurement_method, dbo.tenders.publication_daily, dbo.tenders.contract_file_path, dbo.tenders.loi_file_path, dbo.tenders.noting_file_path, dbo.tenders.po_file_path, dbo.tenders.rfp_file_path, dbo.tenders.tender_number,
                  dbo.tenders.tender_type, dbo.tenders.office_ids, dbo.tenders.wing_ids, dbo.tenders.dec_ids, dbo.tenders.tender_spot_type, dbo.tenders.vendor_id, dbo.tenders.tender_status, dbo.tenders.individual_total, dbo.tenders.actual_price_total,
                  dbo.tenders.is_finalized, dbo.tenders.finalized_at, dbo.tenders.finalized_by, dbo.GetOfficeNames(dbo.tenders.office_ids) AS office_names, dbo.GetWingNames(dbo.tenders.wing_ids) AS wing_names,
                  dbo.GetDecNames(dbo.tenders.dec_ids) AS dec_names, dbo.tender_items.item_master_id, dbo.tender_items.nomenclature, dbo.tender_items.quantity, dbo.tender_items.estimated_unit_price, dbo.tender_items.total_amount,
                  dbo.tender_items.specifications, dbo.tender_items.remarks, dbo.item_masters.category_id, dbo.item_masters.sub_category_id, dbo.vendors.vendor_name, dbo.vendors.vendor_code
FROM     dbo.vendors RIGHT OUTER JOIN
                  dbo.tenders ON dbo.vendors.id = dbo.tenders.vendor_id LEFT OUTER JOIN
                  dbo.item_masters RIGHT OUTER JOIN
                  dbo.tender_items ON dbo.item_masters.id = dbo.tender_items.item_master_id ON dbo.tenders.id = dbo.tender_items.tender_id;
GO

-- ============================================================================
-- 14. vw_item_masters_with_categories
-- ============================================================================
PRINT 'Creating/updating vw_item_masters_with_categories...';
GO

CREATE OR ALTER VIEW dbo.vw_item_masters_with_categories
AS
SELECT im.id, im.item_code, im.nomenclature, im.category_id, im.sub_category_id, im.unit, im.specifications, im.description, im.status, im.created_at, im.updated_at, im.minimum_stock_level, im.maximum_stock_level, im.reorder_point,
                  c.category_name, sc.sub_category_name, im.manufacturer
FROM     dbo.item_masters AS im LEFT OUTER JOIN
                  dbo.categories AS c ON im.category_id = c.id LEFT OUTER JOIN
                  dbo.sub_categories AS sc ON im.sub_category_id = sc.id
WHERE  (im.status = N'Active');
GO

-- ============================================================================
-- 15. vw_ims_user_permissions
-- ============================================================================
PRINT 'Creating/updating vw_ims_user_permissions...';
GO

CREATE OR ALTER VIEW dbo.vw_ims_user_permissions AS
SELECT DISTINCT
    ur.user_id,
    u.FullName as user_name,
    p.permission_key,
    p.module_name,
    p.action_name,
    p.description,
    r.role_name,
    ur.scope_type,
    ur.scope_wing_id
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id
INNER JOIN ims_role_permissions rp ON r.id = rp.role_id
INNER JOIN ims_permissions p ON rp.permission_id = p.id
WHERE ur.is_active = 1
  AND r.is_active = 1
  AND p.is_active = 1;
GO

-- ============================================================================
-- 16. vw_ims_user_roles_detail
-- ============================================================================
PRINT 'Creating/updating vw_ims_user_roles_detail...';
GO

CREATE OR ALTER VIEW dbo.vw_ims_user_roles_detail AS
SELECT
    ur.id as assignment_id,
    ur.user_id,
    u.FullName as user_name,
    u.Email as user_email,
    r.id as role_id,
    r.role_name,
    r.display_name as role_display_name,
    ur.scope_type,
    ur.scope_office_id,
    ur.scope_wing_id,
    ur.scope_branch_id,
    ur.assigned_by,
    ur.assigned_at,
    ur.is_active,
    ur.notes
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id;
GO

SET NOCOUNT OFF;
PRINT 'All views and settings created/updated.';
GO
