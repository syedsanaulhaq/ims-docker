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

PRINT 'View_IssuanceApprovalStatus created successfully!';
