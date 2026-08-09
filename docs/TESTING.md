# Testing Guide

Complete testing procedures for IMS system verification.

## Testing Strategy

### Test Coverage Goals

- **Unit Tests:** 80% of business logic functions
- **Integration Tests:** 100% of API endpoints
- **End-to-End Tests:** All 4 core workflows
- **Performance Tests:** Response time benchmarks

---

## Test Environment Setup

### Prerequisites

All testing must use the production database: **InventoryManagementDB**

```bash
# Connection string in backend-server.cjs must always be:
const config = {
  server: 'localhost',
  database: 'InventoryManagementDB',
  user: 'your_username',
  password: 'your_password'
};
```

### Test Data

- **Database:** InventoryManagementDB (production)
- **15 test items** (various categories)
- **7 test vendors**
- **50 test users** (various roles)
- **Pre-populated stock** (100 units each item)

---

## Unit Tests

### ApprovalForwardingService Tests

```typescript
describe('ApprovalForwardingService', () => {
  
  test('should approve request with valid approval ID', async () => {
    const service = new ApprovalForwardingService();
    const action = { approved_quantity: 5, comments: 'Approved' };
    
    const result = await service.approveRequest(1, action);
    
    expect(result.id).toBe(1);
    expect(result.current_status).toBe('approved');
  });

  test('should reject request with reason', async () => {
    const action = { 
      rejection_reason: 'Out of stock',
      comments: 'Not available'
    };
    
    const result = await service.rejectRequest(2, action);
    
    expect(result.current_status).toBe('rejected');
  });

  test('should forward to next approver', async () => {
    const action = { 
      forward_to: 3,
      comments: 'Forwarded for review'
    };
    
    const result = await service.forwardRequest(3, action);
    
    expect(result.current_status).toBe('forwarded');
  });

  test('should throw error for invalid approval ID', async () => {
    await expect(service.approveRequest(99999, {}))
      .rejects
      .toThrow('Approval not found');
  });
});
```

### Stock Service Tests

```typescript
describe('StockService', () => {
  
  test('should get current stock for item', async () => {
    const stock = await StockService.getStock(1);
    
    expect(stock.item_id).toBe(1);
    expect(stock.quantity).toBeGreaterThanOrEqual(0);
  });

  test('should prevent reducing stock below zero', async () => {
    await expect(StockService.reduceStock(1, 1000))
      .rejects
      .toThrow('Insufficient stock');
  });

  test('should add stock correctly', async () => {
    const initialStock = await StockService.getStock(2);
    await StockService.addStock(2, 10);
    const newStock = await StockService.getStock(2);
    
    expect(newStock.quantity).toBe(initialStock.quantity + 10);
  });
});
```

---

## Integration Tests

### Stock Issuance API Tests

```typescript
describe('Stock Issuance API', () => {
  let request: StockIssuanceRequest;

  beforeEach(async () => {
    // Create test request
    request = await createTestRequest();
  });

  test('POST /api/stock-issuance/create should create request', async () => {
    const response = await fetch('http://localhost:3000/api/stock-issuance/create', {
      method: 'POST',
      body: JSON.stringify({
        requested_by: 1,
        requested_by_wing: 'Finance',
        reason: 'Office supplies',
        items: [
          { item_id: 1, quantity: 5 },
          { item_id: 2, quantity: 10 }
        ]
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.request_number).toBeDefined();
  });

  test('GET /api/stock-issuance/requests should list requests', async () => {
    const response = await fetch('http://localhost:3000/api/stock-issuance/requests');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].request_number).toBeDefined();
  });

  test('POST /api/stock-issuance/submit-approval should process approval', async () => {
    const response = await fetch('http://localhost:3000/api/stock-issuance/submit-approval', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: request.workflow_id,
        items: [
          { 
            item_id: 1, 
            decision: 'approve', 
            approved_quantity: 5 
          }
        ]
      })
    });

    expect(response.status).toBe(200);
  });
});
```

### Approval API Tests

```typescript
describe('Approval API', () => {
  
  test('GET /api/approvals/my-approvals should return pending approvals', async () => {
    const response = await fetch('http://localhost:3000/api/approvals/my-approvals');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    
    data.forEach(approval => {
      expect(approval.id).toBeDefined();
      expect(approval.status).toBe('pending');
    });
  });

  test('POST /api/approvals/approve should approve items', async () => {
    const approvals = await getMyApprovals();
    const approval = approvals[0];

    const response = await fetch('http://localhost:3000/api/approvals/approve', {
      method: 'POST',
      body: JSON.stringify({
        approval_id: approval.id,
        approved_quantity: approval.quantity_requested,
        comments: 'Approved'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.current_status).toBe('approved');
  });

  test('POST /api/approvals/reject should reject items', async () => {
    const response = await fetch('http://localhost:3000/api/approvals/reject', {
      method: 'POST',
      body: JSON.stringify({
        approval_id: 1,
        rejection_reason: 'Out of stock'
      })
    });

    expect(response.status).toBe(200);
  });
});
```

---

## End-to-End Tests

### Workflow 1: Stock Issuance Complete Flow

```gherkin
Scenario: Complete stock issuance workflow
  Given a requester user is logged in
  And inventory has items in stock
  
  When requester creates stock issuance request
  And requests 5 units of item X
  Then request status is "pending"
  
  When supervisor reviews request
  And approves 5 units of item X
  Then approval status is "approved"
  
  When system issues approved items
  Then stock is reduced by 5 units
  And stock transaction is created
  And request status is "issued"
  
  When inventory is checked
  Then item X quantity decreased by 5
```

### Workflow 2: Procurement Tender Complete Flow

```gherkin
Scenario: Complete procurement workflow
  Given a procurement request with 3 items
  And 5 qualified vendors
  
  When system creates tender
  And publishes tender for bidding
  Then tender status is "open"
  
  When vendors submit bids
  Then system receives 3+ bids
  
  When procurement evaluates bids
  And selects lowest qualified bid
  Then tender awarded
  
  When vendor delivers items
  And system receives delivery
  Then stock increased
  And procurement completed
```

### Workflow 3: Stock Verification Flow

```gherkin
Scenario: Stock verification and reconciliation
  Given physical inventory count performed
  And verification request created
  
  When supervisor approves verification
  Then differences identified
  
  When reconciliation adjustments submitted
  Then system updates stock levels
  And audit trail created
  And verification completed
```

### Workflow 4: Reorder Automation Flow

```gherkin
Scenario: Automatic reorder triggering
  Given item X with reorder_level = 20
  And current_quantity = 25
  
  When 10 units issued
  Then current_quantity = 15
  
  When system detects low stock
  Then procurement request auto-created
  And tender auto-created
  And procurement follows normal workflow
```

---

## Performance Testing

### Load Testing

```bash
# Install Apache JMeter or similar tool

# Test Configuration:
# - 100 concurrent users
# - Ramp-up: 10 seconds
# - Test duration: 5 minutes
# - Response time target: < 2 seconds

# Test Scenarios:
# 1. GET /api/inventory-stock (list)
# 2. GET /api/approvals/my-approvals
# 3. POST /api/stock-issuance/create
# 4. POST /api/approvals/approve
```

### Response Time Benchmarks

| Endpoint | Operation | Target | Acceptable |
|----------|-----------|--------|------------|
| GET /inventory-stock | List 100 items | 500ms | 1000ms |
| GET /approvals/my-approvals | List approvals | 300ms | 800ms |
| POST /stock-issuance/create | Create request | 200ms | 500ms |
| POST /approvals/approve | Single item | 100ms | 300ms |

---

## Browser Testing

### Manual Test Cases

#### Test Case 1: Approval Dashboard Display
```
Steps:
1. Navigate to Approval Dashboard
2. Verify pending approvals are displayed
3. Verify submitted_by_name shows requester name
4. Verify item count matches request
5. Verify action buttons (Approve, Reject, Forward) visible

Expected:
✓ Dashboard loads without errors
✓ All approvals displayed
✓ Requester names show correctly
✓ All buttons clickable
```

#### Test Case 2: Stock Issuance Form
```
Steps:
1. Open Stock Issuance Form
2. Select item from dropdown
3. Enter quantity
4. Click Submit

Expected:
✓ Items dropdown shows all in-stock items
✓ Quantity field accepts numeric input
✓ Form validates before submit
✓ Success message appears
✓ Request created in database
```

#### Test Case 3: Per-Item Approval
```
Steps:
1. Go to approval dashboard
2. Open first pending request
3. For each item, choose decision (Approve/Reject)
4. If approve, enter quantity
5. Submit decision

Expected:
✓ Can approve with full/partial quantity
✓ Can reject with reason
✓ Can forward to next approver
✓ Decision saved correctly
✓ Workflow progresses
```

---

## Database Testing

### Data Integrity Tests

```sql
-- Test 1: Verify no orphaned approvals
SELECT a.* FROM approvals a
WHERE a.workflow_id NOT IN (SELECT id FROM approval_workflows)
AND a.is_deleted = 0
-- Expected: 0 rows

-- Test 2: Verify stock consistency
SELECT item_id, 
  SUM(quantity) as total_transactions,
  (SELECT quantity FROM current_inventory_stock WHERE item_id = ci.item_id) as current_qty
FROM stock_transactions ci
GROUP BY item_id
-- Expected: Results match

-- Test 3: Verify workflow status consistency
SELECT * FROM approval_workflows
WHERE status NOT IN ('pending', 'approved', 'rejected', 'completed')
-- Expected: 0 rows

-- Test 4: Verify soft delete consistency
SELECT COUNT(*) FROM item_masters WHERE is_deleted = 1 AND id IN (
  SELECT item_id FROM current_inventory_stock WHERE is_deleted = 0
)
-- Expected: 0 (no deleted items in active stock)
```

---

## Regression Testing

### Critical Paths Checklist

Before each deployment, verify:

- [ ] Stock Issuance: Create → Approve → Issue → Verify Stock Reduced
- [ ] Approvals: View → Approve/Reject → Verify Status Change
- [ ] Stock Levels: Verify current_inventory_stock updated correctly
- [ ] Audit Trail: Verify stock_transactions created
- [ ] User Permissions: Verify role-based access works
- [ ] API Responses: Verify all fields present
- [ ] Timestamps: Verify created_at, updated_at updated
- [ ] Error Handling: Verify proper error messages

---

## Test Execution

### Running Tests

```bash
# Run all unit tests
npm test

# Run integration tests
npm test -- integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Check code coverage
npm test -- --coverage
```

### Test Results

Generate HTML coverage report:
```bash
npm test -- --coverage --coverageReporters=html
```

Open `coverage/index.html` in browser to view results.

---

## Known Limitations

- **E2E tests:** Require test database reset between runs
- **Performance tests:** Results vary based on system load
- **Vendor bidding:** Currently mock data, real vendor integration pending
- **Email notifications:** Not tested (would require email service mock)

---

**Last Updated:** December 28, 2025  
**Version:** 1.0
