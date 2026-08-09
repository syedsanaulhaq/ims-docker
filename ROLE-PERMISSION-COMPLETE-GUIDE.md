# IMS Role & Permission System - Complete Guide

## Overview

The IMS (Inventory Management System) implements a robust role-based access control (RBAC) system where:
- **Users** can be assigned multiple **Roles**
- **Roles** have multiple **Permissions**
- **Frontend menus** show/hide based on user permissions
- **Backend APIs** enforce permissions on each endpoint

---

## System Roles

### 1. **IMS_SUPER_ADMIN** (50 permissions)
**Purpose**: Full system access


**Menu Access**:
- ALL menus visible
- Personal Menu
- Inventory Menu
- Procurement Menu
- Issuance Menu
- Approval Menu
- Request History Menu
- Super Admin Menu
- Meta Data Menu

**Capabilities**:
- Manage all users and roles
- Create/modify roles and permissions
- Access all inventory levels
- Approve all requests
- Generate all reports
- Configure system settings

**Permission Keys**:
```
admin.super
roles.manage
users.assign_roles
inventory.view
inventory.manage
procurement.view
procurement.manage
procurement.request
procurement.approve
issuance.request
issuance.process
issuance.view
approval.approve
reports.view
wing.supervisor
categories.manage
items.manage
... (all 50 permissions)
```

---

### 2. **IMS_ADMIN** (43 permissions)
**Purpose**: Administrative access without role management

**Menu Access**:
- Personal Menu
- Inventory Menu (full)
- Procurement Menu (full)
- Issuance Menu
- Approval Menu
- Request History Menu
- Meta Data Menu
- Reports

**Capabilities**:
- Manage inventory system
- Approve high-level requests
- Access all stock levels
- Generate reports
- Cannot create/modify roles (main difference from SUPER_ADMIN)

**Permission Keys**: Similar to SUPER_ADMIN except:
- ❌ `roles.manage`
- ❌ `users.assign_roles`
- ❌ Some advanced admin permissions

---

### 3. **WING_SUPERVISOR** (20 permissions)
**Purpose**: Manage wing-level inventory and approvals

**Menu Access**:
- Personal Menu
- **Wing Menu** (Wing-specific)
  - Wing Dashboard
  - Wing Request History
  - Request Items
  - Wing Inventory
  - Wing Members

**Capabilities**:
- Manage wing-level inventory
- Approve wing requests
- View wing members
- Request items for wing
- Track wing-level stock

**Scope**: Limited to assigned wing(s)

**Permission Keys**:
```
wing.supervisor
wing.manage
inventory.view
issuance.request
issuance.view
approval.approve
procurement.view_own
procurement.request
stock_request.create
stock_request.view_own
stock_request.approve_supervisor
... (20 total)
```

---

### 4. **PROCUREMENT_OFFICER** (10 permissions)
**Purpose**: Manage tenders, acquisitions, vendor relations

**Menu Access**:
- Personal Menu
- **Procurement Menu**:
  - Contract/Tender
  - Annual Tenders
  - Patty Purchase
  - Review Requests
  - Purchase/Supply Orders

**Capabilities**:
- Manage tenders and contracts
- Handle vendor relationships
- Create purchase orders
- Add stock to admin store
- Review procurement requests

**Permission Keys**:
```
procurement.view
procurement.manage
procurement.request
procurement.approve
tender.create
tender.view
tender.manage
acquisition.create
acquisition.view
vendor.manage
```

---

### 5. **CUSTOM_WING_STORE_KEEPER** / **WING_STORE_KEEPER** (9 permissions)
**Purpose**: Manage wing-level store operations

**Menu Access**:
- Personal Menu
- **Store Keeper Menu**:
  - Forwarded Verifications
  - Verification History  
  - Wing Inventory

**Capabilities**:
- Handle inventory verifications
- Manage wing stock
- Process forwarded verification requests
- Track verification history

**Permission Keys**:
```
inventory.manage_store_keeper
inventory.view
issuance.request
issuance.view
stock_request.verify
stock_request.view_own
wing.view_inventory
verification.process
verification.forward
```

---

### 6. **AUDITOR** (9 permissions)
**Purpose**: View-only access for auditing

**Menu Access**:
- Personal Menu (limited)
- Inventory Menu (view-only)
- Reports Menu (view-only)

**Capabilities**:
- View all inventory
- View all transactions
- View all reports
- **Cannot modify anything**

**Permission Keys**:
```
inventory.view
procurement.view
issuance.view
reports.view
stock_request.view
tender.view
acquisition.view
verification.view
approval.view
```

---

### 7. **GENERAL_USER** (8 permissions)
**Purpose**: Basic user access - default role for all users

**Menu Access**:
- **Personal Menu Only**:
  - My Dashboard
  - My Requests
  - My Issued Items
  - Request Item
  - Return Item
  - Stock Requests
  - My Approvals (if applicable)

**Capabilities**:
- Create personal stock requests
- View own inventory
- Track personal request status
- Return items
- View own issued items

**Permission Keys**:
```
issuance.request
issuance.view_own
stock_request.create
stock_request.view_own
procurement.view_own
procurement.request
inventory.view_own
reports.view_own
```

---

## Permission Module Structure

### Module: **Inventory** (7 permissions)
- `inventory.view` - View all inventory
- `inventory.manage` - Manage inventory
- `inventory.view_own` - View personal inventory
- `inventory.manage_store_keeper` - Store keeper access
- `inventory.verify` - Verify inventory requests
- `inventory.adjust` - Adjust stock levels
- `inventory.transfer` - Transfer stock between locations

### Module: **Procurement** (9 permissions)
- `procurement.view` - View all procurement
- `procurement.manage` - Manage procurement
- `procurement.request` - Create procurement requests
- `procurement.approve` - Approve procurement
- `procurement.view_own` - View own requests
- `tender.create` - Create tenders
- `tender.view` - View tenders
- `tender.manage` - Manage tenders
- `vendor.manage` - Manage vendors

### Module: **Stock Request** (8 permissions)
- `stock_request.create` - Create stock requests
- `stock_request.view` - View all stock requests
- `stock_request.view_own` - View own requests
- `stock_request.approve_supervisor` - Approve as supervisor
- `stock_request.approve_admin` - Approve as admin
- `stock_request.verify` - Verify requests
- `stock_request.forward` - Forward requests
- `stock_request.reject` - Reject requests

### Module: **Issuance** (3 permissions)
- `issuance.request` - Request issuance
- `issuance.process` - Process issuance
- `issuance.view` - View issuances

### Module: **Approval** (2 permissions)
- `approval.approve` - Approve requests
- `approval.view` - View approval history

### Module: **Reports** (4 permissions)
- `reports.view` - View all reports
- `reports.view_own` - View own reports
- `reports.generate` - Generate reports
- `reports.export` - Export reports

### Module: **Users** (2 permissions)
- `users.manage` - Manage users
- `users.assign_roles` - Assign roles to users

### Module: **Roles** (1 permission)
- `roles.manage` - Manage roles and permissions

### Module: **Settings** (2 permissions)
- `admin.super` - Super admin access
- `settings.manage` - Manage system settings

### Module: **Wing Management** (1 permission)
- `wing.supervisor` - Wing supervisor access

---

## Frontend Implementation

### Menu Structure by Permission

The frontend `AppSidebar.tsx` dynamically shows/hides menu items based on:

1. **User Session Data**:
   ```typescript
   user.ims_roles          // Array of role objects
   user.ims_permissions    // Array of permission objects
   user.is_super_admin     // Boolean flag
   ```

2. **Permission Hooks**:
   ```typescript
   const { hasPermission } = usePermission('permission.key');
   ```

3. **Menu Filtering**:
   ```typescript
   const visibleItems = menuGroup.items.filter(item => 
     checkPermission(item.permission)
   );
   ```

### Example Menu Configuration

```typescript
const inventoryMenuGroup: MenuGroup = {
  label: "Inventory Menu",
  icon: Package,
  items: [
    { 
      title: "Inventory Dashboard", 
      icon: BarChart3, 
      path: "/dashboard/inventory-dashboard", 
      permission: 'inventory.view' 
    },
    { 
      title: "Stock Quantities", 
      icon: BarChart3, 
      path: "/dashboard/inventory-stock-quantities", 
      permission: 'inventory.view' 
    },
    // ... more items
  ]
};
```

---

## Backend Implementation

### API Endpoint Protection

Each backend route uses middleware to check permissions:

```javascript
// Example from server/routes/permissions.cjs
router.post('/users/:userId/roles', 
  requireAuth,
  requirePermission('users.assign_roles'),
  async (req, res) => {
    // Route handler
  }
);
```

### Permission Check Function

```javascript
const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    const userId = req.session.userId;
    
    // Check if user has permission
    const hasPermission = await checkUserPermission(userId, permissionKey);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};
```

---

## Role Assignment Workflow

### 1. Via UI (Recommended)

**URL**: `http://localhost:8080/settings/users`

**Requirements**:
- User must have `users.assign_roles` permission
- Typically: IMS_SUPER_ADMIN role

**Steps**:
1. Navigate to Settings → User Management
2. Search for user
3. Click "Assign Role" button
4. Select role from dropdown
5. Confirm assignment

### 2. Via SQL (Direct Database)

```sql
-- Assign IMS_SUPER_ADMIN role to user
DECLARE @UserId NVARCHAR(450) = 'user-guid-here';
DECLARE @RoleId UNIQUEIDENTIFIER = (
  SELECT id FROM ims_roles WHERE role_name = 'IMS_SUPER_ADMIN'
);

INSERT INTO ims_user_roles (id, user_id, role_id, scope_type, is_active, assigned_at)
VALUES (NEWID(), @UserId, @RoleId, 'GLOBAL', 1, GETDATE());
```

### 3. Via API

**Endpoint**: `POST /api/permissions/users/:userId/roles`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Cookie": "connect.sid=..."
}
```

**Body**:
```json
{
  "role_id": "F8CC4364-B05B-4B5C-9660-749B92FAEAC1",
  "scope_type": "GLOBAL"
}
```

---

## Permission Troubleshooting

### User Can't See Expected Menus

**Check**:
1. ✅ User has correct role assigned
   ```sql
   SELECT ir.role_name 
   FROM ims_user_roles iur
   JOIN ims_roles ir ON iur.role_id = ir.id
   WHERE iur.user_id = 'user-guid' AND iur.is_active = 1;
   ```

2. ✅ Role has correct permissions
   ```sql
   SELECT ip.permission_key
   FROM ims_role_permissions irp
   JOIN ims_permissions ip ON irp.permission_id = ip.id
   WHERE irp.role_id = 'role-guid';
   ```

3. ✅ Frontend permission check is correct
   - Check `AppSidebar.tsx` `checkPermission()` function
   - Verify permission key matches database

4. ✅ Session is loaded correctly
   - Check browser console for session data
   - Verify `user.ims_permissions` array contains permissions
   - Check `user.is_super_admin` flag

### User Gets "Insufficient Permissions" Error

**Check**:
1. ✅ Backend endpoint has correct permission requirement
2. ✅ User's session has permission in database
3. ✅ `requirePermission()` middleware is using correct key
4. ✅ Permission seeded in `ims_permissions` table

---

## Common Role Scenarios

### Scenario 1: New User Registration
**Default**: Automatically assigned `GENERAL_USER` role

```javascript
// server/routes/auth.cjs - assignDefaultPermissionsToSSOUser()
if (roleCheck.recordset.length === 0) {
  // Assign GENERAL_USER role
  const roleId = 'general-user-role-id';
  await assignRole(userId, roleId);
}
```

### Scenario 2: Wing Supervisor
**Roles**: `WING_SUPERVISOR`

**Menu Access**:
- Personal Menu
- Wing Menu (wing-specific operations)

**Approval Scope**: Can approve requests from their wing only

### Scenario 3: Store Keeper
**Roles**: `WING_STORE_KEEPER` or `CUSTOM_WING_STORE_KEEPER`

**Menu Access**:
- Personal Menu
- Store Keeper Menu (inventory verifications)

**Verification Access**: Receives forwarded verification requests

### Scenario 4: Procurement Officer
**Roles**: `PROCUREMENT_OFFICER`

**Menu Access**:
- Personal Menu
- Procurement Menu (tenders, vendors, purchase orders)

**Capabilities**: Manage procurement workflow, no inventory access

### Scenario 5: Full Admin
**Roles**: `IMS_SUPER_ADMIN`

**Menu Access**: ALL menus

**Capabilities**: Everything including role/user management

---

## Database Schema Reference

### Tables

1. **ims_roles**
   - `id` (UNIQUEIDENTIFIER, PK)
   - `role_name` (NVARCHAR, unique)
   - `display_name` (NVARCHAR)
   - `description` (NVARCHAR)
   - `is_active` (BIT)
   - `scope_type` (NVARCHAR) - 'GLOBAL', 'WING', 'OFFICE'

2. **ims_permissions**
   - `id` (UNIQUEIDENTIFIER, PK)
   - `permission_key` (NVARCHAR, unique)
   - `module_name` (NVARCHAR)
   - `action_name` (NVARCHAR)
   - `description` (NVARCHAR)

3. **ims_user_roles**
   - `id` (UNIQUEIDENTIFIER, PK)
   - `user_id` (NVARCHAR, FK → AspNetUsers)
   - `role_id` (UNIQUEIDENTIFIER, FK → ims_roles)
   - `scope_type` (NVARCHAR)
   - `scope_id` (NVARCHAR) - office_id or wing_id
   - `is_active` (BIT)
   - `assigned_at` (DATETIME2)

4. **ims_role_permissions**
   - `id` (UNIQUEIDENTIFIER, PK)
   - `role_id` (UNIQUEIDENTIFIER, FK → ims_roles)
   - `permission_id` (UNIQUEIDENTIFIER, FK → ims_permissions)

### View: vw_ims_user_permissions

```sql
CREATE VIEW vw_ims_user_permissions AS
SELECT 
  iur.user_id,
  ip.permission_key,
  ip.module_name,
  ip.action_name,
  iur.scope_type,
  iur.scope_id
FROM ims_user_roles iur
JOIN ims_role_permissions irp ON iur.role_id = irp.role_id
JOIN ims_permissions ip ON irp.permission_id = ip.id
WHERE iur.is_active = 1;
```

---

## Testing & Validation

### Test Plan

1. **Test Role Assignment**
   ```sql
   -- Check user has role
   SELECT * FROM ims_user_roles WHERE user_id = 'test-user-guid';
   ```

2. **Test Permission Loading**
   ```sql
   -- Check user permissions via view
   SELECT * FROM vw_ims_user_permissions WHERE user_id = 'test-user-guid';
   ```

3. **Test Frontend Menu Display**
   - Login as user
   - Check browser console for session data
   - Verify menu items match expected permissions

4. **Test API Access**
   ```bash
   # Test protected endpoint
   curl -X GET http://localhost:3001/api/permissions/check \
     -H "Cookie: connect.sid=..." \
     -H "Content-Type: application/json"
   ```

---

## Best Practices

### 1. Always Use Permission Keys, Not Role Names

❌ **Bad**:
```typescript
if (user.ims_roles.includes('IMS_SUPER_ADMIN')) {
  // Show menu
}
```

✅ **Good**:
```typescript
const { hasPermission } = usePermission('admin.super');
if (hasPermission) {
  // Show menu
}
```

### 2. Keep Permission Keys Consistent

- Format: `module.action`
- Examples: `inventory.view`, `procurement.manage`, `users.assign_roles`

### 3. Use Scope for Hierarchical Access

```sql
INSERT INTO ims_user_roles (user_id, role_id, scope_type, scope_id)
VALUES ('user-guid', 'supervisor-role', 'WING', '19');
-- User can only act within wing 19
```

### 4. Audit Role Changes

Log all role assignments/revocations:
```sql
CREATE TABLE ims_role_audit (
  id UNIQUEIDENTIFIER DEFAULT NEWID(),
  user_id NVARCHAR(450),
  role_id UNIQUEIDENTIFIER,
  action NVARCHAR(50), -- 'ASSIGNED', 'REVOKED'
  changed_by NVARCHAR(450),
  changed_at DATETIME2 DEFAULT GETDATE()
);
```

---

## Quick Reference Commands

### Check User Roles
```sql
SELECT 
  u.UserName,
  u.FullName,
  r.role_name,
  r.display_name,
  ur.assigned_at
FROM AspNetUsers u
JOIN ims_user_roles ur ON u.Id = ur.user_id
JOIN ims_roles r ON ur.role_id = r.id
WHERE u.Id = 'user-guid' AND ur.is_active = 1;
```

### Check Role Permissions
```sql
SELECT 
  r.role_name,
  p.permission_key,
  p.module_name,
  p.action_name
FROM ims_roles r
JOIN ims_role_permissions rp ON r.id = rp.role_id
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE r.role_name = 'IMS_SUPER_ADMIN';
```

### List All Users with No Roles
```sql
SELECT u.Id, u.UserName, u.FullName, u.Email
FROM AspNetUsers u
LEFT JOIN ims_user_roles ur ON u.Id = ur.user_id
WHERE ur.id IS NULL AND u.ISACT = 1;
```

### Bulk Assign GENERAL_USER to All Active Users
```sql
INSERT INTO ims_user_roles (id, user_id, role_id, scope_type, is_active, assigned_at)
SELECT 
  NEWID(),
  u.Id,
  (SELECT id FROM ims_roles WHERE role_name = 'GENERAL_USER'),
  'GLOBAL',
  1,
  GETDATE()
FROM AspNetUsers u
LEFT JOIN ims_user_roles ur ON u.Id = ur.user_id
WHERE u.ISACT = 1 AND ur.id IS NULL;
```

---

## Summary

The IMS Role & Permission system provides:
- ✅ **7 predefined roles** covering all use cases
- ✅ **50+ permissions** across 16 modules
- ✅ **Frontend menu filtering** based on permissions
- ✅ **Backend API protection** with middleware
- ✅ **Hierarchical scoping** (GLOBAL, WING, OFFICE)
- ✅ **Multiple role support** per user
- ✅ **Dynamic permission checking** via hooks
- ✅ **Audit trail** for role changes

**The system ensures that users only see menus and access features they have permission for, maintaining security and usability.**

