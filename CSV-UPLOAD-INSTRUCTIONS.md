# CSV Bulk Upload Instructions for Annual Tender Items

## Overview
This guide explains how to use the CSV bulk upload feature to add multiple items to an annual tender at once.

## CSV File Format

The CSV file must contain the following columns (in order):

| Column Name      | Required | Description                                          | Example                    |
|------------------|----------|------------------------------------------------------|----------------------------|
| `item_code`      | **One required** | The unique item code from the Item Masters table | `ITM-001`, `COMP-2024-001` |
| `item_name`      | **One required** | The item name/nomenclature (if you don't know the code) | `Dell Laptop`, `Office Chair` |
| `vendor_id`      | No       | The UUID of the vendor (must exist in bidders list)  | `a1b2c3d4-e5f6-7890-...`   |
| `vendor_name`    | No       | The vendor name (if you don't know the ID)          | `ABC Traders`, `XYZ Corp`  |
| `unit_price`     | **Yes**  | Item unit price (must be a valid number)             | `15000`, `2500.50`         |
| `specifications` | No       | Item specifications or description                   | `Dell Laptop with 16GB RAM`|
| `remarks`        | No       | Additional remarks or notes                          | `Preferred brand`          |

**Important Notes:**
- You must provide either `item_code` OR `item_name` (at least one is required)
- You can provide either `vendor_id` OR `vendor_name` (both optional, but vendor must exist in tender)
- If you provide `item_code`, it will be used first for lookup
- If you provide `item_name` without `item_code`, the system will search by name

## Important Prerequisites

1. **Add Vendors First**: You must add vendors to the tender before uploading the CSV file
2. **Valid Item Codes/Names**: All items must exist in the Item Masters database (lookup by code or name)
3. **Valid Vendor IDs/Names**: If providing vendor information, vendors must be added to the tender first

## How to Specify Items and Vendors

### For Items:
- **Option 1**: Use `item_code` if you know the exact code (e.g., `ITM-001`)
- **Option 2**: Use `item_name` if you know the item name (e.g., `Dell Laptop`)
- Both columns can be present, but `item_code` takes priority if both are provided

### For Vendors:
- **Option 1**: Use `vendor_id` if you know the exact UUID
- **Option 2**: Use `vendor_name` and the system will look up the ID (e.g., `ABC Traders`)
- Leave both empty to assign vendors manually later
- If both are provided, `vendor_id` takes priority

## Step-by-Step Upload Process

### 1. Prepare Your CSV File
- Open the sample file: `sample-tender-items.csv`
- Replace the example data with your actual item codes and prices
- Save the file with a `.csv` extension
- Ensure the file uses UTF-8 encoding

### 2. Upload in the Tender Form
1. Navigate to **Create Tender** or **Edit Tender** page
2. Select **Annual Tender** as the tender type
3. Add at least one successful vendor/bidder
4. Scroll to the **"Bulk Upload Items from CSV"** section
5. Click **"Choose File"** and select your CSV file
6. Wait for processing (you'll see "Processing CSV file..." message)
7. Check the success/error messages

### 3. Review Uploaded Items
- Successfully uploaded items will appear in the tender items table
- Each item will show:
  - Category (from Item Master)
  - Name of Article (nomenclature)
  - Vendor (if specified)
  - Unit Price
  - Specifications
  - Remarks

## Sample CSV Template

```csv
item_code,item_name,vendor_id,vendor_name,unit_price,specifications,remarks
ITM-001,,,ABC Traders,15000,Dell Laptop with Intel i7,Preferred brand
,Office Chair,,XYZ Suppliers,8500,Ergonomic design,Black color
ITM-003,Conference Table,,ABC Traders,45000,12-seater,Wooden finish
```

**Examples:**
- Row 1: Uses `item_code` and `vendor_name` (most common)
- Row 2: Uses `item_name` and `vendor_name` (when code is unknown)
- Row 3: Uses both `item_code` and `item_name` (code takes priority), plus `vendor_name`

## Error Handling

The system validates each row and will report errors for:
- ❌ Missing both `item_code` and `item_name`
- ❌ Item code/name not found in database
- ❌ Invalid `unit_price` (non-numeric or negative)
- ❌ `vendor_id` not found (if provided)
- ❌ `vendor_name` not found (if provided)
- ❌ Malformed CSV structure

**Enhanced Error Display**: The upload modal shows a detailed table with:
- Row number where the error occurred
- Item code/name from the CSV
- Vendor ID/name from the CSV
- Specific error message

**Partial Success**: If some rows fail validation, valid rows will still be imported. You can review all errors in the modal before deciding to import the successful items.

## Best Practices

1. **Start Small**: Test with 2-3 items first
2. **Validate Item Codes**: Verify all item codes exist in Item Masters before uploading
3. **Consistent Pricing**: Ensure unit prices match your procurement budget
4. **Keep Headers**: Always include the header row with column names
5. **No Special Characters**: Avoid special characters in CSV data (except commas in quoted fields)
6. **Backup Data**: Keep a copy of your CSV file for reference

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload button disabled | Add at least one successful vendor first |
| "Item not found" errors | Verify item codes exist in Item Masters table |
| File not accepted | Ensure file has `.csv` extension |
| Price validation errors | Check that prices are valid numbers (no currency symbols) |
| Upload timeout | Try splitting large files into smaller batches (100-200 items) |

## Technical Notes

- Maximum file size: **5 MB**
- Supported encoding: **UTF-8** (with or without BOM)
- Empty cells are treated as NULL values
- CSV parsing uses standard RFC 4180 format
- Items are processed sequentially (not in parallel)

## Support

For issues or questions:
1. Check browser console (F12) for detailed error messages
2. Verify CSV format matches the template
3. Ensure database connection is active
4. Contact system administrator for database-related issues
