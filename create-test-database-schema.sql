-- =====================================================
-- CREATE INVMIS_TEST DATABASE SCHEMA
-- =====================================================
-- This script generates CREATE TABLE statements from INVMIS
-- and executes them in INVMIS_TEST to duplicate the structure
-- =====================================================

USE INVMIS_TEST;
GO

PRINT '=====================================================';
PRINT 'Creating INVMIS_TEST Database Schema from INVMIS';
PRINT '=====================================================';
GO

-- =====================================================
-- DYNAMIC SCHEMA COPY
-- =====================================================
-- This will generate and execute CREATE TABLE statements
-- for all tables in INVMIS database
-- =====================================================

DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @tableName NVARCHAR(128);
DECLARE @schemaName NVARCHAR(128) = 'dbo';

-- Cursor to loop through all user tables in INVMIS
DECLARE table_cursor CURSOR FOR
SELECT TABLE_NAME
FROM INVMIS.INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
ORDER BY TABLE_NAME;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Generate CREATE TABLE script for each table
    SET @sql = '';
    
    -- Build column definitions
    SELECT @sql = @sql + 
        QUOTENAME(c.COLUMN_NAME) + ' ' +
        c.DATA_TYPE +
        CASE 
            WHEN c.DATA_TYPE IN ('varchar', 'char', 'nvarchar', 'nchar') THEN 
                '(' + CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX' 
                          ELSE CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) END + ')'
            WHEN c.DATA_TYPE IN ('decimal', 'numeric') THEN 
                '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR(10)) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR(10)) + ')'
            ELSE ''
        END +
        CASE WHEN c.IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE ' NULL' END +
        CASE WHEN c.COLUMN_DEFAULT IS NOT NULL THEN ' DEFAULT ' + c.COLUMN_DEFAULT ELSE '' END +
        ',' + CHAR(13)
    FROM INVMIS.INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_SCHEMA = @schemaName
      AND c.TABLE_NAME = @tableName
    ORDER BY c.ORDINAL_POSITION;

    -- Remove trailing comma
    SET @sql = LEFT(@sql, LEN(@sql) - 2);

    -- Wrap in CREATE TABLE
    SET @sql = 'IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = ''' + @tableName + ''')' + CHAR(13) +
               'BEGIN' + CHAR(13) +
               '    CREATE TABLE ' + QUOTENAME(@schemaName) + '.' + QUOTENAME(@tableName) + ' (' + CHAR(13) +
               @sql + CHAR(13) +
               '    );' + CHAR(13) +
               '    PRINT ''✓ Created table: ' + @tableName + ''';' + CHAR(13) +
               'END' + CHAR(13) +
               'ELSE' + CHAR(13) +
               '    PRINT ''⊘ Table already exists: ' + @tableName + ''';' + CHAR(13);

    -- Execute the CREATE TABLE statement
    BEGIN TRY
        EXEC sp_executesql @sql;
    END TRY
    BEGIN CATCH
        PRINT '✗ Error creating table ' + @tableName + ': ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM table_cursor INTO @tableName;
END

CLOSE table_cursor;
DEALLOCATE table_cursor;

GO

PRINT '';
PRINT '=====================================================';
PRINT 'INVMIS_TEST SCHEMA CREATION COMPLETE!';
PRINT '=====================================================';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Run copy-reference-data-to-test.sql to copy user/office data';
PRINT '2. Use switch-environment.ps1 to switch backend to TEST';
PRINT '3. Start testing with clean database!';
PRINT '=====================================================';
GO
