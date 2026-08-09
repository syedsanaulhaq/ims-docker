# Testing Guide: All Three Tender Types

## Overview

This guide walks through testing all three tender types in the unified system:
1. **Contract Tender** - Single vendor, all items
2. **Spot Purchase** - Single vendor, all items  
3. **Annual Tender** - Multiple vendors, vendor-per-item

---

## Step 1: Create Test Data (Database)

### Option A: Run SQL Script
Execute the test script to create sample data:
```sql
sqlcmd -S YOUR_SERVER -d YOUR_DATABASE -i test-all-tender-types.sql
```

This creates:
- ✅ 1 Contract Tender with 3 items (Vendor A)
- ✅ 1 Spot Purchase with 2 items (Vendor B)
- ✅ 1 Annual Tender with 4 items (3 vendors: A, B, C)

### Option B: Verify Query (After Running Script)
```sql
SELECT reference_number, tender_type, status 
FROM tenders 
WHERE reference_number LIKE 'TEST-%'
ORDER BY created_at DESC;
```

Should return 3 rows with TEST-CONTRACT, TEST-SPOT, TEST-ANNUAL.

---

## Step 2: Test Frontend Display

### Test 2.1: View Contract Tender
1. Open browser: `http://localhost:8080`
2. Navigate to **Procurement Menu → Contract/Tender**
3. Should see "TEST-CONTRACT-..." in the list
4. **Expected**:
   - ✅ Shows with tender_type='contract'
   - ✅ All items display with same vendor
   - ✅ Pricing fields visible (estimated_unit_price, total_amount)

### Test 2.2: View Spot Purchase
1. Navigate to **Procurement Menu → Spot Purchase**
2. Should see "TEST-SPOT-..." in the list
3. **Expected**:
   - ✅ Shows with tender_type='spot-purchase'
   - ✅ All items display with same vendor (different from contract)
   - ✅ Pricing fields visible

### Test 2.3: View Annual Tender
1. Navigate to **Procurement Menu → Annual Tenders** (or use Contract/Tender with ?type=annual-tender)
2. Should see "TEST-ANNUAL-..." in the list
3. Click to view details
4. **Expected**:
   - ✅ Shows with tender_type='annual-tender'
   - ✅ Items display with DIFFERENT vendors (vendor A, B, C)
   - ✅ Each item shows its assigned vendor
   - ✅ Pricing fields visible

---

## Step 3: Verify Database Structure

### Query 1: Contract Tender Items (All Same vendor_id)
```sql
SELECT 
    t.reference_number,
    im.nomenclature,
    ti.vendor_id,
    v.vendor_name,
    ti.quantity,
    ti.estimated_unit_price,
    ti.total_amount
FROM TenderItems ti
INNER JOIN tenders t ON ti.tender_id = t.id
INNER JOIN item_masters im ON ti.item_id = im.id
INNER JOIN vendors v ON ti.vendor_id = v.id
WHERE t.reference_number LIKE 'TEST-CONTRACT-%'
ORDER BY im.nomenclature;
```
**Expected Result**: All items have SAME vendor_id (Vendor A)

### Query 2: Spot Purchase Items (All Same vendor_id)
```sql
SELECT 
    t.reference_number,
    im.nomenclature,
    ti.vendor_id,
    v.vendor_name,
    ti.quantity,
    ti.estimated_unit_price,
    ti.total_amount
FROM TenderItems ti
INNER JOIN tenders t ON ti.tender_id = t.id
INNER JOIN item_masters im ON ti.item_id = im.id
INNER JOIN vendors v ON ti.vendor_id = v.id
WHERE t.reference_number LIKE 'TEST-SPOT-%'
ORDER BY im.nomenclature;
```
**Expected Result**: All items have SAME vendor_id (Vendor B)

### Query 3: Annual Tender Items (Different vendor_id per item)
```sql
SELECT 
    t.reference_number,
    im.nomenclature,
    ti.vendor_id,
    v.vendor_name,
    ti.quantity,
    ti.estimated_unit_price,
    ti.total_amount
FROM TenderItems ti
INNER JOIN tenders t ON ti.tender_id = t.id
INNER JOIN item_masters im ON ti.item_id = im.id
INNER JOIN vendors v ON ti.vendor_id = v.id
WHERE t.reference_number LIKE 'TEST-ANNUAL-%'
ORDER BY im.nomenclature;
```
**Expected Result**: Items have DIFFERENT vendor_ids (A, B, C, A)

### Query 4: Pricing Verification
```sql
SELECT 
    t.tender_type,
    COUNT(*) as item_count,
    SUM(ti.total_amount) as total_value,
    AVG(ti.estimated_unit_price) as avg_unit_price
FROM TenderItems ti
INNER JOIN tenders t ON ti.tender_id = t.id
WHERE t.reference_number LIKE 'TEST-%'
GROUP BY t.tender_type;
```
**Expected Result**: 
- contract: 3 items
- spot-purchase: 2 items  
- annual-tender: 4 items

---

## Step 4: Test Creating New Tenders (Frontend)

### Test 4.1: Create Contract Tender
1. Go to Contract/Tender
2. Click "Create New"
3. Fill in details:
   - Title: "My Contract"
   - Select ONE vendor
   - Add items with quantities & pricing
4. Submit
5. **Verify**:
   - ✅ Tender created with tender_type='contract'
   - ✅ All items get same vendor_id
   - ✅ Pricing captured

### Test 4.2: Create Annual Tender
1. Go to Annual Tenders (or use ?type=annual-tender)
2. Click "Create New"
3. Use TenderWizard:
   - Step 1: Enter tender details
   - Step 2: Select multiple vendors
   - Step 3+: For each vendor, assign their items
4. Submit
5. **Verify**:
   - ✅ Tender created with tender_type='annual-tender'
   - ✅ Each item has its assigned vendor_id
   - ✅ Different items can have different vendors
   - ✅ Pricing captured

---

## Checklist: What to Verify

### ✅ Database Level
- [ ] vendor_id column exists in tender_items
- [ ] estimated_unit_price column exists
- [ ] actual_unit_price column exists
- [ ] total_amount column exists
- [ ] Foreign key constraint on vendor_id exists
- [ ] Contract items all have same vendor_id
- [ ] Spot purchase items all have same vendor_id
- [ ] Annual tender items have different vendor_ids

### ✅ API Level
- [ ] GET /api/tenders returns all three types
- [ ] GET /api/tenders?type=contract returns only contracts
- [ ] GET /api/tenders?type=spot-purchase returns only spot purchases
- [ ] GET /api/tenders?type=annual-tender returns only annual tenders
- [ ] POST /api/tenders creates all three types correctly
- [ ] vendor_id is saved for all types

### ✅ Frontend Level
- [ ] Contract/Tender shows contract tenders
- [ ] Annual Tenders link shows annual tenders
- [ ] Spot Purchase shows spot purchases
- [ ] Create buttons route to correct forms
- [ ] Vendor info displays correctly for each type
- [ ] Pricing fields visible and correct
- [ ] TensorWizard works for annual tenders

### ✅ User Experience
- [ ] No broken links or 404s
- [ ] Menu navigation works smoothly
- [ ] Create new tender form works
- [ ] Filtering by type works
- [ ] All data displays correctly

---

## Troubleshooting

### Problem: Test data not appearing
**Solution**: 
1. Verify test script ran successfully
2. Run verification query to check if records exist
3. Check that you're logged in with proper permissions

### Problem: Annual Tender items show same vendor
**Solution**:
1. Check vendor_id values in database
2. Verify POST /api/tenders is assigning vendor_id correctly
3. Check TensorWizard form is sending vendor_id per item

### Problem: Pricing not visible
**Solution**:
1. Verify columns exist: `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='TenderItems'`
2. Check that items have pricing values (not NULL)
3. Verify frontend is fetching and displaying pricing fields

### Problem: Create New button not working
**Solution**:
1. Check browser console for errors
2. Verify /dashboard/create-tender route exists
3. Check that form component handles all three types

---

## Success Criteria

✅ **All tests pass when**:
- Contract tenders show single vendor for all items
- Spot purchases show single vendor for all items
- Annual tenders show different vendors per item
- Pricing is captured and displayed for all types
- Database shows correct vendor_id assignments
- No errors in browser console or backend logs

🎉 **System is working correctly!**

---

## Next Steps

After successful testing:
1. Optionally clean up test data: `DELETE FROM tenders WHERE reference_number LIKE 'TEST-%'`
2. Drop old annual tender tables (when confident system is stable): `execute drop-annual-tender-tables.sql`
3. Document the system for team
4. Train users on new unified interface

---
