# Vendor Selection Testing Guide

## Frontend Testing Steps

1. **Open the page**: Go to `http://localhost:8080/dashboard/annual-tenders/new`

2. **Open Browser Developer Console** (F12 or Ctrl+Shift+I)

3. **Create a New Annual Tender**:
   - Fill in tender details (number, title, etc.)
   - Ensure "Tender Type" is set to **"annual-tender"**

4. **Add an Item** and **Select Vendors**:
   - Select a category
   - Select an item master
   - You should see **Vendor Multi-select dropdown**
   - In the browser console, you should see:
     ```
     ✅ Loaded vendors: X vendors
     📋 Vendors: [array of vendor objects]
     ```

5. **Check Vendor Selection**:
   - Click on vendor checkboxes
   - **Expected console logs for each vendor checked**:
     ```
     ✅ Vendor checkbox clicked: [Vendor Name] ([ID]) - checked: true
     ➕ Adding vendor [ID] to vendor_ids
     📝 Updated vendor_ids: [array with vendor ID]
     ```
   - **Expected console logs for each vendor unchecked**:
     ```
     ✅ Vendor checkbox clicked: [Vendor Name] ([ID]) - checked: false
     ➖ Removing vendor [ID] from vendor_ids
     📝 Updated vendor_ids: [updated array]
     ```

6. **Add Item to Tender**:
   - Select at least ONE vendor (required for annual tender)
   - Click "Add Item" button
   - **Expected console logs**:
     ```
     🔍 addItem called with newItem: {object with vendor_ids array}
     🔍 vendor_ids array: [array of vendor IDs]
     ✅ Adding item with vendor_ids: [array of vendor IDs]
     ```
   - The item should appear in the tender items table

7. **Submit the Tender**:
   - Click "Save Tender" button
   - **Expected console logs**:
     ```
     🔍 Submitting tender data: {full tender object}
     📦 Items being submitted:
       Item 0: [Item Name]
         - vendor_ids: [array of vendor IDs]
         - vendor_id: undefined
     ```

## Backend Testing

After submission, **check the Node.js server console** for these logs:

```
📦 Processing items for tender type: annual-tender
📋 Total items: 1
📝 Processing item: [Item Name]
   - vendor_ids (array): [array of IDs]  // Should NOT be undefined
   - vendor_id (single): undefined
💾 Saving: vendor_id=null, vendor_ids=[comma-separated IDs]
```

## Database Verification

Run this query to verify vendors are saved:

```sql
SELECT TOP 1 
  ti.id,
  ti.tender_id,
  ti.nomenclature,
  ti.vendor_id,
  ti.vendor_ids
FROM tender_items ti
ORDER BY ti.created_at DESC;
```

**Expected result**: 
- `vendor_ids` should contain comma-separated vendor IDs (e.g., "uuid-1,uuid-2,uuid-3")
- NOT NULL or empty

## Troubleshooting

### If vendor_ids is undefined at backend:
1. Check browser console - did vendor checkboxes show proper logs?
2. If checkboxes didn't log anything - event handlers might not be attached
3. If checkboxes logged but vendor_ids still undefined - form submission might not include vendor_ids

### If vendors list is empty:
1. Check console log: `📋 Vendors: []`
2. Verify `/api/vendors` endpoint is working: Open DevTools > Network tab, reload, check vendors request
3. Check database has vendors: `SELECT COUNT(*) FROM vendors;`

### If vendor checkboxes don't appear:
1. Verify tender type is "annual-tender"
2. Check if vendors loaded successfully (console logs)
3. Check browser console for any JavaScript errors

## Success Criteria

✅ **Frontend**: 
- Vendor checkboxes appear and respond to clicks
- Console logs show vendor selection/deselection
- Additem shows selected vendors
- Submit form includes vendor_ids array

✅ **Backend**:
- Receives vendor_ids array (not undefined)
- Converts array to comma-separated string
- Saves to tender_items.vendor_ids column

✅ **Database**:
- tender_items.vendor_ids contains comma-separated vendor IDs
- NOT NULL for annual tender items with vendors selected
