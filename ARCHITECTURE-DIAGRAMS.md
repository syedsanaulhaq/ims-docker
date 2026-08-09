# Wing Filter & Designation Fix - Architecture & Data Flow Diagrams

## 1. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETTINGS/USERS PAGE                          │
│                 (http://localhost:8080/settings/users)           │
└─────────────────────────────────────────────────────────────────┘
         ↓                                        ↓
    ┌─────────────────┐              ┌──────────────────────────┐
    │  Wing Filter    │              │  User List Table         │
    │  Dropdown       │              │  with Designation Info   │
    └─────────────────┘              └──────────────────────────┘
         ↓                                        ↓
    ┌─────────────────┐              ┌──────────────────────────┐
    │  /api/wings     │              │  /api/ims/users          │
    │  Endpoint       │              │  ?wing_id=2              │
    └─────────────────┘              └──────────────────────────┘
         ↓                                        ↓
    ┌─────────────────┐              ┌──────────────────────────┐
    │ WingsInfo Table │              │ AspNetUsers (with joins) │
    │ - Id            │              │ - FullName               │
    │ - Name          │              │ - Email                  │
    │ - ShortName     │              │ - intWingID              │
    │ - WingCode      │              │ - intDesignationID       │
    │ - IS_ACT = 1    │              │ - office_name (joined)   │
    └─────────────────┘              │ - wing_name (joined)     │
                                     │ - designation_name (NEW) │
                                     └──────────────────────────┘
```

## 2. Database Relationship Diagram

```
┌─────────────────────────────┐
│      AspNetUsers            │
├─────────────────────────────┤
│ Id (PK)                     │
│ FullName                    │
│ Email                       │
│ CNIC                        │
│ intOfficeID (FK) ──────────→│ (to tblOffices)
│ intWingID (FK) ────────────→│ (to WingsInformation)
│ intDesignationID (FK) ─────→│ (to tblUserDesignations)
│ ISACT                       │
└─────────────────────────────┘
        │        │         │
        │        │         └────────────────────┐
        │        │                              │
        │        ├──────────────────┐           │
        │        │                  │           │
        ↓        ↓                  ↓           ↓
┌──────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
│  tblOffices  │  │ WingsInformation    │  │ tblUserDesignations  │
├──────────────┤  ├─────────────────────┤  ├──────────────────────┤
│ intOfficeID  │  │ Id (PK)             │  │ intDesignationID     │
│ strOfficeName│  │ Name                │  │ designation_name     │
│ ...          │  │ ShortName           │  │ ...                  │
└──────────────┘  │ WingCode            │  └──────────────────────┘
                  │ IS_ACT = 1          │
                  │ ...                 │
                  └─────────────────────┘

KEY JOINS:
──────────
AspNetUsers.intOfficeID ────→ tblOffices.intOfficeID
AspNetUsers.intWingID ──────→ WingsInformation.Id
AspNetUsers.intDesignationID → tblUserDesignations.intDesignationID
```

## 3. API Response Structure

```
GET /api/wings
│
└─→ Array of Wing Objects
    ├─ { Id: 1, Name: "Finance Wing", IS_ACT: 1, ... }
    ├─ { Id: 2, Name: "Operations Wing", IS_ACT: 1, ... }
    └─ { Id: 3, Name: "Admin Wing", IS_ACT: 1, ... }

GET /api/ims/users?wing_id=2
│
└─→ Array of User Objects
    ├─ {
    │   user_id: "uuid-123",
    │   full_name: "Ahmed Ali",
    │   email: "ahmed@example.com",
    │   wing_id: 2,
    │   wing_name: "Operations Wing",        ← From WingsInformation
    │   designation_id: 45,
    │   designation_name: "Wing Supervisor", ← From tblUserDesignations (NEW)
    │   office_name: "Headquarters",         ← From tblOffices
    │   ...
    │ }
    └─ ... more users
```

## 4. Component State Management

```
┌─────────────────────────────────────────────────────────────┐
│            UserRoleAssignment Component                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  State Variables:                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ wings: Wing[]                                         │   │
│  │ users: User[]                                         │   │
│  │ filterWing: string (selected wing Id)                │   │
│  │ appliedWing: string (wing Id for API call)           │   │
│  │ roles: Role[]                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  User Interface Type:                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ interface User {                                      │   │
│  │   user_id: string;                                   │   │
│  │   full_name: string;                                 │   │
│  │   email: string;                                     │   │
│  │   wing_id: number;                                   │   │
│  │   wing_name: string;                                 │   │
│  │   designation_id: number;        ← ADDED             │   │
│  │   designation_name: string;      ← ADDED             │   │
│  │   office_name: string;                               │   │
│  │   is_super_admin: boolean;                           │   │
│  │   roles: UserRole[];                                 │   │
│  │ }                                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Wing Interface:                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ interface Wing {                                      │   │
│  │   Id: number;                                        │   │
│  │   Name: string;                                      │   │
│  │   ShortName?: string;                                │   │
│  │   WingCode?: string;                                 │   │
│  │ }                                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 5. SQL Query Execution Flow

```
Request: GET /api/ims/users?wing_id=2
│
├─ Validate user authentication ✓
├─ Check user permissions ✓
│
└─ Execute Query:
   │
   ├─ SELECT DISTINCT
   │  ├─ u.Id as user_id
   │  ├─ u.FullName as full_name
   │  ├─ u.CNIC as cnic
   │  ├─ u.intWingID as wing_id
   │  ├─ u.intDesignationID as designation_id    ← NEW FIELD
   │  ├─ w.Name as wing_name (from JOIN)
   │  └─ d.designation_name as designation_name  ← NEW FIELD
   │
   ├─ FROM AspNetUsers u
   ├─ LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
   ├─ LEFT JOIN WingsInformation w ON u.intWingID = w.Id
   ├─ LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID  ← NEW JOIN
   │
   ├─ WHERE u.ISACT = 1
   └─ AND u.intWingID = @wingId (wing_id=2)
   │
   └─ ORDER BY u.FullName
      │
      └─ Return: Array of User objects with designation info
```

## 6. UI Rendering Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ UserRoleAssignment Component Renders                             │
└─────────────────────────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────────────────────┐
    │ FILTER SECTION                                             │
    ├────────────────────────────────────────────────────────────┤
    │                                                             │
    │ Filter by Wing:                                            │
    │ <select>                                                   │
    │   <option>All Wings</option>                              │
    │   {wings.map(wing => (                                    │
    │     <option key={wing.Id} value={wing.Id}>               │
    │       {wing.Name}        ← From /api/wings response      │
    │     </option>                                            │
    │   ))}                                                      │
    │ </select>                                                  │
    │                                                             │
    └────────────────────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────────────────────┐
    │ USER LIST TABLE SECTION                                    │
    ├────────────────────────────────────────────────────────────┤
    │                                                             │
    │ <table>                                                    │
    │   <thead>                                                  │
    │     <tr>                                                   │
    │       <th>User</th>                                       │
    │       <th>Office / Wing / Designation</th>  ← UPDATED    │
    │       <th>Current Roles</th>                             │
    │       <th>Actions</th>                                    │
    │     </tr>                                                  │
    │   </thead>                                                │
    │   <tbody>                                                  │
    │     {users.map(user => (                                 │
    │       <tr>                                                 │
    │         <td>{user.full_name}</td>                        │
    │         <td>                                              │
    │           <div>{user.office_name}</div>                 │
    │           <div>{user.wing_name}</div>                   │
    │           <div>{user.designation_name}</div>    ← NEW   │
    │         </td>                                             │
    │         ...                                               │
    │       </tr>                                                │
    │     ))}                                                    │
    │   </tbody>                                                 │
    │ </table>                                                   │
    │                                                             │
    └────────────────────────────────────────────────────────────┘
         ↓
    Final Rendered UI with:
    ✓ Wing filter dropdown populated
    ✓ Users filtered by selected wing
    ✓ Designation names displayed
```

## 7. Request-Response Cycle

```
User Action: Select Wing from Dropdown → Click Search
│
├─ Frontend State Update
│  └─ setAppliedWing(wingId)
│
├─ useEffect Triggered
│  └─ fetchUsers() called with ?wing_id=2
│
├─ HTTP Request
│  └─ GET /api/ims/users?wing_id=2
│     ├─ Headers: { Authorization, Cookie }
│     └─ Credentials: include
│
├─ Backend Processing
│  ├─ Authenticate request ✓
│  ├─ Check permissions ✓
│  ├─ Build parameterized SQL query
│  ├─ Execute query with JOINs
│  └─ Transform results
│
├─ HTTP Response
│  └─ 200 OK
│     └─ [
│        {
│          user_id: "...",
│          full_name: "Ahmed Ali",
│          wing_name: "Finance Wing",
│          designation_name: "Wing Supervisor",  ← NEW
│          ...
│        },
│        ...
│       ]
│
├─ Frontend State Update
│  └─ setUsers(data)
│
└─ UI Re-render
   └─ Display users with designation information
```

## 8. Error Handling Flow

```
GET /api/ims/users?wing_id=2
│
├─ If not authenticated
│  └─ Return 401 Unauthorized
│
├─ If user lacks permission
│  └─ Return 403 Forbidden
│
├─ If wing_id is invalid
│  ├─ Query returns empty array
│  └─ Display: "No users found"
│
├─ If designation_id is NULL
│  ├─ COALESCE() returns "Not Assigned"
│  └─ Display: "Not Assigned"
│
├─ If database error occurs
│  └─ Try-catch returns 500
│     └─ Log error & return error message
│
└─ If HTTP error
   ├─ Frontend catches error
   └─ Display: "Failed to fetch users"
```

---

## Summary of Changes

| Layer | Component | Change | Impact |
|-------|-----------|--------|--------|
| **DB** | SQL Query | Added tblUserDesignations JOIN | Designation data now available |
| **API** | /api/ims/users | Added 2 new fields | Response now includes designation |
| **FE Type** | User Interface | Added 2 new properties | TypeScript knows about designation |
| **FE UI** | Table Display | Added designation column | Users see complete info |
| **FE Header** | Table Header | Updated label | Column header more descriptive |

All changes are **backward compatible** and **non-breaking**.

