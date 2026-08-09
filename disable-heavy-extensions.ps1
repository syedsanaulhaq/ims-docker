# Disable resource-intensive extensions temporarily
Write-Host "🔧 Disabling resource-intensive VS Code extensions..." -ForegroundColor Yellow

$extensionsToDisable = @(
    "donjayamanne.githistory",
    "firefox-devtools.vscode-firefox-debug", 
    "ms-azuretools.vscode-containers",
    "ms-toolsai.datawrangler",
    "ms-vscode-remote.remote-containers"
)

foreach ($ext in $extensionsToDisable) {
    Write-Host "⏸️ Disabling $ext..." -ForegroundColor Cyan
    code --disable-extension $ext
}

Write-Host "✅ Disabled resource-intensive extensions" -ForegroundColor Green
Write-Host "💡 Keep only essential extensions enabled:" -ForegroundColor Yellow
Write-Host "   • GitHub Copilot (for assistance)" -ForegroundColor White  
Write-Host "   • TypeScript support" -ForegroundColor White
Write-Host "   • Deno (if needed for your project)" -ForegroundColor White

Write-Host "`n🔄 Restart VS Code for changes to take effect" -ForegroundColor Cyan
Read-Host "Press Enter to continue..."
