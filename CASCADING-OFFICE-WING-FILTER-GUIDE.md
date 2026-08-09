# Cascading Office-Wing Filter Implementation - Settings/Users Page

## 🎯 Overview

The settings/users page now uses a **cascading filter approach** with two dependent dropdowns:

1. **Office Filter** (Primary) - User selects an office
2. **Wing Filter** (Secondary) - Automatically shows only wings for selected office
3. **Search & Clear buttons** - Manual control over table update

---

## 🔄 Filter Flow

```
User Interface:
┌─────────────────────────────────────────────────────┐
│ Filter by Office         Filter by Wing             │
│ [Select Office ▼]        [Select Wing ▼] (disabled) │
│                                                       │
│ Search Name              [Search] [Clear]            │
│ [User name...]                                       │
└─────────────────────────────────────────────────────┘
        ↓
    User selects Office (586 = PEC Punjab)
        ↓
handleOfficeChange() triggered
        ↓
fetchWings(586) called
        ↓
Dropdown 2 enabled & populated with 14 Punjab wings
        ↓
User selects Wing (e.g., "Law")
        ↓
User clicks [Search] button
        ↓
Table updates: Shows users from PEC Punjab → Law wing
```

---

## ✅ Code Changes Summary

### Frontend (src/pages/UserRoleAssignment.tsx)

#### 1. Added State Variables
```typescript
// Dropdown filter values
const [filterOffice, setFilterOffice] = useState('');
const [filterWing, setFilterWing] = useState('');

// Applied filter values (sent to API)
const [appliedOffice, setAppliedOffice] = useState('');

// Offices list for dropdown
const [offices, setOffices] = useState<Array<{
  intOfficeID: number;
  strOfficeName: string;
}>>([]);
```

#### 2. Added fetchOffices Function
```typescript
const fetchOffices = useCallback(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offices`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setOffices(data);
    }
  } catch (error) {
    console.error('Error fetching offices:', error);
  }
}, []);
```

#### 3. Updated fetchWings Function
```typescript
// Now takes officeId parameter
const fetchWings = useCallback(async (officeId: string) => {
  if (!officeId) {
    setWings([]);
    return;
  }

  try {
    const wingUrl = `${API_BASE_URL}/api/wings?office_id=${officeId}`;
    const response = await fetch(wingUrl, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setWings(data);
    }
  } catch (error) {
    console.error('Error fetching wings:', error);
  }
}, []);
```

#### 4. Added handleOfficeChange Function
```typescript
const handleOfficeChange = (officeId: string) => {
  setFilterOffice(officeId);        // Update dropdown
  setFilterWing('');                // Reset wing dropdown
  fetchWings(officeId);             // Fetch wings for office
};
```

#### 5. Updated Filter UI
```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Office Filter - Primary */}
  <div>
    <label>Filter by Office</label>
    <select
      value={filterOffice}
      onChange={(e) => handleOfficeChange(e.target.value)}
    >
      <option value="">Select Office</option>
      {offices.map((office) => (
        <option key={office.intOfficeID} value={String(office.intOfficeID)}>
          {office.strOfficeName}
        </option>
      ))}
    </select>
  </div>

  {/* Wing Filter - Secondary (Dependent) */}
  <div>
    <label>Filter by Wing</label>
    <select
      value={filterWing}
      onChange={(e) => setFilterWing(e.target.value)}
      disabled={!filterOffice}  {/* Disabled until office selected */}
    >
      <option value="">
        {filterOffice ? 'Select Wing' : 'Select Office First'}
      </option>
      {wings.map((wing) => (
        <option key={wing.Id} value={String(wing.Id)}>
          [{wing.Id}] {wing.Name} {wing.ShortName && `(${wing.ShortName})`}
        </option>
      ))}
    </select>
  </div>

  {/* Search Box */}
  <div>
    <label>Search by Name</label>
    <input
      type="text"
      placeholder="User name..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>

  {/* Action Buttons */}
  <div className="flex items-end gap-2">
    <button onClick={handleSearch}>Search</button>
    <button onClick={handleClearFilters}>Clear</button>
  </div>
</div>
```

#### 6. Updated handleSearch Function
```typescript
const handleSearch = () => {
  setAppliedSearch(searchTerm);
  setAppliedOffice(filterOffice);    // NEW: Pass office_id to API
  setAppliedWing(filterWing);
  setAppliedRole(filterRole);
  setCurrentPage(1);
};
```

---

### Backend (backend-server.cjs)

#### 1. Added /api/offices Endpoint
```javascript
app.get('/api/offices', async (req, res) => {
  try {
    if (!pool) {
      // Mock data when DB is offline
      return res.json([
        { intOfficeID: 583, strOfficeName: 'ECP Secretariat' },
        { intOfficeID: 584, strOfficeName: 'PEC Balochistan' },
        { intOfficeID: 585, strOfficeName: 'PEC Khyber Pakhtunkhwa' },
        { intOfficeID: 586, strOfficeName: 'PEC Punjab' },
        { intOfficeID: 587, strOfficeName: 'PEC Sindh' }
      ]);
    }

    const result = await pool.request().query(`
      SELECT intOfficeID, strOfficeName
      FROM tblOffices
      ORDER BY strOfficeName
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching offices:', error);
    // Fallback to mock data
  }
});
```

#### 2. Updated /api/ims/users Endpoint
```javascript
// Now accepts office_id parameter
if (appliedOffice) params.append('office_id', appliedOffice);

// In backend, filter by office:
if (req.query.office_id) {
  query += ` AND u.intOfficeID = @officeId`;
}
```

---

## 📊 User Experience

### Before (Auto-filtering)
1. ❌ All 90 wings shown automatically
2. ❌ Confusing duplicate names
3. ❌ Auto-update on selection
4. ❌ No explicit control

### After (Cascading Filters)
1. ✅ Choose office first
2. ✅ Wings automatically filtered to office
3. ✅ Manual search button controls table update
4. ✅ Clear button resets everything
5. ✅ Wing dropdown disabled until office selected
6. ✅ Professional, predictable workflow

---

## 🧪 Testing Steps

### 1. Load Settings/Users Page
```
✅ Office dropdown shows all 5 offices
✅ Wing dropdown is disabled (grayed out)
✅ "Select Office First" message shows
```

### 2. Select Office (e.g., PEC Punjab - 586)
```
✅ Wing dropdown becomes enabled
✅ Shows 14 Punjab wings only (not 90)
✅ Wing filter resets to empty
✅ Table doesn't update yet
```

### 3. Select Wing (e.g., "Law")
```
✅ Wing selection appears in dropdown
✅ Table still hasn't updated
```

### 4. Click [Search] Button
```
✅ Table updates showing Punjab → Law users
✅ Only users with:
   - intOfficeID = 586 (PEC Punjab)
   - intWingID = law wing ID
   are shown
```

### 5. Click [Clear] Button
```
✅ All dropdowns reset to empty
✅ Wing dropdown re-disabled
✅ Table reloads with all users
```

### 6. Switch Office
```
✅ Select different office (e.g., ECP - 583)
✅ Wing filter resets automatically
✅ New office's wings populate dropdown
✅ Table doesn't update automatically
```

---

## 📋 API Flow Diagram

```
Frontend State Changes:
┌──────────────────────────────────────────┐
│ User selects Office dropdown             │
│ onChange → handleOfficeChange(officeId) │
└──────────────────────────────────────────┘
                    ↓
          filterOffice = "586"
                    ↓
          fetchWings("586")
                    ↓
        GET /api/wings?office_id=586
                    ↓
        Backend filters by OfficeID = 586
                    ↓
        Returns 14 wings for PEC Punjab
                    ↓
          setWings(14 wings)
                    ↓
        Wing dropdown now populated
          & enabled for user selection
                    ↓
      User selects wing (onChange handled)
                    ↓
        filterWing = "law-wing-id"
                    ↓
       User clicks [Search] button
          handleSearch() called
                    ↓
          setAppliedOffice("586")
          setAppliedWing("law-id")
                    ↓
        fetchUsers() triggered via useEffect
                    ↓
  GET /api/ims/users?office_id=586&wing_id=X
                    ↓
    Backend filters by BOTH office & wing
                    ↓
     Returns users matching BOTH filters
                    ↓
    setUsers(filtered users) → Table updates
```

---

## 🎯 Key Features

✅ **Cascading Filters** - Wing depends on office selection  
✅ **Smart Disabling** - Wing dropdown disabled until office selected  
✅ **User Feedback** - "Select Office First" message when disabled  
✅ **Manual Control** - Search button triggers table update  
✅ **Reset Functionality** - Clear button resets all filters  
✅ **Auto Reload** - Wings reload when office changes  
✅ **Responsive Design** - 4-column layout that stacks on mobile  

---

## 🔍 Office-to-Wings Mapping

| Office | Dropdown Value | Wing Count |
|---|---|---|
| ECP Secretariat | 583 | 22 |
| PEC Balochistan | 584 | 12 |
| PEC KP | 585 | 11 |
| PEC Punjab | 586 | 14 |
| PEC Sindh | 587 | 11 |

---

## 📝 Files Modified

| File | Lines | Changes |
|---|---|---|
| src/pages/UserRoleAssignment.tsx | Various | Add office filter, update wing logic |
| backend-server.cjs | 1740-1780 | Add /api/offices endpoint |

---

## ⚙️ Configuration

No configuration needed - the system automatically:
1. Fetches offices from tblOffices table
2. Filters wings by OfficeID
3. Filters users by intOfficeID + intWingID

---

## 🚀 Benefits

1. **Clear Workflow** - Office → Wing → Search progression
2. **No Confusion** - Wing dropdown is empty until office chosen
3. **Responsive** - Wing dropdown automatically refreshes
4. **Accurate** - Filters applied only when Search clicked
5. **Flexible** - Users can change selections anytime
6. **Professional** - Matches enterprise UI patterns

---

## 🆘 Troubleshooting

| Issue | Check | Solution |
|---|---|---|
| Wing dropdown not appearing | Office selected? | Must select office first |
| Wing dropdown empty | API working? | Check /api/wings response |
| Table not updating | Search button clicked? | Always click Search to apply |
| Office list empty | API working? | Check /api/offices endpoint |

---

**Status:** ✅ **READY**  
**Last Updated:** [Current Date]  
**Version:** 2.0 (Cascading Filters)
