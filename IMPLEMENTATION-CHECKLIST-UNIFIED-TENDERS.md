# Unified Tender System - Implementation Checklist

## ✅ COMPLETED: Cleanup Phase

- [x] Removed AnnualTenderManagement import from App.tsx
- [x] Removed `/dashboard/annual-tenders` route from App.tsx
- [x] Removed "Annual Tenders" menu item from AppSidebar.tsx
- [x] Updated TenderWizard.tsx to use `/api/tenders` endpoints
- [x] Updated Dashboard.tsx to use `/api/tenders` endpoints
- [x] Updated TenderView.tsx to use `/api/tenders` endpoints
- [x] Created drop-annual-tender-tables.sql cleanup script
- [x] Created ANNUAL-TENDER-CLEANUP-COMPLETE.md documentation

---

## 🔄 NEXT: Database Phase (Ready to Execute)

### Step 1: Execute Migration (Add vendor_id and pricing)
```sql
sqlcmd -S YOUR_SERVER -d YOUR_DATABASE -i update-tender-items-add-vendor.sql
```
**Status**: Migration file ready ✅
**Changes**: 
- Adds vendor_id to tender_items table
- Adds estimated_unit_price, actual_unit_price, total_amount columns
- Creates indexes and constraints
- Safe: Nullable initially for backward compatibility

### Step 2: Clean Up Old Tables (Optional, after testing)
```sql
sqlcmd -S YOUR_SERVER -d YOUR_DATABASE -i drop-annual-tender-tables.sql
```
**Status**: Cleanup script ready ✅
**Tables to drop**:
- annual_tenders
- annual_tender_groups
- annual_tender_vendors
- vendor_proposals

**Timing**: Only after verifying annual tender functionality works in unified system

---

## 🎨 NEXT: Frontend Integration Phase

### Step 1: Update ContractTender.tsx
**File**: [src/pages/ContractTender.tsx](src/pages/ContractTender.tsx)
**Change**: Add filter for `tender_type='annual-tender'`
**Code**:
```tsx
// Add to your filtering logic:
if (initialType === 'Annual Tender') {
  tenders = data.filter((t: Tender) => t.tender_type === 'annual-tender')
} else if (initialType === 'Contract/Tender') {
  tenders = data.filter((t: Tender) => t.tender_type === 'contract')
} else if (initialType === 'Spot Purchase') {
  tenders = data.filter((t: Tender) => t.tender_type === 'spot-purchase')
}
```

### Step 2: Integrate TenderWizard into Form Flow
**File**: Create form selector or update existing tender creation form
**Component**: [src/components/tender/TenderWizard.tsx](src/components/tender/TenderWizard.tsx)
**Logic**:
```tsx
if (tenderType === 'annual-tender') {
  return <TenderWizard onComplete={handleComplete} onCancel={handleCancel} />;
} else {
  return <StandardTenderForm type={tenderType} />;
}
```

---

## ✅ VERIFY: Testing Phase

### Test 1: Contract Tender (Single Vendor)
- [ ] Create contract with reference number
- [ ] Select ONE vendor
- [ ] Add multiple items
- [ ] Verify all items have SAME vendor_id in database
- [ ] Verify pricing captured (estimated_unit_price, actual_unit_price, total_amount)

### Test 2: Spot Purchase (Single Vendor)
- [ ] Create spot purchase with reference number
- [ ] Select ONE vendor
- [ ] Add items with quantities
- [ ] Verify all items have SAME vendor_id
- [ ] Verify pricing captured

### Test 3: Annual Tender (Multiple Vendors, Vendor-Specific Items)
- [ ] Create annual tender with reference number
- [ ] Use TenderWizard to:
  - [ ] Step 1: Enter tender details
  - [ ] Step 2: Select multiple vendors
  - [ ] Step 3+: For each vendor, assign their specialty items
- [ ] Verify each item has DIFFERENT vendor_id (one per vendor)
- [ ] Verify pricing captured for each item
- [ ] Verify database query returns correct vendor-item assignments

### Test 4: API Endpoints
- [ ] POST /api/tenders with tender_type='contract' → Success
- [ ] POST /api/tenders with tender_type='spot-purchase' → Success
- [ ] POST /api/tenders with tender_type='annual-tender' → Success
- [ ] GET /api/tenders → Returns all three types
- [ ] GET /api/tenders?type=annual-tender → Returns only annual tenders
- [ ] GET /api/tenders/:id → Returns correct tender details
- [ ] PUT /api/tenders/:id → Updates tender correctly
- [ ] DELETE /api/tenders/:id → Deletes tender correctly

---

## 📋 Reference Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [update-tender-items-add-vendor.sql](update-tender-items-add-vendor.sql) | Add vendor_id + pricing columns | ✅ Ready |
| [drop-annual-tender-tables.sql](drop-annual-tender-tables.sql) | Remove old annual tender tables | ✅ Ready |
| [UNIFIED-TENDER-SCHEMA-VENDOR-PRICE.md](UNIFIED-TENDER-SCHEMA-VENDOR-PRICE.md) | Schema & semantics reference | ✅ Ready |
| [ANNUAL-TENDER-CLEANUP-COMPLETE.md](ANNUAL-TENDER-CLEANUP-COMPLETE.md) | What was removed | ✅ Ready |
| [ARCHITECTURE-ANALYSIS-CONTRACT-TENDER-ANNUAL-TENDER-INTEGRATION.md](ARCHITECTURE-ANALYSIS-CONTRACT-TENDER-ANNUAL-TENDER-INTEGRATION.md) | Full architecture guide | ✅ Ready |

---

## 🎯 Recommendation for Sequencing

**RECOMMENDED ORDER:**

1. ✅ **Application Cleanup** (Just completed)
   - All imports, routes, and API calls updated
   
2. 🔄 **Database Execution** (Next)
   - Run `update-tender-items-add-vendor.sql`
   - This adds the vendor_id and pricing columns
   
3. 🎨 **Frontend Integration** (After DB migration)
   - Update form components
   - Wire TensorWizard into flow
   - Add menu link
   
4. ✅ **Testing** (Validate all three types)
   - Create samples of each tender type
   - Verify data integrity
   
5. 📊 **Data Cleanup** (When confident)
   - Run `drop-annual-tender-tables.sql`
   - Only after confirming annual tenders work in unified system

---

## 🚀 Ready? Let's Go!

**What would you like to do next?**

A. Execute the database migration (`update-tender-items-add-vendor.sql`)
B. Start frontend integration (update forms and components)
C. Review something before proceeding
D. Something else?

All code is ready. Just need your approval! 🎉
