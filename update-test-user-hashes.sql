-- Update Test Users with proper bcrypt password hashes
PRINT 'Updating test users with proper bcrypt password hashes...';

-- Update admin test user
UPDATE AspNetUsers SET PasswordHash = '$2b$10$viHX17Ukxb10tkTyHgNww.Mck1GUcRn03lhqqb0PjdOAiN0jB1QWa' WHERE Password = 'admin123';

-- Update manager test user  
UPDATE AspNetUsers SET PasswordHash = '$2b$10$m4ujtS4/U9SuNSvXW4LgfeOQijwj4vYf9HpFHUS1X7Q436P7O1ocK' WHERE Password = 'manager123';

-- Update regular user
UPDATE AspNetUsers SET PasswordHash = '$2b$10$aLgjNYv/fNYV1Lpd/Mq6he9myKHnyY5PMrF2HPu4p8iYhXrX13p3q' WHERE Password = 'user123';

-- Update approver user
UPDATE AspNetUsers SET PasswordHash = '$2b$10$Ls10FrI0RGBe9hSrUJobMOt8Heg4.IloopDItUStwHNlZn1tQoMT2' WHERE Password = 'approver123';

-- Update simple user
UPDATE AspNetUsers SET PasswordHash = '$2b$10$ZtaO5EoZcJI/d4ZVtig0Z.uQrINpiEAjHSB1Rn5Sgm.O4nirH1zPi' WHERE Password = '123456';

PRINT 'Password hashes updated successfully!';
PRINT '';

-- Verify the updates
SELECT 
    UserName,
    FullName, 
    Role,
    Password,
    LEFT(PasswordHash, 20) + '...' as PasswordHashPreview
FROM AspNetUsers 
WHERE Id LIKE 'test-%'
ORDER BY Role, UserName;

PRINT '';
PRINT '=== READY FOR TESTING ===';
PRINT 'All test users now have proper bcrypt password hashes';
PRINT 'Your backend bcrypt.compare() will now work correctly';
PRINT '';
PRINT 'TEST CREDENTIALS:';
PRINT 'testadmin / admin123 (Admin)';
PRINT 'testmanager / manager123 (Manager)'; 
PRINT 'testuser / user123 (User)';
PRINT 'testapprover / approver123 (ApprovalManager)';
PRINT '1111111111111 / 123456 (User)';
PRINT '';
PRINT 'Plus the original admin / admin still works';
