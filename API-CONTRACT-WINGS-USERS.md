# API Contract Update - Wings and Users Endpoints

## Overview
This document specifies the updated API responses after implementing the wing filter and designation fix for the settings/users page.

---

## Endpoint: GET /api/wings

**Purpose:** Fetch all active wings for the wing filter dropdown

**Base URL:** `http://localhost:3001/api/wings`

**Authentication:** None required (public endpoint)

**Query Parameters:** None

**Response Format:** JSON Array

### Response Example
```json
[
  {
    "Id": 1,
    "Name": "Administration Wing",
    "ShortName": "Admin",
    "FocalPerson": "John Smith",
    "ContactNo": "021-1111111",
    "Creator": "admin",
    "CreateDate": "2024-01-15T10:30:00.000Z",
    "Modifier": "admin",
    "ModifyDate": "2024-01-15T10:30:00.000Z",
    "OfficeID": 1,
    "IS_ACT": 1,
    "HODID": "550e8400-e29b-41d4-a716-446655440001",
    "HODName": "Mr. Administrator",
    "WingCode": "ADM001",
    "CreatedAt": "2024-01-15T10:30:00.000Z",
    "UpdatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "Id": 2,
    "Name": "Finance Wing",
    "ShortName": "Finance",
    "FocalPerson": "Jane Doe",
    "ContactNo": "021-2222222",
    "Creator": "admin",
    "CreateDate": "2024-01-15T10:30:00.000Z",
    "Modifier": "admin",
    "ModifyDate": "2024-01-15T10:30:00.000Z",
    "OfficeID": 1,
    "IS_ACT": 1,
    "HODID": "550e8400-e29b-41d4-a716-446655440002",
    "HODName": "Ms. Finance Manager",
    "WingCode": "FIN001",
    "CreatedAt": "2024-01-15T10:30:00.000Z",
    "UpdatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "Id": 3,
    "Name": "Operations Wing",
    "ShortName": "Operations",
    "FocalPerson": "Mike Johnson",
    "ContactNo": "021-3333333",
    "Creator": "admin",
    "CreateDate": "2024-01-15T10:30:00.000Z",
    "Modifier": "admin",
    "ModifyDate": "2024-01-15T10:30:00.000Z",
    "OfficeID": 1,
    "IS_ACT": 1,
    "HODID": "550e8400-e29b-41d4-a716-446655440003",
    "HODName": "Mr. Operations Head",
    "WingCode": "OPS001",
    "CreatedAt": "2024-01-15T10:30:00.000Z",
    "UpdatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### Used For
- Populating "Filter by Wing" dropdown in settings/users page
- Wing selection in other forms and filters

---

## Endpoint: GET /api/ims/users

**Purpose:** Fetch users with optional filtering by search, wing, or role

**Base URL:** `http://localhost:3001/api/ims/users`

**Authentication:** Required (Bearer token in Authorization header)

**Query Parameters:**
- `search` (optional): Search by user name, email, or CNIC
  - Example: `?search=Ahmed`
- `wing_id` (optional): Filter by wing ID (intWingID)
  - Example: `?wing_id=2`
- `role_name` (optional): Filter by role name
  - Example: `?role_name=wing_supervisor`

**Response Format:** JSON Array

### Response Example
```json
[
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "cnic": "12345-6789012-3",
    "office_id": 1,
    "office_name": "Headquarters",
    "wing_id": 2,
    "wing_name": "Finance Wing",
    "designation_id": 45,
    "designation_name": "Wing Supervisor",
    "is_super_admin": false,
    "roles": [
      {
        "user_role_id": "ur-001",
        "role_name": "wing_supervisor",
        "display_name": "Wing Supervisor",
        "scope_type": "Wing",
        "scope_wing_id": 2,
        "scope_wing_name": "Finance Wing",
        "assigned_at": "2024-01-15T10:30:00.000Z",
        "assigned_by_name": "Admin User"
      }
    ]
  },
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "full_name": "Fatima Khan",
    "email": "fatima@example.com",
    "cnic": "98765-4321098-7",
    "office_id": 1,
    "office_name": "Headquarters",
    "wing_id": 2,
    "wing_name": "Finance Wing",
    "designation_id": 46,
    "designation_name": "Store Keeper",
    "is_super_admin": false,
    "roles": [
      {
        "user_role_id": "ur-002",
        "role_name": "store_keeper",
        "display_name": "Store Keeper",
        "scope_type": "Wing",
        "scope_wing_id": 2,
        "scope_wing_name": "Finance Wing",
        "assigned_at": "2024-01-15T10:30:00.000Z",
        "assigned_by_name": "Admin User"
      }
    ]
  },
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "full_name": "Ali Hassan",
    "email": "ali@example.com",
    "cnic": "11111-1111111-1",
    "office_id": 2,
    "office_name": "Regional Office",
    "wing_id": 3,
    "wing_name": "Operations Wing",
    "designation_id": null,
    "designation_name": "Not Assigned",
    "is_super_admin": false,
    "roles": []
  }
]
```

### Response Field Descriptions

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `user_id` | string | Unique user identifier (UUID) | AspNetUsers.Id |
| `full_name` | string | User's full name | AspNetUsers.FullName |
| `email` | string | User's email address | AspNetUsers.Email |
| `cnic` | string | User's CNIC number | AspNetUsers.CNIC |
| `office_id` | number | Office identifier | AspNetUsers.intOfficeID |
| `office_name` | string | Office name | tblOffices.strOfficeName |
| `wing_id` | number | Wing identifier | AspNetUsers.intWingID |
| `wing_name` | string | Wing name | WingsInformation.Name |
| `designation_id` | number \| null | Designation identifier | AspNetUsers.intDesignationID |
| `designation_name` | string | Designation name | tblUserDesignations.designation_name |
| `is_super_admin` | boolean | Whether user is super admin | dbo.fn_IsSuperAdmin() |
| `roles` | array | Array of user role assignments | ims_user_roles |

### Example Requests

**Get all active users:**
```bash
curl -X GET "http://localhost:3001/api/ims/users" \
  -H "Authorization: Bearer <token>" \
  -H "Cookie: connect.sid=<session>"
```

**Search users by name:**
```bash
curl -X GET "http://localhost:3001/api/ims/users?search=Ahmed" \
  -H "Authorization: Bearer <token>" \
  -H "Cookie: connect.sid=<session>"
```

**Filter users by wing:**
```bash
curl -X GET "http://localhost:3001/api/ims/users?wing_id=2" \
  -H "Authorization: Bearer <token>" \
  -H "Cookie: connect.sid=<session>"
```

**Filter users by role:**
```bash
curl -X GET "http://localhost:3001/api/ims/users?role_name=wing_supervisor" \
  -H "Authorization: Bearer <token>" \
  -H "Cookie: connect.sid=<session>"
```

**Combine filters:**
```bash
curl -X GET "http://localhost:3001/api/ims/users?wing_id=2&role_name=store_keeper" \
  -H "Authorization: Bearer <token>" \
  -H "Cookie: connect.sid=<session>"
```

---

## Database Tables Referenced

### AspNetUsers
```sql
CREATE TABLE AspNetUsers (
  Id NVARCHAR(450) PRIMARY KEY,
  FullName NVARCHAR(255),
  Email NVARCHAR(255),
  CNIC NVARCHAR(50),
  intOfficeID INT FOREIGN KEY REFERENCES tblOffices(intOfficeID),
  intWingID INT FOREIGN KEY REFERENCES WingsInformation(Id),
  intDesignationID INT FOREIGN KEY REFERENCES tblUserDesignations(intDesignationID),
  ISACT BIT
)
```

### WingsInformation
```sql
CREATE TABLE WingsInformation (
  Id INT PRIMARY KEY,
  Name NVARCHAR(255),
  ShortName NVARCHAR(50),
  FocalPerson NVARCHAR(255),
  ContactNo NVARCHAR(20),
  Creator NVARCHAR(450),
  CreateDate DATETIME,
  Modifier NVARCHAR(450),
  ModifyDate DATETIME,
  OfficeID INT,
  IS_ACT BIT,
  HODID NVARCHAR(450),
  HODName NVARCHAR(255),
  WingCode NVARCHAR(50),
  CreatedAt DATETIME,
  UpdatedAt DATETIME
)
```

### tblUserDesignations
```sql
CREATE TABLE tblUserDesignations (
  intDesignationID INT PRIMARY KEY,
  designation_name NVARCHAR(255)
)
```

### tblOffices
```sql
CREATE TABLE tblOffices (
  intOfficeID INT PRIMARY KEY,
  strOfficeName NVARCHAR(255)
)
```

---

## SQL Queries Used

### /api/wings Query
```sql
SELECT 
  Id, Name, ShortName, FocalPerson, ContactNo, Creator, CreateDate,
  Modifier, ModifyDate, OfficeID, IS_ACT, HODID, HODName, WingCode,
  CreatedAt, UpdatedAt
FROM WingsInformation 
WHERE IS_ACT = 1
ORDER BY Name
```

### /api/ims/users Query (Base)
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
-- Filter conditions added dynamically based on parameters
ORDER BY u.FullName
```

---

## Breaking Changes
⚠️ **None** - All changes are additive:
- New fields added: `designation_id`, `designation_name`
- Existing fields unchanged
- Backward compatible with existing code

---

## Version
- **Updated:** 2024
- **API Version:** 1.0
- **Status:** Active

