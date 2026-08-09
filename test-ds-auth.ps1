# Test DS-Style Authentication Endpoint

Write-Host "Testing DS-Style Authentication Endpoint" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test credentials - Updated with real user
$testUserName = "3740560772543"  # Real username from database
$testPassword = "P@ssword@1"      # Real password (bcrypt hashed)

Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  UserName: $testUserName"
Write-Host "  Password: ******* (hidden)"
Write-Host ""

# Prepare request body
$body = @{
    UserName = $testUserName
    Password = $testPassword
} | ConvertTo-Json

Write-Host "Sending authentication request..." -ForegroundColor Yellow

try {
    # Call IMS authentication endpoint - test both localhost and production server
    $baseUrl = "http://172.20.150.34:3001"  # Production server
    # $baseUrl = "http://localhost:3001"    # Uncomment for local testing
    
    Write-Host "Testing endpoint: $baseUrl/api/auth/ds-authenticate" -ForegroundColor White
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/ds-authenticate" `
                                  -Method Post `
                                  -Body $body `
                                  -ContentType "application/json" `
                                  -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ SUCCESS! Authentication passed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    Write-Host "  Success: $($response.success)"
    Write-Host "  Message: $($response.message)"
    Write-Host "  Token (first 50 chars): $($response.Token.Substring(0, 50))..."
    Write-Host ""
    Write-Host "Full Token (copy this for testing):" -ForegroundColor Cyan
    Write-Host $response.Token
    Write-Host ""
    Write-Host "🎉 DS-Style SSO is ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Share DS-PATTERN-SSO-IMPLEMENTATION.md with DS team"
    Write-Host "2. DS team creates IMSController.cs (minimal changes!)"
    Write-Host "3. Test complete flow: DS → IMS"
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    Write-Host ""
    Write-Host "❌ FAILURE! Authentication failed" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "Error: Invalid CNIC or password" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. CNIC doesn't exist in AspNetUsers table"
        Write-Host "  2. Password is incorrect"
        Write-Host "  3. User is not active (ISACT = 0)"
        Write-Host ""
        Write-Host "Verify in database:" -ForegroundColor Cyan
        Write-Host "  SELECT Id, FullName, CNIC, ISACT FROM AspNetUsers WHERE CNIC = '$testCNIC'"
    }
    elseif ($statusCode -eq 400) {
        Write-Host "Error: Missing CNIC or password in request" -ForegroundColor Red
    }
    else {
        Write-Host "Error Code: $statusCode" -ForegroundColor Red
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure backend is running: node backend-server.cjs"
    Write-Host "  2. Check backend console for error messages"
    Write-Host "  3. Verify test credentials are correct"
    Write-Host "  4. Run user sync if needed: node sync-users-from-ds.cjs"
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
