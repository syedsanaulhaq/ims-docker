# Approval Request - Store Keeper Verification Workflow

## Overview

When an approver is reviewing an approval request, they can now **forward items to a Store Keeper** instead of confirming wing stock availability directly. This creates a verification request that goes to the Store Keeper, who physically checks the stock and responds.

## New Workflow

### Step 1: Approver Reviews Request
- Approver logs in and goes to **"My Approvals (Requests)"** dashboard
- Sees pending approval requests
- Clicks on a request to view items

### Step 2: Approver Forwards Item to Store Keeper
In the item details section, there are now two buttons:
- **🔍 Check Stock Availability** - View current stock levels (read-only)
- **👤 Forward to Store Keeper** - CREATE A VERIFICATION REQUEST (NEW!)

**OLD WORKFLOW:** ❌ "Confirm from Wing Stock" button confirmed availability immediately

**NEW WORKFLOW:** ✅ "Forward to Store Keeper" creates a verification task

### Step 3: Verification Request Created
When "Forward to Store Keeper" is clicked:
1. A **verification request** is created in the `inventory_verification_requests` table
2. The request is **forwarded** to the Store Keeper of the same wing
3. Modal shows: "Verification request forwarded to Store Keeper"

### Step 4: Store Keeper Receives Verification
- Store Keeper logs in
- Goes to **"Store Keeper Menu" → "Forwarded Verifications"**
- Sees the verification request forwarded from the approver
- Physically verifies the item availability
- Submits verification result (available/partial/unavailable)

### Step 5: Approver Monitors Status
The approver can:
- Continue with other items
- Wait for Store Keeper's response
- Once Store Keeper responds, the verification status is updated
- Approver can then finalize their approval decision

## Technical Implementation

### Frontend Changes

**File:** `src/components/PerItemApprovalPanel.tsx`

**New Function:** `forwardToStoreKeeper(item)`
- Takes an item from the approval request
- Calls endpoint: `POST /api/inventory/request-verification`
- Sends item details and request info
- Creates verification in database

**Updated UI:**
- Changed button from "Confirm from Wing Stock" to "Forward to Store Keeper"
- Updated modal title to "Forward to Store Keeper for Verification"
- Updated modal content to explain the process
- Shows confirmation that request was sent to Store Keeper

### Backend Integration

**Endpoint:** `POST /api/inventory/request-verification` (already exists)

**Request Payload:**
```json
{
  "stock_issuance_id": "approval-id",
  "item_master_id": "item-id",
  "item_nomenclature": "Item Name",
  "requested_quantity": 5,
  "request_type": "store_keeper_verification"
}
```

**Response:**
- Creates record in `inventory_verification_requests` table
- Status: `pending` (waits to be forwarded to store keeper)
- Returns `{ success: true, verificationId: ... }`

### Database Flow

```
inventory_verification_requests table:
- stock_issuance_id → links to approval request
- item_nomenclature → item being verified
- requested_quantity → qty needed
- verification_status → pending → forwarded → verified_*
- forwarded_to_user_id → Store Keeper's user ID
- forwarded_at → when forwarded
```

## User Roles

### Approver (on approval dashboard)
- Sees "Forward to Store Keeper" button
- Clicks to create verification request
- Waits for Store Keeper response
- Continues with approval decision

### Store Keeper (in their dashboard)
- Sees forwarded verifications
- Physically checks stock
- Submits verification result
- Approval process continues

## Example Flow

```
1. Approver on /dashboard/approval-dashboard-request-based
2. Reviews request for "100 units of Item X"
3. Clicks "Forward to Store Keeper" button
4. Modal: "Verification request forwarded to Store Keeper"
5. Request is created and sent
6.
7. Store Keeper logs in
8. Goes to "Store Keeper Menu" → "Forwarded Verifications"
9. Sees the new verification request
10. Physically counts Item X in warehouse
11. Submits: "Available - 120 units confirmed"
12.
13. Approver can now see verification is complete
14. Continues with approval decision (approve/reject/forward)
```

## Benefits

✅ **Better Accountability** - Store Keeper physically verifies  
✅ **Accurate Stock** - No guessing, actual count from store  
✅ **Clear Workflow** - Everyone knows their role  
✅ **Audit Trail** - Who verified what and when  
✅ **Wing-Specific** - Verification goes to correct store keeper  

## Troubleshooting

### Button not appearing?
- Make sure you're on /dashboard/approval-dashboard-request-based
- Make sure request has items
- Make sure you have approval.approve permission

### Verification not created?
- Check browser console for errors
- Verify /api/inventory/request-verification endpoint is working
- Check database for inventory_verification_requests table

### Store Keeper not seeing verification?
- Ensure store keeper has CUSTOM_WING_STORE_KEEPER role
- Ensure verification was actually forwarded (check forwarded_to_user_id in database)
- Have store keeper log out and back in to refresh session

## SQL Verification

```sql
-- Check if verification was created
SELECT * FROM inventory_verification_requests 
WHERE stock_issuance_id = 'your-approval-id'

-- Check if forwarded to store keeper
SELECT forwarded_to_user_id, forwarded_to_name, forwarded_at 
FROM inventory_verification_requests 
WHERE id = verification_id

-- Check store keeper's forwarded verifications
SELECT * FROM vw_ims_user_permissions
WHERE user_id = 'store-keeper-id' 
AND permission_key = 'inventory.manage_store_keeper'
```

## Related Pages

- **Approver:** `/dashboard/approval-dashboard-request-based`
- **Store Keeper:** `/dashboard/store-keeper-verifications`
- **Workflow Doc:** `STORE-KEEPER-VERIFICATION-WORKFLOW.md`
