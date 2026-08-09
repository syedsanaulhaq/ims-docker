# Vendor Assignment Workflow - From Scratch Rebuild

## Overview
The VendorAssignmentManager component has been rebuilt from scratch with a clear, intuitive 4-step workflow for assigning vendors to items in annual tenders.

## New Workflow

### **Step 1: Select Annual Tender** ✅
- User selects from available annual tenders
- Displays tender title and tender number
- Only one tender selected at a time
- Required before proceeding

### **Step 2: Select or Create Category** ✅
**Option A: Select Existing Category**
- Browse all existing categories (from categories table)
- Click on category button to select it
- Selected category highlighted in blue
- Shows category name and code

**Option B: Create New Category + Items**
- Click "Create New Category" button
- Opens dialog with form:
  - Category Name (required)
  - Category Code (optional - auto-uses name if empty)
- Add Multiple Items:
  - Item Name (nomenclature)
  - Item Code
  - Add/Remove item rows dynamically
- Saves category to database
- Creates all items in that category
- Automatically selects newly created category

### **Step 3: Select Items from Category** ✅
- Shows all items in selected category
- Checkbox selection (multiple allowed)
- Displays:
  - Item name (nomenclature)
  - Item code
  - Hover effect for clarity
- Shows count of selected items
- Green confirmation when items selected

### **Step 4: Assign Vendors to Items** ✅
- Only enabled after items selected
- Opens dialog with vendor selection
- Shows selected items as reference
- Checkbox selection (multiple vendors allowed)
- Displays:
  - Vendor name
  - Vendor code
- Shows count of selected vendors
- Green confirmation when vendors selected
- Confirms assignment with button

## Database Workflow

```
Step 1: Tender Selected
  └─> Tender ID: [annual_tenders.id]

Step 2a: Select Category
  └─> Category ID: [categories.id]

Step 2b: Create Category + Items
  ├─> INSERT INTO categories (category_name, category_code, ...)
  │   └─> Returns: [new_category_id]
  └─> INSERT INTO item_masters (nomenclature, item_code, category_id=new_category_id, ...)
      └─> For each item in form

Step 3: Select Items
  └─> Query: GET /api/categories/{categoryId}/items
      └─> Returns: ItemMaster[] with matching category_id

Step 4: Assign Vendors
  └─> POST /api/annual-tenders/{tenderId}/assign-vendors
      └─> Creates entries in:
          ├─> annual_tender_vendors (tender, category, vendor)
          └─> vendor_proposals (proposal pricing data)
```

## API Endpoints

### **GET /api/annual-tenders**
Returns all available annual tenders for selection

### **GET /api/categories**
Returns all existing categories for Step 2 selection

### **POST /api/categories**
Creates new category
```json
{
  "category_name": "string (required)",
  "category_code": "string (optional)",
  "description": "string (optional)",
  "item_type": "string (optional, default: Dispensable)",
  "status": "string (optional, default: Active)"
}
```
Returns: Created category object with `id` field

### **GET /api/categories/{categoryId}/items**
Returns all items in a specific category
```json
[
  {
    "id": "uuid",
    "nomenclature": "string",
    "item_code": "string",
    "category_id": "uuid"
  }
]
```

### **POST /api/item-masters**
Creates new item
```json
{
  "nomenclature": "string (required)",
  "item_code": "string (required)",
  "category_id": "uuid (required)",
  "unit": "string (optional)",
  "description": "string (optional)",
  "status": "string (optional, default: Active)"
}
```
Returns: Created item object with `id` field

### **GET /api/vendors**
Returns all available vendors for Step 4 assignment

### **POST /api/annual-tenders/{tenderId}/assign-vendors**
Assigns vendors to items in a category
```json
{
  "assignments": [
    {
      "categoryId": "uuid",
      "vendorIds": ["uuid", "uuid"],
      "itemIds": ["uuid", "uuid"]
    }
  ]
}
```

## Component State Management

```typescript
// Main Selection States
const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
const [selectedItems, setSelectedItems] = useState<ItemMaster[]>([]);
const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);

// Data States
const [tenders, setTenders] = useState<AnnualTender[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
const [categoryItems, setCategoryItems] = useState<ItemMaster[]>([]);
const [vendors, setVendors] = useState<Vendor[]>([]);

// Dialog States
const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
const [showAssignVendorsDialog, setShowAssignVendorsDialog] = useState(false);

// Create Category Form States
const [newCategoryName, setNewCategoryName] = useState('');
const [newCategoryCode, setNewCategoryCode] = useState('');
const [newCategoryItems, setNewCategoryItems] = useState<{ 
  nomenclature: string; 
  item_code: string 
}[]>([]);
```

## Key Functions

### `loadCategories()`
- Fetches all categories from `/api/categories`
- Updates `categories` state
- Called on component mount

### `handleSelectCategory(category)`
- Sets `selectedCategory`
- Calls `loadCategoryItems(category.id)`
- Resets `selectedItems` to empty

### `loadCategoryItems(categoryId)`
- Fetches items for category from `/api/categories/{categoryId}/items`
- Updates `categoryItems` state
- Called when category selected

### `handleCreateCategory()`
- Validates form inputs
- POST to `/api/categories` to create category
- POST to `/api/item-masters` for each item
- Reloads categories list
- Auto-selects newly created category
- Loads items for new category

### `handleAssignVendors()`
- Validates all steps completed
- POST to `/api/annual-tenders/{tenderId}/assign-vendors`
- Resets selections
- Shows success message

## UI Features

### Visual Feedback
- ✅ Step indicators with completion status
- 🔵 Step numbers for navigation
- 🟢 Green confirmation messages
- Color-coded sections (blue, yellow, purple)
- Badge displays for tender/category info

### Interactive Elements
- Button states (enabled/disabled based on selections)
- Checkboxes for multi-selection
- Hover effects on items
- Dialog-based forms
- Dynamic item rows in category creation

### Responsive Design
- Grid layout for categories (1 col mobile, 2 col desktop)
- Scrollable lists for large datasets
- Proper spacing and padding
- Clear visual hierarchy

## File Changes

### Modified Files
1. **src/pages/VendorAssignmentManager.tsx** (Commit: 0d157d8)
   - Complete rewrite of component logic
   - New step-by-step workflow
   - Category creation form
   - Improved UI and state management

2. **backend-server.cjs** (Commit: c7ead90)
   - Updated POST /api/categories endpoint
   - Enhanced POST /api/item-masters endpoint
   - Proper UUID generation
   - Improved response objects

## Testing Checklist

- [ ] Navigate to /dashboard/vendor-assignment
- [ ] Verify tenders load and display correctly
- [ ] Select a tender successfully
- [ ] Browse and select existing category
- [ ] Create new category with items
  - [ ] Fill category name
  - [ ] Add multiple items
  - [ ] Verify items save
  - [ ] Category appears in list
- [ ] Select items from category
  - [ ] Items display correctly
  - [ ] Checkbox selection works
  - [ ] Count displays correctly
- [ ] Assign vendors to items
  - [ ] Dialog opens with item summary
  - [ ] Vendors display correctly
  - [ ] Multi-select vendors works
  - [ ] Confirmation button works
  - [ ] Success message shows

## Future Enhancements

1. **Vendor Proposal Pricing**
   - Interface for vendors to enter prices per item
   - Currency and payment terms
   - Delivery date estimates

2. **Comparison UI**
   - Compare vendor proposals side-by-side
   - Filter and sort by price
   - Approval workflow

3. **Purchase Order Generation**
   - Auto-generate POs from approved proposals
   - Quantity selection
   - Delivery scheduling

4. **Reporting**
   - Vendor assignment reports
   - Category-wise vendor count
   - Item-wise vendor details
   - Tender analysis

## Notes

- Component fully typed with TypeScript
- Uses existing UI component library (shadcn/ui)
- No external dependencies added
- Follows existing code patterns
- Responsive and accessible
- Complete error handling with user feedback
