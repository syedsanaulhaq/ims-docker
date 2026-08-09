# QUICK REFERENCE: Existing Contract/Tender Architecture

## Current System Workflow

```
USER CREATES TENDER
  ↓
FILLS FORM (reference #, title, dates, etc.)
  ↓
SELECTS ITEMS (all items visible to all vendors)
  ↓
SELECTS VENDORS (all selected vendors can bid on all items)
  ↓
SAVES TO DATABASE
  ↓
tenders table        ← Tender metadata
tender_items table   ← Items (NO vendor_id currently)
tender_vendors table ← Vendor participation tracking
```

---

## Database Schema (CURRENT)

### tenders table
```
┌─────────────────────────────────────────┐
│ tenders                                 │
├─────────────────────────────────────────┤
│ id (uniqueidentifier)          [PK]     │
│ reference_number (varchar)              │
│ title (nvarchar)                        │
│ tender_type (nvarchar)  ← KEY FIELD!    │
│                         ├─ 'contract'   │
│                         └─ 'spot-purchase'
│ estimated_value (decimal)               │
│ status (varchar)                        │
│ submission_deadline (datetime)          │
│ created_by (nvarchar)                   │
│ created_at (datetime)                   │
│ is_finalized (bit)                      │
│ ... 20+ other fields ...                │
└─────────────────────────────────────────┘
         │
         ├── has many ──→ tender_items (line items)
         └── has many ──→ tender_vendors (participating vendors)
```

### tender_items table (Line Items)
```
┌──────────────────────────────────────────┐
│ tender_items                             │
├──────────────────────────────────────────┤
│ id (uniqueidentifier)         [PK]       │
│ tender_id (uniqueidentifier)   [FK]      │
│ item_master_id (uniqueidentifier) [FK]   │
│ nomenclature (nvarchar)                  │
│ quantity (int)                           │
│ estimated_unit_price (decimal)           │
│ ❌ NO vendor_id (THIS IS THE ISSUE!)    │
│ created_at (datetime)                    │
└──────────────────────────────────────────┘
```

### tender_vendors table (Vendor Participation)
```
┌──────────────────────────────────────────┐
│ tender_vendors                           │
├──────────────────────────────────────────┤
│ id (uniqueidentifier)         [PK]       │
│ tender_id (uniqueidentifier)   [FK]      │
│ vendor_id (uniqueidentifier)   [FK]      │
│ vendor_name (nvarchar)                   │
│ quoted_amount (decimal)                  │
│ is_awarded (bit)                         │
│ created_at (datetime)                    │
└──────────────────────────────────────────┘

KEY: Tracks which vendors are participating
     One row per (tender, vendor) pair
     All vendors see all items
```

---

## What What We Built vs. What We Should Have Done

### ❌ WRONG APPROACH (What We Did)

Created 3 NEW separate tables:
```
AnnualTenders (duplicate of tenders)
    ├─ vendor_id added to TenderItems ✅
    └─ /api/annual-tenders endpoints
```

### ✅ RIGHT APPROACH (What You Need)

Extend existing 2 tables:
```
tenders (tender_type='annual-tender')  ← ADD THIS TYPE
    ├─ Add vendor_id to tender_items    ← vendor-specific items
    └─ Reuse /api/tenders endpoints
```

---

## How to Integrate Annual Tender

### 1. DATABASE: Add vendor_id to tender_items

```sql
ALTER TABLE tender_items
ADD vendor_id UNIQUEIDENTIFIER NULL;

ALTER TABLE tender_items
ADD CONSTRAINT FK_TenderItems_VendorId 
    FOREIGN KEY (vendor_id) REFERENCES vendors(id);
```

**RESULT:** Now tender_items can optionally reference a specific vendor

### 2. BACKEND: Modify POST /api/tenders

```javascript
// When creating tender:
if (tender_type === 'annual-tender') {
  // Require vendor_id for each item
  // Save item with vendor_id populated
  INSERT INTO tender_items (tender_id, item_id, vendor_id, quantity) 
  VALUES (id, item_id, specific_vendor_id, qty)
} else {
  // For contract/spot-purchase, vendor_id = NULL
  INSERT INTO tender_items (tender_id, item_id, vendor_id, quantity) 
  VALUES (id, item_id, NULL, qty)
}
```

### 3. FRONTEND: Update ContractTender.tsx

```typescript
const type = new URLSearchParams(location.search).get('type');
// type can be: 'contract', 'spot-purchase', 'annual-tender'

// Filter tenders by type
const filteredTenders = tenders.filter(t => t.tender_type === type);
```

---

## Vendor-Specific Item Assignment Explained

### Contract/Spot Purchase (Current)
```
TENDER: "Buy laptops"
├─ Item 1: 5 laptops
├─ Item 2: 3 monitors  
└─ Item 3: 2 keyboards

VENDORS: A, B, C

RESULT:
  Vendor A can bid on Items 1, 2, 3 (ALL items)
  Vendor B can bid on Items 1, 2, 3 (ALL items)
  Vendor C can bid on Items 1, 2, 3 (ALL items)

DATABASE:
  tender_items[0]: item_id=1, vendor_id=NULL  (all vendors see this)
  tender_items[1]: item_id=2, vendor_id=NULL  (all vendors see this)
  tender_items[2]: item_id=3, vendor_id=NULL  (all vendors see this)
```

### Annual Tender (What You Want)
```
TENDER: "Annual supplies"
├─ Item 1: 100 stationery    → Vendor A (Office Supplier)
├─ Item 2: 10 desks          → Vendor B (Furniture)
├─ Item 3: 50 files          → Vendor A (Office Supplier)
└─ Item 4: 100 cartridges    → Vendor C (IT Equipment)

RESULT:
  Vendor A: Items 1, 3 ONLY (stationery, files)
  Vendor B: Item 2 ONLY (desks)
  Vendor C: Item 4 ONLY (cartridges)

DATABASE:
  tender_items[0]: item_id=1, vendor_id=Vendor_A_ID  (only A supplies)
  tender_items[1]: item_id=2, vendor_id=Vendor_B_ID  (only B supplies)
  tender_items[2]: item_id=3, vendor_id=Vendor_A_ID  (only A supplies)
  tender_items[3]: item_id=4, vendor_id=Vendor_C_ID  (only C supplies)
```

---

## File Structure Reference

### Frontend (React/TypeScript)
```
src/
├─ pages/
│  └─ ContractTender.tsx  ← Main dashboard (filters by tender_type)
│
└─ components/tender/
   ├─ TenderFormFresh2.tsx  ← Standard form (contract, spot-purchase)
   ├─ TenderWizard.tsx      ← Multi-step for annual-tender (YOUR COMPONENT)
   └─ TenderView.tsx        ← Display tender details
```

### Backend (Node.js/Express)
```
backend-server.cjs
├─ POST /api/tenders         ← Create (handles all types)
├─ GET /api/tenders          ← List (filters by tender_type)
├─ GET /api/tenders/:id      ← Get details
├─ PUT /api/tenders/:id      ← Update
├─ DELETE /api/tenders/:id   ← Delete
└─ /api/tenders/:id/vendors  ← Vendor management
```

### Database (SQL Server)
```
InventoryManagementDB
├─ tenders                ← All tender types here
├─ tender_items           ← Line items (with vendor_id for annual)
├─ tender_vendors         ← Participation tracking
├─ item_masters           ← Available items
└─ vendors                ← Vendor master data
```

---

## Quick Decision Matrix

| If You Want | Do This |
|---|---|
| **Minimal changes** | Keep /api/annual-tenders separate, insert into `tenders` table with `tender_type='annual-tender'` |
| **Clean architecture** | Merge into /api/tenders, handle tender_type in business logic |
| **Fastest implementation** | Use your existing TenderWizard.tsx component, just call /api/tenders instead of /api/annual-tenders |
| **Best for future** | Extend tenders table to support all types uniformly |

---

## NEXT STEPS

Choose one path:

### Path A: Unified System (RECOMMENDED)
1. Keep one set of tables: `tenders`, `tender_items`, `tender_vendors`
2. Add `vendor_id` column to `tender_items` (migrate your data)
3. Modify backend POST to handle `tender_type='annual-tender'`
4. Delete separate `AnnualTenders` tables
5. Integrate annual-tender form into main tender workflow

### Path B: Parallel System (EASIER SHORT-TERM)
1. Keep `/api/annual-tenders` separate
2. But insert into existing `tenders` table with `tender_type='annual-tender'`
3. Have `/api/annual-tenders` read from `tenders` table
4. Delete `AnnualTenders`, `TenderVendors` duplicate tables later
5. Merge endpoints in future refactoring

**Which would you prefer?**
