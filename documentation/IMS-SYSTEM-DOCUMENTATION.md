# Inventory Management System (IMS)
# Complete System Documentation

---

**Document Version:** 2.0  
**Last Updated:** February 25, 2026  
**Classification:** Internal Use Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [System Architecture](#3-system-architecture)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Module 1: Digital System Integration (DS Landing)](#5-module-1-digital-system-integration)
6. [Module 2: Personal Dashboard](#6-module-2-personal-dashboard)
7. [Module 3: Stock Issuance](#7-module-3-stock-issuance)
8. [Module 4: Wing Management](#8-module-4-wing-management)
9. [Module 5: Inventory Management](#9-module-5-inventory-management)
10. [Module 6: Procurement Management](#10-module-6-procurement-management)
11. [Module 7: Approval Workflow](#11-module-7-approval-workflow)
12. [Module 8: Reports & Analytics](#12-module-8-reports--analytics)
13. [Module 9: Administration](#13-module-9-administration)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

The **Inventory Management System (IMS)** is a comprehensive enterprise solution designed to manage the complete lifecycle of inventory within an organization. The system integrates with the existing Digital System (DS) for seamless user authentication and provides role-based access to various modules including:

- **Stock Request & Issuance** - Personal and wing-level item requisitions
- **Procurement Management** - Tenders, Purchase Orders, and Vendor Management
- **Inventory Control** - Stock tracking, verification, and alerts
- **Approval Workflows** - Multi-level approval chains with forwarding capability
- **Reporting & Analytics** - Comprehensive reporting across all modules

### Key Features
- Single Sign-On (SSO) integration with Digital System
- Role-based access control with 7+ predefined roles
- Multi-level approval workflow with forwarding
- Real-time inventory tracking and alerts
- Soft-delete functionality for data recovery
- Custom item support for non-catalogued requests

---

## 2. System Overview

### 2.1 System Entry Points

The IMS system can be accessed through two primary entry points:

1. **Direct Login** (`/login`)
   - Standalone login page for direct access
   
2. **SSO from Digital System** (`/sso-login`)
   - Single Sign-On authentication from the main Digital System
   - Automatic role synchronization

### 2.2 Navigation Flow

```
Digital System (DS)
        │
        ▼
   DS Landing Page ─────────────────────────────────┐
        │                                           │
        ├─── Personal IMS ────► Personal Dashboard  │
        │                            │              │
        │                            ├── My Requests│
        │                            ├── Request Item
        │                            └── My Issued Items
        │                                           │
        └─── Wing IMS ────────► Wing Dashboard     │
                                     │              │
                                     ├── Wing Inventory
                                     ├── Wing Members
                                     └── Request History
```

### 2.3 Screenshot: System Login Page

![Login Page](screenshots/01-login-page.png)
*Figure 2.1: IMS Login Page - Standalone authentication*

### 2.4 Screenshot: DS Landing Page

![DS Landing](screenshots/02-ds-landing.png)
*Figure 2.2: Digital System Landing - Entry point from DS with module selection*

---

## 3. System Architecture

### 3.1 Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | Tailwind CSS + ShadCN UI |
| Backend | Node.js + Express |
| Database | SQL Server 2019+ |
| Authentication | Session-based with SSO support |
| State Management | TanStack Query (React Query) |

### 3.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Personal    │ │ Wing        │ │ Inventory   │ │ Procurement │ │
│  │ Module      │ │ Module      │ │ Module      │ │ Module      │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js + Express)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Auth     │ │ Stock    │ │ Approval │ │ Reports  │            │
│  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes   │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (SQL Server)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tables: item_masters, stock_acquisitions, categories,    │   │
│  │ stock_issuance_requests, stock_issuance_items, tenders,  │   │
│  │ purchase_orders, vendors, ims_roles, ims_permissions...  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. User Roles & Permissions

### 4.1 Role Hierarchy

The system implements a comprehensive role-based access control (RBAC) system with the following predefined roles:

| Role | Display Name | Total Permissions | Access Level |
|------|-------------|-------------------|--------------|
| IMS_SUPER_ADMIN | IMS Super Administrator | 50 | Full System |
| IMS_ADMIN | IMS Administrator | 43 | Administrative |
| WING_SUPERVISOR | Wing Supervisor | 20 | Wing Level |
| PROCUREMENT_OFFICER | Procurement Officer | 10 | Procurement |
| WING_STORE_KEEPER | Wing Store Keeper | 9 | Store Operations |
| AUDITOR | Auditor | 9 | Read-Only Reports |
| GENERAL_USER | General User | 8 | Personal Only |

### 4.2 Role: IMS_SUPER_ADMIN (50 permissions)

**Description:** Full administrative access to all system features

**Key Permissions:**
- `admin.super` - Super admin access
- `roles.manage` - Create and manage roles
- `users.assign_roles` - Assign roles to users
- `inventory.manage` - Full inventory management
- `procurement.manage` - Full procurement management
- `approval.approve` - Approve requests at any level
- `reports.view` - Access all reports

**Accessible Menus:**
- All Personal Menu items
- All Wing Menu items (if assigned to wing)
- Store Keeper Menu
- Meta Data Menu
- Inventory Menu
- Procurement Menu
- Stock Issuance Menu
- Approval Menu
- Super Admin Menu

### 4.3 Screenshot: Super Admin Dashboard

![Super Admin Dashboard](screenshots/03-super-admin-dashboard.png)
*Figure 4.1: Super Admin Dashboard with comprehensive statistics and navigation*

### 4.4 Role: WING_SUPERVISOR (20 permissions)

**Description:** Wing-level management with approval authority

**Key Permissions:**
- `wing.supervisor` - Wing supervisor access
- `approval.approve` - Approve subordinate requests
- `inventory.view` - View wing inventory
- `issuance.request` - Request items for wing

**Accessible Menus:**
- Personal Menu
- Wing Menu
- Request History Menu (for approved/rejected tracking)

### 4.5 Screenshot: Wing Supervisor Dashboard

![Wing Supervisor Dashboard](screenshots/04-wing-supervisor-dashboard.png)
*Figure 4.2: Wing Supervisor view showing wing statistics and pending approvals*

### 4.6 Role: GENERAL_USER (8 permissions)

**Description:** Basic user with personal request capabilities

**Key Permissions:**
- `issuance.request` - Request items personally
- `procurement.view_own` - View own procurement requests
- `dashboard.view` - View personal dashboard

**Accessible Menus:**
- Personal Menu only

### 4.7 Screenshot: General User Dashboard

![General User Dashboard](screenshots/05-general-user-dashboard.png)
*Figure 4.3: General User view with personal request options*

---

## 5. Module 1: Digital System Integration

### 5.1 DS Landing Page

The Digital System Landing page serves as the primary entry point for users authenticated through the main organization Digital System.

**URL:** `/ds-landing`

**Features:**
- Module selection (Personal IMS / Wing IMS)
- User profile display
- Quick navigation to key functions

### 5.2 Screenshot: DS Landing Page

![DS Landing Page](screenshots/06-ds-landing-full.png)
*Figure 5.1: Digital System Landing Page showing module selection*

### 5.3 SSO Authentication Flow

```
User clicks IMS link in DS
        │
        ▼
  SSO Token Generated
        │
        ▼
   /sso-login endpoint
        │
        ▼
  Token Validation
        │
        ├── Valid ────► Create Session ────► DS Landing
        │
        └── Invalid ──► Login Page
```

---

## 6. Module 2: Personal Dashboard

### 6.1 Overview

The Personal Dashboard module provides individual users with tools to manage their personal inventory needs.

**Route:** `/personal-dashboard`

### 6.2 Personal Dashboard Features

| Feature | Description | Route |
|---------|-------------|-------|
| My Dashboard | Personal statistics overview | `/personal-dashboard` |
| My Requests | Track submitted requests | `/dashboard/my-requests` |
| My Issued Items | View items assigned to user | `/dashboard/my-issued-items` |
| Request Item | Create new item request | `/dashboard/stock-issuance-personal` |
| Return Item | Return issued items | `/dashboard/stock-return` |

### 6.3 Screenshot: Personal Dashboard

![Personal Dashboard](screenshots/07-personal-dashboard.png)
*Figure 6.1: Personal Dashboard showing request statistics and quick actions*

### 6.4 My Requests Page

The My Requests page displays all requests submitted by the current user with their current status.

**Features:**
- Filter by status (Pending, Approved, Rejected, Returned)
- Request details view
- Edit capability for returned requests

### 6.5 Screenshot: My Requests Page

![My Requests](screenshots/08-my-requests.png)
*Figure 6.2: My Requests page with request listing and status filters*

### 6.6 My Issued Items

Displays all items currently issued to the user.

**Features:**
- Item details with quantity
- Issue date and expected return date
- Return item action

### 6.7 Screenshot: My Issued Items

![My Issued Items](screenshots/09-my-issued-items.png)
*Figure 6.3: My Issued Items showing currently assigned inventory*

---

## 7. Module 3: Stock Issuance

### 7.1 Overview

The Stock Issuance module handles the complete workflow of requesting, approving, and issuing inventory items.

### 7.2 Stock Issuance Request Form

**Route:** `/dashboard/stock-issuance-personal`

**Form Fields:**
- Request Type (Personal Expenditure / Returnable / Individual)
- Category Selection
- Item Search (with autocomplete)
- Custom Item Entry (for unavailable items)
- Quantity
- Priority (Low/Normal/High/Critical)
- Justification

### 7.3 Screenshot: Stock Issuance Request Form

![Stock Issuance Form](screenshots/10-stock-issuance-form.png)
*Figure 7.1: Stock Issuance Request Form with item selection*

### 7.4 Custom Item Feature

When users cannot find the required item in the inventory catalog, they can add a custom item:

**Features:**
- Click "Can't find your item? Add a custom item"
- Enter custom item name
- Specify quantity
- Custom items follow the same approval workflow

### 7.5 Screenshot: Custom Item Entry

![Custom Item Entry](screenshots/11-custom-item-entry.png)
*Figure 7.2: Custom Item Entry form for non-catalogued items*

### 7.6 Stock Issuance Dashboard (Admin View)

**Route:** `/dashboard/stock-issuance-dashboard`

Provides administrators with an overview of all issuance activity.

**Features:**
- Total requests statistics
- Status breakdown (Pending/Approved/Processing/Issued)
- Recent activity timeline
- Quick search

### 7.7 Screenshot: Stock Issuance Dashboard

![Stock Issuance Dashboard](screenshots/12-stock-issuance-dashboard.png)
*Figure 7.3: Stock Issuance Dashboard with statistics overview*

### 7.8 Stock Issuance Processing

**Route:** `/dashboard/stock-issuance-processing`

For store keepers and inventory managers to process approved requests.

**Features:**
- List of approved requests pending issuance
- Item availability check
- Issue confirmation
- Partial issuance support

### 7.9 Screenshot: Stock Issuance Processing

![Stock Issuance Processing](screenshots/13-stock-issuance-processing.png)
*Figure 7.4: Stock Issuance Processing queue*

### 7.10 Stock Return

**Route:** `/dashboard/stock-return`

Allows users to return issued items back to inventory.

**Features:**
- Select items to return
- Return quantity specification
- Condition notes
- Return verification by store keeper

### 7.11 Screenshot: Stock Return Form

![Stock Return](screenshots/14-stock-return.png)
*Figure 7.5: Stock Return form*

---

## 8. Module 4: Wing Management

### 8.1 Overview

The Wing Management module provides wing-level inventory and personnel management for Wing Supervisors.

### 8.2 Wing Dashboard

**Route:** `/dashboard/wing-dashboard`

**Features:**
- Wing statistics overview
- Pending approvals count
- Wing inventory summary
- Member activity

### 8.3 Screenshot: Wing Dashboard

![Wing Dashboard](screenshots/15-wing-dashboard.png)
*Figure 8.1: Wing Dashboard with wing-level statistics*

### 8.4 Wing Inventory

**Route:** `/dashboard/wing-inventory`

Displays all inventory items assigned to the wing.

**Features:**
- Item listing with quantities
- Stock alerts
- Transfer capabilities

### 8.5 Screenshot: Wing Inventory

![Wing Inventory](screenshots/16-wing-inventory.png)
*Figure 8.2: Wing Inventory listing*

### 8.6 Wing Members

**Route:** `/dashboard/wing-members`

Manage wing personnel and their access.

**Features:**
- Member listing
- Role assignment
- Activity tracking

### 8.7 Screenshot: Wing Members

![Wing Members](screenshots/17-wing-members.png)
*Figure 8.3: Wing Members management*

### 8.8 Wing Request History

**Route:** `/dashboard/wing-request-history`

View all requests from wing members.

**Features:**
- Full request history
- Filter by member
- Status tracking

### 8.9 Screenshot: Wing Request History

![Wing Request History](screenshots/18-wing-request-history.png)
*Figure 8.4: Wing Request History*

### 8.10 Wing Requests Page

**Route:** `/dashboard/wing-requests`

Current pending requests from wing members requiring action.

### 8.11 Screenshot: Wing Requests

![Wing Requests](screenshots/19-wing-requests.png)
*Figure 8.5: Active Wing Requests*

---

## 9. Module 5: Inventory Management

### 9.1 Overview

The Inventory Management module provides comprehensive tools for managing organizational inventory.

### 9.2 Inventory Dashboard

**Route:** `/dashboard/inventory-dashboard`

**Statistics Displayed:**
- Total Items in Master
- Items with Stock
- Low Stock Alerts
- Out of Stock Items
- Total Stock Value
- Recent Transactions

### 9.3 Screenshot: Inventory Dashboard

![Inventory Dashboard](screenshots/20-inventory-dashboard.png)
*Figure 9.1: Inventory Dashboard with comprehensive statistics*

### 9.4 Item Master

**Route:** `/dashboard/item-master`

Central repository for all inventory item definitions.

**Features:**
- Item CRUD operations
- Category assignment
- Sub-category management
- Reorder point setting
- Unit of measure

### 9.5 Screenshot: Item Master

![Item Master](screenshots/21-item-master.png)
*Figure 9.2: Item Master management*

### 9.6 Item Master Form

**Form Fields:**
- Nomenclature (Item Name)
- Description
- Category
- Sub-Category
- Unit of Measure
- Reorder Point
- Active Status

### 9.7 Screenshot: Item Master Form

![Item Master Form](screenshots/22-item-master-form.png)
*Figure 9.3: Item Master creation/edit form*

### 9.8 Categories Management

**Route:** `/dashboard/categories`

Manage inventory categories for item organization.

### 9.9 Screenshot: Categories

![Categories](screenshots/23-categories.png)
*Figure 9.4: Categories management*

### 9.10 Sub-Categories Management

**Route:** `/dashboard/sub-categories`

Manage sub-categories within categories.

### 9.11 Screenshot: Sub-Categories

![Sub-Categories](screenshots/24-sub-categories.png)
*Figure 9.5: Sub-Categories management*

### 9.12 Stock Quantities

**Route:** `/dashboard/inventory-stock-quantities`

View current stock quantities across all items.

### 9.13 Screenshot: Stock Quantities

![Stock Quantities](screenshots/25-stock-quantities.png)
*Figure 9.6: Stock Quantities overview*

### 9.14 Stock Alerts

**Route:** `/dashboard/inventory-alerts`

Monitor low stock and critical alerts.

**Alert Types:**
- Low Stock (below reorder point)
- Out of Stock
- Expiring Items

### 9.15 Screenshot: Stock Alerts

![Stock Alerts](screenshots/26-stock-alerts.png)
*Figure 9.7: Stock Alerts dashboard*

### 9.16 Opening Balance Entry

**Route:** `/dashboard/opening-balance-entry`

Enter initial stock balances for new inventory items.

### 9.17 Screenshot: Opening Balance Entry

![Opening Balance Entry](screenshots/27-opening-balance.png)
*Figure 9.8: Opening Balance Entry form*

### 9.18 Pending Verifications

**Route:** `/dashboard/pending-verifications`

Requests pending verification by inventory staff.

### 9.19 Screenshot: Pending Verifications

![Pending Verifications](screenshots/28-pending-verifications.png)
*Figure 9.9: Pending Verifications queue*

### 9.20 Store Keeper Verifications

**Route:** `/dashboard/store-keeper-verifications`

Forwarded verification requests for store keepers.

### 9.21 Screenshot: Store Keeper Verifications

![Store Keeper Verifications](screenshots/29-store-keeper-verifications.png)
*Figure 9.10: Store Keeper Verification queue*

### 9.22 Verification History

**Route:** `/dashboard/verification-history`

Historical record of all verifications performed.

### 9.23 Screenshot: Verification History

![Verification History](screenshots/30-verification-history.png)
*Figure 9.11: Verification History*

---

## 10. Module 6: Procurement Management

### 10.1 Overview

The Procurement module manages the entire procurement lifecycle from tender creation to delivery receipt.

### 10.2 Contract/Tender Management

**Route:** `/dashboard/contract-tender`

Central hub for managing all tenders.

**Tender Types:**
- Contract Tender
- Annual Tender
- Patty (Spot) Purchase

### 10.3 Screenshot: Tender Dashboard

![Tender Dashboard](screenshots/31-tender-dashboard.png)
*Figure 10.1: Tender Dashboard*

### 10.4 Create Tender Form

**Route:** `/dashboard/tenders/new`

**Form Fields:**
- Tender Number
- Tender Type (Contract/Annual/Patty)
- Title
- Description
- Opening Date
- Closing Date
- Items Selection
- Budget Allocation

### 10.5 Screenshot: Create Tender

![Create Tender](screenshots/32-create-tender.png)
*Figure 10.2: Create Tender form*

### 10.6 Tender Details

**Route:** `/dashboard/tender-details/:id`

Comprehensive view of tender information.

**Sections:**
- Basic Information
- Items List
- Vendor Assignments
- Bid Comparison
- Award Status

### 10.7 Screenshot: Tender Details

![Tender Details](screenshots/33-tender-details.png)
*Figure 10.3: Tender Details view*

### 10.8 Annual Tender Management

**Route:** `/dashboard/contract-tender?type=annual-tender`

Specialized interface for annual tender management.

**Features:**
- Group-based item organization
- Multi-vendor assignment per group
- Year-wise tracking

### 10.9 Screenshot: Annual Tender

![Annual Tender](screenshots/34-annual-tender.png)
*Figure 10.4: Annual Tender management*

### 10.10 Vendor Management

**Route:** `/dashboard/vendors`

Manage approved vendors.

**Features:**
- Vendor registration
- Contact information
- Category assignments
- Performance history

### 10.11 Screenshot: Vendor Management

![Vendor Management](screenshots/35-vendor-management.png)
*Figure 10.5: Vendor Management*

### 10.12 Vendor Form

**Form Fields:**
- Vendor Name
- Contact Person
- Email
- Phone
- Address
- Tax ID / NTN
- Categories

### 10.13 Screenshot: Vendor Form

![Vendor Form](screenshots/36-vendor-form.png)
*Figure 10.6: Vendor creation form*

### 10.14 Purchase Order Dashboard

**Route:** `/dashboard/purchase-orders`

Manage purchase orders generated from tenders.

### 10.15 Screenshot: Purchase Orders

![Purchase Orders](screenshots/37-purchase-orders.png)
*Figure 10.7: Purchase Order Dashboard*

### 10.16 Create Purchase Order

**Route:** `/dashboard/create-po`

Generate purchase orders from approved tenders.

### 10.17 Screenshot: Create PO

![Create PO](screenshots/38-create-po.png)
*Figure 10.8: Create Purchase Order*

### 10.18 Purchase Order Details

**Route:** `/dashboard/po/:id`

View and manage individual purchase orders.

### 10.19 Screenshot: PO Details

![PO Details](screenshots/39-po-details.png)
*Figure 10.9: Purchase Order Details*

### 10.20 Receive Delivery

**Route:** `/purchase-orders/:poId/receive-delivery`

Record delivery receipts against purchase orders.

**Features:**
- Quantity verification
- Quality inspection notes
- Partial delivery support
- GRN (Goods Receipt Note) generation

### 10.21 Screenshot: Receive Delivery

![Receive Delivery](screenshots/40-receive-delivery.png)
*Figure 10.10: Receive Delivery form*

### 10.22 Stock Acquisition Report

**Route:** `/dashboard/stock-acquisition-report/:tenderId`

Report showing stock acquired from a specific tender.

### 10.23 Screenshot: Stock Acquisition Report

![Stock Acquisition Report](screenshots/41-stock-acquisition-report.png)
*Figure 10.11: Stock Acquisition Report*

---

## 11. Module 7: Approval Workflow

### 11.1 Overview

The Approval Workflow module implements a multi-level approval system with forwarding capabilities.

### 11.2 Approval Hierarchy

```
General User submits request
        │
        ▼
  Wing Supervisor (Level 1)
        │
        ├── Approve ──► Next Level / Processing
        ├── Reject ───► Back to User
        └── Forward ──► Another Approver
                │
                ▼
        Admin (Level 2)
                │
                ├── Approve ──► Processing
                └── Reject ───► Back to User
```

### 11.3 Approval Dashboard (Request-Based)

**Route:** `/dashboard/approval-dashboard-request-based`

View approvals grouped by request.

### 11.4 Screenshot: Approval Dashboard (Request-Based)

![Approval Dashboard Request](screenshots/42-approval-dashboard-request.png)
*Figure 11.1: Approval Dashboard grouped by request*

### 11.5 Approval Dashboard (Item-Based)

**Route:** `/dashboard/approval-dashboard`

View approvals at item level.

### 11.6 Screenshot: Approval Dashboard (Item-Based)

![Approval Dashboard Item](screenshots/43-approval-dashboard-item.png)
*Figure 11.2: Approval Dashboard showing individual items*

### 11.7 Request Details

**Route:** `/dashboard/request-details/:requestId`

Detailed view of a specific request with approval actions.

**Actions Available:**
- Approve
- Reject (with reason)
- Forward to another approver
- Request more information

### 11.8 Screenshot: Request Details

![Request Details](screenshots/44-request-details.png)
*Figure 11.3: Request Details with approval actions*

### 11.9 Approval Forwarding

**Route:** `/dashboard/approval-forwarding/:id`

Forward request to another approver when outside your scope.

**Features:**
- Select target approver
- Add forwarding notes
- Maintain audit trail

### 11.10 Screenshot: Approval Forwarding

![Approval Forwarding](screenshots/45-approval-forwarding.png)
*Figure 11.4: Approval Forwarding form*

### 11.11 Request History - Future Requests

**Route:** `/dashboard/requests-history/future`

Approved requests scheduled for future processing.

### 11.12 Screenshot: Future Requests

![Future Requests](screenshots/46-future-requests.png)
*Figure 11.5: Future Requests queue*

### 11.13 Request History - Rejected Requests

**Route:** `/dashboard/requests-history/rejected`

Requests that were rejected.

### 11.14 Screenshot: Rejected Requests

![Rejected Requests](screenshots/47-rejected-requests.png)
*Figure 11.6: Rejected Requests history*

### 11.15 Request History - Pending Requests

**Route:** `/dashboard/requests-history/pending`

Requests still awaiting decision.

### 11.16 Screenshot: Pending Requests

![Pending Requests](screenshots/48-pending-requests.png)
*Figure 11.7: Pending Requests queue*

### 11.17 Workflow Administration

**Route:** `/dashboard/workflow-admin`

Configure approval workflows (Super Admin only).

### 11.18 Screenshot: Workflow Admin

![Workflow Admin](screenshots/49-workflow-admin.png)
*Figure 11.8: Workflow Administration*

---

## 12. Module 8: Reports & Analytics

### 12.1 Overview

The Reports module provides comprehensive reporting capabilities across all system modules.

### 12.2 Reports & Analytics Dashboard

**Route:** `/dashboard/reports`

Central reporting hub.

**Available Reports:**
- Inventory Report
- Stock Movement Report
- Issuance Report
- Procurement Report
- Tender Report
- Audit Trail Report

### 12.3 Screenshot: Reports Dashboard

![Reports Dashboard](screenshots/50-reports-dashboard.png)
*Figure 12.1: Reports & Analytics Dashboard*

### 12.4 Inventory Report

**Route:** `/dashboard/inventory/:id/report`

Detailed inventory status report.

### 12.5 Screenshot: Inventory Report

![Inventory Report](screenshots/51-inventory-report.png)
*Figure 12.2: Inventory Report*

### 12.6 Tender Report

**Route:** `/dashboard/tenders/:id/report`

Comprehensive tender report including bids and awards.

### 12.7 Screenshot: Tender Report

![Tender Report](screenshots/52-tender-report.png)
*Figure 12.3: Tender Report*

### 12.8 Delivery Report

**Route:** `/dashboard/delivery-report/:id`

Delivery receipt report.

### 12.9 Screenshot: Delivery Report

![Delivery Report](screenshots/53-delivery-report.png)
*Figure 12.4: Delivery Report*

### 12.10 Stock Transaction Report

**Route:** `/dashboard/stock-transactions`

Complete transaction history.

### 12.11 Screenshot: Stock Transactions

![Stock Transactions](screenshots/54-stock-transactions.png)
*Figure 12.5: Stock Transaction Report*

---

## 13. Module 9: Administration

### 13.1 Overview

The Administration module provides system configuration and management capabilities for super administrators.

### 13.2 Admin Dashboard

**Route:** `/dashboard` (with admin role)

System-wide statistics and overview.

### 13.3 Screenshot: Admin Dashboard

![Admin Dashboard](screenshots/55-admin-dashboard.png)
*Figure 13.1: Admin Dashboard*

### 13.4 Role Management

**Route:** `/settings/roles`

Create and manage system roles.

**Features:**
- Role creation/editing
- Permission assignment
- Role hierarchy

### 13.5 Screenshot: Role Management

![Role Management](screenshots/56-role-management.png)
*Figure 13.2: Role Management*

### 13.6 User Role Assignment

**Route:** `/settings/users`

Assign roles to users.

**Features:**
- User search
- Role assignment
- Wing assignment
- Activity status

### 13.7 Screenshot: User Management

![User Management](screenshots/57-user-management.png)
*Figure 13.3: User Role Assignment*

### 13.8 System Settings

**Route:** `/dashboard/inventory-settings`

Configure system-wide settings.

**Settings Available:**
- Default approval workflow
- Notification preferences
- Alert thresholds
- Audit settings

### 13.9 Screenshot: System Settings

![System Settings](screenshots/58-system-settings.png)
*Figure 13.4: System Settings*

### 13.10 User Sync Dashboard

**Route:** `/dashboard/user-sync-dashboard` (if available)

Synchronize users from Digital System.

### 13.11 Screenshot: User Sync

![User Sync](screenshots/59-user-sync.png)
*Figure 13.5: User Sync Dashboard*

---

## 14. Appendices

### 14.1 Appendix A: Complete Route Reference

| Route | Component | Access Level |
|-------|-----------|--------------|
| `/login` | LoginPage | Public |
| `/sso-login` | SSOLogin | Public |
| `/ds-landing` | DigitalSystemLanding | Authenticated |
| `/personal-ims` | PersonalIMS | Authenticated |
| `/personal-dashboard` | PersonalDashboard | Authenticated |
| `/dashboard` | SmartDashboard | Authenticated |
| `/dashboard/initial-setup` | InitialSetupPageFresh | Admin |
| `/dashboard/inventory-dashboard` | InventoryDashboard | inventory.view |
| `/dashboard/inventory-all-items` | AllInventoryItemsPage | inventory.view |
| `/dashboard/inventory-stock-quantities` | StockQuantitiesPage | inventory.view |
| `/dashboard/inventory-alerts` | InventoryAlertsPage | inventory.view |
| `/dashboard/stock-issuance` | StockIssuance | issuance.request |
| `/dashboard/stock-issuance-personal` | StockIssuancePersonal | issuance.request |
| `/dashboard/stock-issuance-wing` | StockIssuanceWing | wing.supervisor |
| `/dashboard/stock-issuance-dashboard` | StockIssuanceDashboard | issuance.view |
| `/dashboard/stock-return` | StockReturn | issuance.request |
| `/dashboard/my-issued-items` | MyIssuedItems | issuance.request |
| `/dashboard/my-requests` | MyRequestsPage | issuance.request |
| `/dashboard/wing-dashboard` | WingDashboard | wing.supervisor |
| `/dashboard/wing-inventory` | WingInventory | wing.supervisor |
| `/dashboard/wing-members` | WingMembers | wing.supervisor |
| `/dashboard/wing-requests` | WingRequestsPage | wing.supervisor |
| `/dashboard/approval-dashboard` | ApprovalDashboard | approval.approve |
| `/dashboard/approval-dashboard-request-based` | ApprovalDashboardRequestBased | approval.approve |
| `/dashboard/categories` | Categories | inventory.manage |
| `/dashboard/sub-categories` | SubCategories | inventory.manage |
| `/dashboard/vendors` | VendorManagementEnhanced | procurement.manage |
| `/dashboard/item-master` | ItemMaster | inventory.manage |
| `/dashboard/contract-tender` | ContractTender | procurement.manage |
| `/dashboard/purchase-orders` | PurchaseOrderDashboard | procurement.manage |
| `/dashboard/tenders` | EnhancedTenderDashboard | procurement.manage |
| `/settings/roles` | RoleManagement | roles.manage |
| `/settings/users` | UserRoleAssignment | users.assign_roles |

### 14.2 Appendix B: Permission Reference

| Permission Key | Description |
|----------------|-------------|
| `admin.super` | Super administrator access |
| `roles.manage` | Create and manage roles |
| `users.assign_roles` | Assign roles to users |
| `inventory.view` | View inventory data |
| `inventory.manage` | Full inventory management |
| `inventory.manage_store_keeper` | Store keeper operations |
| `procurement.view` | View procurement data |
| `procurement.manage` | Full procurement management |
| `procurement.request` | Submit procurement requests |
| `procurement.approve` | Approve procurement requests |
| `issuance.request` | Submit issuance requests |
| `issuance.process` | Process issuance requests |
| `issuance.view` | View issuance data |
| `approval.approve` | Approve requests |
| `wing.supervisor` | Wing supervisor access |
| `reports.view` | Access reports |

### 14.3 Appendix C: Database Tables

| Table | Description |
|-------|-------------|
| `item_masters` | Inventory item definitions |
| `categories` | Item categories |
| `sub_categories` | Item sub-categories |
| `stock_acquisitions` | Stock receipt records |
| `stock_issuance_requests` | Issuance request headers |
| `stock_issuance_items` | Issuance request line items |
| `stock_returns` | Return records |
| `tenders` | Tender records |
| `tender_items` | Tender line items |
| `tender_vendors` | Vendor assignments to tenders |
| `purchase_orders` | Purchase order headers |
| `purchase_order_items` | Purchase order line items |
| `deliveries` | Delivery receipt headers |
| `delivery_items` | Delivery receipt line items |
| `vendors` | Vendor master data |
| `ims_roles` | System roles |
| `ims_permissions` | System permissions |
| `ims_role_permissions` | Role-permission mappings |
| `ims_user_roles` | User-role assignments |
| `AspNetUsers` | User accounts (from DS) |
| `tblOffices` | Office/department records |
| `WingsInformation` | Wing definitions |

### 14.4 Appendix D: Soft Delete Implementation

All major tables support soft delete with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `is_deleted` | BIT | Delete flag (0=Active, 1=Deleted) |
| `deleted_at` | DATETIME | Deletion timestamp |
| `deleted_by` | UNIQUEIDENTIFIER | User who deleted |

**Tables with Soft Delete:**
- tenders, tender_items, tender_vendors
- annual_tenders, annual_tender_groups, annual_tender_vendors
- purchase_orders, purchase_order_items
- deliveries, delivery_items
- stock_acquisitions, stock_issuance_requests, stock_issuance_items
- stock_returns, stock_return_items
- item_masters, categories, sub_categories
- vendors, warehouses, wings, sections, users

### 14.5 Appendix E: API Endpoints Reference

**Authentication:**
- `POST /api/login` - Login
- `POST /api/sso-login` - SSO Login
- `POST /api/logout` - Logout
- `GET /api/session` - Get current session

**Inventory:**
- `GET /api/inventory` - List inventory items
- `GET /api/inventory/:id` - Get item details
- `POST /api/inventory` - Create item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Soft delete item

**Stock Issuance:**
- `GET /api/stock-issuance/requests` - List requests
- `POST /api/stock-issuance` - Create request
- `PUT /api/stock-issuance/:id` - Update request
- `POST /api/stock-issuance/:id/approve` - Approve request
- `POST /api/stock-issuance/:id/reject` - Reject request

**Procurement:**
- `GET /api/tenders` - List tenders
- `POST /api/tenders` - Create tender
- `GET /api/purchase-orders` - List POs
- `POST /api/purchase-orders` - Create PO

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | System Team | Initial documentation |
| 2.0 | Feb 25, 2026 | System Team | Added custom items, soft delete, API fixes |

---

**End of Document**

---

## Instructions for Screenshots

To capture screenshots for this documentation:

1. **Use Browser Developer Tools** - Most browsers support full-page screenshots
2. **Navigation Order** - Follow the module order in this document
3. **Consistent Resolution** - Use 1920x1080 or similar for consistency
4. **Login with Different Roles** - Capture role-specific views
5. **Sample Data** - Ensure system has representative sample data

**Screenshot Naming Convention:**
```
{number}-{page-name}.png
Example: 01-login-page.png, 42-approval-dashboard-request.png
```

**Recommended Screenshot Count:** ~60 screenshots covering all major screens

---
