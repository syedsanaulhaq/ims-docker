-- =====================================================
-- SIMPLE TEST DATABASE SETUP
-- =====================================================
-- Run this script to create INVMIS_TEST database
-- =====================================================

USE master;
GO

-- Drop test database if exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'INVMIS_TEST')
BEGIN
    ALTER DATABASE INVMIS_TEST SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE INVMIS_TEST;
    PRINT '✓ Dropped existing INVMIS_TEST database';
END
GO

-- Create test database
CREATE DATABASE INVMIS_TEST;
GO

PRINT '✓ Created INVMIS_TEST database';
GO

USE INVMIS_TEST;
GO

PRINT '✓ Now run your create-complete-database-schema.sql on INVMIS_TEST';
PRINT '✓ Then copy reference data using copy-reference-data-to-test.sql';
GO
