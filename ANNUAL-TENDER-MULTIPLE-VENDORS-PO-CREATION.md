# 🎯 Annual Tender Multiple Vendors - PO Creation Strategy

## The Scenario

You have an **Annual Tender with items from MULTIPLE vendors**:

```
Annual Tender: "Office Supplies 2026"
├─ Item 1: Paper Reams (qty: 100) → Vendor A
├─ Item 2: Ink Cartridges (qty: 50) → Vendor B  
├─ Item 3: Folders (qty: 200) → Vendor C
└─ Item 4: Notepads (qty: 150) → Vendor A
```

**Question:** How do we create Purchase Orders?

---

## Solution: Automatic Vendor Grouping

When you select items from this tender and create POs, the system **automatically groups items by vendor** and creates **separate POs for each vendor**:

### Database Schema

**tender_items table:**
```
id      tender_id  item_master_id  nomenclature      quantity  vendor_id
────────────────────────────────────────────────────────────────────────
item-1  tender-1   item-A          Paper Reams       100       vendor-100
item-2  tender-1   item-B          Ink Cartridges    50        vendor-200
item-3  tender-1   item-C          Folders           200       vendor-300
item-4  tender-1   item-D          Notepads          150       vendor-100
```

---

## The PO Creation Flow

### Step 1: User Selects Items

**Request:**
```javascript
POST /api/purchase-orders
{
  "tenderId": "tender-1",
  "selectedItems": ["item-1", "item-2", "item-3", "item-4"],  // All items
  "poDate": "2026-01-14"
}
```

---

### Step 2: Backend Groups by Vendor

**What the backend does:**

```javascript
// Step 1: Fetch all items with their vendors
allItems = [
  { id: "item-1", nomenclature: "Paper", quantity: 100, vendor_id: "vendor-100", unit_price: 50 },
  { id: "item-2", nomenclature: "Ink", quantity: 50, vendor_id: "vendor-200", unit_price: 100 },
  { id: "item-3", nomenclature: "Folders", quantity: 200, vendor_id: "vendor-300", unit_price: 5 },
  { id: "item-4", nomenclature: "Notepads", quantity: 150, vendor_id: "vendor-100", unit_price: 20 }
]

// Step 2: GROUP BY VENDOR
itemsByVendor = {
  "vendor-100": [
    { id: "item-1", nomenclature: "Paper", quantity: 100, unit_price: 50 },  // 100*50 = 5000
    { id: "item-4", nomenclature: "Notepads", quantity: 150, unit_price: 20 }  // 150*20 = 3000
  ],
  "vendor-200": [
    { id: "item-2", nomenclature: "Ink", quantity: 50, unit_price: 100 }  // 50*100 = 5000
  ],
  "vendor-300": [
    { id: "item-3", nomenclature: "Folders", quantity: 200, unit_price: 5 }  // 200*5 = 1000
  ]
}

// Step 3: CREATE SEPARATE PO FOR EACH VENDOR
PO1: vendor-100, items: [Paper, Notepads], total: 8000
PO2: vendor-200, items: [Ink], total: 5000
PO3: vendor-300, items: [Folders], total: 1000
```

---

### Step 3: Multiple POs Created

**Response:**
```json
{
  "message": "✅ 3 Purchase Order(s) created successfully (grouped by vendor)",
  "pos": [
    {
      "id": 1001,
      "po_number": "PO000001",
      "vendor_id": "vendor-100",
      "item_count": 2,
      "total_amount": 8000
    },
    {
      "id": 1002,
      "po_number": "PO000002",
      "vendor_id": "vendor-200",
      "item_count": 1,
      "total_amount": 5000
    },
    {
      "id": 1003,
      "po_number": "PO000003",
      "vendor_id": "vendor-300",
      "item_count": 1,
      "total_amount": 1000
    }
  ]
}
```

---

## Database Result

### purchase_orders Table

```
id    po_number   tender_id   vendor_id     po_date     total_amount  status
──────────────────────────────────────────────────────────────────────────
1001  PO000001    tender-1    vendor-100    2026-01-14  8000          draft
1002  PO000002    tender-1    vendor-200    2026-01-14  5000          draft
1003  PO000003    tender-1    vendor-300    2026-01-14  1000          draft
```

### purchase_order_items Table

```
id   po_id  item_master_id  nomenclature      quantity  unit_price  total_price
─────────────────────────────────────────────────────────────────────────────
1    1001   item-A          Paper Reams       100       50          5000
2    1001   item-D          Notepads          150       20          3000
3    1002   item-B          Ink Cartridges    50        100         5000
4    1003   item-C          Folders           200       5           1000
```

---

## Contract Tender (For Comparison)

### Scenario: Contract with ONE vendor

**tender_items:**
```
id      tender_id  item_master_id  nomenclature      quantity  vendor_id
────────────────────────────────────────────────────────────────────────
item-1  tender-2   item-A          Paper Reams       100       NULL
item-2  tender-2   item-B          Ink Cartridges    50        NULL
item-3  tender-2   item-C          Folders           200       NULL
```

**tenders table:**
```
id        tender_type  vendor_id
──────────────────────────────
tender-2  contract     vendor-100  ◄── All items from this vendor
```

**When creating PO:**

```javascript
// Backend logic:
if (tender.tender_type === 'contract') {
  // All items use tender's vendor
  itemsByVendor = {
    "vendor-100": [item-1, item-2, item-3]
  }
}

// Result: ONE PO for vendor-100 with all 3 items
```

---

## Code Implementation

### How It Works (Simplified)

```javascript
// 1. Get tender info
const tender = await getTender(tenderId);
const isSingleVendor = ['contract', 'spot-purchase']
  .includes(tender.tender_type?.toLowerCase());

// 2. Fetch items with vendor_id
const items = await getItemsWithVendors(selectedItems);

// 3. Add vendor_id based on tender type
for (item of items) {
  if (isSingleVendor) {
    item.vendor_id = tender.vendor_id;  // From tender
  } else {
    item.vendor_id = item.vendor_id;  // Already in item (annual-tender)
  }
}

// 4. GROUP BY VENDOR
const itemsByVendor = {};
for (item of items) {
  if (!itemsByVendor[item.vendor_id]) {
    itemsByVendor[item.vendor_id] = [];
  }
  itemsByVendor[item.vendor_id].push(item);
}

// 5. CREATE PO FOR EACH VENDOR
const createdPos = [];
for (vendorId in itemsByVendor) {
  const po = createPO(vendorId, itemsByVendor[vendorId]);
  createdPos.push(po);
}

return createdPos;  // Return all created POs
```

---

## Frontend Considerations

### When User Creates POs from Annual Tender

**What the frontend shows:**

1. **Select Items:**
   ```
   ☑ Paper Reams (qty: 100) - Vendor A
   ☑ Ink Cartridges (qty: 50) - Vendor B
   ☑ Folders (qty: 200) - Vendor C
   ```

2. **Create PO Button**
   - User clicks "Create Purchase Orders"
   - System groups by vendor automatically

3. **Result Message:**
   ```
   ✅ 3 Purchase Order(s) created successfully (grouped by vendor)
   
   PO000001: Vendor A - 2 items - Total: 8000
   PO000002: Vendor B - 1 item - Total: 5000
   PO000003: Vendor C - 1 item - Total: 1000
   ```

---

## Why This Approach?

### ✅ Benefits

| Reason | Benefit |
|--------|---------|
| **Vendor Clarity** | Each PO goes to one specific vendor |
| **Accounting** | Easy to reconcile payments per vendor |
| **Delivery Tracking** | Track items by vendor delivery |
| **Negotiation** | Vendor sees only their items |
| **Database Integrity** | PO.vendor_id always matches actual supplier |

### ❌ Why NOT mix vendors in one PO?

```
WRONG:
┌─────────────────────────────────┐
│ PO000001                        │
├─────────────────────────────────┤
│ Paper from Vendor A ✗           │
│ Ink from Vendor B ✗             │  ← Confusing!
│ Folders from Vendor C ✗         │
└─────────────────────────────────┘

RIGHT:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PO000001     │ │ PO000002     │ │ PO000003     │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ Paper        │ │ Ink          │ │ Folders      │
│ Vendor A ✓   │ │ Vendor B ✓   │ │ Vendor C ✓   │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## Example: Real-World Scenario

### Annual Tender: Electronics Supply 2026

**Items in Tender:**
```
Item 1: Laptop Bags (qty: 20)        → Vendor: "TechBags Inc"
Item 2: USB Cables (qty: 500)        → Vendor: "CableWorld"
Item 3: Monitor Stands (qty: 30)     → Vendor: "TechBags Inc"
Item 4: Keyboard Covers (qty: 100)   → Vendor: "AccessoryHub"
Item 5: Screen Protectors (qty: 200) → Vendor: "CableWorld"
```

**When you create POs:**

```
USER ACTION: Select Items 1, 2, 3, 4, 5 and click "Create POs"

SYSTEM GROUPS BY VENDOR:
├─ TechBags Inc: [Item 1, Item 3]
├─ CableWorld: [Item 2, Item 5]
└─ AccessoryHub: [Item 4]

CREATES 3 POs:
┌─────────────────────────────────┐
│ PO000001 (TechBags Inc)         │
│ ├─ Laptop Bags (20) = 2000      │
│ └─ Monitor Stands (30) = 1500   │
│ TOTAL: 3500                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ PO000002 (CableWorld)           │
│ ├─ USB Cables (500) = 1000      │
│ └─ Screen Protectors (200) = 400│
│ TOTAL: 1400                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ PO000003 (AccessoryHub)         │
│ └─ Keyboard Covers (100) = 500  │
│ TOTAL: 500                      │
└─────────────────────────────────┘

MESSAGE: "✅ 3 Purchase Order(s) created successfully (grouped by vendor)"
```

**Each vendor gets their own PO with only their items!**

---

## Technical Details

### Database Changes Made

**purchase_orders.vendor_id column:**
- **Before:** INT (fixed vendor)
- **After:** NVARCHAR(50) to match UNIQUEIDENTIFIER from vendors table
- **Why:** To support UUID vendor IDs from annual-tender items

### Backend Endpoint Updated

**POST /api/purchase-orders**

**Key Changes:**
1. Fetches `vendor_id` from `tender_items` table
2. Determines vendor based on tender type
3. Groups items by vendor automatically
4. Creates separate PO for each vendor group
5. Returns array of created POs instead of single PO

### Query Optimization

```sql
-- Get items WITH vendor info
SELECT 
  ti.id,
  ti.item_master_id,
  ti.quantity,
  ti.vendor_id,          -- ✅ From tender_items
  ti.estimated_unit_price
FROM tender_items ti
LEFT JOIN item_masters im ON ti.item_master_id = im.id
WHERE ti.id = @itemId AND ti.tender_id = @tenderId
```

---

## Testing Scenarios

### Test 1: Annual Tender with 3 Vendors

✅ Create PO with items from 3 vendors
✅ System should return 3 separate POs
✅ Each PO has correct vendor_id
✅ Each PO has correct total_amount

### Test 2: Contract Tender with 1 Vendor

✅ Create PO with items from contract tender
✅ System should return 1 PO
✅ PO has tender's vendor_id
✅ All items grouped together

### Test 3: Mixed Selection

✅ Select only items 1 & 3 from example above
✅ System groups by vendor (both are TechBags Inc)
✅ Creates 1 PO with both items
✅ Total amount correct

---

## Summary

| Scenario | Items Selected | Vendors | POs Created |
|----------|----------------|---------|-------------|
| Annual Tender, all items | [item1, 2, 3, 4] | 3 vendors | 3 POs (one per vendor) |
| Annual Tender, subset | [item1, 3] | 1 vendor | 1 PO (same vendor) |
| Contract Tender | [item1, 2, 3] | 1 vendor | 1 PO (all to same vendor) |

**Bottom Line:** The system automatically handles vendor grouping, so you never have to worry about mixing vendors in one PO! 🎉
