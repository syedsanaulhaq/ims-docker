# Inventory Management System (IMS) - User Manual

**Version:** 1.0  
**Last Updated:** January 5, 2026  
**System:** Inventory Management System (IMS)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles](#user-roles)
3. [Getting Started](#getting-started)
4. [Store Keeper Guide](#store-keeper-guide)
5. [Supervisor/Approver Guide](#supervisorapprover-guide)
6. [Verification Workflow](#verification-workflow)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## System Overview

### What is the IMS?

The Inventory Management System (IMS) is a web-based application designed to manage inventory items across multiple wings and locations. It provides tools for:

- **Requesting Items:** Create and track item requests
- **Verification:** Verify item availability in physical stores
- **Approval:** Approve or reject inventory requests
- **Tracking:** Monitor the status of all requests throughout the process

### Key Features

✅ **Real-time Tracking** - See the status of requests in real-time  
✅ **Role-Based Access** - Different views and permissions for different users  
✅ **Verification Workflow** - Store keepers verify items physically  
✅ **Approval System** - Supervisors approve or disapprove requests  
✅ **Dashboard Analytics** - View statistics and summaries  

---

## User Roles

The IMS has different user roles with specific permissions:

### 1. **Store Keeper**
**Responsibility:** Physical verification of items in stock

**Permissions:**
- View items forwarded for verification
- Perform physical count
- Report item status (Available/Partial/Unavailable)
- Add verification notes

**Access Point:** Store Keeper Verifications Dashboard

---

### 2. **Supervisor / Wing Approver**
**Responsibility:** Request items and approve verification results

**Permissions:**
- Create verification requests
- Forward items to store keepers
- View verification results from store keepers
- Approve or disapprove requests
- View approval history

**Access Point:** Approval Dashboard & Pending Verifications

---

### 3. **Admin / System Administrator**
**Responsibility:** System configuration and user management

**Permissions:**
- Manage users and roles
- Configure system settings
- View system reports
- Manage designations and wings

---

## Getting Started

### 1. **Login to the System**

1. Open your web browser
2. Navigate to: `http://localhost:8080` (or your configured URL)
3. Enter your **Username** and **Password**
4. Click **Login**

### 2. **Dashboard Overview**

After login, you'll see your role-specific dashboard with:
- Status cards showing counts
- List of pending/forwarded items
- Action buttons
- Recent activity

### 3. **Navigation Menu**

Use the top navigation bar to access:
- **Dashboard** - Your home page
- **Inventory** - Inventory management features
- **Approvals** - Approval workflows
- **Reports** - Analytics and reports
- **Settings** - User preferences
- **Profile** - Your account information

---

## Store Keeper Guide

### **Overview**

As a Store Keeper, your role is to:
1. Receive verification requests from supervisors
2. Physically count/verify items in storage
3. Report availability status
4. Provide notes about item condition

### **Accessing the Store Keeper Dashboard**

1. **Login** to the system with your credentials
2. Click **Store Keeper Verifications** or navigate to the dashboard
3. You'll see items forwarded to you

### **Dashboard Layout**

**Top Section - Status Cards:**
- 🟨 **Pending** - Items waiting for your verification
- ✅ **Available** - Items you confirmed are in stock
- ⚠️ **Partial** - Items partially available
- ❌ **Unavailable** - Items not found
- 📦 **Total** - All forwarded items

**Main Section - Forwarded Verifications List:**

Each item shows:
- **Item Name** - What you need to verify (e.g., "SAN Switches")
- **Status Badge** - Current status (Pending/Available/Partial/Unavailable)
- **Quantity Requested** - How many units needed
- **Designation** - Requester's job title
- **Requested By** - Who requested this verification
- **Created Date** - When the request was made
- **Verify Button** - Click to verify this item

### **How to Verify an Item - Step by Step**

#### **Step 1: Click the "Verify" Button**
```
Find the item you need to verify in the list
Click the [Verify] button on the right
A popup modal will appear
```

#### **Step 2: Review Item Information**
The modal shows:
- Item name and requested quantity
- Stock levels available in different stores
- Current availability information

#### **Step 3: Perform Physical Count**
- Go to your physical storage
- Count the actual items available
- Note the condition and location

#### **Step 4: Select Verification Result**

**Choose ONE of three options:**

**✅ Available**
- Item is fully available in requested quantity
- Select this if you found all requested units

**⚠️ Partial**
- Item is available but in less than requested quantity
- You'll be asked to enter the exact quantity found
- Example: Requested 5, but found only 3

**❌ Unavailable**
- Item is not in stock
- Select this if item cannot be found

#### **Step 5: Add Verification Notes (Optional)**

Click in the **Notes** field and add details:
```
Examples:
- "Found in main storage room, good condition"
- "Located behind the filing cabinets"
- "Some units damaged, counted only good ones"
- "Stock level lower than system records"
```

#### **Step 6: Submit Verification**

Click the **[Submit Verification]** button

**Success!** You'll see:
```
✅ Verification Completed Successfully!

Verification ID: #11
Item: SAN Switches
Result: ✅ Available
```

The item will:
- Move from "Pending" to the appropriate status section
- Be available for the requester to review

---

## Supervisor/Approver Guide

### **Overview**

As a Supervisor/Approver, your role is to:
1. Request item verifications from store keepers
2. Receive store keeper's verification results
3. Approve or disapprove based on results
4. Manage inventory across your wing/area

### **Accessing Your Dashboard**

1. **Login** to the system
2. Click **Approval Dashboard** or navigate to your dashboard
3. You'll see items ready for approval workflow

### **Dashboard Layout**

**Status Cards:**
- 🟨 **Pending** - Awaiting approval
- ✅ **Approved** - Successfully approved items
- ❌ **Rejected** - Disapproved items

**Main Section - Items Ready for Verification:**

Each item shows:
- **Item Name** with status badge
- **Quick Actions:** Approve / Disapprove / Forward buttons
- **Details:** Quantity, Wing, Date Created
- **Additional Info:** Item details grid

### **Workflow: Creating a Verification Request**

#### **Step 1: Select Item to Request**

1. Go to **Approval Dashboard**
2. Find the item you want to verify
3. Look for the **Forward to Store Keeper** button/action

#### **Step 2: Verify Item Details**

Before forwarding, confirm:
- Item name is correct
- Quantity requested is accurate
- Wing/location is correct

#### **Step 3: Forward to Store Keeper**

Click **Forward to Store Keeper**

**Behind the scenes:**
- System automatically finds the store keeper in your wing
- Verification request is created
- Store keeper receives the request
- System records your name and timestamp

#### **Step 4: Track Verification Status**

Check the **Pending Verifications** page to:
- See status of all your requests
- View store keeper's responses
- Track timeline

---

## Verification Workflow

### **Complete Workflow Diagram**

```
┌─────────────────────────────────────────┐
│   SUPERVISOR/APPROVER                    │
│   Creates Verification Request           │
│   - Item: SAN Switches                   │
│   - Quantity: 5 units                    │
│   - Wing: 19                             │
└────────────────────┬────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ REQUEST CREATED        │
        │ Status: PENDING        │
        │ Forwarded to: SK#001   │
        └────────────┬───────────┘
                     │
                     ↓
┌─────────────────────────────────────────┐
│   STORE KEEPER                           │
│   Receives Forwarded Verification        │
│   Dashboard shows: 1 Pending             │
└────────────────┬──────────────────────────┘
                 │
                 ↓
        ┌────────────────────────┐
        │ VERIFICATION PROCESS   │
        │ - Physical Count       │
        │ - Check Condition      │
        │ - Note Location        │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ SUBMIT RESULT          │
        │ Status: VERIFIED       │
        │ Available: 5 units ✅  │
        │ Notes: Found in...     │
        └────────────┬───────────┘
                     │
                     ↓
┌─────────────────────────────────────────┐
│   SUPERVISOR/APPROVER                    │
│   Reviews Store Keeper Response          │
│   Dashboard shows: 1 Available            │
└────────────────────────────────────────┘
```

### **Status Flow**

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | 🟨 Pending | Waiting for store keeper to verify |
| 2 | ✅ Available | Store keeper found all items |
| 2 | ⚠️ Partial | Store keeper found some items |
| 2 | ❌ Unavailable | Store keeper couldn't find items |
| 3 | ✅ Approved | Supervisor approved the result |
| 3 | ❌ Rejected | Supervisor rejected the result |

---

## Key Features

### **1. Store Keeper Verifications**
- **URL:** `http://localhost:8080/dashboard/store-keeper-verifications`
- **Who:** Store Keepers
- **Purpose:** Verify item availability
- **Features:**
  - View forwarded items
  - Filter by status
  - Add notes
  - Submit verification

### **2. Pending Verifications**
- **URL:** `http://localhost:8080/dashboard/pending-verifications`
- **Who:** Supervisors/Approvers
- **Purpose:** Track verification requests and results
- **Features:**
  - View all requests
  - See store keeper responses
  - View physical counts
  - Review verification notes

### **3. Approval Dashboard**
- **URL:** `http://localhost:8080/dashboard/approval`
- **Who:** Supervisors
- **Purpose:** Create and manage verification requests
- **Features:**
  - Forward items to store keepers
  - View request history
  - Approve/disapprove items

---

## Understanding the Data

### **Verification Details - What You'll See**

When a store keeper submits a verification, you'll see:

```
✅ Verification Feedback
├─ Status: ✅ Available
├─ Physical Count: 5 units
├─ Verified By: 3740506012171 (Store Keeper Name)
└─ Notes: Found in main storage, good condition
```

### **What Each Field Means**

| Field | Meaning |
|-------|---------|
| **Status** | Available/Partial/Unavailable result |
| **Physical Count** | Actual number of items found |
| **Verified By** | Name/ID of store keeper who verified |
| **Notes** | Additional details about the items |

---

## Troubleshooting

### **Problem: I can't see any items on my dashboard**

**Solution:**
1. Verify you're logged in with the correct role
2. Check if items have been forwarded to you
3. Try refreshing the page (F5 or Ctrl+R)
4. Clear browser cache if needed

### **Problem: The "Verify" button is not working**

**Solution:**
1. Ensure you're logged in as a Store Keeper
2. Check if the item status is "Pending"
3. Try a different browser
4. Contact your system administrator

### **Problem: I can't see the store keeper's response**

**Solution:**
1. Go to **Pending Verifications** page
2. Scroll down to see the full item details
3. Look for the **Verification Feedback** box
4. If not visible, the store keeper hasn't submitted yet

### **Problem: Wing name is showing as "Unknown"**

**Solution:**
1. This shows the requester's designation instead of wing
2. Check the **Designation** column for job title
3. If still showing "Unknown", contact admin to update user designation

### **Problem: Can't submit verification form**

**Solution:**
1. Make sure you've selected a result (Available/Partial/Unavailable)
2. For Partial, enter a quantity in the quantity field
3. Check all required fields are filled
4. Click **Submit Verification** button (not elsewhere)

---

## FAQ (Frequently Asked Questions)

### **General Questions**

**Q: What is the IMS used for?**  
A: The IMS tracks inventory items across your organization, allowing supervisors to request verifications and store keepers to confirm item availability.

**Q: Who can access the IMS?**  
A: Users with assigned roles (Store Keeper, Supervisor, Admin) can access the IMS using their login credentials.

**Q: Can I change my password?**  
A: Yes, go to Settings → Account Security to change your password.

---

### **Store Keeper Questions**

**Q: What should I do when I can't find an item?**  
A: Select "Unavailable" and note in the comments where you looked and why it wasn't found.

**Q: What if I find fewer items than requested?**  
A: Select "Partial" and enter the actual quantity you found.

**Q: Can I edit a verification after submitting?**  
A: No, once submitted, you cannot edit. Contact your supervisor if a correction is needed.

**Q: How long should verification take?**  
A: It depends on the item. You can verify items at your own pace, but respond as quickly as possible.

**Q: What if the item condition is poor?**  
A: Select "Available" or "Partial" and note the condition issues in the verification notes. Example: "Found 3 units but 2 are damaged."

---

### **Supervisor Questions**

**Q: How do I know when a store keeper has verified an item?**  
A: Check the **Pending Verifications** page. Items will move from "Pending" count to the appropriate status (Available/Partial/Unavailable).

**Q: Can I request multiple items at once?**  
A: Currently, items are forwarded one at a time. To verify multiple items, forward them individually.

**Q: What if I disagree with the store keeper's verification?**  
A: You can review the details and notes. If incorrect, contact the store keeper directly to clarify.

**Q: How do I see the history of all verifications?**  
A: Go to **Verification History** page to see all past verifications and their results.

**Q: Can I reject a verification result?**  
A: Yes, if you believe the store keeper made an error. Use the **Disapprove** button and add comments.

---

### **Technical Questions**

**Q: What browser should I use?**  
A: The IMS works best with modern browsers: Chrome, Firefox, Edge, or Safari.

**Q: Can I access IMS from my mobile device?**  
A: Yes, the IMS is responsive and works on tablets and smartphones.

**Q: What if I get an error message?**  
A: Note the error message and contact your system administrator with the details.

**Q: Is my data secure?**  
A: Yes, all data is encrypted and access is controlled by role-based permissions.

---

## Best Practices

### **For Store Keepers:**

1. ✅ **Verify promptly** - Respond to forwarded items quickly
2. ✅ **Be accurate** - Count carefully and report exact numbers
3. ✅ **Add details** - Use notes to explain any issues or special conditions
4. ✅ **Document location** - Note where items are stored for future reference
5. ✅ **Check condition** - Report any damaged or expired items

### **For Supervisors:**

1. ✅ **Forward clearly** - Ensure item details are correct before forwarding
2. ✅ **Review completely** - Read store keeper notes carefully
3. ✅ **Provide feedback** - Use the approval system to acknowledge results
4. ✅ **Track timeline** - Monitor how long verifications take
5. ✅ **Communicate** - Discuss discrepancies with store keepers

---

## Support & Contact

**For Technical Issues:**
- Contact your System Administrator
- Email: support@ims.example.com
- Phone: Extension 1234

**For System Access Issues:**
- Contact your Department Manager
- Provide your username and the issue description

**For Training:**
- Refer to this manual
- Contact your team lead for guidance

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 5, 2026 | Initial release |

---

**End of User Manual**

For updates or corrections to this manual, please contact your System Administrator.
