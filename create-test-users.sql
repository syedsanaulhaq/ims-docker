-- Create Test Users for ECP Inventory Management System
-- These users have bcrypt hashed passwords for testing

PRINT 'Creating Test Users with bcrypt passwords...';

-- Clear existing test users first
DELETE FROM AspNetUsers WHERE Id LIKE 'test-%';

-- Test Admin User
INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail, 
    EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
    FullName, Role, CNIC, Password, ISACT,
    intOfficeID, intWingID, intBranchID, intDesignationID
) VALUES (
    'test-admin-001', 'testadmin', 'TESTADMIN', 
    'testadmin@ecp.gov.pk', 'TESTADMIN@ECP.GOV.PK',
    1, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NEWID(), NEWID(),
    0, 0, 0, 0,
    'Test Administrator', 'Admin', '1234567890123', 'admin123', 1,
    1, 1, 1, 1
);

-- Test Manager User  
INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail, 
    EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
    FullName, Role, CNIC, Password, ISACT,
    intOfficeID, intWingID, intBranchID, intDesignationID
) VALUES (
    'test-manager-001', 'testmanager', 'TESTMANAGER', 
    'testmanager@ecp.gov.pk', 'TESTMANAGER@ECP.GOV.PK',
    1, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NEWID(), NEWID(),
    0, 0, 0, 0,
    'Test Manager', 'Manager', '2345678901234', 'manager123', 1,
    1, 2, 2, 2
);

-- Test Regular User
INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail, 
    EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
    FullName, Role, CNIC, Password, ISACT,
    intOfficeID, intWingID, intBranchID, intDesignationID
) VALUES (
    'test-user-001', 'testuser', 'TESTUSER', 
    'testuser@ecp.gov.pk', 'TESTUSER@ECP.GOV.PK',
    1, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NEWID(), NEWID(),
    0, 0, 0, 0,
    'Test User', 'User', '3456789012345', 'user123', 1,
    2, 3, 3, 3
);

-- Test Approval Manager
INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail, 
    EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
    FullName, Role, CNIC, Password, ISACT,
    intOfficeID, intWingID, intBranchID, intDesignationID
) VALUES (
    'test-approver-001', 'testapprover', 'TESTAPPROVER', 
    'testapprover@ecp.gov.pk', 'TESTAPPROVER@ECP.GOV.PK',
    1, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NEWID(), NEWID(),
    0, 0, 0, 0,
    'Test Approver', 'ApprovalManager', '4567890123456', 'approver123', 1,
    1, 1, 1, 4
);

-- Simple Test User (CNIC as username)
INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail, 
    EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
    FullName, Role, CNIC, Password, ISACT,
    intOfficeID, intWingID, intBranchID, intDesignationID
) VALUES (
    'test-simple-001', '1111111111111', '1111111111111', 
    'simple@ecp.gov.pk', 'SIMPLE@ECP.GOV.PK',
    1, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NEWID(), NEWID(),
    0, 0, 0, 0,
    'Simple Test User', 'User', '1111111111111', '123456', 1,
    1, 1, 1, 5
);

PRINT 'Test users created successfully!';
PRINT '';
PRINT '=== LOGIN CREDENTIALS FOR TESTING ===';
PRINT 'Username: testadmin     | Password: admin123     | Role: Admin';
PRINT 'Username: testmanager   | Password: manager123   | Role: Manager';
PRINT 'Username: testuser      | Password: user123      | Role: User';
PRINT 'Username: testapprover  | Password: approver123  | Role: ApprovalManager';
PRINT 'Username: 1111111111111 | Password: 123456       | Role: User';
PRINT '';
PRINT 'NOTES:';
PRINT '- All passwords use bcrypt hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
PRINT '- This bcrypt hash corresponds to password "secret"';
PRINT '- But Password field contains the actual plain text for fallback';
PRINT '- You can login with either username or CNIC';
PRINT '- The admin/admin login still works as before';

-- Verify users were created
SELECT 
    UserName,
    FullName,
    Role,
    CNIC,
    Password,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Has bcrypt hash' ELSE 'No hash' END as HashStatus
FROM AspNetUsers 
WHERE Id LIKE 'test-%'
ORDER BY Role, UserName;
