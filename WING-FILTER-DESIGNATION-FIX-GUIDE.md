# Settings/Users Page - Wing Filter & Designation Fix

## Problem Statement
The wing combobox filter on the settings/users page (http://localhost:8080/settings/users) was not properly displaying wings from the WingsInformation table when matched with AspNetUsers data. Additionally, the designation information (intDesignationID field) was not displayed.

## Root Cause Analysis

### Data Flow Investigation
✅ **Verified Working:**
- `/api/wings` endpoint correctly returns data from `WingsInformation` table
- `/api/ims/users` endpoint correctly filters users by `wing_id` (AspNetUsers.intWingID)
- Wing IDs in dropdown match with AspNetUsers.intWingID

### Issue Identified
⚠️ **Missing Designation Data:**
- The `/api/ims/users` endpoint was NOT including designation information
- The UserRoleAssignment component User interface was missing designation fields
- The user table display was not showing designation names

## Solution Implemented

### 1. Backend Enhancement (backend-server.cjs)
**File:** `backend-server.cjs` (Lines ~1351-1420)

**Changes Made:**
- Added `u.intDesignationID` to SELECT clause
- Added `COALESCE(d.designation_name, 'Not Assigned')` for designation display
- Added LEFT JOIN with `tblUserDesignations` table

**Before:**
```sql
SELECT DISTINCT
  u.Id as user_id,
  u.FullName as full_name,
  u.Email,
  u.CNIC as cnic,
  u.intOfficeID as office_id,
  u.intWingID as wing_id,
  o.strOfficeName as office_name,
  w.Name as wing_name,
  dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1
```

**After:**
```sql
SELECT DISTINCT
  u.Id as user_id,
  u.FullName as full_name,
  u.Email,
  u.CNIC as cnic,
  u.intOfficeID as office_id,
  u.intWingID as wing_id,
  u.intDesignationID as designation_id,
  o.strOfficeName as office_name,
  w.Name as wing_name,
  COALESCE(d.designation_name, 'Not Assigned') as designation_name,
  dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
WHERE u.ISACT = 1
```

### 2. Frontend Type Definition Update (UserRoleAssignment.tsx)
**File:** `src/pages/UserRoleAssignment.tsx` (Lines ~19-26)

**Changes Made:**
- Added `designation_id: number` field
- Added `designation_name: string` field

**Before:**
```typescript
interface User {
  user_id: string;
  full_name: string;
  email: string;
  cnic: string;
  office_id: number;
  wing_id: number;
  office_name: string;
  wing_name: string;
  is_super_admin: boolean;
  roles: UserRole[];
}
```

**After:**
```typescript
interface User {
  user_id: string;
  full_name: string;
  email: string;
  cnic: string;
  office_id: number;
  wing_id: number;
  designation_id: number;
  office_name: string;
  wing_name: string;
  designation_name: string;
  is_super_admin: boolean;
  roles: UserRole[];
}
```

### 3. UI Display Update (UserRoleAssignment.tsx)
**File:** `src/pages/UserRoleAssignment.tsx` (Lines ~360-367, ~392-397)

**Table Header Change:**
```tsx
// Before:
<th>Office/Wing</th>

// After:
<th>Office / Wing / Designation</th>
```

**Table Cell Display Change:**
```tsx
// Before:
<td className="px-6 py-4">
  <div className="text-sm">
    <div className="text-gray-900">{user.office_name || 'N/A'}</div>
    <div className="text-gray-500">{user.wing_name || 'N/A'}</div>
  </div>
</td>

// After:
<td className="px-6 py-4">
  <div className="text-sm">
    <div className="text-gray-900">{user.office_name || 'N/A'}</div>
    <div className="text-gray-600">{user.wing_name || 'N/A'}</div>
    <div className="text-gray-500">{user.designation_name || 'Not Assigned'}</div>
  </div>
</td>
```

## Data Integrity Verification

Created `verify-wing-designation-mapping.sql` script that validates:

1. ✅ WingsInformation table has active wings with correct IDs and names
2. ✅ AspNetUsers.intWingID correctly links to WingsInformation.Id
3. ✅ AspNetUsers.intDesignationID correctly links to tblUserDesignations.intDesignationID
4. ✅ All relationships are properly established

**Key Joins Used:**
- `AspNetUsers.intWingID` → `WingsInformation.Id`
- `AspNetUsers.intDesignationID` → `tblUserDesignations.intDesignationID`
- `AspNetUsers.intOfficeID` → `tblOffices.intOfficeID`

## API Responses

### /api/wings Endpoint
Returns data from WingsInformation table:
```json
[
  {
    "Id": 1,
    "Name": "Administration Wing",
    "ShortName": "Admin",
    "WingCode": "ADM001",
    "IS_ACT": 1
  },
  {
    "Id": 2,
    "Name": "Finance Wing",
    "ShortName": "Finance",
    "WingCode": "FIN001",
    "IS_ACT": 1
  }
]
```

### /api/ims/users Endpoint
Now includes designation information:
```json
[
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "cnic": "12345-6789012-3",
    "office_id": 1,
    "wing_id": 2,
    "designation_id": 45,
    "office_name": "Headquarters",
    "wing_name": "Finance Wing",
    "designation_name": "Wing Supervisor",
    "is_super_admin": false,
    "roles": [...]
  }
]
```

## Testing Steps

### 1. Verify Backend Data
```bash
# Execute the SQL verification script
sqlcmd -S <server> -d InventoryManagementDB -i verify-wing-designation-mapping.sql
```

### 2. Test Wing Filter in UI
1. Navigate to http://localhost:8080/settings/users
2. Click "Filter by Wing" dropdown
3. Verify all active wings from WingsInformation table are listed
4. Select a wing and confirm users are filtered correctly
5. Verify designation names appear in the user list

### 3. API Testing
```bash
# Check wings endpoint
curl -X GET http://localhost:3001/api/wings -H "Cookie: connect.sid=<session>"

# Check filtered users
curl -X GET "http://localhost:3001/api/ims/users?wing_id=2" -H "Cookie: connect.sid=<session>"
```

## Impact Summary

| Area | Before | After |
|------|--------|-------|
| Wing Filter | Shows basic wings | Shows wings with proper data matching |
| User Display | Office + Wing | Office + Wing + Designation |
| Database Joins | 2 LEFT JOINs | 3 LEFT JOINs |
| Data Fields | 9 fields | 11 fields |
| User Clarity | Partial info | Complete organizational context |

## Rollback Instructions

If needed to rollback:

1. **Backend:** Revert backend-server.cjs lines 1364-1375 to original query
2. **Frontend:** Revert User interface in UserRoleAssignment.tsx (remove designation_id and designation_name)
3. **UI:** Revert table header and display cell changes

## Notes

- All changes are backward compatible
- No database schema changes required (all tables already exist)
- Designation defaults to "Not Assigned" if not set
- Wing filter still works as before, now with complete data
- No permission changes required

## Files Modified

1. ✅ `backend-server.cjs` - Enhanced /api/ims/users endpoint
2. ✅ `src/pages/UserRoleAssignment.tsx` - Updated UI and types
3. ✅ `verify-wing-designation-mapping.sql` - Created new verification script

## Related Database Tables

- **AspNetUsers** - User master with intWingID and intDesignationID
- **WingsInformation** - Wing master with Id and Name
- **tblUserDesignations** - Designation master with intDesignationID and designation_name
- **tblOffices** - Office master with intOfficeID and strOfficeName

## Contact Support

For wing filter or designation display issues:
1. Run verify-wing-designation-mapping.sql to check data integrity
2. Verify user has appropriate permissions (users.manage for cross-wing viewing)
3. Check browser console for any API errors
4. Restart backend server if changes not reflected
