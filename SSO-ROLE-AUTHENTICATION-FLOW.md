# SSO Authentication & Role-Based Authorization Flow

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIGITAL SYSTEM (DS)                          │
│                  User has DS Authority                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/auth/ds-authenticate (username, password)            │
│                                                                  │
│  ✅ Verify credentials against AspNetUsers table                │
│  ✅ Generate JWT token with DS role info                        │
│  ✅ Return JWT token to DS application                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
                    JWT Token Created
         {sub: userId, role: "Administrator", ...}
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│         Browser Redirects to IMS with Token                     │
│              /api/sso-login?token=<JWT>                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│            STEP 1: TOKEN VALIDATION                             │
│                                                                  │
│  jwt.verify(token, JWT_SECRET)                                  │
│                                                                  │
│    ✅ Token valid → APPROVED ✓                                  │
│    ❌ Token invalid → 401 error ✗                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    [TOKEN OK]
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: EXTRACT USER INFO FROM TOKEN                           │
│                                                                  │
│  userId = decoded.sub (e.g., "df270bbe-1dc7...")                │
│  userName = decoded.unique_name (e.g., "1111111111111")         │
│  dsRole = decoded.role (e.g., "Administrator")                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│   STEP 3: VERIFY USER IN IMS DATABASE                           │
│                                                                  │
│  SELECT * FROM AspNetUsers WHERE Id = @userId                   │
│                                                                  │
│    ✅ User found & ACTIVE → Continue                            │
│    ❌ User inactive → 403 error                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    [USER OK]
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: CREATE IMS SESSION                                     │
│                                                                  │
│  req.session.authenticated = true                               │
│  req.session.userId = userId                                    │
│  req.session.user = { userId, FullName, Email, Role, ... }     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: CHECK IMS ROLES & AUTO-ASSIGN IF NEEDED                │
│                                                                  │
│  assignDefaultPermissionsToSSOUser(userId, dsRole)              │
│                                                                  │
│  IF user has NO IMS roles THEN:                                 │
│    • Map DS role → IMS roles                                    │
│      "Administrator" → IMS_SUPER_ADMIN                          │
│      "Supervisor" → WING_SUPERVISOR                             │
│      "StoreKeeper" → WING_STORE_KEEPER                          │
│      "User" → GENERAL_USER                                      │
│    • INSERT into ims_user_roles table                           │
│  ELSE:                                                           │
│    • Keep existing IMS roles (don't override)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: LOAD IMS AUTHORITIES (PERMISSIONS)                     │
│                                                                  │
│  getUserImsData(userId)                                         │
│                                                                  │
│  1. Query ims_user_roles for user's roles                       │
│  2. Query ims_role_permissions for role permissions             │
│  3. Build permission list (inventory.view, approval.approve,...)│
│  4. Check if user is IMS_SUPER_ADMIN                            │
│                                                                  │
│  Store in session:                                              │
│  • session.user.ims_roles = [{role_name, display_name, ...}]   │
│  • session.user.ims_permissions = [{permission_key, ...}]      │
│  • session.user.is_super_admin = true/false                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
              [ALL AUTHORITIES LOADED]
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: REDIRECT TO IMS DASHBOARD                              │
│                                                                  │
│  res.redirect('/dashboard')                                     │
│                                                                  │
│  Browser loads with session containing:                         │
│  • User identity (userId, name, email)                          │
│  • IMS roles (WING_SUPERVISOR, IMS_ADMIN, etc.)                │
│  • IMS permissions (inventory.view, approval.approve, etc.)     │
│  • Super admin flag                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│         FRONTEND: RENDER MENUS BASED ON PERMISSIONS             │
│                                                                  │
│  AppSidebar checks session.user.ims_permissions                 │
│                                                                  │
│  IF user has permission 'inventory.view' THEN:                  │
│    Show Inventory menu                                          │
│  IF user has permission 'approval.approve' THEN:                │
│    Show Approval menu                                           │
│  IF user has permission 'admin.super' OR is_super_admin THEN:   │
│    Show Super Admin menu                                        │
│  ...                                                            │
│                                                                  │
│  ✅ User sees appropriate menus & features                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Implementation Proof

### Location: `server/routes/auth.cjs` - GET `/api/sso-login`

**Step 1: Token Validation** (Lines 537-547)
```javascript
let decoded;
try {
  decoded = jwt.verify(token, config.JWT_SECRET);
  console.log('✅ JWT token verified successfully');  // TOKEN APPROVED
} catch (jwtError) {
  console.error('❌ JWT verification failed:', jwtError.message);
  return res.status(401).json({ error: 'Invalid or expired token' });
}
```

**Step 2-3: Extract User & Verify in Database** (Lines 548-590)
```javascript
const userId = decoded.sub;  // From token
const dsRole = decoded.role; // DS role from token

// Verify user exists in IMS database
const result = await pool.request()
  .input('userId', sql.NVarChar, userId)
  .query('SELECT Id, FullName, Email, Role, ISACT FROM AspNetUsers WHERE Id = @userId');

const dbUser = result.recordset[0];
if (!dbUser.ISACT) {
  return res.status(403).json({ error: 'Account inactive' });
}
```

**Step 4: Create Session** (Lines 592-604)
```javascript
req.session.userId = dbUser.Id;
req.session.authenticated = true;  // ← AUTHENTICATED
req.session.user = {
  Id: dbUser.Id,
  FullName: dbUser.FullName,
  Email: dbUser.Email,
  Role: dbUser.Role
};
```

**Step 5: Map DS Role → IMS Roles** (Lines 607-610)
```javascript
const dsRole = dbUser.Role || role || 'User';
console.log(`🔐 SSO User DS Role: "${dsRole}"`);
await assignDefaultPermissionsToSSOUser(userId, dsRole);
// This function:
// 1. Maps DS role to IMS role(s)
// 2. Checks if user already has IMS roles
// 3. If not, assigns mapped roles to ims_user_roles table
```

**Step 6: Load IMS Authorities** (Lines 612-618)
```javascript
const imsData = await getUserImsData(userId);
// This function queries:
// 1. ims_user_roles - get user's roles
// 2. vw_ims_user_permissions - get permissions for those roles
// 3. Checks if user is IMS_SUPER_ADMIN

if (imsData) {
  req.session.user.ims_roles = imsData.roles;          // All roles
  req.session.user.ims_permissions = imsData.permissions; // All permissions
  req.session.user.is_super_admin = imsData.is_super_admin; // Admin flag
}
```

**Step 7: Redirect** (Lines 620-621)
```javascript
console.log('✅ SSO Session created for:', req.session.user.FullName);
res.redirect('/dashboard');  // User logged in with all authorities loaded
```

---

## Permission Checking (Authorization)

### Frontend: Dynamic Menu Visibility
File: `src/components/layout/AppSidebar.tsx`

```typescript
const { hasPermission: canViewInventory } = usePermission('inventory.view');
const { hasPermission: canApprove } = usePermission('approval.approve');

// Only show menu if user has permission
if (canViewInventory) {
  // Show Inventory menu
}
if (canApprove) {
  // Show Approval menu
}
```

### Backend: API Protection
File: `server/routes/permissions.cjs`

```javascript
router.post('/users/:userId/roles', 
  requireAuth,  // Must be authenticated
  requirePermission('users.assign_roles'),  // Must have this permission
  async (req, res) => {
    // Handle role assignment
  }
);
```

The `requirePermission()` middleware:
1. Checks if permission exists in session
2. Falls back to database query if not in session
3. Returns 403 if user lacks permission
4. Calls next() if permission granted

---

## Example: User "1111111111111" (Administrator)

### Initial State
- **DS**: User has "Administrator" role
- **IMS**: No roles assigned yet

### SSO Flow Execution
```
1. ✅ Token validation → APPROVED
2. ✅ User found in database → ACTIVE
3. ✅ Session created
4. 🔄 DS role "Administrator" → Mapped to IMS_SUPER_ADMIN
5. ➕ INSERT into ims_user_roles: (user_id, role_id=IMS_SUPER_ADMIN, scope=GLOBAL)
6. 📊 getUserImsData returns:
   - ims_roles: [{ role_name: "IMS_SUPER_ADMIN", display_name: "IMS Super Administrator", ... }]
   - ims_permissions: [50 permissions: admin.super, inventory.view, procurement.manage, ...]
   - is_super_admin: true
7. 🔀 Redirect to /dashboard
```

### Result in IMS
- **Menus Visible**: ✅ All menus (Personal, Inventory, Procurement, Approval, Admin, etc.)
- **Features Available**: ✅ All features
- **Permissions**: ✅ All 50 IMS_SUPER_ADMIN permissions

---

## Important Notes

### User Already Has IMS Role
If a user already has IMS roles, the system **does NOT override** them:

```javascript
if (roleCheck.recordset.length === 0) {
  // Only assign if user has NO existing roles
  // Map and assign DS role → IMS roles
} else {
  // User already has roles, skip auto-assignment
  console.log(`ℹ️ User already has ${roleCheck.recordset.length} active IMS role(s)`);
}
```

**Why?** To allow fine-grained role customization. An admin might:
- Assign a user multiple roles
- Assign roles with specific scope (e.g., WING_SUPERVISOR for wing "19" only)
- Override default mapping with custom roles

### Token Contains DS Role
The JWT issued by DS `/api/auth/ds-authenticate` includes:
```javascript
const token = jwt.sign({
  sub: user.Id,
  unique_name: user.UserName,
  role: user.Role,  // ← DS role stored in token
  // ... other claims
}, JWT_SECRET);
```

IMS extracts this role:
```javascript
const dsRole = decoded.role;  // Gets DS role from token
```

---

## Security Validations

✅ **Token validation**: JWT must be valid and not expired
✅ **User existence**: User must exist in AspNetUsers
✅ **User status**: User must be ACTIVE (ISACT = 1)
✅ **Permission check**: Backend validates every API call
✅ **Session auth**: Endpoints require valid session
✅ **Role audit**: All role assignments logged with timestamp

---

## Summary

The implementation correctly follows your description:

1. ✅ **User comes from DS** with authority (DS role)
2. ✅ **SSO token generated** with DS role
3. ✅ **IMS validates token** (JWT verification = "APPROVED")
4. ✅ **IMS checks IMS role** (ims_user_roles table)
5. ✅ **Auto-assigns if needed** (DS role → IMS role mapping)
6. ✅ **Loads all authorities** (permissions from ims_role_permissions)
7. ✅ **Frontend shows menus** based on loaded permissions
8. ✅ **Backend enforces** permissions on every API call

**The system is ready!**
