# API Reference Guide

Complete reference for all IMS API endpoints.

## Base URL

```
http://localhost:3000/api
```

---

## Authentication

All endpoints require user context (implemented in frontend services).

---

## Approval Endpoints

### Get My Pending Approvals

```
GET /approvals/my-approvals

Response:
[
  {
    id: number
    workflow_id: number
    request_type: 'stock_issuance' | 'procurement' | 'return'
    request_number: string
    requested_by_name: string
    items: RequestApprovalItem[]
    current_stage: number
    status: 'pending' | 'approved' | 'rejected'
  }
]
```

### Approve Request Items

```
POST /approvals/approve

Body:
{
  approval_id: number
  approved_quantity?: number
  comments?: string
}

Response:
{
  id: number
  current_status: 'approved'
}
```

### Reject Request Items

```
POST /approvals/reject

Body:
{
  approval_id: number
  rejection_reason: string
  comments?: string
}

Response:
{
  id: number
  current_status: 'rejected'
}
```

### Forward to Next Approver

```
POST /approvals/forward

Body:
{
  approval_id: number
  forward_to: number (user_id)
  comments?: string
}

Response:
{
  id: number
  current_status: 'forwarded'
  forwarded_to: number
}
```

### Get Approval Details

```
GET /approvals/:id

Response:
{
  id: number
  approval_id: number
  item_id: number
  item_name: string
  status: string
  approver_name: string
  approval_date: datetime
  comments: string
}
```

---

## Stock Issuance Endpoints

### Create Stock Issuance Request

```
POST /stock-issuance/create

Body:
{
  requested_by: number (user_id)
  requested_by_wing: string
  reason: string
  items: [
    {
      item_id: number
      quantity: number
      notes?: string
    }
  ]
}

Response:
{
  success: true
  request_id: number
  request_number: string
}
```

### Get Stock Issuance Requests

```
GET /stock-issuance/requests?status=pending&limit=10&page=1

Query Parameters:
  status: 'pending' | 'approved' | 'issued' | 'rejected'
  limit: number (default 10)
  page: number (default 1)

Response:
[
  {
    id: number
    request_number: string
    requested_by_name: string
    request_date: datetime
    status: string
    items_count: number
  }
]
```

### Get Request Details

```
GET /stock-issuance/:id

Response:
{
  id: number
  request_number: string
  requested_by_name: string
  requested_by_wing: string
  reason: string
  status: string
  items: [
    {
      id: number
      item_id: number
      item_code: string
      item_name: string
      quantity_requested: number
      quantity_approved: number
      status: string
    }
  ]
  created_at: datetime
}
```

### Submit Approval Decision

```
POST /stock-issuance/submit-approval

Body:
{
  workflow_id: number
  items: [
    {
      item_id: number
      decision: 'approve' | 'reject' | 'forward'
      approved_quantity?: number
      rejection_reason?: string
    }
  ]
}

Response:
{
  success: true
  message: 'Approval submitted'
}
```

### Issue Approved Items

```
POST /stock-issuance/issue

Body:
{
  request_id: number
  issued_by: number (user_id)
}

Response:
{
  success: true
  issued_items: number
  remaining_balance: number
}
```

---

## Inventory Stock Endpoints

### Get Current Stock

```
GET /inventory-stock?category_id=1&search=pen

Query Parameters:
  category_id?: number
  search?: string (searches item_code and item_name)
  limit?: number
  page?: number

Response:
[
  {
    id: number
    item_code: string
    item_name: string
    category: string
    quantity: number
    reorder_level: number
    reorder_quantity: number
    unit_type: string
    status: 'in-stock' | 'low-stock' | 'out-of-stock'
  }
]
```

### Get Stock Details

```
GET /inventory-stock/:item_id

Response:
{
  id: number
  item_id: number
  item_code: string
  item_name: string
  category: string
  current_quantity: number
  reorder_level: number
  reorder_quantity: number
  last_transaction: datetime
  last_transaction_type: string
  transaction_history: [
    {
      date: datetime
      type: 'IN' | 'OUT' | 'ADJUSTMENT'
      quantity: number
      reference: string
    }
  ]
}
```

### Update Stock (Admin Only)

```
POST /inventory-stock/update

Body:
{
  item_id: number
  quantity: number
  adjustment_type: 'add' | 'reduce' | 'set'
  reason: string
  adjusted_by: number
}

Response:
{
  success: true
  new_quantity: number
}
```

### Get Stock Transactions

```
GET /inventory-stock/transactions/:item_id?from=2024-01-01&to=2024-12-31

Query Parameters:
  from: date (YYYY-MM-DD)
  to: date (YYYY-MM-DD)
  type: 'IN' | 'OUT' | 'ADJUSTMENT'

Response:
[
  {
    id: number
    date: datetime
    type: string
    quantity: number
    reference_type: string
    reference_id: number
    created_by: string
    notes: string
  }
]
```

---

## Procurement Endpoints

### Create Procurement Request

```
POST /procurement/create

Body:
{
  requested_by: number
  items: [
    {
      item_id: number
      quantity: number
      estimated_cost?: number
      notes?: string
    }
  ]
  budget_amount: number
}

Response:
{
  success: true
  procurement_id: number
  request_number: string
}
```

### Get Procurement Requests

```
GET /procurement?status=open&limit=10&page=1

Response:
[
  {
    id: number
    request_number: string
    requested_by_name: string
    status: string
    items_count: number
    budget_amount: number
    request_date: datetime
  }
]
```

### Create Tender

```
POST /procurement/create-tender

Body:
{
  procurement_request_id: number
  closing_date: datetime
  notes?: string
}

Response:
{
  success: true
  tender_id: number
  tender_number: string
}
```

### Get Tender Details

```
GET /procurement/tender/:tender_id

Response:
{
  id: number
  tender_number: string
  status: string
  items: [
    {
      id: number
      item_code: string
      item_name: string
      quantity: number
      unit_price: number
      bids: [
        {
          vendor: string
          unit_price: number
          total_price: number
        }
      ]
    }
  ]
}
```

### Submit Tender Bid (Vendor)

```
POST /procurement/submit-bid

Body:
{
  tender_id: number
  vendor_id: number
  items: [
    {
      item_id: number
      unit_price: number
      quantity: number
    }
  ]
}

Response:
{
  success: true
  bid_id: number
}
```

### Award Tender

```
POST /procurement/award-tender

Body:
{
  tender_id: number
  awarded_to_vendor_id: number
  bid_id: number
}

Response:
{
  success: true
  award_date: datetime
}
```

### Receive Delivery

```
POST /procurement/receive-delivery

Body:
{
  tender_id: number
  received_items: [
    {
      item_id: number
      quantity_received: number
    }
  ]
  received_by: number
}

Response:
{
  success: true
  message: 'Delivery received and stock updated'
  items_added: number
}
```

---

## Verification Endpoints

### Create Stock Verification

```
POST /verification/create

Body:
{
  created_by: number
  verification_items: [
    {
      item_id: number
      physical_count: number
      notes?: string
    }
  ]
}

Response:
{
  success: true
  verification_id: number
}
```

### Get Verification Details

```
GET /verification/:verification_id

Response:
{
  id: number
  created_by: string
  created_date: datetime
  status: string
  items: [
    {
      item_code: string
      item_name: string
      system_quantity: number
      physical_count: number
      variance: number
      status: 'match' | 'shortage' | 'overage'
    }
  ]
}
```

### Submit Verification Approval

```
POST /verification/approve

Body:
{
  verification_id: number
  approved_by: number
  adjustments: [
    {
      item_id: number
      adjust_qty: number
      reason: string
    }
  ]
}

Response:
{
  success: true
  adjustments_applied: number
}
```

---

## User Endpoints

### Get Current User

```
GET /user/current

Response:
{
  id: string (GUID)
  username: string
  email: string
  wing: string
  roles: string[]
}
```

### Get User by ID

```
GET /user/:user_id

Response:
{
  id: string
  username: string
  email: string
  phone: string
  wing: string
  roles: string[]
}
```

### Get Users by Wing

```
GET /user/wing/:wing

Response:
[
  {
    id: string
    username: string
    email: string
    wing: string
    roles: string[]
  }
]
```

### Get Users by Role

```
GET /user/role/:role

Response:
[
  {
    id: string
    username: string
    email: string
    wing: string
  }
]
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Permission denied |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| SERVER_ERROR | 500 | Internal server error |
| INSUFFICIENT_STOCK | 400 | Not enough inventory |
| INVALID_APPROVAL | 400 | Cannot approve (already decided) |
| INVALID_STATUS | 400 | Invalid status for operation |

---

## Rate Limiting

- 100 requests per minute per user
- Exceed limit: Returns `429 Too Many Requests`

---

## Pagination

```
?limit=10&page=1

Response includes:
{
  data: [...],
  page: 1,
  limit: 10,
  total: 250,
  total_pages: 25
}
```

---

**Last Updated:** December 28, 2025  
**Version:** 1.0
