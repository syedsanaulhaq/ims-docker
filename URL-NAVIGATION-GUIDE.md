# 🌐 Annual Tender System - URL Navigation Guide

## Application URLs

### Frontend Application
**Main App:** http://localhost:8080
**Dashboard:** http://localhost:8080/dashboard

### Backend API Server
**Base URL:** http://localhost:3001
**Status:** http://localhost:3001/status (if available)

---

## 🔗 ANNUAL TENDER PAGES (Direct Links)

### 1. Annual Tender Management
**URL:** http://localhost:8080/dashboard/annual-tenders
**Purpose:** Create and manage year-long vendor contracts
**Key Actions:**
- View all annual tenders
- Create new tender
- View tender details
- Filter by status

**What to do:**
1. Click "Create Annual Tender" button
2. Fill form:
   - Tender Number: AT-2024-001
   - Title: Annual Tender 2024-2025
   - Start Date: (auto-filled today)
   - End Date: (auto-filled 1 year later)
   - Total Budget: 500000
3. Select Item Groups
4. Click "Create Tender"

---

### 2. Item Groups Manager
**URL:** http://localhost:8080/dashboard/item-groups
**Purpose:** Create product groups for tenders
**Key Actions:**
- View all item groups
- Create new group
- Add items to group
- Delete groups

**What to do:**
1. Click "Create Item Group" button
2. Fill form:
   - Group Code: FUR-G1
   - Group Name: Furniture Group 1
   - Description: All furniture items
3. Check items to include
4. Click "Create Group"

---

### 3. Vendor Assignment Manager
**URL:** http://localhost:8080/dashboard/vendor-assignment
**Purpose:** Assign vendors to item groups in tenders
**Key Actions:**
- Select tender
- Assign vendors to groups
- Remove vendor from group
- View assignments

**What to do:**
1. Select Annual Tender from dropdown
2. For each group:
   - Click "Add Vendors"
   - Multi-select vendors
   - Click "Confirm Assignment"
3. Remove vendors with X button

---

### 4. Vendor Proposals Grid
**URL:** http://localhost:8080/dashboard/vendor-proposals
**Purpose:** Enter item-wise pricing for vendors
**Key Actions:**
- Select tender and vendor
- View pricing proposals
- Add new proposal
- Edit prices inline

**What to do:**
1. Select Tender from dropdown
2. Select Vendor from dropdown
3. View proposals in table
4. Click "Add Proposal" to add pricing
5. Click "Edit" to change price, then "Save"

---

## 🔌 API ENDPOINTS

### Base URL: http://localhost:3001

### Annual Tenders Endpoints
```
GET    /api/annual-tenders
       List all annual tenders

POST   /api/annual-tenders
       Create new annual tender
       Body: {tender_number, title, description, start_date, end_date, total_budget, groupIds}

GET    /api/annual-tenders/:id
       Get specific tender with groups and vendors

Example curl:
curl http://localhost:3001/api/annual-tenders
```

### Item Groups Endpoints
```
GET    /api/item-groups
       List all item groups

POST   /api/item-groups
       Create new item group
       Body: {group_code, group_name, description, itemIds}

GET    /api/item-groups/:groupId/items
       Get items in specific group

Example curl:
curl http://localhost:3001/api/item-groups
```

### Vendor Assignment Endpoints
```
POST   /api/annual-tenders/:tenderId/assign-vendors
       Assign vendors to groups
       Body: {assignments: [{groupId, vendorIds}]}

GET    /api/annual-tenders/:tenderId/groups/:groupId/vendors
       Get vendors assigned to group

Example curl:
curl http://localhost:3001/api/annual-tenders/[TENDER-ID]/groups/[GROUP-ID]/vendors
```

### Vendor Proposals Endpoints
```
POST   /api/vendor-proposals
       Create or update proposal (upsert)
       Body: {annual_tender_id, vendor_id, item_master_id, proposed_unit_price}

GET    /api/annual-tenders/:tenderId/vendor-proposals?vendorId=...
       Get proposals for tender (optional vendor filter)

Example curl:
curl -X POST http://localhost:3001/api/vendor-proposals \
  -H "Content-Type: application/json" \
  -d '{"annual_tender_id":"[ID]","vendor_id":"[ID]","item_master_id":"[ID]","proposed_unit_price":5000}'
```

---

## 🛣️ NAVIGATION FLOW

### User Journey Map
```
Home/Dashboard
    ↓
Click "Annual Tenders" in menu
    ↓
/dashboard/annual-tenders
    ├─ Can view existing tenders
    ├─ Can create new tender
    └─ Must select item groups (create in Item Groups first!)
    
Item Groups Setup (if needed)
    ↓
/dashboard/item-groups
    ├─ View existing groups
    ├─ Create new groups
    └─ Add items to groups
    
Vendor Assignment
    ↓
/dashboard/vendor-assignment
    ├─ Select tender
    ├─ For each group, add vendors
    └─ Remove vendors as needed
    
Pricing Management
    ↓
/dashboard/vendor-proposals
    ├─ Select tender & vendor
    ├─ View item prices
    ├─ Add new proposals
    └─ Edit prices inline
```

---

## 🔑 KEY ELEMENTS

### Button Labels to Click

**Annual Tenders Page:**
- "Create Annual Tender" → Opens dialog
- "View" → Opens details modal
- X on card → Close modal

**Item Groups Page:**
- "Create Item Group" → Opens dialog
- 🗑️ (trash icon) → Delete group
- Checkbox in dialog → Select items

**Vendor Assignment Page:**
- "Add Vendors" → Opens assignment dialog
- X on vendor → Remove vendor
- Dropdown → Change tender
- Dropdown → Change group

**Vendor Proposals Page:**
- "Add Proposal" → Opens add dialog
- "Edit" → Makes price editable
- "Save" → Saves new price
- Dropdown → Filter by tender
- Dropdown → Filter by vendor

---

## 📋 TYPICAL WORKFLOW URLs

### Setup Initial Data (First Time)
```
1. http://localhost:8080/dashboard/item-groups
   → Create "Furniture Group 1" with chairs, tables
   → Create "Stationary Group 1" with paper, pens
   
2. http://localhost:8080/dashboard/vendors
   → Verify vendors exist in system
   (Optional: Create new vendors if needed)
```

### Create Annual Tender
```
http://localhost:8080/dashboard/annual-tenders
→ Create Tender AT-2024-001
→ Select groups: Furniture G1, Stationary G1
→ Set budget: 500,000 PKR
```

### Assign Vendors
```
http://localhost:8080/dashboard/vendor-assignment
→ Select: AT-2024-001
→ For Furniture Group 1:
   - Add Vendor A, Vendor B
→ For Stationary Group 1:
   - Add Vendor C, Vendor D
```

### Enter Pricing
```
http://localhost:8080/dashboard/vendor-proposals
→ Select Tender: AT-2024-001
→ For Vendor A:
   → Add Proposal: Chair = 5,000 PKR
   → Add Proposal: Table = 15,000 PKR
→ For Vendor B:
   → Add Proposal: Chair = 4,800 PKR
   → Add Proposal: Table = 14,500 PKR
```

---

## 🧪 API TESTING WITH CURL

### Test Annual Tenders List
```bash
curl http://localhost:3001/api/annual-tenders
```

### Test Item Groups List
```bash
curl http://localhost:3001/api/item-groups
```

### Test Vendors List
```bash
curl http://localhost:3001/api/vendors
```

### Create Annual Tender (POST)
```bash
curl -X POST http://localhost:3001/api/annual-tenders \
  -H "Content-Type: application/json" \
  -d '{
    "tender_number":"AT-2024-001",
    "title":"Annual Tender 2024-2025",
    "description":"Year-long contract",
    "start_date":"2024-01-01",
    "end_date":"2024-12-31",
    "total_budget":500000,
    "groupIds":["group-uuid-1","group-uuid-2"]
  }'
```

### Create Item Group (POST)
```bash
curl -X POST http://localhost:3001/api/item-groups \
  -H "Content-Type: application/json" \
  -d '{
    "group_code":"FUR-G1",
    "group_name":"Furniture Group 1",
    "description":"All furniture items",
    "itemIds":["item-uuid-1","item-uuid-2"]
  }'
```

### Add Vendor Proposal (POST)
```bash
curl -X POST http://localhost:3001/api/vendor-proposals \
  -H "Content-Type: application/json" \
  -d '{
    "annual_tender_id":"tender-uuid",
    "vendor_id":"vendor-uuid",
    "item_master_id":"item-uuid",
    "proposed_unit_price":5000
  }'
```

---

## 📱 RESPONSIVE DESIGN

### Desktop View
- Full table display
- Side-by-side cards
- Large modals
- Optimal at 1920x1080+

### Tablet View (768px - 1024px)
- Stacked layout where needed
- Card grid: 2 columns
- Full functionality

### Mobile View (< 768px)
- Single column layout
- Full-width forms
- Touch-friendly buttons
- Modal fills screen

---

## ⚙️ TECHNICAL URLS

### Server Processes
```
Backend Server: http://localhost:3001
Frontend Dev Server: http://localhost:8080
Frontend App: http://localhost:8080/dashboard
Frontend App Routes: http://localhost:8080/dashboard/*
```

### API Health Check
```
GET http://localhost:3001/api/annual-tenders
If responsive → API working ✅
If timeout → Check backend server
If 404 → Check routes in backend
```

### Component Access
```
All pages are under /dashboard route
All require authentication
All use Layout wrapper
All have error handling
```

---

## 🔍 DEBUGGING URLS & TOOLS

### Browser DevTools
Press F12 to open:
- Console tab → Check for errors
- Network tab → See API calls
- Application tab → Check storage/session
- Elements tab → Inspect components

### API Testing Tools
```
Option 1: Browser address bar
http://localhost:3001/api/annual-tenders

Option 2: Postman
http://localhost:3001/api/annual-tenders
Method: GET

Option 3: curl (command line)
curl http://localhost:3001/api/annual-tenders

Option 4: VS Code REST Client
GET http://localhost:3001/api/annual-tenders
```

### Database Connection Test
```
Server: localhost (or SYED-FAZLI-LAPT)
Port: Default (1433)
Database: InventoryManagementDB
Auth: Windows Authentication or SQL Auth
```

---

## 📊 URL PARAMETERS

### Filter Annual Tenders
```
GET http://localhost:3001/api/annual-tenders?status=Active
Status values: Draft, Active, Closed, Expired
```

### Filter Vendor Proposals
```
GET http://localhost:3001/api/annual-tenders/{id}/vendor-proposals?vendorId={vendor-id}
Returns proposals for specific vendor in tender
```

### Get Tender Groups
```
GET http://localhost:3001/api/annual-tenders/{id}
Returns tender with array of groups
```

---

## 🔒 AUTHENTICATION URLs

### Login Page
```
URL: http://localhost:8080/login
Required: Before accessing /dashboard
Session: Stored in localStorage
Logout: Through user menu
```

### Protected Routes
```
All /dashboard/* routes protected
All require valid session
Session check on route navigation
Auto-redirect to login if expired
```

---

## 💾 DATABASE URLS

### SQL Server Connection
```
Server: SYED-FAZLI-LAPT\SQLEXPRESS (local)
Port: 1433
Database: InventoryManagementDB
Tables: 11 new tables for annual tenders

To Connect:
SQL Server Management Studio → Connect → Server name: SYED-FAZLI-LAPT
```

### Table Access
```
Tables in schema: dbo (default)
annual_tenders table
annual_tender_groups table
annual_tender_vendors table
vendor_proposals table
item_groups table
group_items table
purchase_orders table
purchase_order_items table
po_deliveries table
po_delivery_items table
po_delivery_item_serial_numbers table
```

---

## 🎯 QUICK REFERENCE

| Task | URL |
|------|-----|
| View Tenders | http://localhost:8080/dashboard/annual-tenders |
| Create Tender | http://localhost:8080/dashboard/annual-tenders (click button) |
| Manage Groups | http://localhost:8080/dashboard/item-groups |
| Assign Vendors | http://localhost:8080/dashboard/vendor-assignment |
| Enter Pricing | http://localhost:8080/dashboard/vendor-proposals |
| API Tenders | http://localhost:3001/api/annual-tenders |
| API Groups | http://localhost:3001/api/item-groups |
| Backend Health | http://localhost:3001 |
| Frontend Health | http://localhost:8080 |

---

## ✅ VERIFICATION CHECKLIST

- [ ] http://localhost:8080 loads (frontend)
- [ ] http://localhost:8080/dashboard loads (after login)
- [ ] http://localhost:8080/dashboard/annual-tenders loads
- [ ] http://localhost:8080/dashboard/item-groups loads
- [ ] http://localhost:8080/dashboard/vendor-assignment loads
- [ ] http://localhost:8080/dashboard/vendor-proposals loads
- [ ] http://localhost:3001/api/annual-tenders responds (backend)
- [ ] http://localhost:3001/api/item-groups responds
- [ ] Backend server running (npm run backend)
- [ ] Frontend server running (npm run dev)

---

**All URLs working = System Ready ✅**

---

*Last Updated: 2024*
*Version: 1.0.0*
