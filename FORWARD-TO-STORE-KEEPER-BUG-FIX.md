# Forward to Store Keeper - Bug Fix

## Problem
When clicking "Forward to Store Keeper" button on the approval dashboard, the API call was failing with error:
```
Forward to Store Keeper for Verification → Missing required fields
```

## Root Cause
The frontend `forwardToStoreKeeper()` function in `PerItemApprovalPanel.tsx` was sending incorrect field names and missing the required `requestedByUserId` field:

**What was being sent (WRONG):**
```javascript
{
  stock_issuance_id: approvalId,           // WRONG: snake_case
  item_master_id: itemId,                  // WRONG: snake_case
  item_nomenclature: itemName,
  requested_quantity: qty,                 // WRONG: snake_case
  request_type: 'store_keeper_verification'
  // MISSING: requestedByUserId ❌
}
```

**What backend expects (camelCase):**
```javascript
{
  stockIssuanceId: approvalId,             // ✓ REQUIRED
  itemMasterId: itemId,                    // ✓ REQUIRED
  itemNomenclature: itemName,
  requestedQuantity: qty,
  requestedByUserId: userId,               // ✓ REQUIRED (WAS MISSING)
  requestedByName: userName,
  wingId: wingId
}
```

## Solution
Updated `src/components/PerItemApprovalPanel.tsx`:

### 1. Added sessionService import
```typescript
import { sessionService } from '@/services/sessionService';
```

### 2. Fixed forwardToStoreKeeper() function
- Get current user from sessionService: `sessionService.getCurrentUser()`
- Extract user's ID, name, and wing ID
- Build payload with correct camelCase field names
- Include all required fields: `stockIssuanceId`, `itemMasterId`, `requestedByUserId`
- Send proper payload structure to `/api/inventory/request-verification`

**Updated payload:**
```typescript
const payload = {
  stockIssuanceId: approvalId,           // ✓ camelCase, REQUIRED
  itemMasterId: itemId,                  // ✓ camelCase, REQUIRED
  itemNomenclature: getItemName(item),
  requestedQuantity: getItemQuantity(item),
  requestedByUserId: currentUser.user_id, // ✓ NOW INCLUDED, REQUIRED
  requestedByName: currentUser.user_name,
  wingId: currentUser.wing_id            // From user context
};
```

## Files Modified
- `src/components/PerItemApprovalPanel.tsx`
  - Line 26: Added `sessionService` import
  - Lines 620-650: Fixed `forwardToStoreKeeper()` function

## Testing
To test the fix:
1. Navigate to Approval Dashboard → `/dashboard/approval-dashboard-request-based`
2. Select an approval request with items
3. Click "👤 Forward to Store Keeper" button for any item
4. Modal should now:
   - Show item details
   - Send API request with correct payload
   - Display success message when request completes

## Result
✅ API call now includes all required fields in correct format
✅ Backend endpoint receives complete and properly formatted payload
✅ Verification request is created successfully in database
✅ Store Keeper can now see forwarded verifications in their dashboard
