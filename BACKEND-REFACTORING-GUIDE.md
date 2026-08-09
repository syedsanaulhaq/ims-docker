# Backend Server Refactoring - Implementation Guide

## Current Status
✅ Phase 1 (Infrastructure) - COMPLETE
- ✅ Configuration module created (server/config/env.js)
- ✅ Database connection module created (server/db/connection.js)
- ✅ CORS middleware created (server/middleware/cors.js)
- ✅ Request logger middleware created (server/middleware/logger.js)
- ✅ File upload middleware created (server/middleware/fileUpload.js)
- ✅ Main server entry point created (server/index.js)

## Next Steps - Phase 2: Route Migration

### Step 1: Extract Tender Routes
1. Create `server/routes/tenders.js`
2. Extract all `app.get('/api/tenders/...`, `app.post('/api/tenders/...`, etc.
3. Create tender controller if needed
4. Import in server/index.js

### Step 2: Extract Vendor Routes
1. Create `server/routes/vendors.js`
2. Extract vendor endpoints
3. Create vendor controller

### Step 3: Extract Purchase Order Routes
1. Create `server/routes/purchaseOrders.js`
2. Extract PO endpoints
3. Create PO controller

### Step 4: Extract Item Master Routes
1. Create `server/routes/items.js`
2. Extract item master endpoints

### Step 5: Continue with other routes
- Categories
- Users
- Auth
- Approvals
- Permissions
- Inventory Verification
- Stock Issuance
- Reports
- Disposals
- Document uploads

## How to Extract Routes

### Example: Extracting Tender Routes

**Before (backend-server.cjs):**
```javascript
app.get('/api/tenders', async (req, res) => { ... });
app.post('/api/tenders', async (req, res) => { ... });
app.get('/api/tenders/:id', async (req, res) => { ... });
```

**After (server/routes/tenders.js):**
```javascript
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection');

// GET /api/tenders
router.get('/', async (req, res) => { ... });

// POST /api/tenders
router.post('/', async (req, res) => { ... });

// GET /api/tenders/:id
router.get('/:id', async (req, res) => { ... });

module.exports = router;
```

**In server/index.js:**
```javascript
const tenderRoutes = require('./routes/tenders');
app.use('/api/tenders', tenderRoutes);
```

## File Size Analysis

Original backend-server.cjs: 16,634 lines

Estimated breakdown:
- Tenders: ~2,000 lines
- Vendors: ~1,500 lines
- Purchase Orders: ~1,500 lines
- Items: ~1,500 lines
- Users/Auth: ~1,000 lines
- Approvals: ~1,000 lines
- Inventory Verification: ~1,500 lines
- Stock Issuance: ~800 lines
- Reports: ~800 lines
- Disposals: ~500 lines
- Other routes: ~1,500 lines
- Configuration/Helpers: ~1,500 lines

## Important Notes

1. **Database Connection**: All routes will use `const { getPool, sql } = require('../db/connection');`
2. **Configuration**: Use `const config = require('../config/env');` for env variables
3. **Error Handling**: Maintain consistent error handling across all routes
4. **Testing**: Test each route module independently before integration
5. **Backwards Compatibility**: Ensure all endpoints work exactly as before

## Deployment Strategy

1. Keep backend-server.cjs as-is until all routes are migrated
2. Update package.json:
   - Change `"main": "backend-server.cjs"` to `"main": "server/index.js"`
   - Change start script to `"node server/index.js"`
3. Test all endpoints thoroughly
4. Archive/remove backend-server.cjs after verification
5. Commit and deploy

## Estimated Timeline
- Phase 2 (Route Migration): 4-6 hours
- Phase 3 (Integration & Testing): 3-4 hours
- **Total Remaining: 7-10 hours**

## Questions to Consider
1. Do you want to extract database queries into a separate queries module?
2. Should we create controllers for business logic?
3. Do we need request validation middleware?
4. Should we add TypeScript in the future?

---

**Last Updated**: January 19, 2026
**Status**: Ready for Phase 2 implementation
