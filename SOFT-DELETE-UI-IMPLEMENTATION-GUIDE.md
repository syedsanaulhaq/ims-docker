# Soft Delete UI Implementation Guide

## ✅ Implementation Complete for Vendors Module!

This guide shows how to implement the soft delete UI pattern in other modules (Items, Categories, Tenders, etc.).

---

## 📁 Files Changed (Vendors Example)

### 1. **Type Definition** (`src/types/vendor.ts`)
Added soft delete fields to interface:
```typescript
export interface Vendor {
  // ... existing fields
  is_deleted?: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
}
```

### 2. **API Service** (`src/services/vendorsLocalService.ts`)
- Added `includeDeleted` parameter to `getVendors()`
- Added `restoreVendor()` function

### 3. **Hook** (`src/hooks/useVendors.ts`)
- Added `includeDeleted` parameter
- Added `restoreVendor` function
- Exported `restoreVendor` in return

### 4. **Main Page** (`src/pages/Vendors.tsx`)
- Added `showDeleted` state
- Added toggle component
- Added conditional rendering for deleted items
- Added restore button for deleted items
- Added trash page link with count

### 5. **Trash Page** (`src/pages/VendorsTrash.tsx`)
- New dedicated page for viewing/restoring deleted vendors
- Shows only deleted records
- Includes restore functionality

### 6. **Reusable Components** (Created)
- `DeletedBadge.tsx` - Shows "Deleted" badge with timestamp
- `RestoreButton.tsx` - Restore button with loading state
- `ShowDeletedToggle.tsx` - Toggle switch for showing deleted records

---

## 🔄 Quick Implementation Steps for Other Modules

### Step 1: Update Type
```typescript
// src/types/item.ts (or category.ts, tender.ts, etc.)
export interface Item {
  // ... existing fields
  is_deleted?: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
}
```

### Step 2: Update API Service
```typescript
// src/services/itemsLocalService.ts
export const itemsLocalService = {
  getItems: async (includeDeleted = false): Promise<ApiResponse<Item[]>> => {
    const url = includeDeleted
      ? `${API_BASE_URL}/api/items-master?includeDeleted=true`
      : `${API_BASE_URL}/api/items-master`;
    // ... rest of the code
  },

  restoreItem: async (id: string): Promise<ApiResponse<Item>> => {
    const response = await fetch(`${API_BASE_URL}/api/items-master/${id}/restore`, {
      method: 'POST',
    });
    // ... handle response
  },
};
```

### Step 3: Update API Wrapper
```typescript
// src/services/itemsApi.ts
export const itemsApi = {
  getItems: itemsLocalService.getItems,
  createItem: itemsLocalService.createItem,
  updateItem: itemsLocalService.updateItem,
  deleteItem: itemsLocalService.deleteItem,
  restoreItem: itemsLocalService.restoreItem, // Add this
};
```

### Step 4: Update Hook
```typescript
// src/hooks/useItems.ts
export function useItems(includeDeleted = false) {
  const fetchItems = useCallback(async () => {
    const res = await itemsApi.getItems(includeDeleted);
    setItems(res.data);
  }, [includeDeleted]);

  const restoreItem = async (id: string) => {
    await itemsApi.restoreItem(id);
    await fetchItems();
  };

  return { 
    items, 
    loading, 
    error, 
    createItem, 
    updateItem, 
    deleteItem,
    restoreItem, // Add this
    refetch: fetchItems
  };
}
```

### Step 5: Update Main Page
```tsx
// src/pages/ItemMaster.tsx
import { ShowDeletedToggle } from '../components/common/ShowDeletedToggle';
import { DeletedBadge } from '../components/common/DeletedBadge';
import { RestoreButton } from '../components/common/RestoreButton';

const ItemMasterPage: React.FC = () => {
  const [showDeleted, setShowDeleted] = useState(false);
  const { items, restoreItem } = useItems(showDeleted);
  
  const deletedCount = items.filter(item => item.is_deleted === 1).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Items</h1>
        <div className="flex items-center gap-4">
          <ShowDeletedToggle 
            checked={showDeleted}
            onChange={setShowDeleted}
          />
          {deletedCount > 0 && (
            <a href="/items/trash">
              Trash ({deletedCount})
            </a>
          )}
        </div>
      </div>

      <table>
        {/* ... headers ... */}
        <tbody>
          {items.map(item => (
            <tr className={item.is_deleted === 1 ? 'opacity-60 bg-red-50' : ''}>
              <td>
                {item.name}
                {item.is_deleted === 1 && <DeletedBadge deletedAt={item.deleted_at} />}
              </td>
              <td>
                {item.is_deleted === 1 ? (
                  <RestoreButton onRestore={() => restoreItem(item.id)} />
                ) : (
                  <>
                    <button onClick={() => handleEdit(item)}>Edit</button>
                    <button onClick={() => handleDelete(item.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Step 6: Create Trash Page
```tsx
// src/pages/ItemsTrash.tsx
import { DeletedBadge } from '../components/common/DeletedBadge';
import { RestoreButton } from '../components/common/RestoreButton';

const ItemsTrash: React.FC = () => {
  const { items, restoreItem } = useItems(true); // Include deleted
  const deletedItems = items.filter(item => item.is_deleted === 1);

  return (
    <div>
      <h1>🗑️ Deleted Items</h1>
      <p>{deletedItems.length} items in trash</p>
      
      <table>
        {/* ... similar to main page but only showing deleted items ... */}
        {deletedItems.map(item => (
          <tr>
            <td>{item.name}</td>
            <td><DeletedBadge deletedAt={item.deleted_at} /></td>
            <td><RestoreButton onRestore={() => restoreItem(item.id)} /></td>
          </tr>
        ))}
      </table>

      <a href="/items">Back to Items</a>
    </div>
  );
};
```

---

## 📋 Module Implementation Checklist

### For Each Module (Items, Categories, Tenders, POs, etc.):

- [ ] **Update Type**: Add `is_deleted`, `deleted_at`, `deleted_by` fields
- [ ] **Update Service**: Add `includeDeleted` param and `restore()` method
- [ ] **Update API Wrapper**: Export `restore` function
- [ ] **Update Hook**: Add `includeDeleted` param and `restore` function
- [ ] **Update Main Page**:
  - [ ] Add `showDeleted` state
  - [ ] Add `ShowDeletedToggle` component
  - [ ] Add deleted badge to rows
  - [ ] Add restore button for deleted items
  - [ ] Add conditional row styling (opacity/background)
  - [ ] Add trash page link with count
- [ ] **Create Trash Page**: Dedicated page for deleted records
- [ ] **Test**:
  - [ ] Can delete record → marked as deleted
  - [ ] Deleted records hidden by default
  - [ ] Toggle shows deleted records
  - [ ] Can restore from main page
  - [ ] Can restore from trash page
  - [ ] Trash page shows correct count

---

## 🎨 UI Components Reference

### `<ShowDeletedToggle />`
```tsx
<ShowDeletedToggle 
  checked={showDeleted}
  onChange={setShowDeleted}
  label="Show deleted records" // optional
/>
```

### `<DeletedBadge />`
```tsx
<DeletedBadge 
  deletedAt={record.deleted_at}
  deletedBy={record.deleted_by}
  className="ml-2" // optional
/>
```

### `<RestoreButton />`
```tsx
<RestoreButton
  onRestore={() => handleRestore(id)}
  loading={restoringId === id}
  className="" // optional
>
  Custom Text // optional
</RestoreButton>
```

---

## 🚀 Priority Module Order

1. ✅ **Vendors** (DONE)
2. **Items/Item Masters** - High usage
3. **Categories & Sub-Categories** - Master data
4. **Tenders** - Critical business data
5. **Purchase Orders** - Important for tracking
6. **Deliveries** - Stock management
7. **Stock Issuance** - Operational data
8. **Stock Returns** - Operational data
9. **Reorder Requests** - Lower priority

---

## 💡 Tips & Best Practices

1. **Consistent Styling**: Use `opacity-60 bg-red-50` for deleted rows
2. **Confirmation Dialogs**: Always confirm before delete/restore
3. **Success Messages**: Show success/error feedback
4. **Loading States**: Disable buttons during API calls
5. **Count Badges**: Show deleted count in header
6. **Back Buttons**: Add navigation back to main page from trash
7. **Empty States**: Show nice empty state when trash is empty
8. **Accessibility**: Use proper ARIA labels and keyboard navigation

---

## 🧪 Testing Checklist

For each module implementation:

- [ ] Delete a record → verify it disappears from list
- [ ] Enable "Show Deleted" → verify it appears with badge
- [ ] Click restore from main page → verify it restores
- [ ] Go to trash page → verify it shows only deleted items
- [ ] Restore from trash page → verify it works
- [ ] Check trash count badge updates correctly
- [ ] Verify deleted records don't show in dropdowns/relations
- [ ] Test with multiple deleted records
- [ ] Test with no deleted records (empty trash)

---

## 📚 Related Files

- Backend API Docs: `SOFT-DELETE-USAGE-GUIDE.md`
- Backend Implementation: `server/routes/*.cjs`
- Database Schema: `ADD-SOFT-DELETE-TO-ALL-TABLES.sql`
- Reusable Components: `src/components/common/`

---

## 🎯 Summary

The soft delete system is now:
- ✅ Fully functional in backend (all modules)
- ✅ Implemented in frontend for Vendors
- ✅ Ready to replicate for other modules

Just follow the steps above for each module - the pattern is consistent and reusable!
