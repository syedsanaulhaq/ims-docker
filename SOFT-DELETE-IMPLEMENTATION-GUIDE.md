# Soft Delete Implementation Guide

## Overview
Soft delete marks records as deleted without removing them from the database. This preserves data integrity, enables audit trails, and allows data recovery.

## Benefits
- ✅ Data recovery - restore accidentally deleted records
- ✅ Audit trail - track what was deleted and when
- ✅ Referential integrity - no broken foreign keys
- ✅ Historical reporting - include deleted records in historical data
- ✅ Compliance - meet data retention requirements

---

## Phase 1: Database Schema Updates

### 1.1 Add Soft Delete Columns to All Tables

Add these columns to every main table:
```sql
is_deleted BIT NOT NULL DEFAULT 0           -- Deletion flag
deleted_at DATETIME NULL                    -- When deleted
deleted_by UNIQUEIDENTIFIER NULL            -- Who deleted (user_id)
```

### 1.2 Priority Tables (Start Here)

**Core Tables:**
- `tenders` (contract, spot-purchase, annual)
- `tender_items`
- `tender_vendors`
- `purchase_orders`
- `deliveries`
- `delivery_items`
- `stock_acquisitions`
- `stock_issuance_requests`
- `stock_return_requests`
- `item_masters` (✅ Already has is_deleted)
- `categories`
- `sub_categories`
- `vendors`
- `users`
- `warehouses`
- `wings`

### 1.3 SQL Script for All Tables

See `ADD-SOFT-DELETE-TO-ALL-TABLES.sql` (created separately)

---

## Phase 2: Backend API Changes

### 2.1 Modify DELETE Endpoints

**Before (Hard Delete):**
```javascript
// ❌ Old way - permanently deletes
router.delete('/api/tenders/:id', async (req, res) => {
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query('DELETE FROM tenders WHERE id = @id');
  res.json({ success: true });
});
```

**After (Soft Delete):**
```javascript
// ✅ New way - soft delete
router.delete('/api/tenders/:id', async (req, res) => {
  const userId = req.user?.id; // From auth middleware
  
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('userId', sql.UniqueIdentifier, userId)
    .query(`
      UPDATE tenders 
      SET is_deleted = 1,
          deleted_at = GETDATE(),
          deleted_by = @userId
      WHERE id = @id
    `);
    
  res.json({ success: true, message: 'Tender deleted successfully' });
});
```

### 2.2 Modify SELECT Queries

**Before:**
```javascript
// ❌ Shows deleted records
const result = await pool.request()
  .query('SELECT * FROM tenders');
```

**After:**
```javascript
// ✅ Excludes deleted records by default
const result = await pool.request()
  .query('SELECT * FROM tenders WHERE is_deleted = 0');
```

### 2.3 Add Restore Endpoint

```javascript
// Restore a soft-deleted record
router.post('/api/tenders/:id/restore', async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query(`
        UPDATE tenders 
        SET is_deleted = 0,
            deleted_at = NULL,
            deleted_by = NULL
        WHERE id = @id AND is_deleted = 1
      `);
      
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        error: 'Tender not found or not deleted' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Tender restored successfully' 
    });
  } catch (error) {
    console.error('Error restoring tender:', error);
    res.status(500).json({ error: 'Failed to restore tender' });
  }
});
```

### 2.4 Add Trash/Archive Endpoint

```javascript
// Get all soft-deleted records
router.get('/api/tenders/trash', async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT 
          t.*,
          u.username as deleted_by_name
        FROM tenders t
        LEFT JOIN users u ON t.deleted_by = u.id
        WHERE t.is_deleted = 1
        ORDER BY t.deleted_at DESC
      `);
      
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching deleted tenders:', error);
    res.status(500).json({ error: 'Failed to fetch deleted tenders' });
  }
});
```

### 2.5 Add Permanent Delete Endpoint (Admin Only)

```javascript
// Permanently delete (admin only)
router.delete('/api/tenders/:id/permanent', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify it's already soft deleted
    const check = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT is_deleted FROM tenders WHERE id = @id');
      
    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    if (!check.recordset[0].is_deleted) {
      return res.status(400).json({ 
        error: 'Must soft delete first before permanent deletion' 
      });
    }
    
    // Hard delete all related data
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM tender_items WHERE tender_id = @id');
      
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM tender_vendors WHERE tender_id = @id');
      
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM tenders WHERE id = @id');
      
    res.json({ 
      success: true, 
      message: 'Tender permanently deleted' 
    });
  } catch (error) {
    console.error('Error permanently deleting tender:', error);
    res.status(500).json({ error: 'Failed to permanently delete tender' });
  }
});
```

---

## Phase 3: Frontend Changes

### 3.1 Update Delete Handlers

**Before:**
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('Delete this tender?')) return;
  
  await fetch(`/api/tenders/${id}`, { method: 'DELETE' });
  loadTenders();
};
```

**After:**
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('Move this tender to trash? You can restore it later.')) return;
  
  try {
    const response = await fetch(`/api/tenders/${id}`, { 
      method: 'DELETE' 
    });
    
    if (response.ok) {
      toast.success('Tender moved to trash');
      loadTenders();
    }
  } catch (error) {
    toast.error('Failed to delete tender');
  }
};
```

### 3.2 Add Trash View Component

```typescript
// src/pages/TenderTrash.tsx
import React, { useState, useEffect } from 'react';

interface DeletedTender {
  id: string;
  reference_number: string;
  title: string;
  deleted_at: string;
  deleted_by_name: string;
}

export default function TenderTrash() {
  const [deletedTenders, setDeletedTenders] = useState<DeletedTender[]>([]);
  
  useEffect(() => {
    loadDeletedTenders();
  }, []);
  
  const loadDeletedTenders = async () => {
    const response = await fetch('/api/tenders/trash');
    const data = await response.json();
    setDeletedTenders(data);
  };
  
  const handleRestore = async (id: string) => {
    if (!confirm('Restore this tender?')) return;
    
    const response = await fetch(`/api/tenders/${id}/restore`, {
      method: 'POST'
    });
    
    if (response.ok) {
      alert('Tender restored successfully');
      loadDeletedTenders();
    }
  };
  
  const handlePermanentDelete = async (id: string) => {
    if (!confirm('PERMANENTLY delete this tender? This cannot be undone!')) return;
    
    const response = await fetch(`/api/tenders/${id}/permanent`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Tender permanently deleted');
      loadDeletedTenders();
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🗑️ Deleted Tenders</h1>
      
      {deletedTenders.length === 0 ? (
        <p className="text-gray-500">No deleted tenders</p>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Reference</th>
              <th className="border px-4 py-2">Title</th>
              <th className="border px-4 py-2">Deleted At</th>
              <th className="border px-4 py-2">Deleted By</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deletedTenders.map(tender => (
              <tr key={tender.id}>
                <td className="border px-4 py-2">{tender.reference_number}</td>
                <td className="border px-4 py-2">{tender.title}</td>
                <td className="border px-4 py-2">
                  {new Date(tender.deleted_at).toLocaleString()}
                </td>
                <td className="border px-4 py-2">{tender.deleted_by_name}</td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleRestore(tender.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                  >
                    ♻️ Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(tender.id)}
                    className="bg-red-700 text-white px-3 py-1 rounded"
                  >
                    🗑️ Delete Forever
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### 3.3 Add Trash Navigation Link

```typescript
// Add to your main navigation
<Link to="/tenders/trash" className="nav-link">
  🗑️ Trash
</Link>
```

---

## Phase 4: Implementation Checklist

### Step 1: Database (1-2 hours)
- [ ] Run `ADD-SOFT-DELETE-TO-ALL-TABLES.sql`
- [ ] Verify all tables have `is_deleted`, `deleted_at`, `deleted_by` columns
- [ ] Test queries with `WHERE is_deleted = 0`

### Step 2: Backend - Core Tables (2-4 hours)
- [ ] Update tenders DELETE endpoint to soft delete
- [ ] Update tenders GET endpoint to filter is_deleted=0
- [ ] Add tenders restore endpoint
- [ ] Add tenders trash endpoint
- [ ] Repeat for: purchase_orders, deliveries, stock_issuance, items

### Step 3: Backend - Related Tables (1-2 hours)
- [ ] Update categories, sub_categories, vendors, warehouses
- [ ] Update users (careful - might affect authentication)

### Step 4: Frontend (2-3 hours)
- [ ] Update delete confirmation messages
- [ ] Create Trash view page
- [ ] Add restore functionality
- [ ] Add trash navigation links
- [ ] Test delete → restore → delete flow

### Step 5: Testing (2-3 hours)
- [ ] Test soft delete for each entity
- [ ] Test restore for each entity
- [ ] Test that GET queries exclude deleted records
- [ ] Test foreign key relationships with deleted records
- [ ] Test permanent delete (admin only)

### Step 6: Documentation (1 hour)
- [ ] Document soft delete policy
- [ ] Train users on restore functionality
- [ ] Document permanent delete process (admin)

---

## Important Considerations

### 1. Cascading Soft Deletes

When deleting a tender, should related items also be soft deleted?

**Option A: Cascade soft delete (Recommended)**
```javascript
// When soft deleting a tender, also soft delete its items
router.delete('/api/tenders/:id', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  
  try {
    // Soft delete tender
    await transaction.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .input('userId', sql.UniqueIdentifier, req.user.id)
      .query(`
        UPDATE tenders 
        SET is_deleted = 1, deleted_at = GETDATE(), deleted_by = @userId
        WHERE id = @id
      `);
    
    // Cascade to related items
    await transaction.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .input('userId', sql.UniqueIdentifier, req.user.id)
      .query(`
        UPDATE tender_items 
        SET is_deleted = 1, deleted_at = GETDATE(), deleted_by = @userId
        WHERE tender_id = @id
      `);
    
    await transaction.commit();
    res.json({ success: true });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});
```

### 2. JOIN Queries

Update JOINs to filter deleted records:

```sql
-- Before
SELECT t.*, ti.* 
FROM tenders t
INNER JOIN tender_items ti ON ti.tender_id = t.id

-- After
SELECT t.*, ti.* 
FROM tenders t
INNER JOIN tender_items ti ON ti.tender_id = t.id
WHERE t.is_deleted = 0 AND ti.is_deleted = 0
```

### 3. COUNT Queries

Exclude deleted records from counts:

```sql
-- Before
SELECT COUNT(*) as total FROM tenders

-- After
SELECT COUNT(*) as total FROM tenders WHERE is_deleted = 0
```

### 4. Unique Constraints

If you have unique constraints (e.g., on reference_number), consider:

**Option A: Allow same reference after delete**
```sql
-- Create filtered unique index
CREATE UNIQUE INDEX UQ_Tenders_ReferenceNumber 
ON tenders(reference_number) 
WHERE is_deleted = 0;
```

**Option B: Append deletion marker**
```javascript
// Append timestamp to reference on delete
UPDATE tenders 
SET is_deleted = 1,
    deleted_at = GETDATE(),
    reference_number = reference_number + '_DELETED_' + FORMAT(GETDATE(), 'yyyyMMddHHmmss')
WHERE id = @id
```

### 5. Auto-Cleanup (Optional)

Permanently delete records older than X days:

```sql
-- Stored procedure to clean up old soft-deleted records
CREATE PROCEDURE CleanupOldDeletedRecords
  @DaysOld INT = 90  -- Default: 90 days
AS
BEGIN
  -- Delete tenders deleted more than @DaysOld days ago
  DELETE FROM tenders 
  WHERE is_deleted = 1 
    AND deleted_at < DATEADD(DAY, -@DaysOld, GETDATE());
    
  PRINT 'Cleaned up records older than ' + CAST(@DaysOld AS VARCHAR) + ' days';
END
GO

-- Schedule this with SQL Server Agent or run manually
```

---

## Migration Strategy

### For Existing Data

If you already have data and want to add soft delete:

```sql
-- 1. Add columns (null allowed initially)
ALTER TABLE tenders ADD is_deleted BIT NULL;
ALTER TABLE tenders ADD deleted_at DATETIME NULL;
ALTER TABLE tenders ADD deleted_by UNIQUEIDENTIFIER NULL;

-- 2. Set default for existing records
UPDATE tenders SET is_deleted = 0 WHERE is_deleted IS NULL;

-- 3. Make is_deleted NOT NULL with default
ALTER TABLE tenders ALTER COLUMN is_deleted BIT NOT NULL;
ALTER TABLE tenders ADD CONSTRAINT DF_Tenders_IsDeleted DEFAULT 0 FOR is_deleted;
```

---

## Example: Complete Implementation for Tenders

See `server/routes/tenders-soft-delete-example.cjs` for a complete working example.

---

## Questions to Consider

1. **Who can restore deleted records?**
   - Only the user who deleted?
   - Any admin?
   - Only specific roles?

2. **How long to keep soft-deleted records?**
   - Forever?
   - 30/60/90 days?
   - Until manually purged?

3. **Should deleted records be visible in reports?**
   - Historical reports: Yes (with indicator)
   - Current reports: No

4. **Permanent delete permission?**
   - System admin only?
   - Requires approval?
   - Audit log required?

---

## Next Steps

1. Review this guide with your team
2. Run the SQL script to add columns (Phase 1)
3. Pick one entity (e.g., categories) to implement first
4. Test thoroughly
5. Roll out to other entities
6. Train users on new trash/restore functionality

Would you like me to:
- Create the SQL script for all tables?
- Implement soft delete for a specific route (e.g., tenders)?
- Create the trash view component?
