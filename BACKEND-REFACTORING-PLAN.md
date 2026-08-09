# Backend Server Refactoring Plan

## Overview
Split the 16,634-line backend-server.cjs into a modular, maintainable architecture.

## Proposed Structure

```
server/
├── index.js                    # Main entry point
├── config/
│   ├── database.js            # Database connection setup
│   ├── jwt.js                 # JWT configuration
│   ├── multer.js              # File upload configuration
│   └── env.js                 # Environment variables
├── middleware/
│   ├── cors.js                # CORS configuration
│   ├── auth.js                # Authentication middleware
│   ├── errorHandler.js        # Error handling
│   └── logger.js              # Request logging
├── routes/
│   ├── index.js               # Route aggregator
│   ├── tenders.js             # Tender routes
│   ├── vendors.js             # Vendor routes
│   ├── items.js               # Item master routes
│   ├── categories.js          # Category routes
│   ├── purchaseOrders.js      # Purchase order routes
│   ├── users.js               # User routes
│   ├── auth.js                # Authentication routes
│   ├── approvals.js           # Approval workflow routes
│   ├── permissions.js         # Permission routes
│   ├── locations.js           # Location routes
│   ├── stores.js              # Store routes
│   ├── inventoryVerification.js # Inventory verification routes
│   ├── reports.js             # Report routes
│   ├── disposals.js           # Disposal routes
│   ├── stockIssuance.js        # Stock issuance routes
│   └── documentUpload.js       # Document upload routes
├── controllers/
│   ├── tenderController.js
│   ├── vendorController.js
│   ├── purchaseOrderController.js
│   ├── approvalController.js
│   └── ... (one per route)
├── db/
│   ├── connection.js          # Database pool setup
│   └── queries.js             # Reusable SQL queries
├── utils/
│   ├── validators.js          # Input validation
│   ├── formatters.js          # Response formatting
│   ├── fileUpload.js          # File upload utilities
│   └── helpers.js             # General utilities
└── constants/
    ├── statusCodes.js         # HTTP status codes
    ├── errorMessages.js       # Error messages
    └── permissions.js         # Permission definitions
```

## Migration Steps

### Phase 1: Infrastructure
1. Create database connection module (db/connection.js)
2. Create environment configuration (config/env.js)
3. Create middleware modules
4. Create utilities and constants

### Phase 2: Route Migration
1. Extract tender routes to routes/tenders.js
2. Extract vendor routes to routes/vendors.js
3. Extract purchase order routes to routes/purchaseOrders.js
4. Extract item master routes to routes/items.js
5. Continue with other route groups

### Phase 3: Integration
1. Create main index.js that imports all routes
2. Update package.json to reference new entry point
3. Test all endpoints
4. Remove old backend-server.cjs after verification

## Benefits
- **Maintainability**: Each file has single responsibility
- **Scalability**: Easy to add new features
- **Testing**: Modules can be unit tested independently
- **Readability**: Clear separation of concerns
- **Collaboration**: Multiple developers can work on different routes

## Timeline
- Phase 1: 1-2 hours
- Phase 2: 4-6 hours
- Phase 3: 1-2 hours
- Testing: 2-3 hours
- **Total: 8-13 hours**

## Current Status
Ready to begin Phase 1 implementation.
