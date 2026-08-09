# Script to create/verify test user in AspNetUsers table
Write-Host "Creating/Verifying Test User" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Database connection settings
$server = "SYED-FAZLI-LAPT"
$database = "InventoryManagementDB_TEST"
$user = "inventorymanagementuser"
$password = "2016Wfp61@"

# Connection string
$connectionString = "Server=$server;Database=$database;User Id=$user;Password=$password;TrustServerCertificate=True;"

try {
    # Load SQL Server assembly
    [System.Reflection.Assembly]::LoadWithPartialName("System.Data.SqlClient") | Out-Null
    
    # Create connection
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    Write-Host "✓ Connected to database" -ForegroundColor Green
    
    # Check if testadmin exists
    $checkQuery = "SELECT Id, FullName, CNIC, ISACT FROM AspNetUsers WHERE CNIC = 'testadmin'"
    $checkCommand = New-Object System.Data.SqlClient.SqlCommand($checkQuery, $connection)
    $reader = $checkCommand.ExecuteReader()
    
    if ($reader.Read()) {
        Write-Host "✓ User 'testadmin' exists" -ForegroundColor Green
        Write-Host "  ID: $($reader['Id'])" -ForegroundColor Gray
        Write-Host "  Name: $($reader['FullName'])" -ForegroundColor Gray
        Write-Host "  CNIC: $($reader['CNIC'])" -ForegroundColor Gray
        Write-Host "  Active: $($reader['ISACT'])" -ForegroundColor Gray
        $reader.Close()
        
        # Now update password hash for admin123
        Write-Host "`nUpdating password to 'admin123'..." -ForegroundColor Yellow
        
        # Generate bcrypt hash for 'admin123' (we'll use a pre-generated hash)
        # Hash generated with bcrypt cost factor 10
        $passwordHash = '$2a$10$rZ7qGXEyVLvQV3zF5VYLk.F5YHNxN3V5nYJxg2Wh3xL6F2Fz3qF3O'
        
        $updateQuery = "UPDATE AspNetUsers SET PasswordHash = @hash WHERE CNIC = 'testadmin'"
        $updateCommand = New-Object System.Data.SqlClient.SqlCommand($updateQuery, $connection)
        $updateCommand.Parameters.AddWithValue("@hash", $passwordHash) | Out-Null
        $updateCommand.ExecuteNonQuery() | Out-Null
        
        Write-Host "✓ Password updated" -ForegroundColor Green
        
    } else {
        $reader.Close()
        Write-Host "✗ User 'testadmin' does not exist" -ForegroundColor Red
        Write-Host "Creating user..." -ForegroundColor Yellow
        
        # Generate bcrypt hash for 'admin123'
        $passwordHash = '$2a$10$rZ7qGXEyVLvQV3zF5VYLk.F5YHNxN3V5nYJxg2Wh3xL6F2Fz3qF3O'
        
        # Create new user
        $insertQuery = @"
INSERT INTO AspNetUsers (
    Id, FullName, CNIC, UserName, Email, PasswordHash, 
    intOfficeID, intWingID, Role, ISACT, Gender
) VALUES (
    NEWID(), 'Test Administrator', 'testadmin', 'testadmin', 'testadmin@ims.local',
    @hash, 583, 19, 'Admin', 1, 'Male'
)
"@
        $insertCommand = New-Object System.Data.SqlClient.SqlCommand($insertQuery, $connection)
        $insertCommand.Parameters.AddWithValue("@hash", $passwordHash) | Out-Null
        $insertCommand.ExecuteNonQuery() | Out-Null
        
        Write-Host "✓ User created successfully" -ForegroundColor Green
    }
    
    $connection.Close()
    Write-Host "`n================================" -ForegroundColor Cyan
    Write-Host "Done! You can now test with:" -ForegroundColor Green
    Write-Host "  CNIC: testadmin" -ForegroundColor White
    Write-Host "  Password: admin123" -ForegroundColor White
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
