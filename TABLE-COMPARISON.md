# Table Comparison: tender_items vs TenderItems

## Summary
**`tender_items` (lowercase) = CORRECT & ACTIVE**  
**`TenderItems` (capitalized) = LEGACY/PARALLEL (different system)**

---

## Detailed Comparison

### 1. `tender_items` (Lowercase) - THE MAIN TABLE ✅

**Location:** `create-complete-database-schema.sql`

**Schema:**
```sql
CREATE TABLE tender_items (
    id NVARCHAR(50) PRIMARY KEY,
    tender_id NVARCHAR(50),
    item_master_id NVARCHAR(50),        ← Link to item_masters
    nomenclature NVARCHAR(200),
    quantity DECIMAL(10,2),
    estimated_unit_price DECIMAL(15,2),
    actual_unit_price DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    specifications NVARCHAR(1000),
    remarks NVARCHAR(500),
    status NVARCHAR(20),
    created_at DATETIME2,
    updated_at DATETIME2
);
```

**Used By:**
- ✅ `POST /api/tenders` (line 5181) - Main tender creation endpoint
- ✅ All contract, spot-purchase, and annual-tender creation in the primary UI
- ✅ Purchase Order system queries this table

**Data Structure:**
- Uses `item_master_id` to reference items
- No `vendor_id` column (vendor stored in tenders table for contract/spot-purchase)
- Has full pricing fields for all tender types

---

### 2. `TenderItems` (Capitalized) - PARALLEL/LEGACY ⚠️

**Location:** `create-annual-tenders-table.sql`

**Schema:**
```sql
CREATE TABLE TenderItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tender_id UNIQUEIDENTIFIER,
    item_id UNIQUEIDENTIFIER,            ← Link to item_masters
    quantity INT,
    created_at DATETIME2
);
```

**Used By:**
- ⚠️ `POST /api/annual-tenders` (line 7968) - Alternate annual-tender creation endpoint
- ⚠️ `GET /api/annual-tenders/:id` (line 7868) - Query for specific annual tender
- ⚠️ Not used in Purchase Order system
- ⚠️ Limited to annual-tenders only

**Data Structure:**
- Uses `item_id` instead of `item_master_id`
- Simpler schema (no pricing, no nomenclature)
- Different structure entirely

---

## Why Two Tables Exist

This appears to be from refactoring history:

1. **Original System:** Used `tender_items` (lowercase) with full columns
2. **New Annual Tender System:** Created `TenderItems` (capitalized) with simplified schema
3. **Result:** Two parallel systems in the codebase

---

## Current Status

### ✅ What Works:
- Main UI → POST /api/tenders → stores to `tender_items` ✓
- Purchase Orders → fetch from `tender_items` ✓
- Contract/Spot-purchase tenders ✓
- Annual-tender tenders (via main UI) ✓

### ⚠️ What Needs Cleanup:
- Alternative `/api/annual-tenders` endpoints use different table
- Risk of data inconsistency if both systems are used
- Confusing for new developers

---

## Recommendation

**Use `tender_items` (lowercase) for everything:**
- It's the main system that Purchase Orders depend on
- It has all necessary columns
- It's used by the primary UI
- Consider removing or deprecating `/api/annual-tenders` endpoints that use `TenderItems`

**Never use `TenderItems` for new features** - stick with `tender_items` table.

