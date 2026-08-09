-- =====================================================
-- CREATE TEST DATABASE FOR INVENTORY MANAGEMENT SYSTEM
-- =====================================================
-- Purpose: Create a clean test database (INVMIS_TEST) 
--          separate from production (INVMIS) for testing
-- Date: October 16, 2025
-- =====================================================

USE master;
GO

-- Drop test database if it exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'INVMIS_TEST')
BEGIN
    ALTER DATABASE INVMIS_TEST SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE INVMIS_TEST;
    PRINT '✓ Dropped existing INVMIS_TEST database';
END
GO

-- Create new test database
CREATE DATABASE INVMIS_TEST;
GO

PRINT '✓ Created INVMIS_TEST database';
GO

USE INVMIS_TEST;
GO

-- =====================================================
-- COPY COMPLETE SCHEMA FROM PRODUCTION
-- =====================================================
-- This will copy all table structures, constraints, 
-- and indexes from INVMIS to INVMIS_TEST
-- =====================================================

PRINT 'Copying database schema from INVMIS to INVMIS_TEST...';
GO

-- Copy all tables structure (this creates empty tables with same schema)
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql = @sql + 
    'SELECT * INTO INVMIS_TEST.dbo.' + TABLE_NAME + 
    ' FROM INVMIS.dbo.' + TABLE_NAME + ' WHERE 1=0;' + CHAR(13)
FROM INVMIS.INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

EXEC sp_executesql @sql;

PRINT '✓ Copied all table structures';
GO

-- Now we need to add back all constraints, indexes, and keys
-- Let's copy them manually for better control

USE INVMIS_TEST;
GO

PRINT 'Setting up constraints and relationships...';
GO

-- You'll need to run this script to copy constraints:
-- This script will generate the constraint creation statements
-- from your production database
SELECT 
    'ALTER TABLE [' + OBJECT_NAME(parent_object_id) + '] ' +
    'ADD CONSTRAINT [' + name + '] ' + definition + ';'
FROM INVMIS.sys.check_constraints
ORDER BY OBJECT_NAME(parent_object_id);

-- Copy Primary Keys
SELECT 
    'ALTER TABLE [' + t.name + '] ' +
    'ADD CONSTRAINT [' + i.name + '] PRIMARY KEY CLUSTERED (' +
    STUFF((
        SELECT ', [' + c.name + ']'
        FROM INVMIS.sys.index_columns ic
        INNER JOIN INVMIS.sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
        ORDER BY ic.key_ordinal
        FOR XML PATH('')
    ), 1, 2, '') + ');'
FROM INVMIS.sys.indexes i
INNER JOIN INVMIS.sys.tables t ON i.object_id = t.object_id
WHERE i.is_primary_key = 1;

-- Copy Foreign Keys
SELECT 
    'ALTER TABLE [' + OBJECT_NAME(fk.parent_object_id) + '] ' +
    'ADD CONSTRAINT [' + fk.name + '] FOREIGN KEY (' +
    STUFF((
        SELECT ', [' + c.name + ']'
        FROM INVMIS.sys.foreign_key_columns fkc
        INNER JOIN INVMIS.sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        WHERE fkc.constraint_object_id = fk.object_id
        FOR XML PATH('')
    ), 1, 2, '') + ') ' +
    'REFERENCES [' + OBJECT_NAME(fk.referenced_object_id) + '] (' +
    STUFF((
        SELECT ', [' + c.name + ']'
        FROM INVMIS.sys.foreign_key_columns fkc
        INNER JOIN INVMIS.sys.columns c ON fkc.referenced_object_id = c.object_id AND fkc.referenced_column_id = c.column_id
        WHERE fkc.constraint_object_id = fk.object_id
        FOR XML PATH('')
    ), 1, 2, '') + ');'
FROM INVMIS.sys.foreign_keys fk;

GO

PRINT '✓ Test database setup instructions generated';
GO

-- =====================================================
-- ALTERNATIVE: SIMPLE APPROACH - CREATE MINIMAL SCHEMA
-- =====================================================
-- If the above automated approach is complex,
-- you can manually run the complete schema script
-- from your production database
-- =====================================================

PRINT '';
PRINT '=================================================';
PRINT 'TEST DATABASE CREATION COMPLETE!';
PRINT '=================================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Run your complete schema creation script on INVMIS_TEST';
PRINT '2. Update backend .env file to use INVMIS_TEST';
PRINT '3. Copy essential reference data (users, offices, categories)';
PRINT '4. Start testing with clean database!';
PRINT '';
PRINT 'Database: INVMIS_TEST';
PRINT 'Status: Empty and ready for testing';
PRINT '=================================================';
GO
