# Bug Fix: Missing Approval Items on Workflow Submission

## Problem Summary
When a supervisor opens an approval request, no items appear for them to make per-item decisions on. The approval workflow shows "pending" status but has no approval_items records in the database.

## Root Cause
The `/api/approvals/submit` endpoint (line 14215 in backend-server.cjs) was trying to INSERT records into the `approval_items` table with a malformed SQL statement:

**Buggy Code (lines 14280-14290):**
```javascript
.query(`
  INSERT INTO approval_items (
    request_approval_id, id, item_master_id, nomenclature,
    custom_item_name, requested_quantity, unit
  )
  VALUES (
    @approvalId, @itemId, @itemMasterId, @nomenclature,
    @customItemName, @requestedQuantity, @unit
  )
`)
```

### Issues:
1. **Trying to manually set `id` field**: The `approval_items.id` column has `DEFAULT (newid())` and is a PRIMARY KEY. Trying to set it manually conflicts with the auto-generation logic.
2. **Non-existent `unit` column**: The code references `@unit` and tries to insert into a `unit` column, but `stock_issuance_items` doesn't have a `unit` column.
3. **Not referenced in parameterized query**: The `@itemId` parameter was being passed but not used correctly.

## Solution
Fixed the INSERT statement to:
1. **Remove the manual `id` setting** - Let the database auto-generate it
2. **Remove the non-existent `unit` column** - Only include columns that exist
3. **Keep only necessary columns** - request_approval_id, item_master_id, nomenclature, custom_item_name, requested_quantity

**Fixed Code (lines 14280-14290):**
```javascript
.query(`
  INSERT INTO approval_items (
    request_approval_id, item_master_id, nomenclature,
    custom_item_name, requested_quantity
  )
  VALUES (
    @approvalId, @itemMasterId, @nomenclature,
    @customItemName, @requestedQuantity
  )
`)
```

## Files Changed
- `backend-server.cjs` - Lines 14266-14290
  - Line 14266: Removed `unit` from SELECT statement
  - Lines 14280-14290: Fixed INSERT statement

## Database Migration
For existing approvals without approval_items, run the provided `fix-missing-approval-items.cjs` script to back-populate missing records.

## Testing
After this fix:
1. ✅ When supervisor opens an approval request, items appear for per-item decisions
2. ✅ Supervisor can approve individual items
3. ✅ Supervisor can return individual items to requester
4. ✅ Returned items show up in requester's "Returned Requests" section
5. ✅ Requester can edit and resubmit returned items

## Impact
This fix enables the complete approval workflow:
- Supervisors can make granular per-item decisions (approve / reject / return / forward)
- Requesters can see which specific items were returned and why
- Requesters can update specific items and resubmit
