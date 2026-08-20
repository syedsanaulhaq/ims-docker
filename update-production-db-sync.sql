USE [InvMISDB];
GO

-- ==============================================
-- 🔄 Syncing local changes to production DB
-- ==============================================

-- 1. Syncing sp_GetPersonalInventory
IF OBJECT_ID('dbo.sp_GetPersonalInventory', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetPersonalInventory;
GO

CREATE PROCEDURE dbo.sp_GetPersonalInventory
    @UserId NVARCHAR(450)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
      CAST(il.id AS NVARCHAR(50)) AS ledger_id,
      CAST(il.request_id AS NVARCHAR(50)) AS request_id,
      il.request_number,
      COALESCE(NULLIF(LTRIM(RTRIM(il.nomenclature)), ''), im.nomenclature, 'Unknown Item') AS nomenclature,
      c.category_name,
      COALESCE(il.issued_quantity, 0) AS issued_quantity,
      COALESCE(il.unit_price, 0) AS unit_price,
      COALESCE(il.total_value, 0) AS total_value,
      il.issued_at,
      COALESCE(il.issued_by_name, '') AS issued_by_name,
      il.purpose,
      il.request_type,
      COALESCE(il.is_returnable, 0) AS is_returnable,
      il.expected_return_date,
      il.actual_return_date,
      COALESCE(il.return_status, 'Not Returned') AS return_status,
      CASE
        WHEN COALESCE(il.is_returnable, 0) = 1
          AND COALESCE(il.return_status, 'Not Returned') = 'Not Returned'
          AND il.expected_return_date IS NOT NULL
          AND il.expected_return_date < CAST(GETDATE() AS DATE)
        THEN 'Overdue'
        WHEN COALESCE(il.return_status, '') = 'Returned' THEN 'Returned'
        WHEN COALESCE(il.is_returnable, 0) = 0 THEN 'Not Returnable'
        ELSE COALESCE(il.return_status, 'Not Returned')
      END AS current_return_status,
      COALESCE(il.status, 'Issued') AS status,
      COALESCE(il.issuance_notes, '') AS issuance_notes
    FROM issued_items_ledger il
    LEFT JOIN item_masters im ON il.item_master_id = im.id
    LEFT JOIN categories c ON im.category_id = c.id
    WHERE CONVERT(NVARCHAR(450), il.issued_to_user_id) = @UserId

    UNION ALL

    SELECT
      CAST(sii.id AS NVARCHAR(50)) AS ledger_id,
      CAST(sir.id AS NVARCHAR(50)) AS request_id,
      sir.request_number,
      COALESCE(im.nomenclature, 'Unknown Item') AS nomenclature,
      c.category_name,
      COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), sii.requested_quantity, 0) AS issued_quantity,
      COALESCE(sii.unit_price, 0) AS unit_price,
      COALESCE(sii.total_value, 0) AS total_value,
      COALESCE(TRY_CONVERT(datetime2, sir.issued_at), sir.updated_at, sir.submitted_at, sir.created_at) AS issued_at,
      COALESCE(sir.dispatcher_name, '') AS issued_by_name,
      sir.purpose,
      sir.request_type,
      COALESCE(sir.is_returnable, 0) AS is_returnable,
      TRY_CONVERT(date, sir.expected_return_date) AS expected_return_date,
      CAST(NULL AS date) AS actual_return_date,
      CASE
        WHEN COALESCE(sir.is_returnable, 0) = 0 THEN 'Not Returnable'
        WHEN TRY_CONVERT(date, sir.expected_return_date) IS NOT NULL
          AND TRY_CONVERT(date, sir.expected_return_date) < CAST(GETDATE() AS DATE)
        THEN 'Overdue'
        ELSE 'Not Returned'
      END AS return_status,
      CASE
        WHEN COALESCE((SELECT SUM(sri.returned_quantity) FROM stock_return_items sri WHERE sri.original_issuance_item_id = sii.id), 0) >= COALESCE(NULLIF(sii.issued_quantity, 0), NULLIF(sii.approved_quantity, 0), sii.requested_quantity, 1)
        THEN 'Returned'
        WHEN COALESCE(sir.is_returnable, 0) = 1
          AND TRY_CONVERT(date, sir.expected_return_date) IS NOT NULL
          AND TRY_CONVERT(date, sir.expected_return_date) < CAST(GETDATE() AS DATE)
        THEN 'Overdue'
        WHEN UPPER(COALESCE(sir.approval_status, sir.request_status, '')) = 'RETURNED'
        THEN 'Returned'
        ELSE 'Not Returned'
      END AS current_return_status,
      COALESCE(sii.status, sir.approval_status, sir.request_status, 'Issued') AS status,
      COALESCE(sir.issuance_notes, '') AS issuance_notes
    FROM stock_issuance_items sii
    INNER JOIN stock_issuance_requests sir ON COALESCE(sii.request_id, sii.stock_issuance_id) = sir.id
    LEFT JOIN item_masters im ON sii.item_master_id = im.id
    LEFT JOIN categories c ON im.category_id = c.id
    WHERE CONVERT(NVARCHAR(450), sir.requester_user_id) = @UserId
      AND (
        UPPER(COALESCE(sir.request_status, '')) IN ('ISSUED', 'COMPLETED', 'DISPATCHED')
        OR UPPER(COALESCE(sir.approval_status, '')) IN ('ISSUED', 'COMPLETED', 'DISPATCHED')
        OR sir.is_finalized = 1
      )
      AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
      AND NOT EXISTS (
        SELECT 1
        FROM issued_items_ledger il2
        WHERE il2.request_id = sir.id
          AND (
            il2.item_master_id = sii.item_master_id
            OR (il2.item_master_id IS NULL AND sii.item_master_id IS NULL)
          )
      )
END;
GO

PRINT '✅ Stored procedure sp_GetPersonalInventory synchronized successfully!';
