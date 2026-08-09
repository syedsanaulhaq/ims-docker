$sqlFile = "create-annual-tender-system-simple.sql"
$content = Get-Content $sqlFile -Raw

$sqlConnection = New-Object System.Data.SqlClient.SqlConnection
$sqlConnection.ConnectionString = 'Server=SYED-FAZLI-LAPT;Database=InventoryManagementDB;Integrated Security=true;'
$sqlConnection.Open()

$sqlCommand = $sqlConnection.CreateCommand()
$sqlCommand.CommandText = $content
$sqlCommand.CommandTimeout = 120

try {
    $sqlCommand.ExecuteNonQuery()
    Write-Host "✅ Annual Tender System tables created successfully!"
} catch {
    Write-Host "❌ Error: " $_.Exception.Message
}
$sqlConnection.Close()
