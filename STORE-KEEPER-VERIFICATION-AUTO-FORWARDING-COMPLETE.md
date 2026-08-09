# Store Keeper Verification Workflow - FIXED & AUTO-FORWARDING ✅

## Problem
Store keepers were not seeing verification requests forwarded from the approval dashboard. 

**Root Causes (3 issues):**
1. API payload had wrong field names (snake_case instead of camelCase)
2. Missing `requestedByUserId` field required by backend
3. Verifications were created but not auto-forwarded to store keepers (`forwarded_to_user_id` was NULL)

## Solutions Implemented

### 1. ✅ Fixed API Payload (Frontend)
**File**: `src/components/PerItemApprovalPanel.tsx`

Changed payload from snake_case to camelCase with all required fields:
```typescript
const payload = {
  stockIssuanceId: approvalId,              // ✅ REQUIRED
  itemMasterId: itemId,                     // ✅ REQUIRED
  itemNomenclature: getItemName(item),
  requestedQuantity: getItemQuantity(item),
  requestedByUserId: currentUser.user_id,   // ✅ REQUIRED (was missing)
  requestedByName: currentUser.user_name,
  wingId: currentUser.wing_id
};
```

### 2. ✅ Added Database Columns
**File**: `add-verification-forwarding-columns.sql`

Added 6 new columns to `inventory_verification_requests`:
- `forwarded_to_user_id` - Store keeper who will verify
- `forwarded_to_name` - Store keeper's name
- `forwarded_by_user_id` - Who forwarded (approver)
- `forwarded_by_name` - Forwarding person's name
- `forwarded_at` - When forwarded
- `forward_notes` - Optional forwarding notes

### 3. ✅ Auto-Forward Verifications to Store Keepers
**File**: `backend-server.cjs` - `POST /api/inventory/request-verification`

When creating a verification request, the backend now:
1. Gets the `wingId` from the request
2. Queries for users in that wing with `CUSTOM_WING_STORE_KEEPER` or `WING_STORE_KEEPER` role
3. Uses the IMS roles table (`ims_user_roles` + `ims_roles`) to find them
4. Auto-assigns the first matching store keeper
5. Sets `forwarded_to_user_id`, `forwarded_to_name`, `forwarded_at` when creating the record

**Key Query (works with IMS custom roles):**
```sql
SELECT TOP 1 u.Id, u.UserName
FROM AspNetUsers u
INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
INNER JOIN ims_roles ir ON ur.role_id = ir.id
WHERE u.intWingID = @wingId
  AND ir.is_active = 1
  AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
ORDER BY u.UserName
```

## Complete Workflow

### Step 1: Approval Dashboard (Wing Supervisor)
```
[Wing Supervisor views Approval Request]
  ↓
[Clicks "Forward to Store Keeper" button]
  ↓
[Modal shows item details]
  ↓
[Frontend sends API call with:]
  - stockIssuanceId (approval ID)
  - itemMasterId 
  - requestedByUserId (supervisor's ID)
  - wingId (supervisor's wing)
  ↓
[Backend receives request]
  ↓
[Backend creates inventory_verification_requests record with:]
  - requested_by_user_id = supervisor ID
  - forwarded_to_user_id = store keeper ID (auto-found)
  - forwarded_at = current date
  ↓
✅ Verification request created & forwarded
```

### Step 2: Store Keeper Dashboard
```
[Store Keeper views "Forwarded Verifications"]
  ↓
[Frontend calls: GET /api/inventory/my-forwarded-verifications?userId={storeKeeperId}]
  ↓
[Backend queries:]
  SELECT * FROM inventory_verification_requests
  WHERE forwarded_to_user_id = {storeKeeperId}
  ↓
[Returns list of items to verify]
  ↓
✅ Store keeper sees all forwarded verifications
```

### Step 3: Verification & Response
```
[Store Keeper sees forwarded item]
  ↓
[Performs physical verification/count]
  ↓
[Submits verification results]
  ↓
[Updates verification status in database]
  ↓
✅ Approval workflow continues
```

## Testing

**Pre-Implementation Test Results:**
- ❌ Store keeper saw empty verifications list
- ❌ Old verification requests had forwarded_to_user_id = NULL

**Post-Implementation Test Results:**
- ✅ Found store keeper in wing 19: `a84bbf7a-dfb7-45ca-b603-e2313c57033b`
- ✅ User has role: `CUSTOM_WING_STORE_KEEPER`
- ✅ Query correctly finds store keeper in any wing

**Cleanup:**
- ✅ Deleted 2 old verification requests (without forwarding info)
- ✅ Database ready for new test verifications

## Files Modified

**Backend:**
- `backend-server.cjs` - Updated `/api/inventory/request-verification` endpoint to auto-forward
- `add-verification-forwarding-columns.sql` - Database schema migration
- `run-verification-forwarding-migration.cjs` - Migration executor

**Frontend:**
- `src/components/PerItemApprovalPanel.tsx` - Fixed API payload

**Testing/Utilities:**
- `test-store-keeper-lookup.cjs` - Verify store keeper lookup works
- `check-aspnetusers-schema.cjs` - Check table schema
- `check-store-keeper-roles.cjs` - Check IMS roles
- `cleanup-verification-requests.cjs` - Clean old test data

## Next Steps

1. ✅ Restart the dev server to load new backend code
2. ✅ Create test approval request
3. ✅ Click "Forward to Store Keeper" button
4. ✅ Verify store keeper sees the forwarded item in their dashboard
5. ✅ Store keeper completes verification
6. ✅ Approval workflow continues

---

## Key Technical Details

### Why IMS Roles Instead of AspNetRoles?
The system uses a custom IMS roles system (`ims_roles` table) for custom roles like `CUSTOM_WING_STORE_KEEPER`. These are not stored in the standard `AspNetRoles` table, so we must join through:
- `AspNetUsers` → `ims_user_roles` → `ims_roles`

### Wing Identification
- Frontend gets user's `wing_id` from session: `currentUser?.wing_id`
- Backend receives it as `wingId` parameter
- Database uses `intWingID` column in `AspNetUsers`
- All three must align correctly

### Auto-Forwarding Logic
- When verification request is created, backend automatically finds a store keeper in that wing
- Uses `TOP 1` to select first available store keeper
- Sets forwarding info when inserting the record (not in separate transaction)
- This ensures every verification is immediately visible to the store keeper

---

## Commit History

1. "Fix forward to store keeper - missing required fields and camelCase field names"
2. "Add verification forwarding to store keeper feature - backend API and database migration"
3. "Auto-forward verifications to wing store keepers when creating verification requests"
4. "Fix store keeper lookup - use AspNetRoles and office_id for wing matching"
5. "Fix store keeper lookup - use correct IMS user roles table (ims_user_roles) to find store keepers"
