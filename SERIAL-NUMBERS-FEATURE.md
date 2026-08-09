# Serial Numbers for Delivery Items

## Overview
Added serial number tracking functionality to the delivery receiving process. Users can now enter serial numbers for items when receiving deliveries, either manually or by importing from a CSV file.

## Implementation Summary

### 1. Database Changes
**File**: `add-serial-numbers-to-deliveries.sql`

Created new table `delivery_item_serial_numbers`:
- Stores multiple serial numbers per delivery item
- Links to: `deliveries`, `delivery_items`, `item_masters`
- Unique constraint: One serial number per item master (prevents duplicates)
- Cascade delete: Serial numbers removed when delivery is deleted

**Schema**:
```sql
CREATE TABLE delivery_item_serial_numbers (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    delivery_id UNIQUEIDENTIFIER NOT NULL,
    delivery_item_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id UNIQUEIDENTIFIER NOT NULL,
    serial_number NVARCHAR(255) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME2,
    CONSTRAINT UX_serial_per_item UNIQUE (item_master_id, serial_number)
);
```

### 2. Frontend Changes

#### **ReceiveDelivery.tsx**
**Location**: `src/pages/ReceiveDelivery.tsx`

**New Features**:
- ✅ Serial number input field (textarea, one per line)
- ✅ CSV import button for bulk serial number entry
- ✅ Real-time count of entered serial numbers
- ✅ Warning when serial number count doesn't match quantity
- ✅ Serial numbers included in delivery submission

**Interface Updates**:
```typescript
interface DeliveryItem {
  // ...existing fields
  serial_numbers?: string[];  // NEW
}
```

**CSV Import**:
- Accepts `.csv` and `.txt` files
- Parses comma-separated or newline-separated values
- Automatically trims whitespace

**UI Features**:
- Textarea for manual entry (one serial per line)
- Upload button with CSV icon
- Counter showing "X serial number(s) entered"
- Visual warning if count ≠ quantity (amber text)

#### **ReceivingReport.tsx**
**Location**: `src/components/reports/ReceivingReport.tsx`

**New Features**:
- ✅ Fetches serial numbers for each delivery
- ✅ Displays serial numbers grouped by item
- ✅ Shows item name, code, and count
- ✅ Serial numbers displayed as badges

**Display Section**:
- Blue-tinted section below delivery items table
- Grid layout (responsive: 1-2 columns)
- Each item shows all its serial numbers
- Hover over serial to see notes (if any)

### 3. Backend Changes

#### **deliveries.cjs**
**Location**: `server/routes/deliveries.cjs`

**New Endpoints**:

1. **POST `/api/deliveries/for-po/:poId`** (Updated)
   - Now accepts `serial_numbers[]` in item payload
   - Saves serial numbers after creating delivery items
   - Transaction-safe: All or nothing

2. **GET `/api/deliveries/:id/serial-numbers`** (New)
   - Returns all serial numbers for a delivery
   - Includes item name and code
   - Ordered by item name, then serial number

**Data Flow**:
```javascript
POST body includes:
{
  items: [{
    po_item_id: "...",
    item_master_id: "...",
    quantity_delivered: 5,
    serial_numbers: ["SN001", "SN002", "SN003", "SN004", "SN005"]
  }]
}
```

## Usage Guide

### For Store Keepers / Receiving Staff

#### **Manual Entry**
1. Navigate to receive delivery page
2. Enter quantity for each item
3. In the "Serial Numbers" column, type or paste serial numbers
4. Press Enter after each serial number
5. The count updates automatically
6. Review the count matches quantity
7. Submit delivery

#### **CSV Import**
1. Prepare CSV file with serial numbers:
   ```
   SN001
   SN002
   SN003
   ```
   Or comma-separated:
   ```
   SN001,SN002,SN003
   ```
2. Click the "CSV" upload button for the item
3. Select your CSV file
4. Serial numbers populate automatically
5. Review and submit

### For Administrators

#### **Database Setup**
Run the migration script:
```sql
-- Execute on InventoryManagementDB
sqlcmd -S SERVER -d InventoryManagementDB -i add-serial-numbers-to-deliveries.sql
```

Or manually execute the SQL file in SSMS.

#### **Viewing Serial Numbers**
Serial numbers appear in:
- **Receiving Reports**: Blue section below each delivery
- **API Endpoint**: `GET /api/deliveries/{id}/serial-numbers`

## Validation Rules

1. **Serial numbers are optional** - Not required for all items
2. **Unique per item master** - Database constraint prevents duplicates
3. **Warning (not blocking)** - System shows warning if count ≠ quantity but allows submission
4. **Whitespace trimmed** - Leading/trailing spaces removed automatically

## Technical Notes

### **Transaction Safety**
- Delivery creation and serial number insertion happen in one transaction
- If serial number insert fails (duplicate), entire delivery rolls back
- Maintains data integrity

### **Performance**
- Indexed on: `delivery_id`, `item_master_id`, `serial_number`
- Efficient lookups for reporting
- Grouped by item in reports for readability

### **Future Enhancements**
- [ ] Serial number validation against manufacturer format
- [ ] Serial number scanning via barcode/QR
- [ ] Export serial numbers to Excel
- [ ] Track serial numbers through issuance and transfer
- [ ] Serial number history/audit trail

## Testing Checklist

### **Manual Testing**
- [ ] Enter serial numbers manually (one per line)
- [ ] Import serial numbers from CSV
- [ ] Submit delivery with serial numbers
- [ ] Verify serial numbers saved in database
- [ ] View receiving report shows serial numbers
- [ ] Test with 0 serial numbers (optional field)
- [ ] Test with quantity mismatch (shows warning)
- [ ] Test duplicate serial number (should fail)

### **API Testing**
```bash
# Test delivery creation with serials
POST http://localhost:3001/api/deliveries/for-po/{poId}
{
  "items": [{
    "serial_numbers": ["TEST001", "TEST002"]
  }]
}

# Test retrieval
GET http://localhost:3001/api/deliveries/{deliveryId}/serial-numbers
```

## Files Modified

1. ✅ `add-serial-numbers-to-deliveries.sql` - Database schema
2. ✅ `src/pages/ReceiveDelivery.tsx` - Input UI + CSV import
3. ✅ `src/components/reports/ReceivingReport.tsx` - Display in reports
4. ✅ `server/routes/deliveries.cjs` - Backend API

## Deployment Steps

1. **Database**:
   ```bash
   sqlcmd -S YOUR_SERVER -d InventoryManagementDB -i add-serial-numbers-to-deliveries.sql
   ```

2. **Backend**:
   - No restart needed (hot reload)
   - Or: `npm run dev` in server directory

3. **Frontend**:
   ```bash
   npm run build
   # Copy dist/ to production server
   ```

4. **Verification**:
   - Navigate to receive delivery page
   - Confirm "Serial Numbers" column appears
   - Test CSV import button works
   - Check receiving report displays serials

## Support

For issues or questions:
- Check database table exists: `SELECT * FROM delivery_item_serial_numbers`
- Check backend logs for errors
- Verify frontend build includes latest changes
- Clear browser cache if using production

---

**Version**: 1.0.0  
**Date**: February 11, 2026  
**Author**: GitHub Copilot  
**Status**: ✅ Complete and Ready for Testing
