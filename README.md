# Inventory Management System (IMS) v1

A comprehensive inventory management platform built with React, TypeScript, Node.js, and SQL Server for managing stock, procurement, tenders, and approvals.

## 📋 Quick Overview

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + CommonJS
- **Database:** SQL Server (InventoryManagementDB)
- **Repository:** [GitHub - syedsanaulhaq/ims-v2](https://github.com/syedsanaulhaq/ims-v2)

## 🎯 Core Workflows

### 1. Stock Acquisition (Procurement → Tender → Award → Delivery)
Request items → Create tender → Evaluate bids → Award to vendor → Receive stock

### 2. Stock Issuance (Request → Approval → Issue → Deduction)
Request items → Approve by supervisor → Issue to requester → Deduct from inventory

### 3. Stock Verification
Physical count → Verification request → Approval → Reconciliation with system

### 4. Reorder Management
Monitor low stock → Auto-trigger reorder → Process through procurement workflow

## 📁 Project Structure

```
.
├── src/
│   ├── components/          # React components (ApprovalDashboard, etc.)
│   ├── pages/              # Page components
│   ├── services/           # API services (ApprovalForwardingService, etc.)
│   ├── types/              # TypeScript type definitions
│   └── App.tsx
├── backend-server.cjs      # Express API server with all endpoints
├── tsconfig.app.json       # TypeScript configuration
├── package.json            # Dependencies
└── docs/                   # Documentation (this folder)
```

## 🗄️ Database

**Database Name:** `InventoryManagementDB` (SQL Server)

### Key Tables

| Table | Purpose |
|-------|---------|
| `item_masters` | Master item registry (15 items) |
| `current_inventory_stock` | Current stock levels |
| `stock_issuance_requests` | Issuance request tracking |
| `procurement_requests` | Procurement request tracking |
| `tenders` | Tender management |
| `tender_items` | Items in tenders |
| `approvals` | Individual item approvals |
| `approval_workflows` | Approval workflow tracking |
| `AspNetUsers` | User authentication (499 users) |
| `categories` | Item categories (7 total) |
| `vendors` | Vendor registry (7 total) |

For complete schema details, see [DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- SQL Server with InventoryManagementDB
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/syedsanaulhaq/ims-v2.git
cd ims-v1

# Install dependencies
npm install

# Configure environment
# Update backend-server.cjs database connection settings

# Start backend server
node backend-server.cjs

# In another terminal, start frontend
npm run dev
```

### Database Connection

Update database connection in `backend-server.cjs`:
```javascript
const config = {
  user: 'your_user',
  password: 'your_password',
  server: 'your_server',
  database: 'InventoryManagementDB'
};
```

## 🔑 Key APIs

### Approvals
- `GET /api/approvals/my-approvals` - Get pending approvals
- `POST /api/approvals/approve` - Approve items
- `POST /api/approvals/reject` - Reject items
- `POST /api/approvals/forward` - Forward to next approver

### Stock Issuance
- `GET /api/stock-issuance/requests` - List requests
- `POST /api/stock-issuance/create` - Create request
- `POST /api/stock-issuance/approve` - Approve issuance

### Inventory
- `GET /api/inventory-stock` - Get current stock
- `POST /api/inventory-stock/update` - Update stock levels

### Procurement
- `POST /api/procurement/create` - Create procurement request
- `GET /api/procurement/list` - List procurement requests

## 👥 User Roles

- **Admin:** Full system access
- **Requester:** Submit requests
- **Supervisor:** Approve requests from team
- **Wing Manager:** Approve across wing
- **Vendor:** Submit bids for tenders

## 📊 System Features

✅ Multi-level approval workflow  
✅ Per-item approval decisions  
✅ Tender management with bidding  
✅ Stock tracking and reconciliation  
✅ User authentication (AspNetUsers)  
✅ Comprehensive audit trail  
✅ Request history tracking  

## ⚙️ Current Status

- **Database:** Clean, 15 items with 100 units each
- **Code Quality:** 0 TypeScript errors
- **All APIs:** Fully functional
- **Testing:** Ready for end-to-end testing

## 📖 Documentation

- [Development Standards & Guidelines](docs/DEVELOPMENT-STANDARDS.md)
- [API Reference](docs/API-REFERENCE.md)
- [Database Schema](docs/DATABASE-SCHEMA.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Workflow Documentation](docs/WORKFLOWS.md)
- [Testing Guide](docs/TESTING.md)

## 🔧 Development

All code follows standards defined in [DEVELOPMENT-STANDARDS.md](docs/DEVELOPMENT-STANDARDS.md).

### Code Style
- TypeScript with strict mode
- Component-based architecture
- Service layer pattern
- RESTful API design

### Committing Code
```bash
git add .
git commit -m "feat: description" or "fix: description"
git push origin stable-nov11-production
```

## ❓ Troubleshooting

**Database Connection Issues:**
- Verify SQL Server is running
- Check credentials in backend-server.cjs
- Ensure InventoryManagementDB exists

**Port Conflicts:**
- Backend: Change port in backend-server.cjs (default 3000)
- Frontend: Vite uses 5173 by default

**TypeScript Errors:**
- Run: `npm run build`
- Check tsconfig.app.json settings

## 📞 Support

For issues or questions:
1. Check [Documentation](docs/)
2. Review [Troubleshooting](docs/TROUBLESHOOTING.md)
3. Check GitHub Issues

## 📄 License

Proprietary - Confidential

---

**Last Updated:** December 28, 2025  
**Version:** 1.0  
**Status:** Production Ready
