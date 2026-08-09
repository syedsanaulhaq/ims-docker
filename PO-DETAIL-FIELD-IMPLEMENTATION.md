# Purchase Order Detail Field - Implementation Summary

**Date:** February 2, 2026  
**Feature:** Add customizable `po_detail` field to Purchase Orders

## Overview
Added ability to customize the "Supply Order" text that appears in PO documents instead of using hardcoded text.

## Changes Made

### 1. Frontend - CreatePurchaseOrder.tsx ✅
**File:** `src/pages/CreatePurchaseOrder.tsx`

**Added:**
- New state variable: `poDetail` with default text
- Textarea input in Step 3 for editing supply order details
- Included `poDetail` in API payload sent to backend

**Default Text:**
```
It is submitted that the following items may kindly be provided to this Commission 
Secretariat at the earliest to meet the official requirements as per annual tender rates. 
Furthermore, the supplier may be requested to furnish the corresponding bill/invoice to 
this office after delivery of the items, so that necessary arrangements for payment can 
be made in accordance with the prescribed financial rules and procedures.
```

**UI Changes:**
- Added "Supply Order Details" textarea (5 rows)
- Help text: "This text will be displayed in the 'Supply Order' section of the PO document."
- Located in Step 3 card below PO Date field

### 2. Backend - purchaseOrders.cjs ✅
**File:** `server/routes/purchaseOrders.cjs`

**Changes:**
1. **POST /api/purchase-orders** - Create PO endpoint
   - Accept `poDetail` from request body
   - Store in database with `po_detail` column
   - SQL: `INSERT INTO purchase_orders (..., po_detail, ...)`

2. **GET /api/purchase-orders** - List endpoint
   - Include `po_detail` in SELECT query
   - Returns field in response

3. **GET /api/purchase-orders/:id** - Details endpoint
   - Include `po_detail` in SELECT query
   - Returns full PO with detail text

### 3. Frontend - PurchaseOrderDetails.tsx ✅
**File:** `src/pages/PurchaseOrderDetails.tsx`

**Changed:**
- Display `po.po_detail` instead of hardcoded text
- Fallback to default text if `po_detail` is null/empty
- Located in "SUPPLY ORDER" section before items table

**Code:**
```tsx
<p className="indent-12">
  {po.po_detail || `[default text with fallback]`}
</p>
```

### 4. Database Migration ✅
**File:** `add-po-detail-column.sql`

**SQL Script:**
- Check if `po_detail` column exists
- Add column: `ALTER TABLE purchase_orders ADD po_detail NVARCHAR(MAX) NULL`
- Update existing records with default text
- Safe to run multiple times (checks existence first)

**Run command:**
```bash
# Run this SQL script in your database management tool
# or via command line
```

## Testing Checklist

- [ ] Create new PO with default text → Verify in PO details page
- [ ] Create new PO with custom text → Verify custom text appears
- [ ] Edit existing PO detail text → Verify changes persist
- [ ] View old PO (without po_detail) → Should show fallback text
- [ ] Print PO → Verify po_detail text prints correctly
- [ ] Annual tender PO → Verify "2025-26" text logic still works in fallback

## Database Schema Change

**Table:** `purchase_orders`  
**Column Added:** `po_detail`  
**Type:** `NVARCHAR(MAX)`  
**Nullable:** `YES`  
**Default:** `NULL`

## API Changes

### POST /api/purchase-orders
**New Request Field:**
```json
{
  "tenderId": "...",
  "selectedItems": [...],
  "poDate": "2026-02-02",
  "poDetail": "Custom supply order text...",
  "itemPrices": {...},
  "itemVendors": {...},
  "itemQuantities": {...}
}
```

### GET /api/purchase-orders
**New Response Field:**
```json
{
  "id": "...",
  "po_number": "PO-2026-001",
  "po_detail": "Custom supply order text...",
  ...
}
```

### GET /api/purchase-orders/:id
**New Response Field:**
```json
{
  "id": "...",
  "po_number": "PO-2026-001",
  "po_detail": "Custom supply order text...",
  "items": [...]
}
```

## Deployment Steps

1. **Backup Database**
   ```sql
   -- Backup purchase_orders table before migration
   ```

2. **Run Migration**
   ```sql
   -- Execute add-po-detail-column.sql
   ```

3. **Deploy Backend**
   ```bash
   # Restart backend server to load new code
   npm run backend
   ```

4. **Deploy Frontend**
   ```bash
   # Rebuild frontend
   npm run build
   ```

5. **Verify**
   - Create test PO with custom text
   - View PO details page
   - Print PO document

## Rollback Plan

If issues occur:

1. **Frontend:** Revert to hardcoded text in PurchaseOrderDetails.tsx
2. **Backend:** Remove `po_detail` from queries (won't break, just won't return it)
3. **Database:** Column can remain (it's nullable, won't affect existing logic)

## Notes

- **Backward Compatible:** Old POs without `po_detail` will show fallback text
- **Character Limit:** NVARCHAR(MAX) supports up to 2GB of text
- **Validation:** No client-side length validation (consider adding if needed)
- **Default Text:** Automatically applied to existing POs during migration

## Files Modified

✅ `src/pages/CreatePurchaseOrder.tsx` (54, 274, 585 lines changed)  
✅ `server/routes/purchaseOrders.cjs` (4 sections updated)  
✅ `src/pages/PurchaseOrderDetails.tsx` (1 section updated)  
✅ `add-po-detail-column.sql` (New file)  

## Related Documentation

- [Purchase Order System](ANNUAL-TENDER-MULTIPLE-VENDORS-PO-CREATION.md)
- [Backend API Routes](server/routes/purchaseOrders.cjs)
- [Frontend PO Components](src/pages/)
