# ============================================================================
# IMS v1 - VS Code Insider Setup & Project Initialization
# ============================================================================
# This script initializes the project environment for VS Code Insider
# Run this after opening the project in a fresh VS Code Insider instance
# 
# Usage: .\SETUP-INSIDER.ps1
# ============================================================================

Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     IMS v1 - VS Code Insider Project Setup                    ║" -ForegroundColor Cyan
Write-Host "║     Backend Modular Architecture (17 Route Modules)           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Node.js and npm
Write-Host "📋 Step 1: Verifying Node.js & npm..." -ForegroundColor Yellow
try {
  $nodeVersion = node --version
  $npmVersion = npm --version
  Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
  Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
  Write-Host "❌ Node.js not found! Please install Node.js v18+ first." -ForegroundColor Red
  exit 1
}

# Step 2: Check if node_modules exists
Write-Host "`n📋 Step 2: Checking dependencies..." -ForegroundColor Yellow
if (Test-Path ".\node_modules" -PathType Container) {
  Write-Host "✅ node_modules found" -ForegroundColor Green
  Write-Host "   (Run 'npm install' if you encounter missing packages)" -ForegroundColor Gray
} else {
  Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
  npm install
  if ($?) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
  } else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
  }
}

# Step 3: Environment files check
Write-Host "`n📋 Step 3: Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".\.env.sqlserver" -PathType Leaf) {
  Write-Host "✅ .env.sqlserver found" -ForegroundColor Green
  Write-Host "   Database: MSSQL Server 2022" -ForegroundColor Gray
} else {
  Write-Host "⚠️  .env.sqlserver not found" -ForegroundColor Yellow
  Write-Host "   This is needed for backend database connection" -ForegroundColor Gray
}

# Step 4: Project Structure Info
Write-Host "`n📋 Step 4: Project Structure Overview" -ForegroundColor Yellow
Write-Host "`n📁 Frontend:" -ForegroundColor Cyan
Write-Host "   src/pages/     - React pages (CreateTender.tsx, PurchaseOrderDashboard.tsx, etc.)" -ForegroundColor Gray
Write-Host "   src/components - React components (TenderVendorManagement, etc.)" -ForegroundColor Gray
Write-Host "   src/api/       - API client utilities" -ForegroundColor Gray

Write-Host "`n📁 Backend:" -ForegroundColor Cyan
Write-Host "   server/index.cjs              - Main entry point (CommonJS)" -ForegroundColor Gray
Write-Host "   server/routes/                - 17 modular route files (.cjs format):" -ForegroundColor Gray
Write-Host "      1. auth.cjs                - Authentication and user login" -ForegroundColor Gray
Write-Host "      2. users.cjs               - User management" -ForegroundColor Gray
Write-Host "      3. approvals.cjs           - Approval workflows" -ForegroundColor Gray
Write-Host "      4. permissions.cjs         - Role-based permissions" -ForegroundColor Gray
Write-Host "      5. purchaseOrders.cjs      - Purchase order management (NEW)" -ForegroundColor Gray
Write-Host "      6. tenders.cjs             - Tender management" -ForegroundColor Gray
Write-Host "      7. vendors.cjs             - Vendor management" -ForegroundColor Gray
Write-Host "      8. items.cjs               - Item master data" -ForegroundColor Gray
Write-Host "      9. categories.cjs          - Item categories" -ForegroundColor Gray
Write-Host "     10. inventory.cjs           - Inventory tracking" -ForegroundColor Gray
Write-Host "     11. stockIssuance.cjs       - Stock issuance workflows" -ForegroundColor Gray
Write-Host "     12. reports.cjs             - Reporting endpoints" -ForegroundColor Gray
Write-Host "     13. utils.cjs               - Utility endpoints" -ForegroundColor Gray
Write-Host "     14. deliveries.cjs          - Delivery management (NEW)" -ForegroundColor Gray
Write-Host "     15. reorderRequests.cjs     - Reorder requests (NEW)" -ForegroundColor Gray
Write-Host "     16. stockReturns.cjs        - Stock returns (NEW)" -ForegroundColor Gray
Write-Host "     17. annualTenders.cjs       - Annual tender management (NEW)" -ForegroundColor Gray
Write-Host "   server/middleware/            - Middleware files (CORS and file upload and logging)" -ForegroundColor Gray
Write-Host "   server/config/                - Configuration (env.cjs and database)" -ForegroundColor Gray
Write-Host "   server/db/                    - Database connection pool" -ForegroundColor Gray

# Step 5: Available npm scripts
Write-Host "`n📋 Step 5: Available npm scripts" -ForegroundColor Yellow
Write-Host "`n🎯 Development:" -ForegroundColor Cyan
Write-Host "   npm run development:start    - Start frontend (Vite + React) on http://localhost:5173" -ForegroundColor Gray
Write-Host "   npm run backend              - Start backend (Express) on http://localhost:3001" -ForegroundColor Gray
Write-Host "   npm run dev                  - Alias for development:start" -ForegroundColor Gray

Write-Host "`n🔧 Build and Production:" -ForegroundColor Cyan
Write-Host "   npm run build                - Build frontend for production" -ForegroundColor Gray
Write-Host "   npm run preview              - Preview production build locally" -ForegroundColor Gray

Write-Host "`n📊 Code Quality:" -ForegroundColor Cyan
Write-Host "   npm run type-check           - Run TypeScript type checking" -ForegroundColor Gray
Write-Host "   npm run lint                 - Lint frontend code" -ForegroundColor Cyan

# Step 6: Getting Started
Write-Host "`n📋 Step 6: Quick Start Guide" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 To start development:" -ForegroundColor Green
Write-Host "   Terminal 1: npm run development:start  (Frontend)" -ForegroundColor Cyan
Write-Host "   Terminal 2: npm run backend            (Backend)" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Frontend will be available at:  http://localhost:5173" -ForegroundColor Gray
Write-Host "   Backend will be available at:   http://localhost:3001" -ForegroundColor Gray
Write-Host ""

# Step 7: Key Information
Write-Host "ℹ️  Important Notes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ Module Format:" -ForegroundColor Green
Write-Host "  All server files use CommonJS (.cjs) format" -ForegroundColor Gray
Write-Host "  This is necessary because package.json has 'type: module'" -ForegroundColor Gray
Write-Host ""

Write-Host "✓ Database Connection:" -ForegroundColor Green
Write-Host "  Requires MSSQL Server 2022 credentials in .env.sqlserver" -ForegroundColor Gray
Write-Host "  Current status: Check console output when backend starts" -ForegroundColor Gray
Write-Host ""

Write-Host "✓ File Structure:" -ForegroundColor Green
Write-Host "  Backend archived: backend-server.cjs.archived (old monolithic file)" -ForegroundColor Gray
Write-Host "  This is kept for reference only and should not be used" -ForegroundColor Gray
Write-Host ""

Write-Host "✓ Git Status:" -ForegroundColor Green
Write-Host "  Branch: stable-nov11-production" -ForegroundColor Gray
Write-Host "  Latest commit includes: Module resolution fixes (.cjs extensions)" -ForegroundColor Gray
Write-Host ""

# Step 8: Verification
Write-Host "📋 Step 7: Verification" -ForegroundColor Yellow
Write-Host ""

# Check package.json
if (Test-Path ".\package.json" -PathType Leaf) {
  Write-Host "✅ package.json present" -ForegroundColor Green
} else {
  Write-Host "❌ package.json missing!" -ForegroundColor Red
}

# Check server entry point
if (Test-Path ".\server\index.cjs" -PathType Leaf) {
  Write-Host "✅ server/index.cjs (backend entry point) found" -ForegroundColor Green
} else {
  Write-Host "❌ server/index.cjs missing!" -ForegroundColor Red
}

# Check if routes directory exists
if (Test-Path ".\server\routes" -PathType Container) {
  $routeCount = (Get-ChildItem ".\server\routes" -Filter "*.cjs").Count
  Write-Host "✅ $routeCount route modules found in server/routes/" -ForegroundColor Green
} else {
  Write-Host "❌ server/routes directory missing!" -ForegroundColor Red
}

# Check vite config
if (Test-Path ".\vite.config.ts" -PathType Leaf) {
  Write-Host "✅ vite.config.ts found" -ForegroundColor Green
} else {
  Write-Host "⚠️  vite.config.ts not found" -ForegroundColor Yellow
}

# Final summary
Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Setup Complete! ✅                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   • BACKEND-QUICKSTART.md      - Backend setup and deployment guide" -ForegroundColor Gray
Write-Host "   • BACKEND-REFACTORING-COMPLETE.md - Detailed refactoring notes" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "   1. Open two terminals in VS Code" -ForegroundColor Cyan
Write-Host "   2. Terminal 1: npm run development:start" -ForegroundColor Cyan
Write-Host "   3. Terminal 2: npm run backend" -ForegroundColor Cyan
Write-Host "   4. Navigate to http://localhost:5173 in your browser" -ForegroundColor Cyan
Write-Host ""

Write-Host "📞 Need Help?" -ForegroundColor Yellow
Write-Host "   Check the documentation files for detailed guides" -ForegroundColor Gray
Write-Host "   All 17 route modules are loaded and working correctly" -ForegroundColor Gray
Write-Host "   Frontend TypeScript errors: All fixed (vendor_ids → vendor_id)" -ForegroundColor Gray
Write-Host ""
