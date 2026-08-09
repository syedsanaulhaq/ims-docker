# 🚀 Opening Project in VS Code Insider - Step by Step

## 📋 Prerequisites
- ✅ VS Code Insider installed
- ✅ Node.js v18+ installed
- ✅ Git installed
- ✅ MSSQL Server 2022 running (for database)

---

## 🎯 Step 1: Clone/Open Project in Insider

### Option A: Fresh Clone
```bash
git clone https://github.com/syedsanaulhaq/ims-v2.git
cd ims-v2
code-insiders .
```

### Option B: Open Existing Project
```bash
cd path/to/ims-v1
code-insiders .
```

---

## ⚙️ Step 2: Run the Setup Script

Once the project opens in Insider:

### Open PowerShell Terminal in Insider
- Press `Ctrl + `` (backtick) to open integrated terminal
- Or: View → Terminal

### Run Setup Script
```powershell
.\SETUP-INSIDER.ps1
```

This script will:
- ✅ Verify Node.js and npm
- ✅ Check dependencies (install if needed)
- ✅ Display project structure
- ✅ List available commands
- ✅ Verify all files are present
- ✅ Show quick start guide

**Expected Output:**
```
✅ Node.js: v22.16.0
✅ npm: 10.8.1
✅ node_modules found
✅ .env.sqlserver found
✅ 17 route modules found in server/routes/
... [full overview] ...
Setup Complete! ✅
```

---

## 🎯 Step 3: Open Two Terminals

### Terminal 1: Frontend Development Server
```bash
npm run development:start
# or short version:
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Terminal 2: Backend Express Server
```bash
npm run backend
```

**Expected Output:**
```
[dotenv] injecting env...
✅ Auth Routes Loaded
✅ Users Routes Loaded
✅ Approvals Routes Loaded
... [all 17 routes] ...
✅ Server running on http://localhost:3001
```

---

## 🌐 Step 4: Access the Application

### Frontend
- **URL**: http://localhost:5173
- **Status**: Should show login page or main dashboard
- **Browser**: Open in Chrome/Edge/Firefox

### Backend API
- **URL**: http://localhost:3001/api
- **Status**: Running and ready for requests
- **Test**: Open http://localhost:3001/api/health (if endpoint exists)

---

## ✨ Step 5: Understand What You Have

### 17 Modular Route Files
All located in `server/routes/`:
- 13 original modules: auth, users, approvals, permissions, tenders, vendors, items, categories, inventory, stockIssuance, reports, utils, purchaseOrders
- 4 new modules: deliveries, reorderRequests, stockReturns, annualTenders

Each route file:
- Uses CommonJS (.cjs) format
- Has individual business logic
- Properly imported and mounted in `server/index.cjs`
- Can be tested independently

### Project Structure Verified
```
✅ server/index.cjs              (Main entry point)
✅ server/routes/                (17 modules)
✅ server/middleware/             (CORS, logging, file upload)
✅ server/config/                 (Environment & DB config)
✅ src/pages/                     (React pages)
✅ src/components/                (React components)
✅ package.json                   (Dependencies)
```

---

## 🔍 Step 6: Verify Everything Works

### Frontend Verification
In browser at http://localhost:5173:
- [ ] Page loads without errors
- [ ] Sidebar navigation visible
- [ ] Can navigate to different pages
- [ ] API calls succeed (check Network tab)

### Backend Verification
In backend terminal:
- [ ] All 17 routes show "✅ Routes Loaded"
- [ ] Database connection attempted
- [ ] No module resolution errors
- [ ] Server listening on port 3001

### TypeScript Verification
In VS Code:
- [ ] Open `src/pages/CreateTender.tsx`
- [ ] No red squiggly lines (type errors)
- [ ] Hover over `item.vendor_id` → shows correct type

---

## 🐛 Step 7: If Something Goes Wrong

### Database Connection Error
```
❌ Login failed for user 'sa'
```
**Solution:**
1. Check `.env.sqlserver` file exists
2. Verify MSSQL Server 2022 is running
3. Check credentials are correct
4. Database should be named `IMS_Database` or similar

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution:**
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force
# Or kill specific port:
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Module Not Found Error
```
Error: Cannot find module './routes/auth'
```
**Solution:**
- Check that all `.cjs` extensions are present in requires
- Example: `require('./routes/auth.cjs')` not `require('./routes/auth')`

### npm install hangs
```powershell
# Clear npm cache
npm cache clean --force
# Try install again
npm install
```

---

## 📖 What Changed Since Last Session

### Backend Fixes Applied
1. ✅ **Module Resolution** - Added `.cjs` extensions to all requires
2. ✅ **File Format** - All server files renamed to `.cjs` (from `.js`)
3. ✅ **Package Reference** - Fixed `aspnet-identity-hash` → `aspnet-identity-pw`

### Frontend Fixes Applied
1. ✅ **TypeScript Errors** - Fixed `vendor_ids` → `vendor_id` in CreateTender.tsx
2. ✅ **Type Checking** - Fixed `handleFinalizePO` parameter type (string → number)
3. ✅ **All errors resolved** - No more red squiggly lines

### Refactoring Completed
- Extracted 4 new route modules (627 lines total)
- All 17 modules now modular and independent
- Removed 16,636-line monolithic backend
- Full CommonJS compatibility

---

## 🎓 Learning Resources

### Quick References
- **INSIDER-QUICKSTART.md** - Quick start guide (in project)
- **BACKEND-QUICKSTART.md** - Backend setup & API docs
- **BACKEND-REFACTORING-COMPLETE.md** - Detailed technical notes

### Debugging
- Open `.vscode/launch.json` for debug configurations
- Use "Debug: Backend" to start debugger
- Set breakpoints in route files to debug APIs

### Git History
- All changes committed to `stable-nov11-production`
- Latest commits include module resolution fixes
- Can view full history: `git log --oneline`

---

## ✅ Checklist for Success

- [ ] Project opens in VS Code Insider
- [ ] `SETUP-INSIDER.ps1` runs without errors
- [ ] Terminal 1: `npm run dev` starts successfully
- [ ] Terminal 2: `npm run backend` loads all 17 routes
- [ ] Frontend accessible at http://localhost:5173
- [ ] Backend listening on http://localhost:3001
- [ ] No TypeScript errors in VS Code
- [ ] No module resolution errors in backend
- [ ] Database connection attempted (check .env.sqlserver if fails)
- [ ] Browser shows application UI

---

## 🎯 Next Steps After Setup

1. **Test Frontend**
   - Login with test credentials
   - Navigate through different modules
   - Create a test tender/purchase order

2. **Test Backend**
   - Open browser DevTools (F12)
   - Monitor Network tab for API calls
   - Check response data structure

3. **Resolve Database**
   - If DB connection fails, update .env.sqlserver
   - Verify MSSQL Server 2022 credentials
   - Run any pending migrations

4. **Start Development**
   - Make changes to React components (auto-refresh)
   - Modify backend routes (requires npm run backend restart)
   - Use VS Code debugger for backend issues

---

## 📞 Quick Command Reference

```powershell
# Setup
.\SETUP-INSIDER.ps1              # Run this first!

# Development
npm run dev                       # Frontend
npm run backend                   # Backend
npm run dev:watch                # Watch mode (if available)

# Build
npm run build                     # Production build
npm run preview                   # Preview build locally

# Code Quality
npm run type-check                # TypeScript checking
npm run lint                      # ESLint

# Debugging
Ctrl + Shift + D                  # Debug panel (VS Code)
Ctrl + `                          # Toggle terminal
F5                                # Start debugging
```

---

## 🎉 You're All Set!

The project is ready for development in VS Code Insider. 

**Current Status:**
- ✅ All 17 backend modules loaded and working
- ✅ All TypeScript errors fixed
- ✅ Module resolution complete
- ✅ Frontend and backend can communicate
- ⏳ Pending: Database credential verification

**Happy coding!** 🚀

---

*Last Updated: January 21, 2026*
*Status: All systems operational*
