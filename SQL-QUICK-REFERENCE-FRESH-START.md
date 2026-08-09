# Quick Reference: SQL Commands for Fresh Start

**Purpose:** Copy-paste SQL snippets to set up inventory from scratch

---

## 1. RUN CLEANUP (Clear Everything)

### Execute this SQL file first:
```
File: CLEANUP-ALL-INVENTORY-DATA.sql
Location: e:\ECP-Projects\inventory-management-system-ims\ims-v1\
```

**How to run:**
1. Open SQL Server Management Studio
2. Open file: `CLEANUP-ALL-INVENTORY-DATA.sql`
3. Execute (F5)
4. Wait for completion message: `✅ CLEANUP COMPLETE!`

---

## 2. CREATE VENDOR (If needed)

```sql
USE InventoryManagementDB;
GO

DECLARE @VendorId UNIQUEIDENTIFIER = NEWID();

INSERT INTO vendors (
    id, vendor_name, vendor_type, email, phone,
    address, status, created_at
)
VALUES (
    @VendorId,
    'ABC Electronics Ltd',
    'Equipment Supplier',
    'sales@abc-electronics.com',
    '021-2222222',
    'Karachi, Pakistan',
    'Active',
    GETDATE()
);

SELECT @VendorId AS vendor_id;
```

**Copy the vendor_id from output** (you'll need it for award creation)

---

## 3. CREATE TENDER

```sql
USE InventoryManagementDB;
GO

DECLARE @TenderId UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminUserId NVARCHAR(450) = 'admin-user-id-here'; -- Update this!

INSERT INTO tenders (
    id, tender_number, title, description,
    estimated_value, status, created_by, created_at
)
VALUES (
    @TenderId,
    'T-2026-001',
    'Purchase Computing Equipment',
    'Laptops, Switches, and Networking Equipment for Q1 2026',
    500000.00,
    'Tender Created',
    @AdminUserId,
    GETDATE()
);

SELECT 
    @TenderId AS tender_id,
    'T-2026-001' AS tender_number,
    'Use this tender_id in next steps' AS info;
```

**Copy the tender_id from output**

---

## 4. ADD TENDER ITEMS

### Find your Item Master IDs first:

```sql
SELECT TOP 10
    id,
    item_code,
    nomenclature,
    unit
FROM item_masters
ORDER BY nomenclature;
```

### Then add tender items (update with actual IDs):

```sql
USE InventoryManagementDB;
GO

DECLARE @TenderId UNIQUEIDENTIFIER = 'your-tender-id-from-step-3';
DECLARE @LaptopId UNIQUEIDENTIFIER = 'laptop-uuid-from-above';
DECLARE @SwitchId UNIQUEIDENTIFIER = 'switch-uuid-from-above';
DECLARE @CableId UNIQUEIDENTIFIER = 'cable-uuid-from-above';

-- Item 1: Dell Laptop
INSERT INTO tender_items (
    id, tender_id, item_id, item_sequence,
    quantity_required, detailed_specifications,
    estimated_unit_price, created_at
)
VALUES (
    NEWID(),
    @TenderId,
    @LaptopId,
    1,
    5,
    'Dell Precision 5560 or equivalent with Windows 11',
    85000.00,
    GETDATE()
);

-- Item 2: SAN Switches
INSERT INTO tender_items (
    id, tender_id, item_id, item_sequence,
    quantity_required, detailed_specifications,
    estimated_unit_price, created_at
)
VALUES (
    NEWID(),
    @TenderId,
    @SwitchId,
    2,
    10,
    'Cisco SAN Switch 16-port',
    5000.00,
    GETDATE()
);

-- Item 3: Network Cable
INSERT INTO tender_items (
    id, tender_id, item_id, item_sequence,
    quantity_required, detailed_specifications,
    estimated_unit_price, created_at
)
VALUES (
    NEWID(),
    @TenderId,
    @CableId,
    3,
    50,
    'Cat6A Ethernet Cable 1m with RJ45 connectors',
    500.00,
    GETDATE()
);

PRINT '✅ Added 3 items to tender T-2026-001';
```

---

## 5. CREATE TENDER AWARD

```sql
USE InventoryManagementDB;
GO

DECLARE @TenderId UNIQUEIDENTIFIER = 'your-tender-id-from-step-3';
DECLARE @VendorId UNIQUEIDENTIFIER = 'your-vendor-id-from-step-2';
DECLARE @AdminUserId NVARCHAR(450) = 'admin-user-id-here';

-- Get next award_id
DECLARE @NewAwardId INT;
SELECT @NewAwardId = ISNULL(MAX(award_id), 0) + 1 FROM TenderAwards;

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
    @NewAwardId,
    @TenderId,
    @VendorId,
    'ABC Electronics Ltd',
    480000.00,  -- Negotiated from 500,000
    GETDATE(),
    'Awarded',
    @AdminUserId,
    GETDATE()
);

SELECT @NewAwardId AS award_id;

PRINT '✅ Award created with ID: ' + CAST(@NewAwardId AS NVARCHAR(10));
```

**Copy the award_id from output**

---

## 6. CREATE AWARD ITEMS

```sql
USE InventoryManagementDB;
GO

DECLARE @AwardId INT = your-award-id-from-step-5;
DECLARE @LaptopItemId INT = laptop-award-item-id;
DECLARE @SwitchItemId INT = switch-award-item-id;
DECLARE @CableItemId INT = cable-award-item-id;

-- First, get the award item IDs (run this query)
SELECT award_item_id, item_id
FROM AwardItems
WHERE award_id = @AwardId;

-- If award items don't exist yet, create them:
-- (This might be created automatically when tender is awarded)

PRINT '✅ Award items ready for delivery';
```

---

## 7. CREATE DELIVERY

```sql
USE InventoryManagementDB;
GO

DECLARE @AwardId INT = your-award-id-from-step-5;
DECLARE @AdminUserId NVARCHAR(450) = 'admin-user-id-here';

DECLARE @NewDeliveryId INT;
SELECT @NewDeliveryId = ISNULL(MAX(delivery_id), 0) + 1 FROM deliveries;

INSERT INTO deliveries (
    delivery_id,
    award_id,
    delivery_code,
    delivery_date,
    received_by,
    status,
    total_items_delivered,
    inspection_notes,
    created_at
)
VALUES (
    @NewDeliveryId,
    @AwardId,
    'DLV-2026-001',
    GETDATE(),
    @AdminUserId,
    'RECEIVED',
    65,  -- 5 + 10 + 50
    'All items received in good condition',
    GETDATE()
);

SELECT @NewDeliveryId AS delivery_id;

PRINT '✅ Delivery created with ID: ' + CAST(@NewDeliveryId AS NVARCHAR(10));
```

**Copy the delivery_id from output**

---

## 8. ADD DELIVERY ITEMS

```sql
USE InventoryManagementDB;
GO

DECLARE @DeliveryId INT = your-delivery-id-from-step-7;
DECLARE @AwardItemId1 INT;
DECLARE @AwardItemId2 INT;
DECLARE @AwardItemId3 INT;

-- Get award item IDs
SELECT TOP 3
    @AwardItemId1 = award_item_id
FROM AwardItems
WHERE award_id = your-award-id
ORDER BY award_item_id;

-- Add delivery items
-- Item 1: Dell Laptops (5 units)
INSERT INTO delivery_items (
    delivery_item_id,
    delivery_id,
    award_item_id,
    quantity_delivered,
    quantity_accepted,
    rejection_reason,
    serial_numbers
)
VALUES (
    ISNULL((SELECT MAX(delivery_item_id) FROM delivery_items), 0) + 1,
    @DeliveryId,
    (SELECT MIN(award_item_id) FROM AwardItems WHERE award_id = your-award-id),
    5,
    5,
    NULL,
    'SN001,SN002,SN003,SN004,SN005'
);

-- Item 2: SAN Switches (10 units)
INSERT INTO delivery_items (
    delivery_item_id,
    delivery_id,
    award_item_id,
    quantity_delivered,
    quantity_accepted,
    serial_numbers
)
VALUES (
    ISNULL((SELECT MAX(delivery_item_id) FROM delivery_items), 0) + 1,
    @DeliveryId,
    (SELECT award_item_id FROM AwardItems WHERE award_id = your-award-id ORDER BY award_item_id OFFSET 1 ROWS FETCH NEXT 1 ROW ONLY),
    10,
    10,
    'SW001,SW002,SW003,SW004,SW005,SW006,SW007,SW008,SW009,SW010'
);

-- Item 3: Network Cables (50 units)
INSERT INTO delivery_items (
    delivery_item_id,
    delivery_id,
    award_item_id,
    quantity_delivered,
    quantity_accepted
)
VALUES (
    ISNULL((SELECT MAX(delivery_item_id) FROM delivery_items), 0) + 1,
    @DeliveryId,
    (SELECT MAX(award_item_id) FROM AwardItems WHERE award_id = your-award-id),
    50,
    50
);

PRINT '✅ Added 3 delivery items';
```

---

## 9. FINALIZE DELIVERY (Via Web UI)

**Cannot be done via SQL - must use Web UI:**

1. Login to IMS with Admin role
2. Go to **Stock Acquisition** → **Delivery Report**
3. Find Delivery: **DLV-2026-001**
4. Review all items
5. Click **Finalize Delivery** button
6. Confirm

**This automatically creates stock_admin records!**

---

## 10. VERIFY ADMIN INVENTORY

```sql
USE InventoryManagementDB;
GO

SELECT 
    'ADMIN STORE' as store_level,
    im.nomenclature,
    im.item_code,
    sa.current_quantity,
    sa.available_quantity,
    sa.unit_price,
    sa.stock_status,
    sa.storage_location
FROM stock_admin sa
JOIN item_masters im ON sa.item_master_id = im.id
ORDER BY im.nomenclature;

-- Expected output after finalization:
-- | store_level   | nomenclature    | current_qty | available_qty | unit_price |
-- | ADMIN STORE   | Dell Laptop     | 5           | 5             | 85000      |
-- | ADMIN STORE   | SAN Switches    | 10          | 10            | 4800       |
-- | ADMIN STORE   | Network Cable   | 50          | 50            | 500        |
```

---

## 11. WING REQUESTS ITEMS FROM ADMIN

**Via Web UI only:**

1. Login as Wing Supervisor (Wing 19)
2. Go to **Stock Issuance** → **Create Request**
3. Request Type: **Organizational**
4. Item: **Dell Laptop**
5. Quantity: **3**
6. Purpose: **Replace damaged units**
7. Click **Submit**

**OR via SQL (Direct approach):**

```sql
USE InventoryManagementDB;
GO

DECLARE @WingId INT = 19;
DECLARE @ItemId UNIQUEIDENTIFIER = 'laptop-uuid';
DECLARE @UserId NVARCHAR(450) = 'wing-supervisor-id';
DECLARE @RequestId UNIQUEIDENTIFIER = NEWID();

-- Create request
INSERT INTO stock_issuance_requests (
    id, request_number, request_type, requester_wing_id,
    requester_user_id, purpose, urgency_level,
    expected_return_date, is_returnable, request_status,
    submitted_at, created_at
)
VALUES (
    @RequestId,
    'SI-2026-001',
    'Organizational',
    @WingId,
    @UserId,
    'Replace damaged computing equipment',
    'High',
    NULL,
    0,
    'Pending Admin Review',
    GETDATE(),
    GETDATE()
);

-- Add item to request
INSERT INTO stock_issuance_items (
    id, request_id, item_master_id,
    requested_quantity, approved_quantity, issued_quantity,
    unit_price, total_price, item_status, created_at
)
VALUES (
    NEWID(),
    @RequestId,
    @ItemId,
    3,
    3,
    NULL,
    85000,
    255000,
    'Pending Approval',
    GETDATE()
);

SELECT @RequestId AS request_id;

PRINT '✅ Request created - must approve via Web UI';
```

---

## 12. CHECK COMPLETE INVENTORY STATE

```sql
-- VIEW ALL INVENTORY LEVELS
SELECT 'ADMIN' as store_level, NULL as wing_id, NULL as user_id,
       im.nomenclature, sa.current_quantity, sa.unit_price
FROM stock_admin sa
JOIN item_masters im ON sa.item_master_id = im.id

UNION ALL

SELECT 'WING', sw.wing_id, NULL,
       im.nomenclature, sw.current_quantity, sw.unit_price
FROM stock_wing sw
JOIN item_masters im ON sw.item_master_id = im.id

UNION ALL

SELECT 'PERSONAL', sp.wing_id, sp.user_id,
       im.nomenclature, sp.current_quantity, sp.unit_price
FROM stock_personal sp
JOIN item_masters im ON sp.item_master_id = im.id

ORDER BY nomenclature, store_level;
```

---

## Quick Reference: IDs You'll Need

| Step | ID Type | Value | Notes |
|------|---------|-------|-------|
| 2 | vendor_id | UUID | From vendor creation |
| 3 | tender_id | UUID | From tender creation |
| 5 | award_id | INT | From award creation |
| 7 | delivery_id | INT | From delivery creation |
| - | item_master_id | UUID | Must already exist in item_masters |
| - | user_id | UUID | Must already exist in AspNetUsers |

---

## Summary of Commands in Order

1. ✅ Run `CLEANUP-ALL-INVENTORY-DATA.sql`
2. ✅ Create Vendor (SQL)
3. ✅ Create Tender (SQL)
4. ✅ Add Tender Items (SQL)
5. ✅ Create Award (SQL)
6. ✅ Create Delivery (SQL)
7. ✅ Add Delivery Items (SQL)
8. ✅ Finalize Delivery (Web UI) ⭐ **CRITICAL**
9. ✅ Verify Admin Stock (SQL)
10. ✅ Wing Requests (Web UI or SQL)
11. ✅ Approve in Web UI
12. ✅ Wing Issues to User (Web UI)
13. ✅ Verify Complete Flow (SQL)

---

**End of Quick Reference**

All templates ready to copy-paste. Update UUIDs and IDs as needed!
