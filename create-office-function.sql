-- Create functions one by one to avoid issues

-- Step 1: Office Names Function
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
