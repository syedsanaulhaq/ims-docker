# Vendor Assignment Manager - Quick Start Guide

## Test Workflow

### Current System State
- **Database**: ✅ SQL Server with 9 tables (including `item_masters` and `categories`)
- **View**: ✅ `vw_item_masters_with_categories` - Returns all items with their category names
- **API**: ✅ All endpoints working correctly
- **Categories Available**: Electronics, IT Equipment
- **Tenders Available**: Annual Tender - 2026
- **Items Available**: 15+ items across 2 categories

## How to Use the Vendor Assignment Manager

### Step 1: Select a Tender
1. Navigate to Vendor Assignment page
2. You'll see "Annual Tender - 2026 (2994-00774)"
3. Click to select it

### Step 2: Select a Category
1. After selecting a tender, you'll see available categories
2. The categories are **automatically extracted** from items in the `vw_item_masters_with_categories` view
3. Currently available categories:
   - **Electronics** (1 item: UPS)
   - **IT Equipment** (14+ items: Android Phone, Laptop, Desktop Computer, etc.)
4. Click on a category to select it

### Step 3: Select Items from the Category
1. After selecting a category, you'll see all items in that category
2. Items display their name and code
3. Use checkboxes to select one or more items
4. Selected items appear in a green summary at the bottom

### Step 4: Assign Vendors
1. Click "Assign Vendors" button
2. A dialog shows:
   - Your selected items (blue summary at top)
   - All available vendors (with checkboxes)
3. Select one or more vendors
4. Click "Confirm Assignment"
5. You'll see "✅ Vendors assigned successfully!" message

## Data Sources

### Category Names
- **Source**: `vw_item_masters_with_categories` view
- **How it works**: All items in the view have a `category_name` field
- **Extraction**: Component extracts unique category names automatically
- **Result**: User sees only categories that have items

### Items
- **Source**: `vw_item_masters_with_categories` view
- **How it works**: Each item includes its category_name in the view
- **Filtering**: When user selects category, items are filtered by category_name
- **Result**: User only sees items matching selected category

### Vendors
- **Source**: `vendors` table
- **How it works**: All vendors fetched from database
- **Selection**: User can select any vendor for assignment
- **Result**: Selected vendors are linked to selected items

## Data Flow Diagram

```
1. User opens Vendor Assignment
   ↓
2. Component loads data:
   - Tenders from db
   - Items from vw_item_masters_with_categories
   - Vendors from db
   ↓
3. User selects Tender
   ↓
4. Categories extracted (unique category_name values from items)
   ↓
5. User selects Category
   ↓
6. Items filtered (where category_name matches selected category)
   ↓
7. User selects Items
   ↓
8. User selects Vendors
   ↓
9. Assignment API call POST /api/annual-tenders/{tenderId}/assign-vendors
   ↓
10. Success message displayed
```

## API Calls Made

### On Page Load
```
GET http://localhost:3001/api/annual-tenders
GET http://localhost:3001/api/item-masters          (returns items with category_name)
GET http://localhost:3001/api/vendors
```

### On Vendor Assignment
```
POST http://localhost:3001/api/annual-tenders/{tenderId}/assign-vendors
Body: { assignments: [{ vendorIds: [...], itemIds: [...] }] }
```

## No Creation UI!

❌ **NOT in this workflow**:
- Creating new categories
- Creating new items
- Quick-add item dialogs
- Category management forms

✅ **What you do instead**:
- Select from existing categories (from view)
- Select from existing items (from view)
- Assign existing vendors

All data comes from the database and view - this is a **selection and assignment** workflow, not a creation workflow.

## Troubleshooting

### "No categories found"
- Check if items exist in the database
- Verify `vw_item_masters_with_categories` view exists and has data
- Check `/api/item-masters` endpoint returns items with `category_name` field

### "No items in category"
- Verify items in that category exist in the database
- Check the `category_name` field matches selected category exactly
- Use database tools to query `vw_item_masters_with_categories` directly

### "Cannot assign vendors"
- Ensure you've selected at least one vendor
- Ensure tender is selected
- Check browser console for API error details

## Files Modified

- `src/pages/VendorAssignmentManager.tsx` - Complete redesign for new workflow

## Key Concepts

1. **Categories from Items**: Don't create new categories - they come from the view
2. **View-Based Data**: All category-item relationships come from the view
3. **Simple Selection**: Just select tender → category → items → vendors
4. **Automatic Extraction**: Categories are automatically extracted from items
5. **No Forms**: No creation dialogs needed - everything exists in database
