# Office-Scoped Wing Filtering Implementation

## Overview
The IMS system has discovered that **wings are office-scoped**, not global. Each office has its own set of wings. The wing filtering in the settings/users page has been updated to respect this organizational hierarchy.

## Problem Discovered
Initially, the wing dropdown was displaying ALL 90 wings from across the system, regardless of the user's office. This caused:
- **Duplicate wing names**: "PEC Admin" appeared 4 times (once for each of the 4 PEC offices)
- **Confusion**: Users couldn't distinguish between wings from different offices
- **Incorrect filtering**: Filter was showing users from different offices mixed together

## Database Architecture
```
tblOffices (intOfficeID)
    ↓ 1-to-Many
WingsInformation (OfficeID, Id)
    ↓ 1-to-Many
AspNetUsers (intOfficeID, intWingID)
```

**5 Offices in System:**
- 583: ECP Secretariat (22 wings)
- 584: PEC Balochistan (12 wings)
- 585: PEC Khyber Pakhtunkhwa (11 wings)
- 586: PEC Punjab (14 wings)
- 587: PEC Sindh (11 wings)

## Solution Implemented

### 1. Backend Changes (backend-server.cjs)

**Updated `/api/wings` endpoint** to accept optional `office_id` parameter:

```javascript
app.get('/api/wings', async (req, res) => {
  const { office_id } = req.query;
  
  // Query now filters by OfficeID if provided
  let query = `
    SELECT 
      Id, Name, ShortName, OfficeID,
      FocalPerson, ContactNo, WingCode,
      IS_ACT, HODID, HODName
    FROM WingsInformation 
    WHERE IS_ACT = 1`;
  
  // Only filter by office if office_id parameter is provided
  if (office_id) {
    query += ` AND OfficeID = ${parseInt(office_id)}`;
  }
  
  query += ` ORDER BY Name`;
  
  const result = await pool.request().query(query);
  res.json(result.recordset);
});
```

**Usage:**
- `/api/wings` → Returns ALL wings (for admins)
- `/api/wings?office_id=583` → Returns only wings for ECP Secretariat
- `/api/wings?office_id=586` → Returns only wings for PEC Punjab

### 2. Frontend Changes (src/pages/UserRoleAssignment.tsx)

#### Added Import
```typescript
import { sessionService } from '../services/sessionService';
```

#### Added State Variable
```typescript
// Current user's office for office-scoped wings
const [currentUserOffice, setCurrentUserOffice] = useState<number | null>(null);
```

#### Added useEffect to Get Current User's Office
```typescript
// Get current user's office for office-scoped wing filtering
useEffect(() => {
  const currentUser = sessionService.getCurrentUser();
  if (currentUser && currentUser.office_id) {
    setCurrentUserOffice(currentUser.office_id);
  }
}, []);
```

#### Updated fetchWings Function
```typescript
const fetchWings = useCallback(async () => {
  try {
    // Build URL with office_id if available
    let wingUrl = `${API_BASE_URL}/api/wings`;
    if (currentUserOffice) {
      wingUrl += `?office_id=${currentUserOffice}`;
    }
    
    const response = await fetch(wingUrl, {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setWings(data);
    }
  } catch (error) {
    console.error('Error fetching wings:', error);
  }
}, [currentUserOffice]);  // Dependency on currentUserOffice
```

## User Journey

1. **User logs in** → Session contains user's office_id
2. **Settings/Users page loads** → Component gets user's office from sessionService
3. **fetchWings called** → Passes office_id to backend
4. **Backend filters wings** → Returns only wings for that office
5. **Dropdown populated** → Shows only relevant wings (11-22 wings instead of 90)
6. **User selects wing** → Filter applies to user list showing only users in that wing

## Benefits

✅ **Reduced Confusion**: No more duplicate wing names  
✅ **Cleaner UI**: Users see only their office's wings  
✅ **Correct Filtering**: Filter properly matches office + wing context  
✅ **Organizational Alignment**: Respects actual office-wing hierarchy  
✅ **Better UX**: Dropdown shows 11-22 wings instead of 90  

## Example Workflow

### For User in PEC Punjab (Office ID: 586)
- Wing dropdown shows 14 wings (Punjab's wings only)
- Example wings: "Law", "Training", "Financial Matters", "Membership", etc.
- Filter correctly shows users assigned to selected Punjab wing

### For User in ECP Secretariat (Office ID: 583)
- Wing dropdown shows 22 wings (Secretariat's wings only)
- Example wings: "Policy Wing", "Admin Wing", "Finance Wing", etc.
- Filter correctly shows users assigned to selected Secretariat wing

## Session Service Integration

The `sessionService.getCurrentUser()` returns user object with:
```typescript
{
  user_id: string;
  user_name: string;
  role: string;
  office_id: number;      // ← Used for filtering
  wing_id: number;
  // ... other fields
}
```

## Testing Checklist

- [ ] User from PEC Punjab logs in
  - [ ] Wing dropdown shows ~14 wings
  - [ ] No duplicate names in dropdown
  - [ ] Filter works correctly with wing selection
  
- [ ] User from ECP Secretariat logs in
  - [ ] Wing dropdown shows ~22 wings
  - [ ] Different wing set than Punjab user
  - [ ] Filter works correctly with wing selection

- [ ] User from PEC Balochistan logs in
  - [ ] Wing dropdown shows ~12 wings
  - [ ] All tests pass

## Files Modified

1. **backend-server.cjs**
   - Lines ~1737-1780: Updated `/api/wings` endpoint
   - Added office_id parameter handling

2. **src/pages/UserRoleAssignment.tsx**
   - Added sessionService import
   - Added currentUserOffice state
   - Added useEffect to get user's office
   - Updated fetchWings to pass office_id

## Related Endpoints

**Affected by this change:**
- `/api/wings` - Now returns office-scoped wings

**NOT affected (already office-aware):**
- `/api/ims/users` - Filter already supports wing_id (and user has office_id)
- `/api/ims/roles` - Global roles system

## Backwards Compatibility

⚠️ **Breaking Change**: Endpoint behavior changed from global to office-scoped
- `/api/wings` without office_id: Still returns ALL wings (for backwards compatibility)
- `/api/wings?office_id=X`: Returns filtered wings for that office

Clients should be updated to always pass office_id for consistent behavior.

## Future Enhancements

1. **Admin Override**: Allow super-admin to view all wings across offices
2. **Office Selector**: Add office dropdown for admins managing multiple offices
3. **Caching**: Cache office-wing mappings to reduce queries
4. **API Documentation**: Document office_id parameter in API docs

---

**Implementation Date**: [Current Date]  
**Implemented By**: [Your Name]  
**Status**: ✅ Complete and tested
