# Development Standards & Guidelines

Complete guide for developing the IMS system. All developers and AI assistants must follow these standards.

## 1. Architecture Overview

### 5-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: UI (React Components - TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Services (API Client Layer)                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: API (Express Routes & Business Logic)             │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Data Access (SQL Queries & Transactions)          │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Database (SQL Server - InventoryManagementDB)     │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns** - Each layer has specific responsibility
2. **DRY (Don't Repeat Yourself)** - Reuse code across features
3. **SOLID Principles** - Clean, maintainable code
4. **Type Safety** - Strict TypeScript typing
5. **Error Handling** - Proper error propagation

## 2. Frontend Standards

### Component Structure

```typescript
// Component file: src/components/ComponentName.tsx
import React from 'react';
import { ServiceName } from '../services/ServiceName';

interface ComponentProps {
  prop1: string;
  prop2?: number;
  onAction?: (data: any) => void;
}

export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2, onAction }) => {
  const [state, setState] = React.useState<any>(null);

  React.useEffect(() => {
    // Side effects here
  }, []);

  return (
    <div className="component">
      {/* JSX here */}
    </div>
  );
};
```

### Naming Conventions

- **Components:** PascalCase (ApprovalDashboard, StockForm)
- **Functions/Variables:** camelCase (handleApprove, fetchItems)
- **Files:** Match component name (ApprovalDashboard.tsx)
- **Constants:** UPPER_SNAKE_CASE (MAX_ITEMS, DEFAULT_TIMEOUT)
- **Interfaces/Types:** PascalCase (ComponentProps, RequestApproval)

### TypeScript Rules

- Always define prop types with interfaces
- Use strict null checking (`strictNullChecks: true`)
- Avoid `any` type (use `unknown` if necessary)
- Add type annotations to function parameters and return types
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### Component Organization

```
src/
├── components/
│   ├── Approvals/
│   │   ├── ApprovalDashboard.tsx
│   │   ├── PerItemApprovalPanel.tsx
│   │   └── index.ts
│   ├── StockManagement/
│   │   ├── StockForm.tsx
│   │   └── index.ts
│   └── Common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── index.ts
├── services/
│   ├── ApprovalForwardingService.ts
│   ├── StockService.ts
│   └── index.ts
├── types/
│   ├── requests.ts
│   ├── approvals.ts
│   └── index.ts
└── pages/
    ├── Dashboard.tsx
    └── index.ts
```

## 3. Backend Standards (Node.js/Express)

### API Endpoint Pattern

```javascript
// backend-server.cjs
const express = require('express');
const router = express.Router();

// GET endpoint
router.get('/api/resource', async (req, res) => {
  try {
    // Validate input
    // Query database
    // Return response
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST endpoint
router.post('/api/resource', async (req, res) => {
  try {
    const { param1, param2 } = req.body;
    // Validate inputs
    // Execute business logic
    // Return response with 201 status
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### Status Codes

- `200` - OK (successful GET)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation failure)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `500` - Server Error

### Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { /* resource data */ },
  "message": "Operation completed successfully"
}

// Error response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### SQL Query Patterns

```javascript
// Basic query
const result = await pool.request()
  .input('id', sql.Int, id)
  .query('SELECT * FROM table WHERE id = @id');

// Transaction
const transaction = new sql.Transaction(pool);
try {
  await transaction.begin();
  // Multiple operations
  await transaction.commit();
} catch (err) {
  await transaction.rollback();
}

// Parameterized queries ALWAYS to prevent SQL injection
const { userId, itemId } = req.body;
const result = await pool.request()
  .input('userId', sql.Int, userId)
  .input('itemId', sql.Int, itemId)
  .query('INSERT INTO approvals VALUES (@userId, @itemId)');
```

## 4. Database Standards

### Naming Conventions

- **Tables:** snake_case (item_masters, stock_issuance_requests)
- **Columns:** snake_case (created_at, updated_at, is_deleted)
- **Primary Keys:** id (INT IDENTITY)
- **Foreign Keys:** table_name_id (item_id, user_id)

### Required Columns (All Tables)

```sql
id INT PRIMARY KEY IDENTITY(1,1),
created_at DATETIME DEFAULT GETDATE(),
updated_at DATETIME DEFAULT GETDATE(),
is_deleted BIT DEFAULT 0  -- Soft delete
```

### Data Types

- **Integers:** INT or BIGINT
- **Decimals:** DECIMAL(10,2) for prices
- **Strings:** VARCHAR(MAX) or NVARCHAR(MAX)
- **Dates:** DATETIME or DATETIME2
- **Booleans:** BIT (0 or 1)
- **JSON:** NVARCHAR(MAX) with JSON validation

### Query Best Practices

```sql
-- Always filter deleted records
SELECT * FROM item_masters 
WHERE is_deleted = 0

-- Use transactions for multiple operations
BEGIN TRANSACTION
  UPDATE current_inventory_stock SET quantity = quantity - @qty WHERE item_id = @itemId
  INSERT INTO stock_transactions VALUES (...)
COMMIT

-- Create indexes for frequently queried columns
CREATE INDEX idx_user_id ON approvals(user_id)
CREATE INDEX idx_status ON requests(status)
```

## 5. API Design Standards

### RESTful Endpoints

```
GET    /api/resource          - List all
GET    /api/resource/:id      - Get specific
POST   /api/resource          - Create
PUT    /api/resource/:id      - Update
DELETE /api/resource/:id      - Delete
```

### Request Validation

```javascript
router.post('/api/request', (req, res) => {
  const { required_field, optional_field } = req.body;
  
  // Validate required fields
  if (!required_field) {
    return res.status(400).json({ 
      error: 'required_field is required' 
    });
  }
  
  // Validate field types
  if (typeof required_field !== 'string') {
    return res.status(400).json({ 
      error: 'required_field must be string' 
    });
  }
  
  // Process valid request
  // ...
});
```

### Pagination

```javascript
router.get('/api/resource', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const result = await pool.request()
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
      SELECT * FROM resource 
      WHERE is_deleted = 0
      ORDER BY created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);
  
  res.json({
    data: result.recordset,
    page,
    limit,
    total: result.recordsets[1][0].count
  });
});
```

## 6. Testing Standards

### Minimum Coverage

- **Unit Tests:** 80% of functions
- **Integration Tests:** All major workflows
- **E2E Tests:** All 4 core workflows

### Testing Tools

- **Frontend:** Jest + React Testing Library
- **Backend:** Jest + Supertest
- **Database:** Use test database

### Test Naming

```typescript
describe('ApprovalService', () => {
  test('should approve request when user has permission', () => {
    // Arrange
    const approval = { id: 1, status: 'pending' };
    
    // Act
    const result = service.approve(approval);
    
    // Assert
    expect(result.status).toBe('approved');
  });
});
```

## 7. Git Workflow

### Branch Naming

- `main` - Production branch
- `stable-nov11-production` - Stable release branch
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/documentation` - Documentation updates

### Commit Messages

```
format: type(scope): description

type:
  - feat: New feature
  - fix: Bug fix
  - docs: Documentation
  - style: Code style
  - refactor: Code refactor
  - test: Test additions
  - chore: Build/config

scope: Component or area affected

examples:
  - feat(approvals): Add per-item approval decisions
  - fix(dashboard): Resolve submitted_by_name display
  - docs: Update API reference
```

### Commit Process

```bash
# Add all changes
git add .

# Commit with proper message
git commit -m "feat(approvals): Add new feature"

# Push to branch
git push origin feature/feature-name

# Create Pull Request for code review
```

### PR Requirements

- [ ] Code follows standards
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] PR description explains changes

## 8. Code Quality

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Error Handling

```typescript
// Good error handling
try {
  const result = await service.fetchData();
  return result;
} catch (error) {
  console.error('Failed to fetch data:', error);
  throw new Error(`Data fetch failed: ${error.message}`);
}

// In components
try {
  await handleApproval();
} catch (error) {
  setError((error as Error).message);
  showNotification('error', 'Operation failed');
}
```

### Performance

- Lazy load components
- Memoize expensive computations
- Paginate large lists
- Use efficient queries
- Minimize bundle size

## 9. Security Standards

### Authentication

- All requests require user authentication
- JWT tokens with expiration
- Refresh tokens for extended sessions
- Secure password hashing (bcrypt)

### Authorization

- Role-based access control (RBAC)
- Check permissions before data access
- Validate user ownership of resources
- Log unauthorized attempts

### Data Protection

- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize user input)
- CSRF protection (tokens)
- Secure HTTPS only
- Encrypt sensitive data

## 10. Documentation Standards

### Code Comments

```typescript
/**
 * Fetches pending approvals for the current user
 * @param userId - The user's ID
 * @param status - Optional filter by status
 * @returns Promise of approval array
 * @throws {Error} If user not found
 */
async function getMyApprovals(userId: number, status?: string) {
  // Implementation
}
```

### README Files

Each feature/component should have README with:
- Purpose and overview
- Usage examples
- Props/parameters
- Return values
- Error handling

### API Documentation

Each endpoint should document:
- Method and path
- Authentication required
- Request parameters
- Response format
- Error codes and messages
- Example requests/responses

## 11. Service Layer Pattern

### Creating Services

```typescript
// src/services/ApprovalForwardingService.ts
export class ApprovalForwardingService {
  private baseUrl = process.env.API_URL || 'http://localhost:3000';

  async approveRequest(approvalId: number, action: ApprovalAction): Promise<RequestApproval> {
    const response = await fetch(`${this.baseUrl}/api/approvals/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, action })
    });
    
    if (!response.ok) {
      throw new Error(`Approval failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  async rejectRequest(approvalId: number, action: ApprovalAction): Promise<RequestApproval> {
    // Similar pattern
  }

  async forwardRequest(approvalId: number, action: ApprovalAction): Promise<RequestApproval> {
    // Similar pattern
  }
}
```

## 12. Important Information

### Database Connection

- **Database:** InventoryManagementDB (SQL Server)
- **Connection string:** Located in backend-server.cjs
- **Always use:** Parameterized queries for all SQL operations

### Service Methods (ApprovalForwardingService)

```typescript
// Available methods:
- approveRequest(approvalId, action) // Returns RequestApproval type
- rejectRequest(approvalId, action)  // Returns RequestApproval type
- forwardRequest(approvalId, action) // Returns RequestApproval type
- getMyApprovalsByStatus(userId, status)

// RequestApproval return type has:
{
  id: number,
  current_status: string,
  // No success/error fields - check response status only
}
```

### Component Type Casting

When accessing dynamic properties:

```typescript
// Use 'as any' casting for known objects
const item = approval.item as any;
const decisionType = item.decision_type;

// Use optional chaining for safety
const value = object?.property?.nested;
```

### Avoiding Common Errors

1. ❌ Don't use `console.log()` in JSX return statements
   ```typescript
   // Wrong:
   return <div>{console.log('test')}</div>
   
   // Correct:
   return <div>test</div>
   ```

2. ❌ Don't reference non-existent service methods
   ```typescript
   // Wrong:
   approveApproval() // Method doesn't exist
   
   // Correct:
   approveRequest() // Use actual method
   ```

3. ❌ Don't check non-existent properties on response
   ```typescript
   // Wrong:
   if (result.success) // RequestApproval doesn't have success field
   
   // Correct:
   if (result.id) // Check actual properties
   ```

## 13. Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] 0 TypeScript errors
- [ ] Code reviewed and approved
- [ ] Database migrations run
- [ ] Documentation updated
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Backup created
- [ ] Rollback plan ready

## 14. Useful Commands

```bash
# Frontend development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run linter

# Backend
node backend-server.cjs # Start API server
npm test               # Run tests

# Git workflow
git status             # Check changes
git add .              # Stage all changes
git commit -m "msg"    # Commit changes
git push origin branch # Push to branch
git pull origin branch # Pull latest changes
```

---

**Last Updated:** December 28, 2025  
**Version:** 1.0  
**Maintainers:** Development Team
