# Fix App.tsx by removing markdown content appended to the file
Write-Host "Fixing App.tsx..." -ForegroundColor Yellow

# Close the file in VS Code if open
code --command "workbench.action.closeActiveEditor"

Start-Sleep -Seconds 1

# Read the file and find the correct ending
$content = Get-Content "src\App.tsx" -Raw
$lines = $content -split "`n"

# Find the line with "export default App;"
$exportLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^export default App;") {
        $exportLine = $i
        break
    }
}

if ($exportLine -gt 0) {
    Write-Host "Found 'export default App;' at line $($exportLine + 1)" -ForegroundColor Green
    
    # Keep everything up to and including 2 lines after export
    $cleanLines = $lines[0..($exportLine + 1)]
    $cleanContent = ($cleanLines -join "`n") + "`n"
    
    # Force write with UTF8 encoding
    [System.IO.File]::WriteAllText("$PWD\src\App.tsx", $cleanContent, [System.Text.Encoding]::UTF8)
    
    $newCount = (Get-Content "src\App.tsx").Count
    Write-Host "✅ App.tsx fixed! New line count: $newCount" -ForegroundColor Green
    Write-Host "File now ends properly with 'export default App;'" -ForegroundColor Green
} else {
    Write-Host "❌ Could not find 'export default App;' in file" -ForegroundColor Red
}
