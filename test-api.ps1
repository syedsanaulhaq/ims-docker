$tenderId = "8EE90FB6-9EF4-4832-A208-1277B39AD475"
$url = "http://localhost:3001/api/tender/$tenderId/items"

Write-Host "Testing endpoint: $url"
Write-Host "Expected columns: id, item_master_id, quantity, nomenclature, estimated_unit_price"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $items = $response.Content | ConvertFrom-Json
    Write-Host "✅ Items found: $($items.Count)" -ForegroundColor Green
    Write-Host ""
    
    if ($items.Count -gt 0) {
        Write-Host "First 3 items:" -ForegroundColor Cyan
        $items | Select-Object -First 3 | ForEach-Object {
            Write-Host "  ├─ ID: $($_.id)"
            Write-Host "  ├─ Item Master ID: $($_.item_master_id)"
            Write-Host "  ├─ Nomenclature: $($_.nomenclature)"
            Write-Host "  ├─ Qty: $($_.quantity)"
            Write-Host "  └─ Est. Unit Price: $($_.estimated_unit_price)"
            Write-Host ""
        }
    } else {
        Write-Host "⚠️ No items found in this tender" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
