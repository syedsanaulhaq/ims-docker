-- Create comprehensive approval status view
USE InventoryManagementDB;
GO

-- Create a view for easy approval tracking
CREATE OR ALTER VIEW View_IssuanceApprovalStatus AS
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
    la.FullName as LatestActionByName,
    
    -- Office hierarchy information
    po.name as ProvinceName,
    dv.name as DivisionName,
    dt.name as DistrictName,
    of.name as OfficeName,
    wg.name as WingName,
    br.name as BranchName,
    ds.name as DesignationName

FROM StockIssuances si
LEFT JOIN AspNetUsers ru ON si.RequestedBy = ru.Id
LEFT JOIN AspNetUsers ca ON si.CurrentApproverId = ca.Id
LEFT JOIN AspNetUsers fa ON si.FinalApprovedBy = fa.Id

-- Join with active forwards
LEFT JOIN IssuanceApprovalForwards af ON si.Id = af.IssuanceId AND af.IsActive = 1
LEFT JOIN AspNetUsers ff ON af.ForwardedFromUserId = ff.Id

-- Join with latest approval history
LEFT JOIN (
    SELECT IssuanceId, UserId, ActionType, ActionDate, Comments,
           ROW_NUMBER() OVER (PARTITION BY IssuanceId ORDER BY ActionDate DESC) as rn
    FROM IssuanceApprovalHistory
) lah ON si.Id = lah.IssuanceId AND lah.rn = 1
LEFT JOIN AspNetUsers la ON lah.UserId = la.Id

-- Join with office hierarchy (assuming these tables exist)
LEFT JOIN provinces po ON ru.intProvinceID = po.id
LEFT JOIN divisions dv ON ru.intDivisionID = dv.id
LEFT JOIN districts dt ON ru.intDistrictID = dt.id
LEFT JOIN offices of ON ru.intOfficeID = of.id
LEFT JOIN wings wg ON ru.intWingID = wg.id
LEFT JOIN branches br ON ru.intBranchID = br.id
LEFT JOIN designations ds ON ru.intDesignationID = ds.id;

GO

PRINT 'View_IssuanceApprovalStatus created successfully!';
