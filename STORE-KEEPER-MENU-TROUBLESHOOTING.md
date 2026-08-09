# Store Keeper Menu Not Appearing - Troubleshooting Guide

## Issue
User `3740506012171` was given the WING_STORE_KEEPER role but the Store Keeper menu is not appearing in the sidebar.

## Root Causes & Solutions

### 1. **Database Permission Setup (Most Likely)**
The permission `inventory.manage_store_keeper` may not exist or may not be assigned to the WING_STORE_KEEPER role.

**Fix:**
Run this SQL file in your database:
```
fix-store-keeper-role-complete.sql
```

This script will:
- Create the permission if it doesn't exist
- Ensure it's assigned to WING_STORE_KEEPER role
- Verify the user has the role
- Verify the permission is visible to the user

### 2. **Session/Token Caching Issue**
The user's session was created before the permission was added, so the old session token is being used.

**Fix:**
- Have the user **log out completely** (clear cookies)
- Close the browser
- Clear browser cache (F12 → Application → Clear Storage)
- Log back in

The backend will call `getUserImsData()` which queries the database for fresh permissions.

### 3. **Frontend Code Verification**

The Store Keeper menu appears when:
- User has the permission `inventory.manage_store_keeper` in their session
- The permission is checked via `usePermission('inventory.manage_store_keeper')`
- The `isWingStoreKeeper` variable is true in AppSidebar.tsx

**Files involved:**
- `src/components/layout/AppSidebar.tsx` - Menu rendering logic
- `src/hooks/usePermission.ts` - Permission checking hook
- `src/services/sessionService.ts` - Session loading
- `src/contexts/SessionContext.tsx` - Session context provider
- `backend-server.cjs` line 879 - `/api/session` endpoint

### 4. **Backend API Check**

The `/api/session` endpoint (line 879 in backend-server.cjs):
1. Checks if user has an active session
2. Calls `getUserImsData(userId)` which:
   - Queries `dbo.fn_GetUserRoles()` for roles
   - Queries `vw_ims_user_permissions` for permissions
   - Queries `dbo.fn_IsSuperAdmin()` for super admin status
3. Returns user data with `ims_permissions` array

## Testing Steps

### Step 1: Verify Database Setup
Run:
```sql
SELECT * FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper'
SELECT * FROM ims_role_permissions rp
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE p.permission_key = 'inventory.manage_store_keeper'
```

### Step 2: Verify User Has Role
```sql
SELECT ur.* FROM ims_user_roles ur
JOIN ims_roles r ON ur.role_id = r.id
WHERE ur.user_id = '3740506012171' AND r.role_name = 'WING_STORE_KEEPER'
```

### Step 3: Verify Permission is Visible
```sql
SELECT * FROM vw_ims_user_permissions 
WHERE user_id = '3740506012171' AND permission_key = 'inventory.manage_store_keeper'
```

### Step 4: Test Backend API
```bash
# Make a request to /api/session and check the response
# Look for: ims_permissions array should contain { permission_key: 'inventory.manage_store_keeper', ... }
```

### Step 5: Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Log out and log back in
4. Look for logs like:
```
👤 AppSidebar - User data received: {
  ims_permissions: [
    { permission_key: 'inventory.manage_store_keeper', ... }
  ]
}
```

## Complete Solution Checklist

- [ ] Run `fix-store-keeper-role-complete.sql` to ensure DB setup
- [ ] Verify permission exists in database
- [ ] Verify user has WING_STORE_KEEPER role in database
- [ ] Have user log out completely
- [ ] Have user clear browser cache
- [ ] Have user log back in
- [ ] Check browser console for permission logs
- [ ] Verify Store Keeper menu appears

## Notes

- The menu will only show if user has the `inventory.manage_store_keeper` permission
- The permission check is in `AppSidebar.tsx` line ~235-240 in the `getVisibleMenuGroups()` function
- If the menu still doesn't appear, check browser console for error messages
- The backend logs when fetching IMS data (look for 🔐 messages in server console)
