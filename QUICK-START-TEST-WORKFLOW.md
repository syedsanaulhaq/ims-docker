# 🚀 Quick Start Guide - Test the Approval Workflow

## Prerequisites

- Backend running: `http://localhost:3001`
- Frontend running: `http://localhost:8080`
- Database connected

## Step 1: Create Fresh Test Data

Run this command in the terminal to clear old data and create a fresh test request:

```bash
node clear-and-create-fresh-test-data.cjs
```

**Output should show:**
```
✅ FRESH TEST DATA READY
Request ID: [UUID]
Approval ID: [UUID]
Requester: Asif Ali Yasin
Approver: Abdullah Shah

Items:
  - Dell Laptop x2
  - Office Chair x5
  - Monitor 24" x3
  - Keyboard Mechanical x10
```

## Step 2: Open the Dashboard

Go to: **`http://localhost:8080/dashboard/approval-dashboard`**

## Step 3: Make Approval Decisions

### See the Pending Request
- Click on **"Pending Approvals"** card
- You should see the fresh request with 4 items

### Approve First 2 Items
1. **Dell Laptop**
   - Click the green **"✓ Approve From Wing"** box
   
2. **Office Chair**
   - Click the green **"✓ Approve From Wing"** box

### Return Last 2 Items
3. **Monitor 24"**
   - Click the orange **"↩ Return To Requester"** box
   
4. **Keyboard Mechanical**
   - Click the orange **"↩ Return To Requester"** box

## Step 4: Submit the Approval

- At the bottom, click **"Submit Approval"** button
- Wait for success message

## Step 5: Verify the Results

### In Dashboard
- ✅ Request should **NO LONGER** appear in "Pending Approvals"
- ✅ Request should now appear in **"Returned Approvals"** tab
- ✅ When viewing it:
  - **NO radio buttons** are shown (items are display-only)
  - Green boxes show approved items
  - Orange boxes show returned items
  - All boxes are highlighted but not selectable

### In Database
```bash
# Verify approval status changed to 'returned'
node verify-returned-status-final.cjs
```

## Key Features Implemented

✅ **Radio Button Logic**
- Shows radio buttons **ONLY** for pending approvals
- Other statuses show display-only boxes

✅ **Mixed Decisions**
- Can approve some items and return others
- Entire approval marked 'returned' if ANY item is returned

✅ **Clear Status Indication**
- Color-coded boxes:
  - 🟢 Green = Approved
  - 🟠 Orange = Returned
  - 🔴 Red = Rejected
  - 🔵 Blue = Forwarded

✅ **Requester Notification**
- Gets notification when items are returned
- Can edit only returned items
- Approved items are locked

## Troubleshooting

### Fresh data script fails
```bash
# Make sure you're in the right directory
cd e:\ECP-Projects\inventory-management-system-ims\ims-v1
node clear-and-create-fresh-test-data.cjs
```

### Dashboard shows old data
- Refresh the browser: `Ctrl+F5`
- Clear browser cache if needed

### Radio buttons still showing on other tabs
- Make sure code was updated: Check `PerItemApprovalPanel.tsx` line 663+
- Restart the frontend development server

### Items not updating after approval
- Check browser console for errors: `F12`
- Check backend logs for API errors

## Next Steps

After confirming the workflow works:

1. **Test Requester Flow**
   - Log in as requester (Asif Ali Yasin)
   - See returned request in "My Requests > Returned"
   - Edit returned items and resubmit

2. **Test Complete Cycle**
   - Supervisor approves all items
   - Verify status changes to 'approved'
   - Items no longer editable

3. **Test Different Scenarios**
   - All rejected
   - All forwarded
   - Mix of everything

## Commands Reference

```bash
# Create fresh test data
node clear-and-create-fresh-test-data.cjs

# Verify returned status logic
node verify-returned-status-final.cjs

# Check database approval status
node check-approval-details.cjs
```

---

**Status:** ✅ Ready for Testing  
**Last Updated:** 2025-01-01  
**Version:** 1.0
