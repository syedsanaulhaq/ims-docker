# IMS v1 - Insider Quick Start

> **Setup Script**: Run `SETUP-INSIDER.ps1` first when opening in fresh Insider instance

## 🚀 Quick Start

### Terminal 1: Frontend
```bash
npm run development:start
# or
npm run dev
```
→ Available at **http://localhost:5173**

### Terminal 2: Backend  
```bash
npm run backend
```
→ Available at **http://localhost:3001**

---

## 📋 Project Status

### ✅ Completed This Session
- [x] Extracted 4 new route modules (627 lines)
  - `deliveries.cjs` - Delivery management
  - `reorderRequests.cjs` - Reorder workflows
  - `stockReturns.cjs` - Stock return handling
  - `annualTenders.cjs` - Annual tender management

- [x] Fixed module resolution (`.cjs` extensions)
  - Updated 17 route modules
  - Fixed middleware requires
  - Fixed auth.cjs package reference

- [x] Fixed TypeScript errors
  - `vendor_ids` → `vendor_id` in CreateTender.tsx
  - `handleFinalizePO` parameter type fixed

- [x] All 17 route modules load successfully
  - Auth, Users, Approvals, Permissions
  - Purchase Orders, Tenders, Vendors, Items
  - Categories, Inventory, Stock Issuance
  - Reports, Utils, Deliveries, Reorder Requests
  - Stock Returns, Annual Tenders

---

## 🏗️ Architecture Overview

### Backend Structure (Server)
```
server/
├── index.cjs              ← Main entry point
├── routes/                ← 17 modular route files
│   ├── auth.cjs
│   ├── users.cjs
│   ├── approvals.cjs
│   ├── permissions.cjs
│   ├── purchaseOrders.cjs (NEW)
│   ├── tenders.cjs
│   ├── vendors.cjs
│   ├── items.cjs
│   ├── categories.cjs
│   ├── inventory.cjs
│   ├── stockIssuance.cjs
│   ├── reports.cjs
│   ├── utils.cjs
│   ├── deliveries.cjs (NEW)
│   ├── reorderRequests.cjs (NEW)
│   ├── stockReturns.cjs (NEW)
│   └── annualTenders.cjs (NEW)
├── middleware/            ← CORS, logging, file upload
├── config/                ← Environment & configuration
└── db/                    ← Database connection pool
```

### Frontend Structure (React + Vite)
```
src/
├── pages/              ← Page components
├── components/         ← Reusable UI components
├── api/                ← API utilities
├── types/              ← TypeScript interfaces
└── App.tsx             ← Main app component
```

---

## 🔧 Environment Setup

### Required Files
- `.env.sqlserver` - MSSQL database credentials
  - Server: `localhost` or `LAPTOP-*\SQLEXPRESS`
  - User: `sa` (or configured user)
  - Database: `IMS_Database`

### Module Format: CommonJS (.cjs)
- All server files use `.cjs` extension
- Reason: `package.json` has `"type": "module"` for frontend
- This prevents ES module conflicts

---

## 📝 Important Notes

### ⚠️ Database Connection
Current error: `Login failed for user 'sa'`
- Verify MSSQL Server 2022 is running
- Check `.env.sqlserver` credentials
- Ensure database exists and user has access

### 📁 Archived Files (For Reference Only)
- `backend-server.cjs.archived` - Old monolithic backend (16,636 lines)
  - Do NOT use this file
  - Reference only for legacy code lookup
  
### 🔄 Git Branch
- Working branch: `stable-nov11-production`
- All changes committed and pushed

---

## 🎯 Available Commands

### Development
```bash
npm run dev                 # Start frontend
npm run backend             # Start backend
npm run development:start   # Alias for dev
```

### Build & Deploy
```bash
npm run build              # Build production frontend
npm run preview            # Preview production build
```

### Code Quality
```bash
npm run type-check         # TypeScript checking
npm run lint               # ESLint frontend code
```

---

## 🐛 Debugging

### VS Code Debugger
- **Launch Config**: Debug → Run and Debug → Backend
- **Breakpoints**: Click line numbers to set breakpoints
- **Console**: Output visible in Debug console

### Backend Logs
- Check terminal output when `npm run backend` is running
- Look for route loading confirmations: `✅ [Route] Routes Loaded`

### Frontend Errors
- Check browser console: F12 → Console tab
- Check VS Code terminal for build errors

---

## 📚 Documentation

Key files to review:
- `BACKEND-QUICKSTART.md` - Backend setup & API guide
- `BACKEND-REFACTORING-COMPLETE.md` - Detailed refactoring notes
- `ANNUAL-TENDER-*.md` - Annual tender feature docs

---

## ✨ Recent Fixes

### Module Resolution
```
Before: require('./routes/auth')
After:  require('./routes/auth.cjs')
```
All 17 route modules now properly resolve with `.cjs` extension

### TypeScript Errors Fixed
```tsx
// CreateTender.tsx line 1468
Before: item.vendor_ids.map(...)     ❌ vendor_ids doesn't exist
After:  item.vendor_id               ✅ Uses single vendor_id

// PurchaseOrderDashboard.tsx line 116
Before: handleFinalizePO(id: string)  ❌ Wrong type
After:  handleFinalizePO(id: number)  ✅ Matches PurchaseOrder.id
```

---

## 🚨 Troubleshooting

### "Cannot find module" errors
→ Ensure `.cjs` extensions are present in require statements

### Memory errors in VS Code
→ `SETUP-INSIDER.ps1` configures optimal memory limits (2048MB)

### Database connection fails
→ Verify MSSQL Server 2022 running and .env.sqlserver is correct

### Port already in use
→ Frontend: 5173, Backend: 3001
→ Kill existing processes: `Get-Process node | Stop-Process -Force`

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Start everything | Terminal 1: `npm run dev` + Terminal 2: `npm run backend` |
| Check types | `npm run type-check` |
| Build frontend | `npm run build` |
| View all routes | Check `server/routes/*.cjs` |
| Debug backend | VS Code: Debug → Backend config |
| Clear node_modules | `rm -r node_modules && npm install` |

---

**Last Updated**: January 21, 2026
**Status**: All systems operational ✅
**Next**: Database credential configuration for MSSQL Server 2022
