# VS Code Performance Restart Script
Write-Host "🔄 Restarting VS Code with performance optimizations..." -ForegroundColor Yellow

# Stop VS Code processes
Write-Host "⏹️ Stopping VS Code processes..." -ForegroundColor Cyan
Get-Process -Name "Code" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Clear VS Code workspace state (optional - uncomment if needed)
# $vscodeWorkspaceState = "$env:APPDATA\Code\User\workspaceStorage"
# Write-Host "🧹 Clearing workspace state..." -ForegroundColor Cyan
# Remove-Item "$vscodeWorkspaceState\*" -Recurse -Force -ErrorAction SilentlyContinue

# Start VS Code with performance flags
Write-Host "🚀 Starting VS Code with optimizations..." -ForegroundColor Green
$currentPath = Get-Location
code --max-memory=8192 --disable-gpu --no-sandbox $currentPath

Write-Host "✅ VS Code started with performance optimizations:" -ForegroundColor Green
Write-Host "   • Increased memory limit to 8GB" -ForegroundColor White
Write-Host "   • GPU acceleration disabled" -ForegroundColor White
Write-Host "   • Sandbox disabled" -ForegroundColor White
Write-Host "   • Custom settings applied" -ForegroundColor White

Write-Host "`n💡 Additional tips:" -ForegroundColor Yellow
Write-Host "   • Close unnecessary tabs and panels" -ForegroundColor White
Write-Host "   • Use Ctrl+Shift+P > 'Developer: Reload Window' if it freezes" -ForegroundColor White
Write-Host "   • Consider using 'File > New Window' for other projects" -ForegroundColor White

Read-Host "`nPress Enter to continue..."
