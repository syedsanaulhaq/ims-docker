# Troubleshooting Guide

Common issues and solutions for IMS system.

---

## Database Issues

### Issue: Cannot Connect to Database

**Error Message:**
```
Error: ConnectionError: Failed to connect to server
```

**Solutions:**

1. **Verify SQL Server is Running**
   ```bash
   # Check if SQL Server service is running
   Get-Service | Where-Object {$_.Name -like "*SQL*"} | Select Name, Status
   
   # Start if stopped
   Start-Service MSSQLSERVER
   ```

2. **Check Connection String**
   ```javascript
   // In backend-server.cjs, verify:
   server: 'localhost',
   database: 'InventoryManagementDB',
   user: 'your_username',
   password: 'your_password'
   ```

3. **Verify Database Exists**
   ```sql
   SELECT name FROM sys.databases WHERE name = 'InventoryManagementDB'
   -- Should return 1 row
   ```

4. **Check Network Connection**
   ```bash
   # Test network connectivity
   ping localhost
   telnet localhost 1433
   ```

---

### Issue: Tables Not Found

**Error:**
```
Error: Invalid object name 'item_masters'
```

**Solutions:**

1. **Verify Tables Exist**
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_SCHEMA = 'dbo'
   -- Should return 61 tables
   ```

2. **Check Table Permissions**
   ```sql
   -- Grant necessary permissions
   GRANT SELECT, INSERT, UPDATE, DELETE ON item_masters TO [your_user]
   ```

3. **Recreate Table if Necessary**
   ```sql
   -- Backup data first
   SELECT * INTO item_masters_backup FROM item_masters
   
   -- Recreate table from schema
   -- (Use migration script)
   ```

---

## Frontend Issues

### Issue: Stock Items Dropdown Shows Empty

**Problem:** Stock Issuance form shows no items in dropdown

**Solution:**

1. **Check current_inventory_stock Table**
   ```sql
   SELECT COUNT(*) FROM current_inventory_stock 
   WHERE is_deleted = 0
   -- Should return > 0
   ```

2. **Populate Stock If Empty**
   ```sql
   INSERT INTO current_inventory_stock (item_id, quantity, reorder_level, reorder_quantity)
   SELECT id, 100, 20, 50 FROM item_masters WHERE is_deleted = 0
   ```

3. **Verify API Endpoint**
   ```bash
   # Test API directly
   curl http://localhost:3000/api/inventory-stock
   # Should return JSON array of items
   ```

4. **Check Browser Console**
   - Open F12 → Console tab
   - Look for JavaScript errors
   - Check Network tab for failed requests

---

### Issue: Approval Dashboard Shows "Submitted by: undefined"

**Problem:** Requester name not displaying in approval dashboard

**Solution:**

This was already fixed. Verify the fix is in place:

```javascript
// backend-server.cjs line ~17086
router.get('/api/approvals/my-approvals', async (req, res) => {
  // Should include:
  approval.submitted_by_name = approval.requester_name;
  // This maps the field for frontend compatibility
});
```

If issue persists:

1. **Restart Backend Server**
   ```bash
   # Stop current process (Ctrl+C)
   # Restart:
   node backend-server.cjs
   ```

2. **Clear Browser Cache**
   - Ctrl + Shift + Delete
   - Clear all cookies and cache
   - Refresh page

3. **Check Database**
   ```sql
   SELECT submitted_by_name FROM approvals LIMIT 1
   -- Should have value, not NULL
   ```

---

### Issue: TypeScript Compilation Errors

**Error:**
```
error TS2322: Type 'string' is not assignable to type 'number'
```

**Solutions:**

1. **Run Build Check**
   ```bash
   npm run build
   # Shows all TypeScript errors
   ```

2. **Check tsconfig.app.json**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```

3. **Common Fixes**

   **Issue:** Accessing non-existent method
   ```typescript
   // ✗ Wrong
   result.approveApproval()  // Method doesn't exist
   
   // ✓ Correct
   approveRequest()  // Use actual method
   ```

   **Issue:** Accessing non-existent property
   ```typescript
   // ✗ Wrong
   if (result.success)  // RequestApproval doesn't have this
   
   // ✓ Correct
   if (result.id)  // Use actual property
   ```

   **Issue:** console.log in JSX
   ```typescript
   // ✗ Wrong - returns void
   return <div>{console.log('test')}</div>
   
   // ✓ Correct
   return <div>content</div>
   ```

4. **Type Casting When Needed**
   ```typescript
   // Cast to 'any' for known dynamic objects
   const item = approval.item as any;
   const value = item.decision_type;
   ```

---

## API Issues

### Issue: API Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Change Port in backend-server.cjs**
   ```javascript
   const PORT = 3001;  // Change from 3000
   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
   ```

2. **Find and Kill Process Using Port 3000**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -i :3000
   kill -9 <PID>
   ```

---

### Issue: CORS Error When Calling API

**Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

1. **Add CORS Headers in API**
   ```javascript
   // backend-server.cjs
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
   });
   ```

2. **Verify API URL in Frontend**
   ```typescript
   // Check services
   const baseUrl = process.env.API_URL || 'http://localhost:3000';
   // Should match backend URL
   ```

---

### Issue: 401 Unauthorized Error

**Error:**
```
Error: 401 Unauthorized - Invalid or missing authentication
```

**Solutions:**

1. **Verify User Authentication**
   ```javascript
   // Ensure user context is set before API call
   const user = getCurrentUser();  // Should return user object
   if (!user) {
     // Redirect to login
   }
   ```

2. **Check User Permissions**
   ```sql
   SELECT u.UserName, r.Name 
   FROM AspNetUsers u
   JOIN AspNetUserRoles ur ON u.Id = ur.UserId
   JOIN AspNetRoles r ON ur.RoleId = r.Id
   WHERE u.UserName = @username
   ```

---

### Issue: 404 Not Found Error

**Error:**
```
Error: 404 Not Found - /api/nonexistent
```

**Solutions:**

1. **Verify Endpoint Exists in backend-server.cjs**
   ```bash
   # Search for endpoint
   grep -n "app.get.*'/api/resource'" backend-server.cjs
   ```

2. **Check Exact Path and Method**
   ```
   ✗ Wrong: POST /api/inventory-stock
   ✓ Correct: GET /api/inventory-stock
   ```

3. **Verify Server is Running**
   ```bash
   curl http://localhost:3000/api/inventory-stock
   ```

---

## Performance Issues

### Issue: Slow API Response Time

**Problem:** API takes > 5 seconds to respond

**Solutions:**

1. **Check Database Query Performance**
   ```sql
   -- Set Statistics
   SET STATISTICS IO ON
   SET STATISTICS TIME ON
   
   -- Run query
   SELECT * FROM approvals WHERE user_id = @userId
   
   -- Review execution plan
   ```

2. **Add Database Indexes**
   ```sql
   CREATE INDEX idx_user_id ON approvals(user_id)
   CREATE INDEX idx_status ON approvals(status)
   ```

3. **Optimize Query**
   ```javascript
   // Bad: N+1 query problem
   const approvals = await getAllApprovals();
   approvals.forEach(a => {
     a.userName = getUserName(a.user_id);  // 1 query per approval
   });

   // Good: Single JOIN query
   SELECT a.*, u.UserName FROM approvals a
   JOIN AspNetUsers u ON a.user_id = u.Id
   ```

4. **Add Pagination**
   ```javascript
   // Instead of loading all records
   GET /api/approvals?limit=10&page=1
   ```

---

### Issue: Frontend Loads Slowly

**Solutions:**

1. **Check Network Tab**
   - F12 → Network
   - Look for slow requests
   - Check bundle size

2. **Enable Gzip Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

3. **Lazy Load Components**
   ```typescript
   // Instead of importing everything
   const ApprovalPanel = lazy(() => import('./ApprovalPanel'));
   ```

---

## Data Issues

### Issue: Inconsistent Stock Quantities

**Problem:** current_inventory_stock doesn't match actual transactions

**Solution:**

```sql
-- Identify discrepancies
SELECT 
  cis.item_id,
  cis.quantity as system_qty,
  SUM(CASE 
    WHEN st.transaction_type = 'IN' THEN st.quantity
    WHEN st.transaction_type = 'OUT' THEN -st.quantity
    ELSE 0 END) as calculated_qty
FROM current_inventory_stock cis
LEFT JOIN stock_transactions st ON cis.item_id = st.item_id
GROUP BY cis.item_id, cis.quantity
HAVING cis.quantity != SUM(CASE 
  WHEN st.transaction_type = 'IN' THEN st.quantity
  WHEN st.transaction_type = 'OUT' THEN -st.quantity
  ELSE 0 END)

-- Fix by reconciliation
-- Adjust based on physical count verification
```

---

### Issue: Orphaned Records (No Parent)

**Problem:** Approval exists but workflow deleted

**Solution:**

```sql
-- Find orphaned approvals
SELECT * FROM approvals 
WHERE workflow_id NOT IN (SELECT id FROM approval_workflows)
AND is_deleted = 0

-- Soft delete orphaned records
UPDATE approvals 
SET is_deleted = 1 
WHERE workflow_id NOT IN (SELECT id FROM approval_workflows)
```

---

## Deployment Issues

### Issue: Code Deployment Failed

**Solutions:**

1. **Check Git Status**
   ```bash
   git status
   git log --oneline -5
   ```

2. **Verify All Tests Pass**
   ```bash
   npm test
   npm run build
   ```

3. **Database Migrations**
   ```bash
   # Ensure all migrations applied
   npm run migrate:latest
   ```

---

### Issue: Changes Not Reflecting After Deployment

**Solutions:**

1. **Clear Browser Cache**
   - Ctrl + Shift + Delete
   - Clear all browsing data
   - Reload page

2. **Verify New Code Running**
   ```bash
   # Check Git branch
   git branch
   # Verify latest commit deployed
   git log -1
   ```

3. **Restart Services**
   ```bash
   # Stop backend
   Ctrl+C in terminal
   # Restart
   node backend-server.cjs
   ```

---

## Getting Help

### Debug Information to Collect

When reporting issues, provide:

1. **Error message** (full text)
2. **Browser console errors** (F12 → Console)
3. **Network tab request/response** (F12 → Network)
4. **Backend server logs** (terminal output)
5. **SQL error message** (if database related)
6. **System info** (Windows/Mac/Linux, Node version, SQL Server version)
7. **Steps to reproduce** (exact sequence of actions)

### Contact Support

For issues not resolved by this guide:

1. Check [DEVELOPMENT-STANDARDS.md](DEVELOPMENT-STANDARDS.md) for coding issues
2. Review [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md) for data structure questions
3. Check [API-REFERENCE.md](API-REFERENCE.md) for endpoint issues
4. Check GitHub Issues: [syedsanaulhaq/ims-v2/issues](https://github.com/syedsanaulhaq/ims-v2/issues)

---

**Last Updated:** December 28, 2025  
**Version:** 1.0
