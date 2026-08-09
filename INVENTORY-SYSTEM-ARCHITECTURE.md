# Inventory Management System (IMS) - Architecture & Flow

**Version:** 1.0  
**Date:** January 5, 2026  
**System:** Inventory Management System (IMS)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Three-Level Inventory Structure](#three-level-inventory-structure)
3. [Data Flow: Tender to Inventory](#data-flow-tender-to-inventory)
4. [Stock Movement: Admin ↔ Wing](#stock-movement-admin--wing)
5. [Issuance Flow: Wing → User](#issuance-flow-wing--user)
6. [Database Tables](#database-tables)
7. [Complete Workflow Examples](#complete-workflow-examples)

---

## System Overview

The IMS uses a **hierarchical three-level inventory management system**:

```
TENDER/PURCHASE
       ↓
   DELIVERY
       ↓
ADMIN STORE (Central Warehouse) - Level 1
       ↓
WING STORE (Department Inventory) - Level 2
       ↓
PERSONAL STORE (User Issues) - Level 3
```

Each level is independent with its own:
- Stock quantities
- Availability tracking
- Transfer history
- Pricing information

---

## Three-Level Inventory Structure

### **Level 1: ADMIN STORE (Central Warehouse)**

**Purpose:** Central inventory repository for all organization items

**Table:** `stock_admin`

**Characteristics:**
- Single location for all items
- Centrally managed by admin staff
- Source of truth for total organization stock
- No wing_id (NULL = admin)

**Key Columns:**
```sql
stock_admin
├── item_master_id        (Links to ItemMaster)
├── current_quantity      (Total items in stock)
├── available_quantity    (Items available for distribution)
├── reserved_quantity     (Items allocated but not yet issued)
├── unit_price           (Cost per unit)
├── total_value          (Computed: quantity × price)
├── storage_location     (Physical location in warehouse)
└── stock_status         ('Available', 'Low Stock', 'Out of Stock', 'On Order')
```

**Lifecycle:**
1. **Stock Added:** When delivery is finalized from a tender
2. **Stock Decreases:** When distributed to wings
3. **Stock Increases:** When items returned from wings

---

### **Level 2: WING STORE (Department Inventory)**

**Purpose:** Departmental/wing-level inventory for distributed management

**Table:** `stock_wing`

**Characteristics:**
- One record per item per wing
- Wing supervisors manage these inventories
- Smaller quantities for specific wing use
- Sourced from Admin Store

**Key Columns:**
```sql
stock_wing
├── item_master_id        (Links to ItemMaster)
├── wing_id              (Which wing owns this stock)
├── current_quantity     (Items in this wing)
├── available_quantity   (Available to issue to users)
├── reserved_quantity    (Already allocated)
├── unit_price          (Same as admin, for tracking)
├── sourced_from_admin_date  (When received from admin)
└── stock_status        ('Available', 'Low Stock', 'Out of Stock', 'Requested from Admin')
```

**Lifecycle:**
1. **Stock Added:** When wing requests and admin approves (transfer from admin to wing)
2. **Stock Decreases:** When items issued to individual users
3. **Stock Increases:** When users return items

---

### **Level 3: PERSONAL STORE (User Issued Items)**

**Purpose:** Track items issued to individual users

**Table:** `stock_personal`

**Characteristics:**
- One record per item issued to each user
- User owns the item (temporarily or permanently)
- Tracks issuance and return status
- Can be returnable or permanent

**Key Columns:**
```sql
stock_personal
├── item_master_id         (Item being issued)
├── user_id               (User receiving the item)
├── wing_id               (User's wing)
├── issued_quantity       (How many issued)
├── current_quantity      (Still with user - may decrease if damaged/lost)
├── issued_date           (When issued)
├── issued_by             (Who issued it)
├── is_returnable         (Can user return it?)
├── expected_return_date  (When should it come back)
├── return_status         ('Not Returned', 'Partially Returned', 'Fully Returned', 'Overdue')
├── actual_return_date    (When actually returned)
├── returned_quantity     (How many came back)
├── purpose               (Why issued: 'Official Use', 'Personal Use', etc.)
└── item_status           ('In Use', 'Returned', 'Damaged', 'Lost', 'Under Maintenance')
```

**Lifecycle:**
1. **Item Issued:** When user requests and wing supervisor approves
2. **Item In Use:** While user holds it
3. **Item Returned:** When user returns it (can be partial)
4. **Status Updated:** If lost, damaged, or under maintenance

---

## Data Flow: Tender to Inventory

### **Step 1: Tender Created**

```
1️⃣ Supervisor creates Tender
   - Adds items to tender
   - Sets estimated quantities and prices
   - Submits for approval
   
2️⃣ Tender Status: "Tender Created"
   - No inventory impact yet
   - Items are just planned
```

### **Step 2: Tender Awarded**

```
1️⃣ Tender is awarded to vendor
   
2️⃣ Tender Status: "Awarded"
   
3️⃣ Award Items Created
   - Each tender item becomes an "Award Item"
   - Links to vendor and quantities
```

### **Step 3: Delivery Begins**

```
1️⃣ Vendor delivers items

2️⃣ Delivery Created
   - Delivery = Physical receipt of items from vendor
   - Links to Award
   - Contains delivery items with quantities
   
3️⃣ Delivery Items Tracked
   - For each item delivered:
     ├── Quantity Delivered
     ├── Quantity Accepted
     ├── Quantity Rejected
     └── Serial Numbers / Batch Info
```

### **Step 4: Stock Transaction Created**

```
1️⃣ After delivery finalized, system creates Stock Transaction record

2️⃣ Stock Transaction contains:
   - Item Master ID
   - Tender ID reference
   - Estimated Unit Price (from tender)
   - Actual Unit Price (may be negotiated)
   - Total Quantity Received
   - Pricing confirmation status

3️⃣ This is INTERMEDIATE state
   - Tracks pricing changes during tender
   - Before final inventory entry
```

### **Step 5: Items Added to ADMIN INVENTORY**

```
1️⃣ When delivery is FINALIZED
   - System processes all delivery items
   
2️⃣ For each item delivered:
   ├── CHECK: Does item exist in stock_admin?
   │   ├── YES → UPDATE: Add quantity
   │   └── NO → INSERT: Create new record
   │
   └── INSERT INTO stock_admin
       (item_master_id, current_quantity, available_quantity, unit_price, ...)

3️⃣ Admin Inventory Increases:
   stock_admin.current_quantity += delivered_quantity

4️⃣ Status: "Available" (or "Low Stock" if below min)

5️⃣ Pricing Set:
   unit_price = actual_unit_price from stock transaction
```

**Example:**
```
Tender: 100 × SAN Switches @ Rs. 5000/unit
Delivery: 100 units received
Admin Stock BEFORE: 0 units
Admin Stock AFTER: 100 units
Status: Available
```

---

## Stock Movement: Admin ↔ Wing

### **Scenario 1: Wing Requests Items from Admin**

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Wing Inventory Request                                │
└─────────────────────────────────────────────────────────────┘

1️⃣ WING SUPERVISOR CREATES REQUEST
   ├─ Item: SAN Switches
   ├─ Quantity: 20 units
   ├─ Purpose: "Replace damaged switches"
   └─ Status: Pending Admin Approval

2️⃣ SYSTEM CHECKS AVAILABILITY
   Admin Stock Check:
   ├─ Current: 100 units
   ├─ Available: 95 units (5 reserved)
   └─ Request: 20 units
   
   Decision: ✅ SUFFICIENT → Can approve from admin

3️⃣ SUPERVISOR REVIEWS REQUEST
   ├─ Sees: 20 units available in admin
   ├─ Approves: Forward to Admin
   └─ Status: "Pending Admin Review"

4️⃣ ADMIN REVIEWS & APPROVES
   ├─ Checks admin inventory: 95 available
   ├─ Approves issuance to wing
   └─ Status: "Approved & Issued"

5️⃣ STOCK TRANSFER EXECUTES
   ┌─ ADMIN STORE UPDATE:
   │  ├─ current_quantity: 100 → 80 (decreased by 20)
   │  ├─ available_quantity: 95 → 75
   │  └─ updated_at: NOW
   │
   └─ WING STORE UPDATE:
      ├─ current_quantity: 0 → 20 (increased by 20)
      ├─ available_quantity: 0 → 20
      ├─ sourced_from_admin_date: NOW
      └─ stock_status: "Available"

6️⃣ TRANSFER LOG CREATED
   transfer_log entry:
   ├─ from_store_type: "Admin"
   ├─ to_store_type: "Wing"
   ├─ to_wing_id: 19
   ├─ quantity: 20
   ├─ transfer_type: "Admin to Wing"
   ├─ transfer_status: "Completed"
   └─ completed_at: NOW

7️⃣ FINAL STATUS
   ├─ Request Status: "Approved"
   ├─ Admin Stock: 80 units (from 100)
   ├─ Wing Stock: 20 units (from 0)
   └─ Request: Complete
```

---

### **Scenario 2: Wing Insufficient Stock - Forward to Admin**

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: User Request → Wing Check → Admin Request            │
└─────────────────────────────────────────────────────────────┘

LEVEL 1: USER REQUESTS ITEM
┌───────────────────────┐
│ User Request Created   │
├───────────────────────┤
│ Item: Dell Laptop      │
│ Quantity: 5            │
│ Purpose: Project Use   │
└───────────────────────┘
         ↓

LEVEL 2: SUPERVISOR CHECKS WING INVENTORY
┌──────────────────────────────────────┐
│ Wing Supervisor Reviews              │
├──────────────────────────────────────┤
│ Checks Wing Stock:                   │
│  - Item: Dell Laptop                 │
│  - Current: 2 units                  │
│  - Available: 2 units                │
│  - Request: 5 units                  │
│                                      │
│ Decision: ❌ NOT ENOUGH IN WING      │
│ Action: Forward to Admin             │
└──────────────────────────────────────┘
         ↓

LEVEL 3: ADMIN CHECKS CENTRAL INVENTORY
┌──────────────────────────────────────┐
│ Admin Reviews Wing Request            │
├──────────────────────────────────────┤
│ Checks Admin Stock:                  │
│  - Item: Dell Laptop                 │
│  - Current: 20 units                 │
│  - Available: 18 units               │
│  - Request: 5 units                  │
│                                      │
│ Decision: ✅ SUFFICIENT              │
│ Action: Approve & Issue from Admin   │
└──────────────────────────────────────┘
         ↓

STOCK TRANSFER: ADMIN → WING
┌──────────────────────────────────────┐
│ Admin Deducts Stock                   │
│  current_quantity: 20 → 15           │
│  available_quantity: 18 → 13         │
│                                      │
│ Wing Receives Stock                  │
│  current_quantity: 2 → 7            │
│  available_quantity: 2 → 7          │
└──────────────────────────────────────┘
         ↓

WING ISSUES TO USER
┌──────────────────────────────────────┐
│ Wing Supervisor Issues Item           │
│  Wing deducts: 5 units               │
│  Wing stock: 7 → 2                   │
│                                      │
│ User Receives: 5 laptops             │
│  Personal stock created              │
└──────────────────────────────────────┘

FINAL STATE:
Admin:    20 → 15 (decreased by 5)
Wing:     2 → 7 → 2 (increased then decreased)
User:     0 → 5 (received 5)
```

---

## Issuance Flow: Wing → User

### **Complete User Issuance Workflow**

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: USER CREATES STOCK ISSUANCE REQUEST                    │
└────────────────────────────────────────────────────────────────┘

TABLE: stock_issuance_requests
┌──────────────────────────────────────┐
│ id: UUID (unique request ID)         │
│ request_number: "SI-2026-001"        │
│ request_type: "Individual"           │
│ requester_user_id: User's ID         │
│ requester_wing_id: 19                │
│ purpose: "Project Requirement"       │
│ urgency_level: "High"                │
│ expected_return_date: 2026-02-05     │
│ is_returnable: true                  │
│ request_status: "Pending"            │
└──────────────────────────────────────┘
         ↓

┌────────────────────────────────────────────────────────────────┐
│ STEP 2: REQUEST ITEMS ADDED                                    │
└────────────────────────────────────────────────────────────────┘

TABLE: stock_issuance_items (Multiple rows, 1 per item)
┌──────────────────────────────────────┐
│ request_id: "SI-2026-001"            │
│ item_master_id: "Laptop-UUID"        │
│ item_nomenclature: "Dell Laptop"     │
│ requested_quantity: 5                │
│ unit_price: Rs. 85000                │
│ total_price: Rs. 425000              │
│ item_status: "Pending Approval"      │
└──────────────────────────────────────┘
         ↓

┌────────────────────────────────────────────────────────────────┐
│ STEP 3: SUPERVISOR REVIEWS & APPROVES                          │
└────────────────────────────────────────────────────────────────┘

Wing Supervisor Checks:
┌──────────────────────────────────────────────────────────────┐
│ 1. Wing Inventory Check                                      │
│    ├─ Item: Dell Laptop                                      │
│    ├─ Wing has: 7 units                                      │
│    ├─ User wants: 5 units                                    │
│    └─ Result: ✅ ENOUGH IN WING                              │
│                                                              │
│ 2. Supervisor Decision:                                      │
│    ├─ Option A: Approve from Wing                            │
│    │  └─ Wing stock will decrease by 5                       │
│    └─ Option B: Forward to Admin                             │
│       └─ If wing insufficient                                │
│                                                              │
│ Decision Made: ✅ APPROVE FROM WING                          │
└──────────────────────────────────────────────────────────────┘
         ↓

┌────────────────────────────────────────────────────────────────┐
│ STEP 4: ADMIN APPROVES (If needed)                             │
└────────────────────────────────────────────────────────────────┘

If Forwarded to Admin:
┌──────────────────────────────────────────────────────────────┐
│ Admin checks Admin Inventory:                                │
│  - Item: Dell Laptop                                         │
│  - Admin has: 15 units                                       │
│  - Request: 5 units                                          │
│  - Result: ✅ AVAILABLE                                      │
│                                                              │
│ Admin Decision: ✅ APPROVE & ISSUE FROM ADMIN STORE          │
│                                                              │
│ Stock Movement:                                              │
│  Admin: 15 → 10 (decreased by 5)                             │
│  Wing: 2 → 7 (increased by 5)                                │
│  Then Wing issues to user (next step)                        │
└──────────────────────────────────────────────────────────────┘
         ↓

┌────────────────────────────────────────────────────────────────┐
│ STEP 5: ISSUE FROM WING STORE                                  │
└────────────────────────────────────────────────────────────────┘

Wing Supervisor Issues Items:
┌──────────────────────────────────────────────────────────────┐
│ Procedure: sp_IssueFromWingStore                             │
│                                                              │
│ Stock Update:                                                │
│  WING STORE:                                                 │
│  WHERE item_master_id = 'Laptop-UUID'                        │
│    AND wing_id = 19                                          │
│                                                              │
│  UPDATE stock_wing                                           │
│  SET current_quantity = current_quantity - 5  (7 → 2)        │
│      available_quantity = available_quantity - 5 (7 → 2)     │
│      updated_at = NOW                                        │
│      updated_by = 'Supervisor-ID'                            │
└──────────────────────────────────────────────────────────────┘
         ↓

┌────────────────────────────────────────────────────────────────┐
│ STEP 6: PERSONAL STORE CREATED                                 │
└────────────────────────────────────────────────────────────────┘

TABLE: stock_personal (New record)
┌──────────────────────────────────────────────────────────────┐
│ item_master_id: "Laptop-UUID"                                │
│ user_id: "User-ID"                                           │
│ wing_id: 19                                                  │
│ issued_quantity: 5                                           │
│ current_quantity: 5 (starts same as issued)                  │
│ issued_date: 2026-01-05                                      │
│ issued_by: "Supervisor-ID"                                   │
│ issuance_request_id: "SI-2026-001"                          │
│ is_returnable: true                                          │
│ expected_return_date: 2026-02-05                             │
│ return_status: "Not Returned"                                │
│ purpose: "Project Requirement"                               │
│ item_status: "In Use"                                        │
│ unit_price: 85000                                            │
│ total_value: 425000 (5 × 85000)                              │
└──────────────────────────────────────────────────────────────┘
         ↓

┌────────────────────────────────────────────────────────────────┐
│ STEP 7: REQUEST STATUS UPDATED                                 │
└────────────────────────────────────────────────────────────────┘

stock_issuance_requests:
┌──────────────────────────────────────────────────────────────┐
│ id: "SI-2026-001"                                            │
│ request_status: "Approved & Issued"                          │
│ fulfillment_status: "wing_approved"                          │
│ issued_at: 2026-01-05                                        │
│ issued_by: "Supervisor-ID"                                   │
└──────────────────────────────────────────────────────────────┘

FINAL STATE SUMMARY:
┌────────────────────────────────────────────────────────────┐
│ Admin Stock:  15 → 10 (if via admin)                        │
│ Wing Stock:   7 → 2 (after issuance)                        │
│ User Stock:   0 → 5 (received 5 laptops)                    │
│ Request:      ✅ COMPLETE                                   │
└────────────────────────────────────────────────────────────┘
```

---

## Database Tables

### **Core Stock Tables**

#### **1. stock_admin (Admin/Central Store)**
```sql
CREATE TABLE stock_admin (
    id INT PRIMARY KEY,
    item_master_id UNIQUEIDENTIFIER,      -- Item reference
    
    -- Quantities
    current_quantity INT,                  -- Total in stock
    available_quantity INT,                -- Available for distribution
    reserved_quantity INT,                 -- Already allocated
    
    -- Pricing
    unit_price DECIMAL(15,2),              -- Cost per unit
    total_value (COMPUTED),                -- quantity × price
    
    -- Status
    stock_status NVARCHAR(20),             -- Available, Low Stock, Out of Stock, On Order
    
    -- Location
    storage_location NVARCHAR(200),        -- Physical location
    warehouse_section NVARCHAR(100),       -- Section in warehouse
    
    -- Tracking
    created_at DATETIME2,
    updated_at DATETIME2,
    updated_by UNIQUEIDENTIFIER
);
```

#### **2. stock_wing (Wing/Department Store)**
```sql
CREATE TABLE stock_wing (
    id INT PRIMARY KEY,
    item_master_id UNIQUEIDENTIFIER,       -- Item reference
    wing_id INT,                           -- Which wing
    
    -- Quantities
    current_quantity INT,                  -- Total in wing
    available_quantity INT,                -- Available to issue
    reserved_quantity INT,                 -- Already allocated
    
    -- Pricing
    unit_price DECIMAL(15,2),              -- Same as admin for tracking
    total_value (COMPUTED),
    
    -- Source Tracking
    sourced_from_admin_date DATETIME2,     -- When received from admin
    last_replenished_date DATETIME2,
    last_replenished_quantity INT,
    
    -- Status
    stock_status NVARCHAR(20),             -- Available, Low Stock, Out of Stock, Requested from Admin
    
    UNIQUE (item_master_id, wing_id)       -- One record per item per wing
);
```

#### **3. stock_personal (User Issued Items)**
```sql
CREATE TABLE stock_personal (
    id INT PRIMARY KEY,
    item_master_id UNIQUEIDENTIFIER,       -- Item reference
    user_id UNIQUEIDENTIFIER,              -- User who has it
    wing_id INT,                           -- User's wing
    
    -- Issuance
    issued_quantity INT,                   -- How many issued
    current_quantity INT,                  -- Still with user
    issued_date DATETIME2,
    issued_by UNIQUEIDENTIFIER,
    
    -- Return Tracking
    is_returnable BIT,                     -- Can be returned?
    expected_return_date DATE,
    return_status NVARCHAR(20),            -- Not Returned, Partially Returned, Fully Returned, Overdue
    actual_return_date DATETIME2,
    returned_quantity INT,
    
    -- Status
    item_status NVARCHAR(20),              -- In Use, Returned, Damaged, Lost, Under Maintenance
    
    -- Metadata
    purpose NVARCHAR(MAX),                 -- Why issued
    issuance_notes NVARCHAR(MAX)
);
```

### **Request Tables**

#### **4. stock_issuance_requests (User Requests)**
```sql
CREATE TABLE stock_issuance_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    request_number NVARCHAR(50) UNIQUE,    -- SI-2026-001
    request_type NVARCHAR(50),             -- Individual, Organizational
    
    -- Requester Info
    requester_user_id UNIQUEIDENTIFIER,
    requester_wing_id INT,
    
    -- Request Details
    purpose NVARCHAR(MAX),
    urgency_level NVARCHAR(20),            -- Low, Medium, High
    is_returnable BIT,
    expected_return_date DATE,
    
    -- Status
    request_status NVARCHAR(50),           -- Pending, Approved, Issued, Rejected, Cancelled
    fulfillment_status NVARCHAR(30),       -- wing_approved, admin_approved, fulfilled
    
    -- Timestamps
    submitted_at DATETIME2,
    created_at DATETIME2
);
```

#### **5. stock_issuance_items (Individual Items in Request)**
```sql
CREATE TABLE stock_issuance_items (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    request_id UNIQUEIDENTIFIER,           -- Links to request
    item_master_id UNIQUEIDENTIFIER,
    
    -- Quantities
    requested_quantity INT,
    approved_quantity INT,
    issued_quantity INT,
    
    -- Pricing
    unit_price DECIMAL(15,2),
    total_price DECIMAL(15,2),
    
    -- Status
    item_status NVARCHAR(50)               -- Pending, Approved, Issued, Rejected
);
```

### **Transfer & History Tables**

#### **6. stock_transfer_log (Track all movements)**
```sql
CREATE TABLE stock_transfer_log (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    
    -- Source
    from_store_type NVARCHAR(20),          -- Admin, Wing, Personal
    from_wing_id INT NULL,
    from_user_id NVARCHAR(450) NULL,
    
    -- Destination
    to_store_type NVARCHAR(20),            -- Admin, Wing, Personal
    to_wing_id INT NULL,
    to_user_id NVARCHAR(450) NULL,
    
    -- Transfer Details
    item_master_id UNIQUEIDENTIFIER,
    quantity INT,
    transfer_type NVARCHAR(30),            -- Admin to Wing, Wing to Personal, Personal Return to Wing, Wing Return to Admin
    transfer_reason NVARCHAR(MAX),
    request_reference UNIQUEIDENTIFIER,    -- Links to request if applicable
    
    -- Status
    transfer_status NVARCHAR(20),          -- Pending, In Transit, Completed, Cancelled
    
    -- Approval
    approved_by NVARCHAR(450),
    approved_at DATETIME2,
    
    -- Metadata
    notes NVARCHAR(MAX),
    created_at DATETIME2,
    created_by NVARCHAR(450)
);
```

---

## Complete Workflow Examples

### **Example 1: Tender → Delivery → Admin Stock**

```
SCENARIO: Purchase 100 SAN Switches via Tender

STEP 1: TENDER CREATED
├─ Item: SAN Switches
├─ Quantity: 100 units
├─ Estimated Price: Rs. 5000/unit
└─ Status: Tender Created

STEP 2: TENDER AWARDED
├─ Awarded to: ABC Electronics
├─ Confirmed Quantity: 100 units
├─ Confirmed Price: Rs. 4800/unit (negotiated)
└─ Status: Awarded

STEP 3: DELIVERY RECEIVED
├─ Delivery Date: 2026-01-05
├─ Items Delivered: 100 units
├─ Items Accepted: 100 units
├─ Items Damaged: 0
├─ Status: Complete
└─ TABLE: deliveries, delivery_items

STEP 4: STOCK TRANSACTION CREATED
├─ Tender ID: T-001
├─ Item ID: SAN-UUID
├─ Quantity Delivered: 100
├─ Estimated Price: Rs. 5000
├─ Actual Price: Rs. 4800
├─ TABLE: stock_transactions

STEP 5: ADMIN INVENTORY UPDATED
└─ INSERT INTO stock_admin
   ├─ item_master_id: SAN-UUID
   ├─ current_quantity: 100
   ├─ available_quantity: 100
   ├─ unit_price: 4800
   ├─ stock_status: Available
   └─ storage_location: Warehouse Section A

RESULT:
┌─────────────────────────────────────┐
│ Admin Inventory: 100 units (NEW)    │
│ Price Per Unit: Rs. 4800            │
│ Total Value: Rs. 480,000            │
│ Status: Available for distribution  │
└─────────────────────────────────────┘
```

---

### **Example 2: Admin → Wing → User Distribution**

```
SCENARIO: Wing requests 20 units, User needs 5 units

STEP 1: ADMIN INITIAL STATE
├─ Item: SAN Switches
├─ Quantity: 100 units
├─ Status: Available

STEP 2: WING REQUESTS FROM ADMIN
├─ Wing: 19 (Engineering)
├─ Quantity: 20 units
├─ Purpose: Stock replenishment
├─ Status: Pending → Approved

Stock Transfer:
├─ ADMIN UPDATE:
│  └─ 100 → 80 units (decreased)
└─ WING CREATE:
   └─ 0 → 20 units (NEW record created)

STEP 3: USER REQUESTS FROM WING
├─ User: Ahmed Khan
├─ Wing: 19
├─ Quantity: 5 units
├─ Purpose: Project use
├─ Status: Pending → Approved

Stock Update:
├─ WING UPDATE:
│  └─ 20 → 15 units (decreased)
└─ PERSONAL CREATE:
   └─ 0 → 5 units (NEW record created)

FINAL STATE:
┌────────────────────────────────────────┐
│ Admin Stock: 100 → 80 units            │
│ Wing Stock: 0 → 20 → 15 units          │
│ User Stock: 0 → 5 units                │
│                                        │
│ Distribution Path:                     │
│ Admin (100) → Wing (20) → User (5)     │
└────────────────────────────────────────┘
```

---

### **Example 3: Item Return from User to Wing**

```
SCENARIO: User returns 5 SAN Switches after project completion

STEP 1: USER HOLDS ITEMS
├─ User: Ahmed Khan
├─ Item: SAN Switches
├─ Quantity: 5 units
├─ Issued Date: 2025-12-15
├─ Expected Return: 2026-01-30
└─ Status: In Use

STEP 2: USER INITIATES RETURN
├─ Return Date: 2026-01-25 (Early)
├─ Returned Quantity: 5 units
├─ Condition: Good
└─ Status: Pending Wing Approval

STEP 3: WING SUPERVISOR ACCEPTS RETURN
├─ Inspects items
├─ Confirms: 5 units in good condition
└─ Status: Approved

Stock Update:
├─ PERSONAL UPDATE:
│  ├─ current_quantity: 5 → 0
│  ├─ return_status: Not Returned → Fully Returned
│  └─ actual_return_date: 2026-01-25
│
└─ WING UPDATE:
   └─ current_quantity: 15 → 20 units (increased)

STEP 4: TRANSFER LOG RECORDED
└─ CREATE stock_transfer_log
   ├─ from_store_type: Personal
   ├─ from_user_id: Ahmed Khan
   ├─ to_store_type: Wing
   ├─ to_wing_id: 19
   ├─ transfer_type: Personal Return to Wing
   ├─ quantity: 5
   └─ transfer_status: Completed

FINAL STATE:
┌────────────────────────────────────────┐
│ Admin Stock: 80 units (unchanged)      │
│ Wing Stock: 15 → 20 units (returned)   │
│ User Stock: 5 → 0 units (returned)     │
│                                        │
│ ✅ Full return successful              │
└────────────────────────────────────────┘
```

---

### **Example 4: Partial Return (Item Lost/Damaged)**

```
SCENARIO: User returns 5 items but 2 are lost/damaged, so only 3 returned

STEP 1: USER INITIATED RETURN
├─ Issued: 5 units
├─ Condition: 3 good, 2 lost
├─ Returning: 3 units

STEP 2: WING ACCEPTS PARTIAL RETURN
├─ Verified: 3 units received in good condition
├─ Missing: 2 units (lost by user)
└─ Status: Partial Return

Stock Update:
├─ PERSONAL UPDATE:
│  ├─ issued_quantity: 5 (unchanged)
│  ├─ current_quantity: 5 → 3 (adjusted)
│  ├─ returned_quantity: 3
│  ├─ return_status: Not Returned → Partially Returned
│  ├─ item_status: In Use → Partially Returned (with missing items)
│  └─ actual_return_date: 2026-01-25
│
└─ WING UPDATE:
   └─ current_quantity: 15 → 18 units (only 3 added back)

DISCREPANCY RECORDED:
├─ 2 units lost/unaccounted for
├─ User may be charged for missing items
├─ Status: Pending resolution

FINAL STATE:
┌────────────────────────────────────────┐
│ Issued: 5 units                        │
│ Returned: 3 units                      │
│ Missing: 2 units (Lost)                │
│                                        │
│ Wing Stock: 15 → 18 (+3 returned)      │
│ Status: ⚠️  Partial Return - Discrepancy│
└────────────────────────────────────────┘
```

---

## Key Business Rules

### **Stock Deduction Priority**

When a user requests items:
```
1. Check Wing Stock First
   └─ If sufficient → Issue from wing
   
2. If Not Sufficient in Wing → Forward to Admin
   └─ If admin has stock → Transfer from admin to wing
   └─ Then issue to user
   
3. If Admin Also Insufficient → Reject or Mark for Procurement
   └─ Create procurement request
   └─ Status: "Pending Procurement"
```

### **Stock Increase Priority**

When an item is returned:
```
1. From Personal → Goes to Wing Stock
   └─ Increase wing.current_quantity
   
2. From Wing → Goes to Admin Stock
   └─ Increase admin.current_quantity
   
3. If Damaged/Lost → Not returned to stock
   └─ Marked as "Damaged" or "Lost"
   └─ User may be charged
```

### **Pricing**

- **Admin Store:** Unit price set during delivery (actual price from tender)
- **Wing Store:** Same unit price as admin (for valuation)
- **Personal Store:** Same unit price (computed: issued_qty × unit_price)
- **Total Value:** Always = current_quantity × unit_price

---

## Summary Table

| Level | Table | Owner | Key Feature | Stock Decreases By | Stock Increases By |
|-------|-------|-------|-------------|------------------|------------------|
| 1 | stock_admin | Admin Staff | Central Warehouse | Distribution to Wings | Deliveries from Tenders |
| 2 | stock_wing | Wing Supervisor | Department Inventory | Issuance to Users | Transfers from Admin, Returns from Users |
| 3 | stock_personal | Individual User | Personal Items | Return to Wing | Issuance from Wing |

---

**End of Document**

For questions about the inventory system architecture, refer to this document or contact the System Administrator.
