# Quick Test Checklist - Wing Filter & Designation Fix

## ✅ Implementation Completed

### Backend Changes
- ✅ Enhanced `/api/ims/users` endpoint with designation fields
- ✅ Added LEFT JOIN with tblUserDesignations table
- ✅ Included intDesignationID and designation_name in query

### Frontend Changes
- ✅ Updated User interface to include designation_id and designation_name
- ✅ Updated table display to show designation names
- ✅ Updated table header to show "Office / Wing / Designation"

## 🧪 Test Instructions

### Step 1: Verify Database Data
```sql
-- Run this script to verify data integrity
sqlcmd -S <YOUR_SERVER> -d InventoryManagementDB -i verify-wing-designation-mapping.sql

-- Expected Results:
-- - WingsInformation should list active wings
-- - Users should show with correct wing assignments
-- - Users should show with designation names
```

### Step 2: Restart Backend Server
```bash
# Stop current server (Ctrl+C if running in terminal)
# Then restart
node backend-server.cjs
# or
nodemon backend-server.cjs
```

### Step 3: Test Wing Filter in Browser
1. Open http://localhost:8080/settings/users
2. Look for "Filter by Wing" dropdown
3. Click dropdown and verify:
   - ✅ All active wings are listed
   - ✅ Wing names are correct (from WingsInformation table)
   - ✅ Wing IDs match the database

### Step 4: Filter by Wing
1. Select a wing from dropdown
2. Click "Search" button
3. Verify users are filtered:
   - ✅ Only users from selected wing appear
   - ✅ User wing assignments match selected wing
   - ✅ Designation names are displayed

### Step 5: Check User Display
In the users table, verify each user shows:
- ✅ **Full Name** (from AspNetUsers.FullName)
- ✅ **CNIC** (from AspNetUsers.CNIC)
- ✅ **Email** (from AspNetUsers.Email)
- ✅ **Office Name** (from tblOffices.strOfficeName)
- ✅ **Wing Name** (from WingsInformation.Name)
- ✅ **Designation Name** (from tblUserDesignations.designation_name)

### Step 6: Test API Directly (Browser DevTools)

Open browser console and run:

```javascript
// Test /api/wings endpoint
fetch('http://localhost:3001/api/wings', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Wings:', data);
  console.log('Total wings:', data.length);
});

// Test /api/ims/users with wing filter
fetch('http://localhost:3001/api/ims/users?wing_id=2', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Filtered Users:', data);
  console.log('Sample user:', data[0]);
});
```

Expected user object should include:
```javascript
{
  user_id: "...",
  full_name: "...",
  email: "...",
  cnic: "...",
  office_id: 1,
  wing_id: 2,
  designation_id: 45,           // ← NEW
  office_name: "Headquarters",
  wing_name: "Finance Wing",
  designation_name: "Supervisor", // ← NEW
  is_super_admin: false,
  roles: [...]
}
```

## 🔍 Troubleshooting

### Wing Dropdown Empty
**Symptom:** Wing filter dropdown shows no options
**Solution:**
1. Verify WingsInformation table has active records: `SELECT * FROM WingsInformation WHERE IS_ACT = 1`
2. Check browser console for /api/wings errors
3. Restart backend server

### Designation Shows "Not Assigned"
**Symptom:** All users show "Not Assigned" for designation
**Solution:**
1. Verify users have intDesignationID set: `SELECT * FROM AspNetUsers WHERE intDesignationID IS NULL`
2. Check tblUserDesignations has entries: `SELECT * FROM tblUserDesignations`
3. Verify join relationship is correct

### Wing Filter Not Filtering Users
**Symptom:** Selecting wing and clicking Search doesn't filter users
**Solution:**
1. Check user wing assignments: `SELECT FullName, intWingID FROM AspNetUsers WHERE ISACT = 1`
2. Verify wing IDs in dropdown match intWingID values
3. Check browser console for API errors
4. Clear browser cache (Ctrl+Shift+Delete)

### Browser Cache Issues
**Solution:**
1. Open DevTools (F12)
2. Right-click reload button → "Empty cache and hard refresh"
3. Or: Ctrl+Shift+Delete → Clear all cached data

## 📊 Expected Test Results

| Component | Expected Behavior | Status |
|-----------|-------------------|--------|
| Wing Dropdown | Shows all active wings | ⭕ |
| Filter by Wing | Filters users by selected wing | ⭕ |
| Designation Display | Shows user's designation name | ⭕ |
| API Response | Includes designation_name field | ⭕ |
| Data Matching | Wing IDs and names match correctly | ⭕ |

## 🎯 Success Criteria

✅ All tests pass
✅ Wing dropdown populated correctly
✅ Wing filtering works as expected
✅ Designation information displays
✅ No console errors
✅ All user data matches database

## 📝 Sign-off

After completing all tests:
- [ ] Database data verified
- [ ] Backend restart successful
- [ ] Wing filter dropdown works
- [ ] Wing filtering works correctly
- [ ] Designation names display
- [ ] API responses include new fields
- [ ] No errors in browser console
- [ ] All users show correct data

**Status:** Ready for QA Testing ✅
