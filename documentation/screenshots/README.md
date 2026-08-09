# Screenshot Capture Guide

This folder should contain screenshots for the IMS System Documentation.

## Screenshot Naming Convention

Use the following format: `{number}-{page-name}.png`

## Required Screenshots List

### Login & Entry (01-06)
- [ ] 01-login-page.png - Login page
- [ ] 02-ds-landing.png - Digital System landing overview
- [ ] 03-super-admin-dashboard.png - Super admin view
- [ ] 04-wing-supervisor-dashboard.png - Wing supervisor view
- [ ] 05-general-user-dashboard.png - General user view
- [ ] 06-ds-landing-full.png - DS landing full page

### Personal Dashboard Module (07-09)
- [ ] 07-personal-dashboard.png - Personal dashboard
- [ ] 08-my-requests.png - My requests page
- [ ] 09-my-issued-items.png - My issued items

### Stock Issuance Module (10-14)
- [ ] 10-stock-issuance-form.png - Stock issuance request form
- [ ] 11-custom-item-entry.png - Custom item entry
- [ ] 12-stock-issuance-dashboard.png - Stock issuance dashboard
- [ ] 13-stock-issuance-processing.png - Processing queue
- [ ] 14-stock-return.png - Stock return form

### Wing Management Module (15-19)
- [ ] 15-wing-dashboard.png - Wing dashboard
- [ ] 16-wing-inventory.png - Wing inventory
- [ ] 17-wing-members.png - Wing members
- [ ] 18-wing-request-history.png - Wing request history
- [ ] 19-wing-requests.png - Active wing requests

### Inventory Module (20-30)
- [ ] 20-inventory-dashboard.png - Inventory dashboard
- [ ] 21-item-master.png - Item master list
- [ ] 22-item-master-form.png - Item master form
- [ ] 23-categories.png - Categories management
- [ ] 24-sub-categories.png - Sub-categories management
- [ ] 25-stock-quantities.png - Stock quantities
- [ ] 26-stock-alerts.png - Stock alerts
- [ ] 27-opening-balance.png - Opening balance entry
- [ ] 28-pending-verifications.png - Pending verifications
- [ ] 29-store-keeper-verifications.png - Store keeper verifications
- [ ] 30-verification-history.png - Verification history

### Procurement Module (31-41)
- [ ] 31-tender-dashboard.png - Tender dashboard
- [ ] 32-create-tender.png - Create tender form
- [ ] 33-tender-details.png - Tender details
- [ ] 34-annual-tender.png - Annual tender management
- [ ] 35-vendor-management.png - Vendor management
- [ ] 36-vendor-form.png - Vendor form
- [ ] 37-purchase-orders.png - Purchase order dashboard
- [ ] 38-create-po.png - Create PO form
- [ ] 39-po-details.png - PO details
- [ ] 40-receive-delivery.png - Receive delivery form
- [ ] 41-stock-acquisition-report.png - Stock acquisition report

### Approval Module (42-49)
- [ ] 42-approval-dashboard-request.png - Approval dashboard (request-based)
- [ ] 43-approval-dashboard-item.png - Approval dashboard (item-based)
- [ ] 44-request-details.png - Request details with actions
- [ ] 45-approval-forwarding.png - Approval forwarding
- [ ] 46-future-requests.png - Future requests
- [ ] 47-rejected-requests.png - Rejected requests
- [ ] 48-pending-requests.png - Pending requests
- [ ] 49-workflow-admin.png - Workflow administration

### Reports Module (50-54)
- [ ] 50-reports-dashboard.png - Reports dashboard
- [ ] 51-inventory-report.png - Inventory report
- [ ] 52-tender-report.png - Tender report
- [ ] 53-delivery-report.png - Delivery report
- [ ] 54-stock-transactions.png - Stock transactions

### Administration Module (55-59)
- [ ] 55-admin-dashboard.png - Admin dashboard
- [ ] 56-role-management.png - Role management
- [ ] 57-user-management.png - User management
- [ ] 58-system-settings.png - System settings
- [ ] 59-user-sync.png - User sync dashboard

## How to Capture Screenshots

### Method 1: Browser Developer Tools (Recommended)

**Chrome:**
1. Press F12 to open DevTools
2. Press Ctrl+Shift+P
3. Type "screenshot" and select "Capture full size screenshot"

**Firefox:**
1. Press F12 to open DevTools
2. Click the "..." menu in DevTools
3. Select "Take a full page screenshot"

**Edge:**
1. Press F12 to open DevTools
2. Press Ctrl+Shift+P
3. Type "screenshot" and select "Capture full size screenshot"

### Method 2: Windows Snipping Tool
1. Press Win+Shift+S
2. Select area to capture
3. Paste and save

### Method 3: Full Page Screenshot Extensions
- GoFullPage (Chrome)
- Fireshot (Chrome/Firefox)

## Screenshot Guidelines

1. **Resolution:** Use 1920x1080 or similar
2. **Login with Different Roles:** Capture role-specific views
   - Super Admin (for full access views)
   - Wing Supervisor (for wing-specific views)
   - General User (for personal views)
3. **Sample Data:** Ensure system has representative data
4. **Clean State:** Clear browser history/cache for clean captures
5. **Consistent Sizing:** Keep window size consistent across captures

## After Capturing

1. Place all screenshots in this folder
2. Ensure naming matches the convention above
3. Update the HTML documentation to point to actual screenshot files
4. Generate Word document from HTML (File > Save As > Word Document)

## Converting HTML to Word

### Method 1: Microsoft Word
1. Open the HTML file in Microsoft Word
2. File > Save As
3. Select "Word Document (*.docx)"
4. Save

### Method 2: LibreOffice
1. Open the HTML file in LibreOffice Writer
2. File > Save As
3. Select "ODF Text Document" or "Microsoft Word"
4. Save

### Method 3: Pandoc (Command Line)
```bash
pandoc IMS-SYSTEM-DOCUMENTATION.html -o IMS-SYSTEM-DOCUMENTATION.docx
```

## Note

The documentation files are located in:
- `documentation/IMS-SYSTEM-DOCUMENTATION.md` - Markdown format
- `documentation/IMS-SYSTEM-DOCUMENTATION.html` - HTML format (can be converted to Word)
