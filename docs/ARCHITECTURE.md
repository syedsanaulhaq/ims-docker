# System Architecture & Workflows

Complete overview of IMS system design and business workflows.

## System Architecture

### 5-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (React + TypeScript)                               │
│  - ApprovalDashboard, StockForms, TenderUI, etc.             │
│  - TypeScript type-safe components                           │
│  - Service-based API communication                           │
└─────────────────────┬──────────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼──────────────────────────────────────┐
│  API LAYER (Express Routes in backend-server.cjs)          │
│  - /api/approvals/*                                         │
│  - /api/stock-issuance/*                                   │
│  - /api/procurement/*                                       │
│  - /api/inventory-stock/*                                   │
│  - Business logic & validation                              │
└─────────────────────┬──────────────────────────────────────┘
                      │ mssql npm package
┌─────────────────────▼──────────────────────────────────────┐
│  DATA ACCESS LAYER                                          │
│  - Parameterized SQL queries                                │
│  - Database transactions                                    │
│  - Connection pooling                                       │
└─────────────────────┬──────────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────┐
│  DATABASE (SQL Server)                                      │
│  - InventoryManagementDB                                    │
│  - 61 tables, master data, transactions                      │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow Pattern

1. **Request:** Frontend sends HTTP request to API endpoint
2. **Validation:** API validates input parameters
3. **Processing:** Business logic executes (approvals, calculations, etc.)
4. **Database:** Data Access Layer queries/updates database
5. **Response:** API returns JSON response to frontend
6. **Display:** Frontend updates UI with results

---

## Core Workflows

### 1. Stock Issuance Workflow

Purpose: Allow departments to request and receive stock items.

#### Flow Diagram

```
Request Created (Requester)
        ↓
   Supervisor Reviews
        ↓
   Wing Manager Reviews (if needed)
        ↓
   Admin Final Approval
        ↓
   Items Issued to Requester
        ↓
   Stock Reduced from Inventory
        ↓
   Complete
```

#### Process Steps

| Step | Role | Action | Database Change |
|------|------|--------|-----------------|
| 1 | Requester | Create request with items | Insert stock_issuance_requests |
| 2 | Supervisor | Review items, decide per item | Insert approvals with decisions |
| 3 | Wing Mgr | Optional escalation review | Update approval_workflows |
| 4 | Admin | Final approval check | Update workflow status |
| 5 | System | Auto-issue approved items | Reduce current_inventory_stock |
| 6 | System | Create audit trail | Insert stock_transactions |

#### Key Tables

- `stock_issuance_requests` - Main request
- `stock_issuance_items` - Items in request
- `approval_workflows` - Approval routing
- `approvals` - Per-item decisions
- `current_inventory_stock` - Stock reduction
- `stock_transactions` - Audit trail

#### API Endpoints

```
POST   /api/stock-issuance/create          Create request
GET    /api/stock-issuance/requests        List requests
POST   /api/stock-issuance/submit-approval Submit approval
GET    /api/approvals/my-approvals         Get pending approvals
POST   /api/approvals/approve              Approve items
POST   /api/approvals/reject               Reject items
POST   /api/approvals/forward              Forward to next approver
```

---

### 2. Procurement Workflow

Purpose: Acquire new stock through tender-based procurement.

#### Flow Diagram

```
Procurement Request Created
        ↓
   Create Tender
        ↓
   Publish Tender (solicit bids)
        ↓
   Receive Vendor Bids
        ↓
   Evaluate Bids
        ↓
   Award to Selected Vendor
        ↓
   Receive Delivery
        ↓
   Stock Added to Inventory
        ↓
   Complete
```

#### Process Steps

| Step | Role | Status |
|------|------|--------|
| 1 | Requester | Create procurement request |
| 2 | System | Auto-create tender document |
| 3 | Procurement | Publish for vendor bidding |
| 4 | Vendors | Submit bids with pricing |
| 5 | Procurement | Evaluate bids (price, quality) |
| 6 | System | Award to lowest qualified |
| 7 | Vendor | Deliver items |
| 8 | System | Receive & add to stock |

#### Key Tables

- `procurement_requests` - Main request
- `procurement_request_items` - Items needed
- `tenders` - Tender document
- `tender_items` - Items in tender
- `tender_bids` - Vendor bids
- `tender_bid_items` - Bid details
- `current_inventory_stock` - Stock addition

---

### 3. Stock Verification Workflow

Purpose: Verify physical inventory against system records.

#### Flow Diagram

```
Physical Inventory Count
        ↓
   Create Verification Request
        ↓
   Supervisor Approves Count
        ↓
   Wing Manager Reviews
        ↓
   Reconcile Differences
        ↓
   Adjust System Records (if needed)
        ↓
   Complete
```

#### Reconciliation Options

- **Match:** Physical count = System count → No action
- **Shortage:** Physical < System → Adjust down
- **Overage:** Physical > System → Investigate & adjust up
- **Missing Items:** Item in system but not physical → Investigate

---

### 4. Reorder Workflow

Purpose: Automatically trigger procurement when stock falls below reorder level.

#### Flow Diagram

```
Current Stock < Reorder Level
        ↓
   System Detects
        ↓
   Auto-create Procurement Request
        ↓
   Create Tender
        ↓
   Follow Procurement Workflow
        ↓
   Stock Replenished
        ↓
   Complete
```

#### Configuration

Each item has:
- `reorder_level` - Minimum stock trigger
- `reorder_quantity` - How much to order
- Example: Reorder 50 items when stock falls below 20

---

## Approval Workflow System

### Multi-Level Approval

Approvals can have multiple stages based on organization structure:

```
Stage 1: Supervisor (Wing-level)
         ↓ Approves/Rejects/Returns
Stage 2: Wing Manager
         ↓ Approves/Rejects/Returns
Stage 3: Admin/Director
         ↓ Final Approval/Rejection
```

### Per-Item Approval

Each item in a request is approved individually:

```
Request with 5 Items
├── Item 1 → Approve (full quantity)
├── Item 2 → Reject (out of stock)
├── Item 3 → Approve (partial quantity)
├── Item 4 → Return (needs clarification)
└── Item 5 → Forward (to admin)
```

### Approval Actions

| Action | Effect | Next Stage |
|--------|--------|-----------|
| **Approve** | Item approved at current stage | Proceed to next approver |
| **Reject** | Item rejected, request stops | Notify requester |
| **Forward** | Escalate to higher authority | Send to next level |
| **Return** | Send back for modification | Requester revises |
| **Partial** | Approve reduced quantity | Accept change |

---

## Key Concepts

### Soft Delete

All tables have `is_deleted` bit column:

```sql
-- To delete: Set is_deleted = 1
UPDATE item_masters SET is_deleted = 1 WHERE id = @id

-- To query: Always filter active records
SELECT * FROM item_masters WHERE is_deleted = 0
```

### Timestamps

Every record has:
- `created_at` - When created (set once)
- `updated_at` - Last modification (updated automatically)

### Transactions

Critical operations use database transactions:

```
Stock Issuance Issue:
1. BEGIN TRANSACTION
2. Update current_inventory_stock (reduce quantity)
3. Insert stock_transaction (audit)
4. Update approval_workflow (mark as issued)
5. COMMIT or ROLLBACK on error
```

### Status Tracking

Requests progress through statuses:

```
stock_issuance_requests status:
  pending → approved → issued → completed
  ↓
  rejected

approval_workflows status:
  pending → approved → completed
  ↓
  rejected
```

---

## Role & Permission Mapping

### Roles in System

| Role | Approval Ability | Can Create | Can View |
|------|------------------|-----------|---------|
| **Requester** | - | Requests | Own requests |
| **Supervisor** | Stage 1 | Requests | Team requests |
| **Wing Mgr** | Stage 2 | - | Wing requests |
| **Admin** | Stage 3 | All | All |
| **Vendor** | - | - | Assigned tenders |

### Permission Model

```
Can Approve If:
  1. User is in approval chain
  2. Current approver matches user
  3. Request still pending
  4. User has role permissions
```

---

## Integration Points

### Frontend-Backend Communication

Services handle all API calls:

```typescript
// ApprovalForwardingService
approveRequest(approvalId, action) → POST /api/approvals/approve
rejectRequest(approvalId, action) → POST /api/approvals/reject
forwardRequest(approvalId, action) → POST /api/approvals/forward
```

### Database Queries

All queries use parameterized statements:

```javascript
const result = await pool.request()
  .input('userId', sql.Int, userId)
  .input('status', sql.VarChar, 'pending')
  .query('SELECT * FROM approvals WHERE user_id = @userId AND status = @status')
```

---

## Data Consistency Rules

### Stock Issuance

```
Issued Quantity ≤ Approved Quantity ≤ Requested Quantity
```

### Procurement

```
Bid Amount = Σ(Item Unit Price × Item Quantity)
Tender Total ≥ Sum of All Bid Items
```

### Inventory

```
Current Stock ≥ 0 (Cannot go negative)
Transaction Qty + Current Stock = New Stock
```

---

## Error Handling

### Common Scenarios

| Scenario | Action | Response |
|----------|--------|----------|
| Invalid quantity | Reject | "Quantity exceeds available" |
| Unauthorized approver | Reject | "Not approved to approve" |
| Item out of stock | Reject | "Insufficient stock" |
| Duplicate approval | Reject | "Already approved" |
| Stale data | Reject | "Request modified, refresh" |

### Response Codes

```
200: Success
201: Created
204: No Content
400: Bad Request (validation)
401: Unauthorized (auth)
403: Forbidden (permissions)
404: Not Found
500: Server Error
```

---

## System Constraints

### Operational Rules

1. **Cannot issue more than requested** - Approval ≤ Request
2. **Cannot approve completed requests** - Must be pending
3. **Cannot bypass approval chain** - Must follow stages
4. **Cannot reduce stock below zero** - Physical constraint
5. **Cannot approve own request** - Conflict of interest

### Business Rules

1. **Tender requires minimum of 3 bids** (optional, configurable)
2. **Bids must be submitted before closing date**
3. **Award must be to qualified bidder**
4. **Stock verification requires physical count**
5. **Reorder automates on threshold trigger**

---

## Audit & Compliance

### Audit Trail

Every action logged via `stock_transactions`:

```
Who: created_by (user ID)
What: action (approve, issue, receive)
When: created_at (timestamp)
Where: item_id (which item)
Why: reference (request ID)
```

### Approval History

All approvals stored in `approvals` table:

```
- approved_by: Who approved
- decision_date: When approved
- comments: Reason/notes
- rejection_reason: If rejected
```

### Compliance

- No direct stock manipulation (only through workflows)
- All changes traceable to user
- Cannot delete historical records (soft delete only)
- Retention policy: Keep 7 years (configurable)

---

**Last Updated:** December 28, 2025  
**Status:** Current Documentation
