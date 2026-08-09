# 📦 IMS v1 - VS Code Insider Setup Package

> Everything VS Code Insider needs to understand your project

## 🚀 Quick Start (3 Steps)

### 1️⃣ Open Project in Insider
```bash
code-insiders /path/to/project
```

### 2️⃣ Run Setup Script
```powershell
.\SETUP-INSIDER.ps1
```

### 3️⃣ Start Development
```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run backend
```

Then open **http://localhost:5173** in your browser 🎉

---

## 📁 What's in This Package?

### Setup Files (Read These First!)
| File | Purpose |
|------|---------|
| **SETUP-INSIDER.ps1** | PowerShell script to verify and configure environment |
| **INSIDER-SETUP-GUIDE.md** | Step-by-step guide for opening in Insider |
| **INSIDER-QUICKSTART.md** | Quick reference for commands and shortcuts |

### Documentation Files
| File | Purpose |
|------|---------|
| **BACKEND-QUICKSTART.md** | Backend setup, API endpoints, deployment |
| **BACKEND-REFACTORING-COMPLETE.md** | Technical details of 17-module refactoring |
| **ANNUAL-TENDER-*.md** | Feature documentation (multiple files) |

### VS Code Configuration
| File | Purpose |
|------|---------|
| **.vscode/settings.json** | Memory optimization, exclusions, language settings |
| **.vscode/launch.json** | Debug configuration for backend (Node.js) |

---

## 🎯 Key Information for Insider

### Project Statistics
- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js with 17 modular route files
- **Database**: MSSQL Server 2022
- **Module Format**: CommonJS (.cjs) for all server files

### Recent Work Completed
✅ Extracted 4 new route modules (deliveries, reorderRequests, stockReturns, annualTenders)  
✅ Fixed module resolution (.cjs extensions)  
✅ Fixed all TypeScript errors  
✅ All 17 route modules loading successfully  

### Current Status
- **Backend**: ✅ All routes loaded, ⏳ Database auth pending
- **Frontend**: ✅ All components compiled, ✅ No TypeScript errors
- **Module Resolution**: ✅ Complete with .cjs extensions
- **Testing**: Ready for development workflow

---

## 🔧 Environment Setup

### Required
- Node.js v18+ (check with `node --version`)
- npm 10+ (check with `npm --version`)
- MSSQL Server 2022 running locally
- `.env.sqlserver` file with credentials

### Optional
- VS Code Insider extensions:
  - ES7+ React/Redux/React-Native snippets
  - Thunder Client (API testing)
  - SQL Server (mssql)

---

## 📝 Files Structure Overview

```
project/
├── SETUP-INSIDER.ps1           ← Run this first!
├── INSIDER-SETUP-GUIDE.md      ← Detailed instructions
├── INSIDER-QUICKSTART.md       ← Quick reference
│
├── server/                      ← Backend (Express)
│   ├── index.cjs               ← Entry point
│   ├── routes/                 ← 17 modular files (.cjs)
│   │   ├── auth.cjs
│   │   ├── users.cjs
│   │   ├── ... 15 more
│   ├── middleware/             ← CORS, logging, upload
│   ├── config/                 ← Environment config
│   └── db/                     ← Database connection
│
├── src/                         ← Frontend (React)
│   ├── pages/                  ← Page components
│   ├── components/             ← Reusable UI
│   ├── api/                    ← API utilities
│   ├── types/                  ← TypeScript interfaces
│   └── App.tsx                 ← Main app
│
├── .vscode/
│   ├── settings.json           ← VS Code config
│   └── launch.json             ← Debug config
│
├── package.json                ← Dependencies
└── vite.config.ts              ← Frontend build config
```

---

## 🚀 Available Commands

### Development
```bash
npm run dev                  # Start frontend (port 5173)
npm run backend              # Start backend (port 3001)
npm run development:start    # Alias for npm run dev
```

### Build & Deploy
```bash
npm run build                # Build for production
npm run preview              # Preview production build
```

### Code Quality
```bash
npm run type-check           # TypeScript type checking
npm run lint                 # ESLint linting
```

---

## ✨ What Insider Needs to Know

### Backend Architecture
- **17 Route Modules**: Each module is a complete feature (auth, users, tenders, etc.)
- **CommonJS Format**: All files use `.cjs` extension (not `.js` or `.mjs`)
- **Module Resolution**: All requires include `.cjs` extension explicitly
- **Database Pool**: Connection pool shared across all routes

### Frontend Architecture
- **React Components**: Modular, typed with TypeScript
- **API Calls**: Centralized in `src/api/` for easy testing
- **Type Safety**: Full TypeScript support with no errors
- **State Management**: Likely React hooks or context (check App.tsx)

### Recent Fixes Applied
1. **Module Resolution**: `require('./routes/auth')` → `require('./routes/auth.cjs')`
2. **TypeScript**: `vendor_ids: string[]` → `vendor_id: string` (single vendor)
3. **Type Checking**: Fixed parameter types in PurchaseOrderDashboard
4. **Package Reference**: `aspnet-identity-hash` → `aspnet-identity-pw`

---

## 🐛 Common Issues & Solutions

### Backend won't start
```
❌ Cannot find module 'X'
→ Check .cjs extensions in require statements
→ Run: .\SETUP-INSIDER.ps1
```

### Database connection fails
```
❌ Login failed for user 'sa'
→ Verify .env.sqlserver file exists
→ Check MSSQL Server 2022 is running
→ Verify credentials are correct
```

### Port already in use
```
❌ EADDRINUSE: address already in use :::3001
→ Kill Node processes: Get-Process node | Stop-Process -Force
```

### TypeScript errors in editor
```
❌ Property 'X' does not exist
→ Recent fix: vendor_ids → vendor_id
→ Run: npm run type-check
```

---

## 📚 Documentation Files

For more details, see:

- **INSIDER-SETUP-GUIDE.md** - Complete step-by-step setup
- **INSIDER-QUICKSTART.md** - Quick reference guide
- **BACKEND-QUICKSTART.md** - Backend API documentation
- **BACKEND-REFACTORING-COMPLETE.md** - Technical deep dive

---

## 🎓 Key Concepts

### Why .cjs Format?
- `package.json` has `"type": "module"` (for React)
- But backend needs CommonJS (for compatibility)
- Solution: Use `.cjs` extension for all server files
- This prevents ES module conflicts

### 17 Modular Routes
Instead of one 16,636-line file, we have:
- 17 separate, focused modules
- Each handles one feature
- Easier to test, debug, maintain
- Can be deployed separately if needed

### Git History
- All changes committed to `stable-nov11-production`
- Latest commits show module resolution fixes
- Can view with: `git log --oneline`

---

## ✅ Success Checklist

After running setup, verify:
- [ ] No Node.js or npm errors
- [ ] node_modules directory exists
- [ ] All 17 route files found in server/routes/
- [ ] .env.sqlserver file confirmed
- [ ] Frontend starts with `npm run dev`
- [ ] Backend loads all 17 routes
- [ ] No TypeScript errors in VS Code
- [ ] Can access http://localhost:5173

---

## 🎉 You're Ready!

VS Code Insider now has all the context it needs:
- ✅ Project structure documented
- ✅ Setup script provided
- ✅ Quick reference guides included
- ✅ Configuration files optimized
- ✅ Recent fixes documented
- ✅ Troubleshooting guide available

**Start with**: `.\SETUP-INSIDER.ps1`

**Then read**: `INSIDER-SETUP-GUIDE.md`

**Happy coding!** 🚀

---

*Created: January 21, 2026*  
*Status: Ready for development*  
*Branch: stable-nov11-production*
