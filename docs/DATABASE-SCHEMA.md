# Database Schema Documentation

Complete reference for InventoryManagementDB tables and columns.

## Database Overview

- **Name:** InventoryManagementDB
- **Server:** SQL Server
- **Total Tables:** 61
- **Status:** Production Ready

---

## Master Data Tables

### 1. item_masters
Core inventory master data.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| item_code | VARCHAR(50) | Unique identifier |
| item_name | NVARCHAR(MAX) | Item description |
| category_id | INT | Foreign Key → categories |
| subcategory_id | INT | Foreign Key → subcategories |
| manufacturer | VARCHAR(100) | Manufacturing company |
| unit_type | VARCHAR(50) | UOM (piece, box, etc.) |
| is_dispensable | BIT | Consumable flag |
| standard_cost | DECIMAL(10,2) | Standard unit cost |
| created_at | DATETIME | Auto-created timestamp |
| updated_at | DATETIME | Auto-updated timestamp |
| is_deleted | BIT | Soft delete flag |

**Sample Data:** 15 items (Furniture, Office supplies, Electronics, etc.)

### 2. categories
Item categorization.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| category_code | VARCHAR(50) | Unique code |
| category_name | NVARCHAR(MAX) | Display name |
| description | NVARCHAR(MAX) | Category description |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

**Sample Data:** 7 categories

### 3. vendors
Vendor/supplier registry.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| vendor_code | VARCHAR(50) | Unique identifier |
| vendor_name | NVARCHAR(MAX) | Vendor name |
| contact_email | VARCHAR(100) | Contact email |
| contact_phone | VARCHAR(20) | Contact phone |
| address | NVARCHAR(MAX) | Vendor address |
| is_active | BIT | Active status |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

**Sample Data:** 7 vendors

### 4. designation_equivalence_codes (DECs)
Government code mappings.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| item_id | INT | Foreign Key → item_masters |
| dec_code | VARCHAR(50) | Government code |
| description | NVARCHAR(MAX) | Code description |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

**Sample Data:** 336 codes

---

## Inventory Management Tables

### 5. current_inventory_stock
Live stock levels.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| item_id | INT | Foreign Key → item_masters |
| quantity | INT | Current quantity |
| reorder_level | INT | Minimum stock level |
| reorder_quantity | INT | Quantity to reorder |
| last_updated | DATETIME | Last update timestamp |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

**Sample Data:** 15 items with 100 units each

### 6. stock_transactions
Detailed stock movement audit trail.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| item_id | INT | Foreign Key → item_masters |
| transaction_type | VARCHAR(50) | IN, OUT, ADJUSTMENT, RETURN |
| quantity | INT | Transaction quantity |
| reference_type | VARCHAR(50) | Request type (issuance, procurement, etc.) |
| reference_id | INT | Reference ID |
| created_by | INT | Foreign Key → AspNetUsers |
| notes | NVARCHAR(MAX) | Transaction notes |
| created_at | DATETIME | Transaction timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

---

## Request Management Tables

### 7. stock_issuance_requests
Request for stock items.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| request_number | VARCHAR(50) | Unique request ID |
| requested_by | INT | Foreign Key → AspNetUsers |
| request_date | DATETIME | Request creation date |
| reason | NVARCHAR(MAX) | Reason for request |
| status | VARCHAR(50) | pending, approved, issued, rejected |
| requested_by_wing | VARCHAR(100) | Requesting wing/department |
| requested_by_name | VARCHAR(100) | Requester name |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 8. stock_issuance_items
Items in issuance requests.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| issuance_request_id | INT | Foreign Key → stock_issuance_requests |
| item_id | INT | Foreign Key → item_masters |
| quantity_requested | INT | Requested amount |
| quantity_approved | INT | Approved amount |
| quantity_issued | INT | Issued amount |
| item_decision | VARCHAR(50) | approved, rejected, pending |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 9. procurement_requests
Procurement/purchase requests.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| request_number | VARCHAR(50) | Unique ID |
| requested_by | INT | Foreign Key → AspNetUsers |
| request_date | DATETIME | Date |
| status | VARCHAR(50) | pending, approved, tendered, awarded, delivered |
| budget_amount | DECIMAL(10,2) | Budget allocated |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 10. procurement_request_items
Items in procurement requests.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| procurement_request_id | INT | Foreign Key → procurement_requests |
| item_id | INT | Foreign Key → item_masters |
| quantity_required | INT | Quantity needed |
| estimated_cost | DECIMAL(10,2) | Estimated unit cost |
| notes | NVARCHAR(MAX) | Item notes |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

---

## Tender Management Tables

### 11. tenders
Tender documents.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| tender_number | VARCHAR(50) | Unique identifier |
| procurement_request_id | INT | Foreign Key → procurement_requests |
| tender_date | DATETIME | Publication date |
| closing_date | DATETIME | Bid closing date |
| status | VARCHAR(50) | open, closed, awarded, finalized |
| total_estimated_value | DECIMAL(10,2) | Tender value estimate |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 12. tender_items
Items in tenders.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| tender_id | INT | Foreign Key → tenders |
| item_id | INT | Foreign Key → item_masters |
| quantity | INT | Quantity required |
| unit_price | DECIMAL(10,2) | Unit price |
| total_value | DECIMAL(10,2) | Quantity × unit price |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 13. tender_bids
Vendor bids for tenders.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| tender_id | INT | Foreign Key → tenders |
| vendor_id | INT | Foreign Key → vendors |
| bid_amount | DECIMAL(10,2) | Total bid amount |
| bid_date | DATETIME | Bid submission date |
| status | VARCHAR(50) | submitted, evaluated, accepted, rejected |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 14. tender_bid_items
Individual bid items.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| tender_bid_id | INT | Foreign Key → tender_bids |
| item_id | INT | Foreign Key → item_masters |
| unit_price | DECIMAL(10,2) | Quoted price |
| quantity | INT | Quoted quantity |
| total_price | DECIMAL(10,2) | Total |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

---

## Approval Workflow Tables

### 15. approvals
Individual item-level approval decisions.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| workflow_id | INT | Foreign Key → approval_workflows |
| item_id | INT | Foreign Key → item_masters |
| approved_by | INT | Foreign Key → AspNetUsers |
| decision | VARCHAR(50) | approved, rejected, pending, forwarded |
| rejection_reason | NVARCHAR(MAX) | Reason if rejected |
| comments | NVARCHAR(MAX) | Approver comments |
| decision_date | DATETIME | When decision made |
| decision_type | VARCHAR(50) | full_approval, forwarding, return |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 16. approval_workflows
Approval routing and tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| request_id | INT | Stock issuance request ID |
| request_type | VARCHAR(50) | stock_issuance, procurement, return |
| current_stage | INT | Current approval level (1, 2, 3) |
| current_approver | INT | Current approver user ID |
| status | VARCHAR(50) | pending, approved, rejected, completed |
| created_by | INT | Requester |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

### 17. request_approvals
Per-item approval tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary Key |
| approval_id | INT | Foreign Key → approvals |
| approver_id | INT | Foreign Key → AspNetUsers |
| status | VARCHAR(50) | pending, approved, rejected |
| approval_date | DATETIME | When approved |
| created_at | DATETIME | Timestamp |
| updated_at | DATETIME | Timestamp |
| is_deleted | BIT | Soft delete |

---

## Authentication & Authorization Tables

### 18. AspNetUsers
User authentication data.

| Column | Type | Notes |
|--------|------|-------|
| Id | NVARCHAR(MAX) | Primary Key (GUID) |
| UserName | NVARCHAR(MAX) | Login username |
| Email | VARCHAR(100) | Email address |
| PasswordHash | NVARCHAR(MAX) | Hashed password |
| PhoneNumber | VARCHAR(20) | Phone number |
| LockoutEnd | DATETIMEOFFSET | Account lockout timestamp |
| LockoutEnabled | BIT | Lockout flag |
| AccessFailedCount | INT | Failed login attempts |
| ConcurrencyStamp | NVARCHAR(MAX) | Version stamp |
| SecurityStamp | NVARCHAR(MAX) | Security stamp |
| TwoFactorEnabled | BIT | 2FA enabled |
| wing | VARCHAR(100) | User's wing/department |

**Sample Data:** 499 users

### 19. AspNetRoles
Role definitions.

| Column | Type | Notes |
|--------|------|-------|
| Id | NVARCHAR(MAX) | Primary Key |
| Name | NVARCHAR(MAX) | Role name |
| ConcurrencyStamp | NVARCHAR(MAX) | Version |

### 20. AspNetUserRoles
User role assignments.

| Column | Type | Notes |
|--------|------|-------|
| UserId | NVARCHAR(MAX) | Foreign Key → AspNetUsers |
| RoleId | NVARCHAR(MAX) | Foreign Key → AspNetRoles |

---

## Additional Tables (Summary)

41+ additional supporting tables including:
- aspnetuserclaims
- aspnetlogins
- aspnetusertokens
- Subcategories
- Organizational hierarchies
- Verification tables
- Return request tables
- And more...

---

## Query Examples

### Get Current Stock for All Items

```sql
SELECT 
  im.item_code,
  im.item_name,
  c.category_name,
  cis.quantity,
  cis.reorder_level
FROM current_inventory_stock cis
JOIN item_masters im ON cis.item_id = im.id
JOIN categories c ON im.category_id = c.id
WHERE im.is_deleted = 0 AND cis.quantity < cis.reorder_level
ORDER BY im.item_name
```

### Get Pending Approvals by User

```sql
SELECT 
  aw.id,
  aw.request_type,
  sr.request_number,
  sr.requested_by_name,
  COUNT(a.id) as item_count,
  aw.current_stage
FROM approval_workflows aw
LEFT JOIN stock_issuance_requests sr ON aw.request_id = sr.id
LEFT JOIN approvals a ON aw.id = a.workflow_id
WHERE aw.current_approver = @userId
  AND aw.status = 'pending'
  AND aw.is_deleted = 0
GROUP BY aw.id, aw.request_type, sr.request_number, sr.requested_by_name, aw.current_stage
```

### Get Stock Transaction Audit Trail

```sql
SELECT 
  st.id,
  st.transaction_type,
  im.item_name,
  st.quantity,
  st.reference_type,
  au.UserName as created_by,
  st.created_at
FROM stock_transactions st
JOIN item_masters im ON st.item_id = im.id
JOIN AspNetUsers au ON st.created_by = au.Id
WHERE im.item_code = @itemCode
  AND st.is_deleted = 0
ORDER BY st.created_at DESC
```

---

**Last Updated:** December 28, 2025  
**Status:** Current & Accurate
