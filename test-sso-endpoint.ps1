Write-Host "Testing IMS SSO Endpoint" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if backend is running
Write-Host "1. Checking if Node backend is running..." -ForegroundColor Yellow
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "   ✓ Backend is running (PID: $($nodeProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ✗ Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Please start backend with: node backend-server.cjs" -ForegroundColor Yellow
    exit
}
Write-Host ""

# Test 2: Check if port 3001 is listening
Write-Host "2. Checking if port 3001 is listening..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue
if ($portTest.TcpTestSucceeded) {
    Write-Host "   ✓ Port 3001 is accessible" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 3001 is NOT accessible!" -ForegroundColor Red
    exit
}
Write-Host ""

# Test 3: Test endpoint with localhost
Write-Host "3. Testing endpoint on localhost:3001..." -ForegroundColor Yellow
try {
    $body = @{
        UserName = '1234567891011'
        Password = 'admin123'
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/ds-authenticate" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $responseBody" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 4: Test endpoint with server IP
Write-Host "4. Testing endpoint on 172.20.150.34:3001..." -ForegroundColor Yellow
try {
    $body = @{
        UserName = '1234567891011'
        Password = 'admin123'
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://172.20.150.34:3001/api/auth/ds-authenticate" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $responseBody" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 5: Check firewall rules for port 3001
Write-Host "5. Checking Windows Firewall rules for port 3001..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule | Where-Object {
    $_.Enabled -eq $true -and 
    ($_.DisplayName -like "*3001*" -or $_.DisplayName -like "*Node*")
} | Select-Object DisplayName, Direction, Action

if ($firewallRules) {
    Write-Host "   Found firewall rules:" -ForegroundColor Green
    $firewallRules | Format-Table -AutoSize
} else {
    Write-Host "   ⚠ No specific firewall rules found for port 3001" -ForegroundColor Yellow
    Write-Host "   You may need to add a firewall rule:" -ForegroundColor Yellow
    Write-Host "   New-NetFirewallRule -DisplayName 'IMS Backend' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow" -ForegroundColor Cyan
}
Write-Host ""

# Test 6: Check what's listening on port 3001
Write-Host "6. Checking what's listening on port 3001..." -ForegroundColor Yellow
$listening = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host "   Process listening on port 3001:" -ForegroundColor Green
    foreach ($conn in $listening) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "   - $($process.ProcessName) (PID: $($process.Id)) - State: $($conn.State)" -ForegroundColor Green
    }
} else {
    Write-Host "   ✗ No process is listening on port 3001!" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
