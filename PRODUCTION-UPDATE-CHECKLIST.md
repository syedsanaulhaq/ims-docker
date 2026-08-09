# Production Update Checklist for Opening Balance Feature

## Issue
Opening Balance Entry menu item not showing in production after git pull

## Root Cause
The menu item requires `inventory.manage` permission, which may not be assigned to the user.

## Solution Steps

### Step 1: Pull Latest Code on Production Server
```bash
cd /path/to/ims-v1
git checkout stable-nov11-production
git pull origin stable-nov11-production
```

### Step 2: Rebuild Frontend
```bash
# Install any new dependencies
npm install

# Build production frontend
npm run build
```

### Step 3: Restart Backend Server
```bash
# If using PM2
pm2 restart ims-backend

# OR if using standalone
# Kill the existing process and restart
pkill -f "node server/index.cjs"
node server/index.cjs
```

### Step 4: Clear Browser Cache
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or clear browser cache completely

### Step 5: Grant Permission to User (If Needed)

**Check current permissions:**
```sql
-- Replace 'username@example.com' with actual username/email
SELECT 
    u.Id,
    u.UserName,
    u.Email,
    r.role_name,
    p.permission_name,
    p.permission_key
FROM AspNetUsers u
LEFT JOIN user_roles ur ON u.Id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.Email = 'username@example.com'
ORDER BY r.role_name, p.permission_name;
```

**Grant inventory.manage permission:**

Option A - Through Role (Recommended):
```sql
-- Add permission to an existing role (e.g., INVENTORY_MANAGER)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'INVENTORY_MANAGER'
  AND p.permission_key = 'inventory.manage'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp 
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
```

Option B - Direct User Permission:
```sql
-- Grant permission directly to user
DECLARE @UserId NVARCHAR(450);
DECLARE @PermissionId UNIQUEIDENTIFIER;

-- Get user ID
SELECT @UserId = Id FROM AspNetUsers WHERE Email = 'username@example.com';

-- Get permission ID
SELECT @PermissionId = id FROM permissions WHERE permission_key = 'inventory.manage';

-- Grant permission
IF NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = @UserId AND permission_id = @PermissionId
)
BEGIN
    INSERT INTO user_permissions (user_id, permission_id, granted_at)
    VALUES (@UserId, @PermissionId, GETDATE());
    PRINT 'Permission granted successfully';
END
ELSE
BEGIN
    PRINT 'User already has this permission';
END
```

### Step 6: Verify Menu Appears

**Menu Structure:**
```
Inventory Menu
  ├── Inventory Dashboard
  ├── Opening Balance Entry       ← Should appear here
  ├── Stock Quantities
  ├── Stock Alerts
  ├── Pending Verifications
  └── Verification History
```

**Required Permission:** `inventory.manage`

## Troubleshooting

### Menu Still Not Showing?

1. **Check user permissions in browser console:**
   - Open Developer Tools (F12)
   - Check Console for permission logs
   - Look for: "AppSidebar - User data received"

2. **Verify session is valid:**
   - Logout and login again
   - Check if session cookies are being sent

3. **Check backend API:**
   ```bash
   curl -X GET http://localhost:3001/api/session \
     --cookie "connect.sid=your_session_cookie"
   ```

4. **Database verification:**
   ```sql
   -- Check if permission exists
   SELECT * FROM permissions WHERE permission_key = 'inventory.manage';
   
   -- Check if user has permission (either through role or direct)
   SELECT 
       u.UserName,
       'Role-based' as PermissionSource,
       r.role_name,
       p.permission_key
   FROM AspNetUsers u
   JOIN user_roles ur ON u.Id = ur.user_id
   JOIN roles r ON ur.role_id = r.id
   JOIN role_permissions rp ON r.id = rp.role_id
   JOIN permissions p ON rp.permission_id = p.id
   WHERE u.Email = 'username@example.com'
     AND p.permission_key = 'inventory.manage'
   
   UNION ALL
   
   SELECT 
       u.UserName,
       'Direct' as PermissionSource,
       'N/A' as role_name,
       p.permission_key
   FROM AspNetUsers u
   JOIN user_permissions up ON u.Id = up.user_id
   JOIN permissions p ON up.permission_id = p.id
   WHERE u.Email = 'username@example.com'
     AND p.permission_key = 'inventory.manage';
   ```

## Files Changed in This Update

```
Frontend:
- src/components/layout/AppSidebar.tsx (line 217 adds menu item)
- src/pages/OpeningBalanceEntry.tsx (new page)
- src/pages/StockQuantitiesPage.tsx (updated with breakdown)
- src/App.tsx (added route)

Backend:
- server/routes/stockAcquisitions.cjs (new endpoint)

Database:
- PRODUCTION-DEPLOY-milestone1-opening-balance.sql
```

## Success Criteria
✅ Menu item "Opening Balance Entry" appears under "Inventory Menu"
✅ Clicking it navigates to /dashboard/opening-balance-entry
✅ Page loads with tender selection and item entry form
✅ Can submit opening balance entries
✅ Stock Quantities page shows breakdown (Opening Balance + New Acquisitions)

## Need Help?
- Check commit: bc91b13 (latest on stable-nov11-production)
- All changes are in stable-nov11-production branch
- Database script: PRODUCTION-DEPLOY-milestone1-opening-balance.sql
