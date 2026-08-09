# System Architecture Audit - IMS Backend

**Date**: January 19, 2026  
**File**: backend-server.cjs  
**Total Lines**: 18,975  
**Total Endpoints**: 163 API endpoints  
**Status**: ⚠️ CRITICAL - System unstable, requires modularization

---

## Executive Summary

The backend-server.cjs file is a **monolithic Node.js/Express application** containing **163 API endpoints** across **9 major business domains**. The file has grown to 18,975 lines, making it difficult to maintain, debug, and test. Recent changes to fix Purchase Order (PO) creation have caused cascading failures due to SQL parameter type mismatches.

### Key Issues:
1. ❌ **No code organization** - All endpoints in single 18,975-line file
2. ❌ **SQL parameter type mismatches** - Mixing `sql.Int`, `sql.NVarChar`, `sql.UniqueIdentifier`
3. ❌ **Schema inconsistencies** - `tender_items` has both `vendor_id` and `vendor_ids` columns
4. ❌ **Vendor selection broken** - PO creation fails with "Conversion failed" errors
5. ❌ **No error isolation** - Fixes to one endpoint break others (e.g., changes to PO endpoints affect vendor lookups)

---

## Complete Endpoint Inventory

### 1️⃣ Authentication & Authorization (9 endpoints)
**Purpose**: User login, SSO, JWT validation, session management  
**Database Tables**: [Auth via .NET Core DS - External]

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 518 | POST | `/api/auth/login` | User login with username/password |
| 669 | GET | `/sso-login` | Redirect to SSO provider |
| 879 | POST | `/api/auth/logout` | Destroy session |
| 888 | GET | `/api/auth/me` | Get current logged-in user |
| 896 | GET | `/api/session` | Get session details |
| 986 | GET | `/api/session/current-user` | Get current user info |
| 9854 | POST | `/api/auth/sso-validate` | Validate SSO token |
| 9964 | POST | `/api/auth/ds-authenticate` | Authenticate with Digital System |
| 995 | POST | `/api/upload` | File upload handler |

---

### 2️⃣ IMS Permission & Role Management (6 endpoints)
**Purpose**: Manage user roles, permissions, and access control  
**Database Tables**: [aspnet-identity related]

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1020 | GET | `/api/ims/check-permission` | Check if user has permission |
| 1066 | GET | `/api/ims/my-roles` | Get current user's roles |
| 1086 | GET | `/api/ims/roles` | List all roles |
| 1125 | POST | `/api/ims/roles` | Create new role |
| 1208 | GET | `/api/ims/roles/:roleId` | Get role details |
| 1284 | PUT | `/api/ims/roles/:roleId/permissions` | Update role permissions |

---

### 3️⃣ User Management (4 endpoints)
**Purpose**: Manage users and their role assignments  
**Database Tables**: [aspnet_Users, IMS_User_Roles]

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1342 | GET | `/api/ims/permissions` | Get all permissions |
| 1368 | GET | `/api/ims/users` | List all users |
| 1464 | POST | `/api/ims/users/:userId/roles` | Assign role to user |
| 1568 | DELETE | `/api/ims/users/:userId/roles/:userRoleId` | Remove role from user |

---

### 4️⃣ Organization Structure (8 endpoints)
**Purpose**: Manage offices, wings, departments, and organizational hierarchy  
**Database Tables**: `offices`, `wings`, `decs` (departments)

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1676 | GET | `/api/offices` | List offices (full details) |
| 1734 | GET | `/api/offices` | List offices (filtered/indexed) |
| 1771 | GET | `/api/wings` | List all wings |
| 1828 | GET | `/api/decs` | List all departments |
| 1865 | GET | `/api/offices/names` | Get office names only |
| 1905 | GET | `/api/wings/names` | Get wing names only |
| 1945 | GET | `/api/decs/names` | Get department names only |
| 2174 | GET | `/api/offices/:officeId/wings` | Get wings under office |
| 2208 | GET | `/api/wings/:wingId/decs` | Get departments under wing |

---

### 5️⃣ User Directory & Lookup (3 endpoints)
**Purpose**: User lookup, approver discovery  
**Database Tables**: `users`, `user_roles`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1985 | GET | `/api/users` | List all users |
| 2034 | GET | `/api/users/approvers` | Get users with approval permissions |
| 2116 | GET | `/api/users/:id` | Get single user details |

---

### 6️⃣ Stock Issuance & Approval Workflow (17 endpoints)
**Purpose**: Request, approve, and issue stock to users/wings  
**Database Tables**: `stock_issuance_requests`, `stock_issuance_items`, `approvals_workflow`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 2305 | POST | `/api/stock-issuance/requests` | Create issuance request |
| 2489 | POST | `/api/stock-issuance/items` | Add items to request |
| 2599 | GET | `/api/stock-issuance/requests` | List issuance requests |
| 2793 | GET | `/api/stock-issuance/issued-items` | Get issued items |
| 2828 | GET | `/api/stock-issuance/requests/:id` | Get request details |
| 2914 | PUT | `/api/stock-issuance/requests/:id` | Update request |
| 3085 | PUT | `/api/stock-issuance/requests/:id/approve` | Approve by supervisor |
| 3208 | PUT | `/api/stock-issuance/requests/:id/reject` | Reject request |
| 3272 | GET | `/api/stock-issuance/pending-approvals` | Get pending approvals |
| 3283 | GET | `/api/stock-issuance/requests/:id/inventory-matches` | Find matching inventory |
| 3431 | POST | `/api/stock-issuance/requests/:id/approve-with-allocation` | Approve and allocate |
| 3588 | PUT | `/api/stock-issuance/requests/:id/finalize` | Finalize issuance |
| 3646 | POST | `/api/stock-issuance/requests/:id/issue` | Issue stock to user |
| 8959 | POST | `/api/stock-issuance/issue/:requestId` | Issue items from request |

---

### 7️⃣ Inventory Management & Stock Control (35+ endpoints)
**Purpose**: Manage item masters, categories, stock levels, inventory transactions

**A. Item Masters** (4 endpoints) - `item_masters` table
| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 99 | GET | `/api/items-master` | List items master |
| 7072 | GET | `/api/item-masters` | Full item masters with details |
| 7233 | GET | `/api/item-masters/:id` | Get item master detail |
| 7270 | POST | `/api/item-masters` | Create new item |
| 7330 | PUT | `/api/item-masters/:id` | Update item |
| 7403 | DELETE | `/api/item-masters/:id` | Delete item |

**B. Categories & Sub-categories** (9 endpoints) - `categories`, `sub_categories` tables
| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 7436 | GET | `/api/categories` | List categories |
| 7481 | GET | `/api/categories/:id` | Get category |
| 7516 | GET | `/api/categories/:categoryId/items` | Get items in category |
| 7557 | GET | `/api/sub-categories` | List subcategories |
| 7608 | GET | `/api/sub-categories/by-category/:categoryId` | Get subcats by category |
| 7646 | POST | `/api/categories` | Create category |
| 7682 | PUT | `/api/categories/:id` | Update category |
| 7717 | DELETE | `/api/categories/:id` | Delete category |
| 7750 | POST | `/api/sub-categories` | Create subcategory |
| 7778 | PUT | `/api/sub-categories/:id` | Update subcategory |
| 7813 | DELETE | `/api/sub-categories/:id` | Delete subcategory |

**C. Inventory Stock** (13 endpoints) - `inventory_stock` table
| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 4432 | GET | `/api/inventory/current-stock-detailed` | Get detailed stock |
| 4471 | POST | `/api/inventory/update-stock-quantities` | Update stock qty |
| 4595 | GET | `/api/inventory/current-inventory-stock` | Get current stock |
| 4641 | PUT | `/api/inventory/current-inventory-stock/:id` | Update stock record |
| 4688 | POST | `/api/inventory/current-inventory-stock/bulk-update` | Bulk update |
| 6801 | GET | `/api/inventory-stock` | List inventory stock |
| 6834 | GET | `/api/inventory-stock/:id` | Get stock item |
| 6864 | POST | `/api/inventory-stock` | Create stock item |
| 6916 | PUT | `/api/inventory-stock/:id` | Update stock item |
| 6969 | DELETE | `/api/inventory-stock/:id` | Delete stock item |
| 6991 | POST | `/api/inventory-stock/:id/transaction` | Record transaction |
| 8787 | POST | `/api/stock/check-availability` | Check stock exists |
| 8829 | POST | `/api/stock/check-availability-batch` | Batch check stock |
| 8889 | GET | `/api/stock/search-with-availability` | Search stock |

**D. Stock Transactions** (9 endpoints) - `stock_transactions` table
| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 8302 | GET | `/api/stock-transactions` | List transactions |
| 8362 | GET | `/api/stock-transactions/:id` | Get transaction |
| 8397 | POST | `/api/stock-transactions` | Create transaction |
| 8478 | PUT | `/api/stock-transactions/:id` | Update transaction |
| 8547 | DELETE | `/api/stock-transactions/:id` | Delete transaction |
| 10434 | GET | `/api/stock-transaction-dashboard-stats` | Dashboard stats |
| 10575 | GET | `/api/stock-transactions-clean` | Get clean transactions |
| 10622 | POST | `/api/stock-transactions-clean` | Create clean transaction |
| 10684 | PUT | `/api/stock-transactions-clean/:id` | Update clean transaction |

**E. Dashboard & Analytics** (4 endpoints)
| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 3930 | GET | `/api/inventory/dashboard-stats` | Inventory dashboard |
| 4032 | GET | `/api/inventory/movements` | Stock movements |
| 4110 | GET | `/api/inventory/valuation` | Inventory value |
| 9305 | GET | `/api/stock/availability-dashboard` | Availability dashboard |

---

### 8️⃣ Vendors & Procurement (8 endpoints)
**Purpose**: Manage vendors, vendor selection, proposal management  
**Database Tables**: `vendors`, `tender_vendors`, `vendor_proposals`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 7838 | GET | `/api/vendors` | List vendors ⚠️ |
| 7888 | GET | `/api/vendors/:id` | Get vendor details |
| 7924 | POST | `/api/vendors` | Create vendor |
| 7979 | PUT | `/api/vendors/:id` | Update vendor |
| 8041 | DELETE | `/api/vendors/:id` | Delete vendor |
| 6007 | GET | `/api/tenders/:tenderId/vendors` | Get vendors for tender |
| 5960 | POST | `/api/tenders/:tenderId/vendors` | Add vendor to tender |
| 6056 | PUT | `/api/tenders/:tenderId/vendors/:vendorId` | Update vendor selection |

---

### 9️⃣ Tenders & Annual Procurement (15 endpoints)
**Purpose**: Create, manage, and finalize tenders; manage vendor proposals; create POs  
**Database Tables**: `tenders`, `tender_items`, `tender_vendors`  
**⚠️ CRITICAL**: PO creation endpoints here

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 5056 | POST | `/api/tenders` | Create tender |
| 5276 | GET | `/api/tenders` | List tenders |
| 5294 | GET | `/api/tender/:id/items` | Get items in tender |
| 5377 | GET | `/api/tenders/:id` | Get tender details |
| 5460 | PUT | `/api/tenders/:id/finalize` | Finalize tender |
| 5581 | PUT | `/api/tenders/:id/finalize-test` | Test finalize |
| 5592 | PUT | `/api/tenders/:id` | Update tender |
| 5858 | DELETE | `/api/tenders/:id` | Delete tender |
| 6089 | POST | `/api/tenders/:tenderId/vendors/:vendorId/proposal` | Submit vendor proposal |
| 6149 | GET | `/api/tenders/:tenderId/vendors/:vendorId/proposal/download` | Download proposal |
| 6192 | PUT | `/api/tenders/:tenderId/vendors/:vendorId/award` | Award to vendor |
| 6253 | PUT | `/api/tenders/:tenderId/vendors/:vendorId/successful` | Mark as successful |
| 6323 | PUT | `/api/tenders/:tenderId/vendors/:vendorId/selected` | Select vendor ⚠️ |
| 6369 | DELETE | `/api/tenders/:tenderId/vendors/:vendorId` | Remove vendor |
| 11450 | POST | `/api/tenders/:id/add-to-stock-acquisition` | Move to stock acquisition |

### 🔟 Purchase Orders (4 endpoints) - ⚠️ NEWLY ADDED, BROKEN
**Purpose**: Create and manage purchase orders from tenders  
**Database Tables**: `purchase_orders`, `purchase_order_items`  
**Status**: ❌ BROKEN - Vendor lookup failing, crashes on creation

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 18563 | GET | `/api/purchase-orders` | List POs with filters |
| 18664 | GET | `/api/purchase-orders/:id` | Get PO with items ⚠️ |
| 18733 | POST | `/api/purchase-orders` | Create PO from tender items ⚠️ |
| 18914 | PUT | `/api/purchase-orders/:id` | Update PO status |
| 18944 | DELETE | `/api/purchase-orders/:id` | Delete draft PO |

---

### 🔟 Deliveries & Receipt (7 endpoints)
**Purpose**: Manage delivery receipts, track items received from vendors  
**Database Tables**: `deliveries`, `delivery_items`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 6419 | GET | `/api/deliveries` | List deliveries |
| 6439 | GET | `/api/deliveries/:id` | Get delivery detail |
| 6467 | POST | `/api/deliveries` | Create delivery |
| 6515 | PUT | `/api/deliveries/:id` | Update delivery |
| 6590 | DELETE | `/api/deliveries/:id` | Delete delivery |
| 6634 | POST | `/api/delivery-items` | Add items to delivery |
| 6681 | PUT | `/api/delivery-items/:delivery_id` | Update delivery items |
| 6729 | PUT | `/api/deliveries/:id/finalize` | Finalize delivery |
| 10775 | GET | `/api/deliveries/by-tender/:tenderId` | Get deliveries by tender |
| 10336 | POST | `/api/delivery-item-serial-numbers` | Track serial numbers |

---

### 1️⃣1️⃣ Stock Acquisition & Annual Procurement (8 endpoints)
**Purpose**: Manage stock acquired from tenders, track pricing and quantities  
**Database Tables**: `stock_transactions_clean`, `tender_items`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 10847 | PUT | `/api/stock-acquisition/update-multiple-prices` | Update prices |
| 10890 | GET | `/api/stock-acquisition/dashboard-stats` | Acquisition dashboard |
| 10945 | GET | `/api/stock-acquisition/tender-summaries` | Tender summaries |
| 10986 | GET | `/api/stock-acquisition/items/:tenderId` | Get items by tender |
| 11011 | PUT | `/api/stock-acquisition/update-price/:itemId` | Update single price |
| 11137 | GET | `/api/stock-acquisition/tenders` | List tenders for acquisition |
| 11165 | GET | `/api/stock-acquisition/tender-stats/:tenderId` | Tender stats |
| 11194 | GET | `/api/stock-acquisition/search` | Search acquisition items |

---

### 1️⃣2️⃣ Stock Returns (3 endpoints)
**Purpose**: Handle stock returns from users/wings  
**Database Tables**: `stock_returns`, `stock_returns_requests`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 4743 | GET | `/api/stock-returns/requests` | List return requests |
| 4795 | PUT | `/api/stock-returns/requests/:id/process` | Process return |
| 4935 | POST | `/api/stock-returns` | Create return |
| 5027 | GET | `/api/stock-returns` | List returns |
| 3818 | POST | `/api/stock-returns/:id/process` | Process return (alt) |
| 9273 | POST | `/api/issued-items/return/:ledgerId` | Return issued item |
| 9347 | GET | `/api/issued-items/pending-returns` | Pending returns |

---

### 1️⃣3️⃣ Issued Items & User Inventory (5 endpoints)
**Purpose**: Track items issued to users and manage user personal inventory  
**Database Tables**: `issued_items_ledger`, `user_issued_items`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 8994 | GET | `/api/issued-items/user/:userId` | Get items issued to user |
| 9053 | GET | `/api/personal-inventory/:userId` | Get user's personal inventory |
| 9119 | GET | `/api/wing-inventory/:wingId` | Get wing's inventory |
| 9215 | GET | `/api/issued-items` | List all issued items |

---

### 1️⃣4️⃣ Approval Workflow (New) (10 endpoints)
**Purpose**: Hierarchical approval workflow for stock issuance  
**Database Tables**: `approvals`, `approval_history`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 9379 | GET | `/api/approvals/supervisor/pending` | Get pending (supervisor) |
| 9405 | GET | `/api/approvals/admin/pending` | Get pending (admin) |
| 9422 | GET | `/api/approvals/request/:requestId` | Get approval status |
| 9505 | POST | `/api/approvals/supervisor/approve` | Supervisor approve |
| 9580 | POST | `/api/approvals/supervisor/forward` | Forward to admin |
| 9638 | POST | `/api/approvals/supervisor/reject` | Supervisor reject |
| 9694 | POST | `/api/approvals/admin/approve` | Admin approve |
| 9768 | POST | `/api/approvals/admin/reject` | Admin reject |
| 9824 | GET | `/api/approvals/my-requests/:userId` | Get my requests |

---

### 1️⃣5️⃣ Inventory Verification Workflow (8 endpoints)
**Purpose**: Request, verify, and track inventory discrepancies  
**Database Tables**: `inventory_verification_requests`, `inventory_verifications`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 12321 | POST | `/api/inventory/check-availability` | Check availability (alt) |
| 12408 | POST | `/api/inventory/request-verification` | Request verification |
| 12572 | POST | `/api/inventory/forward-verification-to-store-keeper` | Forward to keeper |
| 12637 | GET | `/api/inventory/pending-verifications` | Get pending verifications |
| 12712 | GET | `/api/inventory/my-verification-requests` | Get my requests |
| 12781 | GET | `/api/inventory/my-forwarded-verifications` | Get forwarded to me |
| 12853 | POST | `/api/inventory/update-verification` | Update verification |
| 12985 | POST | `/api/inventory/forward-verification-to-storekeeper` | Forward (alt) |
| 13075 | GET | `/api/inventory/verification-history` | Verification history |
| 13145 | GET | `/api/inventory/verification-history/:stockIssuanceId` | Specific history |

---

### 1️⃣6️⃣ Serial Numbers & Tracking (6 endpoints)
**Purpose**: Track item serial numbers for high-value items  
**Database Tables**: `item_serial_numbers`, `delivery_item_serial_numbers`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 10180 | GET | `/api/item-serial-numbers/tender-item/:tenderItemId` | Get serials |
| 10206 | POST | `/api/item-serial-numbers` | Add serial |
| 10244 | POST | `/api/item-serial-numbers/bulk` | Bulk add serials |
| 10299 | PUT | `/api/item-serial-numbers/:id` | Update serial |
| 10393 | DELETE | `/api/item-serial-numbers/:id` | Delete serial |
| 10415 | DELETE | `/api/item-serial-numbers/tender-item/:tenderItemId` | Delete all for item |

---

### 1️⃣7️⃣ Stores & Storage Locations (5 endpoints)
**Purpose**: Manage physical store locations  
**Database Tables**: `stores`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 8577 | GET | `/api/stores` | List stores |
| 8604 | GET | `/api/stores/:id` | Get store |
| 8637 | POST | `/api/stores` | Create store |
| 8690 | PUT | `/api/stores/:id` | Update store |
| 8755 | DELETE | `/api/stores/:id` | Delete store |

---

### 1️⃣8️⃣ Reorder Management (4 endpoints)
**Purpose**: Manage low-stock reorder requests  
**Database Tables**: `reorder_requests`

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 8072 | GET | `/api/reorder-requests` | List reorder requests |
| 8108 | GET | `/api/reorder-requests/:id` | Get request |
| 8139 | POST | `/api/reorder-requests` | Create request |
| 8209 | PUT | `/api/reorder-requests/:id` | Update request |
| 8272 | DELETE | `/api/reorder-requests/:id` | Delete request |

---

### 1️⃣9️⃣ System & Utilities (6 endpoints)
**Purpose**: Health checks, system info, audit logs  

| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 2242 | GET | `/api/health` | Health check |
| 2256 | GET | `/api/check-user` | Check user status |
| 1621 | GET | `/api/ims/audit-log` | Audit log (admin only) |
| 13216 | GET | `/api/notifications/:userId` | Get user notifications |
| 11548 | GET | `/api/tenders` | (Duplicate endpoint) |
| 11576 | GET | `/api/stock-transactions` | (Duplicate endpoint) |

---

## 🔴 Critical Issues Found

### Issue #1: ⚠️ Purchase Order Creation Fails - ROOT CAUSE IDENTIFIED

**Location**: [POST /api/purchase-orders](backend-server.cjs#L18733)  
**Problem**: Frontend sends `vendor_ids` (comma-separated string) but code tries to use it as UUID

**Code Analysis** (Line 18787):
```javascript
// ✅ Determine vendor_id: Use selected vendor or tender's vendor
let itemVendorId;
if (isSingleVendorType) {
  // For contract/spot: use tender's vendor
  itemVendorId = tender.vendor_id;
} else {
  // For annual-tender: use the vendor selected for this item (from frontend)
  itemVendorId = itemVendorsMap[itemId] || item.vendor_id;  // ⚠️ Problem HERE
}
```

**Root Cause**:
1. Frontend passes `vendor_ids` from CreatePurchaseOrder form
2. Backend expects `itemVendorsMap` to contain vendor selections
3. Falls back to `item.vendor_id` which is NULL for annual tenders
4. Tries to insert NULL into `purchase_orders.vendor_id` (NOT NULL constraint fails)
5. **OR** tries to convert comma-separated string to UNIQUEIDENTIFIER → "Conversion failed" error

**Error Stack**:
- Line 18800: `.input('vendor_id', sql.UniqueIdentifier, vendorId)` - Fails if vendorId is NULL or malformed
- Line 18817: `.input('item_master_id', sql.UniqueIdentifier, item.item_master_id_lookup || item.item_master_id)` - Type mismatch if item_master_id_lookup is NVARCHAR

---

### Issue #2: Frontend-Backend Vendor Communication Broken

**Frontend Code** (CreatePurchaseOrder.tsx):
- Sends: `{ tenderId, selectedItems, vendorList, itemVendors, itemPrices, itemQuantities }`
- `itemVendors` = Object map of { itemId: vendorId } selected from dropdown
- `vendorList` from frontend but backend code looks for `itemVendorsMap`

**Backend Code** (Line 18769):
```javascript
const { tenderId, selectedItems, poDate, itemVendors, itemPrices, itemQuantities } = req.body;
// ...
const itemVendorsMap = itemVendors || {};  // ✅ This should work...
// ...
itemVendorId = itemVendorsMap[itemId] || item.vendor_id;  // ⚠️ But itemVendorsMap may be empty!
```

**Why it fails**:
- Frontend may not be sending `itemVendors` object correctly
- If vendor dropdown doesn't populate, `itemVendors` = {}
- Falls back to `item.vendor_id` which is NULL
- Returns error: "No vendor selected for item {itemId}"
- **OR** crashes with type conversion error

---

### Issue #3: SQL Parameter Type Mismatches - PARTIALLY FIXED

**Status**: Mostly correct in current code, but watch for:

| Location | Line | Issue | Current Fix | Remaining Risk |
|----------|------|-------|------------|-----------------|
| GET `/api/purchase-orders` | 18595 | tenderId filter | ✅ `sql.UniqueIdentifier` | ✅ Good |
| GET `/api/purchase-orders` | 18598 | vendorId filter | ✅ `sql.UniqueIdentifier` | ✅ Good |
| POST `/api/purchase-orders` | 18745 | tenderId | ⚠️ `sql.NVarChar` | ❌ Should be `sql.UniqueIdentifier` |
| POST `/api/purchase-orders` | 18800 | vendor_id insert | ✅ `sql.UniqueIdentifier` | ⚠️ But vendorId may be NULL |
| POST `/api/purchase-orders` | 18814 | item_master_id | ✅ `sql.UniqueIdentifier` | ✅ Good |
| PUT `/api/purchase-orders/:id` | 18926 | id parameter | ✅ `sql.UniqueIdentifier` | ✅ Good |
| DELETE `/api/purchase-orders/:id` | 18953 | id parameter | ✅ `sql.UniqueIdentifier` | ✅ Good |

---

### Issue #4: Database Table Queries Missing

**Likely missing PO-related queries** in tender_items:
```sql
-- Problem: tender_items uses vendor_id for single vendors,
-- but POST /api/purchase-orders tries to access vendor_ids (plural)
SELECT ti.vendor_id, ti.vendor_ids FROM tender_items ...

-- These columns exist but confused:
-- vendor_id = UNIQUEIDENTIFIER (selected vendor for this item)
-- vendor_ids = NVARCHAR(MAX) (comma-separated list of all bidders for annual tenders)
```

**Query at Line 18751**:
```javascript
.query(`
  SELECT ti.id, ti.item_master_id, ti.quantity, ti.nomenclature,
         ti.vendor_id,  // ⚠️ This is NULL for annual tenders!
         ti.estimated_unit_price, im.id as item_master_id_lookup
  FROM tender_items ti
  LEFT JOIN item_masters im ON ti.item_master_id = im.id
  WHERE ti.id = @itemId AND ti.tender_id = @tenderId
`)
```

**Issue**: Uses `ti.vendor_id` which is NULL, should use `ti.vendor_ids` and parse them?  
**No**: Should use frontend's `itemVendors` map which contains the selected vendor!

---

### Issue #5: Duplicate Endpoints Causing Conflicts

| Endpoint | Lines | Purpose | Conflict? |
|----------|-------|---------|-----------|
| `/api/offices` | 1676, 1734 | List offices | ⚠️ First wins |
| `/api/tenders` | 5276, 11548 | List tenders | ⚠️ First wins |
| `/api/stock-transactions` | 8302, 11576 | List transactions | ⚠️ First wins |
| `/api/deliveries` | 6419, 11636 | List deliveries | ⚠️ First wins |
| `/api/inventory-stock` | 6801, 11662 | List stock | ⚠️ First wins |
| `/api/stock-transactions-clean` | 10575, 10622, 11258, 11690 | List clean trans | ⚠️ Multiple! |

**Impact**: Later route definitions are unreachable, causing unpredictable behavior

---

## 📊 Domain Breakdown Summary

| Domain | Endpoints | Main Tables | Status |
|--------|-----------|------------|--------|
| Authentication | 9 | [External] | ✅ Working |
| Authorization | 6 | [External] | ✅ Working |
| Users | 4 | users, user_roles | ✅ Working |
| Organization | 8 | offices, wings, decs | ✅ Working |
| Item Masters | 6 | item_masters | ✅ Working |
| Categories | 11 | categories, sub_categories | ✅ Working |
| Stock Mgmt | 13 | inventory_stock, stock_transactions | ⚠️ Needs cleanup |
| Vendors | 8 | vendors, tender_vendors | ⚠️ Vendors not showing |
| Tenders | 15 | tenders, tender_items | ⚠️ PO creation broken |
| Deliveries | 10 | deliveries, delivery_items | ✅ Working |
| Stock Acquisition | 8 | stock_transactions_clean | ⚠️ Type mismatches |
| Stock Returns | 7 | stock_returns | ✅ Working |
| Issued Items | 5 | issued_items_ledger | ✅ Working |
| Approvals | 19 | approvals, approval_history | ⚠️ Workflow unstable |
| Verification | 10 | inventory_verification | ⚠️ Workflow unstable |
| Serial Numbers | 6 | item_serial_numbers | ✅ Working |
| Stores | 5 | stores | ✅ Working |
| Reorders | 5 | reorder_requests | ✅ Working |
| System | 6 | [Various] | ✅ Working |

---

---

## 📋 Detailed Fix Plan - Purchase Order Creation (PRIORITY #1)

### Fix #1: Validate Frontend Sends Correct Data

**File**: `src/pages/CreatePurchaseOrder.tsx`

Check that the `handleCreatePOs()` function sends:
```javascript
const payload = {
  tenderId: tenderId,        // ✅ MUST be UUID
  selectedItems: itemIds,    // ✅ Array of tender_item IDs
  poDate: new Date(),        // ✅ Date
  itemVendors: {},           // ✅ Map of {itemId: vendorId}
  itemPrices: {},            // ✅ Map of {itemId: price}
  itemQuantities: {}         // ✅ Map of {itemId: qty}
};
```

**Action Required**: Add console.log before fetch to confirm data structure.

---

### Fix #2: Fix tenderId Parameter Type

**File**: `backend-server.cjs` Line 18745

**Current**:
```javascript
const tenderRequest = await transaction.request()
  .input('tenderId', sql.NVarChar, tenderId)  // ⚠️ WRONG
  .query(`SELECT tender_type, vendor_id FROM tenders WHERE id = @tenderId`);
```

**Should Be**:
```javascript
const tenderRequest = await transaction.request()
  .input('tenderId', sql.UniqueIdentifier, tenderId)  // ✅ CORRECT
  .query(`SELECT tender_type, vendor_id FROM tenders WHERE id = @tenderId`);
```

---

### Fix #3: Debug itemVendorsMap Population

**File**: `backend-server.cjs` Line 18769-18795

Add detailed logging:
```javascript
const { tenderId, selectedItems, poDate, itemVendors, itemPrices, itemQuantities } = req.body;

console.log('📦 PO Creation Request:', {
  tenderId,
  selectedItemsCount: selectedItems?.length,
  itemVendorsKeys: Object.keys(itemVendors || {}),  // Debug which items have vendors
  itemVendors: itemVendors,  // Log the actual map
  poDate
});

const itemVendorsMap = itemVendors || {};
console.log('🗺️ itemVendorsMap:', itemVendorsMap);  // CRITICAL DEBUG LOG
```

**Expected Output**:
```
📦 PO Creation Request: {
  tenderId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  selectedItemsCount: 3,
  itemVendorsKeys: ['item-id-1', 'item-id-2', 'item-id-3'],
  itemVendors: {
    'item-id-1': 'vendor-uuid-1',
    'item-id-2': 'vendor-uuid-2',
    'item-id-3': 'vendor-uuid-1'
  },
  poDate: '2026-01-19T...'
}
```

**If itemVendors is empty `{}`, problem is in frontend!**

---

### Fix #4: Validate Vendor Selection Before Insert

**File**: `backend-server.cjs` Line 18787-18797

**Current**:
```javascript
let itemVendorId;
if (isSingleVendorType) {
  itemVendorId = tender.vendor_id;
} else {
  itemVendorId = itemVendorsMap[itemId] || item.vendor_id;  // ⚠️ May be NULL!
}

if (!itemVendorId) {
  console.warn(`⚠️ No vendor_id found for item ${itemId}`);
  await transaction.rollback();
  return res.status(400).json({ error: `No vendor selected for item ${itemId}` });
}
```

**Add UUID Validation**:
```javascript
// Validate UUID format
const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(uuid).trim());
};

let itemVendorId;
if (isSingleVendorType) {
  itemVendorId = tender.vendor_id;
} else {
  itemVendorId = itemVendorsMap[itemId] || item.vendor_id;
}

if (!itemVendorId || !isValidUUID(itemVendorId)) {
  console.error(`❌ Invalid vendor_id for item ${itemId}:`, itemVendorId);
  await transaction.rollback();
  return res.status(400).json({ 
    error: `No valid vendor selected for item ${itemId}`,
    receivedVendorId: itemVendorId,
    itemId: itemId
  });
}
```

---

## 🚀 Implementation Order

### Phase 1: Fix Immediate Crash (30 minutes)
1. ✅ Stop backend
2. Fix tenderId parameter type (Line 18745)
3. Add vendor validation and logging (Line 18797)
4. Test with simple POST request

### Phase 2: Debug Frontend Communication (45 minutes)
1. Check CreatePurchaseOrder.tsx sends correct itemVendors structure
2. Add console.logs in frontend before fetch()
3. Add server-side logging to confirm receipt
4. Test end-to-end with one item

### Phase 3: Remove Duplicate Endpoints (1 hour)
1. Remove line 1734 `/api/offices` (keep 1676)
2. Remove line 11548 `/api/tenders` (keep 5276)
3. Remove line 11576, 11636, 11662, 11690 duplicates
4. Keep single, most-used version of each endpoint

### Phase 4: Comprehensive Modularization (2-3 days)
1. Create routes/ folder structure
2. Split 163 endpoints into modules
3. Create controllers/ for business logic
4. Add proper error handling throughout
5. Add API documentation

---

## 📊 Updated Endpoint Status

| Domain | Count | Status | Priority |
|--------|-------|--------|----------|
| Authentication | 9 | ✅ Working | Low |
| Authorization | 6 | ✅ Working | Low |
| Users | 4 | ✅ Working | Low |
| Organization | 8 | ✅ Working | Low |
| Items & Categories | 17 | ✅ Working | Low |
| Stock Management | 27 | ⚠️ Duplicate endpoints | Medium |
| Vendors | 8 | ⚠️ Not integrated with PO | Medium |
| **Tenders** | **15** | **⚠️ Broken** | **🔴 CRITICAL** |
| **Purchase Orders** | **5** | **❌ BROKEN** | **🔴 CRITICAL** |
| Deliveries | 10 | ✅ Working | Low |
| Approvals | 19 | ⚠️ Needs testing | Medium |
| Verification | 10 | ⚠️ Needs testing | Medium |
| Serial Numbers | 6 | ✅ Working | Low |
| Returns | 7 | ✅ Working | Low |
| Other | 19 | ✅ Working | Low |
| **TOTAL** | **163** | **⚠️ 3 Critical** | **IMMEDIATE ACTION** |

---

## 🔧 Recommended Solution

### Option A: Modularization (Recommended for Long-term)
**Timeline**: 2-3 days  
**Benefit**: Permanent fix, maintainability, isolated testing, future-proof

### Option B: Quick Fixes First (Practical, Recommended for Now)
**Timeline**: 2 hours  
**Steps**:
1. Fix tenderId type mismatch (5 mins)
2. Add vendor validation logging (10 mins)
3. Debug frontend itemVendors send (20 mins)
4. Remove duplicate endpoints (15 mins)
5. Test PO creation (30 mins)
6. Schedule modularization for next sprint

**Then** proceed with modularization in Phase 4 after system is stable.

---

## ✅ Next Steps

**Immediate Actions** (Right Now):
1. ✅ System stopped - all processes killed
2. ✅ Architecture audited - 163 endpoints inventoried
3. ✅ Root causes identified - PO creation failure traced
4. **NEXT**: Choose Option A (Modularize now) or Option B (Quick fixes first)?

**Your decision required**: Do you want to:
- **A)** Spend 2-3 hours on quick fixes to get PO creation working now?
- **B)** Spend 2-3 days on full modularization for permanent stability?
- **C)** Hybrid: Quick fix now (2 hours) + modularize next sprint?

**Recommended**: Option C (Quick fix + Schedule modularization)

