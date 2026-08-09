# EXACT IMPLEMENTATION: Contract/Tender System Code Flow

## 1. HOW CONTRACT/TENDER FORM WORKS TODAY

### Frontend User Journey
```
User clicks "Create Contract/Tender"
  ↓
OPENS: src/pages/ContractTender.tsx (useNavigate to create-tender?type=contract)
  ↓
LOADS: src/components/tenders/ContractTenderForm.tsx (or TenderFormFresh2.tsx)
  ↓
FORM FIELDS DISPLAYED:
  ├─ reference_number (text)
  ├─ title (text)
  ├─ tender_type (hidden, set to 'contract')
  ├─ submission_deadline (date)
  ├─ estimated_value (decimal)
  └─ items (dynamic table)
       ├─ Item 1: Nomenclature, Quantity, Price
       ├─ Item 2: ...
       └─ Item N: ...
  ↓
USER SUBMITS FORM
  ↓
JAVASCRIPT CODE (form component):
  POST http://localhost:3001/api/tenders
  with JSON:
  {
    reference_number: "TEND-2025-001",
    title: "Office Equipment",
    tender_type: "contract",
    submission_deadline: "2025-02-01",
    items: [
      { nomenclature: "Laptops", quantity: 5, estimated_unit_price: 1000 },
      { nomenclature: "Monitors", quantity: 5, estimated_unit_price: 300 }
    ]
  }
```

### Backend Processing
```
REQUEST ARRIVES at POST /api/tenders (backend-server.cjs:5055)
  ↓
BACKEND CODE DOES:
  1. Generates tenderId = new UUID
  2. Extracts tenderData and items from request body
  3. Starts database TRANSACTION
  ↓
  4. INSERT into tenders table:
     INSERT INTO tenders (id, reference_number, title, tender_type, ...)
     VALUES (tenderId, 'TEND-2025-001', 'Office Equipment', 'contract', ...)
  ↓
  5. INSERT into tender_items for each item:
     INSERT INTO tender_items (tender_id, item_master_id, nomenclature, quantity, ...)
     VALUES (tenderId, item_id_from_lookup, 'Laptops', 5, ...)
  ↓
  6. COMMIT TRANSACTION
  ↓
RESPONSE SENT: { success: true, tenderId: "uuid-..." }
```

---

## 2. HOW TO MAKE ANNUAL TENDER PART OF THIS SYSTEM

### Database First: Add vendor_id Column

```sql
-- Current structure (NO vendor_id):
SELECT * FROM tender_items;
/*
tender_id    | item_id | nomenclature | quantity | vendor_id
-------------|---------|--------------|----------|----------
uuid-123     | uuid-456| Laptops      | 5        | NULL
uuid-123     | uuid-789| Monitors     | 3        | NULL
*/

-- After adding vendor_id:
ALTER TABLE tender_items
ADD vendor_id UNIQUEIDENTIFIER NULL;

-- Now you can have:
SELECT * FROM tender_items;
/*
tender_id    | item_id | nomenclature | quantity | vendor_id     
-------------|---------|--------------|----------|------------------
uuid-123     | uuid-456| Laptops      | 5        | NULL  (contract - all vendors)
uuid-123     | uuid-789| Monitors     | 3        | NULL  (contract - all vendors)
uuid-999     | uuid-111| Stationery   | 100      | vendor-a-uuid  (annual - vendor specific)
uuid-999     | uuid-222| Desks        | 10       | vendor-b-uuid  (annual - vendor specific)
uuid-999     | uuid-333| Cartridges   | 200      | vendor-c-uuid  (annual - vendor specific)
*/
```

---

## 3. EXACT CODE CHANGES NEEDED

### A. Backend: Modify POST /api/tenders (backend-server.cjs:5055-5160)

**CURRENT CODE (lines 5055-5110):**
```javascript
app.post('/api/tenders', upload.fields([...]), async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();

    // ... parse tender data ...

    // INSERT into tenders
    let insertQuery = 'INSERT INTO tenders (id, created_at, updated_at, is_finalized';
    // ... loops through fields ...

    await tenderRequest.query(insertQuery);

    // INSERT into tender_items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        // ... insert item ...
      }
    }

    await transaction.commit();
    res.status(201).json({ success: true, tenderId });
  }
});
```

**MODIFIED CODE (add vendor handling):**
```javascript
app.post('/api/tenders', upload.fields([...]), async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();

    let tenderData, items;
    
    if (req.body.tenderData) {
      const parsedData = JSON.parse(req.body.tenderData);
      items = parsedData.items;
      tenderData = { ...parsedData };
      delete tenderData.items;
    } else {
      const { items: itemsFromBody, ...tenderDataFromBody } = req.body;
      items = itemsFromBody;
      tenderData = tenderDataFromBody;
    }

    // ✅ NEW: Validate annual-tender has vendor_id for each item
    const tender_type = tenderData.tender_type || 'contract';
    
    if (tender_type === 'annual-tender') {
      // Annual tender REQUIRES vendor_id for each item
      const hasAllVendorIds = items && items.every(item => item.vendor_id);
      if (!hasAllVendorIds) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Annual tender requires vendor_id for each item',
          message: 'Each item must be assigned to a specific vendor'
        });
      }
    } else {
      // For contract/spot-purchase, vendor_id should be NULL
      if (items && Array.isArray(items)) {
        items.forEach(item => item.vendor_id = null);
      }
    }

    // ... rest of INSERT code ...

    // INSERT into tender_items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemRequest = transaction.request();
        itemRequest.input('id', sql.NVarChar, uuidv4());
        itemRequest.input('tender_id', sql.NVarChar, tenderId);
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);

        let itemInsertQuery = 'INSERT INTO tender_items (id, tender_id, created_at, updated_at';
        let itemValuesQuery = 'VALUES (@id, @tender_id, @created_at, @updated_at';

        // ✅ MODIFIED: Always include vendor_id in insert
        if (item.vendor_id !== undefined) {
          itemInsertQuery += ', vendor_id';
          itemValuesQuery += ', @vendor_id';
          itemRequest.input('vendor_id', sql.NVarChar, item.vendor_id || null);
        }

        // ... rest of item fields ...
        
        itemInsertQuery += ') ' + itemValuesQuery + ')';
        await itemRequest.query(itemInsertQuery);
      }
    }

    await transaction.commit();
    res.status(201).json({ success: true, tenderId });
  }
});
```

---

### B. Frontend: Update Form Component

**PATH 1: Modify ContractTenderForm.tsx**
```typescript
// In src/components/tenders/TenderFormFresh2.tsx

// Add type handling:
const TenderForm = () => {
  const queryParams = new URLSearchParams(location.search);
  const tenderType = queryParams.get('type') || 'contract'; // contract, spot-purchase, annual-tender

  // ... existing form code ...

  if (tenderType === 'annual-tender') {
    // Show vendor selection per item
    return (
      <>
        {/* Tender details */}
        <TenderDetailsSection />
        
        {/* ✅ NEW: Vendor-specific item assignment */}
        <AnnualTenderItemsSection items={items} />
      </>
    );
  } else {
    // Show standard item form (all vendors get all items)
    return (
      <>
        <TenderDetailsSection />
        <StandardItemsSection items={items} />
      </>
    );
  }
};

// OR use your existing TenderWizard component:
if (tenderType === 'annual-tender') {
  return <TenderWizard />;
} else {
  return <ContractTenderForm />;
}
```

---

### C. Frontend: Update ContractTender.tsx Dashboard

**PATH: src/pages/ContractTender.tsx (lines ~100-130)**

**CURRENT:**
```typescript
const ContractTender: React.FC<ContractTenderProps> = ({ initialType }) => {
  const isSpotPurchase = initialType === 'Spot Purchase';
  
  const fetchTenders = async () => {
    const data = await fetch('http://localhost:3001/api/tenders');
    const tenders = await data.json();
    
    // Filter by type
    const filteredTenders = isSpotPurchase 
      ? data.filter((t: Tender) => t.tender_type === 'spot-purchase')
      : data.filter((t: Tender) => t.tender_type === 'contract');
    
    setTenders(filteredTenders);
  };
};
```

**MODIFIED:**
```typescript
const ContractTender: React.FC<ContractTenderProps> = ({ initialType }) => {
  // ✅ NEW: Support three types
  const getTenderTypeFromInitial = () => {
    if (initialType === 'Spot Purchase') return 'spot-purchase';
    if (initialType === 'Annual Tender') return 'annual-tender';
    return 'contract';
  };
  
  const tenderTypeToFilter = getTenderTypeFromInitial();
  const dashboardTitle = initialType || 'Contract/Tender Management';
  
  const fetchTenders = async () => {
    const data = await fetch('http://localhost:3001/api/tenders');
    const allTenders = await data.json();
    
    // Filter by tender type
    const filteredTenders = allTenders.filter(
      (t: Tender) => t.tender_type === tenderTypeToFilter
    );
    
    setTenders(filteredTenders);
  };
};
```

---

### D. Frontend: Update AppSidebar.tsx Menu

**PATH: src/components/layout/AppSidebar.tsx (~line 200)**

**CURRENT:**
```tsx
<Link to="/dashboard/contract-tender?type=contract">
  Contract/Tender
</Link>
<Link to="/dashboard/contract-tender?type=spot-purchase">
  Spot Purchase
</Link>
```

**MODIFIED:**
```tsx
<Link to="/dashboard/contract-tender?type=contract">
  Contract/Tender
</Link>
<Link to="/dashboard/contract-tender?type=spot-purchase">
  Spot Purchase
</Link>
{/* ✅ NEW: Annual Tender Link */}
<Link to="/dashboard/contract-tender?type=annual-tender">
  Annual Tender
</Link>
```

---

## 4. DATA FLOW DIAGRAM

### Contract/Spot Purchase (vendor_id = NULL)
```
User Form → POST /api/tenders
  {
    tender_type: "contract",
    items: [
      { nomenclature: "Laptops", quantity: 5, vendor_id: null }  ← NULL
    ]
  }
  ↓
Backend processes:
  INSERT INTO tenders (tender_type='contract')
  INSERT INTO tender_items (vendor_id=NULL)  ← NULL means all vendors can bid
```

### Annual Tender (vendor_id = specific_vendor_uuid)
```
User Form → POST /api/tenders
  {
    tender_type: "annual-tender",
    items: [
      { nomenclature: "Stationery", quantity: 100, vendor_id: "uuid-A" },  ← Vendor A
      { nomenclature: "Desks", quantity: 10, vendor_id: "uuid-B" }         ← Vendor B
    ]
  }
  ↓
Backend processes:
  INSERT INTO tenders (tender_type='annual-tender')
  INSERT INTO tender_items (vendor_id='uuid-A', vendor_id='uuid-B')  ← SPECIFIC vendors
```

---

## 5. QUERY EXAMPLES

### Get All Contract Tenders
```sql
SELECT * FROM tenders WHERE tender_type = 'contract';
```

### Get All Annual Tenders
```sql
SELECT * FROM tenders WHERE tender_type = 'annual-tender';
```

### Get Annual Tender Items for Vendor A
```sql
SELECT ti.* 
FROM tender_items ti
INNER JOIN tenders t ON ti.tender_id = t.id
WHERE t.tender_type = 'annual-tender'
  AND ti.vendor_id = 'vendor-a-uuid';

-- Returns only items assigned to Vendor A
```

### Get All Items in a Contract (all vendors can bid on all)
```sql
SELECT ti.* 
FROM tender_items ti
WHERE ti.tender_id = 'contract-uuid'
  AND ti.vendor_id IS NULL;

-- Returns all items with NULL vendor_id (all vendors see these)
```

---

## 6. TESTING CHECKLIST

After implementation, test these scenarios:

- [ ] **Contract Tender Creation**
  - Create contract with multiple items
  - Verify tender_type = 'contract'
  - Verify all items have vendor_id = NULL
  - Verify vendor list shows all vendors participating

- [ ] **Spot Purchase Creation**
  - Create spot purchase with items
  - Verify tender_type = 'spot-purchase'
  - Verify all items have vendor_id = NULL

- [ ] **Annual Tender Creation**
  - Create annual tender with vendor-specific items
  - Verify tender_type = 'annual-tender'
  - Verify each item has correct vendor_id assigned
  - Verify Form rejects if vendor_id missing

- [ ] **Filtering Works**
  - Click "Contract/Tender" → shows only contracts
  - Click "Spot Purchase" → shows only spot purchases
  - Click "Annual Tender" → shows only annual tenders

- [ ] **Vendor Assignment**
  - In annual tender, Vendor A only sees their assigned items
  - In contract, all vendors see all items

---

## SUMMARY OF CHANGES

| File | Change | Impact |
|------|--------|--------|
| `backend-server.cjs` | Add vendor_id validation & insert | Saves vendor-specific items |
| `TenderFormFresh2.tsx` OR your `TenderWizard.tsx` | Add vendor_id per item input | Allows vendor selection per item |
| `ContractTender.tsx` | Add annual-tender type filtering | Shows annual tenders in dashboard |
| `AppSidebar.tsx` | Add menu link for Annual Tender | Users can navigate to annual tender |
| **DATABASE** | Add vendor_id column to tender_items | Stores vendor-specific assignments |

**NEXT:** Which approach do you want to take?
- **Option A:** Implement all changes above (RECOMMENDED)
- **Option B:** Keep separate /api/annual-tenders but store in `tenders` table
- **Option C:** Keep everything as-is and discuss further

Let me know!
