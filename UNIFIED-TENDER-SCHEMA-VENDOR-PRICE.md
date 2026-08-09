# Updated Tender System: vendor_id + Price for All Types

## Data Model Summary

### Three Tender Types with Unified Schema

```sql
-- All three types use the SAME tender_items structure
-- The difference is HOW vendor_id and pricing are populated

┌─────────────────────────────────────────────────────────┐
│ tender_items (Schema for ALL types)                     │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ tender_id (FK → tenders)                                │
│ item_id (FK → item_masters)                             │
│ vendor_id (FK → vendors) ✅ NEW - Required for all types│
│ quantity (INT)                                          │
│ estimated_unit_price (DECIMAL)  ✅ For all types       │
│ actual_unit_price (DECIMAL)      ✅ For all types       │
│ total_amount (DECIMAL)           ✅ For all types       │
│ specifications, remarks, status                         │
│ created_at, updated_at                                  │
└─────────────────────────────────────────────────────────┘
```

---

## How Each Tender Type Uses This Schema

### 1. CONTRACT/SPOT PURCHASE
```
Tender: "Buy Office Equipment"
Awarded Vendor: Vendor A

DATA SAVED:
tender_items[0]:
  ├─ item_id: "laptop-uuid"
  ├─ vendor_id: "vendor-a-uuid"  ← SAME vendor for all items
  ├─ quantity: 5
  ├─ estimated_unit_price: 1000
  ├─ total_amount: 5000
  └─ ...

tender_items[1]:
  ├─ item_id: "monitor-uuid"
  ├─ vendor_id: "vendor-a-uuid"  ← SAME vendor
  ├─ quantity: 5
  ├─ estimated_unit_price: 300
  ├─ total_amount: 1500
  └─ ...

QUERY: "Show me everything Vendor A supplied"
SELECT * FROM tender_items WHERE vendor_id = 'vendor-a-uuid';
→ Returns both laptops AND monitors
```

### 2. ANNUAL TENDER
```
Tender: "Annual Office Supplies"

DATA SAVED:
tender_items[0]:
  ├─ item_id: "stationery-uuid"
  ├─ vendor_id: "vendor-a-uuid"  ← Vendor A: Stationery supplier
  ├─ quantity: 100/month (or as needed)
  ├─ estimated_unit_price: 50
  ├─ total_amount: 5000 (100 × 50)
  └─ ...

tender_items[1]:
  ├─ item_id: "desks-uuid"
  ├─ vendor_id: "vendor-b-uuid"  ← Vendor B: Furniture supplier
  ├─ quantity: 10
  ├─ estimated_unit_price: 200
  ├─ total_amount: 2000
  └─ ...

tender_items[2]:
  ├─ item_id: "printer-cartridges-uuid"
  ├─ vendor_id: "vendor-c-uuid"  ← Vendor C: IT equipment supplier
  ├─ quantity: 200/month
  ├─ estimated_unit_price: 10
  ├─ total_amount: 2000
  └─ ...

QUERY: "Show me everything Vendor A supplied"
SELECT * FROM tender_items WHERE vendor_id = 'vendor-a-uuid';
→ Returns ONLY stationery items (Vendor A's specialty)
```

---

## Backend Logic (Updated)

### POST /api/tenders Request Format

```javascript
// CONTRACT/SPOT PURCHASE
{
  tender_type: "contract",
  reference_number: "TEND-2025-001",
  title: "Office Equipment",
  vendor_id: "vendor-a-uuid",  // ← Awarded vendor
  items: [
    {
      item_master_id: "laptop-uuid",
      nomenclature: "Laptops",
      quantity: 5,
      estimated_unit_price: 1000,
      total_amount: 5000
      // vendor_id: NOT NEEDED - backend uses the tender's vendor_id
    },
    {
      item_master_id: "monitor-uuid",
      nomenclature: "Monitors",
      quantity: 5,
      estimated_unit_price: 300,
      total_amount: 1500
      // vendor_id: NOT NEEDED - backend uses the tender's vendor_id
    }
  ]
}

BACKEND PROCESSING:
✅ All items get vendor_id = "vendor-a-uuid" (from tender.vendor_id)
✅ All price fields captured
✅ Result: Single source for all items in tender
```

```javascript
// ANNUAL TENDER
{
  tender_type: "annual-tender",
  reference_number: "AT-2025-001",
  title: "Annual Supplies",
  // NO vendor_id here - it's per item
  items: [
    {
      item_master_id: "stationery-uuid",
      nomenclature: "Stationery",
      vendor_id: "vendor-a-uuid",  // ← Vendor A supplies this
      quantity: 100,
      estimated_unit_price: 50,
      total_amount: 5000
    },
    {
      item_master_id: "desks-uuid",
      nomenclature: "Desks",
      vendor_id: "vendor-b-uuid",  // ← Vendor B supplies this
      quantity: 10,
      estimated_unit_price: 200,
      total_amount: 2000
    },
    {
      item_master_id: "cartridges-uuid",
      nomenclature: "Cartridges",
      vendor_id: "vendor-c-uuid",  // ← Vendor C supplies this
      quantity: 200,
      estimated_unit_price: 10,
      total_amount: 2000
    }
  ]
}

BACKEND PROCESSING:
✅ Each item uses its specific vendor_id
✅ All price fields captured per item
✅ Result: Vendor-specialty-based assignments
```

---

## Frontend Form Changes

### Contract/Spot Purchase Form

```tsx
<Form>
  <h2>Tender Details</h2>
  <Input label="Reference Number" />
  <Input label="Title" />
  <Select label="Tender Type" value="contract" disabled />
  
  <h2>Vendor (Single Award)</h2>
  <SelectVendor 
    label="Select the Vendor who will supply ALL items"
    onChange={(vendor) => setAwardedVendor(vendor)}
  />
  
  <h2>Items & Pricing</h2>
  {items.map(item => (
    <ItemRow key={item.id}>
      <TextField label="Item" value={item.nomenclature} />
      <NumberField label="Quantity" value={item.quantity} />
      <CurrencyField label="Unit Price" value={item.estimated_unit_price} />
      <CurrencyField label="Total (Qty × Price)" 
        value={item.quantity * item.estimated_unit_price} 
        readOnly 
      />
      {/* vendor_id is auto-filled on submit */}
    </ItemRow>
  ))}
  
  <Button onClick={handleSubmit}>Create Tender</Button>
</Form>

// On Submit:
const handleSubmit = () => {
  const itemsWithVendor = items.map(item => ({
    ...item,
    vendor_id: awardedVendor.id  // ✅ All items get same vendor_id
  }));
  
  POST /api/tenders {
    tender_type: "contract",
    vendor_id: awardedVendor.id,
    items: itemsWithVendor
  };
};
```

### Annual Tender Form (Your TenderWizard)

```tsx
<Form>
  <h2>Tender Details</h2>
  <Input label="Reference Number" />
  <Input label="Title" />
  <Select label="Tender Type" value="annual-tender" disabled />
  
  <h2>Vendor-Specific Items</h2>
  {selectedVendors.map(vendor => (
    <VendorSection key={vendor.id} vendor={vendor}>
      <h3>{vendor.vendor_name} (Specialty Items)</h3>
      
      {vendorItems[vendor.id].map(item => (
        <ItemRow key={item.id}>
          <TextField label="Item" value={item.nomenclature} />
          <NumberField label="Quantity" value={item.quantity} />
          <CurrencyField label="Unit Price" value={item.estimated_unit_price} />
          <CurrencyField label="Total (Qty × Price)" 
            value={item.quantity * item.estimated_unit_price} 
            readOnly 
          />
          {/* vendor_id already set to this vendor */}
        </ItemRow>
      ))}
    </VendorSection>
  ))}
  
  <Button onClick={handleSubmit}>Create Annual Tender</Button>
</Form>

// On Submit:
const handleSubmit = () => {
  const allItems = [];
  selectedVendors.forEach(vendor => {
    vendorItems[vendor.id].forEach(item => {
      allItems.push({
        ...item,
        vendor_id: vendor.id  // ✅ Each item has specific vendor_id
      });
    });
  });
  
  POST /api/tenders {
    tender_type: "annual-tender",
    items: allItems  // Each item already has vendor_id set
  };
};
```

---

## Database Schema Reference

### tender_items table structure

```sql
-- After migration runs:
DESCRIBE tender_items;

Column Name             | Type              | Nullable | Default
-----------------------+-------------------+----------+--------
id                     | uniqueidentifier  | NO       | -
tender_id              | uniqueidentifier  | NO       | -
item_id                | uniqueidentifier  | NO       | -
vendor_id              | uniqueidentifier  | YES      | NULL  ← NEW COLUMN
quantity               | int               | YES      | NULL
estimated_unit_price   | decimal(15,2)     | YES      | NULL  ← Price field
actual_unit_price      | decimal(15,2)     | YES      | NULL  ← Final price
total_amount           | decimal(15,2)     | YES      | NULL  ← Qty × Price
specifications         | nvarchar(max)     | YES      | NULL
remarks                | nvarchar(max)     | YES      | NULL
status                 | varchar(50)       | YES      | NULL
created_at             | datetime          | YES      | GETDATE()
updated_at             | datetime          | YES      | GETDATE()
```

---

## SQL Queries

### Get contract items with vendor info
```sql
SELECT 
  ti.id,
  ti.nomenclature,
  ti.quantity,
  ti.estimated_unit_price,
  ti.total_amount,
  v.vendor_name,
  t.reference_number,
  t.tender_type
FROM tender_items ti
INNER JOIN tenders t ON ti.tender_id = t.id
INNER JOIN vendors v ON ti.vendor_id = v.id
WHERE t.tender_type = 'contract'
  AND t.reference_number = 'TEND-2025-001'
ORDER BY ti.nomenclature;
```

### Get annual tender items by vendor
```sql
SELECT 
  ti.id,
  ti.nomenclature,
  ti.quantity,
  ti.estimated_unit_price,
  ti.total_amount,
  v.vendor_name,
  t.reference_number
FROM tender_items ti
INNER JOIN tenders t ON ti.tender_id = t.id
INNER JOIN vendors v ON ti.vendor_id = v.id
WHERE t.tender_type = 'annual-tender'
  AND v.vendor_name = 'Vendor A'
ORDER BY t.reference_number, ti.nomenclature;
```

### Procurement cost analysis (by vendor)
```sql
SELECT 
  v.vendor_name,
  t.tender_type,
  COUNT(DISTINCT ti.id) as item_count,
  SUM(ti.total_amount) as total_cost,
  AVG(ti.estimated_unit_price) as avg_unit_price
FROM tender_items ti
INNER JOIN vendors v ON ti.vendor_id = v.id
INNER JOIN tenders t ON ti.tender_id = t.id
GROUP BY v.vendor_name, t.tender_type
ORDER BY total_cost DESC;
```

---

## Summary Table

| Feature | Contract | Spot Purchase | Annual Tender |
|---------|----------|---------------|---------------|
| **vendor_id** | Single (all items) | Single (all items) | Multiple (per item) |
| **Price Fields** | ✅ Yes (quantity + unit price) | ✅ Yes (quantity + unit price) | ✅ Yes (with or without qty) |
| **Quantity** | ✅ Required | ✅ Required | ✅ Optional (standing order) |
| **Form Type** | Standard form | Standard form | Multi-vendor wizard |
| **Items Visibility** | All vendors see all items | All vendors see all items | Each vendor sees only their items |
| **Data saved** | One vendor, multiple items | One vendor, multiple items | Multiple vendors, different items |

**KEY INSIGHT:**
- **vendor_id is ALWAYS populated** (never NULL)
- **Price is ALWAYS captured** (all three types)
- Difference is HOW they're populated and USED, not WHETHER they exist
