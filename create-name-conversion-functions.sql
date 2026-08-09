-- Function to convert comma-separated IDs to names
-- This will be a SQL function that we can use in our queries

-- Example of how we'll handle it (will adjust based on your table structure):
CREATE OR ALTER FUNCTION dbo.GetOfficeNames(@office_ids NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = ''
    
    IF @office_ids IS NULL OR @office_ids = ''
        RETURN NULL
    
    SELECT @result = @result + 
        CASE WHEN @result = '' THEN '' ELSE ', ' END + 
        ISNULL(strOfficeName, CAST(value AS NVARCHAR))
    FROM STRING_SPLIT(@office_ids, ',') s
    LEFT JOIN tblOffices o ON TRY_CAST(s.value AS INT) = o.intOfficeID
    WHERE s.value IS NOT NULL AND s.value != ''
    
    RETURN @result
END;

CREATE OR ALTER FUNCTION dbo.GetWingNames(@wing_ids NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = ''
    
    IF @wing_ids IS NULL OR @wing_ids = ''
        RETURN NULL
    
    SELECT @result = @result + 
        CASE WHEN @result = '' THEN '' ELSE ', ' END + 
        ISNULL(Name, CAST(value AS NVARCHAR))
    FROM STRING_SPLIT(@wing_ids, ',') s
    LEFT JOIN WingsInformation w ON TRY_CAST(s.value AS INT) = w.Id
    WHERE s.value IS NOT NULL AND s.value != ''
    
    RETURN @result
END;

CREATE OR ALTER FUNCTION dbo.GetDecNames(@dec_ids NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = ''
    
    IF @dec_ids IS NULL OR @dec_ids = ''
        RETURN NULL
    
    -- Will update this once we know the column names for DEC_MST
    SELECT @result = @result + 
        CASE WHEN @result = '' THEN '' ELSE ', ' END + 
        ISNULL(CAST(d.id AS NVARCHAR), CAST(value AS NVARCHAR))
    FROM STRING_SPLIT(@dec_ids, ',') s
    LEFT JOIN DEC_MST d ON TRY_CAST(s.value AS INT) = d.id
    WHERE s.value IS NOT NULL AND s.value != ''
    
    RETURN @result
END;
