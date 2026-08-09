# Bidders and Vendor Saving - Issue Analysis & Fix

## Problem Identified

When editing annual tenders, the items table was showing "No vendors" even though bidders were added in the "Participating Bidders" section.

## Root Cause

The **PUT /api/tenders/:id** endpoint was missing the `vendor_ids` column in the INSERT query for tender_items.

- **POST endpoint** (create): Correctly handled both `vendor_id` (contract/spot) and `vendor_ids` (annual-tender)
- **PUT endpoint** (edit): Only saved to `vendor_id`, ignoring `vendor_ids` array

This caused annual tender items to lose their vendor associations when editing a tender.

## How Bidders Are Saved

### 1. **Participating Bidders Section**
- Uses `TenderVendorManagement` component
- **CREATE MODE**: Bidders stored in local state, then saved after tender creation via POST `/api/tenders/{tenderId}/vendors`
- **EDIT MODE**: Bidders are saved immediately to `tender_vendors` table via POST endpoint
- Location in DB: `tender_vendors` table
- Used for: Tracking all potential vendors/bidders for a tender

### 2. **Item Vendors**
- Stored in `tender_items.vendor_id` (single vendor for contract/spot)
- Stored in `tender_items.vendor_ids` (comma-separated for annual-tender)
- Selected via checkboxes when adding items to the form

## Fix Applied

Updated **PUT /api/tenders/:id** endpoint to:

1. **Fetch tender_type** from database to know how to handle vendors
2. **For annual-tender items**:
   - Convert `vendor_ids` array to comma-separated string
   - Save to both `vendor_id` and `vendor_ids` columns

3. **For contract/spot-purchase items**:
   - Use single `vendor_id`

4. **Added vendor_ids to INSERT query** for tender_items table

## Database Tables Involved

| Table | Column | Purpose | Used By |
|-------|--------|---------|---------|
| `tender_vendors` | Multiple | Stores participating bidders/vendors | TenderVendorManagement component |
| `tender_items` | `vendor_id` | Single vendor per item (contract/spot) | Item rows in form |
| `tender_items` | `vendor_ids` | Multiple vendors per item (annual-tender) | Item rows in form |

## Testing Steps

When editing an annual tender:

1. Add vendors in "Participating Bidders" section ✓
2. Add items and select vendors for each item ✓
3. Save/Update tender via PUT request ✓
4. Reload form - vendors should now display in items table ✓

## Files Modified

- **backend-server.cjs**: PUT /api/tenders/:id endpoint (lines 5591-5750)

## Commits

- **0e7284b**: Fix: Handle vendor_ids properly in PUT tender update endpoint
