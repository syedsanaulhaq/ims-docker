-- Create functions to convert comma-separated IDs to names
-- Office Names Function
CREATE OR ALTER FUNCTION dbo.GetOfficeNames(@office_ids NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = ''
    
    IF @office_ids IS NULL OR @office_ids = '' OR @office_ids = '0'
        RETURN NULL
    
    SELECT @result = @result + 
        CASE WHEN @result = '' THEN '' ELSE ', ' END + 
        ISNULL(strOfficeName, 'Unknown Office')
    FROM STRING_SPLIT(@office_ids, ',') s
    LEFT JOIN tblOffices o ON TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) = o.intOfficeID
    WHERE LTRIM(RTRIM(s.value)) IS NOT NULL 
      AND LTRIM(RTRIM(s.value)) != '' 
      AND LTRIM(RTRIM(s.value)) != '0'
      AND TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) IS NOT NULL
    
    RETURN NULLIF(@result, '')
END;

-- Wing Names Function
CREATE OR ALTER FUNCTION dbo.GetWingNames(@wing_ids NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = ''
    
    IF @wing_ids IS NULL OR @wing_ids = '' OR @wing_ids = '0'
        RETURN NULL
    
    SELECT @result = @result + 
        CASE WHEN @result = '' THEN '' ELSE ', ' END + 
        ISNULL(Name, 'Unknown Wing')
    FROM STRING_SPLIT(@wing_ids, ',') s
    LEFT JOIN WingsInformation w ON TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) = w.Id
    WHERE LTRIM(RTRIM(s.value)) IS NOT NULL 
      AND LTRIM(RTRIM(s.value)) != '' 
      AND LTRIM(RTRIM(s.value)) != '0'
      AND TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) IS NOT NULL
    
    RETURN NULLIF(@result, '')
END;

-- DEC Names Function (will need to adjust based on your DEC_MST table structure)
CREATE OR ALTER FUNCTION dbo.GetDecNames(@dec_ids NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = ''
    
    IF @dec_ids IS NULL OR @dec_ids = '' OR @dec_ids = '0'
        RETURN NULL
    
    -- Using a generic approach - will adjust once we see DEC_MST structure
    SELECT @result = @result + 
        CASE WHEN @result = '' THEN '' ELSE ', ' END + 
        ISNULL(COALESCE(dec_name, name, description, CAST(id AS NVARCHAR)), 'Unknown DEC')
    FROM STRING_SPLIT(@dec_ids, ',') s
    LEFT JOIN DEC_MST d ON TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) = d.id
    WHERE LTRIM(RTRIM(s.value)) IS NOT NULL 
      AND LTRIM(RTRIM(s.value)) != '' 
      AND LTRIM(RTRIM(s.value)) != '0'
      AND TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) IS NOT NULL
    
    RETURN NULLIF(@result, '')
END;
