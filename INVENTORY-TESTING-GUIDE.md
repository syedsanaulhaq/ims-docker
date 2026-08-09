# 🧪 Inventory System Testing Guide

## Complete Workflow Testing (End-to-End)

### Prerequisites
1. **Backend running**: `npm run backend` (port 3001)
2. **Frontend running**: `npm run development:start` (port 5173)
3. **Database**: MSSQL Server 2022 connected
4. **User logged in**: Any user with procurement permissions

---

## 📋 Test Scenario: Complete Purchase Order to Inventory Flow

### **STEP 1: Create a Contract Tender**
**Navigation**: Dashboard → Contract Tender → Create New Tender

**Test Data**:
- Tender Number: `CT-TEST-001`
- Tender Type: `Contract Tender`
- Opening Date: Today
- Closing Date: Tomorrow
- Add 2-3 items from item masters
- Assign vendor for each item
- Set unit prices

**Expected Result**: ✅ Tender created successfully

---

### **STEP 2: Finalize the Tender**
**Navigation**: Contract Tender Dashboard → Actions (Eye icon) → View Details

**Actions**:
1. Click "Finalize Tender" button
2. Confirm finalization

**Expected Result**: ✅ Tender status changes to "Finalized"

---

### **STEP 3: Create Purchase Order**
**After tender finalization**, the system should automatically:
- Redirect to PO generation
- Show all tender items grouped by vendor

**Actions**:
1. Select vendor(s) to create PO for
2. Click "Generate Purchase Orders"
3. Verify PO numbers generated (PO000001, PO000002, etc.)

**Expected Result**: 
✅ PO(s) created with status "finalized"
✅ Shown in Purchase Orders Dashboard

---

### **STEP 4: Create Delivery for PO**
**Navigation**: Purchase Orders Dashboard → Actions → Package icon (Create Delivery)

**Test Data**:
```
Delivery Date: Today
Delivery Personnel: John Smith
Delivery Challan: CH-2026-001
Expected Delivery: Tomorrow
Notes: Test delivery for inventory verification
```

**For each item**:
```
Quantity: Enter full or partial quantity
Quality Status: Select "Good" (to add to inventory)
Remarks: Item in perfect condition
```

**Expected Result**: 
✅ Delivery created with DEL-YYYY-NNNNNN number
✅ Delivery status: "pending"

---

### **STEP 5: Receive Delivery (CRITICAL - This Updates Inventory)**
**Navigation**: Purchase Orders Dashboard → Actions → CheckCircle icon (Receive Delivery)

**Test Data**:
```
Delivery Date: Today
Delivery Personnel: John Smith (should be pre-filled)
Delivery Challan: CH-2026-001 (should be pre-filled)
```

**For each item, verify quality**:
- ✅ **Good**: Item will be ADDED to inventory
- ❌ **Damaged**: Item will NOT be added to inventory
- ❌ **Rejected**: Item will NOT be added to inventory

**Actions**:
1. Review all items
2. Confirm quality status for each item
3. Click "Confirm Receipt"

**Expected Result**: 
✅ Success message: "Delivery received successfully"
✅ Acquisition number generated: ACQ-YYYY-NNNNNN
✅ Navigation back to PO Dashboard
✅ PO status updates to "partial" or "completed"

---

## 🔍 Verification Steps

### **Method 1: Using the Verification Script** (Recommended)
```powershell
node run-inventory-verification.cjs
```

**What to check**:
1. ✅ **Query 1**: Your items appear in inventory with correct quantities
2. ✅ **Query 2**: Stock acquisition record created (ACQ-YYYY-NNNNNN)
3. ✅ **Query 3**: Delivery traced to inventory with "Added to Inventory" status
4. ✅ **Query 4**: Statistics show correct counts
5. ✅ **Query 5**: NO ISSUES found

---

### **Method 2: Direct Database Query**
Open SQL Server Management Studio and run:

```sql
-- Check current inventory
SELECT 
    im.nomenclature,
    im.item_code,
    cis.current_quantity,
    cis.last_transaction_date,
    cis.last_transaction_type
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
ORDER BY cis.last_transaction_date DESC;

-- Check stock acquisitions
SELECT 
    acquisition_number,
    po_number,
    delivery_number,
    total_quantity,
    acquisition_date
FROM stock_acquisitions sa
INNER JOIN purchase_orders po ON sa.po_id = po.id
INNER JOIN deliveries d ON sa.delivery_id = d.id
ORDER BY acquisition_date DESC;
```

---

### **Method 3: Frontend Verification** (Future Enhancement)
Navigate to: **Dashboard → Inventory Management → Current Stock**

Should display:
- All items in inventory
- Current quantities
- Last transaction date
- Source (from which delivery/PO)

---

## 🧪 Test Cases

### **Test Case 1: Full Quantity Good Quality**
**Input**:
- PO Quantity: 10 units
- Delivered: 10 units
- Quality: Good

**Expected**:
- ✅ Inventory: +10 units
- ✅ PO Status: Completed
- ✅ Delivery Status: Completed

---

### **Test Case 2: Partial Quantity**
**Input**:
- PO Quantity: 10 units
- Delivered: 5 units (first delivery)
- Quality: Good

**Expected**:
- ✅ Inventory: +5 units
- ✅ PO Status: Partial
- ✅ Can create another delivery for remaining 5 units

---

### **Test Case 3: Damaged Items**
**Input**:
- PO Quantity: 10 units
- Delivered: 10 units
- Quality: 3 Good, 7 Damaged

**Expected**:
- ✅ Inventory: +3 units (only good items)
- ⚠️ Damaged items NOT added to inventory
- ✅ PO Status: Partial (3/10 received)

---

### **Test Case 4: Rejected Items**
**Input**:
- PO Quantity: 10 units
- Delivered: 10 units
- Quality: All Rejected

**Expected**:
- ❌ Inventory: +0 units
- ✅ Delivery recorded with rejected status
- ✅ PO Status: Still finalized (0/10 received)

---

### **Test Case 5: Multiple Deliveries**
**Scenario**: Split delivery in 3 shipments

**Delivery 1**:
- Quantity: 4 units (Good)
- Expected: Inventory +4, PO Status: Partial

**Delivery 2**:
- Quantity: 3 units (Good)
- Expected: Inventory +3 (total 7), PO Status: Partial

**Delivery 3**:
- Quantity: 3 units (Good)
- Expected: Inventory +3 (total 10), PO Status: Completed

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: "Delivery created but inventory not updated"
**Cause**: Delivery status is still "pending"
**Solution**: You must RECEIVE the delivery (Step 5) to update inventory

---

### Issue 2: "No items showing in inventory"
**Check**:
1. Did you mark items as "Good" quality?
   - Damaged/Rejected items are NOT added to inventory
2. Did you complete the receive delivery step?
3. Run verification script to check database

---

### Issue 3: "Wrong quantity in inventory"
**Check**:
1. Quality status selection
2. Multiple deliveries for same item (quantities add up)
3. Run Query 3 in verification script to trace all deliveries

---

### Issue 4: "Cannot create delivery"
**Check**:
1. PO status must be "finalized"
2. Items must exist in PO
3. Check browser console for errors

---

## 📊 Quick Verification Checklist

After receiving a delivery, verify:

- [ ] Success message shown in UI
- [ ] Acquisition number displayed (ACQ-YYYY-NNNNNN)
- [ ] Navigation back to PO list
- [ ] PO status updated (partial or completed)
- [ ] Delivery status shows "completed" in tracker
- [ ] Run `node run-inventory-verification.cjs`
- [ ] Query 1: Item appears in inventory
- [ ] Query 2: Acquisition record created
- [ ] Query 5: No issues found

---

## 🚀 Automated Testing Script

Run this to test inventory updates after receiving delivery:

```powershell
# Quick inventory check
node run-inventory-verification.cjs

# If you want just inventory count
node -e "const sql = require('mssql'); require('dotenv').config({path:'.env.sqlserver'}); sql.connect({server:process.env.SQL_SERVER_HOST,database:process.env.SQL_SERVER_DATABASE,user:process.env.SQL_SERVER_USER,password:process.env.SQL_SERVER_PASSWORD,options:{encrypt:false,trustServerCertificate:true}}).then(pool=>pool.request().query('SELECT COUNT(*) as count, SUM(current_quantity) as total FROM current_inventory_stock')).then(r=>console.log('Items:',r.recordset[0].count,'| Total Qty:',r.recordset[0].total)).catch(console.error).finally(()=>sql.close());"
```

---

## 📈 Performance Testing

### Load Test: Multiple Deliveries
1. Create 10 POs with 5 items each
2. Create deliveries for all POs
3. Receive all deliveries
4. Run verification script
5. Check response times

**Expected**: All inventory updates complete in <5 seconds

---

## 🔐 Permission Testing

Test with different user roles:

1. **Store Keeper**: Can receive deliveries
2. **Wing Supervisor**: Can approve and receive
3. **Admin**: Full access

---

## 📝 Test Logs

Keep track of your tests:

```
Test Date: 2026-02-03
Tester: [Your Name]
Scenario: Full quantity good quality
PO Number: PO000001
Delivery Number: DEL-2026-000001
Items: 3 items, 10 units total
Quality: All good
Result: ✅ All items in inventory
Acquisition: ACQ-2026-000001
Notes: System working perfectly
```

---

## 🎯 Next Steps After Testing

1. ✅ Inventory system verified
2. 📊 Consider adding inventory reports
3. 📱 Add notifications for low stock
4. 🔄 Implement stock issuance workflow
5. 📈 Add inventory valuation reports
6. 🏷️ Add barcode/QR code scanning

---

## 💡 Tips

- **Always mark quality correctly**: Only "Good" items go to inventory
- **Check delivery status**: Must be "completed" for inventory update
- **Multiple deliveries**: Quantities accumulate for same item
- **Audit trail**: All transactions logged in stock_acquisitions
- **Verification script**: Run after every important delivery

---

## 🆘 Getting Help

If inventory not updating:
1. Run verification script first
2. Check Query 5 for specific issues
3. Review browser console for frontend errors
4. Check backend logs for API errors
5. Verify database stored procedure exists

---

**Last Updated**: February 3, 2026
**Status**: ✅ Fully Tested and Verified
