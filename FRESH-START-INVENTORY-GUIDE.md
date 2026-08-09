# Inventory System - Fresh Start Guide

**Date:** January 5, 2026  
**Purpose:** Complete step-by-step walkthrough to build inventory system from scratch

---

## Overview

After running the cleanup script, you'll have a completely empty inventory system. This guide walks you through building it from the ground up.

---

## Prerequisites

✅ Cleanup script executed successfully  
✅ All tables are empty  
✅ Item Masters exist in the database  
✅ Users and Wings are configured  
✅ Vendors are set up

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    START: FRESH INVENTORY                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    STEP 1: Create Tender
                              ↓
                    STEP 2: Add Tender Items
                              ↓
                    STEP 3: Create Award
                              ↓
                    STEP 4: Record Delivery
                              ↓
                    STEP 5: Finalize Delivery
                              ↓
         (AUTO) Items added to Admin Stock (stock_admin)
                              ↓
                STEP 6: Wing Requests from Admin
                              ↓
         Admin Stock ↓  |  Wing Stock ↑ (Transfer)
                              ↓
                STEP 7: Wing Issues to User
                              ↓
         Wing Stock ↓  |  User Stock ↑ (Issue)
                              ↓
           ✅ COMPLETE INVENTORY FLOW
```

---

## STEP 1: Create a Tender

### Via Database (SQL):

```sql
INSERT INTO tenders (
    id, tender_number, title, description,
    estimated_value, status, created_by, created_at
)
VALUES (
    NEWID(),
    'T-2026-001',
    'Purchase Computing Equipment',
    'Laptops, Switches, and Networking Equipment',
    500000.00,
    'Tender Created',
    'admin-user-id-here',
    GETDATE()
);
```

### Via Web UI:

1. Login to IMS with Supervisor role
2. Go to **Tenders** → **Create New Tender**
3. Fill in:
   - **Title:** Purchase Computing Equipment
   - **Description:** Laptops, Switches, and Networking Equipment
   - **Estimated Value:** Rs. 500,000
4. Click **Create Tender**
5. Note the Tender ID for next steps

---

## STEP 2: Add Items to Tender

### Assumption: You have Item Masters like:
- Dell Laptop (ID: laptop-uuid)
- SAN Switches (ID: switch-uuid)
- Network Cable (ID: cable-uuid)

### Via Database:

```sql
-- Add Item 1: Dell Laptop
INSERT INTO tender_items (
    id, tender_id, item_id, item_sequence,
    quantity_required, detailed_specifications,
    estimated_unit_price, created_at
)
VALUES (
    NEWID(),
    'your-tender-id-here',
    'laptop-uuid',
    1,
    5,
    'Dell Precision 5560 or equivalent',
    85000.00,
    GETDATE()
);

-- Add Item 2: SAN Switches
INSERT INTO tender_items (
    id, tender_id, item_id, item_sequence,
    quantity_required, detailed_specifications,
    estimated_unit_price, created_at
)
VALUES (
    NEWID(),
    'your-tender-id-here',
    'switch-uuid',
    2,
    10,
    'Cisco SAN Switch',
    5000.00,
    GETDATE()
);

-- Add Item 3: Network Cable
INSERT INTO tender_items (
    id, tender_id, item_id, item_sequence,
    quantity_required, detailed_specifications,
    estimated_unit_price, created_at
)
VALUES (
    NEWID(),
    'your-tender-id-here',
    'cable-uuid',
    3,
    50,
    'Cat6A Ethernet Cable 1m',
    500.00,
    GETDATE()
);
```

### Via Web UI:

1. Open your Tender (T-2026-001)
2. Go to **Tender Items** section
3. Click **Add Item**
4. For each item:
   - Select **Item:** Dell Laptop
   - **Quantity:** 5
   - **Specifications:** Dell Precision 5560 or equivalent
   - **Unit Price:** Rs. 85,000
5. Click **Add**
6. Repeat for SAN Switches (10 units, Rs. 5,000) and Network Cable (50 units, Rs. 500)

---

## STEP 3: Create Tender Award

### Process:
1. Tender is advertised
2. Vendors submit bids
3. Bids are evaluated
4. Winner is selected
5. Award created

### Via Database:

```sql
-- First, create a vendor if needed
INSERT INTO vendors (
    id, vendor_name, vendor_type, email, phone,
    address, status, created_at
)
VALUES (
    NEWID(),
    'ABC Electronics Ltd',
    'Equipment Supplier',
    'sales@abc-electronics.com',
    '021-2222222',
    'Karachi, Pakistan',
    'Active',
    GETDATE()
);

-- Then create the award
INSERT INTO TenderAwards (
    award_id,
    tender_id,
    vendor_id,
    vendor_name,
    awarded_amount,
    award_date,
    status,
    created_by,
    created_at
)
VALUES (
    (SELECT ISNULL(MAX(award_id), 0) + 1 FROM TenderAwards),
    'your-tender-id',
    'vendor-id-from-above',
    'ABC Electronics Ltd',
    480000.00,  -- Total amount
    GETDATE(),
    'Awarded',
    'admin-user-id',
    GETDATE()
);

-- Get the award_id for next step
SELECT award_id FROM TenderAwards 
WHERE vendor_name = 'ABC Electronics Ltd'
ORDER BY award_date DESC;
```

### Via Web UI:

1. Go to Tender (T-2026-001)
2. Click **Create Award**
3. Select **Vendor:** ABC Electronics Ltd
4. **Award Amount:** Rs. 480,000 (negotiated from Rs. 500,000)
5. Click **Create Award**

---

## STEP 4: Record Delivery

### Delivery Details:
- Vendor delivers items
- Track what was actually delivered
- Record serial numbers (if applicable)

### Via Database:

```sql
-- Create delivery record
INSERT INTO deliveries (
    delivery_id,
    award_id,
    delivery_code,
    delivery_date,
    received_by,
    status,
    total_items_delivered,
    created_at
)
VALUES (
    (SELECT ISNULL(MAX(delivery_id), 0) + 1 FROM deliveries),
    award-id-here,
    'DLV-2026-001',
    GETDATE(),
    'admin-user-id',
    'RECEIVED',
    65,  -- Total items: 5 laptops + 10 switches + 50 cables = 65
    GETDATE()
);

-- Get the delivery_id
SELECT delivery_id FROM deliveries 
WHERE delivery_code = 'DLV-2026-001';
```

---

## STEP 5: Add Delivery Items

### For each item that was delivered, create a delivery_items record:

```sql
-- Delivery Item 1: Dell Laptops (5 units)
INSERT INTO delivery_items (
    delivery_id,
    award_item_id,
    quantity_delivered,
    quantity_accepted,
    rejection_reason,
    serial_numbers
)
VALUES (
    delivery-id,
    award-item-1-id,
    5,
    5,
    NULL,
    'SN001,SN002,SN003,SN004,SN005'
);

-- Delivery Item 2: SAN Switches (10 units)
INSERT INTO delivery_items (
    delivery_id,
    award_item_id,
    quantity_delivered,
    quantity_accepted,
    rejection_reason,
    serial_numbers
)
VALUES (
    delivery-id,
    award-item-2-id,
    10,
    10,
    NULL,
    'SW001,SW002,SW003,SW004,SW005,SW006,SW007,SW008,SW009,SW010'
);

-- Delivery Item 3: Network Cables (50 units)
INSERT INTO delivery_items (
    delivery_id,
    award_item_id,
    quantity_delivered,
    quantity_accepted,
    rejection_reason
)
VALUES (
    delivery-id,
    award-item-3-id,
    50,
    50,
    NULL
);
```

---

## STEP 6: Finalize Delivery ⭐ **CRITICAL**

**This is the key step that AUTO-ADDS items to Admin Stock!**

### Via Web UI:

1. Go to **Delivery Report**
2. Find Delivery: **DLV-2026-001**
3. Verify all items:
   - Dell Laptops: 5 units ✅
   - SAN Switches: 10 units ✅
   - Network Cables: 50 units ✅
4. Click **Finalize Delivery**

### What Happens Automatically:

When you click "Finalize Delivery", the system:

```
FOR EACH delivery_item:
  1. Get item_master_id
  2. Get actual_unit_price from stock_transaction
  3. CHECK: Does item exist in stock_admin?
     ├─ YES → UPDATE with new quantity
     └─ NO → INSERT new record
  4. SET stock_admin.current_quantity += delivered_quantity
  5. SET stock_admin.available_quantity += delivered_quantity
  6. SET unit_price = actual_unit_price
  7. SET storage_location = 'Central Warehouse'
  8. SET stock_status = 'Available'

RESULT: Items now appear in Admin Inventory!
```

### Verify in Database:

```sql
SELECT 
    item_master_id,
    current_quantity,
    available_quantity,
    unit_price,
    stock_status
FROM stock_admin;

-- Expected Output:
-- | item_master_id | current_quantity | available_quantity | unit_price | stock_status |
-- | laptop-uuid    | 5                | 5                  | 85000      | Available    |
-- | switch-uuid    | 10               | 10                 | 4800       | Available    |
-- | cable-uuid     | 50               | 50                 | 500        | Available    |
```

---

## STEP 7: Wing Requests Items from Admin

### Scenario: Wing 19 needs 3 Laptops

### Via Web UI:

1. Login as **Wing Supervisor** (Wing 19)
2. Go to **Stock Issuance** → **Request Items**
3. Create Request:
   - **Request Type:** Organizational (for wing use)
   - **Item:** Dell Laptop
   - **Quantity:** 3 units
   - **Purpose:** Replace damaged units
   - **Urgency:** High
4. Click **Submit Request**

### System Processing:

```
1️⃣  Request Created:
    ├─ Status: "Pending"
    ├─ Table: stock_issuance_requests
    └─ request_type: "Organizational"

2️⃣  Wing Supervisor Reviews:
    ├─ Checks wing inventory
    ├─ Wing has: 0 (not issued yet)
    └─ Decision: Forward to Admin

3️⃣  Admin Reviews:
    ├─ Checks admin inventory
    ├─ Admin has: 5 laptops
    ├─ Decision: Approve & Transfer
    └─ Status: "Admin Review"

4️⃣  STOCK TRANSFER EXECUTES:
    ├─ Admin Stock:
    │  └─ 5 → 2 units (decreased by 3)
    │
    └─ Wing Stock (NEW RECORD):
       └─ 0 → 3 units (created with 3 units)

5️⃣  Transfer Log Created:
    ├─ from_store_type: "Admin"
    ├─ to_store_type: "Wing"
    ├─ to_wing_id: 19
    ├─ quantity: 3
    └─ transfer_type: "Admin to Wing"

6️⃣  Status: "Approved & Issued"
```

### Verify in Database:

```sql
-- Check Admin Stock
SELECT item_master_id, current_quantity, available_quantity
FROM stock_admin
WHERE item_master_id = 'laptop-uuid';
-- Expected: 2 units (was 5, decreased by 3)

-- Check Wing Stock
SELECT item_master_id, wing_id, current_quantity, available_quantity
FROM stock_wing
WHERE item_master_id = 'laptop-uuid' AND wing_id = 19;
-- Expected: 3 units (new record)
```

---

## STEP 8: Wing Issues Items to User

### Scenario: Ahmed Khan (Employee in Wing 19) needs 2 Laptops

### Via Web UI:

1. Login as **Wing Supervisor** (Wing 19)
2. Go to **Stock Issuance** → **New Request**
3. Create Request:
   - **Request Type:** Individual
   - **User:** Ahmed Khan
   - **Item:** Dell Laptop
   - **Quantity:** 2 units
   - **Purpose:** Project Assignment
   - **Returnable:** Yes
   - **Expected Return:** 2026-03-05
4. Click **Submit Request**

### Wing Supervisor Approval:

1. Request received
2. Check wing inventory: 3 laptops available ✅
3. Approve & Issue
4. Click **Issue Items**

### System Processing:

```
1️⃣  Request Created:
    ├─ Status: "Pending"
    ├─ Requester: Ahmed Khan
    ├─ request_type: "Individual"
    └─ Table: stock_issuance_requests

2️⃣  Wing Supervisor Reviews:
    ├─ Checks wing inventory
    ├─ Wing has: 3 laptops
    ├─ Request needs: 2
    └─ Decision: Approve from Wing ✅

3️⃣  STOCK DEDUCTION FROM WING:
    ├─ Wing Stock UPDATE:
    │  ├─ current_quantity: 3 → 1
    │  ├─ available_quantity: 3 → 1
    │  └─ updated_at: NOW
    │
    └─ stored in: stock_wing

4️⃣  PERSONAL STOCK CREATED (NEW):
    ├─ New record in stock_personal
    ├─ user_id: Ahmed Khan's ID
    ├─ issued_quantity: 2
    ├─ current_quantity: 2
    ├─ issued_date: TODAY
    ├─ expected_return_date: 2026-03-05
    ├─ is_returnable: true
    ├─ return_status: "Not Returned"
    └─ item_status: "In Use"

5️⃣  Transfer Log Created:
    ├─ from_store_type: "Wing"
    ├─ from_wing_id: 19
    ├─ to_store_type: "Personal"
    ├─ to_user_id: Ahmed Khan
    ├─ quantity: 2
    └─ transfer_type: "Wing to Personal"

6️⃣  Status: "Approved & Issued"
```

### Verify in Database:

```sql
-- Check Wing Stock
SELECT item_master_id, wing_id, current_quantity
FROM stock_wing
WHERE item_master_id = 'laptop-uuid' AND wing_id = 19;
-- Expected: 1 unit (was 3, decreased by 2)

-- Check Personal Stock
SELECT item_master_id, user_id, issued_quantity, current_quantity, return_status
FROM stock_personal
WHERE user_id = 'ahmed-khan-id';
-- Expected: 2 units, In Use, Not Returned
```

---

## STEP 9: User Returns Items

### Scenario: Ahmed Khan returns 2 Laptops after project completion

### Via Web UI:

1. Login as **Ahmed Khan**
2. Go to **My Items** or **Return Items**
3. Find: Dell Laptop (2 units)
4. Click **Request Return**
5. Select: **2 units**
6. Click **Submit Return Request**

### Wing Supervisor Accepts Return:

1. Receives return request
2. Inspects items: ✅ Good condition
3. Click **Accept Return**

### System Processing:

```
1️⃣  Return Request Created:
    ├─ Status: "Pending Approval"
    ├─ Returned Quantity: 2 units
    └─ Condition: Good

2️⃣  Wing Supervisor Reviews:
    ├─ Accepts return
    └─ Status: "Approved"

3️⃣  STOCK UPDATES:
    ├─ Personal Stock UPDATE:
    │  ├─ current_quantity: 2 → 0
    │  ├─ returned_quantity: 2
    │  ├─ return_status: Not Returned → Fully Returned
    │  ├─ actual_return_date: TODAY
    │  └─ item_status: In Use → Returned
    │
    └─ Wing Stock UPDATE:
       ├─ current_quantity: 1 → 3 (increased)
       ├─ available_quantity: 1 → 3
       └─ updated_at: NOW

4️⃣  Transfer Log Created:
    ├─ from_store_type: "Personal"
    ├─ from_user_id: Ahmed Khan
    ├─ to_store_type: "Wing"
    ├─ to_wing_id: 19
    ├─ quantity: 2
    └─ transfer_type: "Personal Return to Wing"

5️⃣  Status: "Return Completed"
```

### Final State:

```
Admin Stock: 2 units (unchanged from delivery)
Wing Stock: 3 units (back to original after return)
Personal Stock: 0 units (returned)

Flow completed: Admin → Wing → User → Wing ✅
```

---

## Complete Inventory State After All Steps

### Database Query to View Full State:

```sql
-- Admin Inventory
SELECT 'ADMIN' as Level, NULL as wing_id, NULL as user_id,
       item_master_id, current_quantity, available_quantity, unit_price
FROM stock_admin

UNION ALL

-- Wing Inventory
SELECT 'WING', wing_id, NULL,
       item_master_id, current_quantity, available_quantity, unit_price
FROM stock_wing

UNION ALL

-- Personal Inventory
SELECT 'PERSONAL', wing_id, user_id,
       item_master_id, current_quantity, NULL, unit_price
FROM stock_personal

ORDER BY item_master_id, Level;
```

### Expected Output:

```
| Level    | wing_id | user_id | item_master_id | current_qty | available_qty | unit_price |
|----------|---------|---------|----------------|-------------|---------------|-----------|
| ADMIN    | NULL    | NULL    | laptop-uuid    | 2           | 2             | 85000      |
| ADMIN    | NULL    | NULL    | switch-uuid    | 10          | 10            | 4800       |
| ADMIN    | NULL    | NULL    | cable-uuid     | 50          | 50            | 500        |
| WING     | 19      | NULL    | laptop-uuid    | 3           | 3             | 85000      |
| WING     | 19      | NULL    | switch-uuid    | 0           | 0             | 4800       |
```

---

## Key Takeaways

### Stock Flow Summary:

```
TENDER DELIVERY → ADMIN (5 laptops)
                    ↓
ADMIN → WING (3 laptops)  [Admin: 5→2, Wing: 0→3]
           ↓
WING → USER (2 laptops)   [Wing: 3→1, User: 0→2]
           ↓
USER → WING (2 laptops)   [Wing: 1→3, User: 2→0]
```

### Important Points:

✅ **Each level tracks separately:** Admin, Wing, Personal are independent  
✅ **Auto-finalization:** Delivery finalization automatically updates admin stock  
✅ **Transfer tracking:** Every movement logged in stock_transfer_log  
✅ **Pricing:** Unit price set at delivery, propagated to all levels  
✅ **Traceability:** Can track item from tender → delivery → admin → wing → user  

---

## Next Steps

After completing this flow, you can:

1. ✅ Create more tenders
2. ✅ Add more items to inventory
3. ✅ Process multiple wing requests
4. ✅ Track returns and damages
5. ✅ Generate reports on inventory levels
6. ✅ Monitor stock movement across the organization

---

**End of Fresh Start Guide**

Follow these steps in order to properly understand and build the inventory system from scratch!
