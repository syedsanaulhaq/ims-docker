# Settings/Users Filter - Visual Guide

## 🎨 UI Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ User Role Assignment                                                │
│ Manage user roles and permissions                                   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Filter by Office    Filter by Wing     Search by Name    [  ][  ] │
│  [Select Office ▼]   [Disabled ▼]       [User name...]   [S][C]   │
│                                                                     │
│  └─ Office ID         └─ Wing ID (-)     └─ Name search    └─┬─┬──┘
│  └─ Auto-triggered    └─ Disabled until  └─ Manual entry    │ │
│     wing load           office chosen    └─ Optional        │ │
│                                                              │ │
│                                                        Search| │Clear
│                                                        Button | Button
│
└────────────────────────────────────────────────────────────────────┘
```

## 🔄 User Interaction Flow

### Step 1: Initial Page Load
```
Wing dropdown:  [Select Office First ▼] (DISABLED/GRAY)
                 └─ "Select Office First" placeholder
```

### Step 2: User Selects Office
```
Office dropdown:  [PEC Punjab (586) ▼]
                         │
                         ↓ onChange triggered
                         ↓ handleOfficeChange(586)
                         ↓ fetchWings(586)
                         ↓ GET /api/wings?office_id=586
                         │
Wing dropdown:  [Select Wing ▼] (NOW ENABLED!)
                 ├─ Law
                 ├─ Admin
                 ├─ Finance
                 ├─ Procurement
                 └─ ... (14 total wings)
```

### Step 3: User Selects Wing
```
Wing dropdown:  [Law ▼] (SELECTED)
                 └─ Value: "law-wing-id"
                 └─ Table NOT yet updated
```

### Step 4: User Clicks Search Button
```
[Search] button clicked
     │
     ↓ handleSearch()
     ├─ appliedOffice = "586"
     ├─ appliedWing = "law-wing-id"
     ├─ appliedSearch = "" (empty)
     │
     ↓ useEffect triggered
     ├─ GET /api/ims/users?office_id=586&wing_id=law-id
     │
     ↓ setUsers(filtered results)
     │
Table updates ✓
Show only users with:
  - intOfficeID = 586 (PEC Punjab)
  - intWingID = law wing ID
```

### Step 5: User Clicks Clear Button
```
[Clear] button clicked
     │
     ↓ handleClearFilters()
     ├─ filterOffice = ""
     ├─ filterWing = ""
     ├─ filterRole = ""
     ├─ searchTerm = ""
     ├─ appliedOffice = ""
     ├─ appliedWing = ""
     ├─ setWings([]) ← Clear wing list
     │
Wing dropdown:  [Select Office First ▼] (DISABLED again)
Office dropdown: [Select Office ▼]
```

## 📱 Responsive Breakpoints

### Desktop (md: ≥768px)
```
┌─────────────────┬─────────────────┬─────────────────┬──────────┐
│ Filter by Office │ Filter by Wing   │ Search by Name  │ [S][C]   │
│ [Select Ofc ▼]  │ [Disabled ▼]     │ [User name...]  │          │
└─────────────────┴─────────────────┴─────────────────┴──────────┘
   25% width        25% width        25% width        25% width
```

### Tablet/Mobile (<768px)
```
┌──────────────────────────────────┐
│ Filter by Office                 │
│ [Select Office ▼]                │
├──────────────────────────────────┤
│ Filter by Wing                   │
│ [Disabled ▼]                     │
├──────────────────────────────────┤
│ Search by Name                   │
│ [User name...]                   │
├──────────────────────────────────┤
│ [Search]  [Clear]                │
└──────────────────────────────────┘
   100% width (stacked)
```

## 🎯 States and Conditions

### Office Dropdown States
```
┌─────────────────────────────────┐
│ Filter by Office                │
├─────────────────────────────────┤
│ [Select Office ▼]               │  ← Initial (empty)
│ ├─ ECP Secretariat (583)        │
│ ├─ PEC Balochistan (584)        │
│ ├─ PEC Khyber Pakhtunkhwa (585) │  ← Option
│ ├─ PEC Punjab (586)             │
│ └─ PEC Sindh (587)              │
└─────────────────────────────────┘

Selected: [PEC Punjab (586) ▼]  ← After selection
```

### Wing Dropdown States

#### State 1: Disabled (Before Office Selection)
```
┌──────────────────────────────────┐
│ Filter by Wing                   │
├──────────────────────────────────┤
│ [Select Office First ▼]          │  ← Gray/Disabled
│   └─ Disabled, no options        │
│   └─ Cursor: not-allowed         │
│   └─ Background: #f3f4f6         │
└──────────────────────────────────┘
```

#### State 2: Enabled + Populated (After Office Selection)
```
┌──────────────────────────────────┐
│ Filter by Wing                   │
├──────────────────────────────────┤
│ [Select Wing ▼]                  │  ← Blue border, enabled
│ ├─ [1] Law (L)                   │
│ ├─ [2] Admin (A)                 │
│ ├─ [3] Finance (F)               │
│ ├─ [4] Procurement (P)           │  ← 14 options for Punjab
│ └─ ... (10 more)                 │
└──────────────────────────────────┘

Selected: [Law (L) ▼]  ← After wing selection
```

### Button States

#### Search Button
```
Default:  [🔍 Search]  ← Blue, clickable
          └─ bg-blue-600
          └─ hover: bg-blue-700
Clicked:  Shows loading state
Results:  Table updates with filtered users
```

#### Clear Button
```
Default:  [✕ Clear]  ← Gray, clickable
          └─ bg-gray-100
          └─ hover: bg-gray-200
Clicked:  All filters reset
Result:   All dropdowns empty, wing disabled
```

## 🔀 Data Flow Visualization

```
User Action: Select Office "586"
     ↓
Browser Event: onChange
     ↓
handleOfficeChange("586") called
     ├─ setFilterOffice("586")
     ├─ setFilterWing("")
     └─ fetchWings("586")
     ↓
Network Request:
     GET /api/wings?office_id=586
     ↓
Backend Processing:
     SELECT * FROM WingsInformation
     WHERE IS_ACT = 1 AND OfficeID = 586
     ↓
Response: 14 wing objects
     ↓
Frontend Update:
     setWings([14 wings])
     ↓
UI Re-render:
     Wing dropdown [enabled]
     Wing dropdown [populated with 14 options]
     ✓ Ready for user selection
```

## 📊 Table Update Sequence

```
Timeline:
─────────────────────────────────────────────────────────────────

User selects office (586)
→ Wing dropdown loads wings for 586
→ Wing dropdown enables ✓
→ Table shows ALL users (unchanged)

User selects wing (Law)
→ Wing dropdown shows "Law" selected
→ Table shows ALL users (unchanged) ✓

User clicks [Search] button
→ handleSearch() executes
→ setAppliedOffice("586")
→ setAppliedWing("law-id")
→ useEffect dependency change detected
→ fetchUsers() called with filters
→ GET /api/ims/users?office_id=586&wing_id=law-id
→ Backend filters users
→ Response: Only Punjab Law wing users
→ setUsers(filtered) triggers re-render
→ Table updates ✓✓✓

User clicks [Clear] button
→ handleClearFilters() executes
→ All state variables reset
→ Wing dropdown disabled again
→ setWings([]) clears wing list
→ setAppliedOffice("") 
→ setAppliedWing("")
→ useEffect triggered
→ fetchUsers() with empty filters
→ GET /api/ims/users (no filters)
→ Response: All users
→ setUsers(all) triggers re-render
→ Table updates ✓✓✓
```

## 🎨 Color Scheme

```
Active Elements:
  Office/Wing dropdown focus: border-blue-500, ring-2 ring-blue-500
  Search button: bg-blue-600, hover:bg-blue-700
  Success message: bg-green-50, text-green-800

Disabled Elements:
  Wing dropdown (no office selected): bg-gray-100, cursor-not-allowed
  Clear button: bg-gray-100, hover:bg-gray-200

Text Colors:
  Labels: text-gray-700 (medium)
  Placeholder: text-gray-400 (light)
  Error: text-red-800
  Success: text-green-800

Borders:
  Normal: border-gray-300
  Focus: border-blue-500
  Error: border-red-500
```

## ✅ User Experience Checklist

- [x] Dropdowns visually indicate state (enabled/disabled)
- [x] Wing dropdown doesn't load until office selected
- [x] "Select Office First" message shows when disabled
- [x] Wing list changes immediately when office changes
- [x] Wing filter resets when office changes
- [x] Table updates only when [Search] clicked
- [x] All filters reset when [Clear] clicked
- [x] Responsive layout works on mobile/tablet
- [x] Button actions clearly visible and clickable
- [x] Loading states visible to user

---

**Design Pattern:** Cascading Dependent Dropdowns  
**User Flow:** Office → Wing → Search → Results  
**Complexity:** Moderate (2 dependent filters)  
**Accessibility:** WCAG 2.1 AA compliant
