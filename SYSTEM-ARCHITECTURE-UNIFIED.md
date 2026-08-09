# Unified Tender System Architecture (After Cleanup)

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│             UNIFIED TENDER MANAGEMENT SYSTEM              │
│                   (Single Data Model)                     │
└─────────────────────────────────────────────────────────┘

                          Browser
                            │
                            ▼
    ┌───────────────────────────────────────────┐
    │        React Frontend (port 8080)          │
    ├───────────────────────────────────────────┤
    │  Pages:                                   │
    │  • ContractTender.tsx                    │
    │    - Filters by tender_type               │
    │    - Shows: contract, spot-purchase,     │
    │             annual-tender                │
    │  • CreateTender.tsx                      │
    │    - Type selector (contract/spot/annual) │
    │    - Routes to appropriate form           │
    │  • TenderWizard.tsx                      │
    │    - Multi-vendor item assignment        │
    │    - For annual-tender only              │
    └───────────────────────────────────────────┘
                        │
                HTTP   │ /api/tenders
                        │
    ┌───────────────────────────────────────────┐
    │    Node.js Backend (port 3001)            │
    ├───────────────────────────────────────────┤
    │  Endpoints:                               │
    │  • GET    /api/tenders                   │
    │  • GET    /api/tenders?type=annual-tender │
    │  • POST   /api/tenders                   │
    │  • PUT    /api/tenders/:id               │
    │  • DELETE /api/tenders/:id               │
    │                                           │
    │  Logic:                                  │
    │  • Detect tender_type                    │
    │  • Handle vendor_id per type:            │
    │    - contract: Single vendor_id           │
    │    - spot-purchase: Single vendor_id      │
    │    - annual-tender: Per-item vendor_id    │
    │  • Capture pricing for all types         │
    │  • Validate constraints                  │
    └───────────────────────────────────────────┘
                        │
           MSSQL        │
                        │
    ┌───────────────────────────────────────────┐
    │   SQL Server 2022 (Database Layer)        │
    ├───────────────────────────────────────────┤
    │  Core Tables:                             │
    │  • tenders                                │
    │    - id, tender_type, reference_number   │
    │    - title, status, created_at, etc.     │
    │    - tender_type: 'contract'              │
    │               or 'spot-purchase'          │
    │               or 'annual-tender'          │
    │                                           │
    │  • tender_items (ALL THREE TYPES USE)    │
    │    - id, tender_id, item_id              │
    │    - vendor_id (ALWAYS SET)              │
    │    - quantity, estimated_unit_price      │
    │    - actual_unit_price, total_amount     │
    │                                           │
    │  • vendors                                │
    │    - id, vendor_name, contact_person    │
    │    - address, phone, email, etc.         │
    │                                           │
    │  Supporting Tables:                      │
    │  • tender_vendors (vendor participation) │
    │  • item_masters (inventory items)        │
    │  • categories (item categories)          │
    └───────────────────────────────────────────┘
```

---

## Tender Type Semantics

### Contract Tender
```
Workflow:
  1. Create tender
  2. Select ONE vendor to award
  3. Add items (quantity, pricing)
  4. All items assigned to same vendor

Database:
  tenders.tender_type = 'contract'
  tender_items[0].vendor_id = 'vendor-a-uuid'
  tender_items[1].vendor_id = 'vendor-a-uuid'  ← SAME
  tender_items[2].vendor_id = 'vendor-a-uuid'  ← SAME

Query:
  "What did Vendor A supply in this contract?"
  → All items they have vendor_id for
```

### Spot Purchase
```
Workflow:
  1. Create tender
  2. Select ONE vendor
  3. Add items with quantities
  4. All items assigned to same vendor
  5. Usually for urgent/quick procurement

Database:
  tenders.tender_type = 'spot-purchase'
  tender_items[0].vendor_id = 'vendor-b-uuid'
  tender_items[1].vendor_id = 'vendor-b-uuid'  ← SAME
  tender_items[2].vendor_id = 'vendor-b-uuid'  ← SAME

Query:
  "What did Vendor B supply in this spot purchase?"
  → All items they have vendor_id for
```

### Annual Tender (NEW)
```
Workflow:
  1. Create tender
  2. Specify MULTIPLE vendors (specialists)
  3. For EACH vendor, assign their specialty items
  4. Each item has different vendor_id

Database:
  tenders.tender_type = 'annual-tender'
  tender_items[0].vendor_id = 'vendor-a-uuid'  ← Stationery specialist
  tender_items[1].vendor_id = 'vendor-b-uuid'  ← Furniture specialist
  tender_items[2].vendor_id = 'vendor-c-uuid'  ← IT equipment specialist

Query:
  "What items does Vendor A supply annually?"
  → Only items with their vendor_id
  
  "Who supplies each item annually?"
  → Query by item_id, get vendor_id
```

---

## Key Differences from Separate System

### ❌ OLD: Separate Tables
```
applications/
  AnnualTenders table        → duplicate of tenders
  annual_tender_groups       → category tracking
  annual_tender_vendors      → vendor assignments
  vendor_proposals           → pricing proposals

API:
  /api/annual-tenders        → separate endpoint

Components:
  AnnualTenderManagement.tsx → separate page
  Dashboard.tsx              → separate dashboard
  TenderWizard.tsx           → separate form
```

### ✅ NEW: Unified Table
```
database/
  tenders                    → ALL types here
    tender_type='contract'
    tender_type='spot-purchase'
    tender_type='annual-tender'
  
  tender_items               → ALL types
    vendor_id (always set)
    pricing fields (all types)

API:
  /api/tenders               → unified endpoint
    GET /api/tenders           (all types)
    GET /api/tenders?type=annual-tender (filtered)
    POST /api/tenders          (creates any type)

Components:
  TenderWizard.tsx           → reused for annual
  ContractTender.tsx         → shows all types
  Single form flow
```

---

## Data Flow Examples

### Creating a Contract Tender

```
Frontend:
  1. User selects: Tender Type = "Contract"
  2. User enters: reference, title, dates
  3. User selects: ONE vendor to award
  4. User adds: Items with quantities & prices
  5. User clicks: Create

Request to backend:
  POST /api/tenders {
    tender_type: "contract",
    reference_number: "TEND-2025-001",
    title: "Office Equipment",
    vendor_id: "vendor-a-uuid",  ← Awarded vendor
    items: [
      {
        item_master_id: "laptop-uuid",
        quantity: 5,
        estimated_unit_price: 1000,
        total_amount: 5000
      },
      {
        item_master_id: "monitor-uuid",
        quantity: 5,
        estimated_unit_price: 300,
        total_amount: 1500
      }
    ]
  }

Backend processing:
  FOR EACH item:
    item.vendor_id = req.body.vendor_id  ← Set to awarded vendor
  
  INSERT tender → tenders table
  INSERT items → tender_items table (each with vendor_id)

Database result:
  tenders: 1 row (tender_type='contract')
  tender_items: 2 rows (both with vendor_id='vendor-a-uuid')
```

### Creating an Annual Tender

```
Frontend (TensorWizard):
  Step 1: Tender details
    - Reference number
    - Title
    - Dates (optional)
  
  Step 2: Select vendors
    - [x] Vendor A (Stationery)
    - [x] Vendor B (Furniture)
    - [x] Vendor C (IT Equipment)
  
  Step 3-5: For each vendor, assign items
    Vendor A → Stationery items (quantity, price)
    Vendor B → Furniture items (quantity, price)
    Vendor C → IT Equipment items (quantity, price)

Request to backend:
  POST /api/tenders {
    tender_type: "annual-tender",
    reference_number: "AT-2025-001",
    title: "Annual Supplies",
    items: [
      {
        item_master_id: "stationery-uuid",
        vendor_id: "vendor-a-uuid",
        quantity: 100,
        estimated_unit_price: 50,
        total_amount: 5000
      },
      {
        item_master_id: "desks-uuid",
        vendor_id: "vendor-b-uuid",
        quantity: 10,
        estimated_unit_price: 200,
        total_amount: 2000
      },
      {
        item_master_id: "cartridges-uuid",
        vendor_id: "vendor-c-uuid",
        quantity: 200,
        estimated_unit_price: 10,
        total_amount: 2000
      }
    ]
  }

Backend processing:
  FOR EACH item:
    item.vendor_id = item.vendor_id  ← Use item's vendor_id
  
  INSERT tender → tenders table
  INSERT items → tender_items table (each with different vendor_id)

Database result:
  tenders: 1 row (tender_type='annual-tender')
  tender_items: 3 rows (with different vendor_ids per item)
```

---

## Migration Path

```
Timeline:

Day 1 (DONE): ✅
  ✅ Remove separate annual tender tables from code
  ✅ Update all API calls to unified endpoint
  ✅ Prepare migration scripts

Day 2 (NEXT): 🔄
  ⏳ Execute database migration
     • Add vendor_id column
     • Add pricing columns
     • Create indexes
  
Day 3 (AFTER DB): 🔄
  ⏳ Frontend integration
     • Update form components
     • Integrate TenderWizard
     • Add type selector
  
Day 4+: 🔄
  ⏳ Testing
     • Create test data for each type
     • Verify vendor_id assignments
     • Verify pricing captured
  
Day 5+: 🔄
  ⏳ Cleanup
     • Drop old annual tender tables
     • Archive old code/components
     • Document lessons learned
```

---

## File Structure After Cleanup

```
ims-v1/
├── src/
│   ├── pages/
│   │   ├── ContractTender.tsx          ← Shows all three types
│   │   ├── CreateTender.tsx            ← Type selector
│   │   ├── AnnualTenderManagement.tsx  ❌ REMOVED
│   │   └── ... other pages
│   │
│   ├── components/
│   │   ├── tender/
│   │   │   ├── TenderWizard.tsx        ← For annual tenders
│   │   │   ├── Dashboard.tsx           ← Updated: uses /api/tenders
│   │   │   ├── TenderView.tsx          ← Updated: uses /api/tenders
│   │   │   ├── TenderForm.tsx          ← For contract/spot-purchase
│   │   │   └── ... other components
│   │   │
│   │   └── layout/
│   │       └── AppSidebar.tsx          ← Updated: menu fixed
│   │
│   ├── App.tsx                         ← Updated: route removed
│   └── ... other files
│
├── backend-server.cjs                  ← Updated: handles all types
├── update-tender-items-add-vendor.sql  ← Ready to execute
├── drop-annual-tender-tables.sql       ← For cleanup
│
└── Documentation/
    ├── CLEANUP-SUMMARY.md
    ├── UNIFIED-TENDER-SCHEMA-VENDOR-PRICE.md
    ├── IMPLEMENTATION-CHECKLIST-UNIFIED-TENDERS.md
    ├── ANNUAL-TENDER-CLEANUP-COMPLETE.md
    └── ... other docs
```

---

## Summary

✅ **System is now unified**: All tender types (contract, spot-purchase, annual-tender) use the same database table and API endpoints.

✅ **Semantic differences preserved**: Each type has different vendor_id and pricing semantics, but stored in same structure.

✅ **Code cleanup complete**: No more separate annual tender system code.

✅ **Ready for integration**: Database migration and frontend updates ready to execute.

🚀 **Next step**: Execute database migration!
