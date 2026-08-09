# Soft Delete System - Usage Guide

## ✅ What's Implemented

The system now uses **soft delete** instead of permanently deleting records. When you delete any record, it's marked as `is_deleted = 1` instead of being removed from the database.

---

## 📋 How It Works

### 1. **Deleting Records** (Same as before - no frontend changes needed)

```http
DELETE /api/vendors/:id
DELETE /api/items-master/:id
DELETE /api/categories/:id
DELETE /api/tenders/:id
DELETE /api/annual-tenders/:id
DELETE /api/purchase-orders/:id
DELETE /api/deliveries/:id
DELETE /api/stock-issuance/:id
DELETE /api/stock-returns/:id
DELETE /api/reorder-requests/:id
```

**What happens:**
- Record is marked as `is_deleted = 1`
- `deleted_at` timestamp is set
- `deleted_by` is set to the user who deleted it
- Child records are cascade-deleted automatically

---

### 2. **Viewing Active Records** (Default behavior)

```http
GET /api/vendors
GET /api/items-master
GET /api/categories
GET /api/tenders
```

**Default:**  Shows only active records (`is_deleted = 0`)

---

### 3. **Viewing Deleted Records** (NEW!)

Add `?includeDeleted=true` to see **both active AND deleted** records:

```http
GET /api/vendors?includeDeleted=true
GET /api/items-master?includeDeleted=true
GET /api/categories?includeDeleted=true
GET /api/tenders?includeDeleted=true
```

**Response includes:**
```json
{
  "id": "...",
  "name": "...",
  "is_deleted": 1,
  "deleted_at": "2026-02-24T09:27:32.000Z",
  "deleted_by": "user-id-here"
}
```

---

### 4. **Restoring Deleted Records** (NEW!)

```http
POST /api/vendors/:id/restore
POST /api/items-master/:id/restore
POST /api/categories/:id/restore
POST /api/sub-categories/sub/:id/restore
POST /api/tenders/:id/restore
```

**What happens:**
- Sets `is_deleted = 0`
- Clears `deleted_at` and `deleted_by`
- For tenders: also restores all tender items and vendors
- Returns the restored record

**Example Response:**
```json
{
  "success": true,
  "message": "✅ Vendor restored successfully",
  "vendor": {
    "id": "...",
    "vendor_name": "Restored Vendor",
    "is_deleted": 0,
    "deleted_at": null
  }
}
```

---

## 🎯 Updated Endpoints

### ✅ Vendors
- `GET /api/vendors` - Filters deleted by default
- `GET /api/vendors?includeDeleted=true` - Shows all including deleted
- `DELETE /api/vendors/:id` - Soft delete
- `POST /api/vendors/:id/restore` - Restore deleted vendor

### ✅ Items
- `GET /api/items-master` - Filters deleted by default
- `GET /api/items-master?includeDeleted=true` - Shows all including deleted
- `DELETE /api/items-master/:id` - Soft delete
- `POST /api/items-master/:id/restore` - Restore deleted item

### ✅ Categories
- `GET /api/categories` - Filters deleted by default
- `GET /api/categories?includeDeleted=true` - Shows all including deleted
- `DELETE /api/categories/:id` - Soft delete
- `POST /api/categories/:id/restore` - Restore deleted category

### ✅ Sub-Categories
- `GET /api/sub-categories/list/all` - Filters deleted by default
- `GET /api/sub-categories/list/all?includeDeleted=true` - Shows all
- `DELETE /api/sub-categories/:id` - Soft delete
- `POST /api/sub-categories/sub/:id/restore` - Restore deleted sub-category

### ✅ Tenders
- `GET /api/tenders` - Filters deleted by default
- `GET /api/tenders?includeDeleted=true` - Shows all including deleted
- `DELETE /api/tenders/:id` - Soft delete (cascades to items & vendors)
- `POST /api/tenders/:id/restore` - Restore deleted tender (cascades restore)

### ✅ Annual Tenders
- `DELETE /api/annual-tenders/:id` - Soft delete (cascades to vendors & groups)
- `DELETE /api/annual-tenders/groups/:id` - Soft delete (cascades to group items)
- `POST /api/annual-tenders/:id/restore` - Restore deleted annual tender (cascades restore)

### ✅ Purchase Orders
- `DELETE /api/purchase-orders/:id` - Soft delete (cascades to PO items)
- `POST /api/purchase-orders/:id/restore` - Restore deleted PO (cascades restore)

### ✅ Deliveries
- `DELETE /api/deliveries/:id` - Soft delete (cascades to items & acquisitions)
- `POST /api/deliveries/:id/restore` - Restore deleted delivery (cascades restore)

### ✅ Stock Issuance
- `DELETE /api/stock-issuance/:id` - Soft delete (cascades to items)
- `POST /api/stock-issuance/:id/restore` - Restore deleted issuance (cascades restore)

### ✅ Stock Returns
- `DELETE /api/stock-returns/:id` - Soft delete (cascades to items)
- `POST /api/stock-returns/:id/restore` - Restore deleted stock return (cascades restore)

### ✅ Reorder Requests
- `DELETE /api/reorder-requests/:id` - Soft delete
- `POST /api/reorder-requests/:id/restore` - Restore deleted reorder request

---

## 🔧 Frontend Implementation Examples

### Example 1: Show Deleted Items Toggle

```javascript
const [showDeleted, setShowDeleted] = useState(false);

// Fetch items
const fetchItems = async () => {
  const url = showDeleted 
    ? '/api/items-master?includeDeleted=true' 
    : '/api/items-master';
  const { data } = await axios.get(url);
  setItems(data);
};

// In your JSX
<Checkbox 
  checked={showDeleted}
  onChange={(e) => setShowDeleted(e.target.checked)}
  label="Show deleted items"
/>
<Table dataSource={items.filter(item => !item.is_deleted || showDeleted)} />
```

### Example 2: Trash View

```javascript
// Dedicated trash page
const TrashPage = () => {
  const [deletedItems, setDeletedItems] = useState([]);

  useEffect(() => {
    axios.get('/api/items-master?includeDeleted=true')
      .then(({ data }) => {
        // Filter only deleted items
        setDeletedItems(data.items.filter(item => item.is_deleted === 1));
      });
  }, []);

  const handleRestore = async (id) => {
    await axios.post(`/api/items-master/${id}/restore`);
    message.success('Item restored!');
    // Refresh list
  };

  return (
    <Table 
      dataSource={deletedItems}
      columns={[
        { title: 'Name', dataIndex: 'nomenclature' },
        { title: 'Deleted At', dataIndex: 'deleted_at' },
        { 
          title: 'Actions', 
          render: (_, record) => (
            <Button onClick={() => handleRestore(record.id)}>
              Restore
            </Button>
          )
        }
      ]}
    />
  );
};
```

### Example 3: Show Deleted Badge

```javascript
const VendorCard = ({ vendor }) => (
  <Card>
    <h3>{vendor.vendor_name}</h3>
    {vendor.is_deleted === 1 && (
      <Tag color="red">
        Deleted on {new Date(vendor.deleted_at).toLocaleDateString()}
      </Tag>
    )}
    {vendor.is_deleted === 1 && (
      <Button onClick={() => restoreVendor(vendor.id)}>
        Restore
      </Button>
    )}
  </Card>
);
```

---

## 🧪 Testing Checklist

### Test Delete
1. ✅ Delete a vendor → Check it's marked `is_deleted = 1` in database
2. ✅ Verify vendor doesn't show in GET /api/vendors
3. ✅ Verify vendor DOES show in GET /api/vendors?includeDeleted=true

### Test Cascade Delete
1. ✅ Delete a tender → Verify tender_items and tender_vendors also soft-deleted
2. ✅ Delete a purchase order → Verify purchase_order_items also soft-deleted

### Test Restore
1. ✅ Restore a deleted vendor → Check `is_deleted = 0` in database
2. ✅ Verify vendor shows in GET /api/vendors again
3. ✅ Restore a tender → Verify tender_items and tender_vendors also restored

### Test Filters
1. ✅ Create item, delete it → Should not appear in list
2. ✅ Check with ?includeDeleted=true → Should appear with is_deleted flag
3. ✅ Check related queries (like tender items) don't show deleted items

---

## ⚠️ Important Notes

1. **Deleted records are still in the database** - they're just hidden from normal queries
2. **Cascade deletes work automatically** - deleting a parent soft-deletes all children
3. **Can't use deleted records** - queries filter them out (e.g., can't assign deleted vendor to a tender)
4. **Restore is reversible** - you can restore and delete again as needed
5. **User tracking** - System tracks who deleted what and when

---

## 📊 Database Schema

Every main table now has:
```sql
is_deleted BIT NOT NULL DEFAULT 0
deleted_at DATETIME NULL
deleted_by UNIQUEIDENTIFIER NULL
```

Indexes created on `is_deleted` for performance.

---

## 🚀 Implementation Complete!

### ✅ All Backend Work Done:
- ✅ Database schema updated with soft delete columns
- ✅ All DELETE endpoints converted to soft delete
- ✅ All list/get endpoints filter deleted records
- ✅ `?includeDeleted=true` parameter support added
- ✅ Restore endpoints for all entities
- ✅ Cascade delete/restore implemented
- ✅ User tracking (who deleted/when)

### 📋 Frontend Work Needed:
1. Add "Trash" page/view for each module
2. Add "Restore" buttons in trash view
3. Add toggle to show/hide deleted records
4. Add deleted badge/indicator in lists
5. Add confirmation dialog before permanent delete (admin only)
   - Add "Trash" page/view for each module
   - Add "Restore" buttons in trash view
   - Add toggle to show/hide deleted records
   - Add deleted badge/indicator in lists
   - Add confirmation dialog before permanent delete (admin only)

3. Optional enhancements:
   - Auto-delete old soft-deleted records after X days
   - Admin-only permanent delete endpoint
   - Bulk restore functionality
   - Audit log export for deleted records
