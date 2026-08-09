# Annual Tender: Vendor Assignment Flow 📋

## The Two Different Vendor Scenarios

### 1️⃣ CONTRACT / SPOT-PURCHASE TENDERS
```
Single Vendor for ALL Items
├─ Vendor stored in: tenders.vendor_id
├─ All items share the same vendor
└─ Example: All 5 items from "XYZ Supplies Inc."

Database:
┌─────────────────────────────────────┐
│ tenders table                       │
├─────────────────────────────────────┤
│ id: tender-001                      │
│ tender_type: "contract"             │
│ vendor_id: vendor-123 ◄─── ONE      │
└─────────────────────────────────────┘
         ▼
┌─────────────────────────────────────┐
│ tender_items table                  │
├─────────────────────────────────────┤
│ id: item-1  vendor_id: NULL         │◄── Item 1 uses vendor-123 from parent tender
│ id: item-2  vendor_id: NULL         │◄── Item 2 uses vendor-123 from parent tender
│ id: item-3  vendor_id: NULL         │◄── Item 3 uses vendor-123 from parent tender
└─────────────────────────────────────┘

When creating PO, all items get vendor-123
```

---

### 2️⃣ ANNUAL TENDERS 🎯
```
DIFFERENT Vendor for EACH Item
├─ Vendor stored in: tender_items.vendor_id (per row)
├─ Each item can be from different vendor
└─ Example:
   - Item 1 (Paper) from "Vendor A"
   - Item 2 (Ink) from "Vendor B" 
   - Item 3 (Folders) from "Vendor C"

Database:
┌─────────────────────────────────────┐
│ tenders table                       │
├─────────────────────────────────────┤
│ id: tender-002                      │
│ tender_type: "annual-tender"        │
│ vendor_id: NULL ◄─── NOT USED       │
└─────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────┐
│ tender_items table                      │
├─────────────────────────────────────────┤
│ id: item-1  vendor_id: vendor-100      │◄── Paper from Vendor A
│ id: item-2  vendor_id: vendor-200      │◄── Ink from Vendor B
│ id: item-3  vendor_id: vendor-300      │◄── Folders from Vendor C
└─────────────────────────────────────────┘

When creating PO, EACH item gets its own vendor!
```

---

## How Vendor Gets Added (Code Flow)

### When You Create a Tender (POST /api/tenders)

```javascript
// ✅ Step 1: Determine tender type
const tender_type = tenderData.tender_type || 'contract';
const awardedVendorId = tenderData.vendor_id; // From form

// ✅ Step 2: Loop through each item
for (const item of items) {
  
  // ✅ Step 3: DECIDE WHERE VENDOR COMES FROM
  let itemVendorId = null;
  
  if (tender_type === 'annual-tender') {
    // 🎯 ANNUAL TENDER: Each item HAS its own vendor_id
    // Frontend sends: item.vendor_id for each item
    itemVendorId = item.vendor_id;  // ← From the item itself!
  } 
  else if (['contract', 'spot-purchase'].includes(tender_type)) {
    // CONTRACT/SPOT: All items share tender's vendor
    // Frontend sends: One vendor for all items
    itemVendorId = awardedVendorId || item.vendor_id;  // ← From tender table
  }

  // ✅ Step 4: Save to tender_items
  INSERT INTO tender_items (
    id, tender_id, vendor_id, ...
  ) VALUES (@id, @tender_id, @vendor_id, ...)
}
```

---

## Frontend: How Vendor Gets Submitted

### Annual Tender Form
```javascript
// User fills in tender form
const tenderData = {
  tender_type: 'annual-tender',
  title: 'Office Supplies - 2026',
  description: '...',
  // NO vendor_id here! Each item has its own
}

// User fills in ITEMS with their vendors
const items = [
  {
    item_master_id: 'item-A',
    nomenclature: 'Paper Reams',
    quantity: 100,
    vendor_id: 'vendor-100',  // 🎯 Paper comes from Vendor A
  },
  {
    item_master_id: 'item-B',
    nomenclature: 'Ink Cartridges',
    quantity: 50,
    vendor_id: 'vendor-200',  // 🎯 Ink comes from Vendor B
  },
  {
    item_master_id: 'item-C',
    nomenclature: 'Folders',
    quantity: 200,
    vendor_id: 'vendor-300',  // 🎯 Folders come from Vendor C
  }
]

// Send to backend
POST /api/tenders
{
  tenderData,
  items  // ← Each item has vendor_id
}
```

---

### Contract Tender Form
```javascript
// User fills in tender form
const tenderData = {
  tender_type: 'contract',
  title: 'Construction Materials Supply',
  description: '...',
  vendor_id: 'vendor-500',  // 🎯 ONE vendor for ALL items
}

// User fills in ITEMS (NO vendor_id needed)
const items = [
  {
    item_master_id: 'item-X',
    nomenclature: 'Cement Bags',
    quantity: 1000,
    // NO vendor_id here - all from vendor-500
  },
  {
    item_master_id: 'item-Y',
    nomenclature: 'Steel Rods',
    quantity: 500,
    // NO vendor_id here - all from vendor-500
  },
  {
    item_master_id: 'item-Z',
    nomenclature: 'Concrete',
    quantity: 2000,
    // NO vendor_id here - all from vendor-500
  }
]

// Send to backend
POST /api/tenders
{
  tenderData,  // ← Contains vendor_id
  items        // ← No vendor_id in items
}
```

---

## When Fetching Items (GET /api/tender/:id/items)

### For Contract Tender:
```sql
SELECT 
  ti.id,
  ti.nomenclature,
  ti.quantity,
  ti.estimated_unit_price,
  @tenderVendorId as vendor_id  ← ADDED from parent tender!
FROM tender_items ti
WHERE ti.tender_id = @tender_id
```

**Result:**
```json
[
  { "id": "item-1", "nomenclature": "Cement", "vendor_id": "vendor-500" },
  { "id": "item-2", "nomenclature": "Steel", "vendor_id": "vendor-500" },
  { "id": "item-3", "nomenclature": "Concrete", "vendor_id": "vendor-500" }
]
```

---

### For Annual Tender:
```sql
SELECT 
  ti.id,
  ti.nomenclature,
  ti.quantity,
  ti.estimated_unit_price,
  ti.vendor_id  ← ALREADY in the item!
FROM tender_items ti
WHERE ti.tender_id = @tender_id
```

**Result:**
```json
[
  { "id": "item-1", "nomenclature": "Paper", "vendor_id": "vendor-100" },
  { "id": "item-2", "nomenclature": "Ink", "vendor_id": "vendor-200" },
  { "id": "item-3", "nomenclature": "Folders", "vendor_id": "vendor-300" }
]
```

---

## Summary Table

| Aspect | Contract/Spot-Purchase | Annual Tender |
|--------|------------------------|---------------|
| **Vendor Location** | `tenders.vendor_id` | `tender_items.vendor_id` |
| **Same vendor for all items?** | ✅ YES (uniform) | ❌ NO (per-item) |
| **How vendor set in DB** | Set once on tender | Set for each item |
| **Form submission** | `tenderData.vendor_id` | `item[i].vendor_id` |
| **Use case** | Supply contract from one supplier | Standing offer pool (any item from any vendor) |

---

## Real Example: Office Supplies Annual Tender

**You want to create an annual tender for office supplies where:**
- Paper can come from **Paper Supplier Co.**
- Ink can come from **Ink World Inc.**
- Folders can come from **Stationery Plus**

**What you do:**

### In UI Form
```
Tender Title: "Office Supplies - 2026"
Type: "Annual Tender"  ← Key difference!
Description: "..."

Items:
┌─────────────────────────────────────────────┐
│ Item 1: Paper Reams                         │
│ Quantity: 100                               │
│ Vendor: Paper Supplier Co.    ◄─ Each item │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Item 2: Ink Cartridges                      │
│ Quantity: 50                                │
│ Vendor: Ink World Inc.        ◄─ Different │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Item 3: Folders                             │
│ Quantity: 200                               │
│ Vendor: Stationery Plus       ◄─ Vendor    │
└─────────────────────────────────────────────┘
```

### In Database After Save
```
tender_items table:
┌──────────────────────────────────────────────────┐
│ id  │ nomenclature  │ quantity │ vendor_id      │
├──────────────────────────────────────────────────┤
│ 001 │ Paper Reams   │ 100      │ vendor-paper   │
│ 002 │ Ink Cartridge │ 50       │ vendor-ink     │
│ 003 │ Folders       │ 200      │ vendor-station │
└──────────────────────────────────────────────────┘
         ▲                           ▲
         └───────────────────────────┴─ Each row has different vendor!
```

### When Creating PO
```
Purchase Order can mix & match from the annual tender:
- Order 100 Paper Reams from Paper Supplier Co. (vendor-paper)
- Order 50 Ink from Ink World Inc. (vendor-ink)
- Order 200 Folders from Stationery Plus (vendor-station)

OR:

- Order 100 Paper Reams from Paper Supplier Co. (vendor-paper)
- Order 200 Folders from Stationery Plus (vendor-station)

That's the flexibility of annual tenders! Each item remembers its vendor.
```

---

## Key Takeaway 🎯

**Annual Tender Vendor Flow:**
1. **Frontend** sends each item with its own `vendor_id`
2. **Backend** stores `vendor_id` in the `tender_items` row for that item
3. **When creating PO** each item already "knows" which vendor it came from
4. **Result:** Flexibility to source different items from different vendors from the same tender pool

It's like having a catalog where:
- Product A is always from Supplier X
- Product B is always from Supplier Y
- Product C is always from Supplier Z

But they're all part of the same "Office Supplies Annual Tender"!
