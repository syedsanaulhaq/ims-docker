# Store Keeper Verification Workflow - Complete Guide

## Issue: Store Keeper Cannot See Verifications

**Root Cause:** When a verification is created, it's only in "pending" status. The inventory supervisor/manager must explicitly **forward** the verification to the store keeper before they can see it.

## Verification Workflow Steps

### Step 1: Create Verification Request
- User requests item verification
- Creates verification request (status = "pending")
- **At this point: Only appears in "Pending Verifications" page for Inventory Managers**

### Step 2: Forward to Store Keeper (REQUIRED)
- Inventory Manager/Supervisor goes to "Pending Verifications" page
- Selects the verification request
- Clicks "Forward to Store Keeper" button
- Selects which Store Keeper to forward to
- **IMPORTANT: This step is REQUIRED for store keeper to see the verification**

### Step 3: Store Keeper Views Forwarded Verification
- Store Keeper logs in
- Goes to "Store Keeper Menu" → "Forwarded Verifications"
- Now sees the forwarded verifications
- Can verify items and provide feedback

### Step 4: Store Keeper Submits Verification Result
- Store Keeper verifies physical count of items
- Submits verification status (available/partial/unavailable)
- Provides verification notes

## Technical Implementation

### Backend Flow

**Step 1: Create Verification**
- Endpoint: `POST /api/inventory/request-verification`
- Creates record in `inventory_verification_requests` table
- Status: `pending`
- `forwarded_to_user_id`: NULL

**Step 2: Forward to Store Keeper**
- Endpoint: `POST /api/inventory/forward-verification-to-storekeeper`
- Updates the verification record
- Sets `forwarded_to_user_id` = store keeper's user ID
- Sets `forwarded_to_name`, `forwarded_by_user_id`, `forwarded_at`
- Status: `forwarded`

**Step 3: Store Keeper Views**
- Endpoint: `GET /api/inventory/my-forwarded-verifications?userId={userId}`
- Query: `WHERE forwarded_to_user_id = @userId`
- Returns all verifications forwarded to this store keeper

### Database Structure

```sql
inventory_verification_requests table:
- id (PK)
- verification_status: pending → forwarded → verified_available/partial/unavailable
- requested_by_user_id: Who requested the verification
- forwarded_to_user_id: WHO TO FORWARD TO (CRITICAL!)
- forwarded_to_name: Store keeper's name
- forwarded_by_user_id: Supervisor who forwarded
- forwarded_at: When forwarded
```

## Troubleshooting Checklist

### ✅ Store Keeper Menu Appears?
- Store keeper must have `CUSTOM_WING_STORE_KEEPER` role
- Check: User has role in `ims_user_roles` table

### ✅ Forwarded Verifications Not Showing?
1. Check if verification was **forwarded** to store keeper:
```sql
SELECT forwarded_to_user_id, forwarded_at 
FROM inventory_verification_requests 
WHERE id = @verificationId
```

2. Verify `forwarded_to_user_id` matches the store keeper's user ID:
```sql
SELECT * FROM AspNetUsers WHERE Id = '{storeKeeperUserId}'
```

3. Test the API directly:
```bash
GET /api/inventory/my-forwarded-verifications?userId={storeKeeperUserId}
```

### ✅ Verification Shows But Cannot Interact?
- Store keeper needs to have proper wing access
- Check: Store keeper's `wing_id` matches the verification's `wing_id`

## Manual Testing Steps

1. **Create a verification request** as a regular user
2. **Log in as Inventory Manager/Supervisor**
3. **Go to Pending Verifications** page
4. **Find the verification** you just created
5. **Click "Forward to Store Keeper"**
6. **Select the appropriate Store Keeper**
7. **Click "Forward"**
8. **Log in as that Store Keeper**
9. **Go to Store Keeper Menu → Forwarded Verifications**
10. **Should now see the forwarded verification**

## Database Verification Query

```sql
-- Check if verification was forwarded to store keeper
SELECT 
  ivr.id,
  ivr.item_nomenclature,
  ivr.verification_status,
  ivr.requested_by_name,
  ivr.forwarded_to_name,
  ivr.forwarded_at,
  u.UserName as StoreKeeperUsername
FROM inventory_verification_requests ivr
LEFT JOIN AspNetUsers u ON ivr.forwarded_to_user_id = u.Id
WHERE ivr.forwarded_to_user_id IS NOT NULL
ORDER BY ivr.forwarded_at DESC
```

## Common Mistakes

❌ **Creating verification but not forwarding it**
- ✅ Solution: Must explicitly forward to store keeper

❌ **Forwarding to wrong store keeper**
- ✅ Solution: Select from the dropdown in Pending Verifications page

❌ **Store keeper in different wing**
- ✅ Solution: Ensure store keeper's `wing_id` matches the verification's `wing_id`

❌ **Verification forwarded but store keeper doesn't have the role**
- ✅ Solution: Assign `CUSTOM_WING_STORE_KEEPER` role to store keeper user

## UI Components

### For Inventory Managers:
- Route: `/dashboard/pending-verifications`
- Component: `PendingVerificationsPage.tsx`
- Shows pending verifications
- Has "Forward to Store Keeper" button
- Drop-down to select store keeper

### For Store Keepers:
- Route: `/dashboard/store-keeper-verifications`
- Component: `StoreKeeperVerificationsPage.tsx`
- Shows only verifications forwarded to them
- Can submit verification results
