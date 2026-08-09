# CSV Bulk Upload Feature for Item Masters

## Overview
The Item Masters page now supports bulk uploading of items via CSV files. This feature allows you to import multiple items at once instead of adding them one by one.

## How to Use

### Step 1: Access the Upload Feature
1. Navigate to **Items Management** page
2. Click the green **"Upload CSV"** button (next to "Add New Item")

### Step 2: Download the CSV Template
1. In the upload modal, click **"Download CSV Template"**
2. Open the downloaded `item_masters_template.csv` file in Excel or any spreadsheet editor

### Step 3: Fill in Your Data
The CSV template has the following columns:

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| `item_code` | No | Unique item code | IT-001 |
| `nomenclature` | **YES** | Item name/title | Laptop Computer |
| `manufacturer` | No | Manufacturer name | Dell |
| `unit` | No | Unit of measurement | Each, Box, Kg |
| `specifications` | No | Technical specifications | Intel i7 16GB RAM |
| `description` | No | Detailed description | Productivity laptop |
| `category_name` | No | Category name (must exist) | Electronics |
| `sub_category_name` | No | Sub-category name (must exist) | Computers |
| `status` | No | Active or Inactive (default: Active) | Active |
| `minimum_stock_level` | No | Minimum stock alert level | 10 |
| `maximum_stock_level` | No | Maximum stock capacity | 100 |
| `reorder_level` | No | Reorder threshold | 20 |

### Step 4: Important Notes
- **nomenclature** is the only required field
- Category and sub-category names must match exactly (case-insensitive) with existing categories in the database
- If you provide an `item_code`, it must be unique (no duplicates allowed)
- If `status` is not specified, it defaults to "Active"
- Stock levels should be numbers (integers)

### Step 5: Upload Your CSV
1. Click **"Click to select CSV file"** or drag and drop your CSV file
2. Click **"Upload CSV"** button
3. Wait for the upload to complete

### Step 6: Review Results
After upload, you'll see:
- ✅ **Success count**: Number of items successfully imported
- ❌ **Error count**: Number of items that failed
- **Detailed error messages** for each failed row with the specific reason

## Example CSV Data

```csv
item_code,nomenclature,manufacturer,unit,specifications,description,category_name,sub_category_name,status,minimum_stock_level,maximum_stock_level,reorder_level
IT-001,Laptop Computer,Dell,Each,Intel i7 16GB RAM 512GB SSD,Productivity laptop for office use,Electronics,Computers,Active,5,50,10
IT-002,Desktop Monitor 24",Samsung,Each,1920x1080 LED Display,Standard office monitor,Electronics,Monitors,Active,10,100,20
ST-001,Office Chair Executive,Steel Case,Each,Ergonomic leather high-back,Comfortable office chair,Furniture,Chairs,Active,20,200,50
```

## Common Errors and Solutions

### Error: "Category not found: XYZ"
**Solution**: Make sure the category name exactly matches an existing category in the system. Check the Categories page to verify the correct spelling.

### Error: "Sub-category not found: XYZ"
**Solution**: Verify that:
1. The sub-category exists in the system
2. The sub-category belongs to the specified category
3. The spelling is correct

### Error: "Duplicate item_code: ABC-001"
**Solution**: The item code already exists in the database. Either:
- Remove the `item_code` column to let the system auto-generate IDs
- Use a different, unique item code

### Error: "Missing required field: nomenclature"
**Solution**: Every item must have a nomenclature (name). Add a value in the nomenclature column for that row.

## Technical Details

### Backend Endpoint
```
POST /api/items-master/bulk-upload
Content-Type: multipart/form-data
```

### Validation Rules
1. File must be a valid CSV file
2. Maximum file size: 5MB
3. Each row is validated independently
4. Failed rows do not prevent successful rows from being imported
5. Category and sub-category names are matched case-insensitively
6. Duplicate item codes within the CSV or database are rejected

### Error Handling
- Validation errors are reported per row with row numbers (1-indexed, accounting for header)
- Successful and failed rows are reported separately
- The upload is transactional per row (not atomic across all rows)

## Permissions Required
- You must have the `inventory.create` permission to access the CSV upload feature

## Sample Template
A sample CSV template is available in the project root: `item_masters_template.csv`

## Changelog
- **2024-11-XX**: Initial CSV bulk upload feature added
  - Backend endpoint with multer and csv-parse
  - Frontend upload modal with drag-and-drop
  - Real-time validation and error reporting
  - CSV template download functionality
