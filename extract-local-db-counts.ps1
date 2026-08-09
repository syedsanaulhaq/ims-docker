param(
    [string]$Server = "SYED-FAZLI-LAPT",
    [string]$Database = "InventoryManagementSystem"
)

# Load SQL Server assemblies
[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName("System.Data.SqlClient") | Out-Null

# Connection string
$ConnectionString = "Server=$Server;Database=$Database;Integrated Security=true;Connection Timeout=10;"

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection
    $connection.ConnectionString = $ConnectionString
    $connection.Open()
    Write-Host "✅ Connected to $Server.$Database" -ForegroundColor Green
    
    # Query to get all tables and their row counts
    $query = @"
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as ColumnCount,
    (SELECT COUNT(*) FROM sys.objects WHERE object_id = OBJECT_ID(QUOTENAME(t.TABLE_NAME))) as RowCount
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
"@
    
    $command = New-Object System.Data.SqlClient.SqlCommand
    $command.Connection = $connection
    $command.CommandText = $query
    
    $reader = $command.ExecuteReader()
    
    Write-Host "`nTables in Database:" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Yellow
    
    while ($reader.Read()) {
        $tableName = $reader[0].ToString()
        
        # Get actual row count
        $countCmd = New-Object System.Data.SqlClient.SqlCommand
        $countCmd.Connection = $connection
        $countCmd.CommandText = "SELECT COUNT(*) FROM [$tableName]"
        
        try {
            $rowCount = $countCmd.ExecuteScalar()
            Write-Host "$tableName : $rowCount rows" -ForegroundColor Cyan
        }
        catch {
            Write-Host "$tableName : [ERROR - Cannot count]" -ForegroundColor Red
        }
    }
    
    $connection.Close()
    Write-Host "`n✅ Data extraction complete" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: $($_.Message)" -ForegroundColor Red
}
